import { useState } from 'react';
import { UserPlus, Eye, Lock, MailPlus, UserX, UserCheck, Trash2, UserCog, Check } from 'lucide-react';
import { useStore, LOCKED_FOR_SUB, type Route } from '../store';
import { nowStamp } from '../data';
import { Card, Chip, Btn, Field, Text, Select, Modal, Empty, Facts, Avatar, MoreMenu, Note, InfoTip } from '../ui';
import { Head, NAV, LABEL } from '../Shell';
import { useDraft, SaveBar, ReasonModal, DeleteModal } from '../admin';
import { statusTone } from './lib';
import type { User, Access3 } from '../seed';

/* People › Sub Admins. The main Admin adds as many Sub Admins as needed and chooses, page by page,
   which sidebar sections each one can open: Off, View only or Can edit.
   A Sub Admin can never open this page, so they can never give themselves more access.
   The Overview is always on (view only). The Audit history is never editable by anyone. */

const PAGES = NAV.filter(g => g.group !== 'Overview').map(g => ({ group: g.group, items: g.items.filter(i => i.id !== 'subadmins') }));
const ALL = PAGES.flatMap(g => g.items.map(i => i.id));
const maxOf = (r: Route): Access3 => LOCKED_FOR_SUB[r] ? 'off' : r === 'audit' ? 'view' : 'edit';
const LEVELS: { id: Access3; label: string }[] = [{ id: 'off', label: 'Off' }, { id: 'view', label: 'View only' }, { id: 'edit', label: 'Can edit' }];
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
  if (s.detail) return <SubAdminPage id={s.detail} />;
  return <SubAdminList />;
}

function SubAdminList() {
  const s = useStore(); const { db } = s; const [add, setAdd] = useState(false);
  const list = db.users.filter(u => u.role === 'Sub Admin');
  return <>
    <Head r="subadmins" action={<Btn icon={<UserPlus size={16} />} onClick={() => setAdd(true)}>Add a Sub Admin</Btn>} />
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
    {add && <AddSub onClose={() => setAdd(false)} />}
  </>;
}

function AddSub({ onClose }: { onClose: () => void }) {
  const s = useStore(); const { db } = s;
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [start, setStart] = useState('blank');
  const dup = db.users.some(u => u.email.toLowerCase() === email.trim().toLowerCase());
  const ok = name.trim().includes(' ') && /^\S+@\S+\.\S+$/.test(email) && !dup;
  return <Modal title="Add a Sub Admin" sub="They get an email from Outlook to set a password and their security code. You choose their pages next." onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn icon={<MailPlus size={16} />} disabled={!ok} onClick={() => {
      const access = { ...STARTS.find(x => x.id === start)!.access };
      const u: User = { id: 'U' + Date.now(), name: name.trim(), email: email.trim().toLowerCase(), phone: '', role: 'Sub Admin', areas: db.areas.map(a => a.id), status: 'Invited', last: '—', twoStep: false, created: nowStamp(), logins: [], access };
      s.commit('users', [u, ...db.users], { page: 'Sub Admins', item: u.name, what: 'Added a Sub Admin', after: summary(access) }, `Invite sent to ${u.email}`); onClose(); s.go('subadmins', u.id);
    }}>Send invite</Btn></>}>
    <div className="grid g2"><Field label="Full name"><Text value={name} onChange={setName} /></Field><Field label="Work email"><Text value={email} onChange={setEmail} placeholder="name@lsp.co.uk" /></Field></div>
    {dup && <Note tone="err">Someone already uses this email.</Note>}
    <Field label="Start with"><Select value={start} onChange={setStart} options={STARTS.map(x => ({ value: x.id, label: x.label }))} /></Field>
  </Modal>;
}

function SubAdminPage({ id }: { id: string }) {
  const s = useStore(); const { db } = s; const u = db.users.find(x => x.id === id && x.role === 'Sub Admin');
  const x = useDraft<Record<string, Access3>>(u?.access ?? {}); const [act, setAct] = useState<'' | 'disable' | 'enable' | 'remove'>('');
  if (!u) return <><Head r="subadmins" extra="Not found" back /><Empty>This Sub Admin was removed.</Empty></>;
  const a = x.d; const lv = (r: Route): Access3 => a[r] ?? 'off';
  const set = (r: Route, v: Access3) => x.set(o => { const n = { ...o }; if (v === 'off') delete n[r]; else n[r] = v; return n; });
  const setGroup = (items: Route[], v: Access3) => x.set(o => { const n = { ...o }; items.forEach(r => { const m = maxOf(r); const val = v === 'edit' && m === 'view' ? 'view' : m === 'off' ? 'off' : v; if (val === 'off') delete n[r]; else n[r] = val; }); return n; });
  const c = count(a);
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
      <Card title={<span className="clean-h">Which pages they can open<InfoTip>Off: the page is not in their sidebar. View only: they can open it but not save anything. Can edit: they can change it like you, and every change is saved with their name.</InfoTip></span>} sub={`${c.on} pages · ${c.edit} can edit`}>
        <div className="tablewrap"><table className="t"><thead><tr><th>Sidebar page</th><th style={{ width: 300 }}>Access</th></tr></thead>
          <tbody className="grp"><tr className="static"><td><span className="flex"><b className="strong">Overview</b></span></td><td><Chip tone="info">Always on · view only</Chip></td></tr></tbody>
          {PAGES.map(g => { const items = g.items.map(i => i.id); const all = (v: Access3) => items.every(r => lv(r) === (v === 'edit' && maxOf(r) === 'view' ? 'view' : maxOf(r) === 'off' ? 'off' : v));
            return <tbody key={g.group} className="grp"><tr className="grp-h static"><td><span className="sec-label">{g.group}</span></td>
              <td><div className="seg sm" role="group" aria-label={`${g.group}: all pages`}>{LEVELS.map(l => <button key={l.id} type="button" className={all(l.id) ? 'on' : ''} onClick={() => setGroup(items, l.id)}>{l.id === 'off' ? 'All off' : l.id === 'view' ? 'All view' : 'All edit'}</button>)}</div></td></tr>
              {g.items.map(i => { const Ic = i.icon; const m = maxOf(i.id); return <tr key={i.id} className="static"><td><span className="flex" style={{ gap: 10 }}><Ic size={17} strokeWidth={1.8} color="var(--text-tertiary)" /><span className="strong" style={{ fontWeight: 600 }}>{i.label}</span>{m === 'view' && <span className="caption">read only for everyone</span>}</span></td>
                <td><div className="seg sm" role="group" aria-label={`${i.label} access`}>{LEVELS.map(l => <button key={l.id} type="button" disabled={l.id === 'edit' && m !== 'edit'} className={lv(i.id) === l.id ? 'on' : ''} onClick={() => set(i.id, l.id)}>{l.label}</button>)}</div></td></tr>; })}
            </tbody>; })}
          <tbody className="grp"><tr className="static"><td><span className="flex"><Lock size={15} color="var(--text-tertiary)" /><b className="strong">Sub Admins</b></span></td><td><span className="lockchip"><Lock size={11} />Never · only the main Admin</span></td></tr></tbody>
        </table></div>
      </Card>
      <div className="sticky">
        <Card title="Their sidebar" sub="What they see when they sign in">
          <div className="sbprev">
            <div className="sbp-i on"><span>Overview</span></div>
            {PAGES.map(g => { const items = g.items.filter(i => lv(i.id) !== 'off'); return items.length ? <div key={g.group} className="col" style={{ gap: 2 }}><span className="sec-label" style={{ fontSize: 9.5, padding: '6px 8px 2px' }}>{g.group}</span>
              {items.map(i => { const Ic = i.icon; return <div key={i.id} className="sbp-i"><Ic size={15} strokeWidth={1.8} /><span className="grow">{i.label}</span>{lv(i.id) === 'view' && <em>View</em>}</div>; })}</div> : null; })}
            {!c.on && <span className="caption" style={{ padding: 8 }}>Only the Overview. Choose some pages.</span>}
          </div>
        </Card>
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
