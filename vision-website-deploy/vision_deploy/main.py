"""Entry point: `python -m vision_deploy.main` or the built VisionWebsiteDeploy.exe."""

from __future__ import annotations


def run() -> None:
    from vision_deploy.gui import App

    app = App()
    app.mainloop()


if __name__ == "__main__":
    run()
