"""Builds the remote shell script that performs the actual deployment.

Runs entirely over one SSH session so the server never needs to trust a
long-lived agent: backup current site -> rotate old backups -> extract the
uploaded zip -> swap it into place -> restart the container -> clean up
temp files. All settings-derived values are shell-quoted since they
ultimately come from the Settings dialog (user input).
"""

from __future__ import annotations

import shlex

from vision_deploy.settings import Settings


def build_deploy_script(settings: Settings, remote_zip_path: str, timestamp: str) -> str:
    web_dir = shlex.quote(settings.remote_website_folder)
    backup_dir = shlex.quote(settings.remote_backup_folder)
    container = shlex.quote(settings.docker_container)
    zip_path = shlex.quote(remote_zip_path)
    tmp_dir = shlex.quote(f"/tmp/vision_deploy_{timestamp}")
    backup_file = shlex.quote(f"website_backup_{timestamp}.tar.gz")
    max_backups = max(int(settings.max_backups), 1)

    return f"""set -e

WEB_DIR={web_dir}
BACKUP_DIR={backup_dir}
TMP_DIR={tmp_dir}

echo "Preparing directories"
mkdir -p "$BACKUP_DIR"
mkdir -p "$TMP_DIR"

if [ -d "$WEB_DIR" ] && [ -n "$(ls -A "$WEB_DIR" 2>/dev/null)" ]; then
  echo "Backing up current website"
  tar -czf "$BACKUP_DIR"/{backup_file} -C "$(dirname "$WEB_DIR")" "$(basename "$WEB_DIR")"
else
  echo "No existing website to back up"
fi

echo "Rotating backups (keeping newest {max_backups})"
cd "$BACKUP_DIR"
ls -1t website_backup_*.tar.gz 2>/dev/null | tail -n +{max_backups + 1} | xargs -r rm -f

echo "Extracting uploaded website"
unzip -o -q {zip_path} -d "$TMP_DIR"

echo "Replacing website files"
rm -rf "$WEB_DIR"
mkdir -p "$WEB_DIR"
cp -r "$TMP_DIR"/. "$WEB_DIR"/

echo "Restarting container {container}"
docker restart {container}

echo "Cleaning up temporary files"
rm -rf "$TMP_DIR"
rm -f {zip_path}

echo "Deployment script finished"
"""
