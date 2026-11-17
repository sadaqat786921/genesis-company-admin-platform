import { useState } from 'react';
import { UserCog, UserPlus, Unlock, KeyRound, UserX, UserCheck, MailPlus, Users as UsersIc, ShieldCheck } from 'lucide-react';
import { useStore, personName, staffIdOf } from '../store';
import { areaLabel } from './Areas';
import { nowStamp, ME_NAME } from '../data';
import { Card, Chip, Btn, Field, Text, Select, Modal, Empty, Tabs, Facts, Note, Drawer, MiniSearch, Avatar, InfoTip } from '../ui';
import { Head } from '../Shell';
import { useDraft, SaveBar, ReasonModal } from '../admin';
import { roleTone, statusTone } from './lib';
import type { User, Role } from '../seed';

type TabId = 'staff' | 'Landlord' | 'Tenant' | 'Letting agent' | 'Contractor' | 'all';
const STAFF_ROLES: Role[] = ['Company Admin', 'Supervisor', 'Office Admin'];
const isStaff = (u: User) => STAFF_ROLES.includes(u.role) || u.role === 'Sub Admin';
const inTab = (u: User, t: TabId) => t === 'all' || (t === 'staff' ? isStaff(u) : t === 'Tenant' ? ['Tenant', 'Applicant'].includes(u.role) : u.role === t);

/** People › Users: every login across the six portals. Invite staff, disable or enable, reset passwords and unlock accounts. */
export function Users() {
  const s = useStore(); const { db } = s;
  const [tab, setTab] = useState<TabId>('staff'); const [q, setQ] = useState(''); const [st, setSt] = useState('all'); const [ar, setAr] = useState('all'); const [inv, setInv] = useState(false);
  const list = db.users.filter(u => inTab(u, tab) && (st === 'all' || u.status === st) && (ar === 'all' || u.areas.includes(ar)) && (u.name + ' ' + u.email + ' ' + (u.org ?? '')).toLowerCase().includes(q.toLowerCase()));
  const open = s.detail ? db.users.find(u => u.id === s.detail) : null;
  const n = (t: TabId) => db.users.filter(u => inTab(u, t)).length;
  const areaName = (id: string) => db.areas.find(a => a.id === id)?.name ?? id;
  return <>
    <Head r="users" action={<Btn icon={<UserPlus size={16} />} onClick={() => setInv(true)}>Invite a staff member</Btn>} />
    <Card title={<span className="clean-h">Everyone who can sign in<InfoTip>Staff are invited here. Landlords, tenants, letting agents and contractors get their login from the flows in the Supervisor and Office Admin portals; here you can unlock, reset, disable or enable them.</InfoTip></span>}
      action={<Tabs value={tab} onChange={setTab} items={[{ id: 'staff', label: 'Staff', count: n('staff') }, { id: 'Landlord', label: 'Landlords', count: n('Landlord') }, { id: 'Tenant', label: 'Tenants', count: n('Tenant') }, { id: 'Letting agent', label: 'Letting agents', count: n('Letting agent') }, { id: 'Contractor', label: 'Contractors', count: n('Contractor') }, { id: 'all', label: 'All', count: db.users.length }]} />}>
      <div className="toolbar">
        <MiniSearch value={q} onChange={setQ} placeholder="Search name, email or company" />
        <select className="fsel" aria-label="Status" value={st} onChange={e => setSt(e.target.value)}><option value="all">Any status</option>{['Active', 'Invited', 'Locked', 'Disabled'].map(x => <option key={x}>{x}</option>)}</select>
        <select className="fsel" aria-label="Area" value={ar} onChange={e => setAr(e.target.value)}><option value="all">All areas</option>{db.areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        <span className="caption">{list.length} shown</span>
      </div>
      {list.length ? <div className="tablewrap"><table className="t"><thead><tr><th>Name</th><th>Role</th><th>Areas</th><th>Status</th><th>Last signed in</th><th>Security code</th></tr></thead><tbody>
        {list.map(u => <tr key={u.id} onClick={() => s.go('users', u.id)}>
          <td><span className="flex" style={{ gap: 10 }}><Avatar name={u.name} /><span className="stack"><b className="strong">{u.name}</b><span className="caption">{u.email}</span></span></span></td>
          <td><span className="stack"><Chip tone={roleTone(u.role)}>{u.role}</Chip>{(u.sub || u.org) && <span className="caption">{[u.sub, u.org].filter(Boolean).join(' · ')}</span>}</span></td>
          <td className="small">{u.areas.length > 2 ? `${u.areas.length} areas` : u.areas.map(areaName).join(', ') || '—'}</td>
          <td><Chip tone={statusTone(u.status)}>{u.status}</Chip></td><td className="small">{u.last}</td><td className="small">{u.twoStep ? 'On' : 'Not set up'}</td>
        </tr>)}
      </tbody></table></div> : <Empty icon={<UsersIc size={22} />}>No one matches. Clear the search or filters.</Empty>}
    </Card>
    {inv && <Invite onClose={() => setInv(false)} />}
    {open && <UserDrawer u={open} onClose={() => s.go('users')} />}
  </>;
}

function Invite({ onClose }: { onClose: () => void }) {
  const s = useStore(); const { db } = s;
  const staffRoles = db.roles.filter(r => r.kind === 'staff').map(r => r.name);
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [role, setRole] = useState('Office Admin'); const [area, setArea] = useState('');
  const dup = db.users.some(u => u.email.toLowerCase() === email.trim().toLowerCase());
  const base = STAFF_ROLES.includes(role as Role) ? role : 'Office Admin';
  const ar = db.areas.find(a => a.id === area);
  const supTaken = base === 'Supervisor' && ar?.supervisor;
  const ok = name.trim().includes(' ') && /^\S+@\S+\.\S+$/.test(email) && !dup && (base === 'Company Admin' || area) && !supTaken;
  return <Modal title="Invite a staff member" sub="They get an email from Outlook to set a password and their security code." onClose={onClose} footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn icon={<MailPlus size={16} />} disabled={!ok} onClick={() => {
    const u: User = { id: 'U' + Date.now(), name: name.trim(), email: email.trim().toLowerCase(), phone: '', role: base as Role, sub: STAFF_ROLES.includes(role as Role) ? undefined : role, areas: base === 'Company Admin' ? db.areas.map(a => a.id) : [area], status: 'Invited', last: '—', twoStep: false, created: nowStamp(), logins: [] };
    const areas = db.areas.map(a => a.id !== area ? a : base === 'Supervisor' ? { ...a, supervisor: u.id } : { ...a, oas: [...a.oas, u.id] });
    s.commitMany({ users: [u, ...db.users], areas }, [{ page: 'Users', item: u.name, what: base === 'Supervisor' ? 'Created a Supervisor' : 'Invited a staff member', after: `${role}${ar ? ' · ' + areaLabel(ar) : ' · every area'}` }], `Invite sent to ${u.email} from Outlook`); onClose();
  }}>Send invite</Btn></>}>
    <div className="grid g2"><Field label="Full name"><Text value={name} onChange={setName} /></Field><Field label="Work email"><Text value={email} onChange={setEmail} placeholder="name@lsp.co.uk" /></Field></div>
    {dup && <Note tone="err">Someone already uses this email.</Note>}
    <Field label="Role"><Select value={role} onChange={setRole} options={staffRoles.map(r => ({ value: r, label: r }))} /></Field>
    {base === 'Company Admin' ? <Note>A Company Admin sees every area.</Note> : <>
      <Field label={base === 'Supervisor' ? 'Their area (they see only this area)' : 'Area (they join this Supervisor’s team)'}><Select value={area} onChange={setArea} options={[{ value: '', label: 'Choose an area' }, ...[...db.areas].sort((a, b) => a.n - b.n).map(a => ({ value: a.id, label: `${areaLabel(a)}${a.supervisor ? ' · ' + personName(db, a.supervisor) : ' · no Supervisor yet'}` }))]} /></Field>
      {supTaken && <Note tone="err">{areaLabel(ar!)} already has a Supervisor ({personName(db, ar!.supervisor)}). Each area has one. Use holiday cover for absences, or change the Supervisor on the area page.</Note>}
    </>}
  </Modal>;
}

function UserDrawer({ u, onClose }: { u: User; onClose: () => void }) {
  const s = useStore(); const { db } = s;
  const [act, setAct] = useState<'' | 'disable' | 'enable' | 'unlock' | 'reset' | 'resend'>('');
  const staff = (STAFF_ROLES.includes(u.role)) || !!u.sub && !['Admin', 'Property manager', 'Accounts', 'Rent sharer'].includes(u.sub);
    const sid = staffIdOf(u); const curArea = db.areas.find(a => a.supervisor === sid || a.oas.includes(sid))?.id ?? '';
  const x = useDraft({ role: u.sub && staff ? u.sub : u.role as string, area: curArea });
  const base = STAFF_ROLES.includes(x.d.role as Role) ? x.d.role : 'Office Admin';
  const newArea = db.areas.find(a => a.id === x.d.area);
  const supTaken = base === 'Supervisor' && newArea && newArea.supervisor && newArea.supervisor !== sid;
  const me = u.name === ME_NAME;
  const set = (patch: Partial<User>, what: string, before: string, after: string, msg: string, reason?: string) => { s.commit('users', db.users.map(y => y.id === u.id ? { ...y, ...patch } : y), { page: 'Users', item: u.name, what, before, after, reason }, msg); setAct(''); };
  const staffRoles = db.roles.filter(r => r.kind === 'staff').map(r => r.name);
  return <Drawer title={u.name} sub={`${u.role}${u.sub ? ' · ' + u.sub : ''}${u.org ? ' · ' + u.org : ''}`} icon={<Avatar name={u.name} size="md" />} onClose={onClose}
    footer={staff && !me ? <SaveBar dirty={x.dirty} onUndo={x.undo} important="Role and area changes change which homes this person can see and do." blocked={base !== 'Company Admin' && !x.d.area ? 'Choose their area.' : supTaken ? `${areaLabel(newArea!)} already has a Supervisor.` : ''}
      onSave={reason => { const custom = !STAFF_ROLES.includes(x.d.role as Role); const ids = base === 'Company Admin' ? db.areas.map(a => a.id) : [x.d.area];
        const areas = db.areas.map(a => { const clean = { ...a, supervisor: a.supervisor === sid ? '' : a.supervisor, oas: a.oas.filter(o => o !== sid) }; return a.id !== x.d.area || base === 'Company Admin' ? clean : base === 'Supervisor' ? { ...clean, supervisor: sid } : { ...clean, oas: [...clean.oas, sid] }; });
        s.commitMany({ users: db.users.map(y => y.id === u.id ? { ...y, role: (custom ? 'Office Admin' : x.d.role) as Role, sub: custom ? x.d.role : undefined, areas: ids } : y), areas }, [{ page: 'Users', item: u.name, what: 'Changed role or area', before: `${u.sub ?? u.role} · ${curArea ? areaLabel(db.areas.find(a => a.id === curArea)!) : 'no area'}`, after: `${x.d.role} · ${newArea ? areaLabel(newArea) : 'every area'}`, reason }]); }} /> : undefined}>
    <div className="flex wrap"><Chip tone={statusTone(u.status)}>{u.status}</Chip>{u.twoStep ? <Chip tone="ok">Security code on</Chip> : <Chip>Security code not set up</Chip>}</div>
    {u.status === 'Locked' && <div className="alertbar a-err"><b className="grow">Locked after 5 wrong security codes.</b><Btn sm icon={<Unlock size={14} />} onClick={() => setAct('unlock')}>Unlock</Btn></div>}
    {u.status === 'Invited' && <div className="alertbar a-info"><b className="grow">Hasn't set a password yet.</b><Btn sm kind="outline" icon={<MailPlus size={14} />} onClick={() => setAct('resend')}>Resend invite</Btn></div>}
    <Facts items={[['Email', u.email], ['Phone', u.phone || '—'], ['Added', u.created], ['Last signed in', u.last]]} />
    {u.role === 'Sub Admin' && <div className="alertbar a-info"><UserCog size={16} /><b className="grow">Sub Admin · their pages are chosen on the Sub Admins page.</b><Btn sm kind="outline" onClick={() => s.go('subadmins', u.id)}>Manage access</Btn></div>}
    {staff && !me ? <Card title="Role and area" className="flat">
      <Field label="Role"><Select value={x.d.role} onChange={v => x.patch({ role: v })} options={staffRoles.map(r => ({ value: r, label: r }))} /></Field>
      {base === 'Company Admin' ? <Note>A Company Admin sees every area.</Note> : <Field label={base === 'Supervisor' ? 'Their area (they see only this area)' : 'Area (they work in this Supervisor’s team)'}><Select value={x.d.area} onChange={v => x.patch({ area: v })} options={[{ value: '', label: 'Choose an area' }, ...[...db.areas].sort((a, b) => a.n - b.n).map(a => ({ value: a.id, label: `${areaLabel(a)}${a.supervisor && a.supervisor !== sid ? ' · ' + personName(db, a.supervisor) : ''}` }))]} /></Field>}
      {supTaken && <Note tone="err">{areaLabel(newArea!)} already has a Supervisor ({personName(db, newArea!.supervisor)}). Change it on the area page first.</Note>}
      {curArea && x.d.area !== curArea && base !== 'Company Admin' && <Note tone="warn">They leave {areaLabel(db.areas.find(a => a.id === curArea)!)}. {base === 'Supervisor' ? 'That area needs a new Supervisor.' : 'Move their landlords in Teams & cover.'}</Note>}
      <Btn sm kind="ghost" icon={<ShieldCheck size={14} />} onClick={() => s.go('roles')}>See what this role can do</Btn>
    </Card> : u.role === 'Sub Admin' ? null : <Note>{me ? "This is you. Another Company Admin can change your role." : `${u.role} logins are created by the flows in the staff portals. You can unlock, reset, disable or enable this login.`}</Note>}
    <div className="col" style={{ gap: 8 }}>
      <b className="h2" style={{ fontSize: 13 }}>Login</b>
      <div className="flex wrap">
        {u.status === 'Active' && <Btn sm kind="outline" icon={<KeyRound size={14} />} onClick={() => setAct('reset')}>Send a password reset</Btn>}
        {u.status !== 'Disabled' && !me && <Btn sm kind="outline" icon={<UserX size={14} />} onClick={() => setAct('disable')}>Disable login</Btn>}
        {u.status === 'Disabled' && <Btn sm icon={<UserCheck size={14} />} onClick={() => setAct('enable')}>Enable login</Btn>}
      </div>
    </div>
    <div className="col" style={{ gap: 6 }}><b className="h2" style={{ fontSize: 13 }}>Recent sign-ins</b>
      {u.logins.length ? u.logins.slice(0, 5).map((l, i) => <div key={i} className="lrow"><div className="stack grow"><b className="small" style={{ color: 'var(--text-primary)' }}>{l}</b><span className="caption">Security code checked</span></div></div>) : <Empty>Never signed in.</Empty>}
    </div>
    {act === 'disable' && <ReasonModal danger title={`Disable ${u.name}'s login?`} sub={isStaff(u) ? 'They can’t sign in. Their work stays and can be given to someone else in Teams & areas.' : 'They can’t sign in. Their homes, jobs and records stay as they are.'} cta="Disable login" onClose={() => setAct('')} onDone={r => set({ status: 'Disabled' }, 'Disabled a user', u.status, 'Disabled', `${u.name} can't sign in now`, r)} />}
    {act === 'enable' && <ReasonModal title={`Enable ${u.name}'s login?`} sub="They can sign in again with their password and security code." cta="Enable login" onClose={() => setAct('')} onDone={r => set({ status: 'Active' }, 'Enabled a user', 'Disabled', 'Active', `${u.name} can sign in again`, r)} />}
    {act === 'unlock' && <ReasonModal title={`Unlock ${u.name}?`} sub="Check it is really them first, for example by calling the number we hold." cta="Unlock" onClose={() => setAct('')} onDone={r => set({ status: 'Active' }, 'Unlocked a user', 'Locked', 'Active', `${u.name} is unlocked`, r)} />}
    {act === 'reset' && <Modal title="Send a password reset?" sub={`An email goes to ${u.email} with a link to set a new password. The old password stops working.`} onClose={() => setAct('')} footer={<><Btn kind="outline" onClick={() => setAct('')}>Cancel</Btn><Btn icon={<KeyRound size={16} />} onClick={() => set({}, 'Sent a password reset', '—', 'Reset email sent', `Reset email sent to ${u.email}`)}>Send reset email</Btn></>} />}
    {act === 'resend' && <Modal title="Resend the invite?" sub={`A new link goes to ${u.email}. The old link stops working.`} onClose={() => setAct('')} footer={<><Btn kind="outline" onClick={() => setAct('')}>Cancel</Btn><Btn icon={<MailPlus size={16} />} onClick={() => set({ created: nowStamp() }, 'Resent an invite', u.created, nowStamp(), `Invite sent again to ${u.email}`)}>Resend</Btn></>} />}
  </Drawer>;
}
