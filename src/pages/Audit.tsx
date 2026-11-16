import { useState } from 'react';
import { Download, History, Lock } from 'lucide-react';
import { useStore } from '../store';
import { parseDate } from '../data';
import { Card, Btn, Empty, MiniSearch, Drawer, Facts, Avatar, InfoTip, Note } from '../ui';
import { Head } from '../Shell';
import { downloadCsv } from '../admin';

/** Documents & records › Audit history: every save, with who, when, before → after and the reason. Entries can't be edited or deleted. */
export function Audit() {
  const s = useStore(); const { db } = s;
  const [q, setQ] = useState(''); const [page, setPage] = useState('all'); const [who, setWho] = useState('all'); const [year, setYear] = useState('all');
  const pages = [...new Set(db.audit.map(a => a.page))].sort(); const people = [...new Set(db.audit.map(a => a.who))].sort();
  const years = [...new Set(db.audit.map(a => String(parseDate(a.at).getFullYear())))].sort().reverse();
  const list = db.audit.filter(a => (page === 'all' || a.page === page) && (who === 'all' || a.who === who) && (year === 'all' || String(parseDate(a.at).getFullYear()) === year)
    && (a.item + ' ' + a.what + ' ' + a.before + ' ' + a.after + ' ' + (a.reason ?? '')).toLowerCase().includes(q.toLowerCase()))
    .sort((x, y) => parseDate(y.at).getTime() - parseDate(x.at).getTime());
  const open = s.detail ? db.audit.find(a => a.id === s.detail) : null;
  const clip = (t: string) => t.length > 90 ? t.slice(0, 90) + '…' : t;
  return <>
    <Head r="audit" action={<Btn kind="outline" icon={<Download size={16} />} disabled={!list.length} onClick={() => { downloadCsv('audit-history.csv', [['When', 'Who', 'Page', 'Item', 'What changed', 'Before', 'After', 'Reason'], ...list.map(a => [a.at, a.who, a.page, a.item, a.what, a.before, a.after, a.reason ?? ''])]); s.toast(`${list.length} entries downloaded`); }}>Export CSV</Btn>} />
    <Card title={<span className="clean-h"><Lock size={15} />Every change to the set-up<InfoTip>Written automatically every time someone saves. Entries can't be edited or deleted, not even by a Company Admin.</InfoTip></span>}>
      <div className="toolbar">
        <MiniSearch value={q} onChange={setQ} placeholder="Search what changed or the reason" />
        <select className="fsel" aria-label="Page" value={page} onChange={e => setPage(e.target.value)}><option value="all">All pages</option>{pages.map(p => <option key={p}>{p}</option>)}</select>
        <select className="fsel" aria-label="Who" value={who} onChange={e => setWho(e.target.value)}><option value="all">Anyone</option>{people.map(p => <option key={p}>{p}</option>)}</select>
        <select className="fsel" aria-label="Year" value={year} onChange={e => setYear(e.target.value)}><option value="all">Any year</option>{years.map(y => <option key={y}>{y}</option>)}</select>
        <span className="caption">{list.length} of {db.audit.length}</span>
      </div>
      {list.length ? <div className="tablewrap"><table className="t"><thead><tr><th>When</th><th>Who</th><th>Page</th><th>What changed</th><th>Before → after</th><th>Reason</th></tr></thead><tbody>
        {list.map(a => <tr key={a.id} onClick={() => s.go('audit', a.id)}>
          <td className="small" style={{ whiteSpace: 'nowrap' }}><span className="stack"><b style={{ color: 'var(--text-primary)' }}>{a.at.split(',')[0]}</b><span className="caption">{a.at.split(', ')[1]}</span></span></td>
          <td><span className="flex"><Avatar name={a.who} id={a.who === 'Michael Grant' ? 'ma' : a.who === 'Sarah Khan' ? 'sk' : undefined} />{a.who}</span></td>
          <td className="small">{a.page}</td>
          <td><span className="stack"><b className="strong">{a.what}</b><span className="caption">{a.item}</span></span></td>
          <td style={{ maxWidth: 320 }}><span className="diffb">{a.before !== '—' && <s>{clip(a.before)}</s>}<ins>{clip(a.after)}</ins></span></td>
          <td className="small" style={{ maxWidth: 200 }}>{a.reason ?? '—'}</td>
        </tr>)}
      </tbody></table></div> : <Empty icon={<History size={22} />}>No changes match. Clear the search or filters.</Empty>}
    </Card>
    {open && <Drawer title={open.what} sub={`${open.page} · ${open.item}`} icon={<span className="tile t-brand"><History size={18} /></span>} onClose={() => s.go('audit')}>
      <Facts items={[['When', open.at], ['Who', open.who], ['Page', open.page], ['Entry', open.id]]} />
      <div className="col" style={{ gap: 6 }}><b className="h2" style={{ fontSize: 13 }}>Before</b><div className="lrow" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{open.before}</div></div>
      <div className="col" style={{ gap: 6 }}><b className="h2" style={{ fontSize: 13 }}>After</b><div className="lrow" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, background: 'var(--ok-bg)' }}>{open.after}</div></div>
      <div className="col" style={{ gap: 6 }}><b className="h2" style={{ fontSize: 13 }}>Reason</b><div className="lrow">{open.reason ?? 'No reason needed for this change.'}</div></div>
      <Note><Lock size={13} style={{ verticalAlign: -2 }} /> This entry can't be edited or deleted.</Note>
    </Drawer>}
  </>;
}
