import { useState } from 'react';
import { ScrollText, Plus, Eye, Send, Trash2, Download, Pencil } from 'lucide-react';
import { useStore } from '../store';
import { nowStamp, ME_NAME, fromInput, toInput } from '../data';
import { Card, Chip, Btn, Field, Text, Empty, Modal, PageTabs, Bar, MiniSearch, MoreMenu } from '../ui';
import { DocPages, DocEditor, bodyOf, sectionsOf, wordsOf, pageCount } from './doc';
import { Head } from '../Shell';
import { useDraft, SaveBar, ReasonModal, DeleteModal, downloadCsv } from '../admin';
import { liveOf, draftOf, waitingOf, statusTone } from './lib';
import type { Agreement, AgVersion } from '../seed';

/** Documents & records › Agreements: one page per agreement, written like a document (4–5 pages is normal), versions and who accepted. */
export function Agreements() {
  const s = useStore();
  if (s.detail) return <AgreementPage id={s.detail} />;
  const { db } = s;
  return <>
    <Head r="agreements" />
    <Card>
      {db.agreements.length ? <div className="tablewrap"><table className="t"><thead><tr><th>Agreement</th><th>For</th><th>Live</th><th>Pages</th><th>Accepted</th><th /></tr></thead><tbody>
        {db.agreements.map(g => { const live = liveOf(g); const wait = waitingOf(g).length; const n = g.people.length; const dr = draftOf(g); return <tr key={g.id} onClick={() => s.go('agreements', g.id)}>
          <td><span className="flex"><span className="tile t-brand" style={{ width: 30, height: 30 }}><ScrollText size={14} /></span><b className="strong">{g.name}</b></span></td><td className="small">{g.to}</td>
          <td className="small">Version {live.v} · {live.effective}</td><td className="small">{pageCount(bodyOf(live))}</td>
          <td style={{ width: 150 }}><span className="stack" style={{ gap: 4 }}><span className="small">{n - wait} of {n}</span><Bar value={n ? (n - wait) / n * 100 : 100} tone={wait ? 'warn' : 'ok'} /></span></td>
          <td>{dr && <Chip tone="info">Draft</Chip>}</td>
        </tr>; })}
      </tbody></table></div> : <Empty icon={<ScrollText size={22} />}>No agreements yet.</Empty>}
    </Card>
  </>;
}

function AgreementPage({ id }: { id: string }) {
  const s = useStore(); const { db } = s; const g = db.agreements.find(a => a.id === id);
  const [tab, setTab] = useState<'doc' | 'versions' | 'people'>('doc');
  const [editing, setEditing] = useState(false);
  const [read, setRead] = useState<AgVersion | null>(null);
  if (!g) return <><Head r="agreements" extra="Not found" back /><Empty>This agreement was removed.</Empty></>;
  const live = liveOf(g); const dr = draftOf(g); const wait = waitingOf(g);
  const save = (a: Agreement, c: Parameters<typeof s.commit>[2], msg?: string) => s.commit('agreements', db.agreements.map(z => z.id === id ? a : z), c, msg);
  const startDraft = () => { const body = bodyOf(live); const v: AgVersion = { v: Math.max(...g.versions.map(z => z.v)) + 1, status: 'Draft', effective: '1 Jan 2027', by: ME_NAME, at: nowStamp(), change: '', body, sections: sectionsOf(body) }; save({ ...g, versions: [v, ...g.versions] }, { page: 'Agreements', item: g.name, what: 'Started a new draft version', after: `Version ${v.v} (draft)` }, `Draft version ${v.v} started`); setEditing(true); };
  if (editing && dr) return <DraftEditor key={dr.v + dr.at} g={g} dr={dr} live={live} onSave={save} onClose={() => setEditing(false)} />;
  return <>
    <Head r="agreements" extra={g.name} title={g.name} back action={dr ? <Btn icon={<Pencil size={16} />} onClick={() => setEditing(true)}>Edit draft</Btn> : <Btn icon={<Plus size={16} />} onClick={startDraft}>New version</Btn>} />
    <div className="ag-sum">
      <Chip tone="ok">Live · version {live.v}</Chip>
      <span>From {live.effective}</span><span>·</span>
      <span>{g.people.length - wait.length} of {g.people.length} accepted</span><span>·</span>
      <span>{pageCount(bodyOf(live))} pages</span>
      {dr && <Chip tone="info">Draft · version {dr.v}</Chip>}
    </div>
    <PageTabs value={tab} onChange={setTab} items={[{ id: 'doc', label: 'Document' }, { id: 'versions', label: 'Versions', count: g.versions.length }, { id: 'people', label: 'Accepted', count: g.people.length - wait.length }]} />
    {tab === 'doc' && <DocPages title={g.name} sub={`Version ${live.v} · from ${live.effective}`} body={bodyOf(live)} logo={db.company.logo} />}
    {tab === 'versions' && <Card>
      <div>{[...g.versions].sort((a, b) => b.v - a.v).map(v => <div key={v.v} className="rowlink" onClick={() => v.status === 'Draft' ? setEditing(true) : setRead(v)}>
        <span className={`tile t-${v.status === 'Live' ? 'ok' : v.status === 'Draft' ? 'info' : 'neutral'}`} style={{ width: 34, height: 34 }}><ScrollText size={15} /></span>
        <div className="stack grow"><b>Version {v.v}</b><span className="caption">{v.change || 'No note yet'} · {v.effective}</span></div>
        <Chip tone={statusTone(v.status)}>{v.status}</Chip>
        {v.status === 'Draft' ? <Btn sm kind="outline" icon={<Pencil size={14} />}>Edit</Btn> : <Btn sm kind="ghost" icon={<Eye size={14} />}>Read</Btn>}
      </div>)}</div>
    </Card>}
    {tab === 'people' && <People g={g} />}
    {read && <Modal wide title={`Version ${read.v}`} sub={`${read.status} · from ${read.effective}${read.change ? ' · ' + read.change : ''}`} onClose={() => setRead(null)}>
      <DocPages title={g.name} sub={`Version ${read.v}`} body={bodyOf(read)} logo={db.company.logo} />
    </Modal>}
  </>;
}

type Commit = (a: Agreement, c: { page: string; item: string; what: string; before?: string; after?: string; reason?: string }, msg?: string) => void;
function DraftEditor({ g, dr, live, onSave, onClose }: { g: Agreement; dr: AgVersion; live: AgVersion; onSave: Commit; onClose: () => void }) {
  const s = useStore();
  const x = useDraft({ ...dr, body: bodyOf(dr) }); const d = x.d; const body = d.body ?? '';
  const [ver, setVer] = useState(0); // remounts the page editor after Undo
  const [pv, setPv] = useState(false); const [pub, setPub] = useState(false); const [del, setDel] = useState(false); const [mode, setMode] = useState<'everyone' | 'new'>('everyone');
  const same = body.trim() === bodyOf(live).trim();
  const ready = wordsOf(body) > 0 && d.change.trim() && d.effective && !same;
  const withV = (v: AgVersion) => ({ ...g, versions: g.versions.map(z => z.v === dr.v ? v : z) });
  const close = () => x.dirty ? s.toast('Save or undo your changes first') : onClose();
  return <>
    <Head r="agreements" extra={g.name} title={`${g.name} · version ${d.v}`} action={<div className="flex">
      <Btn kind="ghost" onClick={close}>Close</Btn>
      <Btn kind="outline" icon={<Eye size={16} />} onClick={() => setPv(true)}>Preview</Btn>
      <Btn icon={<Send size={16} />} disabled={!ready || x.dirty} title={x.dirty ? 'Save first' : !ready ? 'Add the text, what changed and the date' : undefined} onClick={() => setPub(true)}>Publish</Btn>
      <MoreMenu label="···" items={[{ label: 'Delete this draft', icon: <Trash2 size={16} />, danger: true, onClick: () => setDel(true) }]} />
    </div>} />
    <Card>
      <div className="grid g2"><Field label="What changed"><Text value={d.change} onChange={v => x.patch({ change: v })} placeholder="One line, people see this" /></Field>
        <Field label="Starts on"><input className="input" type="date" value={toInput(d.effective)} onChange={e => x.patch({ effective: fromInput(e.target.value) })} /></Field></div>
    </Card>
    <DocEditor key={ver} title={g.name} value={body} onChange={v => x.patch({ body: v })} />
    <SaveBar dirty={x.dirty} onUndo={() => { x.undo(); setVer(n => n + 1); }} saveLabel="Save draft" blocked={!wordsOf(body) ? 'The agreement is empty.' : ''}
      onSave={() => onSave(withV({ ...d, sections: sectionsOf(body), at: nowStamp(), by: ME_NAME }), { page: 'Agreements', item: g.name, what: `Saved draft version ${d.v}`, before: `${wordsOf(bodyOf(dr))} words`, after: `${wordsOf(body)} words${d.change ? ' · ' + d.change : ''}` }, 'Draft saved')} />
    {pv && <Modal wide title={`Preview · version ${d.v}`} sub={`From ${d.effective}`} onClose={() => setPv(false)}>
      <DocPages title={g.name} sub={`Version ${d.v}`} body={body} logo={s.db.company.logo} />
    </Modal>}
    {pub && <ReasonModal title={`Publish version ${d.v}?`} sub="Who must accept it?" cta="Publish" onClose={() => setPub(false)} onDone={reason => {
      const versions = g.versions.map(z => z.v === dr.v ? { ...d, sections: sectionsOf(body), status: 'Live' as const, mode, at: nowStamp(), by: ME_NAME } : z.status === 'Live' ? { ...z, status: 'Retired' as const } : z);
      onSave({ ...g, versions }, { page: 'Agreements', item: g.name, what: `Published version ${d.v}`, before: `Version ${live.v}`, after: `Version ${d.v} · ${mode === 'everyone' ? 'everyone must accept again' : 'only new people accept'} · ${d.change}`, reason }, `Version ${d.v} published`);
      setPub(false); onClose();
    }}>
      <div className="col" style={{ gap: 8 }}>
        <button type="button" className={`choice${mode === 'everyone' ? ' on' : ''}`} onClick={() => setMode('everyone')}><b>Everyone accepts again</b><span className="small">{g.people.length} people</span></button>
        <button type="button" className={`choice${mode === 'new' ? ' on' : ''}`} onClick={() => setMode('new')}><b>Only new people</b><span className="small">Others keep their version</span></button>
      </div>
    </ReasonModal>}
    {del && <DeleteModal what={`draft version ${d.v}`} detail="The live version stays." onClose={() => setDel(false)} onDone={reason => { onSave({ ...g, versions: g.versions.filter(z => z.v !== dr.v) }, { page: 'Agreements', item: g.name, what: `Deleted draft version ${d.v}`, before: 'Draft', reason }, 'Draft deleted'); setDel(false); onClose(); }} />}
  </>;
}

function People({ g }: { g: Agreement }) {
  const s = useStore(); const live = liveOf(g); const [q, setQ] = useState(''); const [v, setV] = useState('all');
  const rows = g.people.map(p => { const a = g.accepts.find(c => c.name === p || c.org === p); return { who: a ? a.name : p, org: a?.org ?? (p !== a?.name ? '' : ''), v: a?.v ?? 0, at: a?.at ?? '—', ok: !!a && (live.mode === 'new' || a.v >= live.v) }; });
  const list = rows.filter(r => (v === 'all' || (v === 'waiting' ? !r.ok : String(r.v) === v)) && (r.who + ' ' + r.org).toLowerCase().includes(q.toLowerCase()));
  const versions = [...new Set(rows.map(r => r.v).filter(Boolean))].sort((a, b) => b - a);
  return <Card action={<Btn sm kind="outline" icon={<Download size={14} />} onClick={() => { downloadCsv(`${g.name.toLowerCase().replace(/\W+/g, '-')}-acceptances.csv`, [['Name', 'Company', 'Version accepted', 'Accepted at', 'Up to date'], ...rows.map(r => [r.who, r.org, r.v || 'Not accepted', r.at, r.ok ? 'Yes' : 'No'])]); s.toast('Downloaded'); }}>Export CSV</Btn>}>
    <div className="toolbar"><MiniSearch value={q} onChange={setQ} placeholder="Search people" /><select className="fsel" aria-label="Version" value={v} onChange={e => setV(e.target.value)}><option value="all">Any version</option><option value="waiting">Still to accept</option>{versions.map(n => <option key={n} value={n}>Version {n}</option>)}</select><span className="caption">{list.length} shown</span></div>
    {list.length ? <div className="tablewrap"><table className="t"><thead><tr><th>Person</th><th>Version accepted</th><th>When</th><th>Live version</th></tr></thead><tbody>
      {list.map(r => <tr key={r.who} className="static"><td><span className="stack"><b className="strong">{r.who}</b>{r.org && <span className="caption">{r.org}</span>}</span></td><td>{r.v ? `Version ${r.v}` : 'Not yet'}</td><td className="small">{r.at}</td><td>{r.ok ? <Chip tone="ok">Up to date</Chip> : <Chip tone="warn">Waiting</Chip>}</td></tr>)}
    </tbody></table></div> : <Empty>Nobody matches.</Empty>}
  </Card>;
}
