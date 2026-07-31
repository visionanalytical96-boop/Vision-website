"""Orchestrates one end-to-end deployment run.

Sequence: verify local folder -> zip it -> connect -> upload over SCP ->
run the remote backup/replace/restart script -> verify the site responds ->
clean up the local temp zip. Every step reports through callbacks so the
GUI can update the status light, progress bar and log window without this
module knowing anything about Tk.
"""

from __future__ import annotations

import tempfile
import urllib.error
import urllib.request
import zipfile
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Callable, Optional

from vision_deploy import hooks, ssh_client
from vision_deploy.logger import DeployLogger
from vision_deploy.settings import Settings

STATUS_CONNECTED = "connected"
STATUS_DISCONNECTED = "disconnected"
STATUS_DEPLOYING = "deploying"

StepCallback = Callable[[str], None]
ProgressCallback = Callable[[float], None]
StatusCallback = Callable[[str], None]


class WebsiteFolderNotFoundError(Exception):
    pass


@dataclass
class DeployResult:
    success: bool
    message: str
    started_at: datetime
    finished_at: datetime


class Deployer:
    def __init__(
        self,
        settings: Settings,
        logger: Optional[DeployLogger] = None,
        on_step: Optional[StepCallback] = None,
        on_progress: Optional[ProgressCallback] = None,
        on_status: Optional[StatusCallback] = None,
    ):
        self.settings = settings
        self.logger = logger or DeployLogger()
        self._on_step = on_step or (lambda step: None)
        self._on_progress = on_progress or (lambda pct: None)
        self._on_status = on_status or (lambda status: None)

    def deploy(self) -> DeployResult:
        started_at = datetime.now()
        self.logger.section(f"Deployment started at {started_at.isoformat(timespec='seconds')}")
        self._on_status(STATUS_DEPLOYING)

        try:
            self._step("Checking local website folder", 0.05)
            local_folder = self._require_local_folder()

            self._step("Compressing website files", 0.15)
            zip_path = self._zip_website(local_folder)

            try:
                timestamp = started_at.strftime("%Y%m%d_%H%M%S")
                remote_zip_path = f"/tmp/vision_website_{timestamp}.zip"

                self._step("Connecting to server", 0.25)
                with ssh_client.open_connection(self.settings) as client:
                    self._on_status(STATUS_CONNECTED)

                    self._step("Uploading website archive", 0.4)
                    self._upload(client, zip_path, remote_zip_path)

                    self._step("Deploying on server", 0.7)
                    self._run_remote_deploy(client, remote_zip_path, timestamp)

                self._step("Verifying deployment", 0.9)
                verified = self._verify_deployment()
            finally:
                zip_path.unlink(missing_ok=True)

            finished_at = datetime.now()
            self._on_progress(1.0)

            if verified:
                message = "Website Successfully Deployed"
                self.logger.line(f"SUCCESS: {message}")
            else:
                message = "Deployment Failed - site did not respond with HTTP 200"
                self.logger.line(f"FAILURE: {message}")

            self.logger.section(f"Deployment finished at {finished_at.isoformat(timespec='seconds')}")
            self._on_status(STATUS_CONNECTED if verified else STATUS_DISCONNECTED)

            context = hooks.DeployContext(
                settings=self.settings, logger=self.logger, timestamp=started_at.strftime("%Y%m%d_%H%M%S"),
                success=verified,
            )
            hooks.run_enabled_hooks(context)

            return DeployResult(success=verified, message=message, started_at=started_at, finished_at=finished_at)

        except WebsiteFolderNotFoundError as exc:
            return self._fail(started_at, str(exc))
        except ssh_client.DeployConnectionError as exc:
            return self._fail(started_at, str(exc))
        except ssh_client.RemoteCommandError as exc:
            return self._fail(started_at, f"Deployment failed on server: {exc}")
        except Exception as exc:  # noqa: BLE001 - surfaced to the UI as a failure, not a crash
            return self._fail(started_at, f"Unexpected error: {exc}")

    def _fail(self, started_at: datetime, message: str) -> DeployResult:
        finished_at = datetime.now()
        self.logger.line(f"FAILURE: {message}")
        self.logger.section(f"Deployment finished at {finished_at.isoformat(timespec='seconds')}")
        self._on_status(STATUS_DISCONNECTED)
        return DeployResult(success=False, message=message, started_at=started_at, finished_at=finished_at)

    def _step(self, description: str, progress: float) -> None:
        self.logger.line(description)
        self._on_step(description)
        self._on_progress(progress)

    def _require_local_folder(self) -> Path:
        folder = Path(self.settings.local_website_folder)
        if not folder.is_dir():
            raise WebsiteFolderNotFoundError("Website folder not found.")
        return folder

    def _zip_website(self, folder: Path) -> Path:
        tmp_dir = Path(tempfile.mkdtemp(prefix="vision_deploy_"))
        zip_path = tmp_dir / "website.zip"

        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
            for file_path in folder.rglob("*"):
                if file_path.is_file():
                    archive.write(file_path, file_path.relative_to(folder))

        self.logger.line(f"Created archive: {zip_path.name}")
        return zip_path

    def _upload(self, client, zip_path: Path, remote_zip_path: str) -> None:
        def on_progress(sent: int, total: int) -> None:
            if total:
                self.logger.line(f"Upload progress: {sent}/{total} bytes")

        ssh_client.upload_file(client, str(zip_path), remote_zip_path, progress=on_progress)
        self.logger.line("Upload complete")

    def _run_remote_deploy(self, client, remote_zip_path: str, timestamp: str) -> None:
        from vision_deploy.remote_script import build_deploy_script

        script = build_deploy_script(self.settings, remote_zip_path, timestamp)
        exit_status = ssh_client.run_command(client, script, on_output=self.logger.line)

        if exit_status != 0:
            raise ssh_client.RemoteCommandError(f"remote script exited with status {exit_status}")

        self.logger.line("Container restart requested")

    def _verify_deployment(self) -> bool:
        url = f"http://{self.settings.server_ip}:{self.settings.website_port}"
        try:
            with urllib.request.urlopen(url, timeout=10) as response:  # noqa: S310 - trusted, user-configured host
                status_ok = response.status == 200
                self.logger.line(f"Verification GET {url} -> HTTP {response.status}")
                return status_ok
        except urllib.error.URLError as exc:
            self.logger.line(f"Verification GET {url} failed: {exc}")
            return False
