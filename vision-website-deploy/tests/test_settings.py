from vision_deploy.settings import AUTH_KEY, Settings, SettingsManager


def test_defaults_match_production_server():
    settings = Settings()
    assert settings.server_ip == "192.168.1.11"
    assert settings.ssh_username == "vision"
    assert settings.remote_website_folder == "/opt/vision/website/html"
    assert settings.docker_container == "vision-website"
    assert settings.website_port == 8088
    assert settings.max_backups == 10


def test_save_and_load_round_trip(tmp_path, monkeypatch):
    # Force the fallback key-file path so the test doesn't depend on an OS keyring backend.
    monkeypatch.setattr("vision_deploy.crypto_utils._keyring_backend", lambda: (None, None))
    monkeypatch.setattr("vision_deploy.crypto_utils.get_app_data_dir", lambda: tmp_path)

    manager = SettingsManager(config_file=tmp_path / "config.enc")
    original = Settings(server_ip="10.0.0.5", ssh_password="hunter2", auth_method=AUTH_KEY)

    manager.save(original)
    loaded = manager.load()

    assert loaded == original


def test_load_missing_file_returns_defaults(tmp_path):
    manager = SettingsManager(config_file=tmp_path / "missing.enc")
    assert manager.load() == Settings()


def test_load_corrupt_file_returns_defaults(tmp_path, monkeypatch):
    monkeypatch.setattr("vision_deploy.crypto_utils._keyring_backend", lambda: (None, None))
    monkeypatch.setattr("vision_deploy.crypto_utils.get_app_data_dir", lambda: tmp_path)

    config_file = tmp_path / "config.enc"
    config_file.write_bytes(b"not-encrypted-data")

    manager = SettingsManager(config_file=config_file)
    assert manager.load() == Settings()


def test_config_file_never_contains_plaintext_password(tmp_path, monkeypatch):
    monkeypatch.setattr("vision_deploy.crypto_utils._keyring_backend", lambda: (None, None))
    monkeypatch.setattr("vision_deploy.crypto_utils.get_app_data_dir", lambda: tmp_path)

    config_file = tmp_path / "config.enc"
    manager = SettingsManager(config_file=config_file)
    manager.save(Settings(ssh_password="super-secret-password"))

    raw = config_file.read_bytes()
    assert b"super-secret-password" not in raw
