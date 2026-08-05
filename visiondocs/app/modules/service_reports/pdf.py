"""PDF rendering and on-disk storage for generated Service Reports.

Reports are rendered from the same Jinja2/HTML+CSS template pipeline as the
rest of the app (via WeasyPrint) so the document layout lives in
app/templates/service_reports/pdf/report.html instead of being built up
imperatively - keeping the "template" easy to read and restyle later.
"""

import re
import secrets
from datetime import datetime, timezone
from pathlib import Path

from flask import current_app, render_template
from weasyprint import HTML

from app.modules.service_reports.forms import SERVICE_STATUSES, SERVICE_TYPES

REPORT_ID_RE = re.compile(r'^SR-\d{8}-\d{6}-[a-f0-9]{6}$')


def _reports_dir() -> Path:
    reports_dir = Path(current_app.config['OUTPUT_DIR']) / 'service_reports'
    reports_dir.mkdir(parents=True, exist_ok=True)
    return reports_dir


def generate_report_id() -> str:
    now = datetime.now(timezone.utc)
    return f'SR-{now.strftime("%Y%m%d-%H%M%S")}-{secrets.token_hex(3)}'


def _label_for(choices, value):
    return dict(choices).get(value, value)


def _report_data(form) -> dict:
    """Flatten the validated form into plain values for the PDF template,
    so the template doesn't need to know about WTForms internals."""
    return {
        'service_date': form.service_date.data,
        'service_type': _label_for(SERVICE_TYPES, form.service_type.data),
        'customer_name': form.customer_name.data,
        'customer_company': form.customer_company.data,
        'customer_address': form.customer_address.data,
        'contact_person': form.contact_person.data,
        'contact_phone': form.contact_phone.data,
        'contact_email': form.contact_email.data,
        'instrument_type': form.instrument_type.data,
        'instrument_make': form.instrument_make.data,
        'instrument_model': form.instrument_model.data,
        'instrument_serial': form.instrument_serial.data,
        'complaint': form.complaint.data,
        'work_performed': form.work_performed.data,
        'recommendations': form.recommendations.data,
        'service_status': _label_for(SERVICE_STATUSES, form.service_status.data),
        'next_service_date': form.next_service_date.data,
        'engineer_name': form.engineer_name.data,
        'parts': [
            {
                'part_name': p.form.part_name.data,
                'part_number': p.form.part_number.data,
                'quantity': p.form.quantity.data,
            }
            for p in form.parts.entries if p.form.part_name.data
        ],
    }


def render_service_report(form, report_id: str) -> Path:
    """Render the given (validated) ServiceReportForm to a PDF and save it.

    Returns the path the PDF was written to.
    """
    context = {
        'report_id': report_id,
        'generated_at': datetime.now(timezone.utc),
        'company_name': current_app.config['COMPANY_NAME'],
        'company_tagline': current_app.config['COMPANY_TAGLINE'],
        'company_address': current_app.config['COMPANY_ADDRESS'],
        'company_phone': current_app.config['COMPANY_PHONE'],
        'company_email': current_app.config['COMPANY_EMAIL'],
        **_report_data(form),
    }
    html = render_template('service_reports/pdf/report.html', **context)

    out_path = _reports_dir() / f'{report_id}.pdf'
    HTML(string=html, base_url=current_app.root_path).write_pdf(out_path)
    return out_path


def get_report_path(report_id: str) -> Path | None:
    """Resolve a report_id to its PDF path, refusing anything that isn't a
    well-formed id we generated ourselves (blocks path traversal)."""
    if not REPORT_ID_RE.match(report_id):
        return None

    path = (_reports_dir() / f'{report_id}.pdf').resolve()
    if path.parent != _reports_dir().resolve() or not path.is_file():
        return None
    return path


def list_reports() -> list[dict]:
    """Most-recent-first listing of generated reports for the index page."""
    reports = []
    for pdf_path in _reports_dir().glob('SR-*.pdf'):
        if not REPORT_ID_RE.match(pdf_path.stem):
            continue
        stat = pdf_path.stat()
        reports.append({
            'report_id': pdf_path.stem,
            'generated_at': datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc),
            'size_kb': round(stat.st_size / 1024, 1),
        })
    reports.sort(key=lambda r: r['generated_at'], reverse=True)
    return reports
