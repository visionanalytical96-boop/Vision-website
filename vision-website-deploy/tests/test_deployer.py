import tempfile
import zipfile
from contextlib import contextmanager
from pathlib import Path

import pytest

from vision_deploy import ssh_client
from vision_deploy.deployer import Deployer, WebsiteFolderNotFoundError
from vision_deploy.logger import DeployLogger
from vision_deploy.settings import Settings


def _deployer(tmp_path, **settings_kwargs):
    settings = Settings(local_website_folder=str(tmp_path / "site"), **settings_kwargs)
    logger = DeployLogger(log_file=tmp_path / "deploy.log")
    return Deployer(settings=settings, logger=logger)


def test_deploy_fails_when_local_folder_missing(tmp_path):
    deployer = _deployer(tmp_path)
    result = deployer.deploy()

    assert result.success is False
    assert "not found" in result.message.lower()


def test_require_local_folder_raises_for_missing_dir(tmp_path):
    deployer = _deployer(tmp_path)
    with pytest.raises(WebsiteFolderNotFoundError):
        deployer._require_local_folder()


def test_zip_website_includes_nested_files(tmp_path):
    site_dir = tmp_path / "site"
    (site_dir / "css").mkdir(parents=True)
    (site_dir / "index.html").write_text("<html></html>")
    (site_dir / "css" / "style.css").write_text("body {}")

    deployer = _deployer(tmp_path)
    zip_path = deployer._zip_website(site_dir)

    with zipfile.ZipFile(zip_path) as archive:
        names = set(archive.namelist())

    assert "index.html" in names
    assert "css/style.css" in names


def test_deploy_removes_local_temp_directory_even_on_failure(tmp_path, monkeypatch):
    site_dir = tmp_path / "site"
    site_dir.mkdir()
    (site_dir / "index.html").write_text("<html></html>")

    @contextmanager
    def fail_to_connect(*args, **kwargs):
        raise ssh_client.DeployConnectionError("boom")
        yield  # pragma: no cover - unreachable, makes this a generator function

    monkeypatch.setattr(ssh_client, "open_connection", fail_to_connect)

    system_tmp = Path(tempfile.gettempdir())
    before = set(system_tmp.glob("vision_deploy_*"))

    deployer = _deployer(tmp_path)
    result = deployer.deploy()

    after = set(system_tmp.glob("vision_deploy_*"))
    assert result.success is False
    assert after == before, "deploy() left a temp directory behind after failing"


def test_upload_progress_callback_matches_scp_signature(tmp_path):
    # scp.SCPClient's `progress` callback is always invoked as
    # (filename, size, sent) - three positional args, not two. Regression
    # test for a callback defined with the wrong arity crashing mid-upload.
    deployer = _deployer(tmp_path)
    captured = {}

    class FakeSCPClient:
        def __init__(self, transport, progress=None):
            captured["progress"] = progress

        def put(self, local_path, remote_path):
            captured["progress"]("website.zip", 1000, 0)
            captured["progress"]("website.zip", 1000, 500)
            captured["progress"]("website.zip", 1000, 1000)

        def __enter__(self):
            return self

        def __exit__(self, *exc_info):
            return False

    class FakeClient:
        def get_transport(self):
            return None

    import vision_deploy.ssh_client as ssh_client_module

    original_scp_client = ssh_client_module.SCPClient
    ssh_client_module.SCPClient = FakeSCPClient
    try:
        zip_path = tmp_path / "website.zip"
        zip_path.write_bytes(b"fake zip contents")
        deployer._upload(client=FakeClient(), zip_path=zip_path, remote_zip_path="/tmp/website.zip")
    finally:
        ssh_client_module.SCPClient = original_scp_client
