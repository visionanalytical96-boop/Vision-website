import pytest

from vision_deploy import ssh_client
from vision_deploy.settings import AUTH_KEY, AUTH_PASSWORD, Settings


def test_password_auth_requires_a_password():
    settings = Settings(auth_method=AUTH_PASSWORD, ssh_password="")
    with pytest.raises(ssh_client.DeployConnectionError, match="No SSH password set"):
        ssh_client._validate_auth_settings(settings)


def test_password_auth_with_password_passes_validation():
    settings = Settings(auth_method=AUTH_PASSWORD, ssh_password="hunter2")
    ssh_client._validate_auth_settings(settings)  # should not raise


def test_key_auth_requires_a_key_path():
    settings = Settings(auth_method=AUTH_KEY, ssh_key_path="")
    with pytest.raises(ssh_client.DeployConnectionError, match="No SSH key file set"):
        ssh_client._validate_auth_settings(settings)


def test_key_auth_requires_the_key_file_to_exist():
    settings = Settings(auth_method=AUTH_KEY, ssh_key_path="/no/such/key")
    with pytest.raises(ssh_client.DeployConnectionError, match="not found"):
        ssh_client._validate_auth_settings(settings)


def test_key_auth_with_existing_file_passes_validation(tmp_path):
    key_file = tmp_path / "id_rsa"
    key_file.write_text("fake-key")
    settings = Settings(auth_method=AUTH_KEY, ssh_key_path=str(key_file))
    ssh_client._validate_auth_settings(settings)  # should not raise
