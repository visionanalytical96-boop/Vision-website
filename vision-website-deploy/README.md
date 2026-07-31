# Vision Website Deploy

A one-click Windows desktop app that deploys the Vision Analytical website
from `C:\VisionWebsite` to the Ubuntu server, with no terminal, SSH client,
or FTP tool required.

## What it does

Pressing **Deploy Website**:

1. Checks that `C:\VisionWebsite` exists.
2. Zips the folder into `website.zip`.
3. Uploads the zip to the server over SCP.
4. Runs one remote script over SSH that:
   - backs up the current website to `/opt/vision/backups/website/`
     (timestamped, keeping the newest 10 and deleting older ones),
   - extracts the uploaded zip and swaps it into
     `/opt/vision/website/html`,
   - restarts the `vision-website` Docker container,
   - removes temporary files.
5. Verifies the site responds with HTTP 200 at
   `http://192.168.1.11:8088` and shows ✅/❌.

Every step is written to `deploy.log` (next to the app's settings, under
`%APPDATA%\VisionWebsiteDeploy\`) and streamed live into the app's log
window.

## Running from source

```bash
cd vision-website-deploy
pip install -r requirements.txt
python -m vision_deploy.main
```

## Building the Windows .exe

Building a genuine Windows executable requires a Windows machine (PyInstaller
does not cross-compile). Two ways to get one:

- **GitHub Actions (no Windows machine needed):** push to this folder, or
  trigger the *Build: Vision Website Deploy* workflow manually from the
  Actions tab. It builds on a `windows-latest` runner and uploads
  `VisionWebsiteDeploy.exe` as a downloadable artifact.
- **Locally on Windows:** run `build_windows.bat` from this folder. The
  result is `dist\VisionWebsiteDeploy.exe` - a single portable file, no
  installer needed.

## Branding

Drop `logo.png` and `icon.ico` into `assets/` to replace the placeholder
lab/server logo - see `assets/README.md`.

## Settings

Open **Settings** in the app to configure the server IP, SSH username,
password or SSH key, local/remote website folders, Docker container name,
port, and how many backups to keep. Settings are saved locally, encrypted
with a key stored in the OS credential store (Windows Credential Manager),
so the config file alone is useless without the machine's keyring.

## Project layout

```
vision-website-deploy/
├── vision_deploy/
│   ├── main.py          # entry point
│   ├── gui.py            # main window, settings dialog, backups dialog
│   ├── deployer.py       # deploy orchestration
│   ├── ssh_client.py     # SSH/SCP wrapper (paramiko + scp)
│   ├── remote_script.py  # builds the remote backup/replace/restart script
│   ├── backups.py        # lists remote backups over SFTP
│   ├── settings.py       # Settings dataclass + encrypted load/save
│   ├── crypto_utils.py   # Fernet encryption, keyring-backed key storage
│   ├── logger.py         # deploy.log writer
│   ├── branding.py       # theme colors + placeholder logo
│   ├── hooks.py          # extension points for future features
│   └── paths.py          # app-data/log/default-folder locations
├── assets/                # logo.png / icon.ico go here
├── tests/
├── vision_deploy.spec     # PyInstaller build spec
└── build_windows.bat      # local Windows build script
```

## Future features

`vision_deploy/hooks.py` defines a `PostDeployHook` extension point with
disabled stubs for the planned features (Cloudflare cache purge, GitHub
deploy, FTP deploy, automatic SSL check, Docker health check, rollback,
multiple websites, scheduled deploy) so they can be built without
restructuring the deploy flow.
