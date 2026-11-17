import { useState } from 'react';
import { UserPlus, Eye, EyeOff, Lock, MailPlus, UserX, UserCheck, Trash2, UserCog, Check, KeyRound, Send, LayoutDashboard } from 'lucide-react';
import { useStore, LOCKED_FOR_SUB, type Route } from '../store';
import { nowStamp } from '../data';
import { Card, Chip, Btn, Field, Text, Select, Modal, Empty, Facts, Avatar, MoreMenu, Note, InfoTip, HSteps } from '../ui';
import { Head, NAV, LABEL } from '../Shell';
import { useDraft, SaveBar, ReasonModal, DeleteModal, Toggle } from '../admin';
import { statusTone } from './lib';
import type { User, Access3 } from '../seed';

/* People › Sub Admins. The main Admin adds as many Sub Admins as needed and chooses, page by page,
   which sidebar sections each one can open: Off, View only or Can edit.
   A Sub Admin can never open this page, so they can never give themselves more access.
   The Overview is always on (view only). The Audit history is never editable by anyone. */

const PAGES = NAV.filter(g => g.group !== 'Overview').map(g => ({ group: g.group, items: g.items.filter(i => i.id !== 'subadmins') }));
const ALL = PAGES.flatMap(g => g.items.map(i => i.id));
const maxOf = (r: Route): Access3 => LOCKED_FOR_SUB[r] ? 'off' : r === 'audit' ? 'view' : 'edit';
const count = (a: Record<string, Access3> = {}) => ({ on: ALL.filter(r => (a[r] ?? 'off') !== 'off').length, edit: ALL.filter(r => a[r] === 'edit').length });
const summary = (a: Record<string, Access3> = {}) => PAGES.map(g => { const on = g.items.filter(i => (a[i.id] ?? 'off') !== 'off'); return on.length ? `${g.group}: ${on.map(i => `${i.label} (${a[i.id] === 'edit' ? 'edit' : 'view'})`).join(', ')}` : ''; }).filter(Boolean).join(' · ') || 'No pages';

/** Ready-made starting points. The Admin changes the ticks afterwards. */
const STARTS: { id: string; label: string; access: Record<string, Access3> }[] = [
  { id: 'blank', label: 'Nothing yet (choose page by page)', access: {} },
  { id: 'messages', label: 'Messages and documents', access: { reminders: 'edit', templates: 'edit', checklists: 'edit', stages: 'edit', doctemplates: 'edit', agreements: 'view', access: 'view', audit: 'view' } },
  { id: 'people', label: 'People and onboarding', access: { users: 'edit', teams: 'view', 'onb-tenant': 'edit', 'onb-landlord': 'edit', 'onb-agent': 'edit', 'onb-contractor': 'edit', audit: 'view' } },
  { id: 'business', label: 'Business and prices', access: { company: 'view', areas: 'view', plans: 'view', services: 'edit', products: 'edit', tax: 'view', audit: 'view' } },
  { id: 'read', label: 'See everything, change nothing', access: Object.fromEntries(ALL.map(r => [r, maxOf(r) === 'off' ? 'off' : 'view'])) },
];

export function SubAdmins() {
  const s = useStore();
  if (s.detail === 'new') return <NewSubAdmin />;
  if (s.detail) return <SubAdminPage id={s.detail} />;
  return <SubAdminList />;
}

function SubAdminList() {
  const s = useStore(); const { db } = s;
  const list = db.users.filter(u => u.role === 'Sub Admin');
  return <>
    <Head r="subadmins" action={<Btn icon={<UserPlus size={16} />} onClick={() => s.go('subadmins', 'new')}>Add a Sub Admin</Btn>} />
    <Card title={<span className="clean-h">Sub Admins<InfoTip>Add as many as you need. For each one, choose which sidebar pages they can open and whether they can change them. They sign in to this portal with their own login and security code. Everything they save shows in the Audit history with their name.</InfoTip></span>} sub={`${list.length} people`}>
      {list.length ? <div className="tablewrap"><table className="t"><thead><tr><th>Name</th><th>Pages they can open</th><th>Status</th><th>Last signed in</th><th /></tr></thead><tbody>
        {list.map(u => { const c = count(u.access); return <tr key={u.id} onClick={() => s.go('subadmins', u.id)}>
          <td><span className="flex" style={{ gap: 10 }}><Avatar name={u.name} /><span className="stack"><b className="strong">{u.name}</b><span className="caption">{u.email}</span></span></span></td>
          <td><span className="stack"><b className="small" style={{ color: 'var(--text-primary)' }}>{c.on} of {ALL.length} pages</b><span className="caption">{c.edit} can edit · {c.on - c.edit} view only</span></span></td>
          <td><Chip tone={statusTone(u.status)}>{u.status}</Chip></td><td className="small">{u.last}</td>
          <td onClick={e => e.stopPropagation()}><Btn sm kind="ghost" icon={<Eye size={14} />} disabled={u.status === 'Disabled'} onClick={() => { s.setViewAs(u.id); s.go('overview'); s.toast(`You're seeing the portal as ${u.name}`); }}>See as them</Btn></td>
        </tr>; })}
      </tbody></table></div> : <Empty icon={<UserCog size={22} />}>No Sub Admins yet. Add the first one.</Empty>}
    </Card>
    <div className="grid g3">
      {[['You choose page by page', 'Off, View only or Can edit, for every page in the sidebar.'], ['Their own login', 'Own email, password and security code. Disable them at any time.'], ['They can’t widen their access', 'Only you open this page. Every change they make is in the Audit history.']].map(([t, d]) => <div key={t} className="lrow" style={{ alignItems: 'flex-start' }}><Check size={16} color="var(--ok)" style={{ marginTop: 2, flex: 'none' }} /><div className="stack"><b className="small" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{t}</b><span className="caption">{d}</span></div></div>)}
    </div>
  </>;
}

function SubAdminPage({ id }: { id: string }) {
  const s = useStore(); const { db } = s; const u = db.users.find(x => x.id === id && x.role === 'Sub Admin');
  const x = useDraft<Record<string, Access3>>(u?.access ?? {}); const [act, setAct] = useState<'' | 'disable' | 'enable' | 'remove'>('');
  if (!u) return <><Head r="subadmins" extra="Not found" back /><Empty>This Sub Admin was removed.</Empty></>;
  const a = x.d; const lv = (r: Route): Access3 => a[r] ?? 'off';
  const changes = ALL.filter(r => (u.access?.[r] ?? 'off') !== lv(r)).map(r => `${LABEL[r]}: ${(u.access?.[r] ?? 'off').replace('off', 'off').replace('view', 'view only').replace('edit', 'can edit')} → ${lv(r) === 'view' ? 'view only' : lv(r) === 'edit' ? 'can edit' : 'off'}`);
  const setUser = (p: Partial<User>, what: string, before: string, after: string, msg: string, reason?: string) => s.commit('users', db.users.map(y => y.id === u.id ? { ...y, ...p } : y), { page: 'Sub Admins', item: u.name, what, before, after, reason }, msg);
  return <>
    <Head r="subadmins" extra={u.name} title={u.name} back action={<div className="flex">
      <Btn kind="outline" icon={<Eye size={16} />} disabled={u.status === 'Disabled' || x.dirty} title={x.dirty ? 'Save first' : undefined} onClick={() => { s.setViewAs(u.id); s.go('overview'); s.toast(`You're seeing the portal as ${u.name}`); }}>See the portal as them</Btn>
      <MoreMenu label="···" items={[u.status === 'Invited' && { label: 'Resend invite', icon: <MailPlus size={16} />, onClick: () => setUser({ created: nowStamp() }, 'Resent an invite', u.created, nowStamp(), `Invite sent again to ${u.email}`) },
        u.status !== 'Disabled' && { label: 'Disable login', icon: <UserX size={16} />, onClick: () => setAct('disable') }, u.status === 'Disabled' && { label: 'Enable login', icon: <UserCheck size={16} />, onClick: () => setAct('enable') },
        { label: 'Remove Sub Admin', icon: <Trash2 size={16} />, danger: true, onClick: () => setAct('remove') }]} />
    </div>} />
    <Card><Facts items={[['Status', <Chip key="s" tone={statusTone(u.status)}>{u.status}</Chip>], ['Email', u.email], ['Pages', `${count(u.access).on} of ${ALL.length}`], ['Can edit', count(u.access).edit], ['Added', u.created.split(',')[0]], ['Last signed in', u.last]]} /></Card>
    <div className="adm-split">
      <AccessEditor a={a} set={x.set} />
      <div className="sticky">
        <SidebarPreview a={a} />
        {u.status === 'Disabled' && <Note tone="warn">This login is disabled. They can't sign in until you enable it.</Note>}
      </div>
    </div>
    <SaveBar dirty={x.dirty} onUndo={x.undo} important="Access changes what this person can see and change, so the reason is saved."
      note={x.dirty ? changes.slice(0, 2).join('; ') + (changes.length > 2 ? '…' : '') : 'Changes apply the next time they open a page.'}
      onSave={reason => setUser({ access: a }, `Changed access for ${changes.length} page${changes.length === 1 ? '' : 's'}`, summary(u.access), changes.join(' · '), 'Access saved. It applies the next time they open a page.', reason)} />
    {act === 'disable' && <ReasonModal danger title={`Disable ${u.name}'s login?`} sub="They can't sign in. Their access settings are kept." cta="Disable login" onClose={() => setAct('')} onDone={r => { setUser({ status: 'Disabled' }, 'Disabled a Sub Admin', u.status, 'Disabled', `${u.name} can't sign in now`, r); setAct(''); }} />}
    {act === 'enable' && <ReasonModal title={`Enable ${u.name}'s login?`} cta="Enable login" onClose={() => setAct('')} onDone={r => { setUser({ status: 'Active' }, 'Enabled a Sub Admin', 'Disabled', 'Active', `${u.name} can sign in again`, r); setAct(''); }} />}
    {act === 'remove' && <DeleteModal what={`${u.name} as a Sub Admin`} detail="Their login is removed. The changes they made stay in the Audit history with their name." onClose={() => setAct('')} onDone={r => { s.commit('users', db.users.filter(y => y.id !== u.id), { page: 'Sub Admins', item: u.name, what: 'Removed a Sub Admin', before: summary(u.access), after: '—', reason: r }, `${u.name} removed`); s.go('subadmins'); }} />}
  </>;
}

/** Turn each sidebar page on or off for a Sub Admin, and choose View only or Can edit for the ones that are on. */
function AccessEditor({ a, set }: { a: Record<string, Access3>; set: (fn: (o: Record<string, Access3>) => Record<string, Access3>) => void }) {
  const lv = (r: Route): Access3 => a[r] ?? 'off';
  const put = (rs: Route[], v: Access3 | 'on') => set(o => { const n = { ...o }; rs.forEach(r => { const m = maxOf(r); const val: Access3 = v === 'on' ? (n[r] && n[r] !== 'off' ? n[r] : m) : v === 'edit' && m === 'view' ? 'view' : m === 'off' ? 'off' : v; if (val === 'off') delete n[r]; else n[r] = val; }); return n; });
  const c = count(a);
  return <Card title={<span className="clean-h">Sidebar access<InfoTip>Switch a page on to put it in their sidebar. Then choose View only (they can look but not save) or Can edit (they can change it like you; every change is saved with their name). Pages switched off are hidden from them.</InfoTip></span>} sub={`${c.on} of ${ALL.length} pages on · ${c.edit} can edit`}>
    <div className="acc">
      <div className="acc-row lockd"><span className="acc-l"><LayoutDashboard size={17} strokeWidth={1.8} />Overview</span><span className="caption">Always on · view only</span></div>
      {PAGES.map(g => { const ids = g.items.map(i => i.id); const anyOn = ids.some(r => lv(r) !== 'off'); const allOn = ids.every(r => lv(r) !== 'off');
        return <div key={g.group} className="acc-g">
          <div className="acc-gh"><span className="sec-label">{g.group}</span><span className="caption">{ids.filter(r => lv(r) !== 'off').length} of {ids.length} on</span>
            <label className="check" style={{ marginLeft: 'auto' }}><span className="small">All</span><Toggle on={allOn} label={`${g.group}: all pages`} onChange={v => put(ids, v ? 'on' : 'off')} /></label></div>
          {g.items.map(i => { const Ic = i.icon; const v = lv(i.id); const m = maxOf(i.id); return <div key={i.id} className={`acc-row${v === 'off' ? ' off' : ''}`}>
            <span className="acc-l"><Ic size={17} strokeWidth={1.8} />{i.label}</span>
            {v !== 'off' && <div className="seg sm" role="group" aria-label={`${i.label} access`}>
              <button type="button" className={v === 'view' ? 'on' : ''} onClick={() => put([i.id], 'view')}>View only</button>
              <button type="button" className={v === 'edit' ? 'on' : ''} disabled={m !== 'edit'} title={m !== 'edit' ? 'Read only for everyone' : undefined} onClick={() => put([i.id], 'edit')}>Can edit</button></div>}
            <Toggle on={v !== 'off'} label={`${i.label} on`} onChange={on => put([i.id], on ? 'on' : 'off')} />
          </div>; })}
          {!anyOn && null}
        </div>; })}
      <div className="acc-row lockd"><span className="acc-l"><Lock size={17} strokeWidth={1.8} />Sub Admins</span><span className="lockchip"><Lock size={11} />Never · only the main Admin</span></div>
    </div>
  </Card>;
}

function SidebarPreview({ a }: { a: Record<string, Access3> }) {
  const lv = (r: Route): Access3 => a[r] ?? 'off';
  return <Card title="Their sidebar" sub="What they see when they sign in">
    <div className="sbprev">
      <div className="sbp-i on"><LayoutDashboard size={15} strokeWidth={1.8} /><span>Overview</span></div>
      {PAGES.map(g => { const items = g.items.filter(i => lv(i.id) !== 'off'); return items.length ? <div key={g.group} className="col" style={{ gap: 2 }}><span className="sec-label" style={{ fontSize: 9.5, padding: '6px 8px 2px' }}>{g.group}</span>
        {items.map(i => { const Ic = i.icon; return <div key={i.id} className="sbp-i"><Ic size={15} strokeWidth={1.8} /><span className="grow">{i.label}</span>{lv(i.id) === 'view' && <em>View</em>}</div>; })}</div> : null; })}
      {!count(a).on && <span className="caption" style={{ padding: 8 }}>Only the Overview. Switch some pages on.</span>}
    </div>
  </Card>;
}

const strong = (p: string) => ({ len: p.length >= 10, num: /\d/.test(p), mix: /[a-z]/.test(p) && /[A-Z]/.test(p) });
const makePassword = () => { const w = ['Maple', 'River', 'Stone', 'Cedar', 'Harbour', 'Willow', 'Falcon', 'Copper']; const pick = () => w[Math.floor(Math.random() * w.length)]; return `${pick()}-${pick().toLowerCase()}-${Math.floor(10 + Math.random() * 89)}`; };

/** Add a Sub Admin in three steps: their details (name, email, mobile, password), sidebar access, then check and invite. */
function NewSubAdmin() {
  const s = useStore(); const { db } = s;
  const [step, setStep] = useState(0);
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [phone, setPhone] = useState('');
  const [pw, setPw] = useState(''); const [show, setShow] = useState(false); const [change, setChange] = useState(true);
  const [start, setStart] = useState('blank'); const [a, setA] = useState<Record<string, Access3>>({});
  const [leave, setLeave] = useState(false);
  const dup = db.users.some(u => u.email.toLowerCase() === email.trim().toLowerCase());
  const st = strong(pw);
  const okDetails = name.trim().includes(' ') && /^\S+@\S+\.\S+$/.test(email) && !dup && /^0\d{9,10}$/.test(phone.replace(/\s/g, '')) && st.len && st.num && st.mix;
  const c = count(a);
  const okAccess = c.on > 0;
  const started = name || email || pw || c.on;
  const invite = () => {
    const u: User = { id: 'U' + Date.now(), name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), role: 'Sub Admin', areas: db.areas.map(z => z.id), status: 'Invited', last: '—', twoStep: false, created: nowStamp(), logins: [], access: a, pwChange: change };
    s.commit('users', [u, ...db.users], { page: 'Sub Admins', item: u.name, what: 'Added a Sub Admin', after: `${summary(a)} · password set by the Admin${change ? ', change at first sign-in' : ''}` }, `${u.name} invited. The email is on its way from Outlook.`);
    s.go('subadmins', u.id);
  };
  return <>
    <Head r="subadmins" extra="Add a Sub Admin" title="Add a Sub Admin" back />
    <Card><HSteps items={['Their details', 'Sidebar access', 'Check and invite']} at={step} /></Card>
    {step === 0 && <div className="adm-split">
      <Card title="Their details" sub="They sign in to this portal with this email and password">
        <div className="grid g2"><Field label="Full name"><Text value={name} onChange={setName} placeholder="e.g. Hannah Lee" /></Field>
          <Field label="Work email (their login)"><Text value={email} onChange={v => setEmail(v.trim())} placeholder="name@lsp.co.uk" /></Field></div>
        {dup && <Note tone="err">Someone already uses this email.</Note>}
        <Field label="Mobile" hint="Their 6-digit security code is sent here every time they sign in"><Text value={phone} onChange={setPhone} placeholder="07700 900123" /></Field>
        <Field label="Password">
          <div className="flex"><div style={{ position: 'relative', flex: 1 }}><input className="input" aria-label="Password" type={show ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password" />
            <button type="button" onClick={() => setShow(v => !v)} aria-label="Show password" style={{ position: 'absolute', right: 10, top: 11, border: 0, background: 'none', color: 'var(--text-tertiary)' }}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
            <Btn kind="outline" icon={<KeyRound size={16} />} onClick={() => { setPw(makePassword()); setShow(true); }}>Create one for me</Btn></div>
          <div className="flex wrap" style={{ gap: 6, marginTop: 8 }}>{[[st.len, '10 characters or more'], [st.num, 'A number'], [st.mix, 'Capital and small letters']].map(([ok, t]) => <Chip key={t as string} tone={ok ? 'ok' : 'neutral'} dot={false}>{ok ? <Check size={12} /> : null}{t as string}</Chip>)}</div>
        </Field>
        <label className="check"><Toggle on={change} onChange={setChange} label="Ask them to change it when they first sign in" />Ask them to change the password when they first sign in</label>
      </Card>
      <div className="sticky"><Card title="How they sign in"><div className="col" style={{ gap: 10 }}>
        {[['Email and password', 'The ones you set here.'], ['Security code', 'A 6-digit code to their mobile, every time.'], ['Only their pages', 'You choose them in the next step.']].map(([t, d]) => <div key={t} className="flex" style={{ alignItems: 'flex-start' }}><Check size={15} color="var(--ok)" style={{ marginTop: 2, flex: 'none' }} /><div className="stack"><b className="small" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{t}</b><span className="caption">{d}</span></div></div>)}
        <Note>The invite email has the sign-in link but never the password. Give them the password yourself, for example by phone.</Note>
      </div></Card></div>
    </div>}
    {step === 1 && <div className="adm-split">
      <div className="col">
        <div className="pccheck"><span className="tile t-brand" style={{ width: 36, height: 36 }}><UserCog size={16} /></span><div className="stack" style={{ width: 200 }}><b className="small" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Quick start</b><span className="caption">Fill the switches, then adjust</span></div>
          <div style={{ width: 320 }}><Select value={start} onChange={v => { setStart(v); setA({ ...STARTS.find(z => z.id === v)!.access }); }} options={STARTS.map(z => ({ value: z.id, label: z.label }))} /></div></div>
        <AccessEditor a={a} set={fn => setA(o => fn(o))} />
      </div>
      <div className="sticky"><SidebarPreview a={a} /></div>
    </div>}
    {step === 2 && <div className="adm-split">
      <div className="col">
        <Card title="Their details" action={<Btn sm kind="ghost" onClick={() => setStep(0)}>Change</Btn>}><Facts items={[['Name', name], ['Email', email], ['Mobile', phone], ['Password', change ? 'Set · changed at first sign-in' : 'Set by you']]} /></Card>
        <Card title="Sidebar access" sub={`${c.on} pages · ${c.edit} can edit`} action={<Btn sm kind="ghost" onClick={() => setStep(1)}>Change</Btn>}>
          <div>{PAGES.map(g => { const on = g.items.filter(i => (a[i.id] ?? 'off') !== 'off'); return on.length ? <div key={g.group} className="hrow" style={{ alignItems: 'flex-start' }}><span className="sec-label" style={{ width: 170, paddingTop: 4 }}>{g.group}</span>
            <div className="flex wrap grow" style={{ gap: 6 }}>{on.map(i => <Chip key={i.id} tone={a[i.id] === 'edit' ? 'brand' : 'neutral'} dot={false}>{i.label} · {a[i.id] === 'edit' ? 'can edit' : 'view only'}</Chip>)}</div></div> : null; })}</div>
        </Card>
      </div>
      <div className="sticky"><Card title="The invite email">
        <div className="emailpv"><div className="eh"><span>From: LSP &lt;{db.company.sender}&gt; · To: {email}</span><b>You're invited to Genesis</b></div>
          <div className="eb">{`Hi ${name.split(' ')[0] || 'there'},\n\nMichael Grant has added you to the Genesis Company Admin portal as a Sub Admin.\n\nSign in here: https://admin.lsp.co.uk\nEmail: ${email}\nPassword: the one Michael gives you${change ? ' (you choose a new one when you first sign in)' : ''}\n\nYou can open ${c.on} page${c.on === 1 ? '' : 's'}.`}</div></div>
      </Card></div>
    </div>}
    <div className="savebar on" role="region" aria-label="Steps">
      <div className="stack grow"><b>Step {step + 1} of 3 · {['Their details', 'Sidebar access', 'Check and invite'][step]}</b><span className="caption">{step === 0 ? (okDetails ? 'Ready for the next step.' : 'Add their name, email, mobile and a strong password.') : step === 1 ? (okAccess ? `${c.on} pages on · ${c.edit} can edit` : 'Switch on at least one page.') : 'Nothing is sent until you press Invite.'}</span></div>
      <Btn kind="outline" onClick={() => step ? setStep(step - 1) : started ? setLeave(true) : s.go('subadmins')}>{step ? 'Back' : 'Cancel'}</Btn>
      {step < 2 ? <Btn disabled={step === 0 ? !okDetails : !okAccess} onClick={() => setStep(step + 1)}>Next</Btn> : <Btn icon={<Send size={16} />} onClick={invite}>Invite Sub Admin</Btn>}
    </div>
    {leave && <Modal title="Leave without inviting?" sub="What you've typed is not saved." onClose={() => setLeave(false)} footer={<><Btn kind="outline" onClick={() => setLeave(false)}>Keep going</Btn><Btn kind="danger" onClick={() => s.go('subadmins')}>Leave</Btn></>} />}
  </>;
}
