"""Persisted app settings: server connection details and deployment paths.

Loaded once at startup, edited through the Settings dialog, saved back as an
encrypted blob via `crypto_utils`. Field defaults match the Vision Analytical
production server so a first run needs no configuration.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field

from vision_deploy import crypto_utils
from vision_deploy.paths import get_config_file, get_default_website_folder

AUTH_PASSWORD = "password"
AUTH_KEY = "key"


@dataclass
class Settings:
    server_ip: str = "192.168.1.11"
    ssh_username: str = "vision"
    ssh_port: int = 22
    auth_method: str = AUTH_PASSWORD
    ssh_password: str = ""
    ssh_key_path: str = ""
    ssh_key_passphrase: str = ""

    local_website_folder: str = field(default_factory=lambda: str(get_default_website_folder()))
    remote_website_folder: str = "/opt/vision/website/html"
    remote_backup_folder: str = "/opt/vision/backups/website"
    docker_container: str = "vision-website"

    website_port: int = 8088

    max_backups: int = 10

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "Settings":
        known_fields = {f for f in cls.__dataclass_fields__}
        filtered = {k: v for k, v in data.items() if k in known_fields}
        return cls(**filtered)


class SettingsManager:
    def __init__(self, config_file=None):
        self._config_file = config_file or get_config_file()

    def load(self) -> Settings:
        if not self._config_file.exists():
            return Settings()

        try:
            key = crypto_utils.get_or_create_key()
            encrypted = self._config_file.read_bytes()
            raw = crypto_utils.decrypt_bytes(encrypted, key)
            data = json.loads(raw.decode("utf-8"))
            return Settings.from_dict(data)
        except Exception:
            # Corrupt/undecryptable config shouldn't crash the app - fall
            # back to defaults and let the user re-enter settings.
            return Settings()

    def save(self, settings: Settings) -> None:
        key = crypto_utils.get_or_create_key()
        raw = json.dumps(settings.to_dict()).encode("utf-8")
        encrypted = crypto_utils.encrypt_bytes(raw, key)
        self._config_file.parent.mkdir(parents=True, exist_ok=True)
        self._config_file.write_bytes(encrypted)
