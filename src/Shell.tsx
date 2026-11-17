import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  LayoutDashboard, Building2, MapPinned, BadgePercent, Wrench, Barcode, Landmark, Users, ShieldCheck, Network, KeyRound, Home, Briefcase, HardHat,
  BellRing, MessageSquareText, ListChecks, Workflow, FolderLock, ScrollText, FileText, History,
  UserCog, PanelLeft, LogOut, Search, Bell, CalendarDays, ChevronRight, ArrowRight, ArrowLeft, Eye, EyeOff, ShieldAlert, Check, RotateCcw, MoreVertical,
} from 'lucide-react';
import { useStore, type Route } from './store';
import { daysFrom, parseDate, LSP_PHONE, ME_NAME, ME_EMAIL } from './data';
import { Btn, IBtn, Note, Avatar, Modal } from './ui';
import { attention, draftOf } from './pages/lib';

export const NAV: { group: string; items: { id: Route; label: string; icon: typeof Home }[] }[] = [
  { group: 'Overview', items: [{ id: 'overview', label: 'Overview', icon: LayoutDashboard }] },
  { group: 'Business', items: [{ id: 'company', label: 'Company details', icon: Building2 }, { id: 'areas', label: 'Areas', icon: MapPinned }, { id: 'plans', label: 'Plans', icon: BadgePercent }, { id: 'services', label: 'Services & prices', icon: Wrench }, { id: 'products', label: 'Products & codes', icon: Barcode }, { id: 'tax', label: 'VAT & tax', icon: Landmark }] },
  { group: 'People', items: [{ id: 'users', label: 'Users', icon: Users }, { id: 'subadmins', label: 'Sub Admins', icon: UserCog }, { id: 'roles', label: 'Roles & permissions', icon: ShieldCheck }, { id: 'teams', label: 'Teams & cover', icon: Network }] },
  { group: 'Onboarding', items: [{ id: 'onb-tenant', label: 'Tenant onboarding', icon: KeyRound }, { id: 'onb-landlord', label: 'Landlord onboarding', icon: Home }, { id: 'onb-agent', label: 'Letting agent onboarding', icon: Briefcase }, { id: 'onb-contractor', label: 'Contractor onboarding', icon: HardHat }] },
  { group: 'Messages & work', items: [{ id: 'reminders', label: 'Reminders', icon: BellRing }, { id: 'templates', label: 'Message templates', icon: MessageSquareText }, { id: 'checklists', label: 'Checklists', icon: ListChecks }, { id: 'stages', label: 'Stages & lists', icon: Workflow }] },
  { group: 'Documents & records', items: [{ id: 'access', label: 'Document access', icon: FolderLock }, { id: 'agreements', label: 'Agreements', icon: ScrollText }, { id: 'doctemplates', label: 'Document templates', icon: FileText }, { id: 'audit', label: 'Audit history', icon: History }] },
];
export const LABEL: Record<Route, string> = Object.fromEntries(NAV.flatMap(g => g.items.map(i => [i.id, i.label]))) as Record<Route, string>;
const GROUP: Record<Route, string> = Object.fromEntries(NAV.flatMap(g => g.items.map(i => [i.id, g.group]))) as Record<Route, string>;

export function useCounts() {
  const { db } = useStore();
  return {
    users: db.users.filter(u => u.status === 'Locked').length,
    areas: db.unmatched.length + db.shares.filter(r => r.status === 'Waiting').length,
    agreements: db.agreements.filter(a => draftOf(a)).length,
    reminders: db.reminders.filter(r => !r.on).length,
  } as Partial<Record<Route, number>>;
}

export function Sidebar({ onLogout }: { onLogout: () => void }) {
  const s = useStore(); const counts = useCounts();
  const [collapsed, setCollapsed] = useState(false); const [menu, setMenu] = useState(false); const [reset, setReset] = useState(false);
  return (
    <aside className="sidebar" style={collapsed ? { width: 76 } : undefined} aria-label="Main menu">
      <div className="sb-logo">{!collapsed && <img src="images/logo.svg" alt="Landlord Service Plans" />}<button onClick={() => setCollapsed(c => !c)} aria-label="Collapse menu"><PanelLeft size={18} strokeWidth={1.8} /></button></div>
      <nav className="sb-nav">
        {NAV.filter(g => g.items.some(it => s.accessOf(it.id) !== 'off')).map((g, gi) => <div key={g.group} className={gi > 0 ? 'sb-group' : undefined}>
          {gi > 0 && !collapsed && <span className="sec-label" style={{ padding: '0 10px 4px', fontSize: 10 }}>{g.group}</span>}
          {g.items.filter(it => s.accessOf(it.id) !== 'off').map(it => { const Ic = it.icon; const n = s.viewAs ? 0 : counts[it.id]; return (
            <button key={it.id} className={`nav${s.route === it.id ? ' on' : ''}`} onClick={() => s.go(it.id)} title={it.label} aria-current={s.route === it.id ? 'page' : undefined}>
              <Ic size={20} strokeWidth={1.8} />{!collapsed && <span>{it.label}</span>}{!collapsed && !!n && <span className="count">{n}</span>}
            </button>); })}
        </div>)}
      </nav>
      <div className="sb-user" style={{ position: 'relative' }}>{s.viewAs ? <Avatar name={s.viewAs.name} size="md" /> : <Avatar id="ma" size="md" />}{!collapsed && <div className="stack grow"><b style={{ fontSize: 13, color: 'var(--text-primary)' }}>{s.viewAs?.name ?? ME_NAME}</b><span className="caption">{s.viewAs ? 'Sub Admin' : 'Company Admin'}</span></div>}
        <button onClick={() => setMenu(m => !m)} aria-label="Account menu" title="Account menu"><MoreVertical size={18} strokeWidth={1.8} /></button>
        {menu && <div className="more-m" style={{ bottom: 'calc(100% + 6px)', top: 'auto', left: 0, right: 0 }} onMouseLeave={() => setMenu(false)}>
          {s.viewAs && <button onClick={() => { setMenu(false); s.setViewAs(null); s.go('subadmins', s.viewAs!.id); }}><UserCog size={16} />Back to my view (Admin)</button>}
          <button onClick={() => { setMenu(false); setReset(true); }}><RotateCcw size={16} />Reset demo data</button>
          <button onClick={() => { setMenu(false); onLogout(); }}><LogOut size={16} />Log out</button>
        </div>}
      </div>
      {reset && <Modal title="Reset demo data?" sub="Every change made in this demo is undone and the sample set-up comes back. Only for the prototype: the live product has no reset." onClose={() => setReset(false)}
        footer={<><Btn kind="outline" onClick={() => setReset(false)}>Cancel</Btn><Btn kind="danger" icon={<RotateCcw size={16} />} onClick={() => { s.reset(); setReset(false); s.go('overview'); }}>Reset demo data</Btn></>} />}
    </aside>
  );
}

export function PageHeader({ title, action, crumbs, back }: { title: ReactNode; action?: ReactNode; crumbs?: { label: string; onClick?: () => void }[]; back?: () => void }) {
  const s = useStore(); const { db } = s;
  const [q, setQ] = useState('');
  const [pop, setPop] = useState<'' | 'bell' | 'cal'>('');
  const ref = useRef<HTMLDivElement>(null);
  const results = useMemo(() => {
    const t = q.trim().toLowerCase(); if (t.length < 2) return [];
    const r: { rt: Route; label: string; sub: string; go: () => void }[] = [];
    NAV.flatMap(g => g.items).filter(i => s.accessOf(i.id) !== 'off' && i.label.toLowerCase().includes(t)).forEach(i => r.push({ rt: i.id, label: i.label, sub: 'Page', go: () => s.go(i.id) }));
    db.users.filter(x => (x.name + ' ' + x.email + ' ' + (x.org ?? '')).toLowerCase().includes(t)).forEach(x => r.push({ rt: 'users' as Route, label: x.name, sub: `User · ${x.role}`, go: () => s.go('users', x.id) }));
    db.areas.filter(x => (x.name + ' ' + x.postcodes.join(' ')).toLowerCase().includes(t)).forEach(x => r.push({ rt: 'areas' as Route, label: `Area ${x.n} · ${x.name}`, sub: `${x.postcodes.slice(0, 6).join(', ')}`, go: () => s.go('areas', x.id) }));
    db.templates.filter(x => (x.name + ' ' + x.subject).toLowerCase().includes(t)).forEach(x => r.push({ rt: 'templates' as Route, label: x.name, sub: `Message template · ${x.channel}`, go: () => s.go('templates', x.id) }));
    db.reminders.filter(x => x.name.toLowerCase().includes(t)).forEach(x => r.push({ rt: 'reminders' as Route, label: x.name, sub: 'Reminder', go: () => s.go('reminders', x.id) }));
    db.checklists.filter(x => x.name.toLowerCase().includes(t)).forEach(x => r.push({ rt: 'checklists' as Route, label: x.name, sub: 'Checklist', go: () => s.go('checklists', x.id) }));
    db.agreements.filter(x => x.name.toLowerCase().includes(t)).forEach(x => r.push({ rt: 'agreements' as Route, label: x.name, sub: 'Agreement', go: () => s.go('agreements', x.id) }));
    db.docTemplates.filter(x => x.name.toLowerCase().includes(t)).forEach(x => r.push({ rt: 'doctemplates' as Route, label: x.name, sub: 'Document template', go: () => s.go('doctemplates', x.id) }));
    db.products.filter(x => (x.code + ' ' + x.name).toLowerCase().includes(t)).forEach(x => r.push({ rt: 'products' as Route, label: `${x.code} · ${x.name}`, sub: 'Product or service', go: () => s.go('products', x.code) }));
    db.services.filter(x => x.name.toLowerCase().includes(t)).forEach(x => r.push({ rt: 'services' as Route, label: x.name, sub: 'Service', go: () => s.go('services', x.id) }));
    return r.filter(x => s.accessOf(x.rt) !== 'off').slice(0, 9);
  }, [q, s, db]);
  const notes = attention(db).filter(n => s.accessOf(n.r) !== 'off');
  const cal = [
    ...db.covers.filter(c => !c.ended).map(c => ({ d: c.from, t: `Holiday cover starts`, p: `Area ${db.areas.find(a => a.id === c.area)?.n ?? ''} · ends ${c.to}`, r: 'teams' as Route, id: null as string | null })),
    ...db.areas.filter(a => a.status === 'Planned' && a.opens).map(a => ({ d: a.opens, t: `Area ${a.n} opens`, p: `${a.waitlist.length} on the waiting list`, r: 'areas' as Route, id: a.id as string | null })),
    ...db.agreements.flatMap(g => g.versions.filter(v => v.status === 'Draft' || (v.status === 'Live' && daysFrom(v.effective) >= 0)).map(v => ({ d: v.effective, t: `${g.name} v${v.v}`, p: v.status === 'Draft' ? 'Draft · effective date' : 'Comes into effect', r: 'agreements' as Route, id: g.id as string | null }))),
    ...(db.tax.vatOn ? [] : [{ d: db.tax.vatFrom, t: 'VAT start date (if switched on)', p: `${db.tax.vatRate}% on LSP fees`, r: 'tax' as Route, id: null as string | null }]),
    { d: db.tax.certBy, t: 'Yearly tax certificates due', p: 'Overseas landlords', r: 'tax' as Route, id: null as string | null },
  ].filter(c => daysFrom(c.d) >= 0 && s.accessOf(c.r) !== 'off').sort((a, b) => parseDate(a.d).getTime() - parseDate(b.d).getTime()).slice(0, 7);
  return (
    <header className="header">
      {back && <IBtn icon={<ArrowLeft size={18} />} onClick={back} label="Back" />}
      <div className="grow">
        {crumbs && <div className="crumbs">{crumbs.map((c, i) => <span key={i} className="flex" style={{ gap: 6 }}>{i > 0 && <ChevronRight size={12} />}{c.onClick ? <button onClick={c.onClick}>{c.label}</button> : <span>{c.label}</span>}</span>)}</div>}
        <h1 className="h1">{title}</h1>
      </div>
      {s.route === 'overview' && <>
      <div className="searchwrap">
        <label className="search"><Search size={18} strokeWidth={1.8} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search settings, users, templates" aria-label="Search everything" /><span className="kbd">⌘K</span></label>
        {results.length > 0 && <div className="pop" style={{ left: 0, right: 'auto', width: 320 }}>{results.map((r, i) => <button key={i} className="item click" style={{ padding: '8px 10px' }} onClick={() => { setQ(''); r.go(); }}><div className="stack"><b style={{ fontSize: 12.5 }}>{r.label}</b><span className="caption">{r.sub}</span></div></button>)}</div>}
      </div>
      <div style={{ position: 'relative' }} ref={ref}>
        <div className="flex" style={{ gap: 12 }}>
          <button className="ibtn" onClick={() => setPop(p => p === 'bell' ? '' : 'bell')} aria-label="Alerts"><Bell size={20} strokeWidth={1.8} />{notes.length > 0 && <span className="dot" />}</button>
          <button className="ibtn" onClick={() => setPop(p => p === 'cal' ? '' : 'cal')} aria-label="Calendar"><CalendarDays size={20} strokeWidth={1.8} /></button>
        </div>
        {pop === 'bell' && <div className="pop"><div className="flex between" style={{ padding: '2px 4px 6px' }}><b className="h2">Needs a look</b><span className="caption">{notes.length}</span></div>
          {notes.slice(0, 8).map((n, i) => <button key={i} className="item click" style={{ padding: '8px 10px' }} onClick={() => { setPop(''); s.go(n.r, n.id); }}><span className={`tile t-${n.tone}`} style={{ width: 30, height: 30 }}><Bell size={15} /></span><div className="stack grow"><b style={{ fontSize: 12.5 }}>{n.t}</b><span className="caption">{n.d}</span></div><ArrowRight size={14} color="#98A2B3" /></button>)}
          {!notes.length && <div className="empty">Nothing needs a look.</div>}
          <button className="btn ghost sm" onClick={() => { setPop(''); s.go('overview'); }}>Open the overview</button></div>}
        {pop === 'cal' && <div className="pop"><b className="h2" style={{ padding: '2px 4px 6px' }}>Coming up</b>
          {cal.map((c, i) => { const [dd, mm] = c.d.split(' '); return <button key={i} className="item click" style={{ padding: '8px 10px' }} onClick={() => { setPop(''); s.go(c.r, c.id); }}><span className="datetile t-info" style={{ width: 40, height: 42 }}><b style={{ fontSize: 14 }}>{dd}</b><span>{(mm || '').toUpperCase()}</span></span><div className="stack"><b style={{ fontSize: 12.5 }}>{c.t}</b><span className="caption">{c.p}</span></div></button>; })}
          {!cal.length && <div className="empty">Nothing coming up.</div>}</div>}
      </div>
      </>}
      {action}
    </header>
  );
}

export const crumbsFor = (r: Route, go: (r: Route) => void, extra?: string) => {
  const c: { label: string; onClick?: () => void }[] = [{ label: GROUP[r] }, { label: LABEL[r], onClick: extra ? () => go(r) : undefined }];
  if (extra) c.push({ label: extra });
  return c;
};
/** Page header with the usual breadcrumbs. */
export function Head({ r, title, extra, action, back }: { r: Route; title?: ReactNode; extra?: string; action?: ReactNode; back?: boolean }) {
  const s = useStore();
  return <PageHeader crumbs={r === 'overview' ? undefined : crumbsFor(r, s.go, extra)} title={title ?? LABEL[r]} action={action} back={back ? () => s.go(r) : undefined} />;
}

/** Sign in (email, password, then a 6-digit code). */
export function Login({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<'in' | 'code' | 'locked' | 'forgot'>('in');
  const [email, setEmail] = useState(ME_EMAIL);
  const [pw, setPw] = useState('••••••••••');
  const [show, setShow] = useState(false);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [wrong, setWrong] = useState(0);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const verify = () => {
    if (code.join('') === '123456') return onDone();
    const w = wrong + 1; setWrong(w); setCode(['', '', '', '', '', '']); refs.current[0]?.focus();
    if (w >= 5) setStep('locked');
  };
  return (
    <div className="login">
      <aside className="login-art">
        <img src="images/logo-white.svg" alt="Landlord Service Plans" style={{ width: 250 }} />
        <h2 style={{ fontSize: 38, lineHeight: 1.18, fontWeight: 800, letterSpacing: '-.02em', marginTop: 64, maxWidth: 460 }}>Set up Genesis <span style={{ color: '#8FD64A' }}>for the whole business.</span></h2>
        <p style={{ color: '#C3CDE4', fontSize: 15, lineHeight: 1.6, maxWidth: 440 }}>Areas, plans, users and permissions, onboarding checks, reminders, messages, checklists and agreements, all in one place. Every change is recorded.</p>
        <div className="photo" style={{ height: 236, marginTop: 36, backgroundImage: 'url(images/home2.jpg)', boxShadow: '0 24px 48px rgba(0,0,0,.35)' }} />
        <div className="flex" style={{ gap: 24, marginTop: 'auto', color: '#DCE3F2', fontWeight: 600 }}><span className="flex"><MapPinned size={16} color="#8FD64A" />Areas</span><span className="flex"><Users size={16} color="#8FD64A" />Users</span><span className="flex"><MessageSquareText size={16} color="#8FD64A" />Messages</span><span className="flex"><History size={16} color="#8FD64A" />Audit</span></div>
      </aside>
      <main className="login-form"><div>
        {step === 'in' && <form onSubmit={e => { e.preventDefault(); setStep('code'); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 style={{ fontSize: 30, fontWeight: 700, margin: 0 }}>Welcome back</h1>
          <p className="small" style={{ margin: 0, fontSize: 14 }}>Company Admin portal. Only people with the Company Admin role can sign in here.</p>
          <label className="field"><span>Email</span><input className="input" value={email} onChange={e => setEmail(e.target.value)} type="email" /></label>
          <label className="field"><span>Password</span><div style={{ position: 'relative' }}><input className="input" value={pw} onChange={e => setPw(e.target.value)} type={show ? 'text' : 'password'} /><button type="button" onClick={() => setShow(v => !v)} aria-label="Show password" style={{ position: 'absolute', right: 10, top: 11, border: 0, background: 'none', color: '#667085' }}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
          <Btn type="submit">Sign in <ArrowRight size={18} /></Btn>
          <div className="flex between"><span /><button type="button" className="link small" onClick={() => setStep('forgot')}>Forgot password?</button></div>
          <Note>Every change you save here is recorded in the Audit history with your name, the time and the reason.</Note>
        </form>}
        {step === 'forgot' && <form onSubmit={e => { e.preventDefault(); setStep('in'); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Reset your password</h1>
          <p className="small" style={{ margin: 0, fontSize: 14 }}>We'll email a reset link to your work address.</p>
          <label className="field"><span>Email</span><input className="input" value={email} onChange={e => setEmail(e.target.value)} type="email" /></label>
          <Btn type="submit">Send reset link</Btn>
          <button type="button" className="btn ghost" onClick={() => setStep('in')}>Back to sign in</button>
        </form>}
        {step === 'code' && <form onSubmit={e => { e.preventDefault(); verify(); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span className="tile lg t-brand"><ShieldCheck size={22} /></span>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Enter your security code</h1>
          <p className="small" style={{ margin: 0, fontSize: 14 }}>We sent a 6-digit code to your phone ending in <b style={{ color: '#0F1828' }}>0002</b>. For this demo, use <b style={{ color: '#0F1828' }}>123456</b>.</p>
          <div className="otp">{code.map((c, i) => <input key={i} ref={el => { refs.current[i] = el; }} inputMode="numeric" maxLength={1} value={c} aria-label={`Digit ${i + 1}`} autoFocus={i === 0}
            onChange={e => { const v = e.target.value.replace(/\D/g, ''); const n = [...code]; n[i] = v; setCode(n); if (v && i < 5) refs.current[i + 1]?.focus(); }}
            onKeyDown={e => { if (e.key === 'Backspace' && !code[i] && i > 0) refs.current[i - 1]?.focus(); }} />)}</div>
          {wrong > 0 && <Note tone="err">That code is not right. {5 - wrong} {5 - wrong === 1 ? 'try' : 'tries'} left before the account locks.</Note>}
          <Btn type="submit" disabled={code.join('').length < 6}>Verify and continue</Btn>
          <button type="button" className="btn ghost" onClick={() => setStep('in')}>Back to sign in</button>
        </form>}
        {step === 'locked' && <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span className="tile lg t-err"><ShieldAlert size={22} /></span>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Your account is locked</h1>
          <p className="small" style={{ margin: 0, fontSize: 14 }}>There were too many wrong security codes, so the account is locked to keep it safe. Call {LSP_PHONE} to unlock it.</p>
          <Btn icon={<Check size={16} />} onClick={() => { setStep('in'); setWrong(0); }}>Back to sign in</Btn>
        </div>}
      </div></main>
    </div>
  );
}
