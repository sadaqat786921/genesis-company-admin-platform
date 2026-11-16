import { useState } from 'react';
import { FolderLock, Plus, Lock, Check, FileText, Star, Copy, Trash2, EyeOff } from 'lucide-react';
import { useStore } from '../store';
import { nowStamp, ME_NAME } from '../data';
import { Card, Chip, Btn, Field, Text, Select, Empty, Note, InfoTip, Modal, Drawer, PageTabs } from '../ui';
import { Head } from '../Shell';
import { useDraft, SaveBar, Toggle, Locked, TokenFields, Paper, unknownTokens, tokensIn } from '../admin';
import { AUDIENCES, WHENS, TOKENS, type Audience, type DocType, type DocTemplate, type Variant } from '../seed';

/** Documents & records › Document access: who can see each kind of document, and when it appears. Staff-only documents are locked. */
export function Access() {
  const s = useStore(); const { db } = s;
  const x = useDraft(db.docTypes); const [open, setOpen] = useState<string | null>(null); const [add, setAdd] = useState(false);
  const shared = x.d.filter(t => !t.staffOnly); const staffOnly = x.d.filter(t => t.staffOnly);
  const groups = [...new Set(shared.map(t => t.group))];
  const doc = x.d.find(t => t.id === open);
  const setAcc = (id: string, a: Audience, p: Partial<DocType['access'][Audience]>) => x.set(ts => ts.map(t => t.id === id ? { ...t, access: { ...t.access, [a]: { ...t.access[a], ...p } } } : t));
  const changes = () => x.d.flatMap(t => { const o = db.docTypes.find(z => z.id === t.id); if (!o) return [`Added ${t.name}`]; return AUDIENCES.filter(a => JSON.stringify(o.access[a]) !== JSON.stringify(t.access[a])).map(a => `${t.name} · ${a}: ${t.access[a].show ? 'sees it ' + t.access[a].when.toLowerCase() : 'hidden'}`); });
  const visChanged = x.d.some(t => { const o = db.docTypes.find(z => z.id === t.id); return o && AUDIENCES.some(a => o.access[a].show !== t.access[a].show); });
  const blocked = x.d.some(t => AUDIENCES.some(a => t.access[a].show && !t.access[a].when)) ? 'Choose when each shown document appears.' : '';
  const cell = (t: DocType, a: Audience) => { const v = t.access[a]; return v.never ? <span className="lockchip" title="Never shown to them"><Lock size={11} />Never</span> : v.show ? <span className="stack" style={{ alignItems: 'flex-start' }}><Chip tone="ok">Sees it</Chip><span className="caption">{v.when}</span></span> : <span className="caption">Hidden</span>; };
  return <>
    <Head r="access" action={<Btn icon={<Plus size={16} />} onClick={() => setAdd(true)}>Add a document type</Btn>} />
    <Card title={<span className="clean-h">Who sees each document<InfoTip>Staff always see everything. “Never” means the client's rules stop them seeing it, for example a contractor's cost is never shown to landlords or agents.</InfoTip></span>} sub="Click a row to change it">
      <div className="tablewrap"><table className="t"><thead><tr><th>Document</th>{AUDIENCES.map(a => <th key={a}>{a}</th>)}</tr></thead>
        {groups.map(g => <tbody key={g} className="grp"><tr className="grp-h static"><td colSpan={5}><span className="sec-label">{g}</span></td></tr>
          {shared.filter(t => t.group === g).map(t => <tr key={t.id} onClick={() => setOpen(t.id)}><td><span className="stack"><b className="strong">{t.name}</b>{t.why && <span className="caption">{t.why}</span>}</span></td>{AUDIENCES.map(a => <td key={a}>{cell(t, a)}</td>)}</tr>)}</tbody>)}
      </table></div>
    </Card>
    <Card title={<span className="clean-h"><Lock size={16} />Staff only</span>} sub="Locked: these can never be shown to landlords, tenants, letting agents or contractors">
      <div>{staffOnly.map(t => <div key={t.id} className="rowlink" style={{ cursor: 'default' }}><span className="tile t-neutral" style={{ width: 32, height: 32 }}><EyeOff size={15} /></span><div className="stack grow"><b>{t.name}</b>{t.why && <span className="caption">{t.why}</span>}</div><Locked why="Staff-only documents can never be shown outside LSP.">Staff only</Locked></div>)}</div>
    </Card>
    <SaveBar dirty={x.dirty} onUndo={x.undo} blocked={blocked} important={visChanged ? 'Changing who can see a document is important, so the reason is saved.' : false}
      note={x.dirty ? changes().slice(0, 2).join('; ') + (changes().length > 2 ? '…' : '') : 'Documents already shared stay where they are.'}
      onSave={reason => { const c = changes(); s.commit('docTypes', x.d, { page: 'Document access', item: [...new Set(c.map(z => z.split(' · ')[0]))].join(', '), what: `${c.length} change${c.length === 1 ? '' : 's'} to who sees documents`, before: '—', after: c.join(' · '), reason }); }} />
    {doc && <Drawer title={doc.name} sub={`${doc.group} · changes are kept until you press Save`} icon={<span className="tile t-brand"><FolderLock size={18} /></span>} onClose={() => setOpen(null)} footer={<Btn icon={<Check size={16} />} onClick={() => setOpen(null)}>Done</Btn>}>
      {AUDIENCES.map(a => { const v = doc.access[a]; return <div key={a} className="lrow" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 10 }}>
        <div className="flex" style={{ width: '100%' }}><b className="grow">{a}</b>{v.never ? <Locked why={doc.why ?? 'The client’s rules never show this to them.'}>Never</Locked> : <Toggle on={v.show} label={`${a} sees ${doc.name}`} onChange={on => setAcc(doc.id, a, { show: on, when: on ? (v.when || WHENS[0]) : v.when })} />}</div>
        {v.show && !v.never && <Field label="When it appears"><Select value={v.when} onChange={w => setAcc(doc.id, a, { when: w })} options={WHENS.map(w => ({ value: w, label: w }))} /></Field>}
      </div>; })}
    </Drawer>}
    {add && <AddType onClose={() => setAdd(false)} onAdd={t => { x.set(ts => [...ts, t]); setAdd(false); setOpen(t.id); }} groups={groups} />}
  </>;
}
function AddType({ onClose, onAdd, groups }: { onClose: () => void; onAdd: (t: DocType) => void; groups: string[] }) {
  const [name, setName] = useState(''); const [group, setGroup] = useState(groups[0]); const [staff, setStaff] = useState(false);
  return <Modal title="Add a document type" sub="It is hidden from everyone until you choose who sees it." onClose={onClose} footer={<><Btn kind="outline" onClick={onClose}>Cancel</Btn><Btn icon={<Plus size={16} />} disabled={!name.trim()} onClick={() => {
    const off = { show: false, when: '', never: staff || undefined };
    onAdd({ id: 'DT' + Date.now(), name: name.trim(), group: staff ? 'Staff only' : group, staffOnly: staff, access: { Landlord: { ...off }, Tenant: { ...off }, 'Letting agent': { ...off }, Contractor: { ...off } } });
  }}>Add</Btn></>}>
    <Field label="Name"><Text value={name} onChange={setName} placeholder="e.g. Legionella risk assessment" /></Field>
    <Field label="Group"><Select value={group} onChange={setGroup} options={groups.map(g => ({ value: g, label: g }))} /></Field>
    <label className="check"><Toggle on={staff} onChange={setStaff} label="Staff only" />Staff only (can never be shown outside LSP)</label>
  </Modal>;
}

/** Documents & records › Document templates: the wording on LSP paper for quotes, invoices, reports, statements and letters. */
export function DocTemplates() {
  const s = useStore();
  if (s.detail) return <DocTemplatePage id={s.detail} />;
  const { db } = s;
  return <>
    <Head r="doctemplates" />
    <Card title={<span className="clean-h">Templates on LSP paper<InfoTip>Every template uses the logo, address and legal line from Company details. Some have more than one version: the default is used unless staff choose another.</InfoTip></span>}>
      {db.docTemplates.length ? <div className="tablewrap"><table className="t"><thead><tr><th>Template</th><th>Used for</th><th>Versions</th><th>Default</th><th>Last changed</th></tr></thead><tbody>
        {db.docTemplates.map(t => <tr key={t.id} onClick={() => s.go('doctemplates', t.id)}>
          <td><span className="flex"><span className="tile t-brand" style={{ width: 30, height: 30 }}><FileText size={14} /></span><b className="strong">{t.name}</b></span></td><td className="small">{t.usedFor}</td><td>{t.variants.length}</td>
          <td><Chip tone="ok">{t.variants.find(v => v.isDefault)?.name}</Chip></td><td className="small"><span className="stack"><span>{t.at.split(',')[0]}</span><span className="caption">{t.by}</span></span></td>
        </tr>)}
      </tbody></table></div> : <Empty icon={<FileText size={22} />}>No templates yet.</Empty>}
    </Card>
  </>;
}
function DocTemplatePage({ id }: { id: string }) {
  const s = useStore(); const { db } = s; const t0 = db.docTemplates.find(t => t.id === id);
  const x = useDraft((t0 ?? {}) as DocTemplate); const [vid, setVid] = useState(t0?.variants.find(v => v.isDefault)?.id ?? '');
  if (!t0) return <><Head r="doctemplates" extra="Not found" back /><Empty>This template was removed.</Empty></>;
  const d = x.d; const v = d.variants.find(z => z.id === vid) ?? d.variants[0];
  const setV = (p: Partial<Variant>) => x.patch({ variants: d.variants.map(z => z.id === v.id ? { ...z, ...p } : z) });
  const bad = d.variants.flatMap(z => unknownTokens(z.title + ' ' + z.body + ' ' + z.footer));
  const blocked = d.variants.some(z => !z.name.trim() || !z.title.trim() || !z.body.trim()) ? 'Every version needs a name, a heading and some wording.' : bad.length ? `These details don't exist: ${[...new Set(bad)].map(b => `{${b}}`).join(', ')}` : '';
  const tokens = [...new Set([...tokensIn(t0.variants.map(z => z.title + z.body).join(' ')), 'full_name', 'address', 'date', 'amount', 'office_admin', 'office_phone'])].filter(k => k in TOKENS);
  const copy = () => { const n: Variant = { ...v, id: 'V' + Date.now(), name: `${v.name} (copy)`, isDefault: false }; x.patch({ variants: [...d.variants, n] }); setVid(n.id); };
  const sum = () => { const out: string[] = []; d.variants.forEach(z => { const o = t0.variants.find(q => q.id === z.id); if (!o) out.push(`Added “${z.name}”`); else if (JSON.stringify(o) !== JSON.stringify(z)) out.push(o.isDefault !== z.isDefault && z.isDefault ? `“${z.name}” is now the default` : `Changed “${z.name}”`); }); t0.variants.forEach(o => { if (!d.variants.find(z => z.id === o.id)) out.push(`Removed “${o.name}”`); }); return out; };
  return <>
    <Head r="doctemplates" extra={t0.name} title={t0.name} back action={<Btn kind="outline" icon={<Copy size={16} />} onClick={copy}>Add a version</Btn>} />
    <PageTabs value={v.id} onChange={setVid} items={d.variants.map(z => ({ id: z.id, label: z.name + (z.isDefault ? ' · default' : '') }))} />
    <div className="adm-split">
      <div className="col">
        <Card title="This version" action={<div className="flex">{v.isDefault ? <Chip tone="ok">Default</Chip> : <Btn sm kind="outline" icon={<Star size={14} />} onClick={() => x.patch({ variants: d.variants.map(z => ({ ...z, isDefault: z.id === v.id })) })}>Make this the default</Btn>}
          {!v.isDefault && <Btn sm kind="ghost" icon={<Trash2 size={14} />} onClick={() => { x.patch({ variants: d.variants.filter(z => z.id !== v.id) }); setVid(d.variants.find(z => z.isDefault)!.id); }}>Remove</Btn>}</div>}>
          <Field label="Version name (staff see this)"><Text value={v.name} onChange={n => setV({ name: n })} /></Field>
          <TokenFields key={v.id} tokens={tokens} fields={[{ label: 'Heading', value: v.title, set: t => setV({ title: t }) }, { label: 'Wording', value: v.body, set: t => setV({ body: t }), rows: 9 }, { label: 'Footer', value: v.footer, set: t => setV({ footer: t }) }]} />
        </Card>
      </div>
      <div className="sticky"><Card title="Preview with a sample record"><Paper title={v.title} body={v.body} footer={v.footer} logo={db.company.logo} stamp={t0.name === 'Quote' && v.name.includes('approval') ? 'FOR APPROVAL' : undefined} /></Card></div>
    </div>
    <SaveBar dirty={x.dirty} onUndo={x.undo} blocked={blocked} note={x.dirty ? sum().join('; ') : 'Documents already sent keep the wording they were sent with.'}
      onSave={() => s.commit('docTemplates', db.docTemplates.map(t => t.id === id ? { ...d, by: ME_NAME, at: nowStamp() } : t), { page: 'Document templates', item: t0.name, what: sum().join(', ') || 'Changed the wording', before: t0.variants.map(z => z.name + (z.isDefault ? ' (default)' : '')).join(', '), after: d.variants.map(z => z.name + (z.isDefault ? ' (default)' : '')).join(', ') })} />
  </>;
}
