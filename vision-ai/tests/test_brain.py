"""Tests for the integration layer (brain/).

    python3 vision-ai/tests/test_brain.py
"""

from __future__ import annotations

import re
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "engine"))

from brain import bridge, config_env, deliver, pack_convert  # noqa: E402
from brain.patch_engine import EDITS, MARKER, apply  # noqa: E402
from vision_ai.config import load_config  # noqa: E402
from vision_ai.library import Library  # noqa: E402

# The engine anchors, exactly as they appear in the production file.
ENGINE_SNIPPET = '''#!/usr/bin/env python3
import os, json, random, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
READY = Path("/srv/vision-mobile/OUTPUT/READY")
STAMP = "20260818-224102"
styles = ["luxury editorial", "dark cinematic"]
style = random.choice(styles)
images, videos = [], []
source = random.choice(images if images else videos)
prompt = "..."
try:
    result = subprocess.run(
        ["ollama","run","qwen2.5:1.5b",prompt],
        capture_output=True, text=True, timeout=120
    )
    data = {}
except Exception:
    data = {"title": "Advanced Analytical Solutions"}
title = str(data.get("title","Advanced Analytical Solutions")).strip()
layouts = ["top-title", "minimal"]
layout = random.choice(layouts)
post = READY/"post.png"
reel = READY/"reel.mp4"
subprocess.run(["ffmpeg","-y","-i",str(post),"-t","12","-c:v","libx264",str(reel)])
'''


class PatchTests(unittest.TestCase):
    def test_patch_applies_and_compiles(self):
        patched, log = apply(ENGINE_SNIPPET, "/srv/vision-workspace/vision-ai")
        compile(patched, "patched", "exec")  # syntax must survive the patch
        self.assertEqual(len(log), len(EDITS) + 1)
        for expected in ("_bridge.pick_source(D, images, videos)",
                         "_bridge.pick_style(D, styles)",
                         "_bridge.pick_layout(D, layouts)",
                         "_bridge.copy_pack(D, data)",
                         "_bridge.legacy_seconds()",
                         '_bridge.finish(D, READY, STAMP, post, reel, globals().get("brain_choice"))'):
            self.assertIn(expected, patched, expected)

    def test_ollama_cli_call_is_bypassed_not_deleted(self):
        patched, _ = apply(ENGINE_SNIPPET, "/x")
        self.assertIn('["ollama","run","qwen2.5:1.5b",prompt]', patched)  # original left intact
        raise_line = patched.index("raise RuntimeError('brain: short-copy path')")
        call_line = patched.index("result = subprocess.run(")
        self.assertLess(raise_line, call_line)

    def test_double_patch_is_refused(self):
        patched, _ = apply(ENGINE_SNIPPET, "/x")
        self.assertIn(MARKER, patched)
        with self.assertRaises(SystemExit):
            apply(patched, "/x")

    def test_missing_anchor_aborts(self):
        with self.assertRaises(SystemExit):
            apply(ENGINE_SNIPPET.replace("source = random.choice(images if images else videos)", ""), "/x")


class ConfigEnvTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        (self.tmp / "config.env").write_text(
            "VISION_AI_PACK=/srv/vision-workspace/vision-ai/creative-pack\n"
            "# comment\n"
            "TIMER=OFF\n"
            "EXACT_MODEL_IMAGE_REQUIRED=1\n"
            "RECENT_DESIGNS_BLOCK=1000\n"
            "PHONE_VIDEO_FPS=30\n"
            'OLLAMA_MODEL="qwen2.5:1.5b"\n'
        )

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_reads_the_operators_contract(self):
        env = config_env.load(self.tmp / "config.env")
        self.assertEqual(env["OLLAMA_MODEL"], "qwen2.5:1.5b")
        self.assertTrue(config_env.flag(env, "EXACT_MODEL_IMAGE_REQUIRED"))
        self.assertFalse(config_env.flag(env, "TIMER"))
        overrides = config_env.to_overrides(env)
        self.assertEqual(overrides["video"]["fps"], 30)
        self.assertEqual(overrides["anti_repetition"]["history_window"], 1000)


class PackConvertTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        (self.tmp / "designs").mkdir(parents=True)
        (self.tmp / "animations").mkdir(parents=True)
        (self.tmp / "designs/families.txt").write_text("CINEMATIC_LAB\nPHARMA_WHITE\n# note\n\nDARK_LUXURY\n")
        (self.tmp / "animations/presets.txt").write_text("SLOW_ZOOM | gentle\nPUSH_IN\n")
        self.library = Library(load_config())

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_operator_names_survive_and_txt_is_untouched(self):
        before = (self.tmp / "designs/families.txt").read_bytes()
        pack_convert.convert(self.tmp, self.library.get, dry_run=False)
        import json
        families = json.loads((self.tmp / "designs/design-families.json").read_text())["families"]
        ids = [f["id"] for f in families]
        self.assertEqual(ids[:3], ["cinematic_lab", "pharma_white", "dark_luxury"])
        self.assertEqual(before, (self.tmp / "designs/families.txt").read_bytes())

    def test_names_inherit_working_mechanics(self):
        pack_convert.convert(self.tmp, self.library.get, dry_run=False)
        import json
        animations = json.loads((self.tmp / "animations/animations.json").read_text())["animations"]
        slow_zoom = next(a for a in animations if a["id"] == "slow_zoom")
        self.assertIn("camera", slow_zoom)
        self.assertIn("layer", slow_zoom)

    def test_existing_json_is_never_overwritten(self):
        pack_convert.convert(self.tmp, self.library.get, dry_run=False)
        marker = (self.tmp / "designs/design-families.json")
        marker.write_text('{"families": [{"id": "operator_edit"}]}')
        pack_convert.convert(self.tmp, self.library.get, dry_run=False)
        self.assertIn("operator_edit", marker.read_text())


class FinishSignatureTests(unittest.TestCase):
    """finish() writes into the directory it is handed - a local variable must
    never take that name (it did once, and every run died after the voice)."""

    def test_output_directory_is_not_shadowed(self):
        import ast
        import inspect
        from brain import bridge

        source = inspect.getsource(bridge.finish)
        tree = ast.parse(source.lstrip())
        assigned = {target.id
                    for node in ast.walk(tree) if isinstance(node, ast.Assign)
                    for target in node.targets if isinstance(target, ast.Name)}
        reassigned_after_path = [name for name in assigned if name == "ready"]
        # `ready` is assigned once, on the Path() line at the top
        self.assertLessEqual(len(reassigned_after_path), 1)
        self.assertIn("usable", source)


class DeliveryTests(unittest.TestCase):
    def test_package_name_matches_the_existing_sync_regex(self):
        name = deliver.package_name("20260818-224102")
        self.assertEqual(name, "2026-08-18_22-41-02")
        self.assertRegex(name, r"^[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}$")

    def test_package_lands_in_the_drop_folder(self):
        tmp = Path(tempfile.mkdtemp())
        drop = tmp / "vision-mobile-drop"
        drop.mkdir()
        payload = tmp / "Vision-Analytical-20260818-224102-Reel.mp4"
        payload.write_bytes(b"x" * 32)
        result = deliver.publish([payload], "20260818-224102", {"MOBILE_DROP": str(drop)})
        self.assertTrue((drop / "2026-08-18_22-41-02" / payload.name).is_file())
        self.assertIsNone(result["nextcloud"])  # not configured -> not attempted
        shutil.rmtree(tmp, ignore_errors=True)


class PresetMapTests(unittest.TestCase):
    """The server brain's names must reach ffmpeg as real mechanics."""

    @classmethod
    def setUpClass(cls):
        from brain import preset_map
        cls.preset_map = preset_map
        cls.library = Library(load_config())

    def test_server_preset_names_all_resolve(self):
        animations = self.library.get("animations")
        for name in ("ORBITAL_DRIFT", "SLOW_PUSH", "MICRO_PARALLAX", "DEPTH_ZOOM", "FLOATING_CARD",
                     "GLASS_PANEL_ENTRY", "PARTICLE_DRIFT", "DATA_LINE_MOTION", "WHIP_MOTION",
                     "CAMERA_ORBIT_SIM", "HORIZONTAL_PAN_LEFT", "VERTICAL_PAN_DOWN", "DIAGONAL_DRIFT"):
            entry = self.preset_map.resolve(name, animations, "animations")
            self.assertIn("camera", entry, name)
            self.assertIn("layer", entry, name)

    def test_every_transition_preset_maps_to_a_real_xfade(self):
        transitions = self.library.get("transitions")
        for name in ("FADE", "DIP", "CROSS_DISSOLVE", "DIRECTIONAL_WIPE", "LIGHT_FLASH", "GLASS_WIPE",
                     "BLUR_TRANSITION", "ZOOM_TRANSITION", "WHIP_PAN", "DIAGONAL_REVEAL", "MASK_REVEAL",
                     "LENS_FLASH", "SOFT_WHITE_FLASH", "DARK_CUT", "FILM_BURN_SIM"):
            self.assertTrue(self.preset_map.resolve(name, transitions, "transitions")["xfade"], name)

    def test_repeated_motions_from_the_brain_are_separated(self):
        first, second = self.preset_map.resolve_pair(["SLOW_PUSH", "SLOW_PUSH"], self.library.get("animations"))
        self.assertNotEqual(first["id"], second["id"])


    def test_two_motions_are_always_visibly_different(self):
        """Names can collide onto one mechanic - MICRO_ZOOM and PARALLAX did."""
        import itertools
        from brain.preset_map import _mechanic
        animations = self.library.get("animations")
        presets = ["MICRO_ZOOM", "PARALLAX", "MICRO_PARALLAX", "SLOW_PUSH", "DEPTH_ZOOM",
                   "ORBITAL_DRIFT", "CAMERA_ORBIT_SIM", "HORIZONTAL_PAN_LEFT", "VERTICAL_PAN_DOWN",
                   "DIAGONAL_DRIFT", "FLOATING_CARD", "PARTICLE_DRIFT", "GLASS_PANEL_ENTRY",
                   "DATA_LINE_MOTION", "WHIP_MOTION", "BLUR_REVEAL", "TEXT_REVEAL"]
        for pair in itertools.product(presets, repeat=2):
            first, second = self.preset_map.resolve_pair(list(pair), animations)
            self.assertNotEqual(_mechanic(first), _mechanic(second), pair)

    def test_unknown_name_is_deterministic_not_random(self):
        animations = self.library.get("animations")
        a = self.preset_map.resolve("SOMETHING_NOBODY_DEFINED", animations, "animations")
        b = self.preset_map.resolve("SOMETHING_NOBODY_DEFINED", animations, "animations")
        self.assertEqual(a["id"], b["id"])


class NarrationLength(unittest.TestCase):
    """The reel must never cut the speaker off mid-sentence."""

    FLOOR, CEILING = 15.0, 30.0

    def plan(self, spoken: float):
        return bridge.narration_plan(spoken, self.FLOOR, self.CEILING)

    def test_short_narration_still_gets_the_minimum_reel(self):
        tempo, duration = self.plan(6.0)
        self.assertEqual(tempo, 1.0)
        self.assertEqual(duration, self.FLOOR)

    def test_reel_grows_to_hold_the_whole_narration(self):
        tempo, duration = self.plan(21.0)
        self.assertEqual(tempo, 1.0)
        self.assertGreater(duration, self.FLOOR)
        self.assertLessEqual(duration, self.CEILING)
        self.assertGreaterEqual(duration, bridge.VOICE_LEAD_IN + 21.0 + bridge.VOICE_TAIL)

    def test_every_length_leaves_room_for_the_last_word(self):
        for tenth in range(10, 400):
            spoken = tenth / 10
            tempo, duration = self.plan(spoken)
            fitted = spoken / tempo
            self.assertGreaterEqual(
                duration + 0.01, bridge.VOICE_LEAD_IN + fitted + bridge.VOICE_TAIL,
                f"{spoken}s of narration would be cut at {duration}s")
            self.assertGreaterEqual(duration, self.FLOOR)

    def test_a_slightly_long_script_is_paced_up_instead_of_cut(self):
        tempo, duration = self.plan(30.0)
        self.assertGreater(tempo, 1.0)
        self.assertLessEqual(tempo, bridge.VOICE_MAX_TEMPO)
        self.assertLessEqual(duration, self.CEILING + 0.01)

    def test_an_unfittable_script_runs_long_rather_than_truncating(self):
        tempo, duration = self.plan(60.0)
        self.assertEqual(tempo, bridge.VOICE_MAX_TEMPO)
        self.assertGreater(duration, self.CEILING)
        self.assertGreaterEqual(duration, bridge.VOICE_LEAD_IN + 60.0 / tempo + bridge.VOICE_TAIL)

    def test_no_speed_up_is_applied_twice(self):
        _, once = bridge.narration_plan(40.0, self.FLOOR, self.CEILING, allow_tempo=False)
        self.assertGreaterEqual(once, bridge.VOICE_LEAD_IN + 40.0 + bridge.VOICE_TAIL)


class SizeBudget(unittest.TestCase):
    """A longer reel must still be sendable on a phone."""

    VALIDATION = {"max_video_bytes": 26_214_400}

    def video(self, duration):
        return {"duration": duration, "maxrate": "8M", "bufsize": "16M", "abitrate": "192k"}

    def test_short_reel_keeps_the_configured_ceiling(self):
        video = self.video(15.0)
        bridge._fit_size_budget(video, self.VALIDATION)
        self.assertEqual(video["maxrate"], "8M")

    def test_long_reel_is_capped_to_stay_under_the_limit(self):
        for seconds in (25.0, 30.0, 45.0, 60.0):
            video = self.video(seconds)
            bridge._fit_size_budget(video, self.VALIDATION)
            total_bps = bridge._bitrate_bps(video["maxrate"]) + bridge._bitrate_bps(video["abitrate"])
            self.assertLessEqual(total_bps * seconds / 8, self.VALIDATION["max_video_bytes"],
                                 f"{seconds}s reel could exceed the size ceiling")

    def test_the_cap_never_collapses_to_an_unwatchable_bitrate(self):
        video = self.video(600.0)
        bridge._fit_size_budget(video, self.VALIDATION)
        self.assertGreaterEqual(bridge._bitrate_bps(video["maxrate"]), 1_200_000)

    def test_bitrate_units(self):
        self.assertEqual(bridge._bitrate_bps("5M"), 5_000_000)
        self.assertEqual(bridge._bitrate_bps("800k"), 800_000)
        self.assertEqual(bridge._bitrate_bps("nonsense"), 8_000_000)


if __name__ == "__main__":
    unittest.main(verbosity=2)
