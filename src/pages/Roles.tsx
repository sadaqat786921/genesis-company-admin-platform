import { useState } from 'react';
import { Plus, Trash2, ShieldCheck, Lock, ArrowRightLeft, MapPinned } from 'lucide-react';
import { useStore } from '../store';
import { Card, Chip, Btn, Field, Text, Select, Modal, Tabs, Note, Avatar, Bar, InfoTip, Empty } from '../ui';
import { Head } from '../Shell';
import { useDraft, SaveBar, Toggle, Locked, DeleteModal } from '../admin';
import { PERMS, AGENT_PERMS, PORTAL_ROLES, type RoleDef, type Perm } from '../seed';
import { nameOf, oaOptions } from './Areas';

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
  const coreValue = (r: RoleDef, p: Perm) => p.id === 'set.all' ? r.name === 'Company Admin' : p.id === 'homes.own' ? r.name === 'Office Admin' || !!r.custom && r.perms.includes('homes.own') : r.name === 'Supervisor' || r.name === 'Company Admin';
  const flip = (r: RoleDef, p: string, on: boolean) => x.set(rs => rs.map(z => z.id === r.id ? { ...z, perms: on ? [...z.perms, p] : z.perms.filter(q => q !== p) } : z));
  const diffs = () => x.d.flatMap(r => { const o = db.roles.find(z => z.id === r.id); if (!o) return []; const added = r.perms.filter(p => !o.perms.includes(p)); const removed = o.perms.filter(p => !r.perms.includes(p)); const lab = (id: string) => [...PERMS, ...AGENT_PERMS].find(p => p.id === id)?.label ?? id; return [...added.map(p => `${r.name} can: ${lab(p)}`), ...removed.map(p => `${r.name} can't: ${lab(p)}`)]; });
  return <>
    <Head r="roles" action={tab !== 'portal' ? <Btn icon={<Plus size={16} />} onClick={() => setAdd(true)}>Add a {tab === 'agent' ? 'team role' : 'staff role'}</Btn> : undefined} />
    <Card title={<span className="clean-h">Who can do what<InfoTip>Changes reach every portal the next time people open a page. Rules from the client's flow chart are locked so the process can't break.</InfoTip></span>}
      action={<Tabs value={tab} onChange={setTab} items={[{ id: 'staff', label: 'LSP staff' }, { id: 'agent', label: 'Letting agent team' }, { id: 'portal', label: 'Other portals' }]} />}>
      {tab !== 'portal' ? <>
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

/** People › Teams & areas: which Office Admin covers which area, landlords and client homes. Move work between people. */
export function Teams() {
  const s = useStore(); const { db } = s;
  const x = useDraft(db.landlords); const [move, setMove] = useState(false);
  const oas = oaOptions(db.users);
  const work = (id: string) => { const l = x.d.filter(r => r.admin === id); return { landlords: l.length, homes: l.reduce((a, r) => a + r.homes, 0), tasks: l.reduce((a, r) => a + r.tasks, 0) }; };
  const max = Math.max(1, ...oas.map(o => work(o.value).homes));
  const moved = x.d.filter(r => db.landlords.find(o => o.id === r.id)?.admin !== r.admin);
  return <>
    <Head r="teams" action={<Btn kind="outline" icon={<ArrowRightLeft size={16} />} onClick={() => setMove(true)}>Move work from one person</Btn>} />
    <div className="grid g4">{oas.map(o => { const w = work(o.value); const areas = db.areas.filter(a => a.oa === o.value); const backup = db.areas.filter(a => a.backup === o.value); return <Card key={o.value}>
      <div className="flex" style={{ gap: 10 }}><Avatar id={o.value} name={o.label} size="md" /><div className="stack grow"><b>{o.label}</b><span className="caption">Office Admin</span></div></div>
      <div className="flex wrap" style={{ gap: 4 }}>{areas.length ? areas.map(a => <Chip key={a.id} tone="brand" dot={false}>{a.name}</Chip>) : <Chip>No area yet</Chip>}{backup.map(a => <Chip key={'b' + a.id} dot={false}>Backup · {a.name}</Chip>)}</div>
      <div className="grid g3" style={{ gap: 8 }}><div className="stack"><b className="h2">{w.landlords}</b><span className="caption">Landlords and clients</span></div><div className="stack"><b className="h2">{w.homes}</b><span className="caption">Homes</span></div><div className="stack"><b className="h2">{w.tasks}</b><span className="caption">Open tasks</span></div></div>
      <Bar value={w.homes / max * 100} tone={w.homes / max > .85 ? 'warn' : 'brand'} />
    </Card>; })}</div>
    <Card title="Areas" sub="Change who covers an area on the area's page" action={<Btn sm kind="ghost" icon={<MapPinned size={14} />} onClick={() => s.go('areas')}>Areas</Btn>}>
      <div className="tablewrap"><table className="t"><thead><tr><th>Area</th><th>Office Admin</th><th>Backup</th><th>Homes</th><th>Status</th></tr></thead><tbody>
        {db.areas.map(a => <tr key={a.id} onClick={() => s.go('areas', a.id)}><td className="strong">{a.name}</td><td>{a.oa ? nameOf(a.oa) : <Chip tone={a.status === 'Off' ? 'neutral' : 'err'}>Nobody yet</Chip>}</td><td>{a.backup ? nameOf(a.backup) : '—'}</td><td>{a.homes}</td><td>{a.status}</td></tr>)}
      </tbody></table></div>
    </Card>
    <Card title={<span className="clean-h">Landlords and clients<InfoTip>Each landlord and letting agent has one Office Admin. Their homes, tenants, jobs and tasks go with them.</InfoTip></span>} sub="The Supervisor sees all of them">
      {x.d.length ? <div className="tablewrap"><table className="t"><thead><tr><th>Landlord or client</th><th>Area</th><th>Homes</th><th>Open tasks</th><th>Office Admin</th></tr></thead><tbody>
        {x.d.map(r => { const ch = moved.includes(r); return <tr key={r.id} className="static"><td><span className="flex"><b className="strong">{r.name}</b>{ch && <Chip tone="warn">Moving</Chip>}</span></td><td>{db.areas.find(a => a.id === r.area)?.name}</td><td>{r.homes}</td><td>{r.tasks}</td>
          <td style={{ width: 220 }}><Select value={r.admin} onChange={v => x.set(l => l.map(z => z.id === r.id ? { ...z, admin: v } : z))} options={oas} /></td></tr>; })}
      </tbody></table></div> : <Empty>No landlords yet.</Empty>}
    </Card>
    <SaveBar dirty={x.dirty} onUndo={x.undo} important="Moving landlords changes who they deal with. They are told by email who their new Office Admin is."
      note={moved.length ? `${moved.length} moving: ${moved.slice(0, 3).map(r => `${r.name} → ${nameOf(r.admin)}`).join(', ')}` : undefined}
      onSave={reason => s.commit('landlords', x.d, { page: 'Teams & areas', item: moved.map(r => r.name).join(', '), what: `Moved ${moved.length} landlord${moved.length === 1 ? '' : 's'} or client${moved.length === 1 ? '' : 's'}`, before: moved.map(r => `${r.name}: ${nameOf(db.landlords.find(o => o.id === r.id)!.admin)}`).join(' · '), after: moved.map(r => `${r.name}: ${nameOf(r.admin)}`).join(' · '), reason }, `${moved.length} moved. They are told by email.`)} />
    {move && <MoveAll oas={oas} onClose={() => setMove(false)} onMove={(from, to) => { x.set(l => l.map(z => z.admin === from ? { ...z, admin: to } : z)); setMove(false); s.toast('Moved in the list. Check it, then save.'); }} count={id => x.d.filter(r => r.admin === id).length} />}
  </>;
}
function MoveAll({ oas, onClose, onMove, count }: { oas: { value: string; label: string }[]; onClose: () => void; onMove: (from: string, to: string) => void; count: (id: string) => number }) {
  const first = oas.find(o => count(o.value) > 0)?.value ?? ''; const [from, setFrom] = useState(first); const [to, setTo] = useState(oas.find(o => o.value !== first)?.value ?? '');
  return <Modal title="Move work from one person" sub="For holidays, leavers or a new starter. You check the list and save afterwards." onClose={onClose}
    footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn icon={<ArrowRightLeft size={16} />} disabled={!from || !to || from === to || !count(from)} onClick={() => onMove(from, to)}>Move {count(from)}</Btn></>}>
    <div className="grid g2"><Field label="From"><Select value={from} onChange={setFrom} options={oas.map(o => ({ ...o, label: `${o.label} (${count(o.value)})` }))} /></Field><Field label="To"><Select value={to} onChange={setTo} options={oas.filter(o => o.value !== from)} /></Field></div>
    <Note>Their homes, tenants, jobs and open tasks move with them.</Note>
  </Modal>;
}
