"use client";
import { useState } from 'react';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { leadInput, leadButton } from '@/components/leads/LeadDialog';
import { TourDrawer } from '@/components/tours/TourDrawer';
import { VISA_STAGES, VISA_DECISIONS, CUSTODY_LOCATIONS, visaLabel, type VisaCaseInput } from '@/lib/visa-operations';
import type { VisaCase } from '@/types/erp';

export function VisaOperationsModal({ visaCase, onClose }: { visaCase?: VisaCase; onClose: () => void }) {
  const { clients, saveVisaPipelineCase } = useData();
  const { user, staffUsers } = useAuth();
  const staff = (staffUsers.length ? staffUsers : user ? [user] : []).filter(s => s.tenantId === user?.tenantId && s.status === 'Active' && ['AGENCY_ADMIN', 'FRONT_DESK', 'VISA_CONSULTANT'].includes(s.role));
  const [tab, setTab] = useState<'CASE' | 'DOCUMENTS' | 'CUSTODY'>('CASE');
  const [error, setError] = useState('');
  const [custodyReviewed, setCustodyReviewed] = useState(false);
  const [form, setForm] = useState<VisaCaseInput>(() => visaCase || {
    clientId: '', applicantName: '', applicantPhone: '', country: '', visaType: 'Standard Visitor', stage: 'DOCUMENTS_PENDING', decision: 'PENDING', assignedStaffId: user?.id || '', assignedStaffName: user?.name || '', passportNumber: '', passportCustody: 'CLIENT_HOLDING', consultancyFee: 0, embassyFeePaid: 0,
    documentChecklist: ['Original Passport', '6-Month Bank Statement', 'FBR Tax Returns (2 Yrs)', 'Employment Letter', 'White Background Photos'].map((name, i) => ({ id: `doc-${i}`, name, required: true, received: false, verified: false })),
  });
  const update = (patch: Partial<VisaCaseInput>) => setForm(prev => ({ ...prev, ...patch }));
  const textField = (key: 'applicantName' | 'applicantPhone' | 'country' | 'visaType' | 'passportNumber' | 'appointmentDate' | 'submissionDate' | 'centerName' | 'embassyTrackingRef' | 'custodySafeLockerId' | 'courierTrackingCode', label: string, type = 'text') => <label className="block space-y-1">{label}<input type={type} value={form[key] || ''} onChange={e => update({ [key]: e.target.value })} className={leadInput} /></label>;
  return <TourDrawer title={visaCase ? `Visa Case: ${visaCase.caseNumber}` : 'New Visa Consultancy Case'} onClose={onClose}
    footer={<><button type="button" onClick={onClose}>Cancel</button><button type="submit" className={leadButton}>Save Case Changes</button></>}
    onSubmit={e => { e.preventDefault(); try {
      const patch: Partial<VisaCaseInput> = { ...form };
      if (!custodyReviewed) {
        if (form.passportCustody !== (visaCase?.passportCustody || 'CLIENT_HOLDING') || form.custodySafeLockerId !== visaCase?.custodySafeLockerId || form.courierTrackingCode !== visaCase?.courierTrackingCode) throw new Error('Confirm the physical location in the Custody tab before saving a handover.');
        if (visaCase) { delete patch.passportCustody; delete patch.custodySafeLockerId; delete patch.courierTrackingCode; }
      }
      saveVisaPipelineCase(visaCase?.id || null, patch); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save case.'); } }}>
    <div className="mb-4 flex gap-2" aria-label="Case sections">{(['CASE', 'DOCUMENTS', 'CUSTODY'] as const).map(t => <button type="button" aria-pressed={tab === t} key={t} onClick={() => setTab(t)} className={`rounded-xl px-3 py-2 text-sm ${tab === t ? 'bg-purple-600 text-white' : 'bg-purple-500/5'}`}>{visaLabel(t)}</button>)}</div>
      <div className="text-sm">
        {tab === 'CASE' && <div className="grid gap-3 md:grid-cols-2">
          <label>CRM Client<select disabled={!!visaCase?.bookingId} value={form.clientId} onChange={e => { const client = clients.find(c => c.id === e.target.value); update({ clientId: e.target.value, ...(client ? { applicantName: client.fullName, applicantPhone: client.phone } : {}) }); }} className={leadInput}><option value="">Select a client / legacy linkage pending</option>{clients.map(c => <option key={c.id} value={c.id}>{c.fullName}</option>)}</select></label>
          <label>Assigned Staff<select value={form.assignedStaffId} onChange={e => update({ assignedStaffId: e.target.value, assignedStaffName: staff.find(s => s.id === e.target.value)?.name || '' })} className={leadInput}><option value="">Unassigned / legacy assignment</option>{form.assignedStaffId && !staff.some(s => s.id === form.assignedStaffId) && <option value={form.assignedStaffId}>{form.assignedStaffName}</option>}{staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          {textField('applicantName', 'Applicant Full Name')}{textField('applicantPhone', 'Phone / WhatsApp')}
          {textField('country', 'Destination Country')}{textField('visaType', 'Visa Category')}
          <label>Pipeline Stage<select value={form.stage} onChange={e => update({ stage: e.target.value as VisaCase['stage'] })} className={leadInput}>{VISA_STAGES.map(s => <option key={s}>{s}</option>)}</select></label>
          <label>Decision<select value={form.decision} onChange={e => update({ decision: e.target.value as VisaCase['decision'] })} className={leadInput}>{VISA_DECISIONS.map(s => <option key={s}>{s}</option>)}</select></label>
          {textField('appointmentDate', 'Appointment / Biometrics', form.appointmentDate && !form.appointmentDate.includes('T') ? 'date' : 'datetime-local')}{textField('submissionDate', 'Submission Date', 'date')}
          {textField('centerName', "Embassy / VFS / Gerry's Center")}{textField('embassyTrackingRef', 'Embassy Tracking Reference')}
          <label>Consultancy Fee<input type="number" min="0" step="0.01" value={form.consultancyFee} onChange={e => update({ consultancyFee: Number(e.target.value) })} className={leadInput} /></label>
          <label>Embassy Fee Paid<input type="number" min="0" step="0.01" value={form.embassyFeePaid} onChange={e => update({ embassyFeePaid: Number(e.target.value) })} className={leadInput} /></label>
          <p className="text-xs text-gray-500 md:col-span-2">Operational fee tracking only. Saving does not issue an invoice or record a customer payment.</p>
        </div>}
        {tab === 'DOCUMENTS' && <div className="space-y-3">
          <p className="text-purple-500">{form.documentChecklist.filter(d => d.verified).length} of {form.documentChecklist.length} verified | {form.documentChecklist.filter(d => d.required && !d.verified).length} required outstanding</p>
          {form.documentChecklist.map(d => <div key={d.id} className="space-y-2 rounded-xl border border-gray-200 p-3 dark:border-white/10"><input aria-label="Document name" className={leadInput} value={d.name} onChange={e => update({ documentChecklist: form.documentChecklist.map(x => x.id === d.id ? { ...x, name: e.target.value } : x) })} /><div className="flex flex-wrap gap-4">{(['required', 'received', 'verified'] as const).map(key => <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={d[key]} disabled={key === 'verified' && !d.received} onChange={e => update({ documentChecklist: form.documentChecklist.map(x => x.id === d.id ? { ...x, [key]: e.target.checked, ...(key === 'received' && !e.target.checked ? { verified: false } : {}) } : x) })} />{visaLabel(key)}</label>)}</div><input aria-label={`Notes for ${d.name}`} placeholder="Document notes" className={leadInput} value={d.notes || ''} onChange={e => update({ documentChecklist: form.documentChecklist.map(x => x.id === d.id ? { ...x, notes: e.target.value } : x) })} /></div>)}
          <button type="button" className={leadButton} onClick={() => update({ documentChecklist: [...form.documentChecklist, { id: crypto.randomUUID(), name: 'Additional Document', required: false, received: false, verified: false }] })}>+ Add Document</button>
        </div>}
        {tab === 'CUSTODY' && <div className="space-y-3">
          {visaCase && !visaCase.custodyConfirmed && <p className="rounded-xl bg-amber-500/10 p-3 text-amber-600">Legacy custody is unconfirmed. Check the physical location before recording custody.</p>}
          {textField('passportNumber', 'Passport Number')}
          <label className="block">Physical Location<select className={leadInput} value={form.passportCustody} onChange={e => update({ passportCustody: e.target.value as VisaCase['passportCustody'] })}>{CUSTODY_LOCATIONS.map(s => <option key={s} value={s}>{visaLabel(s)}</option>)}</select></label>
          {form.passportCustody === 'OFFICE_SAFE' && textField('custodySafeLockerId', 'Safe / Locker Identifier')}
          {form.passportCustody === 'DISPATCHED_COURIER' && textField('courierTrackingCode', 'Courier Tracking Code')}
          <p className="text-xs text-gray-500">Stage changes never move a physical passport automatically. Custody saves record staff identity and time.</p>
          <label className="flex items-center gap-2"><input type="checkbox" checked={custodyReviewed} onChange={e => setCustodyReviewed(e.target.checked)} />I have checked and confirm this physical passport location.</label>
          <h3 className="font-semibold">Custody History</h3>
          {!visaCase?.custodyHistory?.length && <p>No confirmed handovers recorded.</p>}
          {visaCase?.custodyHistory?.map(h => <article key={h.id} className="rounded-xl border border-gray-200 p-3 dark:border-white/10"><p>{visaLabel(h.fromLocation || h.from || '')} to {visaLabel(h.toLocation || h.to || '')}</p><p>{h.details}</p><small>{h.transferredByStaff} | {h.timestamp}</small></article>)}
        </div>}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-500">{error}</p>}
  </TourDrawer>;
}
