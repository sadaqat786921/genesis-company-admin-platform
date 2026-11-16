import { useState } from 'react';
import { ListChecks, Plus, ArrowUp, ArrowDown, Trash2, Camera, PenLine } from 'lucide-react';
import { useStore } from '../store';
import { nowStamp, ME_NAME } from '../data';
import { Card, Chip, Btn, Field, Text, Select, Empty, Note, InfoTip, Modal, MoreMenu } from '../ui';
import { Head } from '../Shell';
import { useDraft, SaveBar, Toggle, DeleteModal } from '../admin';
import type { Checklist, CheckItem } from '../seed';

/** Messages & work › Checklists: inspections, gas safety, finishing a job, handovers and KYC checks. */
export function Checklists() {
  const s = useStore();
  if (s.detail) return <ChecklistPage id={s.detail} />;
  return <ChecklistList />;
}

function ChecklistList() {
  const s = useStore(); const { db } = s; const [add, setAdd] = useState(false);
  return <>
    <Head r="checklists" action={<Btn icon={<Plus size={16} />} onClick={() => setAdd(true)}>Add a checklist</Btn>} />
    <Card title={<span className="clean-h">Checklists used in the portals<InfoTip>Changes reach the portals the next time they open. Work already started keeps the checklist it started with.</InfoTip></span>}>
      {db.checklists.length ? <div className="tablewrap"><table className="t"><thead><tr><th>Checklist</th><th>Used by</th><th>Where</th><th>Items</th><th>Version</th><th>Last changed</th></tr></thead><tbody>
        {db.checklists.map(c => <tr key={c.id} onClick={() => s.go('checklists', c.id)}>
          <td><b className="strong">{c.name}</b></td><td className="small">{c.usedBy}</td><td><Chip dot={false}>{c.app}</Chip></td>
          <td><span className="stack"><b className="small" style={{ color: 'var(--text-primary)' }}>{c.items.length}</b><span className="caption">{c.items.filter(i => i.required).length} must be done</span></span></td>
          <td>v{c.version}</td><td className="small"><span className="stack"><span>{c.at.split(',')[0]}</span><span className="caption">{c.by}</span></span></td>
        </tr>)}
      </tbody></table></div> : <Empty icon={<ListChecks size={22} />}>No checklists yet.</Empty>}
    </Card>
    {add && <AddChecklist onClose={() => setAdd(false)} />}
  </>;
}
function AddChecklist({ onClose }: { onClose: () => void }) {
  const s = useStore(); const { db } = s;
  const [name, setName] = useState(''); const [by, setBy] = useState('Office Admin'); const [app, setApp] = useState('Staff portals');
  const dup = db.checklists.some(c => c.name.toLowerCase() === name.trim().toLowerCase());
  return <Modal title="Add a checklist" sub="You add the items next." onClose={onClose} footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn icon={<Plus size={16} />} disabled={!name.trim() || dup} onClick={() => {
    const c: Checklist = { id: 'CL' + Date.now(), name: name.trim(), usedBy: by, app, items: [{ id: 'CI' + Date.now(), text: 'First item', required: true }], rules: [{ id: 'photos', label: 'Photos', value: 'Optional', options: ['Every item', 'Only when something is wrong', 'Optional'] }, { id: 'sign', label: 'Signature', value: 'Not needed', options: ['Tenant and staff', 'Staff only', 'Not needed'] }], by: ME_NAME, at: nowStamp(), version: 1 };
    s.commit('checklists', [...db.checklists, c], { page: 'Checklists', item: c.name, what: 'Added a checklist', after: `${by} · ${app}` }, `${c.name} added`); onClose(); s.go('checklists', c.id);
  }}>Add checklist</Btn></>}>
    <Field label="Name"><Text value={name} onChange={setName} placeholder="e.g. Key handover" /></Field>
    {dup && <Note tone="err">There is already a checklist with this name.</Note>}
    <div className="grid g2"><Field label="Used by"><Select value={by} onChange={setBy} options={['Office Admin', 'Supervisor', 'Contractor', 'Office Admin · tenant signs'].map(v => ({ value: v, label: v }))} /></Field>
      <Field label="Where"><Select value={app} onChange={setApp} options={['Staff portals', 'Supervisor portal', 'Contractor portal'].map(v => ({ value: v, label: v }))} /></Field></div>
  </Modal>;
}

function ChecklistPage({ id }: { id: string }) {
  const s = useStore(); const { db } = s; const c0 = db.checklists.find(c => c.id === id);
  const x = useDraft((c0 ?? {}) as Checklist); const [t, setT] = useState(''); const [del, setDel] = useState(false);
  if (!c0) return <><Head r="checklists" extra="Not found" back /><Empty>This checklist was deleted.</Empty></>;
  const d = x.d;
  const setItem = (i: number, p: Partial<CheckItem>) => x.patch({ items: d.items.map((z, k) => k === i ? { ...z, ...p } : z) });
  const move = (i: number, by: number) => { const n = [...d.items]; const [v] = n.splice(i, 1); n.splice(i + by, 0, v); x.patch({ items: n }); };
  const add = () => { if (!t.trim()) return; x.patch({ items: [...d.items, { id: 'CI' + Date.now(), text: t.trim(), required: true }] }); setT(''); };
  const blocked = !d.items.length ? 'Keep at least one item.' : d.items.some(i => !i.text.trim()) ? 'Every item needs some text.' : '';
  const sum = () => { const out: string[] = []; d.items.forEach(i => { const o = c0.items.find(z => z.id === i.id); if (!o) out.push(`Added “${i.text}”`); else { if (o.text !== i.text) out.push(`Renamed “${o.text}” to “${i.text}”`); if (o.required !== i.required) out.push(`“${i.text}” is now ${i.required ? 'required' : 'optional'}`); } }); c0.items.forEach(o => { if (!d.items.find(i => i.id === o.id)) out.push(`Removed “${o.text}”`); }); if (d.items.filter(i => c0.items.some(o => o.id === i.id)).map(i => i.id).join() !== c0.items.filter(o => d.items.some(i => i.id === o.id)).map(o => o.id).join()) out.push('Changed the order'); d.rules.forEach(r => { const o = c0.rules.find(z => z.id === r.id); if (o && o.value !== r.value) out.push(`${r.label}: ${o.value} → ${r.value}`); }); return out; };
  const photos = d.rules.find(r => r.id === 'photos')?.value; const sign = d.rules.find(r => r.id === 'sign')?.value;
  return <>
    <Head r="checklists" extra={c0.name} title={c0.name} back action={<MoreMenu label="···" items={[{ label: 'Delete this checklist', icon: <Trash2 size={16} />, danger: true, onClick: () => setDel(true) }]} />} />
    <Note>Changes reach the portals the next time they open. Work already started keeps the checklist it started with (version {c0.version}).</Note>
    <div className="adm-split">
      <div className="col">
        <Card title="Items" sub={`${d.items.length} items · ${d.items.filter(i => i.required).length} must be done`}>
          <div>{d.items.map((it, i) => <div key={it.id} className="irow">
            <span className="n">{i + 1}</span>
            <input className="input grow" aria-label={`Item ${i + 1}`} value={it.text} onChange={e => setItem(i, { text: e.target.value })} />
            <label className="check" style={{ width: 118, flex: 'none' }}><Toggle on={it.required} onChange={v => setItem(i, { required: v })} label={`${it.text} required`} /><span className="small">{it.required ? 'Required' : 'Optional'}</span></label>
            <div className="icon-btns">
              <Btn sm kind="ghost" icon={<ArrowUp size={14} />} disabled={i === 0} onClick={() => move(i, -1)} title="Move up" />
              <Btn sm kind="ghost" icon={<ArrowDown size={14} />} disabled={i === d.items.length - 1} onClick={() => move(i, 1)} title="Move down" />
              <Btn sm kind="ghost" icon={<Trash2 size={14} />} disabled={d.items.length <= 1} onClick={() => x.patch({ items: d.items.filter((_, k) => k !== i) })} title="Remove" />
            </div>
          </div>)}</div>
          <div className="flex"><input className="input grow" aria-label="New item" value={t} placeholder="Add an item, e.g. Loft hatch checked" onChange={e => setT(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} /><Btn kind="outline" icon={<Plus size={16} />} disabled={!t.trim()} onClick={add}>Add item</Btn></div>
        </Card>
        <Card title="Rules">
          <div className="grid g2">{d.rules.map((r, i) => <Field key={r.id} label={r.label}><Select value={r.value} onChange={v => x.patch({ rules: d.rules.map((z, k) => k === i ? { ...z, value: v } : z) })} options={r.options.map(o => ({ value: o, label: o }))} /></Field>)}</div>
        </Card>
      </div>
      <div className="sticky">
        <Card title="How it looks in the portal" sub={c0.app}>
          <div className="phonepv"><div className="scr"><div className="bar" /><div className="hd"><b>{d.name}</b><span>12 Oak Street · {d.items.filter(i => i.required).length} to do</span></div>
            <div className="bd">{d.items.map(i => <div key={i.id} className="it"><i />{i.text || '…'}<em>{i.required ? '' : 'Optional'}</em></div>)}
              {photos && <span className="rl flex" style={{ gap: 4 }}><Camera size={11} />Photos: {photos.toLowerCase()}</span>}
              {sign && <span className="rl flex" style={{ gap: 4 }}><PenLine size={11} />Signature: {sign.toLowerCase()}</span>}</div>
            <div className="ft"><span>Finish</span></div></div></div>
        </Card>
      </div>
    </div>
    <SaveBar dirty={x.dirty} onUndo={x.undo} blocked={blocked} note={x.dirty ? sum().slice(0, 2).join('; ') + (sum().length > 2 ? '…' : '') : `Version ${c0.version} · changed ${c0.at} by ${c0.by}`} saveLabel={`Save as version ${c0.version + 1}`}
      onSave={() => { const sm = sum(); s.commit('checklists', db.checklists.map(c => c.id === id ? { ...d, version: c0.version + 1, by: ME_NAME, at: nowStamp() } : c), { page: 'Checklists', item: c0.name, what: `Saved version ${c0.version + 1}`, before: `Version ${c0.version} · ${c0.items.length} items`, after: sm.join(' · ') }, `Version ${c0.version + 1} saved. Work already started keeps version ${c0.version}.`); }} />
    {del && <DeleteModal what={`the ${c0.name} checklist`} detail="Work already started keeps it. New work won't use it." onClose={() => setDel(false)} onDone={reason => { s.commit('checklists', db.checklists.filter(c => c.id !== id), { page: 'Checklists', item: c0.name, what: 'Deleted a checklist', before: `${c0.items.length} items`, reason }, 'Checklist deleted'); s.go('checklists'); }} />}
  </>;
}
