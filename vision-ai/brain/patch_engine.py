"""Anchored patcher for the existing /usr/local/bin/vision-ai-content.

Every edit is anchored on text verified to exist in the engine. If an anchor is
missing the patch aborts and writes nothing - it never guesses at line numbers,
and it never rewrites the file wholesale. Run with --dry-run to see the diff.
"""

from __future__ import annotations

import argparse
import difflib
import re
import sys
from pathlib import Path

MARKER = "vision brain integration"

BOOTSTRAP = '''
# --- {marker} (added by vision-ai/integrate.sh) ---
import sys as _sys
_sys.path.insert(0, "{brain_parent}")
from brain import bridge as _bridge
D = _bridge.decide(_sys.argv[1:])
# --- end {marker} ---
'''

FINISH = '''

# --- {marker}: validate, record history, deliver through the existing sync chain ---
_ok = _bridge.finish(D, READY, STAMP, post, reel)
if not _ok:
    _sys.exit(1)
# --- end {marker} ---
'''

# (name, kind, pattern, replacement) - kind: after | replace | before
EDITS = [
    ("bootstrap", "after",
     r"from PIL import Image, ImageDraw, ImageFont, ImageFilter",
     None),
    ("exact instrument photo", "replace",
     r"source\s*=\s*random\.choice\(images if images else videos\)",
     "source = _bridge.pick_source(D, images, videos)"),
    ("design rotation (style)", "replace",
     r"style\s*=\s*random\.choice\(styles\)",
     "style = _bridge.pick_style(D, styles)"),
    ("design rotation (layout)", "replace",
     r"layout\s*=\s*random\.choice\(layouts\)",
     "layout = _bridge.pick_layout(D, layouts)"),
    ("skip the 120 s ollama CLI call", "regex",
     "(?m)^(\\s*)result = subprocess\\.run\\(\\s*\\n(\\s*)\\[\"ollama\"",
     "\\1raise RuntimeError('brain: short-copy path')  # patched\n\\1result = subprocess.run(\n\\2[\"ollama\""),
    ("short copy from the brain", "before",
     r'title\s*=\s*str\(data\.get\(',
     "data = _bridge.copy_pack(D, data)"),
    ("legacy reel duration", "regex",
     r'"-t"\s*,\s*"12"\s*,',
     '"-t", _bridge.legacy_seconds(),'),
]


def apply(source: str, brain_parent: str) -> tuple[str, list[str]]:
    if MARKER in source:
        raise SystemExit("engine is already patched - revert first (integrate.sh --revert)")
    log, out = [], source
    for name, kind, pattern, replacement in EDITS:
        if kind == "after":
            match = re.search(pattern, out)
            if not match:
                raise SystemExit(f"anchor missing: {name} -> {pattern}")
            insert = BOOTSTRAP.format(marker=MARKER, brain_parent=brain_parent)
            out = out[:match.end()] + "\n" + insert + out[match.end():]
            log.append(f"+ {name}")
        elif kind == "before":
            match = re.search(pattern, out)
            if not match:
                raise SystemExit(f"anchor missing: {name} -> {pattern}")
            line_start = out.rfind("\n", 0, match.start()) + 1
            out = out[:line_start] + replacement + "\n" + out[line_start:]
            log.append(f"+ {name}")
        else:
            out, count = re.subn(pattern, replacement, out)
            if count == 0:
                raise SystemExit(f"anchor missing: {name} -> {pattern}")
            log.append(f"~ {name} ({count}x)")
    out = out.rstrip("\n") + "\n" + FINISH.format(marker=MARKER)
    log.append("+ finish hook (validation, history, delivery)")
    return out, log


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("engine", help="path to vision-ai-content")
    parser.add_argument("--brain-parent", default="/srv/vision-workspace/vision-ai")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--out", help="write the patched engine here instead of in place")
    args = parser.parse_args(argv)

    path = Path(args.engine)
    original = path.read_text(encoding="utf-8")
    patched, log = apply(original, args.brain_parent)

    print("\n".join(log))
    if args.dry_run:
        diff = difflib.unified_diff(original.splitlines(True), patched.splitlines(True),
                                    fromfile=str(path), tofile=f"{path} (patched)", n=2)
        sys.stdout.writelines(diff)
        return 0

    target = Path(args.out or path)
    target.write_text(patched, encoding="utf-8")
    print(f"written: {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
