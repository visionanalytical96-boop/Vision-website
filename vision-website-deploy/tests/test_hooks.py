from vision_deploy.hooks import HOOK_REGISTRY, DeployContext, run_enabled_hooks
from vision_deploy.logger import DeployLogger
from vision_deploy.settings import Settings


def test_future_hooks_are_registered_but_disabled():
    assert len(HOOK_REGISTRY) == 8
    for hook_cls in HOOK_REGISTRY:
        assert hook_cls().enabled is False


def test_disabled_hooks_do_not_run(tmp_path):
    context = DeployContext(
        settings=Settings(),
        logger=DeployLogger(log_file=tmp_path / "deploy.log"),
        timestamp="20260101_000000",
        success=True,
    )

    run_enabled_hooks(context)  # should not raise NotImplementedError since none are enabled
