from vision_deploy import crypto_utils


def test_encrypt_decrypt_round_trip():
    from cryptography.fernet import Fernet

    key = Fernet.generate_key()
    token = crypto_utils.encrypt_bytes(b"secret-data", key)

    assert token != b"secret-data"
    assert crypto_utils.decrypt_bytes(token, key) == b"secret-data"


def test_fallback_key_file_is_created_when_no_keyring(tmp_path, monkeypatch):
    monkeypatch.setattr(crypto_utils, "_keyring_backend", lambda: (None, None))
    monkeypatch.setattr(crypto_utils, "get_app_data_dir", lambda: tmp_path)

    key = crypto_utils.get_or_create_key()
    assert (tmp_path / ".key").exists()

    # Calling again returns the same key rather than generating a new one.
    assert crypto_utils.get_or_create_key() == key
