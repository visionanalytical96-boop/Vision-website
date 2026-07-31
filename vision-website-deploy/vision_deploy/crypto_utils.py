"""Encryption for settings persisted to disk (server credentials included).

Settings are stored as a single Fernet-encrypted blob. The Fernet key itself
is kept out of that file: it lives in the OS credential store via `keyring`
(Windows Credential Manager, macOS Keychain, ...) so a copy of the config
file on its own is useless. When no OS keyring backend is available (e.g. a
minimal CI/dev box) we fall back to a key file with owner-only permissions
next to the config, which is weaker but keeps the app usable everywhere.
"""

from __future__ import annotations

from pathlib import Path

from cryptography.fernet import Fernet

from vision_deploy.paths import get_app_data_dir

KEYRING_SERVICE = "VisionWebsiteDeploy"
KEYRING_USERNAME = "config-encryption-key"


def _keyring_backend():
    try:
        import keyring
        from keyring.errors import NoKeyringError

        # Touching get_keyring() forces backend discovery so a missing
        # backend fails here, not on first real use.
        keyring.get_keyring()
        return keyring, NoKeyringError
    except Exception:
        return None, None


def _fallback_key_file() -> Path:
    return get_app_data_dir() / ".key"


def _load_or_create_fallback_key() -> bytes:
    key_file = _fallback_key_file()
    if key_file.exists():
        return key_file.read_bytes()

    key = Fernet.generate_key()
    key_file.write_bytes(key)
    try:
        key_file.chmod(0o600)
    except OSError:
        pass  # best effort on platforms without POSIX permissions
    return key


def get_or_create_key() -> bytes:
    keyring, no_keyring_error = _keyring_backend()
    if keyring is None:
        return _load_or_create_fallback_key()

    try:
        existing = keyring.get_password(KEYRING_SERVICE, KEYRING_USERNAME)
        if existing:
            return existing.encode("utf-8")

        key = Fernet.generate_key()
        keyring.set_password(KEYRING_SERVICE, KEYRING_USERNAME, key.decode("utf-8"))
        return key
    except Exception:
        return _load_or_create_fallback_key()


def encrypt_bytes(data: bytes, key: bytes) -> bytes:
    return Fernet(key).encrypt(data)


def decrypt_bytes(token: bytes, key: bytes) -> bytes:
    return Fernet(key).decrypt(token)
