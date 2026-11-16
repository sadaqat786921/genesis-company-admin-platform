import { useState } from 'react';
import { ScrollText, Plus, Eye, Send, Trash2, ArrowUp, ArrowDown, Download, Pencil } from 'lucide-react';
import { useStore } from '../store';
import { nowStamp, ME_NAME, fromInput, toInput } from '../data';
import { Card, Chip, Btn, Field, Text, Area, Empty, Note, InfoTip, Modal, PageTabs, Facts, Bar, MiniSearch, MoreMenu } from '../ui';
import { Head } from '../Shell';
import { useDraft, SaveBar, ReasonModal, DeleteModal, downloadCsv } from '../admin';
import { liveOf, draftOf, waitingOf, statusTone } from './lib';
import type { Agreement, AgVersion, Section } from '../seed';

/** Documents & records › Agreements: versions (draft, live, retired), publish, and who accepted which version. */
export function Agreements() {
  const s = useStore();
  if (s.detail) return <AgreementPage id={s.detail} />;
  const { db } = s;
  return <>
    <Head r="agreements" />
    <Card title={<span className="clean-h">Agreements and terms<InfoTip>Edit as a new draft version, preview it, then publish. Old versions stay readable. When you publish, choose whether everyone must accept again or only new people.</InfoTip></span>}>
      {db.agreements.length ? <div className="tablewrap"><table className="t"><thead><tr><th>Agreement</th><th>For</th><th>Live version</th><th>Effective</th><th>Accepted</th><th>Draft</th></tr></thead><tbody>
        {db.agreements.map(g => { const live = liveOf(g); const wait = waitingOf(g).length; const n = g.people.length; const dr = draftOf(g); return <tr key={g.id} onClick={() => s.go('agreements', g.id)}>
          <td><span className="flex"><span className="tile t-brand" style={{ width: 30, height: 30 }}><ScrollText size={14} /></span><b className="strong">{g.name}</b></span></td><td className="small">{g.to}</td>
          <td><Chip tone="ok">Version {live.v}</Chip></td><td className="small">{live.effective}</td>
          <td style={{ width: 180 }}><span className="stack" style={{ gap: 4 }}><span className="small">{n - wait} of {n}{wait ? ` · ${wait} waiting` : ''}</span><Bar value={n ? (n - wait) / n * 100 : 100} tone={wait ? 'warn' : 'ok'} /></span></td>
          <td>{dr ? <Chip tone="info">Version {dr.v} draft</Chip> : <span className="caption">—</span>}</td>
        </tr>; })}
      </tbody></table></div> : <Empty icon={<ScrollText size={22} />}>No agreements yet.</Empty>}
    </Card>
  </>;
}

const Sections = ({ list }: { list: Section[] }) => <div className="terms">{list.map((x, i) => <div key={i} className="terms-i"><span className="terms-n">{i + 1}</span><div className="stack"><b>{x.h}</b><span>{x.t}</span></div></div>)}</div>;

function AgreementPage({ id }: { id: string }) {
  const s = useStore(); const { db } = s; const g = db.agreements.find(a => a.id === id);
  const [tab, setTab] = useState<'draft' | 'versions' | 'people'>(g && draftOf(g) ? 'draft' : 'versions');
  const [read, setRead] = useState<AgVersion | null>(null);
  if (!g) return <><Head r="agreements" extra="Not found" back /><Empty>This agreement was removed.</Empty></>;
  const live = liveOf(g); const dr = draftOf(g); const wait = waitingOf(g);
  const save = (a: Agreement, c: Parameters<typeof s.commit>[2], msg?: string) => s.commit('agreements', db.agreements.map(z => z.id === id ? a : z), c, msg);
  const startDraft = () => { const v: AgVersion = { v: Math.max(...g.versions.map(z => z.v)) + 1, status: 'Draft', effective: '1 Jan 2027', by: ME_NAME, at: nowStamp(), change: '', sections: live.sections.map(z => ({ ...z })) }; save({ ...g, versions: [v, ...g.versions] }, { page: 'Agreements', item: g.name, what: 'Started a new draft version', after: `Version ${v.v} (draft)` }, `Draft version ${v.v} started`); setTab('draft'); };
  return <>
    <Head r="agreements" extra={g.name} title={g.name} back action={!dr && <Btn icon={<Plus size={16} />} onClick={startDraft}>Start a new version</Btn>} />
    <Card><Facts items={[['For', g.to], ['Live version', `Version ${live.v}`], ['Effective from', live.effective], ['Accepted the live version', `${g.people.length - wait.length} of ${g.people.length}`], ['When published', live.mode === 'new' ? 'Only new people accept' : 'Everyone accepts again'], ['Draft', dr ? `Version ${dr.v}` : 'None']]} /></Card>
    <PageTabs value={tab} onChange={setTab} items={[...(dr ? [{ id: 'draft' as const, label: `Draft · version ${dr.v}` }] : []), { id: 'versions', label: 'Versions', count: g.versions.length }, { id: 'people', label: 'Who accepted', count: g.accepts.length }]} />
    {tab === 'draft' && dr && <DraftEditor key={dr.v + dr.at} g={g} dr={dr} live={live} onSave={(a, c, m) => save(a, c, m)} onGone={() => setTab('versions')} />}
    {tab === 'versions' && <Card title="Every version" sub="Old versions stay readable">
      <div>{[...g.versions].sort((a, b) => b.v - a.v).map(v => <div key={v.v} className="rowlink" style={{ cursor: 'default' }}>
        <span className={`tile t-${v.status === 'Live' ? 'ok' : v.status === 'Draft' ? 'info' : 'neutral'}`} style={{ width: 34, height: 34 }}><ScrollText size={15} /></span>
        <div className="stack grow"><b>Version {v.v}</b><span className="caption">{v.status === 'Draft' ? `Draft · effective ${v.effective} once published` : `Effective ${v.effective}`} · {v.by} · {v.change || 'No note yet'}</span></div>
        <Chip tone={statusTone(v.status)}>{v.status}</Chip>
        {v.status === 'Draft' ? <Btn sm kind="outline" icon={<Pencil size={14} />} onClick={() => setTab('draft')}>Edit</Btn> : <Btn sm kind="ghost" icon={<Eye size={14} />} onClick={() => setRead(v)}>Read</Btn>}
      </div>)}</div>
    </Card>}
    {tab === 'people' && <People g={g} />}
    {read && <Modal wide title={`${g.name} · version ${read.v}`} sub={`${read.status} · effective ${read.effective} · published by ${read.by}`} onClose={() => setRead(null)} footer={<Btn onClick={() => setRead(null)}>Close</Btn>}>
      <Note>What changed: {read.change}</Note><Sections list={read.sections} />
    </Modal>}
  </>;
}

function DraftEditor({ g, dr, live, onSave, onGone }: { g: Agreement; dr: AgVersion; live: AgVersion; onSave: (a: Agreement, c: { page: string; item: string; what: string; before?: string; after?: string; reason?: string }, msg?: string) => void; onGone: () => void }) {
  const x = useDraft(dr); const d = x.d;
  const [pv, setPv] = useState(false); const [pub, setPub] = useState(false); const [del, setDel] = useState(false); const [mode, setMode] = useState<'everyone' | 'new'>('everyone');
  const set = (i: number, p: Partial<Section>) => x.patch({ sections: d.sections.map((z, k) => k === i ? { ...z, ...p } : z) });
  const move = (i: number, by: number) => { const n = [...d.sections]; const [v] = n.splice(i, 1); n.splice(i + by, 0, v); x.patch({ sections: n }); };
  const ready = d.sections.length > 0 && d.sections.every(z => z.h.trim() && z.t.trim()) && d.change.trim() && d.effective;
  const same = JSON.stringify(d.sections) === JSON.stringify(live.sections);
  const withV = (v: AgVersion) => ({ ...g, versions: g.versions.map(z => z.v === dr.v ? v : z) });
  return <>
    <div className="adm-split">
      <div className="col">
        <Card title={`Version ${d.v} · draft`} sub="Nobody sees a draft until you publish it">
          {d.sections.map((z, i) => <div key={i} className="lrow" style={{ alignItems: 'flex-start' }}>
            <span className="terms-n" style={{ marginTop: 26 }}>{i + 1}</span>
            <div className="col grow" style={{ gap: 8 }}><Field label="Heading"><Text value={z.h} onChange={v => set(i, { h: v })} /></Field><Field label="Text"><Area value={z.t} onChange={v => set(i, { t: v })} /></Field></div>
            <div className="col" style={{ gap: 4, marginTop: 22 }}>
              <Btn sm kind="ghost" icon={<ArrowUp size={14} />} disabled={i === 0} onClick={() => move(i, -1)} title="Move up" />
              <Btn sm kind="ghost" icon={<ArrowDown size={14} />} disabled={i === d.sections.length - 1} onClick={() => move(i, 1)} title="Move down" />
              <Btn sm kind="ghost" icon={<Trash2 size={14} />} onClick={() => x.patch({ sections: d.sections.filter((_, k) => k !== i) })} title="Remove section" />
            </div>
          </div>)}
          {!d.sections.length && <Empty>No sections. Add one.</Empty>}
          <div><Btn sm kind="outline" icon={<Plus size={14} />} onClick={() => x.patch({ sections: [...d.sections, { h: '', t: '' }] })}>Add a section</Btn></div>
        </Card>
        <Card title="About this version">
          <div className="grid g2"><Field label="What changed (people see this)"><Text value={d.change} onChange={v => x.patch({ change: v })} placeholder="e.g. Quotes are valid for 30 days" /></Field>
            <Field label="Effective date"><input className="input" type="date" value={toInput(d.effective)} onChange={e => x.patch({ effective: fromInput(e.target.value) })} /></Field></div>
        </Card>
      </div>
      <div className="sticky">
        <Card title="Ready to publish?">
          <div className="col" style={{ gap: 8 }}>
            <span className="small">{same ? 'The wording is the same as the live version.' : 'The wording is different from the live version.'}</span>
            {x.dirty && <Note tone="warn">Save the draft before you publish.</Note>}
            <div className="flex wrap"><Btn kind="outline" icon={<Eye size={16} />} onClick={() => setPv(true)}>Preview</Btn><Btn icon={<Send size={16} />} disabled={!ready || x.dirty || same} onClick={() => setPub(true)}>Publish version {d.v}</Btn>
              <MoreMenu label="···" items={[{ label: 'Delete this draft', icon: <Trash2 size={16} />, danger: true, onClick: () => setDel(true) }]} /></div>
            {!ready && <span className="caption">Fill in every section, what changed and the effective date.</span>}
          </div>
        </Card>
      </div>
    </div>
    <SaveBar dirty={x.dirty} onUndo={x.undo} saveLabel="Save draft" blocked={d.sections.some(z => !z.h.trim() || !z.t.trim()) ? 'Every section needs a heading and text.' : ''}
      onSave={() => onSave(withV({ ...d, at: nowStamp(), by: ME_NAME }), { page: 'Agreements', item: g.name, what: `Saved draft version ${d.v}`, before: `${dr.sections.length} sections`, after: `${d.sections.length} sections${d.change ? ' · ' + d.change : ''}` }, 'Draft saved')} />
    {pv && <Modal wide title={`${g.name} · version ${d.v}`} sub={`Preview · effective ${d.effective}`} onClose={() => setPv(false)} footer={<Btn onClick={() => setPv(false)}>Close</Btn>}>
      <Note>What changed: {d.change || '—'}</Note><Sections list={d.sections} />
    </Modal>}
    {pub && <ReasonModal title={`Publish version ${d.v}?`} sub="The live version is retired but stays readable. Choose who must accept it:" cta={`Publish version ${d.v}`} onClose={() => setPub(false)} onDone={reason => {
      const versions = g.versions.map(z => z.v === dr.v ? { ...d, status: 'Live' as const, mode, at: nowStamp(), by: ME_NAME } : z.status === 'Live' ? { ...z, status: 'Retired' as const } : z);
      onSave({ ...g, versions }, { page: 'Agreements', item: g.name, what: `Published version ${d.v}`, before: `Version ${live.v}`, after: `Version ${d.v} · ${mode === 'everyone' ? 'everyone must accept again' : 'only new people accept'} · ${d.change}`, reason }, mode === 'everyone' ? `Version ${d.v} published. Everyone is asked to accept it next time they sign in.` : `Version ${d.v} published for new people.`);
      setPub(false); onGone();
    }}>
      <div className="col" style={{ gap: 8 }}>
        <button type="button" className={`choice${mode === 'everyone' ? ' on' : ''}`} onClick={() => setMode('everyone')}><b>Everyone must accept again</b><span className="small">All {g.people.length} people see “Read and accept” next time they sign in.</span></button>
        <button type="button" className={`choice${mode === 'new' ? ' on' : ''}`} onClick={() => setMode('new')}><b>Only new people</b><span className="small">People already on the platform stay on the version they accepted.</span></button>
      </div>
    </ReasonModal>}
    {del && <DeleteModal what={`draft version ${d.v}`} detail="The live version stays as it is." onClose={() => setDel(false)} onDone={reason => { onSave({ ...g, versions: g.versions.filter(z => z.v !== dr.v) }, { page: 'Agreements', item: g.name, what: `Deleted draft version ${d.v}`, before: 'Draft', reason }, 'Draft deleted'); setDel(false); onGone(); }} />}
  </>;
}

function People({ g }: { g: Agreement }) {
  const s = useStore(); const live = liveOf(g); const [q, setQ] = useState(''); const [v, setV] = useState('all');
  const rows = g.people.map(p => { const a = g.accepts.find(c => c.name === p || c.org === p); return { who: a ? a.name : p, org: a?.org ?? (p !== a?.name ? '' : ''), v: a?.v ?? 0, at: a?.at ?? '—', ok: !!a && (live.mode === 'new' || a.v >= live.v) }; });
  const list = rows.filter(r => (v === 'all' || (v === 'waiting' ? !r.ok : String(r.v) === v)) && (r.who + ' ' + r.org).toLowerCase().includes(q.toLowerCase()));
  const versions = [...new Set(rows.map(r => r.v).filter(Boolean))].sort((a, b) => b - a);
  return <Card title="Who accepted which version" action={<Btn sm kind="outline" icon={<Download size={14} />} onClick={() => { downloadCsv(`${g.name.toLowerCase().replace(/\W+/g, '-')}-acceptances.csv`, [['Name', 'Company', 'Version accepted', 'Accepted at', 'Up to date'], ...rows.map(r => [r.who, r.org, r.v || 'Not accepted', r.at, r.ok ? 'Yes' : 'No'])]); s.toast('Downloaded'); }}>Export CSV</Btn>}>
    <div className="toolbar"><MiniSearch value={q} onChange={setQ} placeholder="Search people" /><select className="fsel" aria-label="Version" value={v} onChange={e => setV(e.target.value)}><option value="all">Any version</option><option value="waiting">Still to accept</option>{versions.map(n => <option key={n} value={n}>Version {n}</option>)}</select><span className="caption">{list.length} shown</span></div>
    {list.length ? <div className="tablewrap"><table className="t"><thead><tr><th>Person</th><th>Version accepted</th><th>When</th><th>Live version</th></tr></thead><tbody>
      {list.map(r => <tr key={r.who} className="static"><td><span className="stack"><b className="strong">{r.who}</b>{r.org && <span className="caption">{r.org}</span>}</span></td><td>{r.v ? `Version ${r.v}` : 'Not yet'}</td><td className="small">{r.at}</td><td>{r.ok ? <Chip tone="ok">Up to date</Chip> : <Chip tone="warn">Waiting</Chip>}</td></tr>)}
    </tbody></table></div> : <Empty>Nobody matches.</Empty>}
  </Card>;
}
