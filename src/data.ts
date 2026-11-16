// Shared helpers and people for the Genesis Company Admin prototype. All names and figures are examples.
// Demo "today" is Thursday 15 Oct 2026. The admin set-up lives in seed.ts.

export type Tone = 'ok' | 'warn' | 'err' | 'info' | 'neutral' | 'brand';

/* ---------- who is signed in ---------- */
/** The Company Admin sets the platform up: business details, areas, plans, users, roles, onboarding, messages, documents. */
export const PORTAL = 'admin' as const;
export const ME = 'ma';
export const ME_NAME = 'Michael Grant';
export const ME_EMAIL = 'm.grant@lsp.co.uk';
/** LSP's main phone line. */
export const LSP_PHONE = '020 7946 0000';

/* ---------- dates ---------- */
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const TODAY = new Date(2026, 9, 15);
export const TODAY_LABEL = '15 Oct 2026';
/** "21 Oct 2026" or "21 Oct 2026, 10:30" → Date */
export function parseDate(s: string): Date {
  const [datePart, time] = s.split(',');
  const [d, m, y] = datePart.trim().split(' ');
  const out = new Date(+(y || 2026), MONTHS.indexOf(m), +d);
  if (time) { const [h, mi] = time.trim().split(':'); out.setHours(+h, +mi); }
  return out;
}
export const fmtDate = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
export const daysFrom = (s: string) => Math.round((new Date(parseDate(s).toDateString()).getTime() - TODAY.getTime()) / 864e5);
/** Real clock time on the demo date, e.g. "15 Oct 2026, 14:05" */
export function nowStamp() { const n = new Date(); return `${TODAY_LABEL}, ${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`; }
/** "2026-11-01" (date input) → "1 Nov 2026" */
export const fromInput = (v: string) => { if (!v) return ''; const d = new Date(v + 'T00:00'); return isNaN(d.getTime()) ? v : fmtDate(d); };
/** "1 Nov 2026" → "2026-11-01" (date input) */
export const toInput = (s?: string) => { if (!s) return ''; const d = parseDate(s); if (isNaN(d.getTime())) return ''; return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/* ---------- shared shapes used by ui.tsx ---------- */
export type Channel = 'Email' | 'Call' | 'Note' | 'Portal' | 'System' | 'SMS';
export interface Comm { id: string; at: string; by: string; channel: Channel; text: string; subject?: string; dir?: 'in' | 'out' }
export type DocStatus = 'Missing' | 'Uploaded' | 'Verified' | 'Rejected' | 'Expired';

/* ---------- LSP staff ---------- */
export interface Staff { id: string; name: string; role: 'Company Admin' | 'Supervisor' | 'Office Admin'; photo?: string; initials: string; color: string; email: string; phone: string }
export const STAFF: Staff[] = [
  { id: 'ma', name: 'Michael Grant', role: 'Company Admin', photo: 'images/av0.jpg', initials: 'MG', color: '#001649', email: 'm.grant@lsp.co.uk', phone: '020 7946 0002' },
  { id: 'sk', name: 'Sarah Khan', role: 'Supervisor', photo: 'images/sarah.jpg', initials: 'SK', color: '#153D91', email: 's.khan@lsp.co.uk', phone: '020 7946 0001' },
  { id: 'et', name: 'Emma Thompson', role: 'Office Admin', photo: 'images/av3.jpg', initials: 'ET', color: '#099FFD', email: 'e.thompson@lsp.co.uk', phone: '020 7946 0011' },
  { id: 'jc', name: 'James Carter', role: 'Office Admin', photo: 'images/av1.jpg', initials: 'JC', color: '#5BAF00', email: 'j.carter@lsp.co.uk', phone: '020 7946 0012' },
  { id: 'ps', name: 'Priya Shah', role: 'Office Admin', initials: 'PS', color: '#153D91', email: 'p.shah@lsp.co.uk', phone: '020 7946 0013' },
  { id: 'lm', name: 'Liam Murphy', role: 'Office Admin', photo: 'images/av5.jpg', initials: 'LM', color: '#0B6FB8', email: 'l.murphy@lsp.co.uk', phone: '020 7946 0014' },
];
