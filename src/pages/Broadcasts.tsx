import { useMemo, useState } from 'react';
import { Megaphone, BellRing, MessageSquare, Plus, Send, Copy, Trash2, X, CalendarClock, Download, Pencil, Users, Search, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useStore, areaOfStaff, staffIdOf, type Db } from '../store';
import { nowStamp, fromInput, toInput, parseDate, fmtDate, ME_NAME } from '../data';
import { Card, Chip, Btn, Field, Text, Empty, Tabs, Facts, Avatar, MoreMenu, Note, InfoTip, HSteps, MiniSearch, Modal } from '../ui';
import { Head } from '../Shell';
import { MultiPick, ChipsInput, TokenFields, ReasonModal, DeleteModal, fill, smsCount, unknownTokens, downloadCsv } from '../admin';
import { chIcon, CHANNELS } from './Reminders';
import type { Broadcast, BKind, SendTo as Audience, Role, User, MsgChannel } from '../seed';

/* Messages & work › Send a message. The Admin writes their own announcements (e.g. Christmas closing),
   reminders about a date, or one-off messages, and sends them to everyone, to whole groups
   (all landlords, all tenants, all Office Admins…, optionally in some areas only) or to picked people.
   Send now or schedule. Every send is in the Audit history and has its own delivery list. */

export const GROUPS: { role: Role; label: string }[] = [
  { role: 'Landlord', label: 'Landlords' }, { role: 'Tenant', label: 'Tenants' }, { role: 'Applicant', label: 'Applicants' }, { role: 'Letting agent', label: 'Letting agents' },
  { role: 'Contractor', label: 'Contractors' }, { role: 'Office Admin', label: 'Office Admins' }, { role: 'Supervisor', label: 'Supervisors' }, { role: 'Sub Admin', label: 'Sub Admins' },
];
const KINDS: { id: BKind; icon: typeof Megaphone; text: string }[] = [
  { id: 'Announcement', icon: Megaphone, text: 'News for many people, e.g. “Office closed over Christmas”. Shows as a banner on their home page.' },
  { id: 'Reminder', icon: BellRing, text: 'About a date. Sent a set number of days before it, e.g. “Rent records due on 31 October”.' },
  { id: 'Message', icon: MessageSquare, text: 'A one-off message to one person or a few people.' },
];
const TOKENS = ['first_name', 'full_name', 'date', 'office_phone', 'office_admin', 'link'];
const kindIcon = (k: BKind, size = 15) => k === 'Announcement' ? <Megaphone size={size} /> : k === 'Reminder' ? <BellRing size={size} /> : <MessageSquare size={size} />;
const statusTone = (s: Broadcast['status']) => s === 'Sent' ? 'ok' : s === 'Scheduled' ? 'info' : s === 'Draft' ? 'neutral' : 'err';

/** The people a message goes to. Disabled logins are left out. */
export function recipientsOf(db: Db, a: Audience): User[] {
  const live = db.users.filter(u => u.status !== 'Disabled');
  if (a.mode === 'everyone') return live;
  if (a.mode === 'people') return live.filter(u => a.people.includes(u.id));
  // Staff belong to the area whose team they are in; everyone else by the areas on their login.
  const inArea = (u: User) => { if (u.role === 'Supervisor' || u.role === 'Office Admin') { const ar = areaOfStaff(db, staffIdOf(u)); return !!ar && a.areas.includes(ar.id); } return u.areas.some(x => a.areas.includes(x)); };
  return live.filter(u => a.groups.includes(u.role) && (!a.areas.length || inArea(u)));
}
export function audienceText(db: Db, a: Audience): string {
  if (a.mode === 'everyone') return 'Everyone';
  if (a.mode === 'people') { const n = db.users.filter(u => a.people.includes(u.id)).map(u => u.name); return n.length <= 2 ? n.join(', ') || 'Nobody yet' : `${n.slice(0, 2).join(', ')} +${n.length - 2}`; }
  const g = GROUPS.filter(x => a.groups.includes(x.role)).map(x => `All ${x.label.toLowerCase()}`).join(', ') || 'No groups yet';
  return a.areas.length ? `${g} · ${a.areas.map(id => `Area ${db.areas.find(z => z.id === id)?.n}`).join(', ')}` : g;
}
const reach = (b: Broadcast) => ({ sent: b.deliveries.length, read: b.deliveries.filter(d => d.status === 'Read').length });

export function Broadcasts() {
  const s = useStore();
  if (s.detail === 'new' || s.detail?.startsWith('new~')) return <Composer key={s.detail} />;
  if (s.detail?.startsWith('edit~')) return <Composer editId={s.detail.slice(5)} />;
  if (s.detail?.startsWith('copy~')) return <Composer copyId={s.detail.slice(5)} />;
  if (s.detail) return <BroadcastPage id={s.detail} />;
  return <BroadcastList />;
}

function BroadcastList() {
  const s = useStore(); const { db } = s;
  const [tab, setTab] = useState<'all' | 'Scheduled' | 'Sent' | 'Draft'>('all'); const [q, setQ] = useState(''); const [kind, setKind] = useState('all');
  const list = db.broadcasts.filter(b => (tab === 'all' || b.status === tab) && (kind === 'all' || b.kind === kind) && (b.title + ' ' + b.body + ' ' + audienceText(db, b.audience)).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => parseDate(b.sendAt).getTime() - parseDate(a.sendAt).getTime());
  const n = (st: string) => db.broadcasts.filter(b => b.status === st).length;
  return <>
    <Head r="broadcasts" action={<div className="flex" style={{ gap: 12 }}>
      <Tabs value={tab} onChange={setTab} items={[{ id: 'all', label: 'All', count: db.broadcasts.length }, { id: 'Scheduled', label: 'Scheduled', count: n('Scheduled') || undefined }, { id: 'Sent', label: 'Sent' }, { id: 'Draft', label: 'Drafts', count: n('Draft') || undefined }]} />
      <Btn icon={<Plus size={16} />} onClick={() => s.go('broadcasts', 'new')}>New message</Btn>
    </div>} />
    <div className="grid g3">{KINDS.map(k => { const Ic = k.icon; return <button key={k.id} className="ovtile" onClick={() => s.go('broadcasts', 'new~' + k.id)} style={{ alignItems: 'flex-start' }}>
      <span className="tile t-brand"><Ic size={16} /></span><span className="ov-t"><span className="ov-v"><b style={{ fontSize: 14 }}>New {k.id === 'Message' ? 'one-off message' : k.id.toLowerCase()}</b></span><span className="ov-l" style={{ fontWeight: 500 }}>{k.text}</span></span></button>; })}</div>
    <Card title={<span className="clean-h">Messages you send<InfoTip>Your own announcements, reminders and messages, on top of the automatic ones. Send to everyone, to whole groups (all landlords, all tenants, all Office Admins…), to some areas only, or to picked people. Send now or schedule.</InfoTip></span>}>
      <div className="toolbar"><MiniSearch value={q} onChange={setQ} placeholder="Search title, wording or who it's for" />
        <select className="fsel" aria-label="Kind" value={kind} onChange={e => setKind(e.target.value)}><option value="all">All kinds</option>{KINDS.map(k => <option key={k.id} value={k.id}>{k.id}s</option>)}</select>
        <span className="caption">{list.length} shown</span></div>
      {list.length ? <div className="tablewrap"><table className="t"><thead><tr><th>Message</th><th>To</th><th>How</th><th>When</th><th>Status</th><th>Reached</th></tr></thead><tbody>
        {list.map(b => { const r = reach(b); return <tr key={b.id} onClick={() => s.go('broadcasts', b.id)}>
          <td><span className="flex" style={{ gap: 10 }}><span className="tile t-brand" style={{ width: 32, height: 32 }}>{kindIcon(b.kind)}</span><span className="stack"><b className="strong">{b.title}</b><span className="caption">{b.kind}{b.eventDate ? ` · about ${b.eventDate}` : ''}</span></span></span></td>
          <td className="small" style={{ maxWidth: 220 }}>{audienceText(db, b.audience)}</td>
          <td><span className="flex wrap" style={{ gap: 4 }}>{b.channels.map(c => <Chip key={c} dot={false}>{chIcon(c)}{c}</Chip>)}</span></td>
          <td className="small">{b.status === 'Draft' ? '—' : b.sendAt}</td>
          <td><Chip tone={statusTone(b.status)}>{b.status}</Chip></td>
          <td className="small">{b.status === 'Sent' ? `${r.sent} ${r.sent === 1 ? 'person' : 'people'} · ${r.read} read` : `${recipientsOf(db, b.audience).length} people`}</td>
        </tr>; })}
      </tbody></table></div> : <Empty icon={<Megaphone size={22} />}>Nothing here yet. Press “New message” to write one.</Empty>}
    </Card>
  </>;
}

type Draft = Omit<Broadcast, 'id' | 'status' | 'by' | 'at' | 'deliveries'>;
const blank = (kind: BKind = 'Announcement'): Draft => ({ kind, title: '', body: 'Hi {first_name},\n\n', channels: kind === 'Message' ? ['Email'] : ['In-app', 'Email'], tone: 'info', bannerUntil: kind === 'Announcement' ? '' : undefined, eventDate: kind === 'Reminder' ? '' : undefined, remindDays: kind === 'Reminder' ? [1] : undefined, audience: { mode: kind === 'Message' ? 'people' : 'everyone', groups: [], people: [], areas: [] }, when: 'now', sendAt: '' });

/** Write, choose who and when, check, send. Three steps, like adding a Sub Admin. */
function Composer({ editId, copyId }: { editId?: string; copyId?: string }) {
  const s = useStore(); const { db } = s;
  const startKind = (s.detail?.startsWith('new~') ? s.detail.slice(4) : undefined) as BKind | undefined;
  const base = db.broadcasts.find(b => b.id === (editId ?? copyId));
  const [d, setD] = useState<Draft>(() => base ? { ...JSON.parse(JSON.stringify(base)), ...(copyId ? { title: base.title + ' (copy)', when: 'now', sendAt: '' } : {}) } : blank(startKind));
  const [step, setStep] = useState(0); const [leave, setLeave] = useState(false);
  const [date, setDate] = useState(d.sendAt && d.when === 'later' ? toInput(d.sendAt.split(',')[0]) : '2026-10-20'); const [time, setTime] = useState(d.sendAt && d.when === 'later' ? d.sendAt.split(', ')[1] ?? '09:00' : '09:00');
  const p = (x: Partial<Draft>) => setD(o => ({ ...o, ...x }));
  const a = (x: Partial<Audience>) => setD(o => ({ ...o, audience: { ...o.audience, ...x } }));
  const people = recipientsOf(db, d.audience);
  const bad = unknownTokens(d.title + ' ' + d.body);
  const needs1 = [!d.title.trim() && 'a title', d.body.replace(/Hi \{first_name\},\s*/, '').trim().length < 5 && 'the message', !d.channels.length && 'how to send it', bad.length > 0 && 'details that exist', d.kind === 'Reminder' && !d.eventDate && 'the date it is about', d.kind === 'Reminder' && !(d.remindDays ?? []).length && 'when to remind'].filter(Boolean) as string[];
  const needs2 = [!people.length && (d.audience.mode === 'groups' ? 'at least one group' : d.audience.mode === 'people' ? 'at least one person' : 'someone')].filter(Boolean) as string[];
  const sendAt = d.when === 'later' ? `${fromInput(date)}, ${time}` : nowStamp();
  const past = d.when === 'later' && parseDate(sendAt).getTime() < new Date(2026, 9, 15, 0, 0).getTime();
  const needs3 = [past && 'a send time in the future'].filter(Boolean) as string[];
  const needs = [needs1, needs2, needs3][step];
  const remindDates = d.kind === 'Reminder' && d.eventDate ? [...(d.remindDays ?? [])].sort((x, y) => y - x).map(n => { const t = parseDate(d.eventDate!); t.setDate(t.getDate() - n); return `${fmtDate(t)} (${n === 0 ? 'on the day' : `${n} day${n === 1 ? '' : 's'} before`})`; }) : [];
  const save = (status: 'Draft' | 'Scheduled' | 'Sent') => {
    const id = editId ?? 'BC' + Date.now();
    const b: Broadcast = { ...d, sendAt: status === 'Draft' ? (d.when === 'later' ? sendAt : '') : sendAt, id, status, by: ME_NAME, at: nowStamp(), deliveries: status === 'Sent' ? people.map(u => ({ user: u.id, status: 'Delivered' as const })) : [] };
    const list = editId ? db.broadcasts.map(x => x.id === id ? b : x) : [b, ...db.broadcasts];
    const who = `${audienceText(db, d.audience)} (${people.length} people)`;
    s.commit('broadcasts', list, { page: 'Send a message', item: d.title, what: status === 'Sent' ? `Sent ${d.kind.toLowerCase() === 'message' ? 'a message' : 'an ' + d.kind.toLowerCase()}`.replace('an reminder', 'a reminder') : status === 'Scheduled' ? `Scheduled a ${d.kind.toLowerCase()}` : 'Saved a draft', after: `${who} · ${d.channels.join(', ')}${status === 'Scheduled' ? ' · ' + sendAt : ''}` },
      status === 'Sent' ? `Sent to ${people.length} people` : status === 'Scheduled' ? `Scheduled for ${sendAt}` : 'Draft saved');
    s.go('broadcasts', id);
  };
  const sample = people[0]; const over = sample ? { first_name: sample.name.split(' ')[0], full_name: sample.name, date: d.eventDate || '24 Dec 2026', office_phone: db.company.phone } : { date: d.eventDate || '24 Dec 2026' };
  const byRole = GROUPS.map(g => ({ ...g, n: people.filter(u => u.role === g.role).length })).filter(g => g.n);
  return <>
    <Head r="broadcasts" extra={editId ? 'Edit' : 'New message'} title={editId ? `Edit: ${base?.title}` : 'New message'} back />
    <Card><HSteps items={['What to say', 'Who gets it', 'When, then check']} at={step} /></Card>
    {step === 0 && <div className="adm-split">
      <div className="col">
        <Card title="Kind of message">
          <div className="grid g3">{KINDS.map(k => { const Ic = k.icon; return <button key={k.id} type="button" className={`choice${d.kind === k.id ? ' on' : ''}`} onClick={() => p({ kind: k.id, bannerUntil: k.id === 'Announcement' ? d.bannerUntil ?? '' : undefined, eventDate: k.id === 'Reminder' ? d.eventDate ?? '' : undefined, remindDays: k.id === 'Reminder' ? d.remindDays ?? [1] : undefined })}>
            <span className="flex" style={{ gap: 8 }}><Ic size={16} /><b>{k.id}</b></span><span className="small">{k.text}</span></button>; })}</div>
        </Card>
        <Card title="Wording">
          <Field label="Title"><Text value={d.title} onChange={v => p({ title: v })} placeholder={d.kind === 'Announcement' ? 'e.g. Office closed over Christmas' : d.kind === 'Reminder' ? 'e.g. Hand in October rent records' : 'e.g. Your account is unlocked'} /></Field>
          <TokenFields tokens={TOKENS} fields={[{ label: 'Message', value: d.body, set: v => p({ body: v }), rows: 7, hint: d.channels.includes('Text') ? <span className="caption">Text: {smsCount(fill(d.body, over)).n} characters · {smsCount(fill(d.body, over)).parts} text{smsCount(fill(d.body, over)).parts > 1 ? 's' : ''}</span> : undefined }]} />
          {bad.length > 0 && <Note tone="err">These details don't exist: {bad.map(x => `{${x}}`).join(', ')}. Click a detail instead of typing it.</Note>}
          <Field label="How to send it"><MultiPick label="How to send it" options={CHANNELS} value={d.channels} onChange={v => p({ channels: v as MsgChannel[] })} /></Field>
        </Card>
        {d.kind === 'Announcement' && <Card title="Banner on their home page">
          <div className="grid g2">
            <Field label="Colour"><div className="seg" role="group" aria-label="Banner colour">{([['info', 'Blue'], ['warn', 'Orange'], ['ok', 'Green']] as const).map(([v, l]) => <button key={v} type="button" className={d.tone === v ? 'on' : ''} onClick={() => p({ tone: v })}>{l}</button>)}</div></Field>
            <Field label="Show the banner until"><input className="input" type="date" value={toInput(d.bannerUntil)} onChange={e => p({ bannerUntil: fromInput(e.target.value) })} /></Field>
          </div>
          {!d.channels.includes('In-app') && <Note>The banner only shows when “In-app” is ticked.</Note>}
        </Card>}
        {d.kind === 'Reminder' && <Card title="The date it is about">
          <div className="grid g2">
            <Field label="Date"><input className="input" type="date" value={toInput(d.eventDate)} onChange={e => p({ eventDate: fromInput(e.target.value) })} /></Field>
            <Field label="Remind them (days before)" hint="0 = on the day"><ChipsInput label="Days before" value={(d.remindDays ?? []).map(String)} onChange={v => p({ remindDays: v.map(Number).filter(n => n >= 0 && n < 366) })} placeholder="e.g. 7" /></Field>
          </div>
          {remindDates.length > 0 && <div className="flex wrap" style={{ gap: 6 }}><span className="caption">Sent on:</span>{remindDates.map(t => <Chip key={t} tone="info" dot={false}>{t}</Chip>)}</div>}
        </Card>}
      </div>
      <div className="sticky"><Preview d={d} over={over} /></div>
    </div>}
    {step === 1 && <div className="adm-split">
      <Card title="Who gets it">
        <div className="seg" role="group" aria-label="Who gets it">{([['everyone', 'Everyone'], ['groups', 'Whole groups'], ['people', 'Pick people']] as const).map(([v, l]) => <button key={v} type="button" className={d.audience.mode === v ? 'on' : ''} onClick={() => a({ mode: v })}>{l}</button>)}</div>
        {d.audience.mode === 'everyone' && <Note>Everyone who can sign in to any portal: staff, landlords, tenants, applicants, letting agents and contractors.</Note>}
        {d.audience.mode === 'groups' && <>
          <Field label="Groups (all of them)"><MultiPick label="Groups" options={GROUPS.map(g => g.label)} value={GROUPS.filter(g => d.audience.groups.includes(g.role)).map(g => g.label)} onChange={v => a({ groups: GROUPS.filter(g => v.includes(g.label)).map(g => g.role) })} /></Field>
          <Field label="Only in these areas (leave empty for every area)"><MultiPick label="Areas" options={[...db.areas].sort((x, y) => x.n - y.n).map(z => `Area ${z.n} · ${z.name}`)} value={db.areas.filter(z => d.audience.areas.includes(z.id)).map(z => `Area ${z.n} · ${z.name}`)} onChange={v => a({ areas: db.areas.filter(z => v.includes(`Area ${z.n} · ${z.name}`)).map(z => z.id) })} /></Field>
        </>}
        {d.audience.mode === 'people' && <PeoplePicker db={db} value={d.audience.people} onChange={v => a({ people: v })} />}
      </Card>
      <div className="sticky"><Card title={<span className="clean-h"><Users size={16} />{people.length} {people.length === 1 ? 'person' : 'people'}</span>} sub="Disabled logins are left out">
        {people.length ? <>
          <div className="col" style={{ gap: 6 }}>{byRole.map(g => <div key={g.role} className="flex between"><span className="small">{g.label}</span><b className="small" style={{ color: 'var(--text-primary)' }}>{g.n}</b></div>)}</div>
          <div className="flex wrap" style={{ gap: 4 }}>{people.slice(0, 10).map(u => <Chip key={u.id} dot={false}>{u.name}</Chip>)}{people.length > 10 && <span className="caption">+{people.length - 10} more</span>}</div>
        </> : <Empty>Nobody yet.</Empty>}
      </Card></div>
    </div>}
    {step === 2 && <div className="adm-split">
      <div className="col">
        <Card title="When to send it">
          <div className="seg" role="group" aria-label="When to send it"><button type="button" className={d.when === 'now' ? 'on' : ''} onClick={() => p({ when: 'now' })}>Send now</button><button type="button" className={d.when === 'later' ? 'on' : ''} onClick={() => p({ when: 'later' })}>Schedule</button></div>
          {d.when === 'later' && <div className="grid g2"><Field label="Date"><input className="input" type="date" aria-label="Send date" value={date} onChange={e => setDate(e.target.value)} /></Field><Field label="Time"><input className="input" type="time" aria-label="Send time" value={time} onChange={e => setTime(e.target.value)} /></Field></div>}
          {past && <Note tone="err">That time has passed. Choose a time from now on.</Note>}
          {d.kind === 'Reminder' && remindDates.length > 0 && <Note>As a reminder it is also sent again on: {remindDates.join(', ')}.</Note>}
        </Card>
        <Card title="Check" action={<div className="flex"><Btn sm kind="ghost" onClick={() => setStep(0)}>Change wording</Btn><Btn sm kind="ghost" onClick={() => setStep(1)}>Change who</Btn></div>}>
          <Facts items={[['Kind', d.kind], ['Title', d.title], ['To', `${audienceText(db, d.audience)} · ${people.length} people`], ['How', d.channels.join(', ')], ['When', d.when === 'now' ? 'As soon as you press Send' : sendAt], ...(d.kind === 'Announcement' && d.bannerUntil ? [['Banner until', d.bannerUntil] as [string, string]] : []), ...(d.kind === 'Reminder' ? [['About', d.eventDate ?? ''] as [string, string]] : [])]} />
        </Card>
      </div>
      <div className="sticky"><Preview d={d} over={over} /></div>
    </div>}
    <div className="savebar on" role="region" aria-label="Steps">
      <div className="stack grow"><b>Step {step + 1} of 3 · {['What to say', 'Who gets it', 'When, then check'][step]}</b><span className="caption">{needs.length ? `Still needed: ${needs.join(', ')}.` : step === 2 ? 'Nothing is sent until you press the button.' : 'Ready for the next step.'}</span></div>
      <Btn kind="outline" onClick={() => step ? setStep(step - 1) : d.title || d.body.length > 16 ? setLeave(true) : s.go('broadcasts')}>{step ? 'Back' : 'Cancel'}</Btn>
      {step === 2 && <Btn kind="outline" disabled={!d.title.trim()} onClick={() => save('Draft')}>Save as draft</Btn>}
      {step < 2 ? <Btn disabled={needs.length > 0} onClick={() => setStep(step + 1)}>Next</Btn>
        : <Btn icon={d.when === 'now' ? <Send size={16} /> : <CalendarClock size={16} />} disabled={needs.length > 0 || needs1.length > 0 || needs2.length > 0} onClick={() => save(d.when === 'now' ? 'Sent' : 'Scheduled')}>{d.when === 'now' ? `Send to ${people.length} people` : 'Schedule'}</Btn>}
    </div>
    {leave && <Modal title="Leave without saving?" sub="What you've written is not saved. You can save it as a draft in step 3." onClose={() => setLeave(false)} footer={<><Btn kind="outline" onClick={() => setLeave(false)}>Keep going</Btn><Btn kind="danger" onClick={() => s.go('broadcasts')}>Leave</Btn></>} />}
  </>;
}

/** Search every login and add people one by one. */
function PeoplePicker({ db, value, onChange }: { db: Db; value: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState(''); const [g, setG] = useState('all');
  const found = useMemo(() => db.users.filter(u => u.status !== 'Disabled' && !value.includes(u.id) && (g === 'all' || u.role === g) && (u.name + ' ' + u.email + ' ' + (u.org ?? '')).toLowerCase().includes(q.toLowerCase())).slice(0, 8), [db.users, value, q, g]);
  const picked = db.users.filter(u => value.includes(u.id));
  return <div className="col" style={{ gap: 10 }}>
    <div className="flex"><div className="grow" style={{ position: 'relative' }}><Search size={16} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--text-tertiary)' }} /><input className="input" style={{ paddingLeft: 36 }} aria-label="Find people" value={q} onChange={e => setQ(e.target.value)} placeholder="Find by name, email or company" /></div>
      <select className="input" style={{ width: 180 }} aria-label="Only" value={g} onChange={e => setG(e.target.value)}><option value="all">Anyone</option>{GROUPS.map(x => <option key={x.role} value={x.role}>{x.label}</option>)}</select></div>
    <div>{found.map(u => <button key={u.id} type="button" className="rowlink" onClick={() => onChange([...value, u.id])}><Avatar name={u.name} /><div className="stack grow"><b>{u.name}</b><span className="caption">{u.role}{u.org ? ' · ' + u.org : ''} · {u.email}</span></div><Plus size={16} color="var(--text-brand)" /></button>)}
      {!found.length && <span className="caption">Nobody else matches.</span>}</div>
    {picked.length > 0 && <div className="col" style={{ gap: 6 }}><span className="sec-label">Picked · {picked.length}</span><div className="flex wrap" style={{ gap: 6 }}>{picked.map(u => <span key={u.id} className="chipx">{u.name}<button type="button" aria-label={`Remove ${u.name}`} onClick={() => onChange(value.filter(x => x !== u.id))}><X size={12} /></button></span>)}</div></div>}
  </div>;
}

/** What people get: the in-app banner or alert, the email and the text. */
function Preview({ d, over }: { d: Pick<Broadcast, 'kind' | 'title' | 'body' | 'channels' | 'tone' | 'bannerUntil'>; over: Record<string, string> }) {
  const Ic = d.tone === 'warn' ? AlertTriangle : d.tone === 'ok' ? CheckCircle2 : Info;
  return <Card title="What they get" sub={`Sample: ${over.full_name ?? 'a person'}`}>
    {!d.channels.length && <Empty>Choose how to send it.</Empty>}
    {d.channels.includes('In-app') && <div className="col" style={{ gap: 6 }}><span className="sec-label">In the portal</span>
      {d.kind === 'Announcement' ? <div className={`alertbar a-${d.tone}`}><Ic size={16} /><b className="grow">{d.title || 'Title'}<span className="caption" style={{ display: 'block', fontWeight: 500, whiteSpace: 'pre-wrap' }}>{fill(d.body, over).replace(/^Hi [^,]*,\s*/, '').slice(0, 140)}</span></b></div>
        : <div className="lrow" style={{ alignItems: 'flex-start' }}><span className="tile t-brand" style={{ width: 30, height: 30 }}>{kindIcon(d.kind as BKind, 14)}</span><div className="stack"><b className="small" style={{ color: 'var(--text-primary)' }}>{d.title || 'Title'}</b><span className="caption">In their bell · just now</span></div></div>}
      {d.kind === 'Announcement' && d.bannerUntil && <span className="caption">Shows on their home page until {d.bannerUntil}.</span>}</div>}
    {d.channels.includes('Email') && <div className="col" style={{ gap: 6 }}><span className="sec-label">Email</span><div className="emailpv"><div className="eh"><b>{d.title || 'Title'}</b></div><div className="eb">{fill(d.body, over)}</div></div></div>}
    {d.channels.includes('Text') && <div className="col" style={{ gap: 6 }}><span className="sec-label">Text</span><div className="smsbubble">{`LSP: ${fill(d.body, over).replace(/\n+/g, ' ')}`}</div></div>}
  </Card>;
}

function BroadcastPage({ id }: { id: string }) {
  const s = useStore(); const { db } = s; const b = db.broadcasts.find(x => x.id === id);
  const [act, setAct] = useState<'' | 'cancel' | 'delete' | 'send'>(''); const [q, setQ] = useState(''); const [f, setF] = useState('all');
  if (!b) return <><Head r="broadcasts" extra="Not found" back /><Empty>This message was deleted.</Empty></>;
  const people = recipientsOf(db, b.audience); const r = reach(b);
  const rows = (b.status === 'Sent' ? b.deliveries.map(x => ({ u: db.users.find(u => u.id === x.user), st: x.status })) : people.map(u => ({ u, st: 'Waiting' as const })))
    .filter(x => x.u && (f === 'all' || x.st === f) && (x.u.name + ' ' + x.u.email + ' ' + x.u.role).toLowerCase().includes(q.toLowerCase()));
  const put = (patch: Partial<Broadcast>, what: string, msg: string, reason?: string) => s.commit('broadcasts', db.broadcasts.map(x => x.id === id ? { ...x, ...patch } : x), { page: 'Send a message', item: b.title, what, before: b.status, after: patch.status ?? b.status, reason }, msg);
  const sample = people[0]; const over = sample ? { first_name: sample.name.split(' ')[0], full_name: sample.name, date: b.eventDate || '24 Dec 2026', office_phone: db.company.phone } : {};
  return <>
    <Head r="broadcasts" extra={b.title} title={b.title} back action={<div className="flex">
      {b.status === 'Scheduled' && <Btn icon={<Send size={16} />} onClick={() => setAct('send')}>Send now</Btn>}
      {b.status === 'Draft' && <Btn icon={<Pencil size={16} />} onClick={() => s.go('broadcasts', 'edit~' + id)}>Continue editing</Btn>}
      <MoreMenu label="···" items={[{ label: 'Send a copy', icon: <Copy size={16} />, onClick: () => s.go('broadcasts', 'copy~' + id) },
        b.status === 'Scheduled' && { label: 'Edit', icon: <Pencil size={16} />, onClick: () => s.go('broadcasts', 'edit~' + id) },
        b.status === 'Scheduled' && { label: 'Cancel sending', icon: <X size={16} />, danger: true, onClick: () => setAct('cancel') },
        (b.status === 'Draft' || b.status === 'Cancelled') && { label: 'Delete', icon: <Trash2 size={16} />, danger: true, onClick: () => setAct('delete') }]} />
    </div>} />
    <Card><Facts items={[['Status', <Chip key="s" tone={statusTone(b.status)}>{b.status}</Chip>], ['Kind', b.kind], ['To', audienceText(db, b.audience)], ['How', b.channels.join(', ')], [b.status === 'Sent' ? 'Sent' : 'Sends', b.status === 'Draft' ? 'Not yet' : b.sendAt], [b.status === 'Sent' ? 'Reached' : 'People', b.status === 'Sent' ? `${r.sent} · ${r.read} read` : people.length], ['By', b.by]]} /></Card>
    {b.note && <Note tone="warn">{b.note}</Note>}
    <div className="adm-split">
      <Card title={b.status === 'Sent' ? 'Who got it' : 'Who will get it'} sub={b.status === 'Sent' ? undefined : 'Worked out again when it sends, so new people in the group are included'}
        action={<Btn sm kind="outline" icon={<Download size={14} />} disabled={!rows.length} onClick={() => { downloadCsv(`${b.title.toLowerCase().replace(/\W+/g, '-')}.csv`, [['Name', 'Role', 'Email', 'Status'], ...rows.map(x => [x.u!.name, x.u!.role, x.u!.email, x.st])]); s.toast('Downloaded'); }}>Export CSV</Btn>}>
        <div className="toolbar"><MiniSearch value={q} onChange={setQ} placeholder="Search people" />{b.status === 'Sent' && <select className="fsel" aria-label="Status" value={f} onChange={e => setF(e.target.value)}><option value="all">Any status</option><option>Read</option><option>Delivered</option></select>}<span className="caption">{rows.length} shown</span></div>
        {rows.length ? <div className="tablewrap"><table className="t"><thead><tr><th>Person</th><th>Role</th><th>Status</th></tr></thead><tbody>
          {rows.map(x => <tr key={x.u!.id} className="static"><td><span className="flex" style={{ gap: 10 }}><Avatar name={x.u!.name} /><span className="stack"><b className="strong">{x.u!.name}</b><span className="caption">{x.u!.email}</span></span></span></td><td className="small">{x.u!.role}{x.u!.org ? ' · ' + x.u!.org : ''}</td>
            <td><Chip tone={x.st === 'Read' ? 'ok' : x.st === 'Delivered' ? 'info' : 'neutral'}>{x.st}</Chip></td></tr>)}
        </tbody></table></div> : <Empty>Nobody matches.</Empty>}
      </Card>
      <div className="sticky"><Preview d={b} over={over} /></div>
    </div>
    {act === 'send' && <Modal title={`Send “${b.title}” now?`} sub={`It goes to ${people.length} people straight away instead of on ${b.sendAt}.`} onClose={() => setAct('')} footer={<><Btn kind="outline" onClick={() => setAct('')}>Cancel</Btn><Btn icon={<Send size={16} />} onClick={() => { put({ status: 'Sent', sendAt: nowStamp(), deliveries: people.map(u => ({ user: u.id, status: 'Delivered' })) }, 'Sent early', `Sent to ${people.length} people`); setAct(''); }}>Send now</Btn></>} />}
    {act === 'cancel' && <ReasonModal danger title="Cancel sending?" sub="Nobody gets it. You can still send a copy later." cta="Cancel sending" onClose={() => setAct('')} onDone={reason => { put({ status: 'Cancelled' }, 'Cancelled a scheduled message', 'Cancelled. Nobody gets it.', reason); setAct(''); }} />}
    {act === 'delete' && <DeleteModal what={`“${b.title}”`} onClose={() => setAct('')} onDone={reason => { s.commit('broadcasts', db.broadcasts.filter(x => x.id !== id), { page: 'Send a message', item: b.title, what: `Deleted a ${b.status.toLowerCase()} message`, before: b.status, reason }, 'Deleted'); s.go('broadcasts'); }} />}
  </>;
}
