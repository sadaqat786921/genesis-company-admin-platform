import { useState } from 'react';
import { Plus, ArrowUp, ArrowDown, Trash2, List } from 'lucide-react';
import { useStore } from '../store';
import { Card, Chip, Btn, Tabs, InfoTip, Note } from '../ui';
import { Head } from '../Shell';
import { useDraft, SaveBar, Toggle, Locked, ListEditor } from '../admin';
import type { Stage } from '../seed';

/** Messages & work › Stages & lists: the stages of each process and the pick-lists used across the platform. */
export function Stages() {
  const [tab, setTab] = useState<'stages' | 'lists'>('stages');
  return <>
    <Head r="stages" action={<Tabs value={tab} onChange={setTab} items={[{ id: 'stages', label: 'Stages' }, { id: 'lists', label: 'Pick-lists' }]} />} />
    {tab === 'stages' ? <StageEditor /> : <PickLists />}
  </>;
}

function StageEditor() {
  const s = useStore(); const { db } = s; const [p, setP] = useState(db.processes[0].id);
  const x = useDraft(db.processes); const proc = x.d.find(z => z.id === p)!;
  const setStages = (fn: (st: Stage[]) => Stage[]) => x.set(ps => ps.map(z => z.id === p ? { ...z, stages: fn(z.stages) } : z));
  const set = (i: number, patch: Partial<Stage>) => setStages(st => st.map((t, k) => k === i ? { ...t, ...patch } : t));
  const move = (i: number, by: number) => setStages(st => { const n = [...st]; const [v] = n.splice(i, 1); n.splice(i + by, 0, v); return n; });
  const add = () => setStages(st => { const n = [...st]; n.splice(Math.max(1, n.length - 1), 0, { id: 'ST' + Date.now(), staff: 'New stage', customer: 'New stage', show: true, late: 3, core: false }); return n; });
  const changes = () => x.d.flatMap(z => { const o = db.processes.find(q => q.id === z.id)!; const out: string[] = [];
    z.stages.forEach((t, i) => { const ot = o.stages.find(q => q.id === t.id); if (!ot) out.push(`${z.name}: added “${t.staff}”`); else { if (ot.staff !== t.staff) out.push(`${z.name}: “${ot.staff}” renamed “${t.staff}”`); if (ot.customer !== t.customer) out.push(`${z.name} · ${t.staff}: customers see “${t.customer}”`); if (ot.show !== t.show) out.push(`${z.name} · ${t.staff}: ${t.show ? 'shown to' : 'hidden from'} customers`); if (ot.late !== t.late) out.push(`${z.name} · ${t.staff}: late after ${t.late ?? 'never'}`); if (o.stages.indexOf(ot) !== i && !out.some(c => c.includes('order'))) out.push(`${z.name}: changed the order`); } });
    o.stages.forEach(ot => { if (!z.stages.find(t => t.id === ot.id)) out.push(`${z.name}: removed “${ot.staff}”`); }); return out; });
  const blocked = proc.stages.some(t => !t.staff.trim() || !t.customer.trim()) ? 'Every stage needs a staff name and the wording customers see.' : '';
  // Only optional stages move, and never past a locked stage's position.
  const canMove = (i: number, by: number) => { const t = proc.stages[i]; const o = proc.stages[i + by]; return !t.core && !!o && !o.core; };
  return <>
    <Card title={<span className="clean-h">{proc.name}<InfoTip>Locked stages are the ones the process depends on: you can reword them, but not remove or move them. Optional stages you add can be moved and removed.</InfoTip></span>}
      action={<Btn sm kind="outline" icon={<Plus size={14} />} onClick={add}>Add an optional stage</Btn>}>
      <div className="toolbar"><Tabs value={p} onChange={setP} items={x.d.map(z => ({ id: z.id, label: z.name }))} /></div>
      <div className="tablewrap"><table className="t"><thead><tr><th>#</th><th>Staff name</th><th>What {proc.customer.toLowerCase()} sees</th><th>Show to them</th><th>Late after</th><th /></tr></thead><tbody>
        {proc.stages.map((t, i) => <tr key={t.id} className="static">
          <td><span className="flex" style={{ gap: 6 }}><b>{i + 1}</b>{t.core && <Locked why="The process depends on this stage. Reword it, but it can't be removed or moved.">{''}</Locked>}</span></td>
          <td><input className="input" aria-label={`Staff name ${i + 1}`} value={t.staff} onChange={e => set(i, { staff: e.target.value })} /></td>
          <td><input className="input" aria-label={`Customer wording ${i + 1}`} value={t.customer} disabled={!t.show} onChange={e => set(i, { customer: e.target.value })} /></td>
          <td><Toggle on={t.show} label={`Show ${t.staff} to customers`} onChange={v => set(i, { show: v })} /></td>
          <td><span className="inline-sel"><Toggle on={t.late !== null} label={`Flag ${t.staff} as late`} onChange={v => set(i, { late: v ? 3 : null })} />{t.late !== null ? <><input className="input numin" style={{ width: 64 }} aria-label={`Late after ${i + 1}`} value={t.late} onChange={e => set(i, { late: Math.max(1, +e.target.value.replace(/\D/g, '') || 1) })} /><span className="small">days</span></> : <span className="caption">Never</span>}</span></td>
          <td>{!t.core && <div className="icon-btns">
            <Btn sm kind="ghost" icon={<ArrowUp size={14} />} disabled={!canMove(i, -1)} onClick={() => move(i, -1)} title="Move up" />
            <Btn sm kind="ghost" icon={<ArrowDown size={14} />} disabled={!canMove(i, 1)} onClick={() => move(i, 1)} title="Move down" />
            <Btn sm kind="ghost" icon={<Trash2 size={14} />} onClick={() => setStages(st => st.filter(z => z.id !== t.id))} title="Remove stage" /></div>}</td>
        </tr>)}
      </tbody></table></div>
      <div className="flex wrap" style={{ gap: 6 }}><span className="caption">Customers see:</span>{proc.stages.filter(t => t.show).map((t, i) => <Chip key={t.id} tone={i === 0 ? 'brand' : 'neutral'} dot={false}>{i + 1}. {t.customer}</Chip>)}</div>
    </Card>
    <SaveBar dirty={x.dirty} onUndo={x.undo} blocked={blocked} note={x.dirty ? changes().slice(0, 2).join('; ') + (changes().length > 2 ? '…' : '') : 'Work already at a stage keeps its place when you rename it.'}
      onSave={() => { const c = changes(); s.commit('processes', x.d, { page: 'Stages & lists', item: [...new Set(c.map(z => z.split(/[:·]/)[0].trim()))].join(', '), what: `${c.length} change${c.length === 1 ? '' : 's'} to stages`, before: '—', after: c.join(' · ') }); }} />
  </>;
}

function PickLists() {
  const s = useStore(); const { db } = s; const [sel, setSel] = useState(db.picklists[0].id);
  const x = useDraft(db.picklists); const list = x.d.find(l => l.id === sel)!;
  const changedLists = x.d.filter(l => JSON.stringify(l) !== JSON.stringify(db.picklists.find(o => o.id === l.id)));
  const blocked = x.d.some(l => l.items.length < 2) ? 'Every pick-list needs at least 2 choices.' : x.d.some(l => l.items.some(i => !i.trim())) ? 'Remove empty choices.' : '';
  return <>
    <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 340px) minmax(0, 1fr)' }}>
      <Card title={<span className="clean-h"><List size={16} />Pick-lists</span>}>
        <div>{x.d.map(l => <button key={l.id} className="rowlink" onClick={() => setSel(l.id)} style={sel === l.id ? { background: 'var(--bg-brand-subtle)', borderRadius: 10, padding: '12px 10px' } : { padding: '12px 10px' }}>
          <div className="stack grow"><b>{l.name}</b><span className="caption">{l.items.length} choices · {l.usedIn}</span></div>{changedLists.includes(l) && <Chip tone="warn">Changed</Chip>}</button>)}</div>
      </Card>
      <Card title={list.name} sub={`Used in: ${list.usedIn}`}>
        <Note>Renaming a choice changes it everywhere from now on. Records that already used it keep the old wording.</Note>
        <ListEditor label="Choice" items={list.items} min={2} onChange={v => x.set(ls => ls.map(l => l.id === sel ? { ...l, items: v } : l))} placeholder="Add a choice" />
      </Card>
    </div>
    <SaveBar dirty={x.dirty} onUndo={x.undo} blocked={blocked} note={changedLists.length ? `Changed: ${changedLists.map(l => l.name).join(', ')}` : undefined}
      onSave={() => s.commitMany({ picklists: x.d }, changedLists.map(l => { const o = db.picklists.find(z => z.id === l.id)!; return { page: 'Stages & lists', item: l.name, what: 'Changed a pick-list', before: o.items.join(', '), after: l.items.join(', ') }; }))} />
  </>;
}
