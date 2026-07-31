"""Lists deployment backups stored on the server.

Backups live remotely (/opt/vision/backups/website on the Ubuntu server),
so "Open Backup Folder" can't just open a Windows Explorer window - there's
nothing local to point it at. Instead the GUI fetches this listing over the
same SSH connection used for deployment and shows it in-app, keeping the
"no SSH/SFTP client needed" promise.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from vision_deploy.settings import Settings
from vision_deploy.ssh_client import open_connection


@dataclass
class BackupInfo:
    filename: str
    size_bytes: int
    modified_at: datetime


def list_remote_backups(settings: Settings) -> list[BackupInfo]:
    with open_connection(settings) as client:
        sftp = client.open_sftp()
        try:
            entries = sftp.listdir_attr(settings.remote_backup_folder)
        except FileNotFoundError:
            return []
        finally:
            sftp.close()

    backups = [
        BackupInfo(
            filename=entry.filename,
            size_bytes=entry.st_size or 0,
            modified_at=datetime.fromtimestamp(entry.st_mtime or 0),
        )
        for entry in entries
        if entry.filename.startswith("website_backup_") and entry.filename.endswith(".tar.gz")
    ]
    backups.sort(key=lambda b: b.modified_at, reverse=True)
    return backups
