import { useState } from 'react';
import { MapPinned, Plus, Trash2, Download, Send, Users } from 'lucide-react';
import { useStore, staffName } from '../store';
import { nowStamp, fromInput, toInput } from '../data';
import { Card, Chip, Btn, Field, Text, Select, Modal, Empty, Tabs, Facts, Avatar, MoreMenu, Note, InfoTip } from '../ui';
import { Head } from '../Shell';
import { useDraft, SaveBar, ChipsInput, DeleteModal, changed, downloadCsv } from '../admin';
import { statusTone } from './lib';
import type { Area } from '../seed';

const OFF_MSG = "We don't cover your area yet. Leave your details and we'll tell you when we do.";
export const oaOptions = (users: { name: string; role: string; status: string }[]) => {
  const ids: Record<string, string> = { 'Emma Thompson': 'et', 'James Carter': 'jc', 'Priya Shah': 'ps', 'Liam Murphy': 'lm', 'Nadia Rossi': 'nr' };
  return users.filter(u => u.role === 'Office Admin' && u.status !== 'Disabled').map(u => ({ value: ids[u.name] ?? u.name, label: u.name + (u.status === 'Invited' ? ' (invited)' : '') }));
};
export const nameOf = (id: string) => id === 'nr' ? 'Nadia Rossi' : staffName(id);

/** Business › Areas. North London at launch; new areas are added with their postcodes, Office Admin and opening date. */
export function Areas() {
  const s = useStore();
  if (s.detail) return <AreaPage id={s.detail} />;
  return <AreaList />;
}

function AreaList() {
  const s = useStore(); const { db } = s;
  const [tab, setTab] = useState<'all' | 'Live' | 'Planned' | 'Off'>('all'); const [add, setAdd] = useState(false);
  const list = db.areas.filter(a => tab === 'all' || a.status === tab);
  return <>
    <Head r="areas" action={<Btn icon={<Plus size={16} />} onClick={() => setAdd(true)}>Add an area</Btn>} />
    <Card title={<span className="clean-h">Where LSP works<InfoTip>People outside a live area see the area's message on the website and join the waiting list. When an area opens, the waiting list is told.</InfoTip></span>}
      action={<Tabs value={tab} onChange={setTab} items={[{ id: 'all', label: 'All', count: db.areas.length }, { id: 'Live', label: 'Live', count: db.areas.filter(a => a.status === 'Live').length }, { id: 'Planned', label: 'Opening', count: db.areas.filter(a => a.status === 'Planned').length }, { id: 'Off', label: 'Off', count: db.areas.filter(a => a.status === 'Off').length }]} />}>
      {list.length ? <div className="tablewrap"><table className="t"><thead><tr><th>Area</th><th>Office Admin</th><th>Status</th><th>Homes</th><th>Landlords</th><th>Tenants</th><th>Contractors</th><th>Waiting list</th></tr></thead><tbody>
        {list.map(a => <tr key={a.id} onClick={() => s.go('areas', a.id)}>
          <td><span className="stack"><b className="strong">{a.name}</b><span className="caption">{a.postcodes.join(', ')}</span></span></td>
          <td>{a.oa ? <span className="flex"><Avatar id={a.oa} name={nameOf(a.oa)} />{nameOf(a.oa)}</span> : <Chip tone={a.status === 'Off' ? 'neutral' : 'err'}>Nobody yet</Chip>}</td>
          <td><Chip tone={statusTone(a.status)}>{a.status === 'Planned' ? `Opens ${a.opens}` : a.status}</Chip></td>
          <td>{a.homes}</td><td>{a.landlords}</td><td>{a.tenants}</td><td>{a.contractors}</td><td>{a.waitlist.length || '—'}</td>
        </tr>)}
      </tbody></table></div> : <Empty icon={<MapPinned size={22} />}>No areas here.</Empty>}
    </Card>
    {add && <AddArea onClose={() => setAdd(false)} />}
  </>;
}

function AddArea({ onClose }: { onClose: () => void }) {
  const s = useStore(); const { db } = s;
  const [name, setName] = useState(''); const [pcs, setPcs] = useState<string[]>([]); const [oa, setOa] = useState(''); const [opens, setOpens] = useState('2027-01-01');
  const taken = pcs.filter(p => db.areas.some(a => a.postcodes.includes(p)));
  const dup = db.areas.some(a => a.name.toLowerCase() === name.trim().toLowerCase());
  const ok = name.trim() && pcs.length && !taken.length && !dup;
  const save = () => {
    const a: Area = { id: 'AR' + (db.areas.length + 1) + Date.now().toString().slice(-3), name: name.trim(), postcodes: pcs, oa, backup: '', status: 'Planned', opens: fromInput(opens), message: `We open in ${name.trim()} on ${fromInput(opens)}. Leave your details and we'll call you as soon as we start.`, homes: 0, landlords: 0, tenants: 0, contractors: 0, waitlist: [], created: nowStamp() };
    s.commit('areas', [...db.areas, a], { page: 'Areas', item: a.name, what: 'Added an area', after: `${pcs.join(', ')} · opens ${a.opens}${oa ? ' · ' + nameOf(oa) : ''}` }, `${a.name} added. It opens on ${a.opens}.`);
    onClose(); s.go('areas', a.id);
  };
  return <Modal title="Add an area" sub="It stays closed until the opening date. People there can join the waiting list." onClose={onClose} footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn icon={<Plus size={16} />} disabled={!ok} onClick={save}>Add area</Btn></>}>
    <Field label="Area name"><Text value={name} onChange={setName} placeholder="e.g. Waltham Forest" /></Field>
    {dup && <Note tone="err">There is already an area with this name.</Note>}
    <Field label="Postcode districts" hint="Type one and press Enter, e.g. E17"><ChipsInput label="Postcode districts" value={pcs} onChange={setPcs} upper placeholder="E17" /></Field>
    {taken.length > 0 && <Note tone="err">{taken.join(', ')} already belong to another area.</Note>}
    <div className="grid g2">
      <Field label="Office Admin"><Select value={oa} onChange={setOa} options={[{ value: '', label: 'Choose later' }, ...oaOptions(db.users)]} /></Field>
      <Field label="Opening date"><input className="input" type="date" value={opens} onChange={e => setOpens(e.target.value)} /></Field>
    </div>
  </Modal>;
}

function AreaPage({ id }: { id: string }) {
  const s = useStore(); const { db } = s; const a0 = db.areas.find(a => a.id === id);
  const x = useDraft((a0 ?? {}) as Area); const [del, setDel] = useState(false);
  if (!a0) return <><Head r="areas" extra="Not found" back /><Empty>This area was removed.</Empty></>;
  const d = x.d;
  const others = db.areas.filter(a => a.id !== id);
  const taken = d.postcodes.filter(p => others.some(a => a.postcodes.includes(p)));
  const blocked = !d.name.trim() ? 'The area needs a name.' : !d.postcodes.length ? 'Add at least one postcode district.' : taken.length ? `${taken.join(', ')} already belong to another area.` : d.status === 'Live' && !d.oa ? 'A live area needs an Office Admin.' : d.status === 'Planned' && !d.opens ? 'Choose the opening date.' : '';
  const important = d.status !== a0.status || d.oa !== a0.oa;
  const canDelete = a0.homes === 0 && a0.landlords === 0 && a0.tenants === 0;
  const labels: Partial<Record<keyof Area, string>> = { name: 'Name', postcodes: 'Postcodes', status: 'Status', opens: 'Opening date', message: 'Website message', oa: 'Office Admin', backup: 'Backup' };
  const shown = (v: Area) => ({ ...v, oa: v.oa ? nameOf(v.oa) : '', backup: v.backup ? nameOf(v.backup) : '' });
  return <>
    <Head r="areas" extra={a0.name} title={a0.name} back action={<MoreMenu label="···" items={[{ label: 'Export the waiting list', icon: <Download size={16} />, onClick: () => { downloadCsv(`waiting-list-${a0.name.toLowerCase().replace(/\W+/g, '-')}.csv`, [['Name', 'Email', 'Postcode', 'Type', 'Joined'], ...a0.waitlist.map(w => [w.name, w.email, w.postcode, w.kind, w.at])]); s.toast('Waiting list downloaded'); } }, { label: 'Delete this area', icon: <Trash2 size={16} />, danger: true, onClick: () => setDel(true) }]} />} />
    <Card><Facts items={[['Status', <Chip key="s" tone={statusTone(a0.status)}>{a0.status === 'Planned' ? `Opens ${a0.opens}` : a0.status}</Chip>], ['Homes', a0.homes], ['Landlords', a0.landlords], ['Tenants', a0.tenants], ['Contractors covering it', a0.contractors], ['Waiting list', a0.waitlist.length], ['Added', a0.created.split(',')[0]]]} /></Card>
    <div className="adm-split">
      <div className="col">
        <Card title="Area">
          <Field label="Name"><Text value={d.name} onChange={v => x.patch({ name: v })} /></Field>
          <Field label="Postcode districts" hint="Enquiries from these postcodes go to this area's Office Admin."><ChipsInput label="Postcode districts" value={d.postcodes} onChange={v => x.patch({ postcodes: v })} upper placeholder="Add a district" /></Field>
          <Field label="Status">
            <div className="seg" role="group" aria-label="Status">{(['Live', 'Planned', 'Off'] as const).map(v => <button key={v} type="button" className={d.status === v ? 'on' : ''} onClick={() => x.patch({ status: v, message: v === 'Off' && !d.message ? OFF_MSG : d.message })}>{v === 'Planned' ? 'Opens on a date' : v === 'Live' ? 'Live' : 'Off'}</button>)}</div>
          </Field>
          {d.status === 'Planned' && <Field label="Opening date"><input className="input" type="date" value={toInput(d.opens)} onChange={e => x.patch({ opens: fromInput(e.target.value) })} /></Field>}
          {d.status !== 'Live' && <Field label="What people in this area see on the website"><textarea className="input" value={d.message} onChange={e => x.patch({ message: e.target.value })} /></Field>}
          {d.status === 'Off' && a0.homes > 0 && <Note tone="warn">The {a0.homes} homes already here are still managed. Off only stops new enquiries.</Note>}
          {a0.status !== 'Live' && d.status === 'Live' && a0.waitlist.length > 0 && <Note>When you save, the {a0.waitlist.length} people on the waiting list are told the area is open.</Note>}
        </Card>
        <Card title="Who looks after it">
          <div className="grid g2">
            <Field label="Office Admin"><Select value={d.oa} onChange={v => x.patch({ oa: v })} options={[{ value: '', label: 'Nobody yet' }, ...oaOptions(db.users)]} /></Field>
            <Field label="Backup when they are away"><Select value={d.backup} onChange={v => x.patch({ backup: v })} options={[{ value: '', label: 'Nobody' }, ...oaOptions(db.users).filter(o => o.value !== d.oa)]} /></Field>
          </div>
          <span className="small">New enquiries, landlords and homes in this area go to the Office Admin. The Supervisor sees every area.</span>
        </Card>
        <Card title="Waiting list" sub="People who asked while the area was not live" action={a0.waitlist.length > 0 && a0.status === 'Live' ? <Btn sm kind="outline" icon={<Send size={14} />} onClick={() => s.commit('areas', db.areas.map(z => z.id === id ? { ...z, waitlist: [] } : z), { page: 'Areas', item: a0.name, what: 'Told the waiting list the area is open', before: `${a0.waitlist.length} waiting`, after: '0 waiting' }, `${a0.waitlist.length} people told`)}>Tell them we've opened</Btn> : undefined}>
          {a0.waitlist.length ? <div className="tablewrap"><table className="t"><thead><tr><th>Name</th><th>Type</th><th>Postcode</th><th>Joined</th></tr></thead><tbody>
            {a0.waitlist.map(w => <tr key={w.email} className="static"><td><span className="stack"><b className="strong">{w.name}</b><span className="caption">{w.email}</span></span></td><td>{w.kind}</td><td>{w.postcode}</td><td>{w.at}</td></tr>)}
          </tbody></table></div> : <Empty icon={<Users size={20} />}>Nobody is waiting.</Empty>}
        </Card>
      </div>
      <div className="sticky">
        <Card title="On the website">
          {d.status === 'Live' ? <Note tone="ok">People with a {d.postcodes[0] ?? '…'} postcode can sign up and send enquiries.</Note>
            : <div className="emailpv"><div className="eh"><b>Postcode {d.postcodes[0] ?? '—'}</b><span>What they see after entering their postcode</span></div><div className="eb">{d.message || OFF_MSG}</div><div className="sigx"><span className="btn sm" style={{ alignSelf: 'flex-start' }}>Join the waiting list</span></div></div>}
        </Card>
      </div>
    </div>
    <SaveBar dirty={x.dirty} onUndo={x.undo} blocked={blocked} important={important ? 'Changing who looks after an area, or opening or closing it, is saved with a reason.' : false}
      onSave={reason => {
        const opened = a0.status !== 'Live' && d.status === 'Live';
        const next = { ...d, waitlist: opened ? [] : d.waitlist };
        s.commit('areas', db.areas.map(z => z.id === id ? next : z), { page: 'Areas', item: d.name, ...changed(shown(a0), shown(d), labels), reason }, opened && a0.waitlist.length ? `Saved. ${a0.waitlist.length} people told the area is open.` : 'Saved');
      }} />
    {del && (canDelete ? <DeleteModal what={a0.name} onClose={() => setDel(false)} onDone={reason => { s.commit('areas', db.areas.filter(z => z.id !== id), { page: 'Areas', item: a0.name, what: 'Deleted an area', before: a0.postcodes.join(', '), after: '—', reason }, `${a0.name} deleted`); s.go('areas'); }} />
      : <Modal title="This area can't be deleted yet" sub={`It still has ${a0.homes} homes, ${a0.landlords} landlords and ${a0.tenants} tenants. Move them to another area first, or switch the area off to stop new enquiries.`} onClose={() => setDel(false)} footer={<Btn onClick={() => setDel(false)}>OK</Btn>} />)}
  </>;
}
