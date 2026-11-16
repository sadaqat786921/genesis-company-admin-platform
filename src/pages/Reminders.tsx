import { useState } from 'react';
import { Plus, Trash2, BellRing, Mail, MessageSquare, Smartphone, ArrowRight } from 'lucide-react';
import { useStore } from '../store';
import { Card, Chip, Btn, Field, Text, Select, Empty, Tabs, MiniSearch, MoreMenu, Note, InfoTip } from '../ui';
import { Head } from '../Shell';
import { useDraft, SaveBar, Toggle, MultiPick, ReasonModal, DeleteModal, changed, fill } from '../admin';
import { timingOf } from './lib';
import { EVENTS, type Reminder, type Who, type MsgChannel } from '../seed';

export const WHO_LIST: Who[] = ['Landlord', 'Tenant', 'Applicant', 'Rent sharer', 'Letting agent', 'Contractor', 'Office Admin', 'Supervisor', 'Everyone'];
export const CHANNELS: MsgChannel[] = ['Email', 'Text', 'In-app'];
export const chIcon = (c: MsgChannel) => c === 'Email' ? <Mail size={13} /> : c === 'Text' ? <Smartphone size={13} /> : <MessageSquare size={13} />;
const GROUPS = ['Rent and money', 'Jobs and repairs', 'Safety and compliance', 'Enquiries and lettings', 'Tenancy', 'Planned Switch'];

/** Messages & work › Reminders: every automatic reminder, and when work is flagged as late. */
export function Reminders() {
  const s = useStore();
  if (s.detail) return <ReminderPage id={s.detail} />;
  return <ReminderList />;
}

function ReminderList() {
  const s = useStore(); const { db } = s;
  const [tab, setTab] = useState<'list' | 'late'>('list'); const [q, setQ] = useState(''); const [who, setWho] = useState('all'); const [g, setG] = useState('all'); const [off, setOff] = useState<Reminder | null>(null);
  const list = db.reminders.filter(r => (g === 'all' || r.group === g) && (who === 'all' || r.to.includes(who as Who)) && r.name.toLowerCase().includes(q.toLowerCase()));
  const flip = (r: Reminder, on: boolean, reason?: string) => s.commit('reminders', db.reminders.map(z => z.id === r.id ? { ...z, on } : z), { page: 'Reminders', item: r.name, what: on ? 'Switched a reminder on' : 'Paused a reminder', before: on ? 'Paused' : 'On', after: on ? 'On' : 'Paused', reason }, on ? `${r.name} is on` : `${r.name} paused`);
  const tpl = (id: string) => db.templates.find(t => t.id === id);
  return <>
    <Head r="reminders" action={tab === 'list' ? <Btn icon={<Plus size={16} />} onClick={() => s.go('reminders', 'new')}>Add a reminder</Btn> : undefined} />
    <Card title={<span className="clean-h">{tab === 'list' ? 'Automatic reminders' : 'When work is late'}<InfoTip>{tab === 'list' ? 'Sent by the platform on their own. Each one uses a message template, so the wording is changed in Message templates.' : 'Work that stays at a stage longer than this turns red on the staff boards and in “needs chasing”, and the Office Admin is told.'}</InfoTip></span>}
      action={<Tabs value={tab} onChange={setTab} items={[{ id: 'list', label: 'Reminders', count: db.reminders.length }, { id: 'late', label: 'Late work' }]} />}>
      {tab === 'list' ? <>
        <div className="toolbar"><MiniSearch value={q} onChange={setQ} placeholder="Search reminders" />
          <select className="fsel" aria-label="Group" value={g} onChange={e => setG(e.target.value)}><option value="all">All kinds</option>{GROUPS.map(x => <option key={x}>{x}</option>)}</select>
          <select className="fsel" aria-label="Who gets it" value={who} onChange={e => setWho(e.target.value)}><option value="all">Anyone</option>{WHO_LIST.map(x => <option key={x}>{x}</option>)}</select>
          <span className="caption">{list.length} shown · {db.reminders.filter(r => !r.on).length} paused</span></div>
        {list.length ? <div className="tablewrap"><table className="t"><thead><tr><th>Reminder</th><th>Who gets it</th><th>How</th><th>When</th><th>Message</th><th>On</th></tr></thead>
          {GROUPS.filter(x => list.some(r => r.group === x)).map(x => <tbody key={x} className="grp"><tr className="grp-h static"><td colSpan={6}><span className="sec-label">{x}</span></td></tr>
            {list.filter(r => r.group === x).map(r => <tr key={r.id} onClick={() => s.go('reminders', r.id)} style={r.on ? undefined : { opacity: .6 }}>
              <td><span className="stack"><b className="strong">{r.name}</b>{r.repeat !== 'Once' && <span className="caption">{r.repeat}</span>}</span></td>
              <td className="small">{r.to.join(', ')}</td>
              <td><span className="flex wrap" style={{ gap: 4 }}>{r.channels.map(c => <Chip key={c} dot={false}>{chIcon(c)}{c}</Chip>)}</span></td>
              <td className="small" style={{ color: 'var(--text-primary)' }}>{timingOf(r)}</td>
              <td className="small">{tpl(r.template)?.name ?? '—'}</td>
              <td><Toggle on={r.on} label={`${r.name} on`} onChange={v => v ? flip(r, true) : setOff(r)} /></td>
            </tr>)}</tbody>)}
        </table></div> : <Empty icon={<BellRing size={22} />}>No reminders match. Clear the search or add one.</Empty>}
      </> : <LateWork />}
    </Card>
    {off && <ReasonModal title={`Pause “${off.name}”?`} sub="Nobody gets this reminder until you switch it on again." cta="Pause reminder" onClose={() => setOff(null)} onDone={r => { flip(off, false, r); setOff(null); }} />}
  </>;
}

/** "Flag as late after N days" for each stage. Shared with Stages & lists. */
function LateWork() {
  const s = useStore(); const { db } = s; const [p, setP] = useState(db.processes[0].id);
  const x = useDraft(db.processes); const proc = x.d.find(z => z.id === p)!;
  const setLate = (sid: string, v: number | null) => x.set(ps => ps.map(z => z.id === p ? { ...z, stages: z.stages.map(t => t.id === sid ? { ...t, late: v } : t) } : z));
  const changes = x.d.flatMap(z => z.stages.filter(t => db.processes.find(o => o.id === z.id)!.stages.find(o => o.id === t.id)?.late !== t.late).map(t => `${z.name} · ${t.staff}: ${t.late ?? 'never'}`));
  return <>
    <div className="toolbar"><Tabs value={p} onChange={setP} items={x.d.map(z => ({ id: z.id, label: z.name }))} /></div>
    <div className="tablewrap"><table className="t"><thead><tr><th>Stage</th><th>Flag as late</th><th>After</th></tr></thead><tbody>
      {proc.stages.map(t => <tr key={t.id} className="static"><td className="strong">{t.staff}</td>
        <td style={{ width: 120 }}><Toggle on={t.late !== null} label={`Flag ${t.staff} as late`} onChange={v => setLate(t.id, v ? 3 : null)} /></td>
        <td>{t.late !== null ? <span className="inline-sel"><input className="input numin" aria-label={`Late after for ${t.staff}`} value={t.late} onChange={e => setLate(t.id, Math.max(1, +e.target.value.replace(/\D/g, '') || 1))} /><span className="small">days at this stage</span></span> : <span className="caption">Never: this stage has no time limit</span>}</td></tr>)}
    </tbody></table></div>
    <div style={{ height: 8 }} />
    <SaveBar dirty={x.dirty} onUndo={x.undo} note={changes.slice(0, 2).join('; ') || 'Late work turns red for staff and goes to “needs chasing”.'}
      onSave={() => s.commit('processes', x.d, { page: 'Reminders', item: 'Late work', what: `Changed when ${changes.length} stage${changes.length === 1 ? ' is' : 's are'} late`, before: '—', after: changes.join(' · ') })} />
  </>;
}

const blank = (): Reminder => ({ id: 'RM' + Date.now(), name: '', group: 'Rent and money', to: ['Tenant'], channels: ['Email'], n: 3, unit: 'days', when: 'before', date: EVENTS[0], template: '', on: true, repeat: 'Once' });

function ReminderPage({ id }: { id: string }) {
  const s = useStore(); const { db } = s; const isNew = id === 'new';
  const r0 = isNew ? null : db.reminders.find(r => r.id === id);
  const [fresh] = useState(blank);
  const x = useDraft(r0 ?? fresh); const d = x.d; const [del, setDel] = useState(false);
  if (!isNew && !r0) return <><Head r="reminders" extra="Not found" back /><Empty>This reminder was deleted.</Empty></>;
  const tpl = db.templates.find(t => t.id === d.template);
  const labels: Partial<Record<keyof Reminder, string>> = { name: 'Name', to: 'Who gets it', channels: 'How', n: 'Number', unit: 'Unit', when: 'Before or after', date: 'Date', template: 'Message', on: 'On', repeat: 'Repeat', group: 'Kind' };
  const blocked = !d.name.trim() ? 'Give the reminder a name.' : !d.to.length ? 'Choose who gets it.' : !d.channels.length ? 'Choose how it is sent.' : !d.template ? 'Choose the message it sends.' : '';
  const shown = (r: Reminder) => ({ ...r, template: db.templates.find(t => t.id === r.template)?.name ?? '—' });
  return <>
    <Head r="reminders" extra={isNew ? 'New reminder' : r0!.name} title={isNew ? 'Add a reminder' : r0!.name} back action={!isNew ? <MoreMenu label="···" items={[{ label: 'Delete this reminder', icon: <Trash2 size={16} />, danger: true, onClick: () => setDel(true) }]} /> : undefined} />
    <div className="adm-split">
      <div className="col">
        <Card title="Reminder" action={!isNew && <label className="check"><Toggle on={d.on} onChange={v => x.patch({ on: v })} label="Reminder on" />{d.on ? 'On' : 'Paused'}</label>}>
          <div className="grid g2"><Field label="Name"><Text value={d.name} onChange={v => x.patch({ name: v })} placeholder="e.g. Rent due soon" /></Field>
            <Field label="Kind"><Select value={d.group} onChange={v => x.patch({ group: v })} options={GROUPS.map(g => ({ value: g, label: g }))} /></Field></div>
        </Card>
        <Card title="When it is sent">
          <div className="inline-sel">
            <input className="input numin" aria-label="Number" value={d.n} onChange={e => x.patch({ n: Math.max(0, +e.target.value.replace(/\D/g, '') || 0) })} />
            <select className="input" aria-label="Unit" value={d.unit} onChange={e => x.patch({ unit: e.target.value as Reminder['unit'] })}><option value="days">days</option><option value="hours">hours</option></select>
            <select className="input" aria-label="Before or after" value={d.when} onChange={e => x.patch({ when: e.target.value as Reminder['when'] })}><option value="before">before</option><option value="after">after</option></select>
            <select className="input" aria-label="Which date" value={d.date} onChange={e => x.patch({ date: e.target.value })} style={{ minWidth: 220 }}>{EVENTS.map(ev => <option key={ev}>{ev}</option>)}</select>
          </div>
          <div className="alertbar a-info"><BellRing size={16} /><b className="grow">{timingOf(d)}{d.repeat !== 'Once' ? `, then ${d.repeat.toLowerCase()}` : ''}</b></div>
          <Field label="Repeat"><Select value={d.repeat} onChange={v => x.patch({ repeat: v })} options={['Once', 'Every 2 days, 3 times', 'Every 3 days, 3 times', 'Every 7 days until paid', 'Every 7 days until accepted'].map(v => ({ value: v, label: v }))} /></Field>
        </Card>
        <Card title="Who gets it and how">
          <Field label="Who gets it"><MultiPick label="Who gets it" options={WHO_LIST} value={d.to} onChange={v => x.patch({ to: v })} /></Field>
          <Field label="How it is sent"><MultiPick label="How it is sent" options={CHANNELS} value={d.channels} onChange={v => x.patch({ channels: v })} /></Field>
          <Field label="Message it sends"><Select value={d.template} onChange={v => x.patch({ template: v })} options={[{ value: '', label: 'Choose a message template' }, ...db.templates.map(t => ({ value: t.id, label: `${t.name} · ${t.channel}` }))]} /></Field>
          {tpl && !d.channels.includes(tpl.channel) && <Note tone="warn">This message is written for {tpl.channel.toLowerCase()}. Add {tpl.channel} above, or pick another message.</Note>}
          {tpl && !tpl.on && <Note tone="warn">This message template is switched off, so the reminder won't send until it is on.</Note>}
        </Card>
      </div>
      <div className="sticky">
        <Card title="Message preview" action={tpl && <Btn sm kind="ghost" icon={<ArrowRight size={14} />} onClick={() => s.go('templates', tpl.id)}>Edit wording</Btn>}>
          {tpl ? tpl.channel === 'Text' ? <div className="smsbubble">{fill(tpl.body)}</div>
            : <div className="emailpv"><div className="eh"><span>{tpl.channel === 'In-app' ? 'In-app alert' : `To: ${d.to.join(', ')}`}</span><b>{fill(tpl.subject)}</b></div><div className="eb">{fill(tpl.body)}</div></div>
            : <Empty>Choose a message to see it here.</Empty>}
        </Card>
      </div>
    </div>
    <SaveBar dirty={isNew ? true : x.dirty} onUndo={x.undo} blocked={blocked} saveLabel={isNew ? 'Add reminder' : 'Save changes'} important={!isNew && r0!.on && !d.on ? 'Pausing a reminder stops it for everyone.' : false}
      onSave={reason => {
        if (isNew) { s.commit('reminders', [...db.reminders, d], { page: 'Reminders', item: d.name, what: 'Added a reminder', after: `${timingOf(d)} · ${d.to.join(', ')} · ${d.channels.join(', ')}` }, `${d.name} added`); s.go('reminders', d.id); }
        else s.commit('reminders', db.reminders.map(r => r.id === id ? d : r), { page: 'Reminders', item: d.name, ...changed(shown(r0!), shown(d), labels), reason });
      }} />
    {del && r0 && <DeleteModal what={`the reminder “${r0.name}”`} onClose={() => setDel(false)} onDone={reason => { s.commit('reminders', db.reminders.filter(r => r.id !== id), { page: 'Reminders', item: r0.name, what: 'Deleted a reminder', before: timingOf(r0), reason }, 'Reminder deleted'); s.go('reminders'); }} />}
  </>;
}
