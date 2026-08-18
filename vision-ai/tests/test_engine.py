"""Engine test-suite.

Run from the repository:  python3 vision-ai/tests/test_engine.py
Add -q to skip the ffmpeg filtergraph sweep (the slow part).
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ENGINE = Path(__file__).resolve().parents[1] / "engine"
sys.path.insert(0, str(ENGINE))

from vision_ai.config import load_config  # noqa: E402
from vision_ai.library import Library  # noqa: E402
from vision_ai.pipeline import Options, Pipeline  # noqa: E402
from vision_ai.skills import copywriter, imaging, motion  # noqa: E402
from vision_ai.skills.audio import AudioChoice  # noqa: E402
from vision_ai.skills.history import DesignHistory, fingerprint, structure_key  # noqa: E402
from vision_ai.skills.instrument import identify  # noqa: E402
from vision_ai.skills.reel import ReelInputs, build_command  # noqa: E402
from vision_ai.skills.selector import DesignSelector, pick_two_animations  # noqa: E402

SWEEP = "-q" not in sys.argv


def make_config(tmp: Path):
    pack = tmp / "creative-pack"
    shutil.copytree(Path(__file__).resolve().parents[1] / "creative-pack", pack)
    return load_config({"paths": {
        "creative_pack": str(pack),
        "input_photos": str(tmp / "INPUT/PHOTOS"),
        "input_videos": str(tmp / "INPUT/VIDEOS"),
        "input_music": str(tmp / "INPUT/MUSIC"),
        "output_ready": str(tmp / "OUTPUT/READY"),
        "work_dir": str(tmp / "work"),
        "audio_dir": str(tmp / "audio"),
        "asset_cache": str(pack / "images"),
    }})


class InstrumentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.library = Library(load_config())

    def test_exact_model_is_preserved(self):
        inst = identify("Agilent 1260 II HPLC", self.library)
        self.assertEqual(inst.manufacturer, "Agilent")
        self.assertEqual(inst.model, "1260 Infinity II")
        self.assertIn("Agilent 1260 Infinity II", inst.image_search_query())

    def test_manufacturer_alias_does_not_match_inside_a_word(self):
        # "hp" must not be found inside "uhplc"
        inst = identify("Thermo Vanquish Core UHPLC", self.library)
        self.assertEqual(inst.manufacturer_id, "thermo")

    def test_unknown_model_keeps_operator_string(self):
        inst = identify("Bruker 9000X analyzer", self.library)
        self.assertEqual(inst.model, "9000X")
        self.assertFalse(inst.matched_known_model)

    def test_service_and_technique(self):
        inst = identify("IQ/OQ/PQ for Shimadzu UV-1900i", self.library)
        self.assertEqual(inst.service_id, "qualification")
        self.assertEqual(inst.technique, "UV-Vis")
        self.assertEqual(inst.model, "UV-1900i")


class ImagingTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.photos = self.tmp / "PHOTOS"
        self.photos.mkdir()
        self.library = Library(load_config())
        for name in ("Agilent-1260-Infinity-II-front.jpg", "Agilent-HPLC-bench.jpg"):
            (self.photos / name).write_bytes(b"x")

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_exact_model_photo_wins(self):
        asset = imaging.resolve(identify("Agilent 1260 II", self.library), self.tmp / "cache", self.photos)
        self.assertTrue(asset.exact_match)
        self.assertIn("1260", asset.name)

    def test_never_substitutes_another_model(self):
        asset = imaging.resolve(identify("Agilent 1290 II", self.library), self.tmp / "cache", self.photos)
        self.assertNotIn("1260", asset.name)
        self.assertFalse(asset.exact_match)

    def test_typographic_fallback_when_nothing_matches(self):
        asset = imaging.resolve(identify("Shimadzu Nexera X3", self.library), self.tmp / "cache", self.photos)
        self.assertIsNone(asset.path)
        self.assertEqual(asset.source, imaging.SOURCE_NONE)


class SelectorTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.config = make_config(self.tmp)
        self.library = Library(self.config)
        self.history = DesignHistory(self.tmp / "history.jsonl")
        self.selector = DesignSelector(self.library, self.history, self.config.anti_repetition)

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_two_animations_always_differ(self):
        animations = self.library.get("animations")
        for _ in range(500):
            first, second = pick_two_animations(self.selector.rng, animations, [])
            self.assertNotEqual(first["id"], second["id"])

    def test_no_repeated_fingerprint_or_recent_structure(self):
        fields = {"manufacturer": "Agilent", "instrument_model": "1260 Infinity II"}
        designs = []
        for _ in range(150):
            design = self.selector.select(fields)
            designs.append(design)
            self.history.records.append(design)
        self.assertEqual(len({d["design_fingerprint"] for d in designs}), len(designs))
        for index, design in enumerate(designs):
            window = {structure_key(d) for d in designs[max(0, index - 10):index]}
            self.assertNotIn(structure_key(design), window)
            self.assertNotEqual(design["animation_1"], design["animation_2"])

    def test_fingerprint_is_stable_and_field_sensitive(self):
        base = {field: "x" for field in ("manufacturer", "instrument_model", "design_family", "background",
                                         "composition", "color_palette", "layout", "typography", "camera",
                                         "animation_1", "animation_2", "transition", "effect",
                                         "music_style", "voice_style")}
        self.assertEqual(fingerprint(base), fingerprint(dict(base)))
        changed = dict(base, effect="y")
        self.assertNotEqual(fingerprint(base), fingerprint(changed))


class CopyTests(unittest.TestCase):
    def test_local_copy_never_invents_a_model_number(self):
        library = Library(load_config())
        inst = identify("Agilent 1260 II HPLC", library)
        pack = copywriter.build(inst, {"design_fingerprint": "seed"}, client=None)
        self.assertTrue(pack.headline)
        self.assertIn("Vision Analytical", pack.caption)
        self.assertFalse(copywriter._protects_identity("Agilent 1290", inst))
        self.assertTrue(copywriter._protects_identity("1260 uptime", inst))


class AutomationGuardTests(unittest.TestCase):
    def test_systemd_invocation_is_refused(self):
        import os

        from vision_ai.pipeline import AutomationBlocked, guard_automation

        config = load_config()
        os.environ["INVOCATION_ID"] = "test"
        try:
            with self.assertRaises(AutomationBlocked):
                guard_automation(config)
        finally:
            del os.environ["INVOCATION_ID"]


class PipelineTests(unittest.TestCase):
    """End-to-end run against a sandbox tree (no server paths touched)."""

    @classmethod
    def setUpClass(cls):
        if not shutil.which("ffmpeg"):
            raise unittest.SkipTest("ffmpeg is not installed")
        cls.tmp = Path(tempfile.mkdtemp())
        cls.config = make_config(cls.tmp)
        photos = cls.tmp / "INPUT/PHOTOS"
        photos.mkdir(parents=True)
        (cls.tmp / "INPUT/MUSIC").mkdir(parents=True)
        from PIL import Image
        Image.new("RGB", (1600, 1200), (220, 226, 232)).save(photos / "Agilent-1260-Infinity-II-front.jpg")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi",
                        "-i", "sine=frequency=220:duration=20", "-c:a", "libmp3lame",
                        str(cls.tmp / "INPUT/MUSIC/test-cinematic.mp3")], check=True)
        cls.outcome = Pipeline(cls.config, Options(request="AMC for Agilent 1260 II HPLC",
                                                   use_ollama=False, seed=11)).run()

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def test_all_outputs_exist_and_validate(self):
        for name in ("POST", "SQUARE", "STORY", "Reel", "Caption", "Info"):
            self.assertIn(name, self.outcome.files, name)
            self.assertTrue(self.outcome.files[name].is_file())
        for name, report in self.outcome.reports.items():
            self.assertTrue(report.ok, f"{name}: {[c.detail for c in report.failures]}")
        self.assertTrue(self.outcome.ok)

    def test_history_record_written(self):
        records = [json.loads(line) for line in
                   self.config.history_file.read_text().splitlines() if line.strip()]
        self.assertEqual(len(records), 1)
        record = records[0]
        for field in ("design_fingerprint", "image_search_query", "animation_1", "animation_2", "output_path"):
            self.assertTrue(record.get(field), field)
        self.assertNotEqual(record["animation_1"], record["animation_2"])

    def test_info_file_reports_the_full_design(self):
        info = self.outcome.files["Info"].read_text()
        for field in ("Design Fingerprint", "Image Search Query", "Animation 1", "Animation 2",
                      "Transition", "Effect", "Resolution", "FPS", "GPU"):
            self.assertIn(field, info)
        self.assertIn("Agilent 1260 Infinity II", info)


@unittest.skipUnless(SWEEP and shutil.which("ffmpeg"), "filtergraph sweep disabled")
class FilterGraphSweepTests(unittest.TestCase):
    """Every animation, transition and effect must produce a graph ffmpeg accepts."""

    @classmethod
    def setUpClass(cls):
        cls.tmp = Path(tempfile.mkdtemp())
        cls.library = Library(load_config())
        from PIL import Image
        cls.base = cls.tmp / "base.png"
        cls.text = cls.tmp / "text.png"
        Image.new("RGB", (480, 854), (40, 50, 60)).save(cls.base)
        Image.new("RGBA", (320, 568), (255, 255, 255, 90)).save(cls.text)
        cls.video = {"width": 320, "height": 568, "fps": 12, "duration": 2.0,
                     "transition_duration": 0.4, "vcodec": "libx264", "profile": "high",
                     "preset": "ultrafast", "crf": 30, "pix_fmt": "yuv420p", "acodec": "aac",
                     "abitrate": "96k", "sample_rate": 48000, "channels": 2, "faststart": True,
                     "render_scale": 1.5}

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def _run(self, animation_a, animation_b, transition, effect, label):
        sprite = None
        if motion.uses_sprite(effect):
            from vision_ai.skills.reel import make_sprite
            image = make_sprite(effect, (320, 568), "#22D3EE")
            sprite = self.tmp / "sprite.png"
            image.save(sprite)
        inputs = ReelInputs(self.base, self.text, self.base, self.text,
                            animation_a, animation_b, transition, effect, AudioChoice(), sprite)
        out = self.tmp / f"{label}.mp4"
        command = build_command(inputs, out, self.video)
        proc = subprocess.run(command, capture_output=True, text=True, timeout=180)
        self.assertEqual(proc.returncode, 0, f"{label}: {proc.stderr[-500:]}")
        self.assertTrue(out.is_file() and out.stat().st_size > 1000, label)
        out.unlink()

    def test_every_animation(self):
        animations = self.library.get("animations")
        transition = self.library.by_id("transitions", "fade")
        effect = self.library.by_id("effects", "clean_none")
        for animation in animations:
            other = animations[(animations.index(animation) + 1) % len(animations)]
            with self.subTest(animation=animation["id"]):
                self._run(animation, other, transition, effect, f"anim-{animation['id']}")

    def test_every_transition(self):
        animations = self.library.get("animations")
        effect = self.library.by_id("effects", "clean_none")
        for transition in self.library.get("transitions"):
            with self.subTest(transition=transition["id"]):
                self._run(animations[0], animations[1], transition, effect, f"trans-{transition['id']}")

    def test_every_effect(self):
        animations = self.library.get("animations")
        transition = self.library.by_id("transitions", "fade")
        for effect in self.library.get("effects"):
            with self.subTest(effect=effect["id"]):
                self._run(animations[0], animations[1], transition, effect, f"fx-{effect['id']}")


if __name__ == "__main__":
    unittest.main(argv=[sys.argv[0]] + [a for a in sys.argv[1:] if a != "-q"], verbosity=2)
