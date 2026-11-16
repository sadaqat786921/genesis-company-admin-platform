import type { Db, Route } from '../store';
import type { Agreement, Reminder } from '../seed';
import type { Tone } from '../data';
import { daysFrom } from '../data';

/** The live version of an agreement (or the newest one if none is live yet). */
export const liveOf = (a: Agreement) => a.versions.find(v => v.status === 'Live') ?? a.versions[a.versions.length - 1];
export const draftOf = (a: Agreement) => a.versions.find(v => v.status === 'Draft');
/** People who still have to accept the live version. */
export const waitingOf = (a: Agreement) => { const live = liveOf(a); return a.people.filter(p => { const x = a.accepts.find(c => c.name === p || c.org === p); return !x || (live.mode !== 'new' && x.v < live.v); }); };

/** "3 days before the rent due date" */
export const timingOf = (r: Pick<Reminder, 'n' | 'unit' | 'when' | 'date'>) => r.n === 0 ? `On ${r.date}` : `${r.n} ${r.n === 1 ? r.unit.replace(/s$/, '') : r.unit} ${r.when} ${r.date}`;

export interface Alert { t: string; d: string; r: Route; id: string | null; tone: Tone }
/** Things the Company Admin should look at: shown on the Overview and in the bell. */
export function attention(db: Db): Alert[] {
  const a: Alert[] = [];
  db.users.filter(u => u.status === 'Locked').forEach(u => a.push({ t: `${u.name} is locked out`, d: `${u.role}${u.org ? ' · ' + u.org : ''} · too many wrong codes`, r: 'users', id: u.id, tone: 'err' }));
  db.areas.filter(x => x.status !== 'Off' && !x.oa).forEach(x => a.push({ t: `${x.name} has no Office Admin`, d: 'Choose who looks after this area', r: 'areas', id: x.id, tone: 'err' }));
  db.agreements.forEach(g => { const d = draftOf(g); if (d) a.push({ t: `${g.name}: version ${d.v} is a draft`, d: `Effective ${d.effective} once published`, r: 'agreements', id: g.id, tone: 'info' }); });
  db.agreements.forEach(g => { const w = waitingOf(g); if (w.length) a.push({ t: `${w.length} still to accept the ${g.name.toLowerCase()}`, d: `Version ${liveOf(g).v} · ${w.slice(0, 2).join(', ')}${w.length > 2 ? '…' : ''}`, r: 'agreements', id: g.id, tone: 'warn' }); });
  db.areas.filter(x => x.status === 'Planned' && x.opens && daysFrom(x.opens) <= 90).forEach(x => a.push({ t: `${x.name} opens on ${x.opens}`, d: `${x.waitlist.length} on the waiting list`, r: 'areas', id: x.id, tone: 'info' }));
  db.reminders.filter(r => !r.on).forEach(r => a.push({ t: `Reminder paused: ${r.name}`, d: timingOf(r), r: 'reminders', id: r.id, tone: 'warn' }));
  db.templates.filter(t => !t.on).forEach(t => a.push({ t: `Message off: ${t.name}`, d: `${t.channel} to ${t.to.toLowerCase()}`, r: 'templates', id: t.id, tone: 'warn' }));
  db.users.filter(u => u.status === 'Invited').forEach(u => a.push({ t: `${u.name} hasn't set a password yet`, d: `${u.role} · invited ${u.created.split(',')[0]}`, r: 'users', id: u.id, tone: 'neutral' }));
  return a;
}

export const roleTone = (r: string): Tone => (({ 'Company Admin': 'brand', Supervisor: 'brand', 'Office Admin': 'info', Landlord: 'ok', Tenant: 'neutral', Applicant: 'neutral', 'Letting agent': 'warn', Contractor: 'neutral' } as Record<string, Tone>)[r] ?? 'neutral');
export const statusTone = (s: string): Tone => (({ Active: 'ok', Live: 'ok', Invited: 'info', Planned: 'info', Draft: 'info', Disabled: 'neutral', Off: 'neutral', Retired: 'neutral', Locked: 'err' } as Record<string, Tone>)[s] ?? 'neutral');
