"""Application configuration.

Config is selected via the FLASK_ENV environment variable and loaded through
the app factory (see app/__init__.py). Add new settings here as future
modules (database, Ollama, Nextcloud, auth) come online.
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

    OUTPUT_DIR = Path(os.environ.get('VISIONDOCS_OUTPUT_DIR', BASE_DIR / 'output'))

    COMPANY_NAME = 'Vision Analytical'
    COMPANY_TAGLINE = 'HPLC / GC / LCMS Sales, Service & AMC'
    COMPANY_ADDRESS = 'Ambarnath, Maharashtra, India'
    COMPANY_PHONE = '+91 9136216080'
    COMPANY_EMAIL = 'visionanalytical96@gmail.com'


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


class TestingConfig(Config):
    TESTING = True
    WTF_CSRF_ENABLED = False


config_by_name = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
}


def get_config():
    env = os.environ.get('FLASK_ENV', 'development')
    return config_by_name.get(env, DevelopmentConfig)
