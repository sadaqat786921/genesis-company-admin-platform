import { useState } from 'react';
import { MapPinned, Users as UsersIc, BellRing, MessageSquareText, ListChecks, ScrollText, BadgePercent, Wrench, ArrowRight, RotateCcw, History, ShieldCheck, AlertTriangle, Info } from 'lucide-react';
import { useStore, staffName } from '../store';
import { Card, Chip, Bar, Btn, Empty, Avatar, Modal } from '../ui';
import { Head } from '../Shell';
import { attention, liveOf, waitingOf, statusTone } from './lib';

/** What needs a look, recent changes, agreements waiting for people, and users and areas at a glance. */
export function Overview() {
  const s = useStore(); const { db } = s; const [reset, setReset] = useState(false);
  const notes = attention(db);
  const roles = ['Company Admin', 'Supervisor', 'Office Admin', 'Landlord', 'Tenant', 'Applicant', 'Letting agent', 'Contractor'] as const;
  const tiles = [
    { r: 'areas' as const, ic: MapPinned, n: `${db.areas.filter(a => a.status === 'Live').length} live`, l: `Areas · ${db.areas.filter(a => a.status === 'Planned').length} opening soon` },
    { r: 'users' as const, ic: UsersIc, n: db.users.filter(u => u.status === 'Active').length, l: `Users active · ${db.users.length} in all` },
    { r: 'plans' as const, ic: BadgePercent, n: db.plans.length, l: 'Plans on offer' },
    { r: 'services' as const, ic: Wrench, n: db.services.filter(x => x.on).length, l: 'Services offered' },
    { r: 'reminders' as const, ic: BellRing, n: `${db.reminders.filter(r => r.on).length} on`, l: `Reminders · ${db.reminders.filter(r => !r.on).length} paused` },
    { r: 'templates' as const, ic: MessageSquareText, n: db.templates.length, l: 'Message templates' },
    { r: 'checklists' as const, ic: ListChecks, n: db.checklists.length, l: 'Checklists' },
    { r: 'roles' as const, ic: ShieldCheck, n: db.roles.length, l: 'Roles with permissions' },
  ];
  return <>
    <Head r="overview" />
    <Card title="At a glance">
      <div className="ovgrid">{tiles.map(t => { const Ic = t.ic; return <button key={t.r} className="ovtile" onClick={() => s.go(t.r)}><span><Ic size={15} />{t.l}</span><b>{t.n}</b></button>; })}</div>
    </Card>
    <div className="grid g2">
      <Card title="Needs a look" action={<Chip tone={notes.length ? 'warn' : 'ok'}>{notes.length ? `${notes.length} things` : 'All clear'}</Chip>}>
        {notes.length ? <div>{notes.slice(0, 8).map((n, i) => <button key={i} className="rowlink" onClick={() => s.go(n.r, n.id)}>
          <span className={`tile t-${n.tone}`} style={{ width: 32, height: 32 }}>{n.tone === 'err' ? <AlertTriangle size={15} /> : <Info size={15} />}</span>
          <div className="stack grow"><b>{n.t}</b><span className="caption">{n.d}</span></div><ArrowRight size={15} color="#98A2B3" /></button>)}</div>
          : <Empty icon={<ShieldCheck size={22} />}>Nothing needs a look right now.</Empty>}
      </Card>
      <Card title="Recent changes" action={<Btn sm kind="ghost" icon={<History size={14} />} onClick={() => s.go('audit')}>Audit history</Btn>}>
        <div>{db.audit.slice(0, 7).map(a => <button key={a.id} className="rowlink" onClick={() => s.go('audit', a.id)}>
          <Avatar name={a.who} id={a.who === 'Michael Grant' ? 'ma' : a.who === 'Sarah Khan' ? 'sk' : undefined} />
          <div className="stack grow"><b>{a.what} · {a.item}</b><span className="caption">{a.page} · {a.who} · {a.at}</span></div></button>)}</div>
      </Card>
    </div>
    <div className="grid g2">
      <Card title="Agreements" sub="How many people have accepted the live version" action={<Btn sm kind="ghost" onClick={() => s.go('agreements')}>Open</Btn>}>
        <div className="col" style={{ gap: 14 }}>{db.agreements.map(g => { const live = liveOf(g); const wait = waitingOf(g).length; const n = g.people.length; const done = n - wait; return <button key={g.id} className="stack" style={{ gap: 6, border: 0, background: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }} onClick={() => s.go('agreements', g.id)}>
          <div className="flex between"><b className="small" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{g.name} · v{live.v}</b><span className="caption">{done} of {n}{wait ? ` · ${wait} waiting` : ''}</span></div>
          <Bar value={n ? done / n * 100 : 100} tone={wait ? 'warn' : 'ok'} /></button>; })}</div>
      </Card>
      <Card title="Areas" action={<Btn sm kind="ghost" onClick={() => s.go('areas')}>Open</Btn>}>
        <div>{db.areas.map(a => <button key={a.id} className="rowlink" onClick={() => s.go('areas', a.id)}>
          <span className="tile t-brand" style={{ width: 32, height: 32 }}><MapPinned size={15} /></span>
          <div className="stack grow"><b>{a.name}</b><span className="caption">{a.postcodes.join(', ')} · {a.oa ? staffName(a.oa) : 'No Office Admin'}</span></div>
          <span className="caption" style={{ width: 70 }}>{a.homes} homes</span><Chip tone={statusTone(a.status)}>{a.status === 'Planned' ? `Opens ${a.opens}` : a.status}</Chip></button>)}</div>
      </Card>
    </div>
    <div className="grid g2">
      <Card title="Users by role" action={<Btn sm kind="ghost" onClick={() => s.go('users')}>Open</Btn>}>
        <div className="tablewrap"><table className="t"><thead><tr><th>Role</th><th>Active</th><th>Invited</th><th>Locked</th><th>Disabled</th></tr></thead><tbody>
          {roles.map(r => { const u = db.users.filter(x => x.role === r); const c = (st: string) => u.filter(x => x.status === st).length; return <tr key={r} onClick={() => s.go('users')}><td className="strong">{r}</td><td>{c('Active')}</td><td>{c('Invited') || '—'}</td><td>{c('Locked') ? <Chip tone="err">{c('Locked')}</Chip> : '—'}</td><td>{c('Disabled') || '—'}</td></tr>; })}
        </tbody></table></div>
      </Card>
      <Card title="Demo data" sub="This prototype keeps your changes in this browser tab.">
        <div className="col" style={{ gap: 12 }}>
          <span className="small">Every change you save shows on the other pages and in the Audit history. Reset brings back the sample set-up.</span>
          <div><Btn kind="outline" icon={<RotateCcw size={16} />} onClick={() => setReset(true)}>Reset demo data</Btn></div>
        </div>
      </Card>
    </div>
    {reset && <Modal title="Reset demo data?" sub="Every change made in this demo is undone and the sample set-up comes back." onClose={() => setReset(false)}
      footer={<><Btn kind="outline" onClick={() => setReset(false)}>Cancel</Btn><Btn kind="danger" icon={<RotateCcw size={16} />} onClick={() => { s.reset(); setReset(false); }}>Reset demo data</Btn></>} />}
  </>;
}
