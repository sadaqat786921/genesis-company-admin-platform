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
      <Btn icon={<Plus size={16} />} onClick={() => s.go('broadcasts', 'new')}>New</Btn>
    </div>} />
    <Card>
      <div className="toolbar"><MiniSearch value={q} onChange={setQ} placeholder="Search title, wording or who it's for" />
        <select className="fsel" aria-label="Kind" value={kind} onChange={e => setKind(e.target.value)}><option value="all">All kinds</option>{KINDS.map(k => <option key={k.id} value={k.id}>{k.id}s</option>)}</select>
        <span className="caption">{list.length} shown</span></div>
      {list.length ? <div className="tablewrap"><table className="t"><thead><tr><th>Message</th><th>To</th><th>How</th><th>When</th><th>Status</th><th>Reached</th></tr></thead><tbody>
        {list.map(b => { const r = reach(b); return <tr key={b.id} onClick={() => s.go('broadcasts', b.id)}>
          <td><span className="flex" style={{ gap: 10 }}><span className="tile t-brand" style={{ width: 32, height: 32 }}>{kindIcon(b.kind)}</span><span className="stack"><b className="strong">{b.title}</b><span className="caption">{b.kind}</span></span></span></td>
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
const blank = (kind: BKind = 'Announcement'): Draft => ({ kind, title: '', body: '', channels: ['In-app', 'Email'], tone: 'info', audience: { mode: kind === 'Message' ? 'people' : 'everyone', groups: [], people: [], areas: [] }, when: kind === 'Reminder' ? 'later' : 'now', sendAt: '' });
/** "Send to" choices: everyone, one whole group, or picked people. */
const TO: { id: string; label: string }[] = [{ id: 'everyone', label: 'Everyone' }, ...GROUPS.map(g => ({ id: g.role, label: `All ${g.label.toLowerCase()}` })), { id: 'people', label: 'Specific people' }];
const toId = (a: Audience) => a.mode === 'everyone' ? 'everyone' : a.mode === 'people' ? 'people' : a.groups[0] ?? 'everyone';
const toAudience = (id: string, people: string[]): Audience => id === 'everyone' ? { mode: 'everyone', groups: [], people: [], areas: [] } : id === 'people' ? { mode: 'people', groups: [], people, areas: [] } : { mode: 'groups', groups: [id as Role], people: [], areas: [] };
const NEXT_DAY = '2026-10-16';

/** One simple form: type, title, message, who, how, when. Then Send / Schedule. */
function Composer({ editId, copyId }: { editId?: string; copyId?: string }) {
  const s = useStore(); const { db } = s;
  const startKind = (s.detail?.startsWith('new~') ? s.detail.slice(4) : undefined) as BKind | undefined;
  const base = db.broadcasts.find(b => b.id === (editId ?? copyId));
  const [d, setD] = useState<Draft>(() => base ? { ...JSON.parse(JSON.stringify(base)), ...(copyId ? { title: base.title, when: 'now', sendAt: '' } : {}) } : blank(startKind));
  const [date, setDate] = useState(d.sendAt && d.when === 'later' ? toInput(d.sendAt.split(',')[0]) : NEXT_DAY);
  const [time, setTime] = useState(d.sendAt && d.when === 'later' ? d.sendAt.split(', ')[1] ?? '09:00' : '09:00');
  const [leave, setLeave] = useState(false);
  const p = (x: Partial<Draft>) => setD(o => ({ ...o, ...x }));
  const people = recipientsOf(db, d.audience);
  const sendAt = d.when === 'later' ? `${fromInput(date)}, ${time}` : nowStamp();
  const past = d.when === 'later' && date < '2026-10-15';
  const needs = [!d.title.trim() && 'a title', d.body.trim().length < 3 && 'the message', !people.length && (d.audience.mode === 'people' ? 'at least one person' : 'someone to send it to'), !d.channels.length && 'how to send it', past && 'a date from today on'].filter(Boolean) as string[];
  const save = (status: 'Draft' | 'Scheduled' | 'Sent') => {
    const id = editId ?? 'BC' + Date.now();
    const b: Broadcast = { ...d, eventDate: undefined, remindDays: undefined, bannerUntil: d.kind === 'Announcement' ? d.bannerUntil : undefined, sendAt: status === 'Draft' ? (d.when === 'later' ? sendAt : '') : sendAt, id, status, by: ME_NAME, at: nowStamp(), deliveries: status === 'Sent' ? people.map(u => ({ user: u.id, status: 'Delivered' as const })) : [] };
    s.commit('broadcasts', editId ? db.broadcasts.map(x => x.id === id ? b : x) : [b, ...db.broadcasts], { page: 'Send a message', item: d.title, what: status === 'Sent' ? `Sent a ${d.kind.toLowerCase()}` : status === 'Scheduled' ? `Scheduled a ${d.kind.toLowerCase()}` : 'Saved a draft', after: `${audienceText(db, d.audience)} (${people.length}) · ${d.channels.join(', ')}${status === 'Scheduled' ? ' · ' + sendAt : ''}` },
      status === 'Sent' ? `Sent to ${people.length} people` : status === 'Scheduled' ? `Scheduled for ${sendAt}` : 'Draft saved');
    s.go('broadcasts', id);
  };
  const sample = people[0]; const over = sample ? { first_name: sample.name.split(' ')[0], full_name: sample.name, office_phone: db.company.phone } : {};
  return <>
    <Head r="broadcasts" extra={editId ? 'Edit' : 'New'} title={editId ? 'Edit message' : 'New message'} back />
    <div className="adm-split">
      <div className="col">
        <Card>
          <Group label="Type"><div className="seg" role="group" aria-label="Type">{KINDS.map(k => { const Ic = k.icon; return <button key={k.id} type="button" className={d.kind === k.id ? 'on' : ''} onClick={() => p({ kind: k.id, when: k.id === 'Reminder' ? 'later' : d.when })}><Ic size={15} style={{ marginRight: 6, verticalAlign: -2 }} />{k.id}</button>; })}</div></Group>
          <Field label="Title"><Text value={d.title} onChange={v => p({ title: v })} placeholder={d.kind === 'Announcement' ? 'Office closed over Christmas' : d.kind === 'Reminder' ? 'Rent records due Friday' : 'Your account is unlocked'} /></Field>
          <Field label="Message"><textarea className="input" aria-label="Message" rows={6} style={{ minHeight: 140 }} value={d.body} onChange={e => p({ body: e.target.value })} placeholder="Write your message…" /></Field>
        </Card>
        <Card>
          <div className="grid g2">
            <Field label="Send to"><select className="input" aria-label="Send to" value={toId(d.audience)} onChange={e => p({ audience: toAudience(e.target.value, d.audience.people) })}>{TO.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select></Field>
            <Group label="Send by"><MultiPick label="Send by" options={CHANNELS} value={d.channels} onChange={v => p({ channels: v as MsgChannel[] })} /></Group>
          </div>
          {d.audience.mode === 'people' && <PeoplePicker db={db} value={d.audience.people} onChange={v => p({ audience: { ...d.audience, people: v } })} />}
          <span className="caption">{people.length} {people.length === 1 ? 'person' : 'people'}</span>
        </Card>
        <Card>
          <Group label="When"><div className="seg" role="group" aria-label="When"><button type="button" className={d.when === 'now' ? 'on' : ''} onClick={() => p({ when: 'now' })}>Send now</button><button type="button" className={d.when === 'later' ? 'on' : ''} onClick={() => p({ when: 'later' })}>Schedule</button></div></Group>
          {d.when === 'later' && <div className="grid g2"><Field label="Date"><input className="input" type="date" aria-label="Send date" min="2026-10-15" value={date} onChange={e => setDate(e.target.value)} /></Field><Field label="Time"><input className="input" type="time" aria-label="Send time" value={time} onChange={e => setTime(e.target.value)} /></Field></div>}
          {past && <Note tone="err">Choose today or a later date.</Note>}
          {d.kind === 'Announcement' && d.channels.includes('In-app') && <Field label="Show on their home page until (optional)"><input className="input" type="date" aria-label="Show until" value={toInput(d.bannerUntil)} onChange={e => p({ bannerUntil: fromInput(e.target.value) })} /></Field>}
        </Card>
      </div>
      <div className="sticky"><Preview d={d} over={over} /></div>
    </div>
    <div className="savebar on" role="region" aria-label="Send">
      <div className="stack grow"><b>{needs.length ? `Add ${needs.join(', ')}` : d.when === 'now' ? `Ready to send to ${people.length} ${people.length === 1 ? 'person' : 'people'}` : `Sends on ${fromInput(date)} at ${time}`}</b></div>
      <Btn kind="outline" onClick={() => d.title || d.body ? setLeave(true) : s.go('broadcasts')}>Cancel</Btn>
      <Btn kind="outline" disabled={!d.title.trim()} onClick={() => save('Draft')}>Save draft</Btn>
      <Btn icon={d.when === 'now' ? <Send size={16} /> : <CalendarClock size={16} />} disabled={needs.length > 0} onClick={() => save(d.when === 'now' ? 'Sent' : 'Scheduled')}>{d.when === 'now' ? 'Send' : 'Schedule'}</Btn>
    </div>
    {leave && <Modal title="Leave without saving?" onClose={() => setLeave(false)} footer={<><Btn kind="outline" onClick={() => setLeave(false)}>Keep writing</Btn><Btn kind="danger" onClick={() => s.go('broadcasts')}>Leave</Btn></>} />}
  </>;
}

/** Search every login and add people one by one. */
function PeoplePicker({ db, value, onChange }: { db: Db; value: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState(''); const g = 'all';
  const found = useMemo(() => db.users.filter(u => u.status !== 'Disabled' && !value.includes(u.id) && (g === 'all' || u.role === g) && (u.name + ' ' + u.email + ' ' + (u.org ?? '')).toLowerCase().includes(q.toLowerCase())).slice(0, q ? 6 : 0), [db.users, value, q, g]);
  const picked = db.users.filter(u => value.includes(u.id));
  return <div className="col" style={{ gap: 10 }}>
    <div className="flex"><div className="grow" style={{ position: 'relative' }}><Search size={16} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--text-tertiary)' }} /><input className="input" style={{ paddingLeft: 36 }} aria-label="Find people" value={q} onChange={e => setQ(e.target.value)} placeholder="Search a name or email" /></div>
</div>
    <div>{found.map(u => <button key={u.id} type="button" className="rowlink" onClick={() => onChange([...value, u.id])}><Avatar name={u.name} /><div className="stack grow"><b>{u.name}</b><span className="caption">{u.role}{u.org ? ' · ' + u.org : ''} · {u.email}</span></div><Plus size={16} color="var(--text-brand)" /></button>)}
      {q && !found.length && <span className="caption">Nobody matches.</span>}</div>
    {picked.length > 0 && <div className="col" style={{ gap: 6 }}><span className="sec-label">Picked · {picked.length}</span><div className="flex wrap" style={{ gap: 6 }}>{picked.map(u => <span key={u.id} className="chipx">{u.name}<button type="button" aria-label={`Remove ${u.name}`} onClick={() => onChange(value.filter(x => x !== u.id))}><X size={12} /></button></span>)}</div></div>}
  </div>;
}

/** What people get: the in-app banner or alert, the email and the text. */
function Preview({ d, over }: { d: Pick<Broadcast, 'kind' | 'title' | 'body' | 'channels' | 'tone' | 'bannerUntil'>; over: Record<string, string> }) {
  const Ic = d.tone === 'warn' ? AlertTriangle : d.tone === 'ok' ? CheckCircle2 : Info;
  return <Card title="Preview">
    {!d.channels.length && <Empty>Choose how to send it.</Empty>}
    {d.channels.includes('In-app') && <div className="col" style={{ gap: 6 }}><span className="sec-label">In the portal</span>
      {d.kind === 'Announcement' ? <div className={`alertbar a-${d.tone}`}><Ic size={16} /><b className="grow">{d.title || 'Title'}<span className="caption" style={{ display: 'block', fontWeight: 500, whiteSpace: 'pre-wrap' }}>{fill(d.body, over).replace(/^Hi [^,]*,\s*/, '').slice(0, 140) || 'Your message'}</span></b></div>
        : <div className="lrow" style={{ alignItems: 'flex-start' }}><span className="tile t-brand" style={{ width: 30, height: 30 }}>{kindIcon(d.kind as BKind, 14)}</span><div className="stack"><b className="small" style={{ color: 'var(--text-primary)' }}>{d.title || 'Title'}</b><span className="caption">In their bell · just now</span></div></div>}
</div>}
    {d.channels.includes('Email') && <div className="col" style={{ gap: 6 }}><span className="sec-label">Email</span><div className="emailpv"><div className="eh"><b>{d.title || 'Title'}</b></div><div className="eb">{fill(d.body, over) || 'Your message'}</div></div></div>}
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
    <Card><Facts items={[['Status', <Chip key="s" tone={statusTone(b.status)}>{b.status}</Chip>], ['Type', b.kind], ['To', audienceText(db, b.audience)], ['Sent by', b.channels.join(', ')], [b.status === 'Sent' ? 'Sent' : 'Sends', b.status === 'Draft' ? 'Not yet' : b.sendAt], [b.status === 'Sent' ? 'Reached' : 'People', b.status === 'Sent' ? `${r.sent} · ${r.read} read` : people.length]]} /></Card>
    {b.note && <Note tone="warn">{b.note}</Note>}
    <div className="adm-split">
      <Card title={b.status === 'Sent' ? 'Who got it' : 'Who will get it'}
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

/** A label above a group of buttons (not a <label>, so clicks on it don't press the first button). */
function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="field"><span>{label}</span>{children}</div>;
}
