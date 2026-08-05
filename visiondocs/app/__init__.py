"""VisionDocs application factory.

VisionDocs is organized as a set of independent feature modules (see
app/modules/), each exposing a Flask Blueprint. New modules register
themselves in create_app() below without touching existing ones -
this is the seam the roadmap in README.md builds on (Customer Management,
Instrument Database, AMC Management, IQ/OQ/PQ, Calibration Reports, Spare
Parts Inventory, Quotations, AI Assistant, Nextcloud Integration, User
Authentication, Dashboard).
"""

from flask import Flask, render_template
from flask_wtf import CSRFProtect

from config import get_config

csrf = CSRFProtect()


def create_app(config_object=None):
    app = Flask(__name__)
    app.config.from_object(config_object or get_config())

    app.config['OUTPUT_DIR'].mkdir(parents=True, exist_ok=True)

    csrf.init_app(app)

    _register_routes(app)
    _register_context(app)

    return app


def _register_routes(app):
    from app.modules.service_reports import bp as service_reports_bp

    app.register_blueprint(service_reports_bp, url_prefix='/service-reports')

    @app.route('/')
    def index():
        return render_template('index.html')


def _register_context(app):
    @app.context_processor
    def inject_company():
        return {
            'company_name': app.config['COMPANY_NAME'],
            'company_tagline': app.config['COMPANY_TAGLINE'],
        }
