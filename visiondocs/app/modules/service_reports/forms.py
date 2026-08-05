"""WTForms definitions for the Service Report Generator."""

from flask_wtf import FlaskForm
from wtforms import (
    DateField,
    FieldList,
    FormField,
    SelectField,
    StringField,
    TextAreaField,
)
from wtforms.validators import Email, InputRequired, Length, Optional

SERVICE_TYPES = [
    ('installation', 'Installation'),
    ('preventive_maintenance', 'Preventive Maintenance'),
    ('breakdown_repair', 'Breakdown / Repair'),
    ('calibration', 'Calibration'),
    ('amc_visit', 'AMC Visit'),
    ('other', 'Other'),
]

SERVICE_STATUSES = [
    ('completed', 'Completed'),
    ('pending', 'Pending'),
    ('follow_up_required', 'Follow-up Required'),
]


class PartForm(FlaskForm):
    """One row of the parts-replaced table. Nested inside ServiceReportForm."""

    class Meta:
        csrf = False

    part_name = StringField('Part Name', validators=[Optional(), Length(max=200)])
    part_number = StringField('Part Number', validators=[Optional(), Length(max=100)])
    quantity = StringField('Qty', validators=[Optional(), Length(max=20)])


class ServiceReportForm(FlaskForm):
    # Service meta
    service_date = DateField('Service Date', validators=[InputRequired()])
    service_type = SelectField('Service Type', choices=SERVICE_TYPES, validators=[InputRequired()])

    # Customer
    customer_name = StringField('Customer Name', validators=[InputRequired(), Length(max=200)])
    customer_company = StringField('Company', validators=[Optional(), Length(max=200)])
    customer_address = TextAreaField('Address', validators=[Optional(), Length(max=500)])
    contact_person = StringField('Contact Person', validators=[Optional(), Length(max=200)])
    contact_phone = StringField('Phone', validators=[Optional(), Length(max=50)])
    contact_email = StringField('Email', validators=[Optional(), Email(), Length(max=200)])

    # Instrument
    instrument_type = StringField('Instrument Type', validators=[InputRequired(), Length(max=100)])
    instrument_make = StringField('Make / Brand', validators=[Optional(), Length(max=100)])
    instrument_model = StringField('Model', validators=[Optional(), Length(max=100)])
    instrument_serial = StringField('Serial Number', validators=[Optional(), Length(max=100)])

    # Service details
    complaint = TextAreaField('Reported Complaint / Issue', validators=[Optional(), Length(max=2000)])
    work_performed = TextAreaField('Work Performed / Observations', validators=[InputRequired(), Length(max=4000)])
    recommendations = TextAreaField('Recommendations', validators=[Optional(), Length(max=2000)])
    service_status = SelectField('Service Status', choices=SERVICE_STATUSES, validators=[InputRequired()])
    next_service_date = DateField('Next Service Due', validators=[Optional()])

    parts = FieldList(FormField(PartForm), min_entries=1)

    # Sign-off
    engineer_name = StringField('Engineer Name', validators=[InputRequired(), Length(max=200)])
