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


class ConfigEnvOverrideTests(unittest.TestCase):
    """A setting given on the command line has to actually take effect.

    VOICE_LANG=en-in in front of the command was read from the file only, so it
    looked exactly like the option being broken.
    """

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.file = self.tmp / "config.env"
        self.file.write_text("VOICE=1\nVOICE_LANG=mix\nBRAND_PHONE=+91 00000 00000\n", encoding="utf-8")
        self.saved = dict(__import__("os").environ)

    def tearDown(self):
        import os
        os.environ.clear()
        os.environ.update(self.saved)
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_a_command_line_setting_wins_over_the_file(self):
        import os
        os.environ["VOICE_LANG"] = "en-in"
        self.assertEqual(config_env.load(self.file)["VOICE_LANG"], "en-in")

    def test_the_file_is_still_used_when_nothing_overrides_it(self):
        self.assertEqual(config_env.load(self.file)["VOICE_LANG"], "mix")

    def test_a_setting_absent_from_the_file_can_still_be_given(self):
        import os
        os.environ["REEL_MAX_SECONDS"] = "45"
        self.assertEqual(config_env.number(config_env.load(self.file), "REEL_MAX_SECONDS", 30.0), 45.0)

    def test_unrelated_environment_variables_never_leak_in(self):
        import os
        os.environ["PATH"] = "/nowhere"
        os.environ["HOME"] = "/nowhere"
        os.environ["EDITOR"] = "vi"
        loaded = config_env.load(self.file)
        for key in ("PATH", "HOME", "EDITOR"):
            self.assertNotIn(key, loaded)


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


class PresetRotationTests(unittest.TestCase):
    """The server brain repeats itself; the render must not.

    Its whole vocabulary is about five family names, four layout names and six
    motion names. Mapping each name to exactly one library entry pinned 42 real
    runs onto 4 layouts and 5 families - which is what "every post looks the
    same" actually was.
    """

    # The names the real server brain emitted, taken from design history.
    FAMILIES = ["CINEMATIC_LAB", "GLASS_SCIENCE", "SCHEMATIC_LAB", "DARK_LUXURY", "PHARMA_WHITE"]
    LAYOUTS = ["ASYMMETRIC_EDITORIAL", "BOTTOM_STACK", "SIDE_PANEL", "GLASS_CARD"]
    MOTIONS = ["ORBITAL_DRIFT", "DEPTH_ZOOM", "SLOW_PUSH", "HORIZONTAL_PAN_LEFT", "MICRO_PARALLAX"]
    TRANSITIONS = ["MASK_REVEAL", "LIGHT_FLASH", "GLASS_WIPE", "DIP"]
    RUNS = 42

    @classmethod
    def setUpClass(cls):
        from brain import preset_map
        cls.preset_map = preset_map
        cls.library = Library(load_config({}))

    def replay(self, names, kind, lib_key, window=12):
        """Run the same short vocabulary `RUNS` times and collect what came out."""
        seen, recent = [], []
        for run in range(self.RUNS):
            name = names[run % len(names)]
            entry = self.preset_map.resolve_rotated(
                name, self.library.get(lib_key), kind, recent[-window:], f"seed-{run:03d}")
            seen.append(entry["id"])
            recent.append(entry["id"])
        return seen

    def coverage(self, seen, lib_key):
        return len(set(seen)) / len(self.library.get(lib_key))

    def clumping(self, seen, window=3):
        return sum(1 for i in range(1, len(seen)) if seen[i] in seen[max(0, i - window):i])

    def test_a_single_name_no_longer_pins_one_entry(self):
        for kind, lib_key in (("layouts", "layouts"), ("families", "families"),
                              ("animations", "animations"), ("transitions", "transitions")):
            with self.subTest(kind=kind):
                pool = self.preset_map.candidates("BOTTOM_STACK" if kind == "layouts" else "CINEMATIC_LAB",
                                                  self.library.get(lib_key), kind)
                self.assertGreaterEqual(len(pool), 2, f"{kind} still resolves to a single entry")

    def test_layouts_reach_most_of_the_library(self):
        seen = self.replay(self.LAYOUTS, "layouts", "layouts")
        self.assertGreaterEqual(self.coverage(seen, "layouts"), 0.6,
                                f"only {len(set(seen))} layouts in {self.RUNS} runs")

    def test_families_reach_most_of_the_library(self):
        seen = self.replay(self.FAMILIES, "families", "families")
        self.assertGreaterEqual(self.coverage(seen, "families"), 0.5,
                                f"only {len(set(seen))} families in {self.RUNS} runs")

    def test_motions_and_transitions_spread_too(self):
        for names, kind, lib_key in ((self.MOTIONS, "animations", "animations"),
                                     (self.TRANSITIONS, "transitions", "transitions")):
            with self.subTest(kind=kind):
                seen = self.replay(names, kind, lib_key)
                self.assertGreaterEqual(self.coverage(seen, lib_key), 0.55,
                                        f"only {len(set(seen))} {kind} in {self.RUNS} runs")

    def test_the_same_look_does_not_come_back_immediately(self):
        """What the eye notices is not total coverage, it is back-to-back repeats."""
        for names, kind, lib_key in ((self.LAYOUTS, "layouts", "layouts"),
                                     (self.FAMILIES, "families", "families")):
            with self.subTest(kind=kind):
                seen = self.replay(names, kind, lib_key)
                self.assertLessEqual(self.clumping(seen), self.RUNS * 0.2,
                                     f"{kind} repeats within 3 runs too often")

    def test_different_names_widen_into_different_parts_of_the_library(self):
        """The tail sorted alphabetically, so every name reached the same ids."""
        anims = self.library.get("animations")
        bands = {n: [e["id"] for e in self.preset_map.candidates(n, anims, "animations")]
                 for n in self.MOTIONS}
        for a in self.MOTIONS:
            for b in self.MOTIONS:
                if a >= b:
                    continue
                shared = set(bands[a]) & set(bands[b])
                self.assertLess(len(shared), len(bands[a]) - 1,
                                f"{a} and {b} widen into nearly the same entries")

    def test_no_single_entry_dominates_the_rotation(self):
        seen = self.replay(self.MOTIONS, "animations", "animations")
        counts = {value: seen.count(value) for value in set(seen)}
        self.assertLess(max(counts.values()), self.RUNS * 0.3,
                        f"one motion took {max(counts.values())} of {self.RUNS} runs")

    def test_rotation_beats_the_literal_mapping_it_replaced(self):
        for names, kind, lib_key in ((self.LAYOUTS, "layouts", "layouts"),
                                     (self.FAMILIES, "families", "families"),
                                     (self.MOTIONS, "animations", "animations")):
            with self.subTest(kind=kind):
                literal = {self.preset_map.resolve(n, self.library.get(lib_key), kind)["id"]
                           for n in names}
                rotated = set(self.replay(names, kind, lib_key))
                self.assertGreater(len(rotated), len(literal),
                                   f"{kind} rotation adds nothing over the literal map")

    def test_the_literal_best_match_is_still_the_most_likely_one(self):
        """Rotation must widen the pool, not ignore what the server asked for."""
        literal = self.preset_map.resolve("BOTTOM_STACK", self.library.get("layouts"), "layouts")
        picks = [self.preset_map.resolve_rotated("BOTTOM_STACK", self.library.get("layouts"),
                                                 "layouts", [], f"s{i}")["id"] for i in range(200)]
        counts = {value: picks.count(value) for value in set(picks)}
        self.assertEqual(max(counts, key=counts.get), literal["id"],
                         "the server brain's actual choice stopped being the favourite")

    def test_a_recently_used_entry_is_avoided_not_banned(self):
        layouts = self.library.get("layouts")
        literal = self.preset_map.resolve("GLASS_CARD", layouts, "layouts")
        picks = [self.preset_map.resolve_rotated("GLASS_CARD", layouts, "layouts",
                                                 [literal["id"]], f"s{i}")["id"] for i in range(100)]
        self.assertLess(picks.count(literal["id"]), 40, "recency is not being applied")
        self.assertGreater(len(set(picks)), 1)

    def test_two_motions_stay_visibly_different_after_rotation(self):
        import itertools
        animations = self.library.get("animations")
        for pair in itertools.product(self.MOTIONS + ["MICRO_ZOOM", "PARALLAX"], repeat=2):
            for seed in ("a", "b", "c"):
                first, second = self.preset_map.resolve_pair_rotated(list(pair), animations, [], seed)
                self.assertTrue(self.preset_map._distinct(first, second), (pair, seed))

    def test_rotation_is_deterministic_for_a_given_seed(self):
        args = ("SIDE_PANEL", self.library.get("layouts"), "layouts", ["L01_lower_stack"], "fixed-seed")
        self.assertEqual(self.preset_map.resolve_rotated(*args)["id"],
                         self.preset_map.resolve_rotated(*args)["id"])

    def test_an_unknown_name_still_resolves_and_varies(self):
        pool = self.preset_map.candidates("SOMETHING_NOBODY_DEFINED", self.library.get("layouts"), "layouts")
        self.assertGreaterEqual(len(pool), 2)
        self.assertTrue(all(item.get("id") for item in pool))


class PosterRenderTests(unittest.TestCase):
    """The engine writes one flat poster; the brain must replace it.

    Until this existed the whole design system only reached the reel - every
    still post was the engine's photo + one white headline, which is why they
    all looked the same whatever the brain chose.
    """

    @classmethod
    def setUpClass(cls):
        from vision_ai.skills.render_still import Renderer, SceneCopy
        cls.Renderer, cls.SceneCopy = Renderer, SceneCopy
        cls.config = load_config({})
        cls.library = Library(cls.config)

    def renderer(self, index=0):
        lib = self.library
        return self.Renderer(
            design={"design_fingerprint": f"{index:016d}"},
            palette=lib.get("palettes")[index % len(lib.get("palettes"))],
            layout=lib.get("layouts")[index % len(lib.get("layouts"))],
            composition=lib.get("compositions")[index % len(lib.get("compositions"))],
            background=lib.get("backgrounds")[index % len(lib.get("backgrounds"))],
            typography=lib.get("typography")[index % len(lib.get("typography"))],
            effect=lib.by_id("effects", "clean_none") or {},
            photo=None, seed=f"poster-{index}", ghost="HPLC",
            contact=["+91 00000 00000", "test@example.com"])

    def copy(self):
        return (self.SceneCopy("AMC / CMC", "One contract, no surprises",
                               "Scheduled maintenance", ("IQ/OQ/PQ",), "Talk to us"),
                self.SceneCopy("HPLC", "Downtime, budgeted away",
                               "Planned visits", ("Spares",), "Call us"))

    def test_all_three_formats_are_written_at_the_right_size(self):
        tmp = Path(tempfile.mkdtemp())
        try:
            post = tmp / "Vision-Analytical-20260101-000000-POST.png"
            post.write_bytes(b"the engine's flat poster")
            hero, detail = self.copy()
            written = bridge._render_stills(self.renderer(), hero, detail, tmp,
                                            "20260101-000000", post, self.config)
            self.assertEqual(len(written), 3)
            from PIL import Image
            for path in written:
                name = path.stem.rsplit("-", 1)[-1]
                with Image.open(path) as image:
                    self.assertEqual(image.size, bridge.POST_SIZES[name], name)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_the_engine_poster_is_overwritten_in_place(self):
        """The delivery chain already knows this filename - keep it."""
        tmp = Path(tempfile.mkdtemp())
        try:
            post = tmp / "Vision-Analytical-20260101-000000-POST.png"
            post.write_bytes(b"stub")
            hero, detail = self.copy()
            written = bridge._render_stills(self.renderer(), hero, detail, tmp,
                                            "20260101-000000", post, self.config)
            self.assertIn(post, written)
            self.assertGreater(post.stat().st_size, 40000, "the flat stub is still there")
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_different_designs_produce_visibly_different_posters(self):
        """The whole point: the design system has to reach the still image."""
        tmp = Path(tempfile.mkdtemp())
        try:
            hero, detail = self.copy()
            signatures = set()
            for index in range(6):
                out = tmp / f"run{index}"
                out.mkdir()
                post = out / f"Vision-Analytical-2026010{index}-000000-POST.png"
                bridge._render_stills(self.renderer(index), hero, detail, out,
                                      f"2026010{index}-000000", post, self.config)
                from PIL import Image
                with Image.open(post) as image:
                    small = image.convert("RGB").resize((8, 10))
                    signatures.add(tuple(small.getdata()))
            self.assertEqual(len(signatures), 6, "two designs rendered the same poster")
        finally:
            shutil.rmtree(tmp, ignore_errors=True)


class PhotoReviewTests(unittest.TestCase):
    """A photo of the wrong instrument in a named folder reaches a real post."""

    @classmethod
    def setUpClass(cls):
        from brain import photo_review
        cls.review = photo_review

    def make_tree(self, root: Path, wrong: int = 2, right: int = 5):
        from PIL import Image, ImageDraw
        folder = root / "shimadzu" / "lc-2010cht"
        folder.mkdir(parents=True)
        (root / "shimadzu" / "uv-1900i").mkdir(parents=True)
        for i in range(right):  # the same instrument, shifted a little each shot
            image = Image.new("RGB", (900, 1200), (214, 218, 224))
            draw = ImageDraw.Draw(image)
            draw.rectangle((180 + i * 6, 300, 720, 980), fill=(58, 62, 70))
            draw.rectangle((210, 340, 690, 430), fill=(150, 160, 172))
            draw.ellipse((300, 700, 420, 820), fill=(90, 140, 190))
            image.save(folder / f"IMG_90{i}0.jpg", quality=88)
        for i in range(wrong):  # something else entirely
            image = Image.new("RGB", (900, 1200), (240, 235, 120) if i == 0 else (120, 200, 140))
            draw = ImageDraw.Draw(image)
            draw.ellipse((100, 100, 800, 700), fill=(30, 30, 30))
            draw.rectangle((0, 900, 900, 1200), fill=(255, 255, 255))
            image.save(folder / f"IMG_other{i}.jpg", quality=88)
        return folder

    def test_the_odd_photos_are_separated_from_the_rest(self):
        tmp = Path(tempfile.mkdtemp())
        try:
            folder = self.make_tree(tmp)
            found = self.review.photos(folder)
            prints = {p: h for p in found if (h := self.review.fingerprint(p)) is not None}
            groups = self.review.group(prints)
            self.assertEqual(len(groups), 2, "the wrong photos were not separated")
            self.assertEqual(len(groups[0]), 5)
            self.assertTrue(all("other" in p.name for p in groups[1]))
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_shots_of_one_instrument_are_not_split_apart(self):
        """A false alarm every run is as useless as no check at all."""
        tmp = Path(tempfile.mkdtemp())
        try:
            folder = self.make_tree(tmp, wrong=0, right=6)
            found = self.review.photos(folder)
            prints = {p: h for p in found if (h := self.review.fingerprint(p)) is not None}
            self.assertEqual(len(self.review.group(prints)), 1)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_the_cutout_cache_is_not_reviewed_as_a_photo(self):
        tmp = Path(tempfile.mkdtemp())
        try:
            folder = self.make_tree(tmp, wrong=0, right=2)
            from PIL import Image
            Image.new("RGB", (400, 400), (10, 10, 10)).save(folder / "IMG_9000-studio.png")
            self.assertEqual(len(self.review.photos(folder)), 2)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_moving_is_a_dry_run_until_asked(self):
        tmp = Path(tempfile.mkdtemp())
        try:
            folder = self.make_tree(tmp)
            before = len(self.review.photos(folder))
            self.review.move(tmp, "shimadzu/lc-2010cht", "6,7", "shimadzu/uv-1900i", apply=False)
            self.assertEqual(len(self.review.photos(folder)), before, "a dry run moved files")

            self.review.move(tmp, "shimadzu/lc-2010cht", "6,7", "shimadzu/uv-1900i", apply=True)
            self.assertEqual(len(self.review.photos(folder)), before - 2)
            self.assertEqual(len(self.review.photos(tmp / "shimadzu" / "uv-1900i")), 2)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_a_number_outside_the_folder_moves_nothing(self):
        tmp = Path(tempfile.mkdtemp())
        try:
            folder = self.make_tree(tmp)
            self.assertEqual(
                self.review.move(tmp, "shimadzu/lc-2010cht", "99", "shimadzu/uv-1900i", apply=True), 1)
            self.assertEqual(len(self.review.photos(folder)), 7)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_a_stale_cutout_does_not_follow_the_photo_to_a_new_folder(self):
        tmp = Path(tempfile.mkdtemp())
        try:
            folder = self.make_tree(tmp, wrong=0, right=2)
            from PIL import Image
            stale = folder / "IMG_9000-studio.png"
            Image.new("RGB", (400, 400), (10, 10, 10)).save(stale)
            self.review.move(tmp, "shimadzu/lc-2010cht", "1", "shimadzu/uv-1900i", apply=True)
            self.assertFalse(stale.exists(), "the old cutout would be used for the wrong folder")
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_contact_sheet_is_written_for_every_folder(self):
        tmp = Path(tempfile.mkdtemp())
        try:
            self.make_tree(tmp)
            out = tmp / "review"
            self.assertEqual(self.review.sheet(tmp, out), 0)
            sheets = list(out.glob("*.png"))
            self.assertEqual(len(sheets), 1)
            from PIL import Image
            with Image.open(sheets[0]) as image:
                self.assertGreater(image.width, 300)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)


class IntegrateScriptTests(unittest.TestCase):
    """Re-running the installer must be an upgrade, not a refusal.

    The collision guard exists to protect the operator's own brain modules, but
    it also counted this layer's own files - so the second install aborted at
    step 3 while the anchor report at the top still said OK. The engine was left
    unpatched and generation then died on the engine's own bugs.
    """

    SCRIPT = ROOT / "integrate.sh"

    def setUp(self):
        if not shutil.which("bash"):
            self.skipTest("bash is not available")
        self.tmp = Path(tempfile.mkdtemp())
        self.engine = self.tmp / "vision-ai-content"
        self.engine.write_text(ENGINE_SNIPPET, encoding="utf-8")
        self.engine.chmod(0o755)
        # integrate.sh expects the operator's creative-pack to already be there
        shutil.copytree(ROOT / "creative-pack", self.tmp / "prefix" / "creative-pack")
        self.env = {
            **__import__("os").environ,
            "VISION_AI_PREFIX": str(self.tmp / "prefix"),
            "VISION_ENGINE": str(self.engine),
            "VISION_BACKUP_DIR": str(self.tmp / "backups"),
        }

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def integrate(self, *args):
        import subprocess
        return subprocess.run(["bash", str(self.SCRIPT), *args], env=self.env,
                              capture_output=True, text=True, timeout=300)

    def test_installing_twice_succeeds_and_leaves_the_engine_patched(self):
        first = self.integrate()
        self.assertEqual(first.returncode, 0, first.stderr[-600:])
        self.assertIn(MARKER, self.engine.read_text())

        self.integrate("--revert")
        second = self.integrate()
        self.assertEqual(second.returncode, 0,
                         "re-installing refused itself:\n" + second.stderr[-600:])
        self.assertIn(MARKER, self.engine.read_text())

    def test_a_module_the_layer_never_installed_still_blocks(self):
        self.assertEqual(self.integrate().returncode, 0)
        self.integrate("--revert")
        # a brain module that this layer never installed - the operator's own
        brain = Path(self.env["VISION_AI_PREFIX"]) / "brain"
        brain.mkdir(parents=True, exist_ok=True)
        (brain / ".vision-layer-manifest").write_text("", encoding="utf-8")
        (brain / "bridge.py").write_text("# the operator's own module\n", encoding="utf-8")
        blocked = self.integrate()
        self.assertNotEqual(blocked.returncode, 0, "someone else's module was overwritten")
        self.assertIn("did not install", blocked.stderr)

    def test_a_failed_run_says_the_engine_was_not_patched(self):
        """The anchor report scrolls past; the last line has to be the truth."""
        self.assertEqual(self.integrate().returncode, 0)
        self.integrate("--revert")
        manifest = Path(self.env["VISION_AI_PREFIX"]) / "brain" / ".vision-layer-manifest"
        manifest.parent.mkdir(parents=True, exist_ok=True)
        manifest.write_text("", encoding="utf-8")
        (manifest.parent / "bridge.py").write_text("# not ours\n", encoding="utf-8")
        failed = self.integrate()
        self.assertNotEqual(failed.returncode, 0)
        self.assertIn("INTEGRATION DID NOT COMPLETE", failed.stderr)
        self.assertNotIn(MARKER, self.engine.read_text())


class InstagramTests(unittest.TestCase):
    """Every way a Meta token can be wrong, without ever touching the network."""

    @classmethod
    def setUpClass(cls):
        from brain import instagram
        cls.ig = instagram

    def setUp(self):
        self.calls = []
        self._real_call = self.ig.call

    def tearDown(self):
        self.ig.call = self._real_call

    def fake_graph(self, routes: dict):
        """routes maps a path to a response, or to an exception to raise."""
        def call(host, version, path, params, post=False, timeout=120):
            self.calls.append((host, path, dict(params), post))
            answer = routes.get(path, routes.get("*"))
            if answer is None:
                raise self.ig.GraphError(f"unrouted call to {path}")
            if isinstance(answer, Exception):
                raise answer
            return answer
        self.ig.call = call

    def env(self, **overrides):
        base = {"META_APP_ID": "111", "META_APP_SECRET": "secret-value-here",
                "META_ACCESS_TOKEN": "EAAG" + "x" * 40, "META_API_VERSION": "v21.0"}
        base.update(overrides)
        return base

    def run_check(self, env):
        import contextlib, io
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = self.ig.check(env)
        return code, out.getvalue()

    # --- the token itself -------------------------------------------------

    def test_a_token_is_never_printed_in_full(self):
        token = "EAAG" + "s" * 60
        masked = self.ig.mask(token)
        self.assertNotIn(token, masked)
        self.assertNotIn("s" * 10, masked)
        self.assertIn("64 chars", masked)

    def test_check_never_leaks_the_token_or_the_secret(self):
        token, secret = "EAAG" + "z" * 50, "very-secret-value"
        self.fake_graph({"*": self.ig.GraphError("nope")})
        _, text = self.run_check(self.env(META_ACCESS_TOKEN=token, META_APP_SECRET=secret))
        self.assertNotIn(token, text)
        self.assertNotIn(secret, text)

    def test_an_app_token_is_refused_with_the_reason(self):
        code, text = self.run_check(self.env(META_ACCESS_TOKEN="111|app-secret-value"))
        self.assertEqual(code, 1)
        self.assertIn("APP token", text)
        self.assertIn("instagram_content_publish", text)
        self.assertEqual(self.calls, [], "an app token must fail before any network call")

    def test_a_missing_token_asks_for_it_and_stops(self):
        code, text = self.run_check(self.env(META_ACCESS_TOKEN=""))
        self.assertEqual(code, 1)
        self.assertIn("META_ACCESS_TOKEN", text)

    # --- permissions and expiry ------------------------------------------

    def debug(self, **overrides):
        data = {"is_valid": True, "type": "USER", "app_id": "111",
                "expires_at": int(__import__("time").time()) + 60 * 86400,
                "scopes": list(self.ig.REQUIRED_SCOPES)}
        data.update(overrides)
        return {"data": data}

    def working_routes(self, **debug_overrides):
        return {
            "debug_token": self.debug(**debug_overrides),
            "me/accounts": {"data": [{"id": "9", "name": "Vision Analytical",
                                      "instagram_business_account": {"id": "17841", "username": "vision"}}]},
            "17841": {"username": "vision", "followers_count": 120, "media_count": 8},
            "17841/content_publishing_limit": {"data": [{"quota_usage": 2, "config": {"quota_total": 50}}]},
        }

    def test_a_good_token_passes_and_reports_the_account(self):
        self.fake_graph(self.working_routes())
        code, text = self.run_check(self.env())
        self.assertEqual(code, 0, text)
        self.assertIn("@vision", text)
        self.assertIn("2 of 50", text)

    def test_a_missing_publish_permission_is_named(self):
        self.fake_graph(self.working_routes(scopes=["instagram_basic"]))
        code, text = self.run_check(self.env())
        self.assertEqual(code, 1)
        self.assertIn("instagram_content_publish", text)

    def test_an_expired_token_says_so(self):
        self.fake_graph(self.working_routes(expires_at=int(__import__("time").time()) - 3600))
        code, text = self.run_check(self.env())
        self.assertEqual(code, 1)
        self.assertIn("expired", text)

    def test_a_token_about_to_expire_suggests_the_long_lived_swap(self):
        self.fake_graph(self.working_routes(expires_at=int(__import__("time").time()) + 3600))
        _, text = self.run_check(self.env())
        self.assertIn("long-lived", text)

    def test_a_token_from_a_different_app_is_caught(self):
        self.fake_graph(self.working_routes(app_id="999"))
        code, text = self.run_check(self.env())
        self.assertEqual(code, 1)
        self.assertIn("999", text)

    # --- finding the account ---------------------------------------------

    def test_a_page_with_no_instagram_linked_is_explained(self):
        routes = self.working_routes()
        routes["me/accounts"] = {"data": [{"id": "9", "name": "Vision Analytical"}]}
        self.fake_graph(routes)
        code, text = self.run_check(self.env())
        self.assertEqual(code, 1)
        self.assertIn("Linked accounts", text)

    def test_an_instagram_login_token_is_also_understood(self):
        routes = self.working_routes()
        routes["me/accounts"] = self.ig.GraphError("not a page token")
        routes["me"] = {"user_id": "17841", "username": "vision"}
        self.fake_graph(routes)
        code, text = self.run_check(self.env())
        self.assertEqual(code, 0, text)
        self.assertIn("Instagram Login", text)

    def test_a_wrong_ig_user_id_in_config_is_flagged(self):
        self.fake_graph(self.working_routes())
        _, text = self.run_check(self.env(IG_USER_ID="12345"))
        self.assertIn("IG_USER_ID=17841", text)

    # --- publishing -------------------------------------------------------

    def make_reel(self, folder: Path) -> Path:
        reel = folder / "Vision-Analytical-20260101-000000-Reel.mp4"
        reel.write_bytes(b"\x00" * 2048)
        (folder / "Vision-Analytical-20260101-000000-Caption.txt").write_text(
            "AMC that keeps the lab running\n", encoding="utf-8")
        return reel

    def test_publishing_is_a_dry_run_until_asked(self):
        import contextlib, io
        tmp = Path(tempfile.mkdtemp())
        try:
            reel = self.make_reel(tmp)
            self.fake_graph(self.working_routes())
            out = io.StringIO()
            with contextlib.redirect_stdout(out):
                code = self.ig.post(self.env(IG_USER_ID="17841"), reel, "caption",
                                    "https://example.com/reel.mp4", dry_run=True)
            self.assertEqual(code, 0)
            self.assertIn("dry run", out.getvalue())
            self.assertEqual([c for c in self.calls if c[3]], [], "a dry run posted something")
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_a_real_publish_walks_container_then_status_then_publish(self):
        import contextlib, io
        tmp = Path(tempfile.mkdtemp())
        try:
            reel = self.make_reel(tmp)
            self.fake_graph({"17841/media": {"id": "CONTAINER1"},
                             "CONTAINER1": {"status_code": "FINISHED"},
                             "17841/media_publish": {"id": "MEDIA9"}})
            self.ig.PUBLISH_POLL_SECONDS = 0
            out = io.StringIO()
            with contextlib.redirect_stdout(out):
                code = self.ig.post(self.env(IG_USER_ID="17841"), reel, "caption",
                                    "https://example.com/reel.mp4", dry_run=False)
            self.assertEqual(code, 0, out.getvalue())
            self.assertIn("MEDIA9", out.getvalue())
            paths = [c[1] for c in self.calls]
            self.assertEqual(paths, ["17841/media", "CONTAINER1", "17841/media_publish"])
            container = self.calls[0][2]
            self.assertEqual(container["media_type"], "REELS")
            self.assertEqual(container["video_url"], "https://example.com/reel.mp4")
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_a_video_instagram_rejects_does_not_get_published(self):
        import contextlib, io
        tmp = Path(tempfile.mkdtemp())
        try:
            reel = self.make_reel(tmp)
            self.fake_graph({"17841/media": {"id": "C1"},
                             "C1": {"status_code": "ERROR", "status": "bad aspect ratio"}})
            self.ig.PUBLISH_POLL_SECONDS = 0
            out = io.StringIO()
            with contextlib.redirect_stdout(out):
                code = self.ig.post(self.env(IG_USER_ID="17841"), reel, "c",
                                    "https://example.com/r.mp4", dry_run=False)
            self.assertEqual(code, 1)
            self.assertNotIn("17841/media_publish", [c[1] for c in self.calls])
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_without_a_public_url_it_explains_instead_of_failing_blindly(self):
        import contextlib, io
        tmp = Path(tempfile.mkdtemp())
        try:
            reel = self.make_reel(tmp)
            out = io.StringIO()
            with contextlib.redirect_stdout(out):
                code = self.ig.post(self.env(IG_USER_ID="17841"), reel, "c", "", dry_run=True)
            self.assertEqual(code, 1)
            self.assertIn("INSTAGRAM_PUBLIC_BASE", out.getvalue())
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_the_public_folder_gets_a_copy_and_a_matching_url(self):
        tmp = Path(tempfile.mkdtemp())
        try:
            reel = self.make_reel(tmp)
            served = tmp / "public"
            url = self.ig.public_url(reel, {"INSTAGRAM_PUBLIC_BASE": "https://cdn.example.com/reels/",
                                            "INSTAGRAM_PUBLIC_DIR": str(served)}, "")
            self.assertEqual(url, f"https://cdn.example.com/reels/{reel.name}")
            self.assertTrue((served / reel.name).is_file())
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_the_newest_reel_is_the_one_picked(self):
        tmp = Path(tempfile.mkdtemp())
        try:
            import os, time as clock
            for index in range(3):
                path = tmp / f"Vision-Analytical-2026010{index}-000000-Reel.mp4"
                path.write_bytes(b"x")
                os.utime(path, (clock.time() + index, clock.time() + index))
            picked = self.ig.newest_reel({"VISION_READY": str(tmp)})
            self.assertEqual(picked.name, "Vision-Analytical-20260102-000000-Reel.mp4")
        finally:
            shutil.rmtree(tmp, ignore_errors=True)


class ScheduleScriptTests(unittest.TestCase):
    """The timer must produce a different reel each firing, and come off cleanly."""

    SCRIPT = ROOT / "schedule.sh"
    REQUESTS = ROOT / "requests-shimadzu.txt"

    def setUp(self):
        if not shutil.which("bash"):
            self.skipTest("bash is not available")
        self.tmp = Path(tempfile.mkdtemp())
        self.prefix = self.tmp / "prefix"
        (self.prefix / "brain").mkdir(parents=True)
        (self.prefix / "creative-pack" / "history").mkdir(parents=True)
        self.engine = self.tmp / "vision-ai-content"
        self.engine.write_text("#!/usr/bin/env bash\n# vision brain integration\n"
                               'echo "engine got: $1"\n', encoding="utf-8")
        self.engine.chmod(0o755)
        self.units = self.tmp / "units"
        self.units.mkdir()
        self.env = {**__import__("os").environ,
                    "VISION_AI_PREFIX": str(self.prefix),
                    "VISION_ENGINE": str(self.engine),
                    "SYSTEMD_DIR": str(self.units)}

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def run_script(self, *args):
        import subprocess
        return subprocess.run(["bash", str(self.SCRIPT), *args], env=self.env,
                              capture_output=True, text=True, timeout=120)

    def fire(self, times: int) -> list[str]:
        import subprocess
        runner = self.prefix / "brain" / "run-scheduled.sh"
        seen = []
        for _ in range(times):
            done = subprocess.run(["bash", str(runner)], env=self.env,
                                  capture_output=True, text=True, timeout=120)
            self.assertEqual(done.returncode, 0, done.stderr)
            seen.append(done.stdout.strip().splitlines()[0])
        return seen

    def test_install_writes_the_units_and_the_runner(self):
        done = self.run_script("--every", "2h", "--requests", str(self.REQUESTS))
        self.assertEqual(done.returncode, 0, done.stderr)
        self.assertTrue((self.units / "vision-ai-reel.timer").is_file())
        self.assertTrue((self.units / "vision-ai-reel.service").is_file())
        self.assertTrue((self.prefix / "brain" / "run-scheduled.sh").is_file())
        timer = (self.units / "vision-ai-reel.timer").read_text()
        self.assertIn("OnUnitActiveSec=2h", timer)
        self.assertIn("Persistent=false", timer, "missed firings would pile up after downtime")

    def test_generation_stays_blocked_outside_this_one_unit(self):
        """Unattended runs are refused unless the engine is told it is allowed."""
        self.run_script("--requests", str(self.REQUESTS))
        service = (self.units / "vision-ai-reel.service").read_text()
        self.assertIn("VISION_AI_ALLOW_AUTOMATION=1", service)
        runner = (self.prefix / "brain" / "run-scheduled.sh").read_text()
        self.assertNotIn("VISION_AI_ALLOW_AUTOMATION", runner,
                         "the runner must not grant automation on its own")

    def test_each_firing_takes_the_next_request(self):
        self.run_script("--requests", str(self.REQUESTS))
        total = len([line for line in self.REQUESTS.read_text().splitlines()
                     if line.strip() and not line.strip().startswith("#")])
        seen = self.fire(total)
        self.assertEqual(len(set(seen)), total, "the same request came round twice too early")

    def test_the_list_wraps_instead_of_stopping(self):
        self.run_script("--requests", str(self.REQUESTS))
        total = len([line for line in self.REQUESTS.read_text().splitlines()
                     if line.strip() and not line.strip().startswith("#")])
        seen = self.fire(total + 2)
        self.assertEqual(seen[0], seen[total])

    def test_comments_and_blank_lines_are_not_generated(self):
        requests = self.tmp / "list.txt"
        requests.write_text("# a comment\n\nShimadzu UV-1900i\n\n# another\n"
                            "Shimadzu GCMS-QP2020 NX\n", encoding="utf-8")
        self.run_script("--requests", str(requests))
        seen = self.fire(4)
        for line in seen:
            self.assertNotIn("#", line)
            self.assertNotIn("comment", line)
        self.assertEqual(seen[0], seen[2], "a two-line list should wrap after two firings")

    def test_a_request_list_that_is_all_comments_generates_nothing(self):
        import subprocess
        requests = self.tmp / "empty.txt"
        requests.write_text("# nothing to do yet\n\n", encoding="utf-8")
        self.run_script("--requests", str(requests))
        done = subprocess.run(["bash", str(self.prefix / "brain" / "run-scheduled.sh")],
                              env=self.env, capture_output=True, text=True, timeout=60)
        self.assertEqual(done.returncode, 0)
        self.assertIn("empty", done.stdout)
        self.assertNotIn("engine got", done.stdout)

    def test_an_unintegrated_engine_is_refused(self):
        self.engine.write_text("#!/usr/bin/env bash\necho hi\n", encoding="utf-8")
        done = self.run_script("--requests", str(self.REQUESTS))
        self.assertNotEqual(done.returncode, 0)
        self.assertIn("integrate.sh", done.stderr)

    def test_installing_without_a_request_list_refuses_rather_than_guessing(self):
        done = self.run_script("--every", "2h")
        self.assertNotEqual(done.returncode, 0)
        self.assertIn("--requests", done.stderr)

    def test_the_bundled_shimadzu_list_is_shimadzu_only(self):
        """Today's brief: Shimadzu, from the Shimadzu folder."""
        lines = [line.strip() for line in self.REQUESTS.read_text().splitlines()
                 if line.strip() and not line.strip().startswith("#")]
        self.assertTrue(lines)
        for line in lines:
            self.assertIn("shimadzu", line.lower(), line)


class SyncPatchTests(unittest.TestCase):
    """A reel every two hours must not delete the one before it.

    The operator's vision-ipad-sync empties the phone folder before each copy.
    Their script is theirs, so this touches one line and puts it back exactly.
    """

    ORIGINAL = ('#!/usr/bin/env bash\n'
                'set -Eeuo pipefail\n'
                'SRC="/srv/vision-mobile/OUTBOX/LATEST"; DST="/srv/vision-mobile/IPAD"; '
                'TMP="/srv/vision-mobile/.IPAD.tmp"\n'
                'if [ ! -d "$SRC" ]; then echo "SOURCE NOT FOUND"; exit 0; fi\n'
                'rm -rf "$TMP"; mkdir -p "$TMP"; cp -a "$SRC"/. "$TMP"/\n'
                'rm -rf "$DST"/*; cp -a "$TMP"/. "$DST"/; rm -rf "$TMP"\n'
                'find "$DST" -type f -exec chmod 644 {} +\n'
                'echo "IPAD SYNC OK"; find "$DST" -maxdepth 1 -type f -printf \'  %f\\n\' | sort\n')

    @classmethod
    def setUpClass(cls):
        from brain import patch_sync
        cls.patch_sync = patch_sync

    def setUp(self):
        if not shutil.which("bash"):
            self.skipTest("bash is not available")
        self.tmp = Path(tempfile.mkdtemp())
        self.script = self.tmp / "vision-ipad-sync"
        self.script.write_text(self.ORIGINAL, encoding="utf-8")
        self.backups = self.tmp / "backups"

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def bash_ok(self, path: Path) -> bool:
        import subprocess
        return subprocess.run(["bash", "-n", str(path)], capture_output=True).returncode == 0

    def test_the_patched_script_is_still_valid_bash(self):
        self.patch_sync.apply(self.script, 12, self.backups)
        self.assertTrue(self.bash_ok(self.script))

    def test_reverting_restores_the_original_byte_for_byte(self):
        self.patch_sync.apply(self.script, 12, self.backups)
        self.assertNotEqual(self.script.read_text(), self.ORIGINAL)
        self.patch_sync.revert(self.script, self.backups)
        self.assertEqual(self.script.read_text(), self.ORIGINAL)

    def test_a_backup_is_written_before_anything_changes(self):
        self.patch_sync.apply(self.script, 12, self.backups)
        saved = list(self.backups.glob("vision-ipad-sync.*"))
        self.assertEqual(len(saved), 1)
        self.assertEqual(saved[0].read_text(), self.ORIGINAL)

    def test_applying_twice_with_the_same_number_changes_nothing(self):
        self.patch_sync.apply(self.script, 12, self.backups)
        once = self.script.read_text()
        self.patch_sync.apply(self.script, 12, self.backups)
        self.assertEqual(self.script.read_text(), once)

    def test_the_number_can_be_changed_without_stacking_patches(self):
        self.patch_sync.apply(self.script, 12, self.backups)
        self.patch_sync.apply(self.script, 4, self.backups)
        text = self.script.read_text()
        self.assertEqual(text.count(self.patch_sync.MARKER), 2, "the block was applied twice")
        self.assertIn("VISION_IPAD_KEEP:-4", text)
        self.assertTrue(self.bash_ok(self.script))

    def test_a_script_it_does_not_recognise_is_left_alone(self):
        other = self.tmp / "someone-elses-sync"
        other.write_text("#!/bin/sh\nrsync -a /a/ /b/\n", encoding="utf-8")
        before = other.read_text()
        self.assertEqual(self.patch_sync.apply(other, 12, self.backups), 1)
        self.assertEqual(other.read_text(), before)

    def test_reverting_something_never_patched_is_harmless(self):
        self.assertEqual(self.patch_sync.revert(self.script, self.backups), 0)
        self.assertEqual(self.script.read_text(), self.ORIGINAL)

    def run_sync(self, dst: Path, src: Path, keep: int, stamps: list[str]):
        """Drive the real patched script over throwaway folders."""
        import subprocess
        script = self.tmp / "sim"
        script.write_text(self.ORIGINAL, encoding="utf-8")
        self.patch_sync.apply(script, keep, self.backups)
        text = script.read_text().replace(
            'SRC="/srv/vision-mobile/OUTBOX/LATEST"; DST="/srv/vision-mobile/IPAD"; '
            'TMP="/srv/vision-mobile/.IPAD.tmp"',
            f'SRC="{src}"; DST="{dst}"; TMP="{self.tmp}/.tmp"')
        script.write_text(text, encoding="utf-8")
        seen = []
        for stamp in stamps:
            for path in src.glob("*"):
                path.unlink()
            for suffix in ("Reel.mp4", "POST.png", "Caption.txt"):
                (src / f"Vision-Analytical-{stamp}-{suffix}").write_text("x", encoding="utf-8")
            subprocess.run(["bash", str(script)], capture_output=True, check=True)
            seen.append(sorted({p.name.split("-")[2] for p in dst.glob("Vision-Analytical-*")}))
        return seen

    def test_reels_accumulate_and_only_the_oldest_rolls_off(self):
        dst, src = self.tmp / "IPAD", self.tmp / "LATEST"
        dst.mkdir(); src.mkdir()
        stamps = [f"2026080{n}-120000" for n in range(1, 6)]
        seen = self.run_sync(dst, src, 3, stamps)
        self.assertEqual([len(s) for s in seen], [1, 2, 3, 3, 3])
        self.assertEqual(seen[-1], ["20260803", "20260804", "20260805"])

    def test_every_file_of_a_kept_reel_survives_together(self):
        dst, src = self.tmp / "IPAD", self.tmp / "LATEST"
        dst.mkdir(); src.mkdir()
        self.run_sync(dst, src, 3, [f"2026080{n}-120000" for n in range(1, 6)])
        self.assertEqual(len(list(dst.glob("*"))), 9, "a reel lost some of its files")
        for stamp in ("20260803", "20260804", "20260805"):
            self.assertEqual(len(list(dst.glob(f"*{stamp}*"))), 3, stamp)

    def test_unrelated_files_in_the_phone_folder_are_not_deleted(self):
        dst, src = self.tmp / "IPAD", self.tmp / "LATEST"
        dst.mkdir(); src.mkdir()
        keeper = dst / "my-own-notes.txt"
        keeper.write_text("mine", encoding="utf-8")
        self.run_sync(dst, src, 2, [f"2026080{n}-120000" for n in range(1, 5)])
        self.assertTrue(keeper.is_file(), "something that was not a reel was deleted")


class ImportPhotosTests(unittest.TestCase):
    """Photos arrive from a PC in whatever folders their owner made.

    The model is often on a parent folder - "Agilent 1260 Infinity II/Detector" -
    so only reading the folder that holds the file loses those photos.
    """

    @classmethod
    def setUpClass(cls):
        from brain import import_photos
        cls.importer = import_photos
        cls.config = load_config({})
        cls.library = Library(cls.config)

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.staging = self.tmp / "HPLC PHOTOS"
        self.cache = self.tmp / "images"
        self.staging.mkdir(parents=True)
        self.cache.mkdir()

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def photo(self, relative: str, name: str = "IMG_0001.JPG"):
        from PIL import Image
        folder = self.staging / relative
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / name
        Image.new("RGB", (900, 700), (200, 205, 210)).save(path, quality=80)
        return path

    def plan(self):
        return self.importer.plan(self.staging, self.cache, self.library)

    def test_a_model_folder_files_its_photos(self):
        self.photo("Agilent 1260 Infinity II")
        matched, unknown = self.plan()
        self.assertEqual(len(matched), 1)
        self.assertEqual(unknown, [])
        self.assertEqual(matched[0][1].parent.relative_to(self.cache).as_posix(),
                         "agilent/1260-infinity-ii")

    def test_a_sub_folder_inherits_the_model_from_its_parent(self):
        self.photo("Agilent 1260 Infinity II/Detector")
        matched, unknown = self.plan()
        self.assertEqual(unknown, [], "a photo in a sub-category was thrown away")
        self.assertEqual(matched[0][1].parent.relative_to(self.cache).as_posix(),
                         "agilent/1260-infinity-ii")

    def test_a_deeper_sub_folder_still_finds_it(self):
        self.photo("Shimadzu LC-2010CHT/2026/Site visit/Front")
        matched, unknown = self.plan()
        self.assertEqual(unknown, [])
        self.assertEqual(matched[0][1].parent.relative_to(self.cache).as_posix(),
                         "shimadzu/lc-2010cht")

    def test_the_most_specific_folder_wins(self):
        """A model folder nested inside a brand folder must not lose the model."""
        self.photo("Shimadzu/Shimadzu UV-1900i")
        matched, _ = self.plan()
        self.assertEqual(matched[0][1].parent.relative_to(self.cache).as_posix(),
                         "shimadzu/uv-1900i")

    def test_folders_that_are_not_instruments_are_reported_not_guessed(self):
        self.photo("HPLC Columns")
        self.photo("Site Photos")
        matched, unknown = self.plan()
        self.assertEqual(matched, [])
        self.assertEqual(len(unknown), 2)

    def test_nothing_outside_the_staging_tree_is_consulted(self):
        """Walking up must stop at the staging root, not reach the whole disk."""
        outside = self.tmp.parent
        names = self.importer._parent_names(self.staging / "a" / "b" / "x.jpg", self.staging)
        self.assertEqual(names, ["b", "a"])
        self.assertNotIn(self.staging.name, names)
        self.assertNotIn(outside.name, names)

    def sized(self, relative: str, name: str, size: tuple[int, int]):
        from PIL import Image
        folder = self.staging / relative
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / name
        Image.new("RGB", size, (190, 196, 204)).save(path)
        return path

    def test_a_web_sized_image_is_flagged_as_too_small(self):
        """A 1080-wide post cannot be made from a 275px thumbnail."""
        grade, note = self.importer._quality_note(
            self.sized("Agilent 1260 Infinity II", "images.jpg", (275, 183)))
        self.assertEqual(grade, "small")
        self.assertIn("blurry", note)

    def test_a_middling_image_is_flagged_as_soft_not_rejected(self):
        grade, _ = self.importer._quality_note(
            self.sized("Agilent 1260 Infinity II", "500x500.webp", (500, 500)))
        self.assertEqual(grade, "soft")

    def test_a_real_photograph_passes_clean(self):
        grade, note = self.importer._quality_note(
            self.sized("Agilent 1260 Infinity II", "IMG_2201.JPG", (1600, 1200)))
        self.assertEqual(grade, "good")
        self.assertEqual(note, "1600x1200")

    def test_a_small_image_is_still_imported_just_marked(self):
        """The operator decides what to keep; the tool only tells them."""
        self.sized("Agilent 1260 Infinity II", "images.jpg", (275, 183))
        self.importer.run(self.staging, self.cache, self.library, apply=True, move=False)
        self.assertEqual(len(list(self.cache.rglob("*.jpg"))), 1)

    def test_a_file_that_cannot_be_opened_is_not_imported(self):
        folder = self.staging / "Agilent 1260 Infinity II"
        folder.mkdir(parents=True)
        (folder / "broken.jpg").write_bytes(b"this is not an image")
        self.importer.run(self.staging, self.cache, self.library, apply=True, move=False)
        self.assertEqual(list(self.cache.rglob("*.jpg")), [])

    def test_avif_is_read_when_pillow_can(self):
        """Product pages serve AVIF now; skipping it silently loses photos."""
        from vision_ai.skills.imaging import AVIF_READY, IMAGE_SUFFIXES
        if not AVIF_READY:
            self.skipTest("this Pillow has no AVIF support")
        self.assertIn(".avif", IMAGE_SUFFIXES)
        self.sized("Shimadzu LC-2010CHT", "product.avif", (1200, 900))
        matched, unknown = self.plan()
        self.assertEqual(unknown, [])
        self.assertEqual(len(matched), 1)

    def test_a_dry_run_copies_nothing(self):
        self.photo("Agilent 1260 Infinity II")
        self.importer.run(self.staging, self.cache, self.library, apply=False, move=False)
        self.assertEqual(list(self.cache.rglob("*.JPG")), [])

    def test_applying_copies_and_leaves_the_original_alone(self):
        source = self.photo("Agilent 1260 Infinity II")
        self.importer.run(self.staging, self.cache, self.library, apply=True, move=False)
        self.assertTrue(source.is_file(), "the photo on the PC copy was removed")
        self.assertEqual(len(list(self.cache.rglob("*.JPG"))), 1)

    def test_running_twice_does_not_duplicate_the_same_photo(self):
        self.photo("Agilent 1260 Infinity II")
        self.importer.run(self.staging, self.cache, self.library, apply=True, move=False)
        self.importer.run(self.staging, self.cache, self.library, apply=True, move=False)
        self.assertEqual(len(list(self.cache.rglob("*.JPG"))), 1)

    def test_two_different_photos_with_the_same_name_both_survive(self):
        self.photo("Agilent 1260 Infinity II", "IMG_0001.JPG")
        self.importer.run(self.staging, self.cache, self.library, apply=True, move=False)
        from PIL import Image
        Image.new("RGB", (900, 700), (10, 20, 30)).save(
            self.staging / "Agilent 1260 Infinity II" / "IMG_0001.JPG", quality=80)
        self.importer.run(self.staging, self.cache, self.library, apply=True, move=False)
        self.assertEqual(len(list(self.cache.rglob("*.JPG"))), 2)


if __name__ == "__main__":
    unittest.main(verbosity=2)
