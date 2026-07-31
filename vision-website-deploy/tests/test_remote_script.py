from vision_deploy.remote_script import build_deploy_script
from vision_deploy.settings import Settings


def test_script_contains_expected_operations():
    settings = Settings()
    script = build_deploy_script(settings, "/tmp/website_20260101_000000.zip", "20260101_000000")

    assert "mkdir -p" in script
    assert "tar -czf" in script
    assert "unzip -o -q" in script
    assert "rm -rf" in script
    assert "docker restart" in script
    assert "vision-website" in script


def test_backup_rotation_keeps_configured_count():
    settings = Settings(max_backups=3)
    script = build_deploy_script(settings, "/tmp/website.zip", "ts")

    assert "tail -n +4" in script  # keep newest 3 -> drop from the 4th onward


def test_untrusted_settings_values_are_shell_quoted():
    settings = Settings(
        remote_website_folder="/opt/site; rm -rf /",
        docker_container="vision-website; echo pwned",
    )
    script = build_deploy_script(settings, "/tmp/website.zip", "ts")

    assert "'/opt/site; rm -rf /'" in script
    assert "'vision-website; echo pwned'" in script
