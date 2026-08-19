"""Delivery through the pipeline that already exists on the server.

    brain -> /srv/vision-workspace/vision-mobile-drop/<YYYY-MM-DD_HH-MM-SS>/
          -> vision-mobile-final-sync  (existing, 60 s timer)
          -> /srv/vision-mobile/OUTBOX/LATEST
          -> vision-ipad-sync          (existing, 60 s timer)
          -> /srv/vision-mobile/IPAD

No new timer, no new sync script. Nextcloud is optional and only runs when
config.env names a container and a target path.
"""

from __future__ import annotations

import shutil
import subprocess
from datetime import datetime
from pathlib import Path

DEFAULT_DROP = Path("/srv/vision-workspace/vision-mobile-drop")


def package_name(stamp: str) -> str:
    """The exact folder pattern vision-mobile-final-sync selects:
    YYYY-MM-DD_HH-MM-SS (engine stamps are YYYYmmdd-HHMMSS)."""
    try:
        moment = datetime.strptime(stamp, "%Y%m%d-%H%M%S")
    except ValueError:
        moment = datetime.now()
    return moment.strftime("%Y-%m-%d_%H-%M-%S")


def publish(files: list[Path], stamp: str, env: dict[str, str] | None = None) -> dict:
    env = env or {}
    result = {"drop": None, "nextcloud": None}
    drop_root = Path(env.get("MOBILE_DROP", DEFAULT_DROP))
    if not drop_root.is_dir():
        print(f"[brain] mobile-drop not found at {drop_root} - iPad delivery skipped")
        return result

    target = drop_root / package_name(stamp)
    target.mkdir(parents=True, exist_ok=True)
    for path in files:
        if Path(path).is_file():
            shutil.copy2(path, target / Path(path).name)
    result["drop"] = target
    print(f"[brain] package -> {target}  (vision-mobile-final-sync will move it to OUTBOX/LATEST, "
          f"then vision-ipad-sync to /srv/vision-mobile/IPAD)")

    nextcloud = deliver_nextcloud(files, env)
    result["nextcloud"] = nextcloud
    return result


def deliver_nextcloud(files: list[Path], env: dict[str, str]) -> str | None:
    """Copy into the Nextcloud data directory and rescan just that folder.

    Requires, in creative-pack/config.env:
        NEXTCLOUD_CONTAINER=nextcloud
        NEXTCLOUD_DATA_DIR=/srv/nextcloud/data          # host path of the data dir
        NEXTCLOUD_TARGET=vision/files/Vision Analytical/AI Videos
    Nothing is touched when these are unset.
    """
    container = env.get("NEXTCLOUD_CONTAINER")
    data_dir = env.get("NEXTCLOUD_DATA_DIR")
    target = env.get("NEXTCLOUD_TARGET")
    if not (container or data_dir or target):
        return None  # deliberately not used - the mobile sync chain is the delivery
    if not (container and data_dir and target):
        missing = [key for key, value in (("NEXTCLOUD_CONTAINER", container),
                                          ("NEXTCLOUD_DATA_DIR", data_dir),
                                          ("NEXTCLOUD_TARGET", target)) if not value]
        print(f"[brain] Nextcloud delivery half-configured - missing {', '.join(missing)}")
        return None

    destination = Path(data_dir) / target
    try:
        destination.mkdir(parents=True, exist_ok=True)
        for path in files:
            if Path(path).is_file():
                shutil.copy2(path, destination / Path(path).name)
        shutil.chown(destination, user=env.get("NEXTCLOUD_UID", "www-data"),
                     group=env.get("NEXTCLOUD_GID", "www-data"))
    except (OSError, LookupError, PermissionError) as exc:
        print(f"[brain] Nextcloud copy failed: {exc}")
        return None

    scan = subprocess.run(
        ["docker", "exec", "-u", "www-data", container, "php", "occ", "files:scan",
         "--path", target],
        capture_output=True, text=True, check=False, timeout=300,
    )
    if scan.returncode != 0:
        print(f"[brain] Nextcloud scan failed: {scan.stderr.strip()[:200]}")
        return str(destination)
    print(f"[brain] Nextcloud -> {target}")
    return str(destination)
