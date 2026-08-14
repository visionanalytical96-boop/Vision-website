'use client';

import { useActionState, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  createServiceReport,
  updateServiceReport,
  type ServiceReportFormState,
} from '@/lib/actions/service-reports';
import type { GeneratorOptions } from '@/lib/data/service-reports';
import {
  SERVICE_CALL_TYPE_LABELS,
  SERVICE_CALL_TYPE_ORDER,
  SERVICE_CONTRACT_TYPE_LABELS,
  SERVICE_CONTRACT_TYPE_ORDER,
  SERVICE_OUTCOME_LABELS,
  SERVICE_OUTCOME_ORDER,
  joinAddress,
} from '@/lib/service-report/form';
import { ServiceReportKind } from '@/generated/prisma/enums';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';

/** One row of the visit table, held in state so rows can be added and removed. */
interface VisitRow {
  uid: string;
  visitedOn: string;
  timeIn: string;
  timeOut: string;
  systemConfiguration: string;
  modelDescription: string;
  systemNumber: string;
}

export interface ServiceReportDefaults {
  id?: string;
  serviceRequestId: string;
  engineerId: string;
  companyId: string;
  customerInstrumentId: string;
  reportDate: string;
  companyName: string;
  companyAddress: string;
  telephone: string;
  contactPerson: string;
  contactDesignation: string;
  contactDepartment: string;
  weekOff: string;
  kind: string;
  outcome: string;
  serviceTypes: string[];
  contractType: string;
  faultReported: string;
  workPerformed: string;
  partsSummary: string;
  customerRemarks: string;
  recommendations: string;
  customerName: string;
  customerDesignation: string;
  engineerName: string;
  signedAt: string;
  visitLines: Array<Omit<VisitRow, 'uid'>>;
}

const BLANK_ROW: Omit<VisitRow, 'uid'> = {
  visitedOn: '',
  timeIn: '',
  timeOut: '',
  systemConfiguration: '',
  modelDescription: '',
  systemNumber: '',
};

let rowCounter = 0;
const nextUid = () => `row-${(rowCounter += 1)}`;

const initialState: ServiceReportFormState = {};

export function ServiceReportGenerator({
  options,
  defaults,
}: {
  options: GeneratorOptions;
  defaults: ServiceReportDefaults;
}) {
  const isEdit = Boolean(defaults.id);
  const [state, formAction, pending] = useActionState(
    isEdit ? updateServiceReport : createServiceReport,
    initialState,
  );

  // Controlled only for the fields that auto-fill each other. Everything else
  // is left uncontrolled with a defaultValue, so typing in the long text areas
  // does not re-render the whole form.
  const [companyId, setCompanyId] = useState(defaults.companyId);
  const [companyName, setCompanyName] = useState(defaults.companyName);
  const [companyAddress, setCompanyAddress] = useState(defaults.companyAddress);
  const [telephone, setTelephone] = useState(defaults.telephone);
  const [contactPerson, setContactPerson] = useState(defaults.contactPerson);
  const [instrumentId, setInstrumentId] = useState(defaults.customerInstrumentId);
  const [engineerId, setEngineerId] = useState(defaults.engineerId);
  const [engineerName, setEngineerName] = useState(defaults.engineerName);
  const [requestId, setRequestId] = useState(defaults.serviceRequestId);
  const [faultReported, setFaultReported] = useState(defaults.faultReported);

  const [rows, setRows] = useState<VisitRow[]>(() =>
    (defaults.visitLines.length > 0 ? defaults.visitLines : [BLANK_ROW, BLANK_ROW]).map((line) => ({
      ...line,
      uid: nextUid(),
    })),
  );

  const company = useMemo(
    () => options.companies.find((item) => item.id === companyId) ?? null,
    [options.companies, companyId],
  );

  /** Picking the lab fills its address, phone and first contact — and narrows the instrument list. */
  function onCompanyChange(id: string) {
    setCompanyId(id);
    setInstrumentId('');

    const picked = options.companies.find((item) => item.id === id);
    if (!picked) return;

    setCompanyName(picked.name);
    setCompanyAddress(
      joinAddress([picked.addressLine, picked.city, picked.state, picked.postalCode]),
    );
    if (picked.phone) setTelephone(picked.phone);

    const firstContact = picked.contacts[0];
    if (firstContact) {
      setContactPerson(firstContact.name);
      if (!picked.phone && firstContact.phone) setTelephone(firstContact.phone);
    }
  }

  /** Picking the instrument writes its model and serial into the first visit row. */
  function onInstrumentChange(id: string) {
    setInstrumentId(id);

    const instrument = company?.instruments.find((item) => item.id === id);
    if (!instrument) return;

    const description = instrument.instrumentModel?.name ?? instrument.nickname ?? '';

    setRows((current) => {
      const next = [...current];
      const first = next[0] ?? { ...BLANK_ROW, uid: nextUid() };
      next[0] = {
        ...first,
        modelDescription: description,
        systemNumber: instrument.serialNumber,
      };
      return next;
    });
  }

  /** Picking the job carries its customer, instrument, engineer and complaint across. */
  function onRequestChange(id: string) {
    setRequestId(id);

    const request = options.openRequests.find((item) => item.id === id);
    if (!request) return;

    if (request.customer.companyId) {
      onCompanyChange(request.customer.companyId);
    } else if (request.customer.companyName) {
      setCompanyName(request.customer.companyName);
    }

    setContactPerson(request.customer.name);
    if (request.customer.phone) setTelephone(request.customer.phone);
    if (request.assignedEngineerId) onEngineerChange(request.assignedEngineerId);
    if (request.customerInstrumentId) setInstrumentId(request.customerInstrumentId);
    setFaultReported(request.description || request.instrumentDescription);
  }

  function onEngineerChange(id: string) {
    setEngineerId(id);
    const engineer = options.engineers.find((item) => item.id === id);
    if (engineer) setEngineerName(engineer.name);
  }

  function updateRow(uid: string, patch: Partial<VisitRow>) {
    setRows((current) => current.map((row) => (row.uid === uid ? { ...row, ...patch } : row)));
  }

  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}

      <Card>
        <CardHeader>
          <CardTitle>Auto-fill</CardTitle>
          <CardDescription>
            Pick a job or a lab and the rest of the form fills itself. Every filled value can still
            be edited before you save.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="From service request" htmlFor="serviceRequestId">
            <Select
              id="serviceRequestId"
              name="serviceRequestId"
              value={requestId}
              onChange={(event) => onRequestChange(event.target.value)}
            >
              <option value="">Not linked to a job</option>
              {options.openRequests.map((request) => (
                <option key={request.id} value={request.id}>
                  {request.ticketNumber} — {request.customer.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Customer (lab)" htmlFor="companyId">
            <Select
              id="companyId"
              name="companyId"
              value={companyId}
              onChange={(event) => onCompanyChange(event.target.value)}
            >
              <option value="">Not on file — type the name below</option>
              {options.companies.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            label="Instrument"
            htmlFor="customerInstrumentId"
            hint={company ? undefined : 'Choose a customer first to list their instruments.'}
          >
            <Select
              id="customerInstrumentId"
              name="customerInstrumentId"
              value={instrumentId}
              onChange={(event) => onInstrumentChange(event.target.value)}
              disabled={!company}
            >
              <option value="">Not registered</option>
              {company?.instruments.map((instrument) => (
                <option key={instrument.id} value={instrument.id}>
                  {instrument.serialNumber}
                  {instrument.nickname ? ` — ${instrument.nickname}` : ''}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Service engineer" htmlFor="engineerId" error={errors.engineerId} required>
            <Select
              id="engineerId"
              name="engineerId"
              value={engineerId}
              onChange={(event) => onEngineerChange(event.target.value)}
              required
            >
              <option value="">Choose an engineer</option>
              {options.engineers.map((engineer) => (
                <option key={engineer.id} value={engineer.id}>
                  {engineer.name}
                </option>
              ))}
            </Select>
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customer details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Company name"
            htmlFor="companyName"
            error={errors.companyName}
            required
            className="sm:col-span-2"
          >
            <Input
              id="companyName"
              name="companyName"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              required
            />
          </FormField>

          <FormField label="Address" htmlFor="companyAddress" className="sm:col-span-2">
            <Textarea
              id="companyAddress"
              name="companyAddress"
              rows={2}
              value={companyAddress}
              onChange={(event) => setCompanyAddress(event.target.value)}
            />
          </FormField>

          <FormField label="Date" htmlFor="reportDate" error={errors.reportDate}>
            <Input id="reportDate" name="reportDate" type="date" defaultValue={defaults.reportDate} />
          </FormField>

          <FormField label="Tele No." htmlFor="telephone">
            <Input
              id="telephone"
              name="telephone"
              value={telephone}
              onChange={(event) => setTelephone(event.target.value)}
            />
          </FormField>

          <FormField label="Contact person" htmlFor="contactPerson">
            <Input
              id="contactPerson"
              name="contactPerson"
              value={contactPerson}
              onChange={(event) => setContactPerson(event.target.value)}
            />
          </FormField>

          <FormField label="Week off" htmlFor="weekOff" hint="When not to come back">
            <Input
              id="weekOff"
              name="weekOff"
              defaultValue={defaults.weekOff}
              placeholder="e.g. Sunday, 2nd & 4th Saturday"
            />
          </FormField>

          <FormField label="Designation" htmlFor="contactDesignation">
            <Input
              id="contactDesignation"
              name="contactDesignation"
              defaultValue={defaults.contactDesignation}
              placeholder="e.g. QC Manager"
            />
          </FormField>

          <FormField label="Department" htmlFor="contactDepartment">
            <Input
              id="contactDepartment"
              name="contactDepartment"
              defaultValue={defaults.contactDepartment}
              placeholder="e.g. Quality Control"
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visits</CardTitle>
          <CardDescription>
            One row per day on site. An installation that runs three days is three rows on one
            report.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold tracking-wide text-muted uppercase">
                  <th className="px-1 pb-1">Date</th>
                  <th className="px-1 pb-1">Time IN</th>
                  <th className="px-1 pb-1">Time OUT</th>
                  <th className="px-1 pb-1">System configuration</th>
                  <th className="px-1 pb-1">Model description</th>
                  <th className="px-1 pb-1">System no.</th>
                  <th className="px-1 pb-1">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.uid}>
                    <td className="px-1">
                      <Input
                        type="date"
                        aria-label={`Visit ${index + 1} date`}
                        name={`visit.${index}.visitedOn`}
                        value={row.visitedOn}
                        onChange={(event) => updateRow(row.uid, { visitedOn: event.target.value })}
                      />
                    </td>
                    <td className="px-1">
                      <Input
                        aria-label={`Visit ${index + 1} time in`}
                        name={`visit.${index}.timeIn`}
                        value={row.timeIn}
                        onChange={(event) => updateRow(row.uid, { timeIn: event.target.value })}
                        placeholder="09:30"
                        className="w-[92px]"
                      />
                    </td>
                    <td className="px-1">
                      <Input
                        aria-label={`Visit ${index + 1} time out`}
                        name={`visit.${index}.timeOut`}
                        value={row.timeOut}
                        onChange={(event) => updateRow(row.uid, { timeOut: event.target.value })}
                        placeholder="17:00"
                        className="w-[92px]"
                      />
                    </td>
                    <td className="px-1">
                      <Input
                        aria-label={`Visit ${index + 1} system configuration`}
                        name={`visit.${index}.systemConfiguration`}
                        value={row.systemConfiguration}
                        onChange={(event) =>
                          updateRow(row.uid, { systemConfiguration: event.target.value })
                        }
                        placeholder="Quaternary pump, DAD, autosampler"
                      />
                    </td>
                    <td className="px-1">
                      <Input
                        aria-label={`Visit ${index + 1} model description`}
                        name={`visit.${index}.modelDescription`}
                        value={row.modelDescription}
                        onChange={(event) =>
                          updateRow(row.uid, { modelDescription: event.target.value })
                        }
                      />
                    </td>
                    <td className="px-1">
                      <Input
                        aria-label={`Visit ${index + 1} system number`}
                        name={`visit.${index}.systemNumber`}
                        value={row.systemNumber}
                        onChange={(event) => updateRow(row.uid, { systemNumber: event.target.value })}
                      />
                    </td>
                    <td className="px-1 text-right">
                      <button
                        type="button"
                        onClick={() => setRows((current) => current.filter((r) => r.uid !== row.uid))}
                        disabled={rows.length === 1}
                        className="rounded-lg p-2 text-muted transition-colors hover:bg-danger/10 hover:text-danger focus:ring-2 focus:ring-danger focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Remove visit ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={() => setRows((current) => [...current, { ...BLANK_ROW, uid: nextUid() }])}
          >
            <Plus className="h-4 w-4" aria-hidden /> Add visit row
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status and visit type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-foreground">Status</legend>
            <div className="flex flex-wrap gap-4">
              {SERVICE_OUTCOME_ORDER.map((outcome) => (
                <label key={outcome} className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="radio"
                    name="outcome"
                    value={outcome}
                    defaultChecked={defaults.outcome === outcome}
                    className="h-4 w-4 accent-[var(--color-primary)]"
                  />
                  {SERVICE_OUTCOME_LABELS[outcome]}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-foreground">
              Type of visit
              <span className="ml-2 font-normal text-muted">Tick everything that applies</span>
            </legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {SERVICE_CALL_TYPE_ORDER.map((type) => (
                <label key={type} className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    name="serviceTypes"
                    value={type}
                    defaultChecked={defaults.serviceTypes.includes(type)}
                    className="h-4 w-4 accent-[var(--color-primary)]"
                  />
                  {SERVICE_CALL_TYPE_LABELS[type]}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-foreground">Billing</legend>
            <div className="flex flex-wrap gap-4">
              {SERVICE_CONTRACT_TYPE_ORDER.map((type) => (
                <label key={type} className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="radio"
                    name="contractType"
                    value={type}
                    defaultChecked={defaults.contractType === type}
                    className="h-4 w-4 accent-[var(--color-primary)]"
                  />
                  {SERVICE_CONTRACT_TYPE_LABELS[type]}
                </label>
              ))}
            </div>
          </fieldset>

          <FormField
            label="Report category"
            htmlFor="kind"
            hint="Used for filtering and reporting; does not print on the sheet."
          >
            <Select id="kind" name="kind" defaultValue={defaults.kind}>
              {Object.values(ServiceReportKind).map((kind) => (
                <option key={kind} value={kind}>
                  {SERVICE_REPORT_KIND_LABELS[kind]}
                </option>
              ))}
            </Select>
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>The report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="Fault reported" htmlFor="faultReported">
            <Textarea
              id="faultReported"
              name="faultReported"
              rows={3}
              value={faultReported}
              onChange={(event) => setFaultReported(event.target.value)}
              placeholder="What the customer said was wrong"
            />
          </FormField>

          <FormField
            label="Observation & action taken"
            htmlFor="workPerformed"
            error={errors.workPerformed}
            required
          >
            <Textarea
              id="workPerformed"
              name="workPerformed"
              rows={6}
              defaultValue={defaults.workPerformed}
              placeholder="What you found, what you did, and how you confirmed it was fixed"
              required
            />
          </FormField>

          <FormField label="Parts replaced / required" htmlFor="partsSummary">
            <Textarea
              id="partsSummary"
              name="partsSummary"
              rows={3}
              defaultValue={defaults.partsSummary}
              placeholder="One per line — part name, quantity, and whether it was fitted or is still needed"
            />
          </FormField>

          <FormField label="Client's comments" htmlFor="customerRemarks">
            <Textarea
              id="customerRemarks"
              name="customerRemarks"
              rows={3}
              defaultValue={defaults.customerRemarks}
            />
          </FormField>

          <FormField
            label="Recommendations"
            htmlFor="recommendations"
            hint="Kept on the record for follow-up; does not print on the sheet."
          >
            <Textarea
              id="recommendations"
              name="recommendations"
              rows={2}
              defaultValue={defaults.recommendations}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Signatures</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Customer's name" htmlFor="customerName">
            <Input id="customerName" name="customerName" defaultValue={defaults.customerName} />
          </FormField>

          <FormField label="Customer's designation" htmlFor="customerDesignation">
            <Input
              id="customerDesignation"
              name="customerDesignation"
              defaultValue={defaults.customerDesignation}
            />
          </FormField>

          <FormField label="Engineer's name as signed" htmlFor="engineerName">
            <Input
              id="engineerName"
              name="engineerName"
              value={engineerName}
              onChange={(event) => setEngineerName(event.target.value)}
            />
          </FormField>

          <FormField label="Signed on" htmlFor="signedAt" error={errors.signedAt}>
            <Input id="signedAt" name="signedAt" type="date" defaultValue={defaults.signedAt} />
          </FormField>
        </CardContent>
      </Card>

      {state.formError && (
        <p role="alert" className="text-sm text-danger">
          {state.formError}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Generate report'}
        </Button>
        <p className="text-sm text-muted">
          You can download the PDF as soon as the report is saved.
        </p>
      </div>
    </form>
  );
}

const SERVICE_REPORT_KIND_LABELS: Record<ServiceReportKind, string> = {
  INSPECTION: 'Inspection',
  INSTALLATION: 'Installation',
  CALIBRATION: 'Calibration',
  PREVENTIVE_MAINTENANCE: 'Preventive Maintenance',
  BREAKDOWN: 'Breakdown',
  REPAIR: 'Repair',
  VALIDATION: 'Validation',
  TRAINING: 'Training',
};
