import { useState } from 'react';
import { Plus, Trash2, ShieldCheck, Lock, ArrowRightLeft, MapPinned, Check, X, CalendarDays } from 'lucide-react';
import { useStore, personName } from '../store';
import { Card, Chip, Btn, Field, Text, Select, Modal, Tabs, Note, Avatar, Bar, InfoTip, Empty } from '../ui';
import { Head } from '../Shell';
import { useDraft, SaveBar, Toggle, Locked, DeleteModal, ReasonModal } from '../admin';
import { PERMS, AGENT_PERMS, PORTAL_ROLES, type RoleDef, type Perm } from '../seed';
import { AREA_TONE, areaLabel } from './Areas';
import { statusTone } from './lib';
import { daysFrom, parseDate, nowStamp, fromInput, ME_NAME } from '../data';
import type { Cover } from '../seed';

/** People › Roles & permissions: a ticked list per role. Rules from the client's flow chart are locked. */
export function Roles() {
  const s = useStore(); const { db } = s;
  const [tab, setTab] = useState<'staff' | 'agent' | 'portal'>('staff'); const [add, setAdd] = useState(false); const [del, setDel] = useState<RoleDef | null>(null);
  const x = useDraft(db.roles);
  const roles = x.d.filter(r => r.kind === tab);
  const perms = tab === 'agent' ? AGENT_PERMS : PERMS;
  const groups = [...new Set(perms.map(p => p.group))];
  const users = (r: RoleDef) => db.users.filter(u => r.kind === 'agent' ? u.role === 'Letting agent' && u.sub === r.name : (u.sub ?? u.role) === r.name).length;
  const lockOf = (r: RoleDef, p: Perm): string | undefined => r.locked ? 'The Company Admin can always do everything.' : p.core ? `${p.core}. Set by the client's flow chart.` : undefined;
  const coreValue = (r: RoleDef, p: Perm) => ['set.all', 'set.areas', 'homes.all'].includes(p.id) ? r.name === 'Company Admin' : p.id === 'homes.area' ? r.name === 'Supervisor' : r.name === 'Supervisor' || r.name === 'Company Admin';
  const flip = (r: RoleDef, p: string, on: boolean) => x.set(rs => rs.map(z => z.id === r.id ? { ...z, perms: on ? [...z.perms, p] : z.perms.filter(q => q !== p) } : z));
  const diffs = () => x.d.flatMap(r => { const o = db.roles.find(z => z.id === r.id); if (!o) return []; const added = r.perms.filter(p => !o.perms.includes(p)); const removed = o.perms.filter(p => !r.perms.includes(p)); const lab = (id: string) => [...PERMS, ...AGENT_PERMS].find(p => p.id === id)?.label ?? id; return [...added.map(p => `${r.name} can: ${lab(p)}`), ...removed.map(p => `${r.name} can't: ${lab(p)}`)]; });
  return <>
    <Head r="roles" action={tab !== 'portal' ? <Btn icon={<Plus size={16} />} onClick={() => setAdd(true)}>Add a {tab === 'agent' ? 'team role' : 'staff role'}</Btn> : undefined} />
    <Card title={<span className="clean-h">Who can do what<InfoTip>Changes reach every portal the next time people open a page. Rules from the client's flow chart are locked so the process can't break.</InfoTip></span>}
      action={<Tabs value={tab} onChange={setTab} items={[{ id: 'staff', label: 'LSP staff' }, { id: 'agent', label: 'Letting agent team' }, { id: 'portal', label: 'Other portals' }]} />}>
      {tab !== 'portal' ? <>
        {tab === 'staff' && <div className="alertbar a-info"><ShieldCheck size={16} /><b className="grow">Sub Admins don't use this list. You choose their pages one by one on the Sub Admins page.</b><Btn sm kind="outline" onClick={() => s.go('subadmins')}>Sub Admins</Btn></div>}
        <div className="grid g3">{roles.map(r => <div key={r.id} className="lrow" style={{ alignItems: 'flex-start' }}><span className="tile t-brand" style={{ width: 34, height: 34 }}><ShieldCheck size={16} /></span><div className="stack grow"><b>{r.name}{r.locked && <Lock size={12} style={{ marginLeft: 6 }} />}</b><span className="caption">{r.desc}</span><span className="caption">{users(r)} {users(r) === 1 ? 'person' : 'people'} · {r.perms.length} of {perms.length} allowed</span></div>{r.custom && <Btn sm kind="ghost" icon={<Trash2 size={14} />} title="Delete role" onClick={() => setDel(r)} />}</div>)}</div>
        <div className="tablewrap"><table className="t"><thead><tr><th>Permission</th>{roles.map(r => <th key={r.id} style={{ textAlign: 'center' }}>{r.name}</th>)}</tr></thead>
          {groups.map(g => <tbody key={g} className="grp"><tr className="grp-h static"><td colSpan={roles.length + 1}><span className="sec-label">{g}</span></td></tr>
            {perms.filter(p => p.group === g).map(p => <tr key={p.id} className="static"><td><span className="flex"><span className="strong" style={{ fontWeight: 600 }}>{p.label}</span>{p.core && <Locked why={`${p.core}. Set by the client's flow chart.`}>Flow chart</Locked>}</span></td>
              {roles.map(r => { const lk = lockOf(r, p); const on = lk ? (r.locked ? true : coreValue(r, p)) : r.perms.includes(p.id); return <td key={r.id} style={{ textAlign: 'center' }}>{lk ? <span title={lk} className={`chip ${on ? 'ok' : 'neutral'} nodot`} style={{ gap: 4 }}><Lock size={11} />{on ? 'Yes' : 'No'}</span> : <Toggle on={on} label={`${r.name}: ${p.label}`} onChange={v => flip(r, p.id, v)} />}</td>; })}
            </tr>)}</tbody>)}
        </table></div>
      </> : <div className="grid g2">{PORTAL_ROLES.map(r => <div key={r.name} className="lrow" style={{ alignItems: 'flex-start', padding: 16 }}><div className="stack grow" style={{ gap: 8 }}><div className="flex between"><b className="h2">{r.name}</b><Locked why="One person per account, so there is nothing to split. What they can do is set by the portal's design.">Set by the portal</Locked></div>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }} className="small">{r.can.map(c => <li key={c}>{c}</li>)}</ul></div></div>)}</div>}
    </Card>
    {tab !== 'portal' && <SaveBar dirty={x.dirty} onUndo={x.undo} important="Permission changes change what people can see and do, so the reason is saved."
      note={x.dirty ? `${diffs().length} change${diffs().length === 1 ? '' : 's'}: ${diffs().slice(0, 2).join('; ')}${diffs().length > 2 ? '…' : ''}` : 'Changes reach every portal the next time people open a page.'}
      onSave={reason => { const ch = diffs(); s.commit('roles', x.d, { page: 'Roles & permissions', item: [...new Set(ch.map(c => c.split(' can')[0]))].join(', ') || 'Roles', what: `Changed ${ch.length} permission${ch.length === 1 ? '' : 's'}`, before: '—', after: ch.join(' · '), reason }); }} />}
    {add && <AddRole kind={tab === 'agent' ? 'agent' : 'staff'} roles={x.d} onClose={() => setAdd(false)} />}
    {del && (users(del) ? <Modal title="This role is in use" sub={`${users(del)} people have it. Give them another role in Users first.`} onClose={() => setDel(null)} footer={<Btn onClick={() => setDel(null)}>OK</Btn>} />
      : <DeleteModal what={`the ${del.name} role`} onClose={() => setDel(null)} onDone={reason => { s.commit('roles', db.roles.filter(r => r.id !== del.id), { page: 'Roles & permissions', item: del.name, what: 'Deleted a role', before: `${del.perms.length} permissions`, reason }, 'Role deleted'); setDel(null); }} />)}
  </>;
}
function AddRole({ kind, roles, onClose }: { kind: 'staff' | 'agent'; roles: RoleDef[]; onClose: () => void }) {
  const s = useStore(); const { db } = s;
  const base = roles.filter(r => r.kind === kind && !r.locked);
  const [name, setName] = useState(''); const [desc, setDesc] = useState(''); const [from, setFrom] = useState(base[base.length - 1]?.id ?? '');
  const dup = db.roles.some(r => r.kind === kind && r.name.toLowerCase() === name.trim().toLowerCase());
  return <Modal title={kind === 'agent' ? 'Add a team role' : 'Add a staff role'} sub="Start from a copy of another role, then change the ticks." onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn icon={<Plus size={16} />} disabled={!name.trim() || dup} onClick={() => {
      const src = db.roles.find(r => r.id === from); const r: RoleDef = { id: 'R-' + Date.now(), name: name.trim(), kind, desc: desc.trim() || `Copy of ${src?.name}`, perms: [...(src?.perms ?? []).filter(p => !PERMS.find(q => q.id === p)?.core)], custom: true };
      s.commit('roles', [...db.roles, r], { page: 'Roles & permissions', item: r.name, what: 'Added a role', after: `Copied from ${src?.name} · ${r.perms.length} permissions` }, `${r.name} added`); onClose();
    }}>Add role</Btn></>}>
    <Field label="Role name"><Text value={name} onChange={setName} placeholder={kind === 'agent' ? 'e.g. Viewer' : 'e.g. Accounts'} /></Field>
    {dup && <Note tone="err">There is already a role with this name.</Note>}
    <Field label="What it is for (optional)"><Text value={desc} onChange={setDesc} /></Field>
    <Field label="Start from a copy of"><Select value={from} onChange={setFrom} options={base.map(r => ({ value: r.id, label: r.name }))} /></Field>
    <Note>Locked flow-chart permissions are never copied to a new role.</Note>
  </Modal>;
}

/** People › Teams & cover: each area's Supervisor and their own Office Admins, their workload, who looks after which landlord,
    and holiday cover (another Supervisor covers an area for set dates with their own login; it ends by itself). */
export function Teams() {
  const [tab, setTab] = useState<'teams' | 'cover'>('teams');
  return <>
    <Head r="teams" action={<Tabs value={tab} onChange={setTab} items={[{ id: 'teams', label: 'Area teams' }, { id: 'cover', label: 'Holiday cover' }]} />} />
    {tab === 'teams' ? <AreaTeams /> : <HolidayCover />}
  </>;
}

function AreaTeams() {
  const s = useStore(); const { db } = s;
  const x = useDraft(db.landlords); const [move, setMove] = useState<string | null>(null);
  const work = (id: string) => { const l = x.d.filter(r => r.admin === id); return { landlords: l.length, homes: l.reduce((a, r) => a + r.homes, 0), tasks: l.reduce((a, r) => a + r.tasks, 0) }; };
  const moved = x.d.filter(r => db.landlords.find(o => o.id === r.id)?.admin !== r.admin);
  const areas = [...db.areas].sort((a, b) => a.n - b.n).filter(a => a.supervisor || a.oas.length);
  return <>
    {areas.map(a => { const max = Math.max(1, ...a.oas.map(o => work(o).homes)); const rows = x.d.filter(r => r.area === a.id); const tone = AREA_TONE[a.n] ?? 'brand';
      return <Card key={a.id} title={<span className="flex" style={{ gap: 10 }}><span className={`tile t-${tone}`} style={{ width: 28, height: 28, fontWeight: 800, fontSize: 12 }}>{a.n}</span>{a.name}<Chip tone={statusTone(a.status)}>{a.status === 'Planned' ? `Opens ${a.opens}` : a.status}</Chip></span>}
        action={<div className="flex">{a.oas.length > 1 && <Btn sm kind="outline" icon={<ArrowRightLeft size={14} />} onClick={() => setMove(a.id)}>Move work in this team</Btn>}<Btn sm kind="ghost" icon={<MapPinned size={14} />} onClick={() => s.go('areas', a.id)}>Area</Btn></div>}>
        <div className="teamtree">
          <div className="tt-sup">{a.supervisor ? <Avatar id={a.supervisor} name={personName(db, a.supervisor)} size="md" /> : <span className="tile t-neutral"><ShieldCheck size={16} /></span>}
            <div className="stack grow"><b>{a.supervisor ? personName(db, a.supervisor) : 'No Supervisor yet'}</b><span className="caption">Supervisor · responsible for the area</span></div>
            {db.covers.filter(c => c.area === a.id && coverState(c) !== 'Ended').map(c => <Chip key={c.id} tone={coverState(c) === 'Active' ? 'ok' : 'info'}>{coverState(c) === 'Active' ? 'Covered now' : 'Cover booked'} · {c.from.slice(0, -5)}–{c.to.slice(0, -5)}</Chip>)}</div>
          <div className="tt-oas">{a.oas.length ? a.oas.map(o => { const w = work(o); return <div key={o} className="lrow"><Avatar id={o} name={personName(db, o)} /><div className="stack grow"><b className="small" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{personName(db, o)}</b><span className="caption">Office Admin · {w.landlords} landlords and clients · {w.homes} homes · {w.tasks} open tasks</span></div><div style={{ width: 120 }}><Bar value={w.homes / max * 100} tone={w.homes / max > .85 && a.oas.length > 1 ? 'warn' : 'brand'} /></div></div>; })
            : <Empty>No Office Admins yet. Add them on the area page.</Empty>}</div>
        </div>
        {rows.length > 0 && <div className="tablewrap"><table className="t"><thead><tr><th>Landlord or client</th><th>Homes</th><th>Open tasks</th><th>Office Admin</th></tr></thead><tbody>
          {rows.map(r => <tr key={r.id} className="static"><td><span className="flex"><b className="strong">{r.name}</b>{moved.includes(r) && <Chip tone="warn">Moving</Chip>}</span></td><td>{r.homes}</td><td>{r.tasks}</td>
            <td style={{ width: 230 }}><Select value={r.admin} onChange={v => x.set(l => l.map(z => z.id === r.id ? { ...z, admin: v } : z))} options={a.oas.map(o => ({ value: o, label: personName(db, o) }))} /></td></tr>)}
        </tbody></table></div>}
      </Card>; })}
    <Note>Office Admins work in one area each. To move someone to another area, change the team on the area page.</Note>
    <SaveBar dirty={x.dirty} onUndo={x.undo} important="Moving landlords changes who they deal with. They are told by email who their new Office Admin is."
      note={moved.length ? `${moved.length} moving: ${moved.slice(0, 3).map(r => `${r.name} → ${personName(db, r.admin)}`).join(', ')}` : undefined}
      onSave={reason => s.commit('landlords', x.d, { page: 'Teams & cover', item: moved.map(r => r.name).join(', '), what: `Moved ${moved.length} landlord${moved.length === 1 ? '' : 's'} or client${moved.length === 1 ? '' : 's'}`, before: moved.map(r => `${r.name}: ${personName(db, db.landlords.find(o => o.id === r.id)!.admin)}`).join(' · '), after: moved.map(r => `${r.name}: ${personName(db, r.admin)}`).join(' · '), reason }, `${moved.length} moved. They are told by email.`)} />
    {move && <MoveAll oas={db.areas.find(a => a.id === move)!.oas.map(o => ({ value: o, label: personName(db, o) }))} onClose={() => setMove(null)} onMove={(from, to) => { x.set(l => l.map(z => z.admin === from && z.area === move ? { ...z, admin: to } : z)); setMove(null); s.toast('Moved in the list. Check it, then save.'); }} count={id => x.d.filter(r => r.admin === id && r.area === move).length} />}
  </>;
}
function MoveAll({ oas, onClose, onMove, count }: { oas: { value: string; label: string }[]; onClose: () => void; onMove: (from: string, to: string) => void; count: (id: string) => number }) {
  const first = oas.find(o => count(o.value) > 0)?.value ?? ''; const [from, setFrom] = useState(first); const [to, setTo] = useState(oas.find(o => o.value !== first)?.value ?? '');
  return <Modal title="Move work in this team" sub="For a leaver or a new starter in the same area. You check the list and save afterwards." onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn icon={<ArrowRightLeft size={16} />} disabled={!from || !to || from === to || !count(from)} onClick={() => onMove(from, to)}>Move {count(from)}</Btn></>}>
    <div className="grid g2"><Field label="From"><Select value={from} onChange={setFrom} options={oas.map(o => ({ ...o, label: `${o.label} (${count(o.value)})` }))} /></Field><Field label="To"><Select value={to} onChange={setTo} options={oas.filter(o => o.value !== from)} /></Field></div>
    <Note>Their homes, tenants, jobs and open tasks move with them.</Note>
  </Modal>;
}

/** Scheduled, Active (today is inside the dates) or Ended. */
export const coverState = (c: Cover): 'Scheduled' | 'Active' | 'Ended' => c.ended || daysFrom(c.to) < 0 ? 'Ended' : daysFrom(c.from) <= 0 ? 'Active' : 'Scheduled';

function HolidayCover() {
  const s = useStore(); const { db } = s; const [add, setAdd] = useState(false); const [end, setEnd] = useState<Cover | null>(null);
  const list = [...db.covers].sort((a, b) => parseDate(b.from).getTime() - parseDate(a.from).getTime());
  return <>
    <div className="grid g2">
      <div className="alertbar a-err"><X size={16} /><b className="grow">Logging in as the other person<span className="caption" style={{ fontWeight: 500, marginLeft: 6 }}>wrong name on actions, shared password, never ends</span></b></div>
      <div className="alertbar a-ok"><Check size={16} /><b className="grow">Cover access<span className="caption" style={{ fontWeight: 500, marginLeft: 6 }}>own login, “covering for” on every action, ends by itself</span></b></div>
    </div>
    <Card title={<span className="clean-h">Holiday cover<InfoTip>Another Supervisor gets the area for set dates with their own login and security code. Every action is saved as “covering for”. The area's Office Admins send requests to the cover. It ends by itself on the last day at 23:59.</InfoTip></span>} action={<Btn icon={<Plus size={16} />} onClick={() => setAdd(true)}>Set holiday cover</Btn>}>
      {list.length ? <div className="tablewrap"><table className="t"><thead><tr><th>Area</th><th>Away</th><th>Covered by</th><th>Dates</th><th>Cover can</th><th>Status</th><th /></tr></thead><tbody>
        {list.map(c => { const a = db.areas.find(z => z.id === c.area); const st = coverState(c); return <tr key={c.id} className="static">
          <td className="strong">{a ? areaLabel(a) : '—'}</td>
          <td><span className="flex"><Avatar id={c.absent} name={personName(db, c.absent)} />{personName(db, c.absent)}</span></td>
          <td><span className="flex"><Avatar id={c.cover} name={personName(db, c.cover)} />{personName(db, c.cover)}</span></td>
          <td className="small"><span className="stack"><b style={{ color: 'var(--text-primary)' }}>{c.from} to {c.to}</b><span className="caption">Ends {c.ended ? 'early · ' + c.ended : 'by itself at 23:59'}</span></span></td>
          <td className="small">{c.canDecide ? 'Everything the Supervisor could' : 'Day-to-day only'}{c.absentReadOnly ? ' · person away: read only' : ''}</td>
          <td><Chip tone={st === 'Active' ? 'ok' : st === 'Scheduled' ? 'info' : 'neutral'}>{st}</Chip></td>
          <td>{st !== 'Ended' && <Btn sm kind="outline" onClick={() => setEnd(c)}>{st === 'Active' ? 'End now' : 'Cancel'}</Btn>}</td></tr>; })}
      </tbody></table></div> : <Empty icon={<CalendarDays size={22} />}>No holiday cover set.</Empty>}
    </Card>
    {add && <AddCover onClose={() => setAdd(false)} />}
    {end && <ReasonModal danger title={coverState(end) === 'Active' ? 'End this cover now?' : 'Cancel this cover?'} sub={`${personName(db, end.cover)} stops seeing ${areaLabel(db.areas.find(z => z.id === end.area)!)} straight away. The history is kept.`} cta={coverState(end) === 'Active' ? 'End now' : 'Cancel cover'} onClose={() => setEnd(null)}
      onDone={reason => { s.commit('covers', db.covers.map(c => c.id === end.id ? { ...c, ended: nowStamp() } : c), { page: 'Teams & cover', item: areaLabel(db.areas.find(z => z.id === end.area)!), what: coverState(end) === 'Active' ? 'Ended holiday cover early' : 'Cancelled holiday cover', before: `${personName(db, end.cover)} covers ${end.from} to ${end.to}`, after: 'Ended', reason }, 'Cover ended'); setEnd(null); }} />}
  </>;
}
function AddCover({ onClose }: { onClose: () => void }) {
  const s = useStore(); const { db } = s;
  const withSup = db.areas.filter(a => a.supervisor);
  const [area, setArea] = useState(withSup[0]?.id ?? ''); const a = db.areas.find(z => z.id === area);
  const others = db.areas.filter(z => z.supervisor && z.id !== area).map(z => ({ value: z.supervisor, label: `${personName(db, z.supervisor)} (${areaLabel(z)})` }));
  const [cover, setCover] = useState(others[0]?.value ?? ''); const [from, setFrom] = useState('2026-12-21'); const [to, setTo] = useState('2026-12-31');
  const [canDecide, setCanDecide] = useState(true); const [ro, setRo] = useState(true); const [reason, setReason] = useState('');
  const f = new Date(from + 'T00:00'); const t = new Date(to + 'T00:00'); const days = Math.round((t.getTime() - f.getTime()) / 864e5) + 1;
  const clash = a && db.covers.some(c => c.area === area && coverState(c) !== 'Ended' && !(parseDate(c.to) < f || parseDate(c.from) > t));
  const ok = a && cover && from && to && days >= 1 && days <= 60 && !clash && reason.trim().length >= 3;
  const strip = days > 0 && days <= 31 ? Array.from({ length: days }, (_, i) => { const d = new Date(f); d.setDate(d.getDate() + i); return d.getDate(); }) : [];
  return <Modal title="Set holiday cover" sub="The covering Supervisor uses their own login and switches between their area and this one." onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn icon={<Check size={16} />} disabled={!ok} onClick={() => {
      const c: Cover = { id: 'CV' + Date.now(), area, absent: a!.supervisor, cover, from: fromInput(from), to: fromInput(to), canDecide, absentReadOnly: ro, by: ME_NAME, at: nowStamp() };
      s.commit('covers', [c, ...db.covers], { page: 'Teams & cover', item: areaLabel(a!), what: 'Set holiday cover', after: `${personName(db, cover)} covers for ${personName(db, a!.supervisor)}, ${c.from} to ${c.to}${canDecide ? ' · can decide everything' : ' · day-to-day only'}`, reason: reason.trim() }, `Cover set. ${personName(db, cover)} sees ${a!.name} from ${c.from}.`); onClose();
    }}>Set cover</Btn></>}>
    <Field label="Area"><Select value={area} onChange={v => { setArea(v); setCover(db.areas.filter(z => z.supervisor && z.id !== v)[0]?.supervisor ?? ''); }} options={withSup.map(z => ({ value: z.id, label: `${areaLabel(z)} · ${personName(db, z.supervisor)} is away` }))} /></Field>
    <Field label="Covered by"><Select value={cover} onChange={setCover} options={others.length ? others : [{ value: '', label: 'No other Supervisor yet' }]} /></Field>
    <div className="grid g2"><Field label="From"><input className="input" type="date" value={from} onChange={e => setFrom(e.target.value)} /></Field><Field label="To (ends at 23:59)"><input className="input" type="date" value={to} onChange={e => setTo(e.target.value)} /></Field></div>
    {strip.length > 0 && <div className="daystrip">{strip.map((d, i) => <span key={i} className="on">{d}</span>)}</div>}
    {days > 60 && <Note tone="err">Cover is for up to 60 days. For longer, change the area's Supervisor.</Note>}
    {clash && <Note tone="err">This area already has cover on some of these days.</Note>}
    <label className="check"><Toggle on={canDecide} onChange={setCanDecide} label="Cover can approve over-limit jobs and new tenants" />Cover can do everything the Supervisor could (over-limit jobs, new tenants)</label>
    <label className="check"><Toggle on={ro} onChange={setRo} label="Person away keeps read-only access" />{a ? personName(db, a.supervisor) : 'The person away'} keeps read-only access while away</label>
    <Field label="Why is cover needed?" hint="Saved in the Audit history."><textarea className="input" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Annual leave" /></Field>
  </Modal>;
}
