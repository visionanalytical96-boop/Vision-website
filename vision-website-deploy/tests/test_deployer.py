import zipfile

import pytest

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
