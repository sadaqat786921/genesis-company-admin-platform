import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as D from './data';
import * as S from './seed';

/* Company Admin portal: one shared set-up for the whole platform.
   Every save writes an Audit history entry (who, when, before → after, reason). Entries can't be edited or deleted.
   The demo keeps everything in sessionStorage; "Reset demo data" brings the seed back. */

export type Route = 'overview' | 'subadmins' | 'company' | 'areas' | 'plans' | 'services' | 'products' | 'tax' | 'users' | 'roles' | 'teams'
  | 'onb-tenant' | 'onb-landlord' | 'onb-agent' | 'onb-contractor' | 'reminders' | 'templates' | 'checklists' | 'stages' | 'access' | 'agreements' | 'doctemplates' | 'audit';
export const ROUTES: Route[] = ['overview', 'subadmins', 'company', 'areas', 'plans', 'services', 'products', 'tax', 'users', 'roles', 'teams', 'onb-tenant', 'onb-landlord', 'onb-agent', 'onb-contractor', 'reminders', 'templates', 'checklists', 'stages', 'access', 'agreements', 'doctemplates', 'audit'];

export interface Db {
  company: S.Company; areas: S.Area[]; plans: S.Plan[]; services: S.Service[]; products: S.Product[]; tax: S.Tax;
  users: S.User[]; roles: S.RoleDef[]; landlords: S.LandlordRow[]; shares: S.ShareReq[]; covers: S.Cover[]; unmatched: S.Unmatched[]; onboarding: Record<S.OnbRole, S.Onboarding>;
  reminders: S.Reminder[]; templates: S.Template[]; checklists: S.Checklist[]; processes: S.Process[]; picklists: S.PickList[];
  docTypes: S.DocType[]; agreements: S.Agreement[]; docTemplates: S.DocTemplate[]; audit: S.AuditEntry[];
}
const seed = (): Db => JSON.parse(JSON.stringify({
  company: S.COMPANY, areas: S.AREAS, plans: S.PLANS, services: S.SERVICES, products: S.PRODUCTS, tax: S.TAX, users: S.USERS, roles: S.ROLES, landlords: S.LANDLORD_ROWS, shares: S.SHARES, covers: S.COVERS, unmatched: S.UNMATCHED,
  onboarding: S.ONBOARDING, reminders: S.REMINDERS, templates: S.TEMPLATES, checklists: S.CHECKLISTS, processes: S.PROCESSES, picklists: S.PICKLISTS,
  docTypes: S.DOC_TYPES, agreements: S.AGREEMENTS, docTemplates: S.DOC_TEMPLATES, audit: S.AUDIT,
}));
const DB_KEY = 'genesis-ca-db-v3';
const VIEW_KEY = 'genesis-ca-view-as';
/** Pages a Sub Admin can never open, whatever the Admin ticks. */
export const LOCKED_FOR_SUB: Partial<Record<Route, string>> = { subadmins: 'Only the main Admin creates Sub Admins and chooses their access. A Sub Admin can never give themselves more access.' };
function load(): Db { try { const r = sessionStorage.getItem(DB_KEY); if (r) return { ...seed(), ...JSON.parse(r) }; } catch { /* storage blocked */ } return seed(); }

export interface Change { page: string; item: string; what: string; before?: string; after?: string; reason?: string }
interface Store {
  route: Route; detail: string | null; go: (r: Route, detail?: string | null) => void;
  toast: (msg: string) => void; toasts: { id: number; msg: string }[];
  db: Db;
  /** Save a part of the set-up and write one Audit history entry for it. */
  commit: <K extends keyof Db>(key: K, next: Db[K], change: Change, msg?: string) => void;
  /** Save several changes at once (one audit entry each). */
  commitMany: (parts: Partial<Db>, changes: Change[], msg?: string) => void;
  reset: () => void;
  /** Prototype: see the portal as one Sub Admin (their sidebar and access). null = the main Admin. */
  viewAs: S.User | null; setViewAs: (id: string | null) => void;
  /** Access to a page for whoever is signed in: 'edit' for the main Admin. */
  accessOf: (r: Route) => S.Access3;
  /** Name saved in the Audit history for changes made now. */
  actor: string;
}
const Ctx = createContext<Store>(null as unknown as Store);
export const useStore = () => useContext(Ctx);

let seq = 0;
const entry = (c: Change, who: string): S.AuditEntry => ({ id: 'AU' + Date.now() + '-' + ++seq, at: D.nowStamp(), who, page: c.page, item: c.item, what: c.what, before: c.before ?? '—', after: c.after ?? '—', reason: c.reason?.trim() || undefined });

export function StoreProvider({ children }: { children: ReactNode }) {
  const loc = useLocation(); const nav = useNavigate();
  const parts = loc.pathname.split('/').filter(Boolean);
  const route = (ROUTES.includes(parts[0] as Route) ? parts[0] : 'overview') as Route;
  const detail = parts[1] ? decodeURIComponent(parts[1]) : null;
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const [db, setDb] = useState<Db>(load);
  useEffect(() => { try { sessionStorage.setItem(DB_KEY, JSON.stringify(db)); } catch { /* storage blocked: the demo still works in memory */ } }, [db]);

  const go = useCallback((r: Route, d: string | null = null) => { nav('/' + r + (d ? '/' + encodeURIComponent(d) : '')); window.scrollTo({ top: 0 }); }, [nav]);
  const toast = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2800);
  }, []);
  const [viewId, setViewId] = useState<string | null>(() => { try { return sessionStorage.getItem(VIEW_KEY); } catch { return null; } });
  const viewAs = viewId ? db.users.find(u => u.id === viewId && u.role === 'Sub Admin') ?? null : null;
  const setViewAs = useCallback((id: string | null) => { setViewId(id); try { id ? sessionStorage.setItem(VIEW_KEY, id) : sessionStorage.removeItem(VIEW_KEY); } catch { /* ignore */ } }, []);
  const accessOf = useCallback((r: Route): S.Access3 => !viewAs ? 'edit' : r === 'overview' ? 'view' : LOCKED_FOR_SUB[r] ? 'off' : r === 'audit' ? (viewAs.access?.audit === 'off' || !viewAs.access?.audit ? 'off' : 'view') : viewAs.access?.[r] ?? 'off', [viewAs]);
  const actor = viewAs ? `${viewAs.name} (Sub Admin)` : D.ME_NAME;
  // Saving is checked here, once, for every page: a view-only Sub Admin can never change anything.
  const guard = useRef({ route, accessOf, actor }); guard.current = { route, accessOf, actor };
  const blocked = () => { if (guard.current.accessOf(guard.current.route) !== 'edit') { toast('View only: ask the Admin for edit access'); return true; } return false; };
  const commit = useCallback(<K extends keyof Db>(key: K, next: Db[K], c: Change, msg = 'Saved') => {
    if (blocked()) return; const who = guard.current.actor;
    setDb(d => ({ ...d, [key]: next, audit: [entry(c, who), ...d.audit] })); toast(msg);
  }, [toast]); // eslint-disable-line react-hooks/exhaustive-deps
  const commitMany = useCallback((p: Partial<Db>, cs: Change[], msg = 'Saved') => {
    if (blocked()) return; const who = guard.current.actor;
    setDb(d => ({ ...d, ...p, audit: [...cs.map(c => entry(c, who)).reverse(), ...d.audit] })); toast(msg);
  }, [toast]); // eslint-disable-line react-hooks/exhaustive-deps
  const reset = useCallback(() => { setDb(seed()); setViewAs(null); toast('Demo data reset'); }, [toast, setViewAs]);

  const value = useMemo(() => ({ route, detail, go, toast, toasts, db, commit, commitMany, reset, viewAs, setViewAs, accessOf, actor }), [route, detail, go, toast, toasts, db, commit, commitMany, reset, viewAs, setViewAs, accessOf, actor]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// ---------- lookups ----------
export const staff = (id?: string) => D.STAFF.find(s => s.id === id);
export const money = (n: number): string => n < 0 ? '−' + money(-n) : '£' + n.toLocaleString('en-GB', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
export const staffName = (id?: string) => staff(id)?.name ?? (id ? id : 'Nobody yet');
/** The staff id used for a user (STAFF id when known, otherwise the user id). */
export const staffIdOf = (u: S.User) => D.STAFF.find(x => x.name === u.name)?.id ?? u.id;
/** Name for a staff id, including staff invited in this demo. */
export const personName = (db: Db, id?: string) => !id ? 'Nobody yet' : staff(id)?.name ?? db.users.find(u => u.id === id)?.name ?? id;
/** Staff of one role as select options. */
export const staffOptions = (db: Db, role: 'Supervisor' | 'Office Admin') => db.users.filter(u => u.role === role && u.status !== 'Disabled').map(u => ({ value: staffIdOf(u), label: u.name + (u.status === 'Invited' ? ' (invited)' : '') }));
/** Which area a staff member works in. */
export const areaOfStaff = (db: Db, id: string) => db.areas.find(a => a.supervisor === id || a.oas.includes(id));
/** Exact match of a full postcode to an area: the district is the first part, tidied up. N2 9RF → N2; N20 is not N2. */
export const districtOf = (pc: string) => { const t = pc.toUpperCase().replace(/\s+/g, ' ').trim(); return (t.includes(' ') ? t.split(' ')[0] : t.length > 4 ? t.slice(0, -3) : t).replace(/\s/g, ''); };
export const areasFor = (db: Db, pc: string) => { const d = districtOf(pc); return db.areas.filter(a => a.postcodes.includes(d) || db.shares.some(r => r.status === 'Approved' && r.district === d && r.to === a.id)); };
export const homesOf = (db: Db, areaId: string) => db.landlords.filter(l => l.area === areaId).reduce((n, l) => n + l.homes, 0);
export const landlordsOf = (db: Db, areaId: string) => db.landlords.filter(l => l.area === areaId).length;
