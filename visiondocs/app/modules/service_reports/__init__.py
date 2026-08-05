"""Service Report Generator - first VisionDocs module.

Lets an engineer fill a web form for a completed service visit and produces
a formatted PDF report, saved under output/service_reports/.
"""

from flask import Blueprint

bp = Blueprint('service_reports', __name__)

from app.modules.service_reports import routes  # noqa: E402,F401
