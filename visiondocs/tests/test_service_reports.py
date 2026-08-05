def test_new_report_form_renders(client):
    resp = client.get('/service-reports/new')
    assert resp.status_code == 200
    assert b'New Service Report' in resp.data


def test_generate_report_creates_downloadable_pdf(client, app, valid_report_payload):
    resp = client.post('/service-reports/new', data=valid_report_payload)

    assert resp.status_code == 302
    assert '/service-reports/ready/' in resp.headers['Location']
    report_id = resp.headers['Location'].rsplit('/', 1)[-1]

    pdf_path = app.config['OUTPUT_DIR'] / 'service_reports' / f'{report_id}.pdf'
    assert pdf_path.is_file()
    assert pdf_path.read_bytes().startswith(b'%PDF')

    download = client.get(f'/service-reports/download/{report_id}')
    assert download.status_code == 200
    assert download.headers['Content-Type'] == 'application/pdf'


def test_missing_required_field_reshows_form_with_errors(client, valid_report_payload):
    del valid_report_payload['customer_name']

    resp = client.post('/service-reports/new', data=valid_report_payload)

    assert resp.status_code == 200
    assert b'field__errors' in resp.data


def test_download_rejects_ids_that_are_not_well_formed(client):
    resp = client.get('/service-reports/download/not-a-real-report-id')
    assert resp.status_code == 404


def test_download_rejects_unknown_well_formed_id(client):
    resp = client.get('/service-reports/download/SR-20200101-000000-abcdef')
    assert resp.status_code == 404


def test_parts_replaced_are_optional_and_blank_rows_are_dropped(client, app, valid_report_payload):
    valid_report_payload.update({
        'parts-0-part_name': '',
        'parts-0-part_number': '',
        'parts-0-quantity': '',
    })

    resp = client.post('/service-reports/new', data=valid_report_payload)
    assert resp.status_code == 302

    report_id = resp.headers['Location'].rsplit('/', 1)[-1]
    pdf_path = app.config['OUTPUT_DIR'] / 'service_reports' / f'{report_id}.pdf'
    assert pdf_path.is_file()


def test_reports_list_shows_generated_report(client, valid_report_payload):
    resp = client.post('/service-reports/new', data=valid_report_payload)
    report_id = resp.headers['Location'].rsplit('/', 1)[-1]

    listing = client.get('/service-reports/')
    assert listing.status_code == 200
    assert report_id.encode() in listing.data


def test_contact_email_is_validated(client, valid_report_payload):
    valid_report_payload['contact_email'] = 'not-an-email'
    resp = client.post('/service-reports/new', data=valid_report_payload)
    assert resp.status_code == 200
    assert b'field__errors' in resp.data

    valid_report_payload['contact_email'] = 'rakesh@konkandx.example'
    resp = client.post('/service-reports/new', data=valid_report_payload)
    assert resp.status_code == 302
