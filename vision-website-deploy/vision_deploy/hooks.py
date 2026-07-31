"""Extension points for features that aren't built yet.

Each hook runs after a successful deployment via `DeployContext`. None of
these are wired into the deploy flow or the UI - they exist so the next
feature (Cloudflare purge, GitHub-based deploys, rollback, ...) has a slot
to drop into instead of requiring a rework of `deployer.py`.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

from vision_deploy.logger import DeployLogger
from vision_deploy.settings import Settings


@dataclass
class DeployContext:
    settings: Settings
    logger: DeployLogger
    timestamp: str
    success: bool


class PostDeployHook(ABC):
    """A step that can run after deployment. Disabled unless explicitly enabled."""

    name: str = "unnamed-hook"
    enabled: bool = False

    @abstractmethod
    def run(self, context: DeployContext) -> None:
        raise NotImplementedError


class CloudflareCachePurgeHook(PostDeployHook):
    name = "cloudflare-cache-purge"

    def run(self, context: DeployContext) -> None:
        raise NotImplementedError("Cloudflare cache purge is not implemented yet")


class GitHubDeployHook(PostDeployHook):
    name = "github-deploy"

    def run(self, context: DeployContext) -> None:
        raise NotImplementedError("GitHub-sourced deploy is not implemented yet")


class FtpDeployHook(PostDeployHook):
    name = "ftp-deploy"

    def run(self, context: DeployContext) -> None:
        raise NotImplementedError("FTP deploy target is not implemented yet")


class SslCheckHook(PostDeployHook):
    name = "ssl-check"

    def run(self, context: DeployContext) -> None:
        raise NotImplementedError("Automatic SSL check is not implemented yet")


class DockerHealthCheckHook(PostDeployHook):
    name = "docker-health-check"

    def run(self, context: DeployContext) -> None:
        raise NotImplementedError("Docker health check is not implemented yet")


class RollbackHook(PostDeployHook):
    name = "rollback-previous-version"

    def run(self, context: DeployContext) -> None:
        raise NotImplementedError("Rollback to previous backup is not implemented yet")


class MultiSiteHook(PostDeployHook):
    name = "multiple-websites"

    def run(self, context: DeployContext) -> None:
        raise NotImplementedError("Multiple website targets are not implemented yet")


class ScheduledDeployHook(PostDeployHook):
    name = "scheduled-deploy"

    def run(self, context: DeployContext) -> None:
        raise NotImplementedError("Scheduled deploy is not implemented yet")


HOOK_REGISTRY: list[type[PostDeployHook]] = [
    CloudflareCachePurgeHook,
    GitHubDeployHook,
    FtpDeployHook,
    SslCheckHook,
    DockerHealthCheckHook,
    RollbackHook,
    MultiSiteHook,
    ScheduledDeployHook,
]


def run_enabled_hooks(context: DeployContext) -> None:
    """Runs any hooks that have been explicitly enabled. No-op today."""
    for hook_cls in HOOK_REGISTRY:
        hook = hook_cls()
        if hook.enabled:
            context.logger.line(f"Running hook: {hook.name}")
            hook.run(context)
