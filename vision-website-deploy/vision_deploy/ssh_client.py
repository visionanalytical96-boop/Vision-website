"""Thin wrapper around paramiko/scp for the two things the app needs:
connecting with password-or-key auth, uploading the zip over SCP, and
running the remote deploy script while streaming its output.
"""

from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Callable, Iterator, Optional

import paramiko
from scp import SCPClient

from vision_deploy.settings import AUTH_KEY, AUTH_PASSWORD, Settings

# Matches scp.SCPClient's `progress` callback signature: (filename, size, sent).
ProgressCallback = Callable[[object, int, int], None]
OutputCallback = Callable[[str], None]


class DeployConnectionError(Exception):
    """Raised when the app can't connect/authenticate to the server."""


class RemoteCommandError(Exception):
    """Raised when the remote deploy script exits non-zero."""


def _target(settings: Settings) -> str:
    return f"{settings.ssh_username}@{settings.server_ip}:{settings.ssh_port}"


def _validate_auth_settings(settings: Settings) -> None:
    if settings.auth_method == AUTH_KEY:
        if not settings.ssh_key_path:
            raise DeployConnectionError(
                f"No SSH key file set for {_target(settings)}. "
                "Open Settings, switch to SSH Key, and choose the key file."
            )
        if not os.path.isfile(settings.ssh_key_path):
            raise DeployConnectionError(f"SSH key file not found: {settings.ssh_key_path}")
    elif not settings.ssh_password:
        raise DeployConnectionError(
            f"No SSH password set for {_target(settings)}. Open Settings and enter the password."
        )


def _connect(settings: Settings, timeout: float = 10.0) -> paramiko.SSHClient:
    _validate_auth_settings(settings)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    # Only attempt the configured auth method - a local ssh-agent or a
    # ~/.ssh/id_rsa on the machine running the app would otherwise be tried
    # first and could mask an incorrect password/key with a confusing error.
    connect_kwargs = dict(
        hostname=settings.server_ip,
        port=settings.ssh_port,
        username=settings.ssh_username,
        timeout=timeout,
        allow_agent=False,
        look_for_keys=False,
    )

    if settings.auth_method == AUTH_KEY:
        connect_kwargs["key_filename"] = settings.ssh_key_path
        if settings.ssh_key_passphrase:
            connect_kwargs["passphrase"] = settings.ssh_key_passphrase
    else:
        connect_kwargs["password"] = settings.ssh_password

    try:
        client.connect(**connect_kwargs)
    except paramiko.AuthenticationException as exc:
        client.close()
        auth_label = "SSH key" if settings.auth_method == AUTH_KEY else "password"
        raise DeployConnectionError(
            f"Authentication failed for {_target(settings)} using {auth_label}. "
            "Check the credentials in Settings, and that the server allows this "
            f"auth method (auth: {AUTH_PASSWORD if settings.auth_method != AUTH_KEY else AUTH_KEY})."
        ) from exc
    except Exception as exc:
        client.close()
        raise DeployConnectionError(f"Could not connect to {_target(settings)}: {exc}") from exc

    return client


@contextmanager
def open_connection(settings: Settings, timeout: float = 10.0) -> Iterator[paramiko.SSHClient]:
    client = _connect(settings, timeout=timeout)
    try:
        yield client
    finally:
        client.close()


def test_connection(settings: Settings, timeout: float = 6.0) -> bool:
    try:
        with open_connection(settings, timeout=timeout):
            return True
    except DeployConnectionError:
        return False


def upload_file(
    client: paramiko.SSHClient,
    local_path: str,
    remote_path: str,
    progress: Optional[ProgressCallback] = None,
) -> None:
    with SCPClient(client.get_transport(), progress=progress) as scp:
        scp.put(local_path, remote_path)


def run_command(
    client: paramiko.SSHClient,
    command: str,
    on_output: Optional[OutputCallback] = None,
) -> int:
    _, stdout, stderr = client.exec_command(command)
    channel = stdout.channel

    while not channel.exit_status_ready():
        if channel.recv_ready():
            _emit_lines(channel.recv(4096), on_output)
        if channel.recv_stderr_ready():
            _emit_lines(channel.recv_stderr(4096), on_output)

    # drain remaining buffered output after the command has exited
    _emit_lines(stdout.read(), on_output)
    _emit_lines(stderr.read(), on_output)

    return channel.recv_exit_status()


def _emit_lines(chunk: bytes, on_output: Optional[OutputCallback]) -> None:
    if not chunk or not on_output:
        return
    text = chunk.decode("utf-8", errors="replace")
    for line in text.splitlines():
        if line.strip():
            on_output(line)
