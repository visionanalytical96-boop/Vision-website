import pytest

from app import create_app
from config import TestingConfig


@pytest.fixture
def app(tmp_path):
    class _TestConfig(TestingConfig):
        OUTPUT_DIR = tmp_path

    application = create_app(_TestConfig)
    application.config.update(SERVER_NAME='localhost')
    yield application


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def valid_report_payload():
    return {
        'service_date': '2026-08-05',
        'service_type': 'preventive_maintenance',
        'customer_name': 'Test Labs Pvt Ltd',
        'instrument_type': 'HPLC',
        'work_performed': 'Replaced pump seals and recalibrated.',
        'service_status': 'completed',
        'engineer_name': 'A. Sharma',
    }
