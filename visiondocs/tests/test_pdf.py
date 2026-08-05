import re

from app.modules.service_reports.pdf import (
    REPORT_ID_RE,
    generate_report_id,
    get_report_path,
)


def test_generate_report_id_matches_expected_pattern():
    assert REPORT_ID_RE.match(generate_report_id())


def test_generate_report_id_is_unique_across_calls():
    ids = {generate_report_id() for _ in range(20)}
    assert len(ids) == 20


def test_get_report_path_rejects_traversal_attempts(app):
    with app.app_context():
        for candidate in ['../../etc/passwd', '..%2f..%2fetc%2fpasswd', 'SR-1-2-3', '', 'SR-20260805-153000-zzzzzz']:
            assert get_report_path(candidate) is None


def test_get_report_path_resolves_a_real_report(app, client, valid_report_payload):
    resp = client.post('/service-reports/new', data=valid_report_payload)
    report_id = resp.headers['Location'].rsplit('/', 1)[-1]

    with app.app_context():
        path = get_report_path(report_id)
        assert path is not None
        assert path.is_file()


def test_report_id_regex_is_anchored():
    # A well-formed id embedded in a larger string must not match.
    assert not REPORT_ID_RE.match('SR-20260805-153000-abcdef/../../etc/passwd')
    assert re.fullmatch(REPORT_ID_RE.pattern, 'SR-20260805-153000-abcdef')
