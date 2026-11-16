import { useState } from 'react';
import { Plus, Trash2, FileCheck2, Check } from 'lucide-react';
import { useStore, money } from '../store';
import type { Route } from '../store';
import { Card, Chip, Btn, Field, Text, Select, Empty, Note, Drawer, HSteps, InfoTip } from '../ui';
import { Head, LABEL } from '../Shell';
import { useDraft, SaveBar, Toggle, Locked, ChipsInput } from '../admin';
import { TRADES, type OnbRole, type OnbDoc, type Onboarding as O, type OnEnd } from '../seed';

const ROUTE: Record<OnbRole, Route> = { tenant: 'onb-tenant', landlord: 'onb-landlord', agent: 'onb-agent', contractor: 'onb-contractor' };
const WHO: Record<OnbRole, string> = { tenant: 'Applicant', landlord: 'Landlord', agent: 'Letting agent', contractor: 'Contractor' };
const ENDS: OnEnd[] = ['Remind only', 'Ask for a new one', 'Pause them', 'Block payouts'];
const remindText = (r: number[]) => r.length ? [...r].sort((a, b) => b - a).join(' and ') + ' days before' : 'No reminders';

/** Onboarding › Tenant / Landlord / Letting agent / Contractor: the documents and checks each role needs, and the rules. */
export function Onboarding({ role }: { role: OnbRole }) {
  const s = useStore(); const { db } = s; const saved = db.onboarding[role];
  const x = useDraft(saved); const d = x.d; const [open, setOpen] = useState<string | null>(null);
  const setDoc = (id: string, p: Partial<OnbDoc>) => x.patch({ docs: d.docs.map(k => k.id === id ? { ...k, ...p } : k) });
  const addDoc = () => { const id = 'OD' + Date.now(); x.patch({ docs: [...d.docs, { id, name: 'New document', who: WHO[role], need: 'Optional', endDate: false, remind: [], checkedBy: 'Office Admin', onEnd: 'Remind only', on: true }] }); setOpen(id); };
  const doc = d.docs.find(k => k.id === open);
  const important = JSON.stringify(d.docs.map(k => [k.id, k.need, k.on])) !== JSON.stringify(saved.docs.map(k => [k.id, k.need, k.on])) || d.askExisting === 'Yes' || JSON.stringify(d.rules) !== JSON.stringify(saved.rules);
  const blocked = d.docs.some(k => !k.name.trim()) ? 'Every document needs a name.' : d.rules.some(r => r.kind !== 'select' && !String(r.value).trim()) ? 'Fill in every rule.' : '';
  const summary = () => {
    const out: string[] = [];
    d.docs.forEach(k => { const o = saved.docs.find(z => z.id === k.id); if (!o) out.push(`Added ${k.name} (${k.need.toLowerCase()})`); else if (JSON.stringify(o) !== JSON.stringify(k)) out.push(`Changed ${k.name}`); });
    saved.docs.forEach(o => { if (!d.docs.find(k => k.id === o.id)) out.push(`Removed ${o.name}`); });
    d.rules.forEach(r => { const o = saved.rules.find(z => z.id === r.id); if (o && o.value !== r.value) out.push(`${r.label}: ${o.value} → ${r.value}`); });
    if (d.askExisting !== saved.askExisting) out.push(`Ask people already on the platform: ${d.askExisting}`);
    return out;
  };
  const needed = d.docs.filter(k => k.on);
  return <>
    <Head r={ROUTE[role]} />
    <Card title={<span className="clean-h">How {d.title.toLowerCase()} join<InfoTip>The steps come from the portal's flow. Documents and rules below are what you can change.</InfoTip></span>} action={<Locked why="The order of the steps is set by the client's flow chart and the portals.">Steps set by the flow</Locked>}>
      <HSteps items={d.steps} at={d.steps.length} />
    </Card>
    <div className="adm-split">
      <div className="col">
        <Card title="Documents and checks" sub="Click a row to change it" action={<Btn sm kind="outline" icon={<Plus size={14} />} onClick={addDoc}>Add a document</Btn>}>
          {d.docs.length ? <div className="tablewrap"><table className="t"><thead><tr><th>Document</th><th>Needed</th><th>End date</th><th>Checked by</th><th>When it ends</th><th>Asked for</th></tr></thead><tbody>
            {d.docs.map(k => <tr key={k.id} onClick={() => setOpen(k.id)} style={k.on ? undefined : { opacity: .55 }}>
              <td><span className="stack"><b className="strong">{k.name}</b><span className="caption">{k.who}{k.when ? ' · ' + k.when : ''}</span></span></td>
              <td><Chip tone={k.need === 'Required' ? 'brand' : k.need === 'Optional' ? 'neutral' : 'info'}>{k.need}</Chip></td>
              <td className="small">{k.endDate ? remindText(k.remind) : 'No'}</td><td className="small">{k.checkedBy}</td><td className="small">{k.endDate ? k.onEnd : '—'}</td>
              <td>{k.core ? <Locked why="The flow needs this document, so it can't be switched off.">Always</Locked> : <Toggle on={k.on} label={`Ask for ${k.name}`} onChange={v => setDoc(k.id, { on: v })} />}</td>
            </tr>)}
          </tbody></table></div> : <Empty icon={<FileCheck2 size={22} />}>No documents yet. Add the first one.</Empty>}
        </Card>
        <Card title="Rules">
          <div className="col" style={{ gap: 4 }}>{d.rules.map((r, i) => <div key={r.id} className="hrow" style={{ alignItems: 'center' }}>
            <div className="stack grow"><b className="small" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{r.label}</b>{r.hint && <span className="caption">{r.hint}</span>}</div>
            {r.core ? <span className="flex"><b className="small" style={{ color: 'var(--text-primary)' }}>{r.kind === 'number' ? `${r.value} ${r.unit ?? ''}` : r.value}</b><Locked why={r.core}>{''}</Locked></span>
              : r.kind === 'select' ? <div style={{ width: 280 }}><Select value={r.value} onChange={v => x.patch({ rules: d.rules.map((z, k) => k === i ? { ...z, value: v } : z) })} options={(r.options ?? []).map(o => ({ value: o, label: o }))} /></div>
              : <span className="inline-sel">{r.kind === 'money' && <span className="small">£</span>}<input className="input numin" style={r.kind === 'money' || r.kind === 'text' ? { width: 140 } : undefined} aria-label={r.label} value={r.value} onChange={e => x.patch({ rules: d.rules.map((z, k) => k === i ? { ...z, value: r.kind === 'text' ? e.target.value : e.target.value.replace(/\D/g, '') } : z) })} />{r.unit && <span className="small">{r.unit}</span>}</span>}
          </div>)}</div>
        </Card>
        {role === 'contractor' && <Card title="Trade registration by trade" sub="The registration a contractor must hold for each trade">
          <div className="tablewrap"><table className="t"><thead><tr><th>Trade</th><th>Registration needed</th></tr></thead><tbody>{TRADES.map(t => <tr key={t.trade} className="static"><td className="strong">{t.trade}</td><td>{t.reg}</td></tr>)}</tbody></table></div>
        </Card>}
        <Card title="People already on the platform">
          <Field label="When you save, ask people who have already joined for any new or changed required documents?">
            <div className="seg" role="group" aria-label="Ask people already on the platform">{(['No', 'Yes'] as const).map(v => <button key={v} type="button" className={d.askExisting === v ? 'on' : ''} onClick={() => x.patch({ askExisting: v })}>{v === 'No' ? 'No, only people who join from now' : 'Yes, ask everyone next time they sign in'}</button>)}</div>
          </Field>
          {d.askExisting === 'Yes' && <Note tone="warn">Everyone already on the platform sees “Upload a document” next time they sign in. {role === 'contractor' ? 'Contractors are not paused until the end date passes.' : ''}</Note>}
        </Card>
      </div>
      <div className="sticky">
        <Card title="What they see" sub={`${WHO[role]} portal · documents step`}>
          <div className="phonepv"><div className="scr"><div className="bar" /><div className="hd"><b>Your documents</b><span>{needed.filter(k => k.need === 'Required').length} needed · {needed.filter(k => k.need !== 'Required').length} if they apply</span></div>
            <div className="bd">{needed.map(k => <div key={k.id} className="it"><i />{k.name}<em>{k.need === 'Required' ? 'Needed' : k.need === 'Optional' ? 'Optional' : 'If it applies'}</em></div>)}
              {role === 'contractor' && <span className="rl">Insurance cover at least {money(+(d.rules.find(r => r.id === 'cover')?.value ?? 0))} · DBS from the last {d.rules.find(r => r.id === 'dbs')?.value} years</span>}
              {role === 'tenant' && <span className="rl">Income needed: {d.rules.find(r => r.id === 'afford')?.value} × the monthly rent</span>}</div>
            <div className="ft"><span>Send to LSP</span></div></div></div>
        </Card>
      </div>
    </div>
    <SaveBar dirty={x.dirty} onUndo={x.undo} blocked={blocked} important={important ? 'Changing what people must provide is important, so the reason is saved.' : false}
      note={x.dirty ? summary().slice(0, 2).join('; ') + (summary().length > 2 ? '…' : '') : 'New rules apply to people who join after you save.'}
      onSave={reason => { const sm = summary(); s.commit('onboarding', { ...db.onboarding, [role]: { ...d, askExisting: 'No' } as O }, { page: LABEL[ROUTE[role]], item: d.title, what: `${sm.length} change${sm.length === 1 ? '' : 's'} to onboarding`, before: '—', after: sm.join(' · '), reason }, d.askExisting === 'Yes' ? 'Saved. People already on the platform are asked next time they sign in.' : 'Saved'); }} />
    {doc && <DocDrawer doc={doc} onChange={p => setDoc(doc.id, p)} onRemove={() => { x.patch({ docs: d.docs.filter(k => k.id !== doc.id) }); setOpen(null); }} onClose={() => setOpen(null)} />}
  </>;
}

function DocDrawer({ doc, onChange, onRemove, onClose }: { doc: OnbDoc; onChange: (p: Partial<OnbDoc>) => void; onRemove: () => void; onClose: () => void }) {
  return <Drawer title={doc.name || 'Document'} sub="Changes are kept on this page until you press Save" onClose={onClose}
    footer={<div className="flex grow between">{!doc.core ? <Btn kind="ghost" icon={<Trash2 size={16} />} onClick={onRemove}>Remove document</Btn> : <Locked why="The flow needs this document.">Needed by the flow</Locked>}<Btn icon={<Check size={16} />} onClick={onClose}>Done</Btn></div>}>
    <Field label="Name"><Text value={doc.name} onChange={v => onChange({ name: v })} /></Field>
    <Field label="Who uploads it"><Text value={doc.who} onChange={v => onChange({ who: v })} /></Field>
    <div className="grid g2">
      <Field label="Needed"><Select value={doc.need} onChange={v => onChange({ need: v as OnbDoc['need'] })} options={(doc.core ? ['Required'] : ['Required', 'Optional', 'Only if needed']).map(v => ({ value: v, label: v }))} /></Field>
      <Field label="Checked by"><Select value={doc.checkedBy} onChange={v => onChange({ checkedBy: v as OnbDoc['checkedBy'] })} options={['Office Admin', 'Supervisor'].map(v => ({ value: v, label: v }))} /></Field>
    </div>
    {doc.need === 'Only if needed' && <Field label="When is it needed?"><Text value={doc.when ?? ''} onChange={v => onChange({ when: v })} placeholder="e.g. When the landlord lives outside the UK" /></Field>}
    <label className="check"><Toggle on={doc.endDate} onChange={v => onChange({ endDate: v, remind: v ? (doc.remind.length ? doc.remind : [30]) : [] })} label="Has an end date" />It has an end date (insurance, ID, certificates)</label>
    {doc.endDate && <>
      <Field label="Remind them (days before it ends)"><ChipsInput label="Reminder days" value={doc.remind.map(String)} onChange={v => onChange({ remind: v.map(Number).filter(n => n > 0) })} placeholder="e.g. 60" /></Field>
      <Field label="When it ends"><Select value={doc.onEnd} onChange={v => onChange({ onEnd: v as OnEnd })} options={ENDS.map(v => ({ value: v, label: v }))} /></Field>
    </>}
    <Field label="Note for staff (optional)"><textarea className="input" value={doc.detail ?? ''} onChange={e => onChange({ detail: e.target.value || undefined })} /></Field>
  </Drawer>;
}
