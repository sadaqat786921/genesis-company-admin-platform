import { useState } from 'react';
import { BadgePercent, Plus, Trash2, Wrench, Barcode, Search } from 'lucide-react';
import { useStore, money } from '../store';
import { fromInput, toInput } from '../data';
import { Card, Chip, Btn, Field, Text, Select, Modal, Empty, Tabs, Facts, MoreMenu, Note, InfoTip, Drawer, MiniSearch } from '../ui';
import { Head } from '../Shell';
import { useDraft, SaveBar, Toggle, ListEditor, DeleteModal, ReasonModal, MultiPick, ChipsInput, changed } from '../admin';
import type { Plan, Service, Product, SvcGroup } from '../seed';

/* ============================ Plans ============================ */
/** Business › Plans: 10% Management Only, 12%, 16% and 20% with job limits. Changes apply to new agreements from a chosen date. */
export function Plans() {
  const s = useStore();
  if (s.detail) return <PlanPage id={s.detail} />;
  return <PlanList />;
}
function PlanList() {
  const s = useStore(); const { db } = s; const [add, setAdd] = useState(false);
  const x = useDraft(db.tax.budgetAlerts.map(String));
  const nums = x.d.map(Number).filter(n => n > 0 && n <= 100).sort((a, b) => a - b);
  return <>
    <Head r="plans" action={<Btn icon={<Plus size={16} />} onClick={() => setAdd(true)}>Add a plan</Btn>} />
    <div className="grid g4">{db.plans.map(p => <button key={p.id} className="card" style={{ textAlign: 'left', cursor: 'pointer', font: 'inherit', gap: 10 }} onClick={() => s.go('plans', p.id)}>
      <div className="flex between"><span className="tile t-brand"><BadgePercent size={18} /></span>{p.web ? <Chip tone="ok">On the website</Chip> : <Chip>Hidden</Chip>}</div>
      <div className="stack"><b className="h2">{p.name}</b><span className="bigline">{p.fee}%<span className="caption" style={{ marginLeft: 6 }}>of rent</span></span></div>
      <Facts items={[['Job limit', p.limit ? money(p.limit) : 'No repairs'], ['Landlords', p.landlords]]} />
      <span className="caption">From {p.from}</span>
    </button>)}</div>
    <Card title={<span className="clean-h">Repair budget<InfoTip>Each managed home has a yearly repair budget. Approved jobs take the covered amount off it once.</InfoTip></span>}>
      <div className="grid g2">
        <div className="col" style={{ gap: 6 }}><span className="label">How the budget is worked out</span><div className="flex"><b>20% of the plan fee before VAT × 12</b><span className="lockchip">Set by the client</span></div><span className="caption">Management Only has no budget.</span></div>
        <Field label="Alert the landlord and Office Admin at (% used)"><ChipsInput label="Budget alerts" value={x.d} onChange={v => x.set(v.filter(n => /^\d{1,3}$/.test(n)))} placeholder="Add a %" /></Field>
      </div>
    </Card>
    <SaveBar dirty={x.dirty} onUndo={x.undo} blocked={!nums.length ? 'Keep at least one alert.' : ''} onSave={() => s.commit('tax', { ...db.tax, budgetAlerts: nums }, { page: 'Plans', item: 'Repair budget alerts', what: 'Changed the budget alerts', before: db.tax.budgetAlerts.join('%, ') + '%', after: nums.join('%, ') + '%' })} />
    {add && <AddPlan onClose={() => setAdd(false)} />}
  </>;
}
function AddPlan({ onClose }: { onClose: () => void }) {
  const s = useStore(); const { db } = s;
  const [name, setName] = useState(''); const [fee, setFee] = useState('14'); const [limit, setLimit] = useState('175');
  const dupFee = db.plans.some(p => p.fee === +fee);
  const ok = name.trim() && +fee > 0 && +fee < 50 && !dupFee;
  return <Modal title="Add a plan" sub="New plans are hidden from the website until you switch them on." onClose={onClose} footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn icon={<Plus size={16} />} disabled={!ok} onClick={() => {
    const p: Plan = { id: 'PL' + fee + Date.now().toString().slice(-3), name: name.trim(), fee: +fee, limit: +limit || null, budget: !!+limit, included: ['Everything in Management Only'], web: false, landlords: 0, from: '1 Jan 2027', desc: '' };
    s.commit('plans', [...db.plans, p].sort((a, b) => a.fee - b.fee), { page: 'Plans', item: p.name, what: 'Added a plan', after: `${p.fee}% · job limit ${p.limit ? money(p.limit) : 'none'} · hidden` }, `${p.name} added`); onClose(); s.go('plans', p.id);
  }}>Add plan</Btn></>}>
    <Field label="Plan name"><Text value={name} onChange={setName} placeholder="e.g. Plus" /></Field>
    <div className="grid g2"><Field label="Fee (% of rent)"><Text type="number" value={fee} onChange={setFee} /></Field><Field label="Job limit (£)" hint="0 = no repairs included"><Text type="number" value={limit} onChange={setLimit} /></Field></div>
    {dupFee && <Note tone="err">There is already a {fee}% plan.</Note>}
  </Modal>;
}
function PlanPage({ id }: { id: string }) {
  const s = useStore(); const { db } = s; const p0 = db.plans.find(p => p.id === id);
  const x = useDraft((p0 ?? {}) as Plan); const [del, setDel] = useState(false);
  if (!p0) return <><Head r="plans" extra="Not found" back /><Empty>This plan was removed.</Empty></>;
  const d = x.d;
  const labels: Partial<Record<keyof Plan, string>> = { name: 'Name', fee: 'Fee %', limit: 'Job limit', included: "What's included", web: 'On the website', from: 'Applies from', desc: 'Description' };
  const blocked = !d.name.trim() ? 'The plan needs a name.' : !(d.fee > 0 && d.fee < 50) ? 'The fee must be between 1% and 49%.' : d.budget && !(d.limit && d.limit > 0) ? 'Set the job limit, or switch repairs off.' : !d.from ? 'Choose the date the change applies from.' : '';
  return <>
    <Head r="plans" extra={p0.name} title={`${p0.name} · ${p0.fee}%`} back action={<MoreMenu label="···" items={[{ label: 'Delete this plan', icon: <Trash2 size={16} />, danger: true, onClick: () => setDel(true) }]} />} />
    <Card><Facts items={[['Landlords on it', p0.landlords], ['Fee', `${p0.fee}% of rent`], ['Job limit', p0.limit ? money(p0.limit) : 'No repairs included'], ['Maintenance budget', p0.budget ? '20% of fee × 12' : 'None'], ['Applies from', p0.from]]} /></Card>
    <div className="adm-split">
      <div className="col">
        <Card title="Plan">
          <div className="grid g2">
            <Field label="Name"><Text value={d.name} onChange={v => x.patch({ name: v })} /></Field>
            <Field label="Fee (% of rent, before VAT)"><Text type="number" value={String(d.fee)} onChange={v => x.patch({ fee: +v || 0 })} /></Field>
          </div>
          <label className="check"><Toggle on={d.budget} onChange={v => x.patch({ budget: v, limit: v ? (d.limit ?? 150) : null })} label="Repairs covered by the plan" />Repairs covered by the plan (job limit and maintenance budget)</label>
          {d.budget && <Field label="Job limit (£)" hint="Jobs over this go to the Supervisor."><Text type="number" value={String(d.limit ?? '')} onChange={v => x.patch({ limit: +v || 0 })} /></Field>}
          <Field label="Short description (website and sign-up)"><textarea className="input" value={d.desc} onChange={e => x.patch({ desc: e.target.value })} /></Field>
          <label className="check"><Toggle on={d.web} onChange={v => x.patch({ web: v })} label="Show on the website" />Show on the website</label>
        </Card>
        <Card title="What's included"><ListEditor label="Included" items={d.included} onChange={v => x.patch({ included: v })} min={1} placeholder="e.g. Quarterly inspections" /></Card>
        <Card title="When the change applies">
          <Field label="Applies to new agreements from"><input className="input" type="date" value={toInput(d.from)} onChange={e => x.patch({ from: fromInput(e.target.value) })} /></Field>
          <Note>Landlords already on this plan keep their current terms until their agreement is renewed. They are told by email.</Note>
        </Card>
      </div>
      <div className="sticky"><Card title="On the website">
        <div className="lp-plan" style={{ border: '1px solid var(--border-default)', borderRadius: 18, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <b className="h2">{d.name || 'Plan name'}</b><span className="bigline">{d.fee}%<span className="caption" style={{ marginLeft: 6 }}>of rent{d.budget && d.limit ? ` · repairs up to ${money(d.limit)}` : ''}</span></span>
          <span className="small">{d.desc}</span>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5 }}>{d.included.map((i, k) => <li key={k}>{i}</li>)}</ul>
          {!d.web && <Chip>Hidden from the website</Chip>}
        </div>
      </Card></div>
    </div>
    <SaveBar dirty={x.dirty} onUndo={x.undo} blocked={blocked} important="Plan changes affect what landlords pay, so the reason is saved in the Audit history."
      onSave={reason => s.commit('plans', db.plans.map(p => p.id === id ? d : p), { page: 'Plans', item: d.name, ...changed(p0, d, labels), reason })} />
    {del && (p0.landlords === 0 ? <DeleteModal what={`the ${p0.name} plan`} onClose={() => setDel(false)} onDone={reason => { s.commit('plans', db.plans.filter(p => p.id !== id), { page: 'Plans', item: p0.name, what: 'Deleted a plan', before: `${p0.fee}%`, reason }, 'Plan deleted'); s.go('plans'); }} />
      : <Modal title="This plan can't be deleted" sub={`${p0.landlords} landlords are on it. Hide it from the website so no one new can choose it.`} onClose={() => setDel(false)} footer={<Btn onClick={() => setDel(false)}>OK</Btn>} />)}
  </>;
}

/* ============================ Services ============================ */
const GROUPS: SvcGroup[] = ['Safety checks', 'Repairs', 'Tenancy changeover', 'Management'];
const blankService = (): Service => ({ id: 'S' + Date.now(), name: '', group: 'Repairs', to: ['Landlords', 'Letting agents'], price: 0, per: 'fixed', trade: '', on: true, desc: '' });
/** Business › Services & prices: what LSP offers landlords and letting agents, with guide prices. */
export function Services() {
  const s = useStore(); const { db } = s;
  const [tab, setTab] = useState<'all' | 'Landlords' | 'Letting agents'>('all'); const [q, setQ] = useState(''); const [g, setG] = useState('all');
  const [off, setOff] = useState<Service | null>(null); const [add, setAdd] = useState(false);
  const list = db.services.filter(x => (tab === 'all' || x.to.includes(tab)) && (g === 'all' || x.group === g) && (x.name + ' ' + x.trade).toLowerCase().includes(q.toLowerCase()));
  const open = s.detail ? db.services.find(x => x.id === s.detail) : null;
  const flip = (x: Service, on: boolean, reason?: string) => s.commit('services', db.services.map(y => y.id === x.id ? { ...y, on } : y), { page: 'Services & prices', item: x.name, what: on ? 'Switched a service on' : 'Switched a service off', before: on ? 'Off' : 'On', after: on ? 'On' : 'Off', reason }, on ? `${x.name} is offered again` : `${x.name} switched off`);
  return <>
    <Head r="services" action={<Btn icon={<Plus size={16} />} onClick={() => setAdd(true)}>Add a service</Btn>} />
    <Card title={<span className="clean-h">What LSP offers<InfoTip>Shown on the website, in the letting agent portal's Services & Prices, and when staff book work. Prices are guide prices: the quote has the real price.</InfoTip></span>}
      action={<Tabs value={tab} onChange={setTab} items={[{ id: 'all', label: 'All', count: db.services.length }, { id: 'Landlords', label: 'Landlords' }, { id: 'Letting agents', label: 'Letting agents' }]} />}>
      <div className="toolbar"><MiniSearch value={q} onChange={setQ} placeholder="Search services" /><select className="fsel" aria-label="Group" value={g} onChange={e => setG(e.target.value)}><option value="all">All groups</option>{GROUPS.map(x => <option key={x}>{x}</option>)}</select><span className="caption">{list.length} shown</span></div>
      {list.length ? <div className="tablewrap"><table className="t"><thead><tr><th>Service</th><th>Group</th><th>Offered to</th><th>Guide price</th><th>Done by</th><th>Offered</th></tr></thead><tbody>
        {list.map(x => <tr key={x.id} onClick={() => s.go('services', x.id)}>
          <td><span className="stack"><b className="strong">{x.name}</b>{x.often && <span className="caption">{x.often}</span>}</span></td><td>{x.group}</td>
          <td><span className="flex wrap" style={{ gap: 4 }}>{x.to.map(t => <Chip key={t} dot={false}>{t}</Chip>)}</span></td>
          <td className="strong">{x.per === 'included' ? 'Included' : `${x.per === 'from' ? 'From ' : ''}${money(x.price)}${!['fixed', 'from'].includes(x.per) ? ' · ' + x.per : ''}`}</td><td>{x.trade}</td>
          <td><Toggle on={x.on} label={`Offer ${x.name}`} onChange={v => v ? flip(x, true) : setOff(x)} /></td>
        </tr>)}
      </tbody></table></div> : <Empty icon={<Wrench size={22} />}>No services match. Clear the search or add one.</Empty>}
    </Card>
    {off && <ReasonModal title={`Stop offering ${off.name}?`} sub="It disappears from the website and the booking forms. Jobs already booked carry on." cta="Switch off" onClose={() => setOff(null)} onDone={r => { flip(off, false, r); setOff(null); }} />}
    {(open || add) && <ServiceDrawer svc={open ?? blankService()} isNew={!open} onClose={() => { setAdd(false); if (open) s.go('services'); }} />}
  </>;
}
function ServiceDrawer({ svc, isNew, onClose }: { svc: Service; isNew: boolean; onClose: () => void }) {
  const s = useStore(); const { db } = s; const x = useDraft(svc); const d = x.d; const [del, setDel] = useState(false);
  const labels: Partial<Record<keyof Service, string>> = { name: 'Name', group: 'Group', to: 'Offered to', price: 'Guide price', per: 'Price is', trade: 'Done by', desc: 'Description', often: 'How often' };
  const blocked = !d.name.trim() ? 'Give the service a name.' : !d.to.length ? 'Choose who it is offered to.' : '';
  return <Drawer title={isNew ? 'Add a service' : svc.name} sub={isNew ? 'It is offered as soon as you save.' : `${svc.group} · ${svc.on ? 'offered' : 'switched off'}`} onClose={onClose}
    footer={<div className="col grow" style={{ gap: 10 }}>
      {!isNew && <div><Btn sm kind="ghost" icon={<Trash2 size={14} />} onClick={() => setDel(true)}>Delete this service</Btn></div>}
      <SaveBar dirty={isNew ? !!d.name.trim() : x.dirty} onUndo={x.undo} blocked={blocked} saveLabel={isNew ? 'Add service' : 'Save changes'}
        onSave={() => { if (isNew) { s.commit('services', [...db.services, d], { page: 'Services & prices', item: d.name, what: 'Added a service', after: `${d.group} · ${money(d.price)} ${d.per}` }, `${d.name} added`); } else { s.commit('services', db.services.map(y => y.id === d.id ? d : y), { page: 'Services & prices', item: d.name, ...changed(svc, d, labels) }); } onClose(); }} />
    </div>}>
    <Field label="Name"><Text value={d.name} onChange={v => x.patch({ name: v })} /></Field>
    <div className="grid g2"><Field label="Group"><Select value={d.group} onChange={v => x.patch({ group: v as SvcGroup })} options={GROUPS.map(g => ({ value: g, label: g }))} /></Field>
      <Field label="Done by (trade)"><Select value={d.trade} onChange={v => x.patch({ trade: v })} options={[{ value: '', label: 'Choose' }, { value: '—', label: 'LSP staff' }, ...db.picklists.find(p => p.id === 'PK10')!.items.map(t => ({ value: t, label: t }))]} /></Field></div>
    <Field label="Offered to"><MultiPick label="Offered to" options={['Landlords', 'Letting agents'] as const} value={d.to} onChange={v => x.patch({ to: v })} /></Field>
    <div className="grid g2"><Field label="Guide price (£)"><Text type="number" value={String(d.price)} onChange={v => x.patch({ price: Math.max(0, +v || 0) })} /></Field>
      <Field label="Price is"><Select value={d.per} onChange={v => x.patch({ per: v })} options={['fixed', 'from', 'each', 'an hour', 'call-out + £45 an hour', 'included'].map(v => ({ value: v, label: v === 'fixed' ? 'A fixed price' : v === 'from' ? 'A starting price' : v }))} /></Field></div>
    <Field label="How often (optional)"><Text value={d.often ?? ''} onChange={v => x.patch({ often: v || undefined })} placeholder="e.g. Every year" /></Field>
    <Field label="Description"><textarea className="input" value={d.desc} onChange={e => x.patch({ desc: e.target.value })} /></Field>
    {del && <DeleteModal what={svc.name} detail="It disappears from the website and booking forms. Jobs already booked carry on." onClose={() => setDel(false)} onDone={reason => { s.commit('services', db.services.filter(y => y.id !== svc.id), { page: 'Services & prices', item: svc.name, what: 'Deleted a service', before: svc.group, reason }, 'Service deleted'); onClose(); }} />}
  </Drawer>;
}

/* ============================ Products ============================ */
/** Business › Products & codes: the saved list staff search when they build a quote or invoice. Customers see the name, never the code. */
export function Products() {
  const s = useStore(); const { db } = s;
  const [q, setQ] = useState(''); const [k, setK] = useState('all'); const [show, setShow] = useState<'on' | 'all'>('all'); const [add, setAdd] = useState(false);
  const list = db.products.filter(p => (k === 'all' || p.kind === k) && (show === 'all' || p.on) && (p.code + ' ' + p.name + ' ' + p.desc).toLowerCase().includes(q.toLowerCase()));
  const open = s.detail ? db.products.find(p => p.code === s.detail) : null;
  return <>
    <Head r="products" action={<Btn icon={<Plus size={16} />} onClick={() => setAdd(true)}>Add a product or service</Btn>} />
    <Card title={<span className="clean-h">Saved products and services<InfoTip>Staff search this list by code or name in Create quote and Create invoice. Staff can also add a new one from the quote, which shows here.</InfoTip></span>}
      action={<Tabs value={show} onChange={setShow} items={[{ id: 'all', label: 'All', count: db.products.length }, { id: 'on', label: 'In use', count: db.products.filter(p => p.on).length }]} />}>
      <div className="toolbar"><MiniSearch value={q} onChange={setQ} placeholder="Search code or name" /><select className="fsel" aria-label="Type" value={k} onChange={e => setK(e.target.value)}><option value="all">All types</option>{['Service', 'Labour', 'Material'].map(x => <option key={x}>{x}</option>)}</select><span className="caption">{list.length} shown</span></div>
      {list.length ? <div className="tablewrap"><table className="t"><thead><tr><th>Code</th><th>Name and description</th><th>Type</th><th>Price</th><th>Used on quotes</th><th>In use</th></tr></thead><tbody>
        {list.map(p => <tr key={p.code} onClick={() => s.go('products', p.code)}>
          <td><b className="strong mono">{p.code}</b></td><td><span className="stack"><b className="strong">{p.name}</b><span className="caption">{p.desc}</span></span></td><td>{p.kind}</td><td className="strong">{money(p.rate)}</td><td>{p.used}</td>
          <td><Toggle on={p.on} label={`${p.code} in use`} onChange={v => s.commit('products', db.products.map(y => y.code === p.code ? { ...y, on: v } : y), { page: 'Products & codes', item: p.code, what: v ? 'Switched on' : 'Switched off (hidden from new quotes)', before: v ? 'Off' : 'On', after: v ? 'On' : 'Off' }, v ? `${p.code} can be used again` : `${p.code} hidden from new quotes`)} /></td>
        </tr>)}
      </tbody></table></div> : <Empty icon={<Search size={22} />}>No products match.</Empty>}
    </Card>
    {(open || add) && <ProductDrawer p={open ?? { code: '', name: '', desc: '', rate: 0, kind: 'Service', on: true, used: 0 }} isNew={!open} onClose={() => { setAdd(false); if (open) s.go('products'); }} />}
  </>;
}
function ProductDrawer({ p, isNew, onClose }: { p: Product; isNew: boolean; onClose: () => void }) {
  const s = useStore(); const { db } = s; const x = useDraft(p); const d = x.d; const [del, setDel] = useState(false);
  const clash = d.code.trim() && db.products.some(y => y.code === d.code.trim() && y.code !== p.code);
  const blocked = !d.code.trim() ? 'Add a code.' : clash ? 'That code is already used.' : !d.name.trim() ? 'Add a name.' : '';
  const labels: Partial<Record<keyof Product, string>> = { code: 'Code', name: 'Name', desc: 'Description', rate: 'Price', kind: 'Type' };
  return <Drawer title={isNew ? 'Add a product or service' : p.code} sub={isNew ? 'Staff can use it on quotes and invoices straight away.' : `${p.name} · used on ${p.used} quotes`} icon={<span className="tile t-brand"><Barcode size={18} /></span>} onClose={onClose}
    footer={<div className="col grow" style={{ gap: 10 }}>
      {!isNew && <div><Btn sm kind="ghost" icon={<Trash2 size={14} />} onClick={() => setDel(true)}>Delete</Btn></div>}
      <SaveBar dirty={isNew ? !!d.code.trim() : x.dirty} onUndo={x.undo} blocked={blocked} saveLabel={isNew ? 'Add' : 'Save changes'}
        onSave={() => { const n = { ...d, code: d.code.trim().toUpperCase() }; if (isNew) s.commit('products', [...db.products, n], { page: 'Products & codes', item: n.code, what: 'Added a product or service', after: `${n.name} · ${money(n.rate)}` }, `${n.code} added`); else s.commit('products', db.products.map(y => y.code === p.code ? n : y), { page: 'Products & codes', item: n.code, ...changed(p, n, labels) }); onClose(); }} />
    </div>}>
    <div className="grid g2"><Field label="Code" hint="Staff see it; customers never do."><Text value={d.code} onChange={v => x.patch({ code: v.toUpperCase() })} placeholder="e.g. BOILER/SVC" /></Field>
      <Field label="Type"><Select value={d.kind} onChange={v => x.patch({ kind: v as Product['kind'] })} options={['Service', 'Labour', 'Material'].map(v => ({ value: v, label: v }))} /></Field></div>
    <Field label="Name (on the quote)"><Text value={d.name} onChange={v => x.patch({ name: v })} /></Field>
    <Field label="Description (on the quote)"><textarea className="input" value={d.desc} onChange={e => x.patch({ desc: e.target.value })} /></Field>
    <Field label="Price (£, before VAT)"><Text type="number" value={String(d.rate)} onChange={v => x.patch({ rate: Math.max(0, +v || 0) })} /></Field>
    {!isNew && p.used > 0 && <Note>Quotes and invoices already sent keep the old name and price.</Note>}
    {del && (p.used === 0 ? <DeleteModal what={p.code} onClose={() => setDel(false)} onDone={reason => { s.commit('products', db.products.filter(y => y.code !== p.code), { page: 'Products & codes', item: p.code, what: 'Deleted a product or service', before: p.name, reason }, `${p.code} deleted`); onClose(); }} />
      : <Modal title="It has been used, so it can't be deleted" sub={`${p.code} is on ${p.used} quotes and invoices. Switch it off instead: it stays on old documents but staff can't add it to new ones.`} onClose={() => setDel(false)}
        footer={<><Btn kind="outline" onClick={() => setDel(false)}>Cancel</Btn><Btn onClick={() => { s.commit('products', db.products.map(y => y.code === p.code ? { ...y, on: false } : y), { page: 'Products & codes', item: p.code, what: 'Switched off (hidden from new quotes)', before: 'On', after: 'Off' }, `${p.code} hidden from new quotes`); setDel(false); onClose(); }}>Switch it off</Btn></>} />)}
  </Drawer>;
}
