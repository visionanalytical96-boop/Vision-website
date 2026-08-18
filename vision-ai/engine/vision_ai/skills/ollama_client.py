"""Optional short-copy assistant.

Ollama is used for a handful of words at a time and nothing else: no layout
choices, no history reasoning, no paragraphs. Every call is capped by
num_predict and a hard timeout, and every failure degrades silently to the
local template.
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field


@dataclass
class OllamaResult:
    text: str = ""
    ok: bool = False
    seconds: float = 0.0
    error: str = ""


@dataclass
class OllamaClient:
    url: str = "http://127.0.0.1:11434"
    model: str = "qwen2.5:1.5b"
    timeout: float = 8.0
    num_predict: int = 40
    temperature: float = 0.75
    enabled: bool = True
    calls: list[dict] = field(default_factory=list)

    def available(self) -> bool:
        if not self.enabled:
            return False
        try:
            with urllib.request.urlopen(f"{self.url}/api/tags", timeout=min(2.0, self.timeout)):
                return True
        except Exception:
            return False

    def ask(self, prompt: str, max_words: int = 12, num_predict: int | None = None) -> OllamaResult:
        """One tiny prompt, one short line back."""
        if not self.enabled:
            return OllamaResult(error="disabled")
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_predict": int(num_predict or self.num_predict),
                "temperature": self.temperature,
                "top_p": 0.9,
                "stop": ["\n\n"],
            },
        }
        request = urllib.request.Request(
            f"{self.url}/api/generate",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        started = time.perf_counter()
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                body = json.loads(response.read().decode("utf-8"))
            text = clean(body.get("response", ""), max_words)
            result = OllamaResult(text=text, ok=bool(text), seconds=time.perf_counter() - started)
        except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
            result = OllamaResult(seconds=time.perf_counter() - started, error=str(exc)[:120])
        self.calls.append({"seconds": round(result.seconds, 2), "ok": result.ok, "error": result.error})
        return result


def clean(text: str, max_words: int) -> str:
    """Strip the chatter models add around a one-liner."""
    line = (text or "").strip().splitlines()
    if not line:
        return ""
    out = line[0].strip()
    for _ in range(3):  # models like to wrap the answer in a label and quotes
        before = out
        for prefix in ("title:", "headline:", "hook:", "cta:", "answer:", "here is", "sure,"):
            if out.lower().startswith(prefix):
                out = out[len(prefix):]
        out = out.strip().strip('"').strip("'").strip(" :-*")
        if out == before:
            break
    out = out.rstrip(" .,-")
    words = out.split()
    if len(words) > max_words:
        return ""  # too long for a design element - fall back to the local template
    return out
