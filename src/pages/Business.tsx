import { useRef } from 'react';
import { Upload, History } from 'lucide-react';
import { useStore, money } from '../store';
import { fromInput, toInput } from '../data';
import { Card, Field, Text, Chip, Note, Btn, Empty, InfoTip } from '../ui';
import { Head } from '../Shell';
import { useDraft, SaveBar, Toggle, changed } from '../admin';
import type { Company as C, Tax as T } from '../seed';

/* Business › Company details: name, address, company number, logo, the Outlook mailbox and the email signature.
   Used on every document (LSP paper), every email and the website footer. */
export function Company() {
  const s = useStore(); const { db } = s; const x = useDraft(db.company); const d = x.d;
  const ref = useRef<HTMLInputElement>(null);
  const sig = (p: Partial<C['signature']>) => x.patch({ signature: { ...d.signature, ...p } });
  const bad = !/^\d{8}$/.test(d.companyNo) ? 'Company number must be 8 digits.' : !/^\d{2}-\d{2}-\d{2}$/.test(d.sortCode) ? 'Sort code looks like 20-45-77.' : !/^\d{8}$/.test(d.account) ? 'Account number must be 8 digits.' : !d.name.trim() || !d.sender.includes('@') ? 'Name and sending mailbox are needed.' : '';
  const bankChanged = d.sortCode !== db.company.sortCode || d.account !== db.company.account || d.bankName !== db.company.bankName;
  const labels: Partial<Record<keyof C, string>> = { name: 'Company name', trading: 'Short name', companyNo: 'Company number', address: 'Address', phone: 'Phone', emergency: 'Emergency line', email: 'Email', website: 'Website', sender: 'Sending mailbox', hours: 'Opening hours', payDays: 'Payment terms', bankName: 'Bank', sortCode: 'Sort code', account: 'Account number', logo: 'Logo', signature: 'Email signature' };
  return <>
    <Head r="company" />
    <div className="adm-split">
      <div className="col">
        <Card title="Business">
          <div className="grid g2">
            <Field label="Company name"><Text value={d.name} onChange={v => x.patch({ name: v })} /></Field>
            <Field label="Short name" hint="Used in messages, e.g. “LSP”"><Text value={d.trading} onChange={v => x.patch({ trading: v })} /></Field>
            <Field label="Company number" hint="8 digits"><Text value={d.companyNo} onChange={v => x.patch({ companyNo: v.replace(/\D/g, '').slice(0, 8) })} /></Field>
            <Field label="Website"><Text value={d.website} onChange={v => x.patch({ website: v })} /></Field>
          </div>
          <Field label="Registered address"><Text value={d.address} onChange={v => x.patch({ address: v })} /></Field>
        </Card>
        <Card title={<span className="clean-h">Contact and emails<InfoTip>Every email the platform sends comes from this Outlook mailbox, with the signature on the right.</InfoTip></span>}>
          <div className="grid g2">
            <Field label="Office phone"><Text value={d.phone} onChange={v => x.patch({ phone: v })} /></Field>
            <Field label="Emergency line (24 hours)"><Text value={d.emergency} onChange={v => x.patch({ emergency: v })} /></Field>
            <Field label="Contact email"><Text value={d.email} onChange={v => x.patch({ email: v })} /></Field>
            <Field label="Emails are sent from (Outlook)"><Text value={d.sender} onChange={v => x.patch({ sender: v })} /></Field>
            <Field label="Opening hours"><Text value={d.hours} onChange={v => x.patch({ hours: v })} /></Field>
            <Field label="Payment terms on LSP invoices" hint="Days. Letting agents can have their own terms."><Text type="number" value={String(d.payDays)} onChange={v => x.patch({ payDays: Math.max(0, +v || 0) })} /></Field>
          </div>
        </Card>
        <Card title={<span className="clean-h">Bank details on invoices<InfoTip>Shown on invoices and rent reminders so people know where to pay. Changing them asks for a reason.</InfoTip></span>}>
          <div className="grid g3">
            <Field label="Bank"><Text value={d.bankName} onChange={v => x.patch({ bankName: v })} /></Field>
            <Field label="Sort code"><Text value={d.sortCode} onChange={v => x.patch({ sortCode: v })} /></Field>
            <Field label="Account number"><Text value={d.account} onChange={v => x.patch({ account: v.replace(/\D/g, '').slice(0, 8) })} /></Field>
          </div>
          {bankChanged && <Note tone="warn">New bank details are shown on every invoice and reminder sent after you save.</Note>}
        </Card>
        <Card title="Logo and email signature">
          <div className="flex" style={{ gap: 16 }}>
            <div className="docwrap" style={{ padding: 18, width: 220 }}><img src={d.logo} alt="Current logo" style={{ width: '100%', display: 'block' }} /></div>
            <div className="col" style={{ gap: 8 }}>
              <span className="small">Shown on LSP paper, emails and the website. SVG or PNG.</span>
              <div className="flex"><Btn sm kind="outline" icon={<Upload size={14} />} onClick={() => ref.current?.click()}>Upload a new logo</Btn>{d.logo !== 'images/logo.svg' && <Btn sm kind="ghost" onClick={() => x.patch({ logo: 'images/logo.svg' })}>Use the standard logo</Btn>}</div>
              <input ref={ref} type="file" accept="image/*" hidden aria-label="Logo file" onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => x.patch({ logo: String(r.result) }); r.readAsDataURL(f); }} />
            </div>
          </div>
          <div className="grid g2">
            <Field label="Closing line"><Text value={d.signature.closing} onChange={v => sig({ closing: v })} /></Field>
            <div className="col" style={{ gap: 10, paddingTop: 22 }}>
              <label className="check"><Toggle on={d.signature.showLogo} onChange={v => sig({ showLogo: v })} label="Show the logo" />Show the logo</label>
              <label className="check"><Toggle on={d.signature.showRole} onChange={v => sig({ showRole: v })} label="Show the sender's role" />Show the sender's role</label>
            </div>
          </div>
          <Field label="Legal line (bottom of every email)"><textarea className="input" value={d.signature.legal} onChange={e => sig({ legal: e.target.value })} /></Field>
        </Card>
      </div>
      <div className="sticky">
        <Card title="Email preview">
          <div className="emailpv">
            <div className="eh"><span>From: {d.trading} &lt;{d.sender}&gt;</span><b>Your October statement</b></div>
            <div className="eb">Hi Margaret,{'\n\n'}Your statement for October is ready.</div>
            <div className="sigx"><span>{d.signature.closing}</span><b style={{ color: 'var(--text-primary)' }}>Emma Thompson</b>{d.signature.showRole && <span>Office Admin</span>}<span>{d.phone} · {d.email}</span>{d.signature.showLogo && <img src={d.logo} alt="" />}<span className="caption">{d.signature.legal}</span></div>
          </div>
        </Card>
        <Card title="On LSP paper">
          <div className="docwrap"><div className="paper" style={{ minHeight: 0, padding: 20, gap: 12 }}>
            <div className="doc-h"><img className="doc-logo" src={d.logo} alt="" style={{ height: 28 }} /><div className="stack" style={{ alignItems: 'flex-end' }}><span>{d.address}</span><span>{d.phone} · {d.email}</span></div></div>
            <div className="doc-f" style={{ paddingTop: 6 }}><span>{d.name} · Company number {d.companyNo}</span></div>
          </div></div>
        </Card>
      </div>
    </div>
    <SaveBar dirty={x.dirty} onUndo={x.undo} blocked={bad} important={bankChanged ? 'Bank details change where people pay, so the reason is saved in the Audit history.' : false}
      note="Changes show on new emails and documents. Documents already sent don't change."
      onSave={reason => { const c = changed(db.company, d, labels); s.commit('company', d, { page: 'Company details', item: 'Company details', ...c, reason }); }} />
  </>;
}

/* Business › VAT & tax: VAT on LSP fees (company setting, default Off) and the overseas landlords' tax (NRL) settings. */
export function Tax() {
  const s = useStore(); const { db } = s; const x = useDraft(db.tax); const d = x.d;
  const vatBad = d.vatOn && !/^GB\d{9}$/.test(d.vatNo.replace(/\s/g, '')) ? 'Add a VAT number like GB123456789 before switching VAT on.' : '';
  const labels: Partial<Record<keyof T, string>> = { vatOn: 'VAT on LSP fees', vatNo: 'VAT number', vatRate: 'VAT rate', vatFrom: 'VAT start date', nrlRate: 'Overseas tax rate', hmrcRef: "LSP's HMRC reference", nrlRemind: 'Reminder days', certBy: 'Yearly certificate deadline' };
  const rent = 1500;
  const hist = db.audit.filter(a => a.page === 'VAT & tax');
  return <>
    <Head r="tax" />
    <div className="adm-split">
      <div className="col">
        <Card title="VAT on LSP fees" action={<Toggle on={d.vatOn} onChange={v => x.patch({ vatOn: v })} label="Charge VAT on LSP fees" />}>
          <Note>VAT is added on top of LSP's fee only. Rent and contractor bills never get LSP VAT. Fees are stored before VAT.</Note>
          <div className="grid g3">
            <Field label="VAT number"><Text value={d.vatNo} onChange={v => x.patch({ vatNo: v.toUpperCase() })} placeholder="GB123456789" /></Field>
            <Field label="Rate (%)"><Text type="number" value={String(d.vatRate)} onChange={v => x.patch({ vatRate: Math.min(100, Math.max(0, +v || 0)) })} /></Field>
            <Field label="Start date"><input className="input" type="date" value={toInput(d.vatFrom)} onChange={e => x.patch({ vatFrom: fromInput(e.target.value) })} /></Field>
          </div>
          <div className="tablewrap"><table className="t"><thead><tr><th>Plan on {money(rent)} rent</th><th>Fee before VAT</th><th>VAT</th><th>Landlord pays</th><th>Maintenance budget a year</th></tr></thead><tbody>
            {db.plans.map(p => { const fee = rent * p.fee / 100; const vat = d.vatOn ? fee * d.vatRate / 100 : 0; return <tr key={p.id} className="static"><td className="strong">{p.name} · {p.fee}%</td><td>{money(fee)}</td><td>{d.vatOn ? money(vat) : '—'}</td><td className="strong">{money(fee + vat)}</td><td>{p.budget ? money(fee * 0.2 * 12) : 'None'}</td></tr>; })}
          </tbody></table></div>
        </Card>
        <Card title={<span className="clean-h">Overseas landlords' tax<InfoTip>For landlords who live outside the UK. LSP keeps back tax from the rent after costs and pays it to HMRC every quarter, unless HMRC lets LSP pay the rent in full.</InfoTip></span>}>
          <div className="grid g2">
            <Field label="Tax kept back (%)"><Text type="number" value={String(d.nrlRate)} onChange={v => x.patch({ nrlRate: Math.min(100, Math.max(0, +v || 0)) })} /></Field>
            <Field label="LSP's HMRC reference"><Text value={d.hmrcRef} onChange={v => x.patch({ hmrcRef: v.toUpperCase() })} /></Field>
            <Field label="Remind the Supervisor before each quarter ends" hint="Days"><Text type="number" value={String(d.nrlRemind)} onChange={v => x.patch({ nrlRemind: Math.max(0, +v || 0) })} /></Field>
            <Field label="Yearly tax certificates must be sent by"><input className="input" type="date" value={toInput(d.certBy)} onChange={e => x.patch({ certBy: fromInput(e.target.value) })} /></Field>
          </div>
        </Card>
      </div>
      <div className="sticky">
        <Card title="Right now"><div className="col" style={{ gap: 10 }}>
          <div className="flex between"><span className="small">VAT on fees</span><Chip tone={db.tax.vatOn ? 'ok' : 'neutral'}>{db.tax.vatOn ? `On · ${db.tax.vatRate}%` : 'Off'}</Chip></div>
          <div className="flex between"><span className="small">Overseas tax</span><Chip tone="info">{db.tax.nrlRate}% kept back</Chip></div>
          <div className="flex between"><span className="small">HMRC reference</span><b className="small" style={{ color: 'var(--text-primary)' }}>{db.tax.hmrcRef}</b></div>
        </div></Card>
        <Card title={<span className="clean-h"><History size={16} />Change history</span>}>
          {hist.length ? <div>{hist.slice(0, 6).map(a => <button key={a.id} className="rowlink" onClick={() => s.go('audit', a.id)}><div className="stack grow"><b>{a.what}</b><span className="caption">{a.at} · {a.who}{a.reason ? ' · ' + a.reason : ''}</span></div></button>)}</div> : <Empty>No changes yet.</Empty>}
        </Card>
      </div>
    </div>
    <SaveBar dirty={x.dirty} onUndo={x.undo} blocked={vatBad} important={d.vatOn !== db.tax.vatOn || d.vatRate !== db.tax.vatRate || d.nrlRate !== db.tax.nrlRate}
      note="New prices apply from the start date. Statements already sent don't change."
      onSave={reason => s.commit('tax', d, { page: 'VAT & tax', item: 'VAT and tax settings', ...changed(db.tax, d, labels), reason })} />
  </>;
}
