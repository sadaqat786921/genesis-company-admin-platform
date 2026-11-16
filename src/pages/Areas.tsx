import { useState } from 'react';
import { Plus, Trash2, Download, Users, Search, ArrowRightLeft, Share2, Inbox, Check, X, MapPin, Lock } from 'lucide-react';
import { useStore, personName, staffOptions, districtOf, areasFor, homesOf, landlordsOf, type Db } from '../store';
import { nowStamp, fromInput, toInput, ME_NAME } from '../data';
import { Card, Chip, Btn, Field, Text, Select, Modal, Empty, Tabs, Facts, Avatar, MoreMenu, Note, InfoTip } from '../ui';
import { Head } from '../Shell';
import { useDraft, SaveBar, DeleteModal, ReasonModal, MultiPick, changed, downloadCsv } from '../admin';
import { statusTone } from './lib';
import type { Area, ShareReq } from '../seed';

/* Business › Areas. London is split into Supervisor areas by postcode district (proposal "Supervisor areas and holiday cover").
   Each area has ONE Supervisor and their own team of Office Admins. A Supervisor only ever sees their own area.
   Only the Admin creates areas, sets districts, approves a shared district and places homes that match no area. */

const OFF_MSG = "We don't cover your area yet. Leave your details and we'll tell you when we do.";
/** Colour per area number, as on the area map. */
export const AREA_TONE = ['brand', 'brand', 'info', 'ok', 'warn'] as const;
export const areaLabel = (a: Area) => `Area ${a.n} · ${a.name}`;
/** Example: how many homes sit in a district today (used to show what moves on a transfer). */
const HOMES_IN: Record<string, number> = { N1: 4, N6: 3, N8: 4, N17: 1, N19: 2, N3: 1, N10: 2, N4: 2, N2: 0 };

export function Areas() {
  const s = useStore();
  if (s.detail) return <AreaPage id={s.detail} />;
  return <AreaList />;
}

function AreaList() {
  const s = useStore(); const { db } = s;
  const [tab, setTab] = useState<'areas' | 'needs' | 'shared'>('areas'); const [add, setAdd] = useState(false);
  const waiting = db.shares.filter(r => r.status === 'Waiting').length;
  return <>
    <Head r="areas" action={tab === 'areas' ? <Btn icon={<Plus size={16} />} onClick={() => setAdd(true)}>Add an area</Btn> : undefined} />
    <Tabs value={tab} onChange={setTab} items={[{ id: 'areas', label: 'Supervisor areas', count: db.areas.length }, { id: 'needs', label: 'Needs an area', count: db.unmatched.length }, { id: 'shared', label: 'Shared districts', count: waiting || undefined }]} />
    {tab === 'areas' && <>
      <div className="grid g4">{[...db.areas].sort((a, b) => a.n - b.n).map(a => <AreaCard key={a.id} a={a} db={db} onOpen={() => s.go('areas', a.id)} />)}</div>
      <div className="grid g2">
        <PostcodeCheck />
        <Card title={<span className="clean-h">How it works<InfoTip>From the proposal agreed on 28 October: one Supervisor portal, many Supervisors. Each one sees only the homes in their own area, with their own Office Admins.</InfoTip></span>}>
          <div className="col" style={{ gap: 8 }}>
            {['Each postcode district belongs to one area.', 'New homes and enquiries find their Supervisor by postcode. Nobody sorts them by hand.', 'No match, or more than one: the home waits in “Needs an area” for you.', 'A Supervisor never sees another area’s homes, not even through a link. Only you can widen access.'].map(t => <div key={t} className="flex" style={{ alignItems: 'flex-start' }}><Check size={15} color="var(--ok)" style={{ marginTop: 2, flex: 'none' }} /><span className="small" style={{ color: 'var(--text-secondary)' }}>{t}</span></div>)}
          </div>
        </Card>
      </div>
    </>}
    {tab === 'needs' && <NeedsArea />}
    {tab === 'shared' && <SharedDistricts />}
    {add && <AddArea onClose={() => setAdd(false)} />}
  </>;
}

function AreaCard({ a, db, onOpen }: { a: Area; db: Db; onOpen: () => void }) {
  const tone = AREA_TONE[a.n] ?? 'brand';
  return <button className="card areacard" onClick={onOpen} style={{ textAlign: 'left', font: 'inherit', cursor: 'pointer', padding: 0, gap: 0, overflow: 'hidden' }}>
    <div className={`ac-h t-${tone}`}><span className="ac-n">{a.n}</span><div className="stack grow"><b>{a.name}</b><span>{a.status === 'Planned' ? `Opens ${a.opens}` : a.status === 'Live' ? 'Live' : 'Off'}</span></div></div>
    <div className="col" style={{ gap: 12, padding: 16 }}>
      <div className="flex" style={{ gap: 10 }}>{a.supervisor ? <Avatar id={a.supervisor} name={personName(db, a.supervisor)} /> : <span className="tile t-neutral" style={{ width: 32, height: 32 }}><Users size={15} /></span>}
        <div className="stack grow"><b className="small" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{a.supervisor ? personName(db, a.supervisor) : 'No Supervisor yet'}</b><span className="caption">Supervisor</span></div></div>
      <div className="flex wrap" style={{ gap: 4 }}>{a.postcodes.slice(0, 6).map(p => <span key={p} className="pcd">{p}</span>)}{a.postcodes.length > 6 && <span className="pcd more">+{a.postcodes.length - 6}</span>}</div>
      <div className="ac-f"><span><b>{a.oas.length}</b> Office Admins</span><span><b>{homesOf(db, a.id)}</b> homes</span><span><b>{a.postcodes.length}</b> districts</span></div>
    </div>
  </button>;
}

/** Type a full postcode and see which area it goes to, using exact matching. */
function PostcodeCheck() {
  const { db } = useStore(); const [pc, setPc] = useState('N2 9RF');
  const d = pc.trim() ? districtOf(pc) : ''; const hits = pc.trim() ? areasFor(db, pc) : [];
  return <Card title={<span className="clean-h"><Search size={16} />Check a postcode</span>} sub="Exact matching: N20 is not N2, and E1W is not E1">
    <Field label="Full postcode"><Text value={pc} onChange={v => setPc(v.toUpperCase())} placeholder="e.g. N2 9RF" /></Field>
    {d && (hits.length === 1 ? <div className="alertbar a-ok"><MapPin size={16} /><b className="grow">{pc} → {d} → {areaLabel(hits[0])}<span className="caption" style={{ marginLeft: 8, fontWeight: 500 }}>Supervisor {hits[0].supervisor ? personName(db, hits[0].supervisor) : 'not chosen yet'}</span></b></div>
      : <div className="alertbar a-warn"><Inbox size={16} /><b className="grow">{pc} → {d} → {hits.length ? `${hits.length} areas match` : 'no area'}<span className="caption" style={{ marginLeft: 8, fontWeight: 500 }}>It goes to “Needs an area” for you to place</span></b></div>)}
  </Card>;
}

function NeedsArea() {
  const s = useStore(); const { db } = s; const [place, setPlace] = useState<string | null>(null);
  const item = db.unmatched.find(u => u.id === place);
  return <Card title={<span className="clean-h">Homes waiting for an area<InfoTip>Their postcode matched no area, or more than one. They are never hidden or lost: they wait here until you choose the area. Your choice is saved in the history.</InfoTip></span>}>
    {db.unmatched.length ? <div className="tablewrap"><table className="t"><thead><tr><th>Home or enquiry</th><th>District</th><th>Came from</th><th>Why</th><th /></tr></thead><tbody>
      {db.unmatched.map(u => <tr key={u.id} className="static"><td><span className="stack"><b className="strong">{u.address}</b><span className="caption">{u.postcode} · {u.at}</span></span></td><td><span className="pcd">{districtOf(u.postcode)}</span></td><td className="small">{u.source}</td><td><Chip tone="warn">{u.why}</Chip></td>
        <td><Btn sm onClick={() => setPlace(u.id)}>Choose area</Btn></td></tr>)}
    </tbody></table></div> : <Empty icon={<Inbox size={22} />}>Nothing is waiting. Every home has an area.</Empty>}
    {item && <PlaceModal item={item} onClose={() => setPlace(null)} />}
  </Card>;
}
function PlaceModal({ item, onClose }: { item: Db['unmatched'][number]; onClose: () => void }) {
  const s = useStore(); const { db } = s; const d = districtOf(item.postcode);
  const [area, setArea] = useState(db.areas.find(a => a.status === 'Live')?.id ?? db.areas[0].id); const [addDist, setAddDist] = useState(true);
  const a = db.areas.find(z => z.id === area)!; const owner = db.areas.find(z => z.postcodes.includes(d) && z.id !== area);
  return <Modal title={`Choose the area for ${item.address}`} sub={`${item.postcode} · ${item.why}`} onClose={onClose} footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn icon={<Check size={16} />} onClick={() => {
    const areas = addDist && !owner ? db.areas.map(z => z.id === area ? { ...z, postcodes: [...z.postcodes, d] } : z) : db.areas;
    s.commitMany({ unmatched: db.unmatched.filter(u => u.id !== item.id), areas }, [{ page: 'Areas', item: item.address, what: 'Placed a home in an area', before: `Needs an area (${item.why})`, after: `${areaLabel(a)} · Supervisor ${personName(db, a.supervisor)}${addDist && !owner ? ` · ${d} added to the area` : ''}` }], `Placed in ${areaLabel(a)}. ${a.supervisor ? personName(db, a.supervisor) + ' gets an alert.' : ''}`); onClose();
  }}>Place it here</Btn></>}>
    <Field label="Area"><Select value={area} onChange={setArea} options={db.areas.map(z => ({ value: z.id, label: `${areaLabel(z)}${z.status !== 'Live' ? ` (${z.status === 'Planned' ? 'opens ' + z.opens : 'off'})` : ''}` }))} /></Field>
    {a.status !== 'Live' && <Note tone="warn">{areaLabel(a)} is not live yet. The home waits there until it opens.</Note>}
    {!owner ? <label className="check"><input type="checkbox" checked={addDist} onChange={e => setAddDist(e.target.checked)} />Also add {d} to {a.name}, so future homes there go to it by themselves</label> : <Note>{d} already belongs to {areaLabel(owner)}.</Note>}
  </Modal>;
}

function SharedDistricts() {
  const s = useStore(); const { db } = s; const [act, setAct] = useState<{ r: ShareReq; k: 'approve' | 'reject' | 'end' } | null>(null);
  const nm = (id: string) => { const a = db.areas.find(z => z.id === id); return a ? areaLabel(a) : id; };
  const decide = (r: ShareReq, status: ShareReq['status'], reason: string) => { s.commit('shares', db.shares.map(z => z.id === r.id ? { ...z, status, decided: `${status === 'Approved' ? 'Approved' : status === 'Rejected' ? 'Rejected' : 'Ended'} by ${ME_NAME} · ${nowStamp()}` } : z), { page: 'Areas', item: `${r.district} shared with ${nm(r.to)}`, what: status === 'Approved' ? 'Approved a shared district' : status === 'Rejected' ? 'Rejected a shared district' : 'Ended a shared district', before: r.status, after: status === 'Approved' ? `${status} until ${r.until}` : status, reason }, status === 'Approved' ? `${r.district} shared until ${r.until}. It ends by itself.` : status === 'Rejected' ? 'Request rejected. Nothing changes.' : 'Sharing ended'); setAct(null); };
  return <Card title={<span className="clean-h">Districts shared between two areas<InfoTip>Only you approve. A Supervisor can never approve their own extra access. Even when a district is shared, the main Supervisor stays responsible, and the sharing ends by itself on its end date.</InfoTip></span>}>
    {db.shares.length ? <div className="tablewrap"><table className="t"><thead><tr><th>District</th><th>Belongs to</th><th>Shared with</th><th>Until</th><th>Asked by</th><th>Status</th><th /></tr></thead><tbody>
      {db.shares.map(r => <tr key={r.id} className="static"><td><span className="pcd">{r.district}</span></td><td className="small">{nm(r.owner)}</td><td className="small">{nm(r.to)}</td><td className="small">{r.until}</td>
        <td><span className="stack"><b className="small" style={{ color: 'var(--text-primary)' }}>{r.by}</b><span className="caption" style={{ maxWidth: 260 }}>{r.reason}</span></span></td>
        <td><span className="stack"><Chip tone={r.status === 'Waiting' ? 'warn' : r.status === 'Approved' ? 'ok' : 'neutral'}>{r.status}</Chip>{r.decided && <span className="caption">{r.decided}</span>}</span></td>
        <td>{r.status === 'Waiting' ? <span className="flex"><Btn sm kind="success" onClick={() => setAct({ r, k: 'approve' })}>Approve</Btn><Btn sm kind="outline" onClick={() => setAct({ r, k: 'reject' })}>Reject</Btn></span> : r.status === 'Approved' ? <Btn sm kind="outline" onClick={() => setAct({ r, k: 'end' })}>End now</Btn> : null}</td></tr>)}
    </tbody></table></div> : <Empty icon={<Share2 size={22} />}>No districts are shared.</Empty>}
    {act && <ReasonModal danger={act.k !== 'approve'} title={act.k === 'approve' ? `Share ${act.r.district} with ${nm(act.r.to)}?` : act.k === 'reject' ? 'Reject this request?' : `End sharing ${act.r.district} now?`}
      sub={act.k === 'approve' ? `Until ${act.r.until}. ${nm(act.r.owner)} stays responsible.` : act.k === 'reject' ? `Nothing changes. ${act.r.district} stays with ${nm(act.r.owner)} only.` : `${nm(act.r.to)} stops seeing homes in ${act.r.district} straight away.`}
      cta={act.k === 'approve' ? 'Approve' : act.k === 'reject' ? 'Reject' : 'End now'} onClose={() => setAct(null)} onDone={reason => decide(act.r, act.k === 'approve' ? 'Approved' : act.k === 'reject' ? 'Rejected' : 'Ended', reason)} />}
  </Card>;
}

function AddArea({ onClose }: { onClose: () => void }) {
  const s = useStore(); const { db } = s;
  const [name, setName] = useState(''); const [base, setBase] = useState(''); const [sup, setSup] = useState(''); const [opens, setOpens] = useState('2027-04-01');
  const n = Math.max(0, ...db.areas.map(a => a.n)) + 1;
  const dup = db.areas.some(a => a.name.toLowerCase() === name.trim().toLowerCase());
  const busy = sup ? db.areas.find(a => a.supervisor === sup) : undefined;
  const ok = name.trim() && !dup && !busy;
  return <Modal title={`Add area ${n}`} sub="It stays closed until the opening date. You add the postcode districts and Office Admins next." onClose={onClose} footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn icon={<Plus size={16} />} disabled={!ok} onClick={() => {
    const a: Area = { id: 'AR' + Date.now(), n, name: name.trim(), base: base.trim().toUpperCase(), postcodes: [], supervisor: sup, oas: [], status: 'Planned', opens: fromInput(opens), message: `We open in ${name.trim()} on ${fromInput(opens)}. Leave your details and we'll call you as soon as we start.`, tenants: 0, contractors: 0, waitlist: [], created: nowStamp() };
    s.commit('areas', [...db.areas, a], { page: 'Areas', item: areaLabel(a), what: 'Added an area', after: `Opens ${a.opens}${sup ? ' · Supervisor ' + personName(db, sup) : ''}` }, `${areaLabel(a)} added. Now add its districts.`);
    onClose(); s.go('areas', a.id);
  }}>Add area</Btn></>}>
    <Field label="Area name"><Text value={name} onChange={setName} placeholder="e.g. Outer East" /></Field>
    {dup && <Note tone="err">There is already an area with this name.</Note>}
    <div className="grid g2"><Field label="Supervisor's base (postcode)"><Text value={base} onChange={setBase} placeholder="e.g. E15 1AA" /></Field><Field label="Opening date"><input className="input" type="date" value={opens} onChange={e => setOpens(e.target.value)} /></Field></div>
    <Field label="Supervisor"><Select value={sup} onChange={setSup} options={[{ value: '', label: 'Choose later (invite one in Users)' }, ...staffOptions(db, 'Supervisor')]} /></Field>
    {busy && <Note tone="err">{personName(db, sup)} already runs {areaLabel(busy)}. Each Supervisor has one area; use holiday cover for short absences.</Note>}
  </Modal>;
}

/** One area: Supervisor, their Office Admins, postcode districts (with overlap checks), website message and waiting list. */
function AreaPage({ id }: { id: string }) {
  const s = useStore(); const { db } = s;
  const x = useDraft({ areas: db.areas, shares: db.shares });
  const [del, setDel] = useState(false); const [dist, setDist] = useState(''); const [taken, setTaken] = useState<{ d: string; owner: Area } | null>(null);
  const a0 = db.areas.find(a => a.id === id); const d = x.d.areas.find(a => a.id === id);
  if (!a0 || !d) return <><Head r="areas" extra="Not found" back /><Empty>This area was removed.</Empty></>;
  const patch = (p: Partial<Area>) => x.set(v => ({ ...v, areas: v.areas.map(a => a.id === id ? { ...a, ...p } : a) }));
  const oaOpts = staffOptions(db, 'Office Admin');
  const supOpts = staffOptions(db, 'Supervisor');
  const supBusy = d.supervisor ? x.d.areas.find(a => a.id !== id && a.supervisor === d.supervisor) : undefined;
  const homes = homesOf(db, id); const canDelete = homes === 0 && landlordsOf(db, id) === 0;
  const blocked = !d.name.trim() ? 'The area needs a name.' : supBusy ? `${personName(db, d.supervisor)} already runs ${areaLabel(supBusy)}.` : d.status === 'Live' && !d.supervisor ? 'A live area needs its Supervisor.' : d.status === 'Live' && !d.oas.length ? 'A live area needs at least one Office Admin.' : d.status === 'Live' && !d.postcodes.length ? 'A live area needs postcode districts.' : d.status === 'Planned' && !d.opens ? 'Choose the opening date.' : '';
  const addDistrict = () => {
    const v = districtOf(dist); if (!v) return; setDist('');
    if (d.postcodes.includes(v)) return;
    const owner = x.d.areas.find(a => a.id !== id && a.postcodes.includes(v));
    if (owner) setTaken({ d: v, owner }); else patch({ postcodes: [...d.postcodes, v] });
  };
  const setOas = (names: string[]) => { const ids = names.map(n => oaOpts.find(o => o.label === n)?.value ?? n); x.set(v => ({ ...v, areas: v.areas.map(a => a.id === id ? { ...a, oas: ids } : { ...a, oas: a.oas.filter(o => !ids.includes(o)) }) })); };
  const movedIn = d.oas.filter(o => !a0.oas.includes(o)).map(o => ({ o, from: db.areas.find(a => a.id !== id && a.oas.includes(o)) })).filter(m => m.from);
  const others = x.d.areas.filter(a => JSON.stringify(a) !== JSON.stringify(db.areas.find(z => z.id === a.id)) && a.id !== id);
  const newShares = x.d.shares.filter(r => !db.shares.find(z => z.id === r.id));
  const important = d.status !== a0.status || d.supervisor !== a0.supervisor || JSON.stringify(d.oas) !== JSON.stringify(a0.oas) || others.length > 0 || newShares.length > 0 || a0.postcodes.some(p => !d.postcodes.includes(p));
  const labels: Partial<Record<keyof Area, string>> = { name: 'Name', base: 'Base', postcodes: 'Districts', status: 'Status', opens: 'Opening date', message: 'Website message', supervisor: 'Supervisor', oas: 'Office Admins' };
  const shown = (v: Area) => ({ ...v, supervisor: v.supervisor ? personName(db, v.supervisor) : '', oas: v.oas.map(o => personName(db, o)) });
  const sharesHere = db.shares.filter(r => (r.owner === id || r.to === id) && r.status === 'Approved');
  const tone = AREA_TONE[d.n] ?? 'brand';
  return <>
    <Head r="areas" extra={areaLabel(a0)} title={<span className="flex" style={{ gap: 12 }}><span className={`tile t-${tone}`} style={{ fontWeight: 800 }}>{a0.n}</span>{a0.name}</span>} back
      action={<MoreMenu label="···" items={[{ label: 'Export the waiting list', icon: <Download size={16} />, onClick: () => { downloadCsv(`waiting-list-area-${a0.n}.csv`, [['Name', 'Email', 'Postcode', 'Type', 'Joined'], ...a0.waitlist.map(w => [w.name, w.email, w.postcode, w.kind, w.at])]); s.toast('Waiting list downloaded'); } }, { label: 'Delete this area', icon: <Trash2 size={16} />, danger: true, onClick: () => setDel(true) }]} />} />
    <Card><Facts items={[['Status', <Chip key="s" tone={statusTone(a0.status)}>{a0.status === 'Planned' ? `Opens ${a0.opens}` : a0.status}</Chip>], ['Supervisor', a0.supervisor ? personName(db, a0.supervisor) : 'Not chosen'], ['Office Admins', a0.oas.length], ['Homes', homes], ['Landlords and clients', landlordsOf(db, id)], ['Districts', a0.postcodes.length], ['Base', a0.base || '—']]} /></Card>
    <div className="adm-split">
      <div className="col">
        <Card title={<span className="clean-h">Supervisor and team<InfoTip>One Supervisor is always responsible for the area. Their Office Admins work only in this area, and their requests go to this Supervisor (or the cover during leave).</InfoTip></span>}>
          <Field label="Supervisor (responsible for the area)"><Select value={d.supervisor} onChange={v => patch({ supervisor: v })} options={[{ value: '', label: 'Not chosen yet' }, ...supOpts]} /></Field>
          {supBusy && <Note tone="err">{personName(db, d.supervisor)} already runs {areaLabel(supBusy)}. Choose someone else, or use holiday cover in Teams & cover for a short absence.</Note>}
          {a0.supervisor && d.supervisor !== a0.supervisor && !supBusy && <Note tone="warn">{personName(db, a0.supervisor)} stops seeing this area when you save. {d.supervisor ? `${personName(db, d.supervisor)} becomes responsible.` : 'Choose a replacement before the area goes live.'}</Note>}
          <Field label="Office Admins (one area each)"><MultiPick label="Office Admins" options={oaOpts.map(o => o.label)} value={d.oas.map(o => oaOpts.find(z => z.value === o)?.label ?? personName(db, o))} onChange={setOas} /></Field>
          {movedIn.map(m => <Note key={m.o} tone="warn">{personName(db, m.o)} moves from {areaLabel(m.from!)}. Their landlords stay there until you move them in Teams & cover.</Note>)}
        </Card>
        <Card title={<span className="clean-h">Postcode districts<InfoTip>The first part of the postcode, e.g. N2. Each district belongs to one area. Adding one that belongs to another area asks you to transfer or share it.</InfoTip></span>} sub={`${d.postcodes.length} districts`}>
          <div className="flex wrap" style={{ gap: 6 }}>{d.postcodes.map(p => <span key={p} className="chipx">{p}<button type="button" aria-label={`Remove ${p}`} onClick={() => patch({ postcodes: d.postcodes.filter(z => z !== p) })}><X size={12} /></button></span>)}{!d.postcodes.length && <span className="caption">No districts yet.</span>}</div>
          <div className="flex"><input className="input grow" aria-label="Add a district" value={dist} placeholder="Add a district or full postcode, e.g. N2 or N2 9RF" onChange={e => setDist(e.target.value.toUpperCase())} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDistrict(); } }} /><Btn kind="outline" icon={<Plus size={16} />} disabled={!dist.trim()} onClick={addDistrict}>Add</Btn></div>
          {a0.postcodes.filter(p => !d.postcodes.includes(p)).length > 0 && <Note tone="warn">Homes in {a0.postcodes.filter(p => !d.postcodes.includes(p)).join(', ')} go to “Needs an area” unless another area has that district.</Note>}
          {sharesHere.length > 0 && <div className="col" style={{ gap: 6 }}><span className="sec-label">Shared</span>{sharesHere.map(r => <div key={r.id} className="lrow"><Share2 size={15} /><span className="small grow" style={{ color: 'var(--text-primary)' }}>{r.district} {r.owner === id ? `is shared with ${areaLabel(db.areas.find(z => z.id === r.to)!)}` : `is shared from ${areaLabel(db.areas.find(z => z.id === r.owner)!)}`} until {r.until}</span></div>)}</div>}
        </Card>
        <Card title="Area">
          <div className="grid g2"><Field label="Name"><Text value={d.name} onChange={v => patch({ name: v })} /></Field><Field label="Supervisor's base (postcode)"><Text value={d.base} onChange={v => patch({ base: v.toUpperCase() })} /></Field></div>
          <Field label="Status"><div className="seg" role="group" aria-label="Status">{(['Live', 'Planned', 'Off'] as const).map(v => <button key={v} type="button" className={d.status === v ? 'on' : ''} onClick={() => patch({ status: v, message: v !== 'Live' && !d.message ? OFF_MSG : d.message })}>{v === 'Planned' ? 'Opens on a date' : v}</button>)}</div></Field>
          {d.status === 'Planned' && <Field label="Opening date"><input className="input" type="date" value={toInput(d.opens)} onChange={e => patch({ opens: fromInput(e.target.value) })} /></Field>}
          {d.status !== 'Live' && <Field label="What people in this area see on the website"><textarea className="input" value={d.message} onChange={e => patch({ message: e.target.value })} /></Field>}
          {d.status === 'Off' && homes > 0 && <Note tone="warn">The {homes} homes already here are still managed. Off only stops new enquiries.</Note>}
          {a0.status !== 'Live' && d.status === 'Live' && a0.waitlist.length > 0 && <Note>When you save, the {a0.waitlist.length} people on the waiting list are told the area is open.</Note>}
        </Card>
        <Card title="Waiting list" sub="People who asked while the area was not live">
          {a0.waitlist.length ? <div className="tablewrap"><table className="t"><thead><tr><th>Name</th><th>Type</th><th>Postcode</th><th>Joined</th></tr></thead><tbody>
            {a0.waitlist.map(w => <tr key={w.email} className="static"><td><span className="stack"><b className="strong">{w.name}</b><span className="caption">{w.email}</span></span></td><td>{w.kind}</td><td>{w.postcode}</td><td>{w.at}</td></tr>)}
          </tbody></table></div> : <Empty icon={<Users size={20} />}>Nobody is waiting.</Empty>}
        </Card>
      </div>
      <div className="sticky">
        <Card title="Who sees this area">
          <div className="col" style={{ gap: 10 }}>
            <div className="flex"><Avatar id="ma" /><span className="small grow" style={{ color: 'var(--text-primary)' }}>Admin · every area</span></div>
            <div className="flex">{d.supervisor ? <Avatar id={d.supervisor} name={personName(db, d.supervisor)} /> : <span className="tile t-neutral" style={{ width: 32, height: 32 }}><Users size={14} /></span>}<span className="small grow" style={{ color: 'var(--text-primary)' }}>{d.supervisor ? personName(db, d.supervisor) : 'No Supervisor'} · this area only</span></div>
            {d.oas.map(o => <div key={o} className="flex" style={{ paddingLeft: 18 }}><Avatar id={o} name={personName(db, o)} /><span className="small grow">{personName(db, o)} · their own work here</span></div>)}
            <div className="flex"><span className="tile t-neutral" style={{ width: 32, height: 32 }}><Lock size={14} /></span><span className="caption grow">Other Supervisors can't see it, unless you set holiday cover or share a district</span></div>
          </div>
        </Card>
        <Card title="On the website">
          {d.status === 'Live' ? <Note tone="ok">People with a {d.postcodes[0] ?? '…'} postcode can sign up and send enquiries.</Note>
            : <div className="emailpv"><div className="eh"><b>Postcode {d.postcodes[0] ?? '—'}</b><span>What they see after entering their postcode</span></div><div className="eb">{d.message || OFF_MSG}</div><div className="sigx"><span className="btn sm" style={{ alignSelf: 'flex-start' }}>Join the waiting list</span></div></div>}
        </Card>
      </div>
    </div>
    <SaveBar dirty={x.dirty} onUndo={x.undo} blocked={blocked} important={important ? 'Changing who runs an area, its team or its districts changes who sees which homes, so the reason is saved.' : false}
      onSave={reason => {
        const opened = a0.status !== 'Live' && d.status === 'Live';
        const areas = x.d.areas.map(a => a.id === id && opened ? { ...a, waitlist: [] } : a);
        const cs = [{ page: 'Areas', item: areaLabel(d), ...changed(shown(a0), shown(d), labels), reason }, ...others.map(o => ({ page: 'Areas', item: areaLabel(o), ...changed(shown(db.areas.find(z => z.id === o.id)!), shown(o), labels), reason })), ...newShares.map(r => ({ page: 'Areas', item: `${r.district} shared`, what: 'Shared a district', after: `${r.district} from ${areaLabel(db.areas.find(z => z.id === r.owner)!)} with ${areaLabel(d)} until ${r.until}`, reason: r.reason }))];
        s.commitMany({ areas, shares: x.d.shares }, cs, opened && a0.waitlist.length ? `Saved. ${a0.waitlist.length} people told the area is open.` : 'Saved');
      }} />
    {taken && <DistrictTaken d={taken.d} owner={taken.owner} here={d} onClose={() => setTaken(null)}
      onTransfer={() => { x.set(v => ({ ...v, areas: v.areas.map(a => a.id === id ? { ...a, postcodes: [...a.postcodes, taken.d] } : a.id === taken.owner.id ? { ...a, postcodes: a.postcodes.filter(p => p !== taken.d) } : a) })); setTaken(null); s.toast(`${taken.d} moves here when you save`); }}
      onShare={(until, reason) => { x.set(v => ({ ...v, shares: [{ id: 'SR' + Date.now(), district: taken.d, owner: taken.owner.id, to: id, by: ME_NAME, reason, until, at: nowStamp(), status: 'Approved', decided: `Approved by ${ME_NAME} · ${nowStamp()}` }, ...v.shares] })); setTaken(null); s.toast(`${taken.d} will be shared when you save`); }} />}
    {del && (canDelete ? <DeleteModal what={areaLabel(a0)} onClose={() => setDel(false)} onDone={reason => { s.commit('areas', db.areas.filter(z => z.id !== id), { page: 'Areas', item: areaLabel(a0), what: 'Deleted an area', before: a0.postcodes.join(', '), after: '—', reason }, 'Area deleted'); s.go('areas'); }} />
      : <Modal title="This area can't be deleted yet" sub={`It still has ${homes} homes and ${landlordsOf(db, id)} landlords or clients. Move its districts to another area first, or switch it off to stop new enquiries.`} onClose={() => setDel(false)} footer={<Btn onClick={() => setDel(false)}>OK</Btn>} />)}
  </>;
}

/** "District already taken": cancel, transfer it here, or share it for a while. Only the Admin can approve sharing. */
function DistrictTaken({ d, owner, here, onClose, onTransfer, onShare }: { d: string; owner: Area; here: Area; onClose: () => void; onTransfer: () => void; onShare: (until: string, reason: string) => void }) {
  const { db } = useStore(); const [mode, setMode] = useState<'' | 'share'>(''); const [until, setUntil] = useState('2027-03-31'); const [reason, setReason] = useState('');
  const n = HOMES_IN[d] ?? 0;
  return <Modal title="District already taken" sub={`${d} is already in ${areaLabel(owner)} (Supervisor ${personName(db, owner.supervisor)}).`} onClose={onClose}>
    {!mode ? <div className="col" style={{ gap: 10 }}>
      <div className="flex"><Btn kind="outline" onClick={onClose}>Cancel</Btn><span className="small">Nothing changes. {d} stays with {owner.name}.</span></div>
      <div className="flex"><Btn kind="outline" icon={<ArrowRightLeft size={16} />} onClick={onTransfer}>Transfer</Btn><span className="small">Move {d} to {here.name}. {n ? `${n} homes move together.` : 'No homes there yet.'}</span></div>
      <div className="flex"><Btn icon={<Share2 size={16} />} onClick={() => setMode('share')}>Share it</Btn><span className="small">Both areas see it until an end date. {owner.name} stays responsible.</span></div>
    </div> : <>
      <Field label="Shared until"><input className="input" type="date" value={until} onChange={e => setUntil(e.target.value)} /></Field>
      <Field label="Reason" hint="Saved in the Audit history."><textarea className="input" value={reason} onChange={e => setReason(e.target.value)} /></Field>
      <Note>One person is always responsible: {personName(db, owner.supervisor)} stays accountable for {d}. Sharing ends by itself on the date.</Note>
      <div className="flex" style={{ justifyContent: 'flex-end' }}><Btn kind="outline" onClick={() => setMode('')}>Back</Btn><Btn icon={<Check size={16} />} disabled={!until || reason.trim().length < 3} onClick={() => onShare(fromInput(until), reason.trim())}>Approve sharing</Btn></div>
    </>}
  </Modal>;
}
