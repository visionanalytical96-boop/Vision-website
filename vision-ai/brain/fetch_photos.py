"""Fetch instrument photos that are actually licensed for reuse.

Only Wikimedia Commons is queried, and only files whose licence permits reuse
(public domain, CC0, CC BY, CC BY-SA) are kept. Every download is recorded in
SOURCES.txt next to the image with its page, licence and author, so a post can
always be traced back.

    python3 brain/fetch_photos.py "Agilent 1260 Infinity II HPLC"
    python3 brain/fetch_photos.py --from-history --limit 3

Manufacturer product shots on company websites are NOT fetched: they are
copyrighted, and using them in your own marketing is a licence risk. For those,
put your own photographs in creative-pack/images/<manufacturer>/<model>/.
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

_HERE = Path(__file__).resolve().parent
for _candidate in (_HERE, _HERE.parent / "engine"):
    if (_candidate / "vision_ai").is_dir() and str(_candidate) not in sys.path:
        sys.path.insert(0, str(_candidate))

from vision_ai.config import load_config  # noqa: E402
from vision_ai.library import Library  # noqa: E402
from vision_ai.skills.imaging import model_dir  # noqa: E402
from vision_ai.skills.instrument import identify  # noqa: E402

try:
    from . import config_env
except ImportError:
    sys.path.insert(0, str(_HERE.parent))
    from brain import config_env  # noqa: E402

API = "https://commons.wikimedia.org/w/api.php"
AGENT = "VisionAnalytical-AssetFetcher/1.0 (laboratory instrument photos)"
ALLOWED = ("public domain", "cc0", "cc-by", "cc by", "cc-by-sa", "cc by-sa", "attribution")


def _get(params: dict) -> dict:
    url = f"{API}?{urllib.parse.urlencode(params)}"
    request = urllib.request.Request(url, headers={"User-Agent": AGENT})
    with urllib.request.urlopen(request, timeout=25) as response:
        return json.loads(response.read().decode("utf-8"))


def search(query: str, limit: int = 10) -> list[str]:
    data = _get({"action": "query", "format": "json", "generator": "search",
                 "gsrsearch": f"{query} filetype:bitmap", "gsrnamespace": 6, "gsrlimit": limit})
    return [page["title"] for page in data.get("query", {}).get("pages", {}).values()]


def details(titles: list[str]) -> list[dict]:
    if not titles:
        return []
    data = _get({"action": "query", "format": "json", "titles": "|".join(titles),
                 "prop": "imageinfo", "iiprop": "url|extmetadata|size", "iiurlwidth": 2000})
    out = []
    for page in data.get("query", {}).get("pages", {}).values():
        info = (page.get("imageinfo") or [{}])[0]
        meta = info.get("extmetadata", {})
        licence = str(meta.get("LicenseShortName", {}).get("value", "")).lower()
        out.append({
            "title": page.get("title", ""),
            "url": info.get("thumburl") or info.get("url", ""),
            "page": info.get("descriptionurl", ""),
            "licence": meta.get("LicenseShortName", {}).get("value", "unknown"),
            "author": _plain(meta.get("Artist", {}).get("value", "")),
            "reusable": any(token in licence for token in ALLOWED),
            "width": info.get("width", 0),
        })
    return out


def _plain(html: str) -> str:
    import re
    return re.sub(r"<[^>]+>", "", html or "").strip()[:120]


def download(entry: dict, target_dir: Path) -> Path | None:
    target_dir.mkdir(parents=True, exist_ok=True)
    name = Path(urllib.parse.urlparse(entry["url"]).path).name
    target = target_dir / name
    if target.is_file():
        return target
    request = urllib.request.Request(entry["url"], headers={"User-Agent": AGENT})
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            target.write_bytes(response.read())
    except Exception as exc:
        print(f"    download failed: {str(exc)[:100]}")
        return None
    with (target_dir / "SOURCES.txt").open("a", encoding="utf-8") as handle:
        handle.write(f"{target.name}\t{entry['licence']}\t{entry['author']}\t{entry['page']}\n")
    return target


def fetch_for(request: str, library: Library, cache_root: Path, limit: int, apply: bool) -> int:
    instrument = identify(request, library)
    if not instrument.identified:
        print(f"  could not identify an instrument in: {request}")
        return 0
    query = instrument.image_search_query()
    print(f"\n{instrument.manufacturer} {instrument.model}")
    print(f"  searching Wikimedia Commons for: {query}")
    try:
        entries = details(search(query, limit * 3))
    except Exception as exc:
        print(f"  search failed (no network?): {str(exc)[:120]}")
        return 0

    usable = [e for e in entries if e["reusable"] and e["url"]]
    print(f"  {len(entries)} result(s), {len(usable)} with a reusable licence")
    saved = 0
    for entry in usable[:limit]:
        print(f"    {entry['title']}  [{entry['licence']}]  {entry['author'] or 'unknown author'}")
        if apply:
            path = download(entry, model_dir(cache_root, instrument))
            saved += 1 if path else 0
    for entry in entries:
        if not entry["reusable"]:
            print(f"    skipped (licence {entry['licence']}): {entry['title']}")
    if not apply and usable:
        print("  re-run with --apply to download these")
    return saved


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("requests", nargs="*", help='e.g. "Agilent 1260 Infinity II HPLC"')
    parser.add_argument("--from-history", action="store_true", help="every instrument already in design history")
    parser.add_argument("--limit", type=int, default=3, help="images per instrument (default 3)")
    parser.add_argument("--apply", action="store_true", help="actually download (default: list only)")
    args = parser.parse_args(argv)

    config = load_config(config_env.to_overrides(config_env.load()))
    library = Library(config)
    requests = list(args.requests)
    if args.from_history:
        from vision_ai.skills.history import iter_history
        seen = {f"{r.get('manufacturer','')} {r.get('instrument_model','')}".strip()
                for r in iter_history(config.history_file)}
        requests += sorted(x for x in seen if x)
    if not requests:
        parser.print_help()
        return 2

    total = sum(fetch_for(request, library, config.path("asset_cache"), args.limit, args.apply)
                for request in requests)
    print(f"\n{'downloaded' if args.apply else 'listed'}: {total if args.apply else 'nothing yet'}")
    if args.apply and total:
        print("licences recorded in SOURCES.txt next to each image - keep that file")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
