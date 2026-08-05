from flask import abort, flash, redirect, render_template, send_file, url_for

from app.modules.service_reports import bp
from app.modules.service_reports.forms import ServiceReportForm
from app.modules.service_reports.pdf import (
    generate_report_id,
    get_report_path,
    list_reports,
    render_service_report,
)


@bp.route('/')
def index():
    return render_template('service_reports/list.html', reports=list_reports())


@bp.route('/new', methods=['GET', 'POST'])
def new():
    form = ServiceReportForm()

    if form.validate_on_submit():
        report_id = generate_report_id()
        render_service_report(form, report_id)
        flash('Service report generated.', 'success')
        return redirect(url_for('service_reports.ready', report_id=report_id))

    return render_template('service_reports/form.html', form=form)


@bp.route('/ready/<report_id>')
def ready(report_id):
    if get_report_path(report_id) is None:
        abort(404)
    return render_template('service_reports/ready.html', report_id=report_id)


@bp.route('/download/<report_id>')
def download(report_id):
    path = get_report_path(report_id)
    if path is None:
        abort(404)
    return send_file(path, as_attachment=True, download_name=f'{report_id}.pdf')
