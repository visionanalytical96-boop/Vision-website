#!/usr/bin/env python3
"""Keep the last N reels on the phone instead of only the newest one.

The operator's own vision-ipad-sync wipes the phone folder before every copy,
so with a reel every two hours each one deletes the one before it. This patches
that single line - anchored, marked, and revertible - and leaves the rest of
their script exactly as it was.

    python3 patch_sync.py /usr/local/bin/vision-ipad-sync --keep 12
    python3 patch_sync.py /usr/local/bin/vision-ipad-sync --revert
    python3 patch_sync.py /usr/local/bin/vision-ipad-sync --status
"""

from __future__ import annotations

import argparse
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path

MARKER = "# vision keep-recent"

# The one line that throws the previous reels away.
WIPE = re.compile(r'^(?P<indent>[ \t]*)rm -rf "\$DST"/\*;[ \t]*(?P<rest>.*)$', re.MULTILINE)

REPLACEMENT = '''{indent}{marker} (added by Vision Analytical - remove with patch_sync.py --revert)
{indent}# The phone folder used to be wiped here, so a reel every couple of hours
{indent}# deleted the one before it. Copy in, then drop only what is past the limit.
{indent}{rest}
{indent}VISION_KEEP="${{VISION_IPAD_KEEP:-{keep}}}"
{indent}mapfile -t VISION_STAMPS < <(find "$DST" -maxdepth 1 -type f -name 'Vision-Analytical-*' -printf '%f\\n' \\
{indent}  | sed -n 's/^Vision-Analytical-\\([0-9]\\{{8\\}}-[0-9]\\{{6\\}}\\)-.*/\\1/p' | sort -u -r)
{indent}if [ "${{#VISION_STAMPS[@]}}" -gt "$VISION_KEEP" ]; then
{indent}  for VISION_OLD in "${{VISION_STAMPS[@]:$VISION_KEEP}}"; do
{indent}    rm -f "$DST"/Vision-Analytical-"$VISION_OLD"-*
{indent}  done
{indent}fi
{indent}{marker} end'''

BLOCK = re.compile(
    re.escape(MARKER) + r".*?" + re.escape(MARKER) + r" end\n?",
    re.DOTALL)


def status(path: Path) -> int:
    text = path.read_text(encoding="utf-8")
    if MARKER in text:
        keep = re.search(r'VISION_IPAD_KEEP:-(\d+)', text)
        print(f"patched - keeping the newest {keep.group(1) if keep else '?'} reels on the phone")
        return 0
    if WIPE.search(text):
        print("not patched - every sync wipes the phone folder, so only the newest reel survives")
        return 1
    print("not patched, and the line it patches is not there either - "
          "this script may already keep more than one reel")
    return 2


def backup(path: Path, directory: Path) -> Path:
    directory.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    target = directory / f"{path.name}.{stamp}"
    shutil.copy2(path, target)
    return target


def revert(path: Path, backup_dir: Path) -> int:
    text = path.read_text(encoding="utf-8")
    if MARKER not in text:
        print("nothing to revert - this script was never patched")
        return 0
    saved = backup(path, backup_dir)
    restored = BLOCK.sub(lambda m: _original_line(m.group(0)), text)
    path.write_text(restored, encoding="utf-8")
    print(f"reverted - the phone folder holds only the newest reel again (backup: {saved})")
    return 0


def _original_line(block: str) -> str:
    """Put back the wipe exactly as their script had it."""
    for line in block.splitlines():
        stripped = line.strip()
        if stripped.startswith("cp -a") and '"$DST"' in stripped:
            indent = line[: len(line) - len(line.lstrip())]
            return f'{indent}rm -rf "$DST"/*; {stripped}\n'
    return 'rm -rf "$DST"/*; cp -a "$TMP"/. "$DST"/; rm -rf "$TMP"\n'


def apply(path: Path, keep: int, backup_dir: Path) -> int:
    text = path.read_text(encoding="utf-8")
    if MARKER in text:
        current = re.search(r'VISION_IPAD_KEEP:-(\d+)', text)
        if current and int(current.group(1)) == keep:
            print(f"already keeping {keep} - nothing to do")
            return 0
        print(f"already patched (keeping {current.group(1) if current else '?'}) - "
              f"reverting first, then re-applying with {keep}")
        revert(path, backup_dir)
        text = path.read_text(encoding="utf-8")

    match = WIPE.search(text)
    if not match:
        print("the line this patches is not in that script - refusing to guess", file=sys.stderr)
        print(f"  looked for:  rm -rf \"$DST\"/*; ...   in {path}", file=sys.stderr)
        return 1

    saved = backup(path, backup_dir)
    patched = text[:match.start()] + REPLACEMENT.format(
        indent=match.group("indent"), rest=match.group("rest"),
        marker=MARKER, keep=keep) + text[match.end():]
    path.write_text(patched, encoding="utf-8")
    print(f"patched {path} - the newest {keep} reels now stay on the phone")
    print(f"backup: {saved}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("script", help="path to vision-ipad-sync")
    parser.add_argument("--keep", type=int, default=12, help="how many reels to keep (default 12)")
    parser.add_argument("--revert", action="store_true", help="put the original wipe back")
    parser.add_argument("--status", action="store_true", help="report without changing anything")
    parser.add_argument("--backup-dir", default="/root/vision-backups")
    args = parser.parse_args(argv)

    path = Path(args.script)
    if not path.is_file():
        print(f"no such script: {path}", file=sys.stderr)
        return 1
    if args.status:
        return status(path)
    if args.revert:
        return revert(path, Path(args.backup_dir))
    if args.keep < 1:
        print("--keep must be at least 1; use --revert to go back to newest-only", file=sys.stderr)
        return 1
    return apply(path, args.keep, Path(args.backup_dir))


if __name__ == "__main__":
    raise SystemExit(main())
