@echo off
REM Builds VisionWebsiteDeploy.exe - run this ON WINDOWS from this folder.
REM Produces dist\VisionWebsiteDeploy.exe: a single portable file, no installer needed.

setlocal

where python >nul 2>nul
if errorlevel 1 (
    echo Python was not found on PATH. Install Python 3.10+ from python.org and try again.
    exit /b 1
)

echo Installing dependencies...
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m pip install pyinstaller

echo Building VisionWebsiteDeploy.exe...
pyinstaller --noconfirm vision_deploy.spec

echo.
echo Done. The executable is at dist\VisionWebsiteDeploy.exe
endlocal
