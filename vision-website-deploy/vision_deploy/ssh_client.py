"""Thin wrapper around paramiko/scp for the two things the app needs:
connecting with password-or-key auth, uploading the zip over SCP, and
running the remote deploy script while streaming its output.
"""

from __future__ import annotations

from contextlib import contextmanager
from typing import Callable, Iterator, Optional

import paramiko
from scp import SCPClient

from vision_deploy.settings import AUTH_KEY, Settings

ProgressCallback = Callable[[int, int], None]
OutputCallback = Callable[[str], None]


class DeployConnectionError(Exception):
    """Raised when the app can't connect/authenticate to the server."""


class RemoteCommandError(Exception):
    """Raised when the remote deploy script exits non-zero."""


def _connect(settings: Settings, timeout: float = 10.0) -> paramiko.SSHClient:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    connect_kwargs = dict(
        hostname=settings.server_ip,
        port=settings.ssh_port,
        username=settings.ssh_username,
        timeout=timeout,
    )

    if settings.auth_method == AUTH_KEY:
        connect_kwargs["key_filename"] = settings.ssh_key_path
        if settings.ssh_key_passphrase:
            connect_kwargs["passphrase"] = settings.ssh_key_passphrase
    else:
        connect_kwargs["password"] = settings.ssh_password

    try:
        client.connect(**connect_kwargs)
    except Exception as exc:
        client.close()
        raise DeployConnectionError(str(exc)) from exc

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
