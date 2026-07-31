# PyInstaller spec for Vision Website Deploy.
# Build with: pyinstaller vision_deploy.spec
# (run from the vision-website-deploy/ directory, on Windows, after
# `pip install -r requirements.txt pyinstaller`)

import os

block_cipher = None
here = os.path.dirname(os.path.abspath(SPEC))

icon_path = os.path.join(here, "assets", "icon.ico")
has_icon = os.path.isfile(icon_path)

a = Analysis(
    [os.path.join(here, "vision_deploy", "main.py")],
    pathex=[here],
    binaries=[],
    datas=[(os.path.join(here, "assets"), "assets")],
    hiddenimports=["customtkinter", "PIL._tkinter_finder"],
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="VisionWebsiteDeploy",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    icon=icon_path if has_icon else None,
)
