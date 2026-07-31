"""Main application window.

Deploys run on a background thread (network I/O would otherwise freeze the
UI); progress/log/status updates come back through a thread-safe queue that
the Tk main loop drains on a timer. This is the only place threading is
touched - `deployer.py` just calls its callbacks synchronously.
"""

from __future__ import annotations

import os
import queue
import subprocess
import sys
import threading
import webbrowser
from pathlib import Path

import customtkinter as ctk
from PIL import Image

from vision_deploy import backups, branding
from vision_deploy.deployer import STATUS_CONNECTED, STATUS_DEPLOYING, STATUS_DISCONNECTED, Deployer
from vision_deploy.logger import DeployLogger
from vision_deploy.settings import AUTH_KEY, AUTH_PASSWORD, Settings, SettingsManager

APP_TITLE = "Vision Website Deploy"
COMPANY_NAME = "Vision Analytical"

STATUS_LABELS = {
    STATUS_CONNECTED: ("Connected", branding.COLOR_STATUS_CONNECTED),
    STATUS_DISCONNECTED: ("Disconnected", branding.COLOR_STATUS_DISCONNECTED),
    STATUS_DEPLOYING: ("Deploying", branding.COLOR_STATUS_DEPLOYING),
}


def _open_in_file_manager(path: Path) -> None:
    if sys.platform == "win32":
        os.startfile(path)  # noqa: S606 - user-chosen local path, Windows-only API
    elif sys.platform == "darwin":
        subprocess.Popen(["open", str(path)])
    else:
        subprocess.Popen(["xdg-open", str(path)])


class App(ctk.CTk):
    def __init__(self):
        super().__init__()

        ctk.set_appearance_mode("dark")
        self._settings_manager = SettingsManager()
        self.settings = self._settings_manager.load()

        self._events: "queue.Queue[tuple[str, object]]" = queue.Queue()
        self._deploying = False

        self._configure_window()
        self._build_layout()
        self._set_status(STATUS_DISCONNECTED)
        self.after(150, self._drain_events)

    # -- window chrome ----------------------------------------------------

    def _configure_window(self) -> None:
        self.title(APP_TITLE)
        self.geometry("880x680")
        self.minsize(720, 560)
        self.configure(fg_color=branding.COLOR_BACKGROUND)

        icon = branding.icon_path()
        if icon and sys.platform == "win32":
            try:
                self.iconbitmap(str(icon))
            except Exception:
                pass

        self.protocol("WM_DELETE_WINDOW", self._on_exit)

    def _build_layout(self) -> None:
        self._build_header()
        self._build_status_and_progress()
        self._build_log()
        self._build_buttons()

    # -- header -------------------------------------------------------------

    def _build_header(self) -> None:
        header = ctk.CTkFrame(self, fg_color=branding.COLOR_SURFACE, corner_radius=0)
        header.pack(fill="x", side="top")

        inner = ctk.CTkFrame(header, fg_color="transparent")
        inner.pack(fill="x", padx=24, pady=18)

        logo_image = self._load_logo_image()
        logo_label = ctk.CTkLabel(inner, image=logo_image, text="")
        logo_label.pack(side="left")

        text_frame = ctk.CTkFrame(inner, fg_color="transparent")
        text_frame.pack(side="left", padx=16)

        ctk.CTkLabel(
            text_frame, text=APP_TITLE, font=ctk.CTkFont(size=24, weight="bold"), text_color=branding.COLOR_TEXT
        ).pack(anchor="w")
        ctk.CTkLabel(
            text_frame, text=COMPANY_NAME, font=ctk.CTkFont(size=14), text_color=branding.COLOR_ACCENT
        ).pack(anchor="w")

    def _load_logo_image(self) -> ctk.CTkImage:
        path = branding.logo_path()
        pil_image = Image.open(path) if path else branding.build_placeholder_logo()
        return ctk.CTkImage(light_image=pil_image, dark_image=pil_image, size=(64, 64))

    # -- status + progress ---------------------------------------------------

    def _build_status_and_progress(self) -> None:
        section = ctk.CTkFrame(self, fg_color="transparent")
        section.pack(fill="x", padx=24, pady=(20, 8))

        status_row = ctk.CTkFrame(section, fg_color="transparent")
        status_row.pack(fill="x")

        self._status_dot = ctk.CTkLabel(status_row, text="●", font=ctk.CTkFont(size=18))
        self._status_dot.pack(side="left")

        self._status_label = ctk.CTkLabel(
            status_row, text="", font=ctk.CTkFont(size=14, weight="bold"), text_color=branding.COLOR_TEXT
        )
        self._status_label.pack(side="left", padx=(8, 0))

        self._step_label = ctk.CTkLabel(
            status_row, text="Idle", font=ctk.CTkFont(size=13), text_color=branding.COLOR_TEXT_MUTED
        )
        self._step_label.pack(side="right")

        self._progress_bar = ctk.CTkProgressBar(
            section, progress_color=branding.COLOR_ACCENT, fg_color=branding.COLOR_SURFACE_ALT
        )
        self._progress_bar.set(0)
        self._progress_bar.pack(fill="x", pady=(10, 0))

    # -- log window -----------------------------------------------------------

    def _build_log(self) -> None:
        frame = ctk.CTkFrame(self, fg_color=branding.COLOR_SURFACE, corner_radius=10)
        frame.pack(fill="both", expand=True, padx=24, pady=8)

        ctk.CTkLabel(
            frame, text="Deployment Log", font=ctk.CTkFont(size=13, weight="bold"), text_color=branding.COLOR_TEXT_MUTED
        ).pack(anchor="w", padx=12, pady=(10, 0))

        self._log_box = ctk.CTkTextbox(
            frame,
            fg_color=branding.COLOR_BACKGROUND,
            text_color=branding.COLOR_TEXT,
            font=ctk.CTkFont(family="Consolas", size=12),
            wrap="word",
        )
        self._log_box.pack(fill="both", expand=True, padx=12, pady=12)
        self._log_box.configure(state="disabled")

    # -- buttons --------------------------------------------------------------

    def _build_buttons(self) -> None:
        row = ctk.CTkFrame(self, fg_color="transparent")
        row.pack(fill="x", padx=24, pady=(4, 20))

        self._deploy_button = ctk.CTkButton(
            row,
            text="Deploy Website",
            command=self._on_deploy_clicked,
            fg_color=branding.COLOR_ACCENT,
            hover_color=branding.COLOR_ACCENT_HOVER,
            text_color="#03222E",
            font=ctk.CTkFont(size=14, weight="bold"),
            height=40,
        )
        self._deploy_button.pack(side="left")

        secondary_buttons = [
            ("Open Website", self._on_open_website),
            ("Open Website Folder", self._on_open_website_folder),
            ("Open Backup Folder", self._on_open_backup_folder),
            ("Settings", self._on_open_settings),
            ("Exit", self._on_exit),
        ]
        for text, command in secondary_buttons:
            ctk.CTkButton(
                row,
                text=text,
                command=command,
                fg_color=branding.COLOR_SURFACE_ALT,
                hover_color=branding.COLOR_BORDER,
                text_color=branding.COLOR_TEXT,
                height=40,
            ).pack(side="left", padx=(10, 0))

    # -- deploy flow ------------------------------------------------------------

    def _on_deploy_clicked(self) -> None:
        if self._deploying:
            return

        self._deploying = True
        self._deploy_button.configure(state="disabled", text="Deploying...")
        self._log_box.configure(state="normal")
        self._log_box.delete("1.0", "end")
        self._log_box.configure(state="disabled")
        self._progress_bar.set(0)

        logger = DeployLogger(on_line=lambda line: self._events.put(("log", line)))
        deployer = Deployer(
            settings=self.settings,
            logger=logger,
            on_step=lambda step: self._events.put(("step", step)),
            on_progress=lambda pct: self._events.put(("progress", pct)),
            on_status=lambda status: self._events.put(("status", status)),
        )

        thread = threading.Thread(target=self._run_deploy, args=(deployer,), daemon=True)
        thread.start()

    def _run_deploy(self, deployer: Deployer) -> None:
        result = deployer.deploy()
        self._events.put(("done", result))

    def _drain_events(self) -> None:
        try:
            while True:
                kind, payload = self._events.get_nowait()
                self._handle_event(kind, payload)
        except queue.Empty:
            pass
        finally:
            self.after(150, self._drain_events)

    def _handle_event(self, kind: str, payload: object) -> None:
        if kind == "log":
            self._append_log(str(payload))
        elif kind == "step":
            self._step_label.configure(text=str(payload))
        elif kind == "progress":
            self._progress_bar.set(float(payload))  # type: ignore[arg-type]
        elif kind == "status":
            self._set_status(str(payload))
        elif kind == "done":
            self._finish_deploy(payload)  # type: ignore[arg-type]

    def _finish_deploy(self, result) -> None:
        self._deploying = False
        self._deploy_button.configure(state="normal", text="Deploy Website")
        icon = "✅" if result.success else "❌"
        self._step_label.configure(text=f"{icon} {result.message}")

    def _append_log(self, line: str) -> None:
        self._log_box.configure(state="normal")
        self._log_box.insert("end", line + "\n")
        self._log_box.see("end")
        self._log_box.configure(state="disabled")

    def _set_status(self, status: str) -> None:
        label, color = STATUS_LABELS.get(status, ("Unknown", branding.COLOR_TEXT_MUTED))
        self._status_dot.configure(text_color=color)
        self._status_label.configure(text=label)

    # -- toolbar actions ----------------------------------------------------

    def _on_open_website(self) -> None:
        url = f"http://{self.settings.server_ip}:{self.settings.website_port}"
        webbrowser.open(url)

    def _on_open_website_folder(self) -> None:
        folder = Path(self.settings.local_website_folder)
        folder.mkdir(parents=True, exist_ok=True)
        _open_in_file_manager(folder)

    def _on_open_backup_folder(self) -> None:
        BackupsDialog(self, self.settings)

    def _on_open_settings(self) -> None:
        dialog = SettingsDialog(self, self.settings)
        self.wait_window(dialog)
        if dialog.saved_settings is not None:
            self.settings = dialog.saved_settings
            self._settings_manager.save(self.settings)

    def _on_exit(self) -> None:
        self.destroy()


class SettingsDialog(ctk.CTkToplevel):
    def __init__(self, parent: App, settings: Settings):
        super().__init__(parent)
        self.title("Settings")
        self.geometry("520x620")
        self.configure(fg_color=branding.COLOR_BACKGROUND)
        self.transient(parent)
        self.grab_set()

        self._original = settings
        self.saved_settings: Settings | None = None

        self._auth_var = ctk.StringVar(value=settings.auth_method)

        self._build_form(settings)

    def _labeled_entry(self, parent, label: str, initial: str, show: str | None = None) -> ctk.CTkEntry:
        ctk.CTkLabel(parent, text=label, text_color=branding.COLOR_TEXT_MUTED).pack(anchor="w", pady=(10, 2))
        entry = ctk.CTkEntry(parent, show=show or "")
        entry.insert(0, initial)
        entry.pack(fill="x")
        return entry

    def _build_form(self, settings: Settings) -> None:
        container = ctk.CTkScrollableFrame(self, fg_color="transparent")
        container.pack(fill="both", expand=True, padx=20, pady=20)

        self._server_ip = self._labeled_entry(container, "Server IP", settings.server_ip)
        self._ssh_username = self._labeled_entry(container, "SSH Username", settings.ssh_username)

        ctk.CTkLabel(container, text="Authentication", text_color=branding.COLOR_TEXT_MUTED).pack(
            anchor="w", pady=(14, 2)
        )
        auth_row = ctk.CTkFrame(container, fg_color="transparent")
        auth_row.pack(fill="x")
        ctk.CTkRadioButton(auth_row, text="Password", variable=self._auth_var, value=AUTH_PASSWORD).pack(
            side="left"
        )
        ctk.CTkRadioButton(auth_row, text="SSH Key", variable=self._auth_var, value=AUTH_KEY).pack(
            side="left", padx=(20, 0)
        )

        self._ssh_password = self._labeled_entry(
            container, "SSH Password", settings.ssh_password, show="*"
        )
        self._ssh_key_path = self._labeled_entry(container, "SSH Key File", settings.ssh_key_path)
        self._ssh_key_passphrase = self._labeled_entry(
            container, "Key Passphrase (optional)", settings.ssh_key_passphrase, show="*"
        )

        self._local_website_folder = self._labeled_entry(
            container, "Website Folder (local)", settings.local_website_folder
        )
        self._remote_website_folder = self._labeled_entry(
            container, "Website Folder (server)", settings.remote_website_folder
        )
        self._remote_backup_folder = self._labeled_entry(
            container, "Backup Folder (server)", settings.remote_backup_folder
        )
        self._docker_container = self._labeled_entry(container, "Docker Container", settings.docker_container)
        self._website_port = self._labeled_entry(container, "Port", str(settings.website_port))
        self._max_backups = self._labeled_entry(container, "Backups to Keep", str(settings.max_backups))

        button_row = ctk.CTkFrame(self, fg_color="transparent")
        button_row.pack(fill="x", padx=20, pady=(0, 20))
        ctk.CTkButton(
            button_row, text="Save", command=self._on_save, fg_color=branding.COLOR_ACCENT, text_color="#03222E"
        ).pack(side="right")
        ctk.CTkButton(
            button_row, text="Cancel", command=self.destroy, fg_color=branding.COLOR_SURFACE_ALT
        ).pack(side="right", padx=(0, 10))

    def _on_save(self) -> None:
        self.saved_settings = Settings(
            server_ip=self._server_ip.get().strip(),
            ssh_username=self._ssh_username.get().strip(),
            ssh_port=self._original.ssh_port,
            auth_method=self._auth_var.get(),
            ssh_password=self._ssh_password.get(),
            ssh_key_path=self._ssh_key_path.get().strip(),
            ssh_key_passphrase=self._ssh_key_passphrase.get(),
            local_website_folder=self._local_website_folder.get().strip(),
            remote_website_folder=self._remote_website_folder.get().strip(),
            remote_backup_folder=self._remote_backup_folder.get().strip(),
            docker_container=self._docker_container.get().strip(),
            website_port=_safe_int(self._website_port.get(), self._original.website_port),
            max_backups=_safe_int(self._max_backups.get(), self._original.max_backups),
        )
        self.destroy()


class BackupsDialog(ctk.CTkToplevel):
    def __init__(self, parent: App, settings: Settings):
        super().__init__(parent)
        self.title("Backups")
        self.geometry("520x420")
        self.configure(fg_color=branding.COLOR_BACKGROUND)
        self.transient(parent)

        self._settings = settings
        self._list_box = ctk.CTkTextbox(self, fg_color=branding.COLOR_SURFACE, text_color=branding.COLOR_TEXT)
        self._list_box.pack(fill="both", expand=True, padx=16, pady=16)
        self._list_box.insert("end", "Loading backups...")
        self._list_box.configure(state="disabled")

        threading.Thread(target=self._load, daemon=True).start()

    def _load(self) -> None:
        try:
            entries = backups.list_remote_backups(self._settings)
            text = "\n".join(
                f"{b.filename}   {b.size_bytes / 1024:.0f} KB   {b.modified_at.strftime('%Y-%m-%d %H:%M:%S')}"
                for b in entries
            ) or "No backups found."
        except Exception as exc:  # noqa: BLE001 - shown to the user, not fatal
            text = f"Could not load backups: {exc}"

        self.after(0, self._show, text)

    def _show(self, text: str) -> None:
        self._list_box.configure(state="normal")
        self._list_box.delete("1.0", "end")
        self._list_box.insert("end", text)
        self._list_box.configure(state="disabled")


def _safe_int(value: str, default: int) -> int:
    try:
        return int(value)
    except ValueError:
        return default
