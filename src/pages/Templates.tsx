import { useState } from 'react';
import { MessageSquareText, Send, BellRing } from 'lucide-react';
import { useStore } from '../store';
import { nowStamp, ME_NAME, ME_EMAIL } from '../data';
import { Card, Chip, Btn, Field, Select, Empty, Tabs, MiniSearch, Note, InfoTip, Modal } from '../ui';
import { Head } from '../Shell';
import { useDraft, SaveBar, Toggle, Locked, ReasonModal, TokenFields, fill, smsCount, unknownTokens, tokensIn } from '../admin';
import { chIcon } from './Reminders';
import { TOKENS, type Template } from '../seed';

const GROUPS = ['Accounts and sign-in', 'Enquiries and lettings', 'Rent and money', 'Jobs and repairs', 'Safety and compliance', 'Tenancy', 'Overseas tax', 'Planned Switch', 'Staff alerts'];
/** Sample records for the preview. */
const SAMPLES: { id: string; label: string; over: Record<string, string> }[] = [
  { id: 'tenant', label: 'Daniel Price · tenant, Flat 4, 19 Highgate Hill', over: {} },
  { id: 'landlord', label: 'Margaret Okafor · landlord, 12 Oak Street', over: { first_name: 'Margaret', full_name: 'Margaret Okafor', address: '12 Oak Street, London N6 2AB', amount: '£2,184.50', office_admin: 'Emma Thompson', office_phone: '020 7946 0011' } },
  { id: 'agent', label: 'Claire Rose · Rosewood Lettings, 88 Victoria Road', over: { first_name: 'Claire', full_name: 'Claire Rose', address: '88 Victoria Road, London N4 3SW', amount: '£420', company: 'Rosewood Lettings', office_admin: 'Emma Thompson', office_phone: '020 7946 0011' } },
  { id: 'contractor', label: 'Gary Holt · HeatRight Ltd', over: { first_name: 'Gary', full_name: 'Gary Holt', company: 'HeatRight Ltd', amount: '£312', document: 'public liability insurance' } },
];

/** Messages & work › Message templates: every email, text and in-app message the platform sends. Required ones can be reworded but not switched off. */
export function Templates() {
  const s = useStore();
  if (s.detail) return <TemplatePage id={s.detail} />;
  return <TemplateList />;
}

function TemplateList() {
  const s = useStore(); const { db } = s;
  const [ch, setCh] = useState<'all' | 'Email' | 'Text' | 'In-app'>('all'); const [q, setQ] = useState(''); const [g, setG] = useState('all'); const [off, setOff] = useState<Template | null>(null);
  const list = db.templates.filter(t => (ch === 'all' || t.channel === ch) && (g === 'all' || t.group === g) && (t.name + ' ' + t.subject + ' ' + t.body).toLowerCase().includes(q.toLowerCase()));
  const flip = (t: Template, on: boolean, reason?: string) => s.commit('templates', db.templates.map(z => z.id === t.id ? { ...z, on, by: ME_NAME, at: nowStamp() } : z), { page: 'Message templates', item: t.name, what: on ? 'Switched a message on' : 'Switched a message off', before: on ? 'Off' : 'On', after: on ? 'On' : 'Off', reason }, on ? `${t.name} is on` : `${t.name} switched off`);
  return <>
    <Head r="templates" />
    <Card title={<span className="clean-h">Every message the platform sends<InfoTip>Messages marked “Needed” keep the platform working (sign-in codes, approvals, invoices). You can reword them but not switch them off.</InfoTip></span>}
      action={<Tabs value={ch} onChange={setCh} items={[{ id: 'all', label: 'All', count: db.templates.length }, { id: 'Email', label: 'Email', count: db.templates.filter(t => t.channel === 'Email').length }, { id: 'Text', label: 'Text', count: db.templates.filter(t => t.channel === 'Text').length }, { id: 'In-app', label: 'In-app', count: db.templates.filter(t => t.channel === 'In-app').length }]} />}>
      <div className="toolbar"><MiniSearch value={q} onChange={setQ} placeholder="Search name or wording" />
        <select className="fsel" aria-label="Kind" value={g} onChange={e => setG(e.target.value)}><option value="all">All kinds</option>{GROUPS.map(x => <option key={x}>{x}</option>)}</select>
        <span className="caption">{list.length} shown</span></div>
      {list.length ? <div className="tablewrap"><table className="t"><thead><tr><th>Message</th><th>How</th><th>Goes to</th><th>When it is sent</th><th>Last changed</th><th>On</th></tr></thead>
        {GROUPS.filter(x => list.some(t => t.group === x)).map(x => <tbody key={x} className="grp"><tr className="grp-h static"><td colSpan={6}><span className="sec-label">{x}</span></td></tr>
          {list.filter(t => t.group === x).map(t => <tr key={t.id} onClick={() => s.go('templates', t.id)} style={t.on ? undefined : { opacity: .6 }}>
            <td><span className="stack"><b className="strong">{t.name}</b><span className="caption" style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.channel === 'Text' ? t.body : t.subject}</span></span></td>
            <td><Chip dot={false}>{chIcon(t.channel)}{t.channel}</Chip></td><td className="small">{t.to}</td><td className="small">{t.when}</td>
            <td className="small"><span className="stack"><span>{t.at.split(',')[0]}</span><span className="caption">{t.by}</span></span></td>
            <td>{t.required ? <Locked why="Needed for the platform to work. You can reword it but not switch it off.">Needed</Locked> : <Toggle on={t.on} label={`${t.name} on`} onChange={v => v ? flip(t, true) : setOff(t)} />}</td>
          </tr>)}</tbody>)}
      </table></div> : <Empty icon={<MessageSquareText size={22} />}>No messages match.</Empty>}
    </Card>
    {off && <ReasonModal title={`Switch off “${off.name}”?`} sub="Nobody gets this message, and reminders that use it stop sending." cta="Switch off" onClose={() => setOff(null)} onDone={r => { flip(off, false, r); setOff(null); }} />}
  </>;
}

function TemplatePage({ id }: { id: string }) {
  const s = useStore(); const { db } = s; const t0 = db.templates.find(t => t.id === id);
  const x = useDraft((t0 ?? {}) as Template); const [sample, setSample] = useState(t0?.to === 'Landlord' ? 'landlord' : t0?.to === 'Letting agent' ? 'agent' : t0?.to === 'Contractor' ? 'contractor' : 'tenant'); const [test, setTest] = useState(false);
  if (!t0) return <><Head r="templates" extra="Not found" back /><Empty>This message was removed.</Empty></>;
  const d = x.d; const over = SAMPLES.find(z => z.id === sample)!.over;
  const bad = unknownTokens(d.subject + ' ' + d.body);
  const sms = smsCount(fill(d.body, over));
  const uses = db.reminders.filter(r => r.template === id);
  const blocked = !d.body.trim() ? 'The message can’t be empty.' : d.channel !== 'Text' && !d.subject.trim() ? 'Add a subject.' : bad.length ? `These details don't exist: ${bad.map(b => `{${b}}`).join(', ')}` : '';
  const tokens = [...new Set([...tokensIn(t0.subject + ' ' + t0.body), 'first_name', 'full_name', 'address', 'date', 'time', 'amount', 'link', 'office_admin', 'office_phone'])].filter(k => k in TOKENS);
  return <>
    <Head r="templates" extra={t0.name} title={t0.name} back />
    <div className="flex wrap"><Chip dot={false}>{chIcon(t0.channel)}{t0.channel}</Chip><Chip dot={false}>To: {t0.to}</Chip><Chip dot={false}>{t0.when}</Chip>{t0.required ? <Locked why="Needed for the platform to work. You can reword it but not switch it off.">Needed</Locked> : <label className="check" style={{ marginLeft: 6 }}><Toggle on={d.on} onChange={v => x.patch({ on: v })} label="Message on" />{d.on ? 'On' : 'Off'}</label>}<span className="caption">Last changed {t0.at} by {t0.by}</span></div>
    <div className="adm-split">
      <div className="col">
        <Card title="Wording">
          <TokenFields tokens={tokens} fields={[...(d.channel !== 'Text' ? [{ label: 'Subject', value: d.subject, set: (v: string) => x.patch({ subject: v }) }] : []), { label: 'Message', value: d.body, set: (v: string) => x.patch({ body: v }), rows: d.channel === 'Text' ? 4 : 9,
            hint: d.channel === 'Text' ? <span className="caption" style={{ color: sms.parts > 1 ? 'var(--warn)' : undefined }}>{sms.n} characters with the sample details · {sms.parts} text{sms.parts > 1 ? 's' : ''}{sms.parts > 1 ? ' (each text costs extra)' : ' (160 max for one text)'}</span> : undefined }]} />
          {bad.length > 0 && <Note tone="err">These details don't exist: {bad.map(b => `{${b}}`).join(', ')}. Click a detail below the message instead of typing it.</Note>}
        </Card>
        <Card title={<span className="clean-h"><BellRing size={16} />Reminders that send it</span>}>
          {uses.length ? <div>{uses.map(r => <button key={r.id} className="rowlink" onClick={() => s.go('reminders', r.id)}><div className="stack grow"><b>{r.name}</b><span className="caption">{r.on ? 'On' : 'Paused'} · {r.to.join(', ')}</span></div></button>)}</div> : <Empty>No reminder sends it. The platform sends it: {t0.when.toLowerCase()}.</Empty>}
        </Card>
      </div>
      <div className="sticky">
        <Card title="Preview" action={<Btn sm kind="outline" icon={<Send size={14} />} onClick={() => setTest(true)}>Send me a test</Btn>}>
          <Field label="Fill it with a sample record"><Select value={sample} onChange={setSample} options={SAMPLES.map(z => ({ value: z.id, label: z.label }))} /></Field>
          {d.channel === 'Text' ? <div className="smsbubble">{fill(d.body, over)}</div>
            : <div className="emailpv"><div className="eh"><span>{d.channel === 'In-app' ? 'In-app alert in the portal' : `From: LSP <${db.company.sender}>`}</span><b>{fill(d.subject, over)}</b></div><div className="eb">{fill(d.body, over)}</div>
              {d.channel === 'Email' && <div className="sigx"><span>{db.company.signature.closing}</span><b style={{ color: 'var(--text-primary)' }}>{over.office_admin ?? 'James Carter'}</b>{db.company.signature.showLogo && <img src={db.company.logo} alt="" />}<span className="caption">{db.company.signature.legal}</span></div>}</div>}
        </Card>
      </div>
    </div>
    <SaveBar dirty={x.dirty} onUndo={x.undo} blocked={blocked} important={t0.on && !d.on ? 'Switching a message off stops it for everyone.' : false}
      note="Messages already sent don't change. New messages use the new wording straight away."
      onSave={reason => { const n = { ...d, by: ME_NAME, at: nowStamp() }; const ch = [d.subject !== t0.subject && 'subject', d.body !== t0.body && 'message', d.on !== t0.on && 'on/off'].filter(Boolean).join(', ');
        s.commit('templates', db.templates.map(t => t.id === id ? n : t), { page: 'Message templates', item: t0.name, what: `Changed the ${ch}`, before: [d.subject !== t0.subject && `Subject: ${t0.subject}`, d.body !== t0.body && t0.body, d.on !== t0.on && (t0.on ? 'On' : 'Off')].filter(Boolean).join(' · '), after: [d.subject !== t0.subject && `Subject: ${d.subject}`, d.body !== t0.body && d.body, d.on !== t0.on && (d.on ? 'On' : 'Off')].filter(Boolean).join(' · '), reason }); }} />
    {test && <Modal title="Send me a test" sub={`The ${d.channel === 'Text' ? 'text' : 'message'} is sent with the sample details, including changes you haven't saved.`} onClose={() => setTest(false)}
      footer={<><Btn kind="outline" onClick={() => setTest(false)}>Cancel</Btn><Btn icon={<Send size={16} />} onClick={() => { setTest(false); s.toast(`Test sent to ${d.channel === 'Text' ? '07700 900002' : d.channel === 'In-app' ? 'your alerts' : ME_EMAIL}`); }}>Send test</Btn></>}>
      <Note>{d.channel === 'Text' ? 'To your phone: 07700 900002' : d.channel === 'In-app' ? 'To your alerts in this portal' : `To ${ME_EMAIL}`}</Note>
    </Modal>}
  </>;
}
