#!/usr/bin/env python3
"""Check the Meta token, and publish a finished reel to Instagram.

Nothing here stores or prints a secret. The token lives in the operator's own
creative-pack/config.env, which is never committed, and every line this script
prints masks it.

    python3 instagram.py --check          # is the token usable, and for what
    python3 instagram.py --long-lived     # swap a 1-hour token for a 60-day one
    python3 instagram.py --post-latest    # publish the newest reel in READY
    python3 instagram.py --post <file.mp4> --caption-file <file.txt>

config.env keys:
    META_APP_ID=...
    META_APP_SECRET=...
    META_ACCESS_TOKEN=...            # a USER token, not an app token
    IG_USER_ID=...                   # optional - --check finds it for you
    META_API_VERSION=v21.0           # bump if Meta says the version is gone
    INSTAGRAM_PUBLIC_BASE=https://media.example.com/reels   # optional, see --post
    INSTAGRAM_PUBLIC_DIR=/srv/public/reels
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

_HERE = Path(__file__).resolve().parent
for _candidate in (_HERE, _HERE.parent, _HERE.parent / "engine"):
    if str(_candidate) not in sys.path:
        sys.path.insert(0, str(_candidate))

try:  # installed as brain/instagram.py, or run straight from the folder
    from brain import config_env
except ImportError:  # pragma: no cover - depends how it is invoked
    import config_env  # type: ignore[no-redef]

DEFAULT_VERSION = "v21.0"
FACEBOOK_HOST = "graph.facebook.com"
INSTAGRAM_HOST = "graph.instagram.com"

# What Instagram needs before it will let anything be published.
REQUIRED_SCOPES = ("instagram_basic", "instagram_content_publish")
HELPFUL_SCOPES = ("pages_show_list", "pages_read_engagement", "business_management")

PUBLISH_POLL_SECONDS = 5
PUBLISH_TIMEOUT_SECONDS = 600


def mask(secret: str) -> str:
    """Never print a token. Enough to tell two tokens apart, no more."""
    text = str(secret or "")
    if len(text) < 12:
        return "(too short to be a token)"
    return f"{text[:4]}...{text[-4:]}  ({len(text)} chars)"


class GraphError(Exception):
    def __init__(self, message: str, payload: dict | None = None) -> None:
        super().__init__(message)
        self.payload = payload or {}

    @property
    def code(self) -> int:
        return int(self.payload.get("code", 0) or 0)


def call(host: str, version: str, path: str, params: dict, post: bool = False,
         timeout: int = 120) -> dict:
    """One Graph API call. Errors come back as GraphError, never as a traceback."""
    url = f"https://{host}/{version}/{path.lstrip('/')}"
    data = urllib.parse.urlencode({k: v for k, v in params.items() if v is not None})
    request = (urllib.request.Request(url, data=data.encode(), method="POST") if post
               else urllib.request.Request(f"{url}?{data}"))
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as exc:
        try:
            payload = json.loads(exc.read().decode()).get("error", {})
        except (ValueError, OSError):
            payload = {}
        message = payload.get("message") or f"HTTP {exc.code}"
        raise GraphError(message, payload) from None
    except urllib.error.URLError as exc:
        raise GraphError(f"could not reach {host}: {exc.reason}") from None
    except (ValueError, OSError) as exc:
        raise GraphError(str(exc)) from None


class Report:
    def __init__(self) -> None:
        self.passed = 0
        self.failed = 0
        self.notes: list[str] = []

    def ok(self, name: str, detail: str = "") -> None:
        self.passed += 1
        print(f"  [PASS] {name:<28} {detail}")

    def bad(self, name: str, detail: str, fix: str = "") -> None:
        self.failed += 1
        print(f"  [FAIL] {name:<28} {detail}")
        if fix:
            self.notes.append(fix)

    def info(self, name: str, detail: str) -> None:
        print(f"  [INFO] {name:<28} {detail}")

    def warn(self, name: str, detail: str, fix: str = "") -> None:
        print(f"  [WARN] {name:<28} {detail}")
        if fix:
            self.notes.append(fix)


def settings(env: dict) -> dict:
    return {
        "app_id": env.get("META_APP_ID", "").strip(),
        "app_secret": env.get("META_APP_SECRET", "").strip(),
        "token": env.get("META_ACCESS_TOKEN", "").strip(),
        "ig_user_id": env.get("IG_USER_ID", "").strip(),
        "version": env.get("META_API_VERSION", "").strip() or DEFAULT_VERSION,
    }


def find_instagram_account(config: dict, report: Report) -> tuple[str, str] | None:
    """Two different Meta products lead to an Instagram account; try both.

    A token from Facebook Login reaches Instagram through a Page. A token from
    Instagram Login talks to graph.instagram.com and knows the account itself.
    """
    version, token = config["version"], config["token"]
    try:
        pages = call(FACEBOOK_HOST, version, "me/accounts",
                     {"fields": "id,name,instagram_business_account{id,username}",
                      "access_token": token}).get("data", [])
    except GraphError as exc:
        pages = []
        report.info("page lookup", f"not a Page token ({exc})")

    for page in pages:
        account = page.get("instagram_business_account") or {}
        if account.get("id"):
            report.ok("Instagram account", f"@{account.get('username', '?')} "
                                           f"(id {account['id']}) via Page \"{page.get('name')}\"")
            return account["id"], FACEBOOK_HOST

    if pages:
        report.bad("Instagram account", f"{len(pages)} Page(s), none with an Instagram account linked",
                   "Link the Instagram Business account to the Facebook Page: "
                   "Page > Settings > Linked accounts > Instagram.")
        return None

    try:  # Instagram Login token
        me = call(INSTAGRAM_HOST, version, "me",
                  {"fields": "user_id,username", "access_token": token})
        account_id = str(me.get("user_id") or me.get("id") or "")
        if account_id:
            report.ok("Instagram account", f"@{me.get('username', '?')} (id {account_id}) "
                                           "via Instagram Login")
            return account_id, INSTAGRAM_HOST
    except GraphError as exc:
        report.bad("Instagram account", str(exc),
                   "The token reaches no Instagram account. It must be a User token from an app "
                   "with Instagram permissions, and the account must be Business or Creator.")
        return None
    return None


def check(env: dict) -> int:
    config = settings(env)
    report = Report()
    print("== credentials in config.env")

    if not config["token"]:
        report.bad("META_ACCESS_TOKEN", "not set",
                   "Add META_ACCESS_TOKEN=<your user token> to config.env.")
        return finish(report)
    report.ok("META_ACCESS_TOKEN", mask(config["token"]))
    report.info("META_APP_ID", config["app_id"] or "(not set)")
    report.info("META_APP_SECRET", mask(config["app_secret"]) if config["app_secret"] else "(not set)")
    report.info("API version", config["version"])

    if "|" in config["token"]:
        report.bad("token type", "this is an APP token (app_id|app_secret)",
                   "An app token cannot post to Instagram. You need a USER access token: "
                   "Graph API Explorer > pick your app > 'User or Page' > Generate Access Token, "
                   "with instagram_basic and instagram_content_publish ticked.")
        return finish(report)

    print("\n== what the token is")
    scopes: list[str] = []
    if config["app_id"] and config["app_secret"]:
        try:
            data = call(FACEBOOK_HOST, config["version"], "debug_token",
                        {"input_token": config["token"],
                         "access_token": f"{config['app_id']}|{config['app_secret']}"}).get("data", {})
        except GraphError as exc:
            data = {}
            report.bad("token inspection", str(exc),
                       "Check META_APP_ID and META_APP_SECRET belong to the same app as the token.")
        if data:
            if data.get("is_valid"):
                report.ok("token is valid", data.get("type", "USER"))
            else:
                report.bad("token is valid", data.get("error", {}).get("message", "no"),
                           "Generate a fresh token in the Graph API Explorer.")
            if str(data.get("app_id", "")) != config["app_id"]:
                report.bad("token belongs to this app",
                           f"token is for app {data.get('app_id')}, config.env says {config['app_id']}",
                           "META_APP_ID must be the app the token was generated in.")
            expires = int(data.get("expires_at", 0) or 0)
            if expires == 0:
                report.ok("expiry", "never expires")
            else:
                days = (expires - time.time()) / 86400
                if days < 0:
                    report.bad("expiry", "already expired",
                               "Generate a new token, then run --long-lived.")
                elif days < 7:
                    report.warn("expiry", f"{days:.1f} days left",
                                "Run --long-lived to turn this into a 60-day token.")
                else:
                    report.ok("expiry", f"{days:.0f} days left")
            scopes = list(data.get("scopes") or [])
    else:
        report.warn("token inspection", "skipped - META_APP_ID / META_APP_SECRET not set",
                    "Add META_APP_ID and META_APP_SECRET so expiry and permissions can be checked.")

    if scopes:
        missing = [s for s in REQUIRED_SCOPES if s not in scopes]
        if missing:
            report.bad("permissions", f"missing {', '.join(missing)}",
                       f"Re-generate the token with {', '.join(missing)} ticked. "
                       "instagram_content_publish is the one that allows posting.")
        else:
            report.ok("permissions", ", ".join(REQUIRED_SCOPES))
        extra = [s for s in HELPFUL_SCOPES if s in scopes]
        if extra:
            report.info("also granted", ", ".join(extra))

    print("\n== the account it can post to")
    found = find_instagram_account(config, report)
    if not found:
        return finish(report)
    ig_id, host = found
    if config["ig_user_id"] and config["ig_user_id"] != ig_id:
        report.warn("IG_USER_ID in config.env", f"says {config['ig_user_id']}, token reaches {ig_id}",
                    f"Set IG_USER_ID={ig_id} in config.env, or remove the line.")
    elif not config["ig_user_id"]:
        report.info("IG_USER_ID", f"not set - add IG_USER_ID={ig_id} to config.env to skip this lookup")

    try:
        profile = call(host, config["version"], ig_id,
                       {"fields": "username,followers_count,media_count",
                        "access_token": config["token"]})
        report.ok("account reachable", f"@{profile.get('username')} - "
                                       f"{profile.get('media_count', '?')} posts, "
                                       f"{profile.get('followers_count', '?')} followers")
    except GraphError as exc:
        report.bad("account reachable", str(exc), "")

    print("\n== publishing")
    try:
        limit = call(host, config["version"], f"{ig_id}/content_publishing_limit",
                     {"fields": "config,quota_usage", "access_token": config["token"]})
        row = (limit.get("data") or [{}])[0]
        used = row.get("quota_usage", 0)
        total = (row.get("config") or {}).get("quota_total", 50)
        report.ok("daily quota", f"{used} of {total} posts used in the last 24 h")
    except GraphError as exc:
        report.warn("daily quota", str(exc),
                    "This usually means instagram_content_publish is not granted yet.")

    return finish(report)


def finish(report: Report) -> int:
    print(f"\nRESULT: {report.passed} passed, {report.failed} failed")
    if report.notes:
        print("\nWhat to do next:")
        for index, note in enumerate(report.notes, 1):
            print(f"  {index}. {note}")
    else:
        if report.failed == 0:
            print("\nThe token is ready. Publish with:  python3 instagram.py --post-latest")
    return 1 if report.failed else 0


def long_lived(env: dict) -> int:
    """Swap a 1-hour token for a 60-day one and write it back to config.env."""
    config = settings(env)
    if not (config["app_id"] and config["app_secret"] and config["token"]):
        print("META_APP_ID, META_APP_SECRET and META_ACCESS_TOKEN must all be set in config.env")
        return 1
    try:
        data = call(FACEBOOK_HOST, config["version"], "oauth/access_token",
                    {"grant_type": "fb_exchange_token", "client_id": config["app_id"],
                     "client_secret": config["app_secret"], "fb_exchange_token": config["token"]})
    except GraphError as exc:
        print(f"exchange failed: {exc}")
        return 1
    token = data.get("access_token", "")
    if not token:
        print("no token came back")
        return 1
    days = int(data.get("expires_in", 0) or 0) / 86400
    print(f"new token: {mask(token)}  (valid about {days:.0f} days)")
    path = Path(env.get("__source__") or config_env.DEFAULT_ENV)
    if not path.is_file():
        print(f"config.env not found at {path} - paste it in yourself as META_ACCESS_TOKEN=...")
        return 1
    lines = path.read_text(encoding="utf-8").splitlines()
    replaced = False
    for index, line in enumerate(lines):
        if line.strip().startswith("META_ACCESS_TOKEN="):
            lines[index] = f"META_ACCESS_TOKEN={token}"
            replaced = True
    if not replaced:
        lines.append(f"META_ACCESS_TOKEN={token}")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"written to {path}")
    return 0


def public_url(reel: Path, env: dict, given: str) -> str | None:
    """Instagram fetches the video itself, so it must be on a public HTTPS URL."""
    if given:
        return given
    base = env.get("INSTAGRAM_PUBLIC_BASE", "").strip().rstrip("/")
    directory = env.get("INSTAGRAM_PUBLIC_DIR", "").strip()
    if not (base and directory):
        return None
    target = Path(directory)
    target.mkdir(parents=True, exist_ok=True)
    shutil.copy2(reel, target / reel.name)
    return f"{base}/{urllib.parse.quote(reel.name)}"


def newest_reel(env: dict) -> Path | None:
    ready = Path(env.get("VISION_READY", "/srv/vision-mobile/OUTPUT/READY"))
    reels = sorted(ready.glob("*-Reel.mp4"), key=lambda p: p.stat().st_mtime, reverse=True)
    return reels[0] if reels else None


def post(env: dict, reel: Path, caption: str, video_url: str, dry_run: bool) -> int:
    config = settings(env)
    if not config["token"]:
        print("META_ACCESS_TOKEN is not set in config.env - run --check first")
        return 1
    if not reel.is_file():
        print(f"no such reel: {reel}")
        return 1

    ig_id, host = config["ig_user_id"], FACEBOOK_HOST
    if not ig_id:
        report = Report()
        found = find_instagram_account(config, report)
        if not found:
            print("could not work out which Instagram account to post to - run --check")
            return 1
        ig_id, host = found

    url = public_url(reel, env, video_url)
    if not url:
        print("Instagram downloads the video itself, so it needs a public HTTPS URL.")
        print("Either pass --video-url https://..., or set both in config.env:")
        print("  INSTAGRAM_PUBLIC_DIR=/srv/public/reels        # a folder your web server serves")
        print("  INSTAGRAM_PUBLIC_BASE=https://your-domain/reels")
        return 1

    print(f"reel    : {reel.name} ({reel.stat().st_size / 1048576:.2f} MB)")
    print(f"url     : {url}")
    print(f"caption : {caption.splitlines()[0][:70] if caption else '(none)'}")
    if dry_run:
        print("\ndry run - nothing was sent. Add --apply to publish.")
        return 0

    try:
        container = call(host, config["version"], f"{ig_id}/media",
                         {"media_type": "REELS", "video_url": url, "caption": caption,
                          "share_to_feed": "true", "access_token": config["token"]}, post=True)
    except GraphError as exc:
        print(f"upload failed: {exc}")
        return 1
    creation_id = container.get("id")
    if not creation_id:
        print(f"no container id came back: {container}")
        return 1
    print(f"container: {creation_id} - Instagram is downloading the video")

    deadline = time.time() + PUBLISH_TIMEOUT_SECONDS
    while time.time() < deadline:
        time.sleep(PUBLISH_POLL_SECONDS)
        try:
            state = call(host, config["version"], str(creation_id),
                         {"fields": "status_code,status", "access_token": config["token"]})
        except GraphError as exc:
            print(f"status check failed: {exc}")
            return 1
        code = state.get("status_code")
        if code == "FINISHED":
            break
        if code == "ERROR":
            print(f"Instagram rejected the video: {state.get('status')}")
            return 1
        print(f"  ...{code}")
    else:
        print("timed out waiting for Instagram to accept the video")
        return 1

    try:
        published = call(host, config["version"], f"{ig_id}/media_publish",
                         {"creation_id": creation_id, "access_token": config["token"]}, post=True)
    except GraphError as exc:
        print(f"publish failed: {exc}")
        return 1
    print(f"published: media id {published.get('id')}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true", help="is the token usable, and for what")
    parser.add_argument("--long-lived", action="store_true", help="swap a short token for a 60-day one")
    parser.add_argument("--post", metavar="FILE", default="", help="publish this reel")
    parser.add_argument("--post-latest", action="store_true", help="publish the newest reel in READY")
    parser.add_argument("--caption-file", default="", help="caption text file (default: the reel's own)")
    parser.add_argument("--video-url", default="", help="public HTTPS URL Instagram should download")
    parser.add_argument("--apply", action="store_true", help="actually publish (default is a dry run)")
    parser.add_argument("--config", default="", help="path to config.env")
    args = parser.parse_args(argv)

    env = config_env.load(args.config or None)
    env["__source__"] = str(Path(args.config or config_env.DEFAULT_ENV))

    if args.long_lived:
        return long_lived(env)
    if args.post or args.post_latest:
        reel = Path(args.post) if args.post else newest_reel(env)
        if reel is None:
            print("no reel found in READY")
            return 1
        caption = ""
        caption_path = (Path(args.caption_file) if args.caption_file
                        else reel.with_name(reel.name.replace("-Reel.mp4", "-Caption.txt")))
        if caption_path.is_file():
            caption = caption_path.read_text(encoding="utf-8").strip()
        return post(env, reel, caption, args.video_url, not args.apply)
    return check(env)


if __name__ == "__main__":
    raise SystemExit(main())
