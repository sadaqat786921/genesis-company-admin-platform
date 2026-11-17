// Everything the Company Admin manages, as demo data. The store keeps a copy in sessionStorage
// ("Reset demo data" brings this back). Names, figures and wording are examples for the client to confirm.

/* =========================== types =========================== */
export type Who = 'Landlord' | 'Tenant' | 'Applicant' | 'Rent sharer' | 'Letting agent' | 'Contractor' | 'Supervisor' | 'Office Admin' | 'Company Admin' | 'Enquirer' | 'Everyone';
export type Audience = 'Landlord' | 'Tenant' | 'Letting agent' | 'Contractor';
export const AUDIENCES: Audience[] = ['Landlord', 'Tenant', 'Letting agent', 'Contractor'];

export interface Company {
  name: string; trading: string; companyNo: string; address: string; phone: string; emergency: string; email: string; website: string;
  /** The Outlook mailbox every email is sent from. */ sender: string; hours: string; payDays: number;
  bankName: string; sortCode: string; account: string; logo: string;
  signature: { closing: string; showLogo: boolean; showRole: boolean; legal: string };
}
export interface Waiter { name: string; email: string; postcode: string; at: string; kind: 'Landlord' | 'Tenant' | 'Letting agent' }
export interface Area {
  id: string; /** Area number on the map (1–4). */ n: number; name: string; /** Where the Supervisor is based. */ base: string;
  /** Postcode districts (the first part of the postcode). Each district belongs to one area. */ postcodes: string[];
  /** The one Supervisor responsible for the area (staff id). */ supervisor: string; /** The area's own team of Office Admins (staff ids). One area each. */ oas: string[];
  status: 'Live' | 'Planned' | 'Off'; opens: string;
  /** What people outside a live area see on the website. */ message: string;
  tenants: number; contractors: number; waitlist: Waiter[]; created: string;
}
/** A request to share a district with a second area for a while. Only the Admin approves; a Supervisor can never widen their own access. */
export interface ShareReq { id: string; district: string; owner: string; to: string; by: string; reason: string; until: string; at: string; status: 'Waiting' | 'Approved' | 'Rejected' | 'Ended'; decided?: string }
/** Holiday cover: another Supervisor gets temporary access to an area with their own login. It ends by itself. */
export interface Cover { id: string; area: string; absent: string; cover: string; from: string; to: string; canDecide: boolean; absentReadOnly: boolean; by: string; at: string; ended?: string }
/** A home or enquiry whose postcode matched no area, or more than one. It waits here until the Admin places it. */
export interface Unmatched { id: string; address: string; postcode: string; source: 'Website enquiry' | 'Added by staff' | 'Import'; at: string; why: string }
export interface Plan { id: string; name: string; fee: number; limit: number | null; budget: boolean; included: string[]; web: boolean; landlords: number; from: string; desc: string }
export type SvcGroup = 'Safety checks' | 'Repairs' | 'Tenancy changeover' | 'Management';
export interface Service { id: string; name: string; group: SvcGroup; to: ('Landlords' | 'Letting agents')[]; price: number; per: string; trade: string; on: boolean; desc: string; often?: string }
export interface Product { code: string; name: string; desc: string; rate: number; kind: 'Service' | 'Labour' | 'Material'; on: boolean; used: number }
export interface Tax { vatOn: boolean; vatNo: string; vatRate: number; vatFrom: string; nrlRate: number; hmrcRef: string; nrlRemind: number; certBy: string; budgetAlerts: number[] }

export type Role = 'Company Admin' | 'Sub Admin' | 'Supervisor' | 'Office Admin' | 'Landlord' | 'Tenant' | 'Applicant' | 'Letting agent' | 'Contractor';
export type UserStatus = 'Active' | 'Invited' | 'Disabled' | 'Locked';
export interface User {
  id: string; name: string; email: string; phone: string; role: Role; /** Letting agent team role, or a custom staff role. */ sub?: string;
  org?: string; areas: string[]; status: UserStatus; last: string; twoStep: boolean; created: string; logins: string[];
  /** Sub Admins only: which sidebar pages they can open, and whether they can change them. */ access?: Record<string, Access3>;
  /** Sub Admins: the Admin set the first password; they must change it at first sign-in. */ pwChange?: boolean;
}
/** A Sub Admin's access to one sidebar page. */
export type Access3 = 'off' | 'view' | 'edit';
export interface Perm { id: string; group: string; label: string; /** Set by the client's flow chart: can't be changed here. */ core?: string }
export interface RoleDef { id: string; name: string; kind: 'staff' | 'agent' | 'portal'; desc: string; perms: string[]; locked?: boolean; custom?: boolean }
export interface LandlordRow { id: string; name: string; area: string; admin: string; homes: number; tasks: number }

export type OnbRole = 'tenant' | 'landlord' | 'agent' | 'contractor';
export type OnEnd = 'Pause them' | 'Ask for a new one' | 'Block payouts' | 'Remind only';
export interface OnbDoc {
  id: string; name: string; who: string; need: 'Required' | 'Optional' | 'Only if needed'; when?: string;
  endDate: boolean; remind: number[]; checkedBy: 'Supervisor' | 'Office Admin'; onEnd: OnEnd; detail?: string; on: boolean; core?: boolean;
}
export interface OnbRule { id: string; label: string; value: string; kind: 'number' | 'select' | 'money' | 'text'; options?: string[]; unit?: string; hint?: string; core?: string }
export interface Onboarding { role: OnbRole; title: string; steps: string[]; docs: OnbDoc[]; rules: OnbRule[]; askExisting: 'No' | 'Yes' }

export type MsgChannel = 'Email' | 'Text' | 'In-app';
export interface Reminder {
  id: string; name: string; group: string; to: Who[]; channels: MsgChannel[]; n: number; unit: 'days' | 'hours'; when: 'before' | 'after'; date: string;
  template: string; on: boolean; repeat: string;
}
export interface Template { id: string; name: string; group: string; channel: MsgChannel; to: Who; when: string; subject: string; body: string; required: boolean; on: boolean; by: string; at: string }
export interface CheckItem { id: string; text: string; required: boolean }
export interface CheckRule { id: string; label: string; value: string; options: string[] }
export interface Checklist { id: string; name: string; usedBy: string; app: string; items: CheckItem[]; rules: CheckRule[]; by: string; at: string; version: number }
export interface Stage { id: string; staff: string; customer: string; show: boolean; late: number | null; core: boolean }
export interface Process { id: string; name: string; customer: string; stages: Stage[] }
export interface PickList { id: string; name: string; usedIn: string; items: string[] }
export interface Access { show: boolean; when: string; never?: boolean }
export interface DocType { id: string; name: string; group: string; staffOnly: boolean; why?: string; access: Record<Audience, Access> }
export interface Section { h: string; t: string }
export interface AgVersion { v: number; status: 'Draft' | 'Live' | 'Retired'; effective: string; by: string; at: string; change: string; sections: Section[]; mode?: 'everyone' | 'new' }
export interface Accept { name: string; org?: string; v: number; at: string }
export interface Agreement { id: string; name: string; to: string; versions: AgVersion[]; accepts: Accept[]; people: string[] }
export interface Variant { id: string; name: string; title: string; body: string; footer: string; isDefault: boolean }
export interface DocTemplate { id: string; name: string; usedFor: string; variants: Variant[]; by: string; at: string }
export interface AuditEntry { id: string; at: string; who: string; page: string; item: string; what: string; before: string; after: string; reason?: string }

/* ======================= company and areas ======================= */
export const COMPANY: Company = {
  name: 'Landlord Service Plans Limited', trading: 'LSP', companyNo: '13940065', address: '1 Upper Street, London N1 0PQ', phone: '020 7946 0000', emergency: '020 7946 0999',
  email: 'hello@lsp.co.uk', website: 'www.landlordserviceplans.co.uk', sender: 'hello@lsp.co.uk', hours: 'Mon to Fri, 9:00 to 17:30', payDays: 14,
  bankName: 'Barclays Bank', sortCode: '20-45-77', account: '43819902', logo: 'images/logo.svg',
  signature: { closing: 'Kind regards,', showLogo: true, showRole: true, legal: 'Landlord Service Plans Limited · Registered in England and Wales, company number 13940065 · 1 Upper Street, London N1 0PQ' },
};

const w = (name: string, email: string, postcode: string, at: string, kind: Waiter['kind']): Waiter => ({ name, email, postcode, at, kind });
export const AREAS: Area[] = [
  { id: 'AR1', n: 1, name: 'North & North West', base: 'N2 9RF', supervisor: 'sk', oas: ['et', 'lm'], status: 'Live', opens: '1 Jan 2026', message: '', tenants: 6, contractors: 6, waitlist: [], created: '2 Dec 2025, 10:00',
    postcodes: ['N2', 'N3', 'N6', 'N10', 'N11', 'N12', 'N14', 'N20', 'NW3', 'NW4', 'NW7', 'NW11', 'HA1', 'EN5'] },
  { id: 'AR3', n: 3, name: 'North East & East', base: 'N1 0PQ', supervisor: 'mb', oas: ['jc', 'ps'], status: 'Live', opens: '1 Feb 2026', message: '', tenants: 7, contractors: 5, waitlist: [], created: '12 Jan 2026, 09:30',
    postcodes: ['N1', 'N4', 'N5', 'N7', 'N8', 'N15', 'N16', 'N17', 'N19', 'N22', 'E8', 'EC2', 'IG1', 'RM1'] },
  { id: 'AR2', n: 2, name: 'West & South West', base: '', supervisor: '', oas: ['nr'], status: 'Planned', opens: '1 Mar 2027', message: "We open in West and South West London in March 2027. Leave your details and we'll call you as soon as we start.", tenants: 0, contractors: 1, created: '1 Sep 2026, 11:20',
    postcodes: ['W1', 'W5', 'SW6', 'SW19', 'TW9', 'KT1', 'UB8', 'SM1'],
    waitlist: [w('Grace Miller', 'grace.m@mail.co.uk', 'W5 2LB', '3 Oct 2026, 18:40', 'Landlord'), w('Owen Clarke', 'owen.c@mail.co.uk', 'SW6 1AB', '7 Oct 2026, 09:12', 'Landlord'), w('Hassan Ali', 'h.ali@mail.co.uk', 'TW9 3QT', '11 Oct 2026, 21:03', 'Tenant')] },
  { id: 'AR4', n: 4, name: 'South & South East', base: '', supervisor: '', oas: [], status: 'Off', opens: '', message: "We don't cover South London yet. Leave your details and we'll tell you when we do.", tenants: 0, contractors: 1, created: '20 Sep 2026, 16:00',
    postcodes: ['SE1', 'SE10', 'BR1', 'CR0', 'DA5'],
    waitlist: [w('Mia Barker', 'mia.b@mail.co.uk', 'SE10 7UJ', '28 Sep 2026, 12:30', 'Landlord'), w('Northfield Lets', 'office@northfieldlets.co.uk', 'CR0 3PH', '9 Oct 2026, 10:05', 'Letting agent')] },
];
export const SHARES: ShareReq[] = [
  { id: 'SR1', district: 'N8', owner: 'AR3', to: 'AR1', by: 'Sarah Khan', reason: 'Two Highgate landlords bought homes in Hornsey. Keep the same Supervisor until their first tenancies end.', until: '31 Mar 2027', at: '14 Oct 2026, 11:05', status: 'Waiting' },
  { id: 'SR2', district: 'N10', owner: 'AR1', to: 'AR3', by: 'Marcus Bell', reason: 'Muswell Hill handover while Liam was new.', until: '30 Jun 2026', at: '2 Mar 2026, 10:00', status: 'Ended', decided: 'Approved by Michael Grant · 2 Mar 2026' },
];
export const COVERS: Cover[] = [
  { id: 'CV1', area: 'AR1', absent: 'sk', cover: 'mb', from: '2 Nov 2026', to: '9 Nov 2026', canDecide: true, absentReadOnly: true, by: 'Michael Grant', at: '12 Oct 2026, 15:20' },
  { id: 'CV2', area: 'AR3', absent: 'mb', cover: 'sk', from: '17 Aug 2026', to: '28 Aug 2026', canDecide: true, absentReadOnly: true, by: 'Michael Grant', at: '1 Aug 2026, 09:00' },
];
export const UNMATCHED: Unmatched[] = [
  { id: 'UM1', address: '3 Station Parade, Edmonton', postcode: 'N9 0EG', source: 'Website enquiry', at: '15 Oct 2026, 08:12', why: 'No area has N9' },
  { id: 'UM2', address: 'Flat 7, 22 Wapping High Street', postcode: 'E1W 2NR', source: 'Website enquiry', at: '14 Oct 2026, 19:40', why: 'No area has E1W' },
  { id: 'UM3', address: '18 Grove Road, Walthamstow', postcode: 'E17 9BU', source: 'Added by staff', at: '13 Oct 2026, 16:02', why: 'No area has E17' },
];

/* ======================= plans, services, products, tax ======================= */
export const PLANS: Plan[] = [
  { id: 'PL10', name: 'Management Only', fee: 10, limit: null, budget: false, web: true, landlords: 1, from: '1 Jan 2026', desc: 'We look after the tenants, rent and safety checks. Repairs are quoted and paid separately.',
    included: ['Rent collection and monthly statements', 'Tenant finding and referencing', 'Safety certificates booked on time', 'Inspections every 6 months', 'Repairs quoted to you first (not included)'] },
  { id: 'PL12', name: 'Essential', fee: 12, limit: 150, budget: true, web: true, landlords: 2, from: '1 Jan 2026', desc: 'Full management with small repairs covered by your plan.',
    included: ['Everything in Management Only', 'Repairs up to £150 a job covered', 'Yearly maintenance budget', 'Contractor photos for every job'] },
  { id: 'PL16', name: 'Standard', fee: 16, limit: 200, budget: true, web: true, landlords: 3, from: '1 Jan 2026', desc: 'Full management and maintenance. Most landlords choose this plan.',
    included: ['Everything in Essential', 'Repairs up to £200 a job covered', 'Property Management Plan every year', '24-hour emergency line'] },
  { id: 'PL20', name: 'Complete', fee: 20, limit: 300, budget: true, web: true, landlords: 3, from: '1 Jan 2026', desc: 'Our fullest plan, with the highest job limit.',
    included: ['Everything in Standard', 'Repairs up to £300 a job covered', 'Priority contractor booking', 'Quarterly inspections'] },
];

let sid = 0;
const svc = (name: string, group: SvcGroup, price: number, per: string, trade: string, desc: string, to: Service['to'] = ['Landlords', 'Letting agents'], often?: string, on = true): Service => ({ id: 'S' + ++sid, name, group, price, per, trade, desc, to, often, on });
export const SERVICES: Service[] = [
  svc('Gas safety certificate (CP12)', 'Safety checks', 85, 'fixed', 'Gas engineer', 'Yearly gas safety check by a Gas Safe engineer, 1 boiler and up to 3 appliances.', undefined, 'Every year'),
  svc('Electrical safety check (EICR)', 'Safety checks', 180, 'fixed', 'Electrician', 'Electrical Installation Condition Report for a home up to 4 bedrooms.', undefined, 'Every 5 years'),
  svc('Energy Performance Certificate (EPC)', 'Safety checks', 95, 'fixed', 'Site Inspector', 'EPC by an accredited assessor. Needed before a home is advertised.', undefined, 'Every 10 years'),
  svc('Smoke and carbon monoxide alarms', 'Safety checks', 75, 'each', 'Electrician', 'Supply, fit and test alarms on every floor and in rooms with a gas appliance.'),
  svc('Fire risk assessment (shared houses)', 'Safety checks', 220, 'fixed', 'Site Inspector', 'For shared houses and communal areas, with the written report.', undefined, 'Every year'),
  svc('Boiler service', 'Repairs', 140, 'fixed', 'Gas engineer', 'Yearly service of the boiler, with the service sheet.', undefined, 'Every year'),
  svc('Plumbing repair', 'Repairs', 60, 'call-out + £45 an hour', 'Plumber', 'Leaks, taps, toilets, showers and blocked sinks. Parts on the quote.'),
  svc('Electrical repair', 'Repairs', 60, 'call-out + £48 an hour', 'Electrician', 'Sockets, lights, fuse boards and extractor fans.'),
  svc('Heating repair', 'Repairs', 60, 'call-out + £60 an hour', 'Gas engineer', 'No heating or hot water, radiators and valves.'),
  svc('Damp and mould treatment', 'Repairs', 120, 'from', 'General builder', 'Survey with moisture readings, then treatment and ventilation if needed.'),
  svc('Lock change', 'Repairs', 145, 'fixed', 'Locksmith', 'New euro cylinder and nightlatch with 3 sets of keys.'),
  svc('Roof repair', 'Repairs', 180, 'from', 'Roofer', 'Slipped tiles, flashing and gutters. Larger work is quoted after a visit.'),
  svc('General handyman', 'Repairs', 45, 'an hour', 'Carpenter & locks', 'Doors, shelves, curtain rails and small fixes.'),
  svc('Check-in inventory', 'Tenancy changeover', 75, 'fixed', 'Site Inspector', 'Room-by-room inventory with photos, meter readings and keys, signed on the day.'),
  svc('Check-out inspection', 'Tenancy changeover', 75, 'fixed', 'Site Inspector', 'Compared with the check-in inventory, with photos, to help with the deposit.'),
  svc('End of tenancy clean', 'Tenancy changeover', 180, 'from', 'Cleaner', 'Full clean ready for the next tenants. Price depends on the size of the home.'),
  svc('Tenant find only', 'Management', 650, 'fixed', '—', 'Advertising, viewings, referencing and the tenancy agreement, for landlords who manage the home themselves.', ['Landlords'], undefined, false),
  svc('Property Management Plan', 'Management', 0, 'included', '—', 'A yearly plan for each home: rooms, certificates, repairs and what is coming up. Included in Standard and Complete.', ['Landlords']),
];

export const PRODUCTS: Product[] = [
  { code: 'CALL-OUT', name: 'Call-out', desc: 'Attend site and assess the problem', rate: 60, kind: 'Service', on: true, used: 42 },
  { code: 'LABOUR', name: 'Labour', desc: 'Labour charge (hourly)', rate: 45, kind: 'Labour', on: true, used: 88 },
  { code: 'LABOUR D/R', name: 'Labour day rate', desc: 'Labour charge day rate', rate: 350, kind: 'Labour', on: true, used: 9 },
  { code: 'MISC', name: 'Miscellaneous', desc: 'Miscellaneous expenses', rate: 0, kind: 'Material', on: true, used: 21 },
  { code: 'CP12', name: 'Gas safety certificate', desc: 'Gas safety check, 1 boiler and up to 3 appliances', rate: 85, kind: 'Service', on: true, used: 31 },
  { code: 'EICR', name: 'Electrical safety check', desc: 'Electrical Installation Condition Report, up to 4 bedrooms', rate: 180, kind: 'Service', on: true, used: 12 },
  { code: '18TH ED/SPD', name: 'Fuse board installation', desc: "18th Edition fuse board installation with SPD's", rate: 750, kind: 'Service', on: true, used: 3 },
  { code: 'LED/5FT/FLOU', name: 'LED batten fitting', desc: '4ft LED batten fitting', rate: 21.35, kind: 'Material', on: true, used: 6 },
  { code: '30WFL/PIR', name: 'LED floodlight with PIR', desc: 'LED floodlight 30W with PIR sensor', rate: 41.5, kind: 'Material', on: true, used: 2 },
  { code: '2G/WEATHER', name: 'Weatherproof socket', desc: 'Socket, weatherproof 2 gang switched IP66', rate: 23, kind: 'Material', on: true, used: 4 },
  { code: 'HEATER', name: 'Down flow heater', desc: 'Down flow heater', rate: 50.75, kind: 'Material', on: true, used: 1 },
  { code: 'DS/2G/INST', name: 'Double socket supply and fit', desc: '13 Amp 2 gang double switched socket, supply and fit', rate: 38, kind: 'Service', on: true, used: 14 },
  { code: 'MT2', name: 'Mini trunking', desc: 'MT2 25x16mm trunking, self adhesive', rate: 13.41, kind: 'Material', on: false, used: 0 },
  { code: 'LOCK/EURO', name: 'Euro cylinder lock', desc: 'Anti-snap euro cylinder with 3 keys', rate: 48, kind: 'Material', on: true, used: 7 },
  { code: 'CLEAN/EOT', name: 'End of tenancy clean', desc: 'Full clean ready for the next tenants', rate: 180, kind: 'Service', on: true, used: 5 },
];

export const TAX: Tax = { vatOn: false, vatNo: '', vatRate: 20, vatFrom: '1 Jan 2027', nrlRate: 20, hmrcRef: 'NA071122', nrlRemind: 14, certBy: '5 Jul 2027', budgetAlerts: [70, 90, 100] };

/* ======================= users, roles, teams ======================= */
let uid = 0;
const u = (name: string, email: string, role: Role, status: UserStatus, last: string, areas: string[] = [], o: Partial<User> = {}): User =>
  ({ id: 'U' + ++uid, name, email, phone: '07700 9' + String(10000 + uid * 137).slice(-5), role, status, last, areas, twoStep: true, created: '2 Jan 2026, 10:00', logins: last === '—' ? [] : [last], ...o });
export const USERS: User[] = [
  u('Michael Grant', 'm.grant@lsp.co.uk', 'Company Admin', 'Active', '15 Oct 2026, 08:41', ['AR1', 'AR2', 'AR3', 'AR4'], { phone: '020 7946 0002', created: '1 Dec 2025, 09:00' }),
  u('Sarah Khan', 's.khan@lsp.co.uk', 'Supervisor', 'Active', '15 Oct 2026, 08:55', ['AR1'], { phone: '020 7946 0001', created: '1 Dec 2025, 09:30' }),
  u('Marcus Bell', 'm.bell@lsp.co.uk', 'Supervisor', 'Active', '15 Oct 2026, 08:31', ['AR3'], { phone: '020 7946 0003', created: '5 Jan 2026, 09:00' }),
  u('Emma Thompson', 'e.thompson@lsp.co.uk', 'Office Admin', 'Active', '15 Oct 2026, 09:02', ['AR1'], { phone: '020 7946 0011' }),
  u('James Carter', 'j.carter@lsp.co.uk', 'Office Admin', 'Active', '15 Oct 2026, 08:47', ['AR1'], { phone: '020 7946 0012' }),
  u('Priya Shah', 'p.shah@lsp.co.uk', 'Office Admin', 'Active', '14 Oct 2026, 17:31', ['AR3'], { phone: '020 7946 0013' }),
  u('Liam Murphy', 'l.murphy@lsp.co.uk', 'Office Admin', 'Active', '15 Oct 2026, 09:15', ['AR1'], { phone: '020 7946 0014' }),
  u('Nadia Rossi', 'n.rossi@lsp.co.uk', 'Office Admin', 'Invited', '—', ['AR2'], { created: '13 Oct 2026, 11:20', twoStep: false }),
  u('Hannah Lee', 'h.lee@lsp.co.uk', 'Sub Admin', 'Active', '15 Oct 2026, 09:20', ['AR1', 'AR2', 'AR3', 'AR4'], { created: '2 Sep 2026, 10:00', phone: '020 7946 0021',
    access: { reminders: 'edit', templates: 'edit', checklists: 'edit', stages: 'view', doctemplates: 'edit', agreements: 'view', access: 'view', audit: 'view' } }),
  u('Tom Reed', 't.reed@lsp.co.uk', 'Sub Admin', 'Active', '14 Oct 2026, 16:45', ['AR1', 'AR2', 'AR3', 'AR4'], { created: '2 Sep 2026, 10:05', phone: '020 7946 0022',
    access: { users: 'edit', teams: 'view', 'onb-tenant': 'edit', 'onb-landlord': 'edit', 'onb-agent': 'edit', 'onb-contractor': 'edit', areas: 'view', audit: 'view' } }),
  u('Zara Malik', 'z.malik@lsp.co.uk', 'Sub Admin', 'Invited', '—', ['AR1', 'AR2', 'AR3', 'AR4'], { created: '14 Oct 2026, 12:00', twoStep: false,
    access: { company: 'view', plans: 'view', services: 'edit', products: 'edit', tax: 'view' } }),
  u('Ben Cole', 'b.cole@lsp.co.uk', 'Office Admin', 'Disabled', '30 Jun 2026, 16:02', [], { created: '5 Jan 2026, 10:00' }),
  u('Margaret Okafor', 'm.okafor@mail.co.uk', 'Landlord', 'Active', '14 Oct 2026, 20:12', ['AR1']),
  u('David Hughes', 'd.hughes@mail.co.uk', 'Landlord', 'Active', '14 Oct 2026, 09:22', ['AR3']),
  u('Rachel Evans', 'r.evans@mail.co.uk', 'Landlord', 'Active', '11 Oct 2026, 13:40', ['AR3']),
  u('Tom Ahmed', 't.ahmed@mail.co.uk', 'Landlord', 'Active', '9 Oct 2026, 07:58', ['AR3']),
  u('Helen Brooks', 'h.brooks@mail.co.uk', 'Landlord', 'Locked', '13 Oct 2026, 22:05', ['AR3']),
  u('Karen Patel', 'k.patel@mail.co.uk', 'Landlord', 'Active', '14 Oct 2026, 15:12', ['AR1']),
  u('Simon Wright', 's.wright@mail.co.uk', 'Landlord', 'Active', '2 Oct 2026, 19:44', ['AR3']),
  u('Fiona Clarke', 'f.clarke@mail.co.uk', 'Landlord', 'Invited', '—', ['AR1'], { created: '13 Oct 2026, 10:00', twoStep: false }),
  u('Daniel Price', 'd.price@mail.co.uk', 'Tenant', 'Active', '14 Oct 2026, 21:30', ['AR1']),
  u('Michael Okafor', 'mike.okafor@mail.co.uk', 'Tenant', 'Active', '12 Oct 2026, 08:10', ['AR1']),
  u('Jay Patel', 'jay.patel@mail.co.uk', 'Tenant', 'Active', '10 Oct 2026, 18:22', ['AR3']),
  u('Liz Brown', 'liz.brown@mail.co.uk', 'Tenant', 'Active', '8 Oct 2026, 12:00', ['AR3']),
  u('Megan Price', 'megan.p@mail.co.uk', 'Tenant', 'Active', '14 Oct 2026, 07:45', ['AR3']),
  u('Kofi Mensah', 'kofi.m@mail.co.uk', 'Tenant', 'Disabled', '30 Sep 2026, 10:12', ['AR3']),
  u('Aisha Rahman', 'aisha.r@mail.co.uk', 'Applicant', 'Active', '14 Oct 2026, 20:50', ['AR3']),
  u('Omar Rahman', 'omar.r@mail.co.uk', 'Applicant', 'Invited', '—', ['AR3'], { sub: 'Rent sharer', twoStep: false, created: '14 Oct 2026, 21:02' }),
  u('Claire Rose', 'claire@rosewoodlettings.co.uk', 'Letting agent', 'Active', '15 Oct 2026, 08:30', ['AR3'], { sub: 'Admin', org: 'Rosewood Lettings' }),
  u('Tom Fielding', 'tom@rosewoodlettings.co.uk', 'Letting agent', 'Active', '14 Oct 2026, 16:20', ['AR3'], { sub: 'Property manager', org: 'Rosewood Lettings' }),
  u('Anita Shah', 'accounts@rosewoodlettings.co.uk', 'Letting agent', 'Active', '12 Oct 2026, 11:05', ['AR3'], { sub: 'Accounts', org: 'Rosewood Lettings' }),
  u('Ian Walsh', 'ian@northgatehomes.co.uk', 'Letting agent', 'Active', '13 Oct 2026, 14:44', ['AR3'], { sub: 'Admin', org: 'Northgate Homes' }),
  u('Lucy Green', 'lucy@citykeyagents.co.uk', 'Letting agent', 'Locked', '15 Oct 2026, 07:12', ['AR1'], { sub: 'Admin', org: 'City Key Agents' }),
  u('Gary Holt', 'gary@heatright.co.uk', 'Contractor', 'Active', '15 Oct 2026, 07:30', ['AR3', 'AR1'], { org: 'HeatRight Ltd' }),
  u('Dean Cole', 'dean@toptileroofing.co.uk', 'Contractor', 'Active', '13 Oct 2026, 18:10', ['AR1', 'AR3'], { org: 'TopTile Roofing' }),
  u('Rita Singh', 'rita@securefix.co.uk', 'Contractor', 'Active', '11 Oct 2026, 09:40', ['AR3', 'AR1'], { org: 'SecureFix' }),
  u('Neil Burke', 'neil@quickplumb.co.uk', 'Contractor', 'Active', '14 Oct 2026, 08:05', ['AR3', 'AR1'], { org: 'QuickPlumb' }),
  u('Owen Price', 'owen@voltelectrical.co.uk', 'Contractor', 'Disabled', '20 Sep 2026, 17:00', ['AR3', 'AR1'], { org: 'Volt Electrical' }),
  u('Clare Vine', 'clare@clearview.co.uk', 'Contractor', 'Active', '12 Oct 2026, 10:30', ['AR3', 'AR1'], { org: 'Clear View Inspections' }),
  u('Fred Ince', 'fred@fixitcarpentry.co.uk', 'Contractor', 'Active', '9 Oct 2026, 12:12', ['AR3', 'AR1'], { org: 'FixIt Carpentry' }),
];

export const PERMS: Perm[] = [
  { id: 'homes.all', group: 'Homes and people', label: 'See every area, landlord and home', core: 'Only the Admin sees every area' },
  { id: 'homes.area', group: 'Homes and people', label: 'See every home in their own area', core: 'Each Supervisor sees only their own area' },
  { id: 'homes.own', group: 'Homes and people', label: "See only their own work inside their Supervisor's area" },
  { id: 'll.create', group: 'Homes and people', label: 'Create landlords (after the duplicate check)', core: 'Only the Supervisor creates landlords' },
  { id: 'prop.add', group: 'Homes and people', label: 'Add properties and rooms' },
  { id: 'plan.change', group: 'Homes and people', label: "Change a landlord's plan" },
  { id: 'enq.handle', group: 'Homes and people', label: 'Contact enquiries and move them on' },
  { id: 'let.run', group: 'Lettings', label: 'Run Lettings stages 1–4 and 6–7' },
  { id: 'let.approve', group: 'Lettings', label: 'Approve a tenant (stage 5)', core: 'Only the Supervisor approves tenants' },
  { id: 'switch.run', group: 'Lettings', label: 'Run Planned Switch leads' },
  { id: 'switch.activate', group: 'Lettings', label: 'Approve onboarding and activate a switch', core: 'Only the Supervisor activates a switch' },
  { id: 'job.price', group: 'Jobs and contractors', label: 'Price jobs and assign contractors' },
  { id: 'job.under', group: 'Jobs and contractors', label: "Approve jobs under the landlord's job limit" },
  { id: 'job.over', group: 'Jobs and contractors', label: 'Decide jobs over the job limit', core: 'Only the Supervisor decides over-limit jobs' },
  { id: 'job.finish', group: 'Jobs and contractors', label: 'Check photo proof and approve finished work' },
  { id: 'ct.approve', group: 'Jobs and contractors', label: 'Approve contractor sign-ups' },
  { id: 'ct.pause', group: 'Jobs and contractors', label: 'Pause, resume or remove contractors' },
  { id: 'money.rent', group: 'Money', label: 'Record rent and send reminders' },
  { id: 'money.docs', group: 'Money', label: 'Send quotes and invoices' },
  { id: 'money.pay', group: 'Money', label: 'Pay landlords and contractors' },
  { id: 'tax.decide', group: 'Money', label: "Decide an overseas landlord's tax status" },
  { id: 'tax.hmrc', group: 'Money', label: 'Record HMRC payments' },
  { id: 'rec.lock', group: 'Records', label: 'Lock inspection reports and finished jobs' },
  { id: 'rec.unlock', group: 'Records', label: 'Unlock locked records (with a reason)' },
  { id: 'rec.reports', group: 'Records', label: 'See reports for the whole business' },
  { id: 'rec.support', group: 'Records', label: 'Give the support team access' },
  { id: 'set.terms', group: 'Set-up', label: 'Edit the contractor agreement and rules' },
  { id: 'set.vat', group: 'Set-up', label: 'Change VAT and tax settings' },
  { id: 'set.areas', group: 'Set-up', label: 'Create Supervisors, set areas, approve overlaps and holiday cover', core: 'Only the Admin. A Supervisor can never widen their own access' },
  { id: 'set.all', group: 'Set-up', label: 'Use the Company Admin portal', core: 'Only the Company Admin' },
];
export const AGENT_PERMS: Perm[] = [
  { id: 'ag.book', group: 'Letting agent team', label: 'Book jobs' },
  { id: 'ag.accept', group: 'Letting agent team', label: 'Accept or decline quotes' },
  { id: 'ag.homes', group: 'Letting agent team', label: 'Add, edit and remove homes' },
  { id: 'ag.pay', group: 'Letting agent team', label: 'Pay invoices and see the statement' },
  { id: 'ag.team', group: 'Letting agent team', label: 'Invite and remove team members' },
  { id: 'ag.billing', group: 'Letting agent team', label: 'Change billing details and settings' },
];
const ALL_STAFF = PERMS.map(p => p.id);
export const ROLES: RoleDef[] = [
  { id: 'R-CA', name: 'Company Admin', kind: 'staff', desc: 'Sets up the platform. Can do everything.', perms: ALL_STAFF, locked: true },
  { id: 'R-SV', name: 'Supervisor', kind: 'staff', desc: 'Runs one area with its own Office Admins, and makes the decisions only a Supervisor can make.', perms: ALL_STAFF.filter(p => !['homes.all', 'homes.own', 'set.areas', 'set.all'].includes(p)) },
  { id: 'R-OA', name: 'Office Admin', kind: 'staff', desc: "Works in one Supervisor's area. Requests go to that Supervisor (or the cover).", perms: ['homes.own', 'prop.add', 'enq.handle', 'let.run', 'switch.run', 'job.price', 'job.under', 'job.finish', 'money.rent', 'money.docs', 'rec.lock'] },
  { id: 'R-AG-A', name: 'Admin', kind: 'agent', desc: "Letting agent team: the agency's main contact.", perms: AGENT_PERMS.map(p => p.id) },
  { id: 'R-AG-P', name: 'Property manager', kind: 'agent', desc: 'Letting agent team: books jobs and accepts quotes.', perms: ['ag.book', 'ag.accept', 'ag.homes'] },
  { id: 'R-AG-C', name: 'Accounts', kind: 'agent', desc: 'Letting agent team: pays invoices.', perms: ['ag.pay'] },
];
/** What the one-person portals can do. Set by each portal's design, shown here for reference. */
export const PORTAL_ROLES: { name: Role; can: string[] }[] = [
  { name: 'Landlord', can: ['See their homes, tenants, rent and statements', 'Approve or decline repairs sent to them', 'Report a repair', 'See certificates, inspections and documents', 'Ask to change plan or bank details'] },
  { name: 'Tenant', can: ['Pay rent and see their rent history', 'Report repairs and confirm visits', 'Agree or disagree with damage charges', 'Give notice and see move-out steps'] },
  { name: 'Applicant', can: ['Fill in the application and upload documents', 'Invite the person who shares the rent', 'Pay the holding deposit and sign the agreement'] },
  { name: 'Contractor', can: ['See the jobs LSP gives them', 'Confirm visits, send photos and their invoice', 'Keep insurance, registration and DBS check in date', 'Add bank details (checked by phone)'] },
];
export const LANDLORD_ROWS: LandlordRow[] = [
  { id: 'L1', name: 'Margaret Okafor', area: 'AR1', admin: 'et', homes: 3, tasks: 4 },
  { id: 'L6', name: 'Karen Patel', area: 'AR1', admin: 'lm', homes: 2, tasks: 1 },
  { id: 'L8', name: 'Fiona Clarke', area: 'AR1', admin: 'lm', homes: 1, tasks: 1 },
  { id: 'A3', name: 'City Key Agents (client)', area: 'AR1', admin: 'et', homes: 1, tasks: 0 },
  { id: 'L2', name: 'David Hughes', area: 'AR3', admin: 'ps', homes: 2, tasks: 3 },
  { id: 'L3', name: 'Rachel Evans', area: 'AR3', admin: 'jc', homes: 2, tasks: 1 },
  { id: 'L4', name: 'Tom Ahmed', area: 'AR3', admin: 'jc', homes: 2, tasks: 2 },
  { id: 'L5', name: 'Helen Brooks', area: 'AR3', admin: 'ps', homes: 1, tasks: 2 },
  { id: 'L7', name: 'Simon Wright', area: 'AR3', admin: 'jc', homes: 1, tasks: 2 },
  { id: 'A1', name: 'Rosewood Lettings (client)', area: 'AR3', admin: 'jc', homes: 4, tasks: 3 },
  { id: 'A2', name: 'Northgate Homes (client)', area: 'AR3', admin: 'ps', homes: 2, tasks: 1 },
];

/* ======================= onboarding and KYC ======================= */
let did = 0;
const doc = (name: string, who: string, need: OnbDoc['need'], o: Partial<OnbDoc> = {}): OnbDoc => ({ id: 'OD' + ++did, name, who, need, endDate: false, remind: [], checkedBy: 'Office Admin', onEnd: 'Remind only', on: true, ...o });
export const ONBOARDING: Record<OnbRole, Onboarding> = {
  tenant: { role: 'tenant', title: 'Tenants and rent sharers', askExisting: 'No',
    steps: ['Applied', 'Talked to LSP', 'Your application', 'LSP checks', 'Deposit and references', 'Final check', 'Moving in', 'Moved in'],
    docs: [
      doc('Photo ID (passport or driving licence)', 'Applicant and everyone over 18', 'Required', { endDate: true, remind: [30], onEnd: 'Ask for a new one', core: true, detail: 'Adults who do not pay rent upload photo ID and right to rent only.' }),
      doc('Right to rent share code', 'Applicant and everyone over 18', 'Required', { endDate: true, remind: [60, 30], onEnd: 'Ask for a new one', core: true, detail: 'Time-limited right to rent is checked again before it ends.' }),
      doc('Proof of address', 'Applicant and rent sharers', 'Required'),
      doc('Proof of income (3 payslips)', 'Applicant and rent sharers', 'Required', { detail: 'Self-employed: last tax return (SA302) instead.' }),
      doc('Bank statements (3 months)', 'Applicant and rent sharers', 'Required'),
      doc('Guarantor details and ID', 'Applicant', 'Only if needed', { when: 'When income is below the affordability rule', checkedBy: 'Supervisor' }),
      doc('Reference from last landlord', 'Applicant', 'Optional'),
    ],
    rules: [
      { id: 'afford', label: 'Affordability: yearly income of the people who pay must be at least', value: '30', kind: 'number', unit: '× the monthly rent', hint: 'With £1,150 rent, they need £34,500 a year between them.' },
      { id: 'full', label: 'Who gets the full checks', value: 'Applicant and everyone who shares the rent', kind: 'select', options: ['Applicant and everyone who shares the rent', 'Applicant only', 'Every adult'] },
      { id: 'adults', label: "Adults who don't pay rent", value: 'Photo ID and right to rent', kind: 'select', options: ['Photo ID and right to rent', 'Full checks', 'Name and age only'] },
      { id: 'kids', label: 'Children', value: 'Name and age only', kind: 'select', options: ['Name and age only', 'Not recorded'] },
      { id: 'holding', label: 'Holding deposit', value: '1', kind: 'number', unit: "week's rent", hint: 'The legal maximum is 1 week.', core: 'Set by law: 1 week at most' },
      { id: 'keep', label: "Keep a rejected applicant's files for", value: '6', kind: 'number', unit: 'months', hint: 'Then they are deleted and the deletion is logged.' },
      { id: 'refs', label: 'Outside referencing', value: 'Every payer', kind: 'select', options: ['Every payer', 'Applicant only', 'Not used'] },
    ] },
  landlord: { role: 'landlord', title: 'Landlords', askExisting: 'No',
    steps: ['Enquiry', 'Contacted', 'Duplicate check', 'Supervisor creates the landlord', 'Welcome email from Outlook', 'Sets password', 'Agreement signed', 'Bank details checked'],
    docs: [
      doc('Photo ID', 'Landlord (and each joint owner)', 'Required', { endDate: true, remind: [30], onEnd: 'Ask for a new one', core: true }),
      doc('Proof of ownership (Land Registry title)', 'Landlord', 'Required', { checkedBy: 'Supervisor' }),
      doc('Signed management agreement', 'Landlord', 'Required', { checkedBy: 'Supervisor', core: true }),
      doc('Bank details', 'Landlord', 'Required', { detail: 'LSP calls the landlord to check them before the first payout.', onEnd: 'Block payouts', core: true }),
      doc("HMRC approval letter (overseas landlords)", 'Landlord', 'Only if needed', { when: 'When the landlord lives outside the UK and HMRC lets LSP pay rent in full', checkedBy: 'Supervisor', onEnd: 'Block payouts' }),
      doc('Joint owner details and shares', 'Landlord', 'Only if needed', { when: 'When the home has more than one owner', detail: 'Shares must add up to 100%.' }),
      doc('Existing safety certificates (gas, EICR, EPC)', 'Landlord', 'Optional', { endDate: true, remind: [60, 30], detail: 'If missing, LSP books new ones.' }),
      doc('Landlord insurance', 'Landlord', 'Optional', { endDate: true, remind: [30] }),
    ],
    rules: [
      { id: 'dup', label: 'Duplicate check before creating a landlord', value: 'Email, phone and address', kind: 'select', options: ['Email, phone and address', 'Email and phone', 'Email only'], core: 'Always on (flow chart)' },
      { id: 'abroad', label: 'Ask "Does this landlord live outside the UK?"', value: 'Yes, on every new landlord', kind: 'select', options: ['Yes, on every new landlord', 'No'] },
      { id: 'creates', label: 'Who creates landlords', value: 'Supervisor', kind: 'select', options: ['Supervisor'], core: 'Only the Supervisor (flow chart)' },
      { id: 'welcome', label: 'Welcome email sent from', value: 'Outlook (hello@lsp.co.uk)', kind: 'text', core: 'Outlook' },
      { id: 'linkdays', label: 'Set-password link works for', value: '7', kind: 'number', unit: 'days' },
    ] },
  agent: { role: 'agent', title: 'Letting agents (Clients)', askExisting: 'No',
    steps: ['Enquiry', 'Terms agreed', 'Account created', 'Team invited', 'First home added'],
    docs: [
      doc('Company details (Companies House)', 'Letting agent', 'Required', { core: true }),
      doc('Signed terms of business', 'Letting agent', 'Required', { checkedBy: 'Supervisor', core: true }),
      doc('Billing contact and address', 'Letting agent', 'Required'),
      doc('Client money protection certificate', 'Letting agent', 'Required', { endDate: true, remind: [30], onEnd: 'Remind only' }),
      doc('Redress scheme membership', 'Letting agent', 'Required', { endDate: true, remind: [30] }),
      doc('Professional indemnity insurance', 'Letting agent', 'Optional', { endDate: true, remind: [30] }),
    ],
    rules: [
      { id: 'terms', label: 'Payment terms for new agents', value: '30', kind: 'number', unit: 'days' },
      { id: 'order', label: '"Order number on every job" for new agents', value: 'Off', kind: 'select', options: ['Off', 'On'] },
      { id: 'quote', label: 'Quotes are valid for', value: '30', kind: 'number', unit: 'days' },
      { id: 'part', label: 'Part payments', value: 'Allowed', kind: 'select', options: ['Allowed', 'Not allowed'] },
      { id: 'cost', label: "Contractor's cost shown to agents", value: 'Never', kind: 'select', options: ['Never'], core: 'Never shown (flow chart)' },
    ] },
  contractor: { role: 'contractor', title: 'Contractors', askExisting: 'No',
    steps: ['Your business', 'Your work', 'Your documents', 'Agree and send', 'LSP checks', 'Add bank details'],
    docs: [
      doc('Photo ID', 'Contractor', 'Required', { core: true }),
      doc('Right to work', 'Contractor', 'Required', { detail: 'Share code optional.' }),
      doc('Public liability insurance', 'Contractor', 'Required', { endDate: true, remind: [60, 30], onEnd: 'Pause them', checkedBy: 'Supervisor', core: true, detail: 'Cover must be at least the minimum below.' }),
      doc('Trade registration', 'Contractor', 'Required', { endDate: true, remind: [60, 30], onEnd: 'Pause them', checkedBy: 'Supervisor', core: true, detail: 'Gas Safe, NICEIC/NAPIT, WaterSafe/CIPHE, CompetentRoofer, MLA or AIIC/ABBE, by trade.' }),
      doc('DBS check (photo of both sides)', 'Contractor', 'Required', { endDate: true, remind: [60, 30], onEnd: 'Pause them', checkedBy: 'Supervisor', detail: 'Type, 12-digit number and issue date. A new one is asked for after the maximum age.' }),
      doc('Bank details', 'Contractor', 'Required', { detail: 'Added in the portal after joining, then checked by phone. LSP can’t pay until checked.', onEnd: 'Block payouts' }),
    ],
    rules: [
      { id: 'cover', label: 'Public liability insurance: minimum cover', value: '2000000', kind: 'money' },
      { id: 'dbs', label: 'DBS check: maximum age', value: '3', kind: 'number', unit: 'years' },
      { id: 'soon', label: 'Flag documents ending within', value: '60', kind: 'number', unit: 'days', hint: "Ended documents can't be uploaded." },
      { id: 'approves', label: 'Who approves sign-ups', value: 'Supervisor', kind: 'select', options: ['Supervisor'], core: 'Supervisor (Sign-Ups page)' },
      { id: 'payday', label: 'Contractor pay day', value: 'Every Friday', kind: 'select', options: ['Every Friday', 'Every other Friday', 'Last Friday of the month'] },
    ] },
};
export const TRADES: { trade: string; reg: string }[] = [
  { trade: 'Gas engineer', reg: 'Gas Safe' }, { trade: 'Electrician', reg: 'NICEIC or NAPIT' }, { trade: 'Plumber', reg: 'WaterSafe or CIPHE' },
  { trade: 'Roofer', reg: 'CompetentRoofer' }, { trade: 'Locksmith', reg: 'MLA' }, { trade: 'Site Inspector', reg: 'AIIC or ABBE' },
];

/* ======================= message templates ======================= */
let tid = 0;
const tp = (name: string, group: string, channel: MsgChannel, to: Who, when: string, subject: string, body: string, required = false, at = '2 Jan 2026, 10:00', by = 'Michael Grant'): Template =>
  ({ id: 'MT' + String(++tid).padStart(2, '0'), name, group, channel, to, when, subject, body, required, on: true, by, at });
export const TEMPLATES: Template[] = [
  tp('Landlord welcome and set password', 'Accounts and sign-in', 'Email', 'Landlord', 'When the Supervisor creates the landlord', 'Welcome to Landlord Service Plans', 'Hi {first_name},\n\nWelcome to LSP. Your account is ready. Set your password here: {link}\n\nThe link works for 7 days. Your Office Admin is {office_admin} ({office_phone}).', true),
  tp('Tenant portal invite', 'Accounts and sign-in', 'Email', 'Applicant', 'After LSP talks to the applicant', 'Your application for {address}', 'Hi {first_name},\n\nThanks for talking to us. Sign in to finish your application for {address}: {link}', true),
  tp('Letting agent welcome', 'Accounts and sign-in', 'Email', 'Letting agent', 'When the agency account is created', 'Your LSP account is ready', 'Hi {first_name},\n\nYour account for {company} is ready. Set your password here: {link}', true),
  tp('Contractor approved', 'Accounts and sign-in', 'Email', 'Contractor', 'When the Supervisor approves a sign-up', 'You’re approved to work with LSP', 'Hi {first_name},\n\nYour documents are checked and you’re approved. Set your password here: {link}\n\nThen add your bank details so we can pay you.', true),
  tp('Staff invite', 'Accounts and sign-in', 'Email', 'Office Admin', 'When the Company Admin invites a staff member', 'You’re invited to Genesis', 'Hi {first_name},\n\n{sender} invited you to Genesis as {role}. Set your password here: {link}', true),
  tp('Security code', 'Accounts and sign-in', 'Text', 'Everyone', 'Every time someone signs in', '', 'Your LSP security code is {code}. It works for 10 minutes. Never share it.', true),
  tp('Reset password', 'Accounts and sign-in', 'Email', 'Everyone', 'When someone asks to reset', 'Reset your LSP password', 'Hi {first_name},\n\nReset your password here: {link}\n\nIf you didn’t ask, ignore this email.', true),
  tp('Account locked', 'Accounts and sign-in', 'Email', 'Everyone', 'After 5 wrong security codes', 'Your LSP account is locked', 'Hi {first_name},\n\nThere were too many wrong codes, so we locked your account to keep it safe. Call us on {office_phone} to unlock it.', true),
  tp('Invite not used yet', 'Accounts and sign-in', 'Email', 'Everyone', 'Reminder after an invite', 'Your LSP invite is waiting', 'Hi {first_name},\n\nYou haven’t set your password yet. Use this link: {link}'),
  tp('Thanks for your enquiry', 'Enquiries and lettings', 'Email', 'Enquirer', 'When the website form is sent', 'Thanks for contacting LSP', 'Hi {first_name},\n\nThanks for getting in touch. {office_admin} will call you within 1 working day.'),
  tp("We don't cover your area yet", 'Enquiries and lettings', 'Email', 'Enquirer', 'When the postcode is outside a live area', 'We’ll let you know', 'Hi {first_name},\n\n{area_message}\n\nWe’ve added you to our waiting list.'),
  tp('Documents needed', 'Enquiries and lettings', 'Email', 'Applicant', 'Reminder while documents are missing', 'Documents needed for {address}', 'Hi {first_name},\n\nWe still need: {missing_documents}. Upload them here: {link}'),
  tp('Invite to share the rent', 'Enquiries and lettings', 'Email', 'Rent sharer', 'When the applicant adds a rent sharer', '{applicant} added you to an application', 'Hi {first_name},\n\n{applicant} added you as someone who shares the rent for {address}. Sign in to upload your documents: {link}', true),
  tp('Application approved', 'Enquiries and lettings', 'Email', 'Applicant', 'After the Supervisor approves', 'Good news about {address}', 'Hi {first_name},\n\nYour application is approved. Next, we book your move-in date.'),
  tp('Application not going ahead', 'Enquiries and lettings', 'Email', 'Applicant', 'When staff mark it not going ahead', 'Your application for {address}', 'Hi {first_name},\n\nWe’re sorry, your application isn’t going ahead. We keep your files for {keep_months} months, then delete them.'),
  tp('Move-in booked', 'Enquiries and lettings', 'Email', 'Tenant', 'When the move-in is booked', 'Your move-in on {date}', 'Hi {first_name},\n\nYour move-in at {address} is on {date} at {time}. Bring photo ID. We’ll do the move-in inspection together.'),
  tp('Move-in tomorrow', 'Enquiries and lettings', 'Text', 'Tenant', 'Day before move-in', '', 'LSP: see you tomorrow at {time} at {address} for your move-in. Bring photo ID.'),
  tp('Rent due soon', 'Rent and money', 'Email', 'Tenant', 'Before rent is due', 'Rent of {amount} due on {due_date}', 'Hi {first_name},\n\nYour rent of {amount} is due on {due_date}. Pay to {bank_details} with reference {reference}.'),
  tp('Rent due soon (text)', 'Rent and money', 'Text', 'Tenant', 'Before rent is due', '', 'LSP: rent of {amount} is due on {due_date}. Ref {reference}.'),
  tp('Rent is late', 'Rent and money', 'Email', 'Tenant', 'After the due date', 'Your rent is late', 'Hi {first_name},\n\nWe haven’t received your rent of {amount} due on {due_date}. If you’re struggling, reply and we’ll help.'),
  tp('Part payment received', 'Rent and money', 'Email', 'Tenant', 'After a part payment', 'We received {paid}', 'Hi {first_name},\n\nThanks, we received {paid}. {balance} is still to pay.'),
  tp('Monthly statement', 'Rent and money', 'Email', 'Landlord', 'On payout day', 'Your {month} statement', 'Hi {first_name},\n\nYour statement for {month} is ready. We paid {amount} to your bank today.', true),
  tp('Invoice sent', 'Rent and money', 'Email', 'Letting agent', 'When an invoice is sent', 'Invoice {invoice_no} from LSP', 'Hi {first_name},\n\nInvoice {invoice_no} for {amount} is attached. It is due on {due_date}.', true),
  tp('Invoice overdue', 'Rent and money', 'Email', 'Letting agent', 'After the invoice due date', 'Invoice {invoice_no} is overdue', 'Hi {first_name},\n\nInvoice {invoice_no} for {amount} was due on {due_date}. Pay by card or bank transfer: {link}'),
  tp('Remittance', 'Rent and money', 'Email', 'Contractor', 'On pay day', 'LSP paid you {amount}', 'Hi {first_name},\n\nWe paid {amount} today. The remittance is attached.'),
  tp('Damage quote', 'Rent and money', 'Email', 'Tenant', 'When staff send a damage quote', 'Damage at {address}', 'Hi {first_name},\n\nWe found damage at {address}. The quote is {amount}. Agree or disagree here: {link}'),
  tp("We've got your repair", 'Jobs and repairs', 'Email', 'Tenant', 'When a repair is reported', 'Repair {job_no} received', 'Hi {first_name},\n\nWe’ve got your repair: {job_title}. We’ll book a visit and tell you the time.'),
  tp('Visit booked', 'Jobs and repairs', 'Text', 'Tenant', 'When a visit is booked', '', 'LSP: {contractor} will visit {address} on {date} at {time} for {job_title}. Reply to change it.'),
  tp('Visit tomorrow', 'Jobs and repairs', 'Text', 'Tenant', 'Day before a visit', '', 'LSP: reminder, {contractor} visits tomorrow at {time}.'),
  tp('New job for you', 'Jobs and repairs', 'Email', 'Contractor', 'When a job is given to a contractor', 'New job {job_no}: {job_title}', 'Hi {first_name},\n\nWe’ve given you job {job_no} at {address} on {date} at {time}. Please confirm the visit: {link}'),
  tp('Visit tomorrow (contractor)', 'Jobs and repairs', 'Text', 'Contractor', 'Day before a visit', '', 'LSP: job {job_no} tomorrow at {time}, {address}.'),
  tp('Repair needs your approval', 'Jobs and repairs', 'Email', 'Landlord', 'When the Supervisor sends a repair to the landlord', 'Repair approval needed · {address}', 'Hi {first_name},\n\n{job_title} costs {amount}. Your plan covers {covered}, you pay {you_pay}. Approve or decline here: {link}\n\nNo reply is not a yes.', true),
  tp('Quote to accept', 'Jobs and repairs', 'Email', 'Letting agent', 'When a quote is sent', 'Quote {quote_no} for {address}', 'Hi {first_name},\n\nQuote {quote_no} for {job_title} is {amount}. Accept it here: {link}', true),
  tp('Quote ends soon', 'Jobs and repairs', 'Email', 'Letting agent', 'Before a quote ends', 'Quote {quote_no} ends on {date}', 'Hi {first_name},\n\nQuote {quote_no} ends on {date}. Accept it before then: {link}'),
  tp('Photos not sent yet', 'Jobs and repairs', 'Email', 'Contractor', 'After the visit', 'Job {job_no}: photos and invoice needed', 'Hi {first_name},\n\nPlease send the photos and your invoice for job {job_no}: {link}'),
  tp('Is it fixed?', 'Jobs and repairs', 'Text', 'Tenant', 'After work is approved', '', 'LSP: is {job_title} fixed? Reply YES or NO.'),
  tp('Certificate due', 'Safety and compliance', 'Email', 'Landlord', 'Before a certificate ends', 'Your {certificate} ends on {date}', 'Hi {first_name},\n\nThe {certificate} at {address} ends on {date}. We’ll book the renewal.'),
  tp('Certificate due (staff)', 'Safety and compliance', 'In-app', 'Office Admin', 'Before a certificate ends', 'Book the {certificate} renewal', '{certificate} at {address} ends on {date}. Book the renewal.'),
  tp('Your document ends soon', 'Safety and compliance', 'Email', 'Contractor', 'Before insurance, registration or DBS ends', 'Your {document} ends on {date}', 'Hi {first_name},\n\nYour {document} ends on {date}. Upload the new one so you keep getting work: {link}'),
  tp("You're paused", 'Safety and compliance', 'Email', 'Contractor', 'When a document ends', 'You’re paused on LSP', 'Hi {first_name},\n\nYour {document} ended, so you’re paused. Upload the new one and we’ll check it the same day: {link}', true),
  tp('New agreement to accept', 'Safety and compliance', 'Email', 'Everyone', 'When a new version is published', 'Please read and accept: {agreement}', 'Hi {first_name},\n\nWe’ve updated the {agreement} (version {version}). What changed: {what_changed}. Read and accept it next time you sign in.', true),
  tp('Inspection booked', 'Safety and compliance', 'Email', 'Tenant', 'Before an inspection', 'Inspection on {date}', 'Hi {first_name},\n\nWe’ll inspect {address} on {date} at {time}. Let us know if we can use a key.'),
  tp('Tenancy ends soon', 'Tenancy', 'Email', 'Tenant', 'Before the tenancy end date', 'Your tenancy ends on {date}', 'Hi {first_name},\n\nYour tenancy ends on {date}. Tell us if you’d like to stay: {link}'),
  tp('Notice received', 'Tenancy', 'Email', 'Tenant', 'When the tenant gives notice', 'We received your notice', 'Hi {first_name},\n\nWe received your notice. Your last day is {date}. We’ll book the move-out inspection.'),
  tp('Deposit returned', 'Tenancy', 'Email', 'Tenant', 'When the deposit is returned', 'Your deposit is on its way', 'Hi {first_name},\n\nWe’ve returned {amount} of your deposit to your bank.'),
  tp("Accountant's figure needed", 'Overseas tax', 'In-app', 'Office Admin', 'Before payout day', 'Tax figure needed for {landlord}', 'Add the accountant’s figure for {landlord} before payout day ({date}).'),
  tp('Yearly tax certificate', 'Overseas tax', 'Email', 'Landlord', 'Once a year', 'Your tax certificate for {tax_year}', 'Hi {first_name},\n\nYour yearly tax certificate for {tax_year} is attached.'),
  tp('Time to give notice', 'Planned Switch', 'Email', 'Landlord', 'Before the notice date', 'Time to give notice to {current_agent}', 'Hi {first_name},\n\nYour notice date with {current_agent} is {date}. We can help you write the notice.'),
  tp('Work is late', 'Staff alerts', 'In-app', 'Office Admin', 'When work passes its late limit', '{item} is late', '{item} has been at {stage} for {days} days.'),
  tp('Repair budget alert', 'Staff alerts', 'Email', 'Landlord', 'At 70%, 90% and 100% of the budget', '{percent} of your repair budget used', 'Hi {first_name},\n\nYou’ve used {percent} of this year’s repair budget for {address}.'),
];
TEMPLATES[0].at = '8 Oct 2026, 14:22'; TEMPLATES[0].by = 'Sarah Khan';
TEMPLATES[17].at = '1 Oct 2026, 09:05';
TEMPLATES.find(t => t.name === 'Photos not sent yet')!.on = false;

/** Details that can be put into messages, with a sample value for the preview. */
export const TOKENS: Record<string, string> = {
  first_name: 'Daniel', full_name: 'Daniel Price', address: 'Flat 4, 19 Highgate Hill, N19 5NA', date: '21 Oct 2026', time: '10:30', amount: '£1,350', due_date: '1 Nov 2026',
  link: 'https://app.lsp.co.uk/r/8KQ2', reference: 'LSP-T14', bank_details: 'Barclays 20-45-77 43819902', paid: '£900', balance: '£450', month: 'October 2026',
  office_admin: 'James Carter', office_phone: '020 7946 0012', company: 'Rosewood Lettings', code: '482913', sender: 'Michael Grant', role: 'Office Admin',
  area_message: "We open in West and South West London in March 2027.", missing_documents: 'proof of income, bank statements', applicant: 'Aisha Rahman', keep_months: '6',
  invoice_no: 'INV-1047', quote_no: 'Q-2411', job_no: 'J21', job_title: 'Kitchen tap dripping', contractor: 'QuickPlumb', covered: '£200', you_pay: '£480',
  certificate: 'gas safety certificate', document: 'public liability insurance', agreement: 'contractor agreement', version: '4', what_changed: 'Parts over £50 need a receipt',
  landlord: 'Margaret Okafor', tax_year: '2026 to 2027', current_agent: 'Northgate Homes', item: 'Application · Aisha Rahman', stage: 'LSP checks', days: '6', percent: '70%',
};
export const TOKEN_LABEL: Record<string, string> = {
  first_name: 'First name', full_name: 'Full name', address: 'Address', date: 'Date', time: 'Time', amount: 'Amount', due_date: 'Due date', link: 'Link', reference: 'Payment reference',
  bank_details: 'LSP bank details', paid: 'Amount paid', balance: 'Left to pay', month: 'Month', office_admin: 'Office Admin', office_phone: 'Office phone', company: 'Company',
  code: 'Security code', sender: 'Sent by', role: 'Role', area_message: 'Area message', missing_documents: 'Missing documents', applicant: 'Applicant', keep_months: 'Months files are kept',
  invoice_no: 'Invoice number', quote_no: 'Quote number', job_no: 'Job number', job_title: 'Job', contractor: 'Contractor', covered: 'Covered by plan', you_pay: 'Landlord pays',
  certificate: 'Certificate', document: 'Document', agreement: 'Agreement', version: 'Version', what_changed: 'What changed', landlord: 'Landlord', tax_year: 'Tax year',
  current_agent: 'Current agent', item: 'Item', stage: 'Stage', days: 'Days', percent: 'Percent',
};

/* ======================= reminders ======================= */
export const EVENTS = ['the rent due date', 'a part payment', 'the invoice due date', 'payout day', 'the visit', 'the quote is sent', 'the quote end date', 'the visit date', 'work is approved',
  'the certificate end date', 'the document end date', 'the DBS renewal date', 'the inspection date', 'the invite is sent', 'documents are asked for', 'the move-in date', 'the tenancy end date',
  'the move-out date', 'a new version is published', 'the notice date', 'the follow-up date', 'the quarter end', 'the tax certificate deadline'];
let rid = 0;
const rm = (name: string, group: string, to: Who[], channels: MsgChannel[], n: number, unit: 'days' | 'hours', when: 'before' | 'after', date: string, tpl: string, repeat = 'Once', on = true): Reminder =>
  ({ id: 'RM' + String(++rid).padStart(2, '0'), name, group, to, channels, n, unit, when, date, template: TEMPLATES.find(t => t.name === tpl)!.id, on, repeat });
export const REMINDERS: Reminder[] = [
  rm('Rent due soon', 'Rent and money', ['Tenant'], ['Email', 'Text'], 3, 'days', 'before', 'the rent due date', 'Rent due soon'),
  rm('Rent is late', 'Rent and money', ['Tenant'], ['Email'], 1, 'days', 'after', 'the rent due date', 'Rent is late'),
  rm('Rent still late (staff)', 'Rent and money', ['Office Admin'], ['In-app'], 7, 'days', 'after', 'the rent due date', 'Work is late'),
  rm('Part payment: rest to pay', 'Rent and money', ['Tenant'], ['Email'], 3, 'days', 'after', 'a part payment', 'Part payment received', 'Every 7 days until paid'),
  rm('Invoice overdue', 'Rent and money', ['Letting agent', 'Landlord'], ['Email'], 1, 'days', 'after', 'the invoice due date', 'Invoice overdue', 'Every 7 days until paid'),
  rm('Invoice overdue (staff)', 'Rent and money', ['Office Admin'], ['In-app'], 14, 'days', 'after', 'the invoice due date', 'Work is late'),
  rm("Accountant's figure for overseas landlords", 'Rent and money', ['Office Admin'], ['In-app'], 5, 'days', 'before', 'payout day', "Accountant's figure needed"),
  rm('HMRC quarterly payment', 'Rent and money', ['Supervisor'], ['Email', 'In-app'], 14, 'days', 'before', 'the quarter end', 'Work is late'),
  rm('Yearly tax certificates', 'Rent and money', ['Supervisor'], ['Email'], 30, 'days', 'before', 'the tax certificate deadline', 'Work is late'),
  rm('Visit tomorrow (tenant)', 'Jobs and repairs', ['Tenant'], ['Text'], 1, 'days', 'before', 'the visit', 'Visit tomorrow'),
  rm('Visit tomorrow (contractor)', 'Jobs and repairs', ['Contractor'], ['Text'], 1, 'days', 'before', 'the visit', 'Visit tomorrow (contractor)'),
  rm('Repair waiting for the landlord', 'Jobs and repairs', ['Landlord'], ['Email'], 3, 'days', 'after', 'the quote is sent', 'Repair needs your approval', 'Every 3 days, 3 times'),
  rm('Quote ends soon', 'Jobs and repairs', ['Letting agent'], ['Email'], 3, 'days', 'before', 'the quote end date', 'Quote ends soon'),
  rm('Photos and invoice not sent', 'Jobs and repairs', ['Contractor'], ['Email'], 2, 'days', 'after', 'the visit date', 'Photos not sent yet', 'Once', false),
  rm('Is it fixed?', 'Jobs and repairs', ['Tenant'], ['Text'], 1, 'days', 'after', 'work is approved', 'Is it fixed?'),
  rm('Gas certificate renewal', 'Safety and compliance', ['Landlord'], ['Email'], 60, 'days', 'before', 'the certificate end date', 'Certificate due'),
  rm('Gas certificate renewal (staff)', 'Safety and compliance', ['Office Admin'], ['In-app'], 30, 'days', 'before', 'the certificate end date', 'Certificate due (staff)'),
  rm('Electrical check (EICR) renewal', 'Safety and compliance', ['Landlord', 'Office Admin'], ['Email', 'In-app'], 90, 'days', 'before', 'the certificate end date', 'Certificate due'),
  rm('Contractor insurance ends', 'Safety and compliance', ['Contractor'], ['Email'], 60, 'days', 'before', 'the document end date', 'Your document ends soon'),
  rm('Contractor insurance ends (last call)', 'Safety and compliance', ['Contractor', 'Supervisor'], ['Email', 'In-app'], 30, 'days', 'before', 'the document end date', 'Your document ends soon'),
  rm('DBS check renewal', 'Safety and compliance', ['Contractor'], ['Email'], 60, 'days', 'before', 'the DBS renewal date', 'Your document ends soon'),
  rm('Routine inspection', 'Safety and compliance', ['Tenant'], ['Email'], 14, 'days', 'before', 'the inspection date', 'Inspection booked'),
  rm('Agreement not accepted yet', 'Safety and compliance', ['Everyone'], ['Email'], 3, 'days', 'after', 'a new version is published', 'New agreement to accept', 'Every 7 days until accepted'),
  rm('Documents still missing', 'Enquiries and lettings', ['Applicant', 'Rent sharer'], ['Email'], 2, 'days', 'after', 'documents are asked for', 'Documents needed', 'Every 2 days, 3 times'),
  rm('Move-in tomorrow', 'Enquiries and lettings', ['Tenant'], ['Text'], 1, 'days', 'before', 'the move-in date', 'Move-in tomorrow'),
  rm('Invite not used', 'Enquiries and lettings', ['Everyone'], ['Email'], 3, 'days', 'after', 'the invite is sent', 'Invite not used yet'),
  rm('Tenancy ends soon', 'Tenancy', ['Tenant'], ['Email'], 60, 'days', 'before', 'the tenancy end date', 'Tenancy ends soon'),
  rm('Tenancy ends soon (staff)', 'Tenancy', ['Office Admin'], ['In-app'], 90, 'days', 'before', 'the tenancy end date', 'Work is late'),
  rm('Return the deposit', 'Tenancy', ['Office Admin'], ['In-app'], 10, 'days', 'after', 'the move-out date', 'Work is late'),
  rm('Time to give notice', 'Planned Switch', ['Landlord'], ['Email'], 30, 'days', 'before', 'the notice date', 'Time to give notice'),
  rm('Follow-up missed', 'Planned Switch', ['Office Admin'], ['In-app'], 1, 'days', 'after', 'the follow-up date', 'Work is late'),
];

/* ======================= checklists ======================= */
let ci = 0;
const items = (...t: (string | [string, boolean])[]): CheckItem[] => t.map(x => typeof x === 'string' ? { id: 'CI' + ++ci, text: x, required: true } : { id: 'CI' + ++ci, text: x[0], required: x[1] });
const PHOTOS = { id: 'photos', label: 'Photos', options: ['Every item', 'Only when something is wrong', 'Optional'] };
const SIGN = { id: 'sign', label: 'Signature', options: ['Tenant and staff', 'Staff only', 'Not needed'] };
const MISSING = { id: 'missing', label: 'Finish with items not done', options: ['Not allowed', 'Allowed with a reason'] };
export const CHECKLISTS: Checklist[] = [
  { id: 'CL1', name: 'Move-in inspection', usedBy: 'Office Admin · tenant signs', app: 'Staff portals', version: 3, by: 'Sarah Khan', at: '12 Sep 2026, 11:00',
    items: items('Keys handed over (count each set)', 'Meter readings: gas, electric, water', 'Smoke and CO alarms tested', 'Each room: walls, floor, windows, fittings', 'Appliances working', ['Garden and outside areas', false], 'How the home works explained', 'Tenant signs the report'),
    rules: [{ ...PHOTOS, value: 'Every item' }, { ...SIGN, value: 'Tenant and staff' }, { id: 'meter', label: 'Meter photos', value: 'Required', options: ['Required', 'Optional'] }, { ...MISSING, value: 'Not allowed' }] },
  { id: 'CL2', name: 'Routine inspection', usedBy: 'Office Admin', app: 'Staff portals', version: 2, by: 'Sarah Khan', at: '2 Jun 2026, 10:00',
    items: items('Each room: condition and cleanliness', 'Signs of damp or mould', 'Smoke and CO alarms tested', 'Repairs the tenant has noticed', ['Garden kept tidy', false], 'Who is living in the home'),
    rules: [{ ...PHOTOS, value: 'Only when something is wrong' }, { ...SIGN, value: 'Staff only' }, { id: 'every', label: 'How often', value: 'Every 6 months', options: ['Every 3 months', 'Every 6 months', 'Every 12 months'] }, { ...MISSING, value: 'Allowed with a reason' }] },
  { id: 'CL3', name: 'Move-out inspection', usedBy: 'Office Admin · tenant signs', app: 'Staff portals', version: 2, by: 'Sarah Khan', at: '12 Sep 2026, 11:10',
    items: items('Compare each room with the move-in report', 'Meter readings: gas, electric, water', 'All keys returned', 'Damage found (start a damage quote)', 'Cleaning standard', 'Forwarding address taken'),
    rules: [{ ...PHOTOS, value: 'Every item' }, { ...SIGN, value: 'Tenant and staff' }, { id: 'meter', label: 'Meter photos', value: 'Required', options: ['Required', 'Optional'] }, { ...MISSING, value: 'Not allowed' }] },
  { id: 'CL4', name: 'Gas safety visit', usedBy: 'Contractor (gas engineer)', app: 'Contractor portal', version: 1, by: 'Michael Grant', at: '2 Jan 2026, 10:00',
    items: items('Boiler checked', 'Each gas appliance checked', 'Flue and ventilation checked', 'CO alarm tested', 'Certificate result: Pass, At risk or Immediately dangerous', 'Unsafe items made safe and labelled'),
    rules: [{ ...PHOTOS, value: 'Every item' }, { id: 'cert', label: 'Certificate file', value: 'Required', options: ['Required', 'Optional'] }, { id: 'unsafe', label: 'When not Pass', value: 'Tell LSP straight away', options: ['Tell LSP straight away', 'Note it on the job'] }] },
  { id: 'CL5', name: 'Finish the job', usedBy: 'Contractor', app: 'Contractor portal', version: 2, by: 'Sarah Khan', at: '1 Sep 2026, 09:00',
    items: items('Before photos (at least one)', 'After photos (at least one)', 'What you did', 'Your invoice (number, amount, file)', ['Follow-up work needed', false], 'Home left clean and safe'),
    rules: [{ id: 'extra', label: 'Invoice more than agreed', value: 'Needs a reason', options: ['Needs a reason', 'Not allowed'] }, { id: 'proof', label: 'Photo proof', value: 'Required before LSP checks', options: ['Required before LSP checks'] }] },
  { id: 'CL6', name: 'Planned Switch handover', usedBy: 'Office Admin', app: 'Staff portals', version: 1, by: 'Michael Grant', at: '2 Jan 2026, 10:00',
    items: items('Notice given to the current agent', 'Tenancy agreement copy', 'Deposit transferred and protected', 'Safety certificates', 'Keys collected', 'Rent paid to LSP from', ['Inventory from the current agent', false]),
    rules: [{ id: 'activate', label: 'Activate the switch', value: 'All required items done', options: ['All required items done', 'Supervisor can override'] }] },
  { id: 'CL7', name: 'Tenant documents check', usedBy: 'Office Admin', app: 'Staff portals', version: 1, by: 'Michael Grant', at: '2 Jan 2026, 10:00',
    items: items('Photo ID matches the person', 'Right to rent checked online', 'Income meets the affordability rule', 'Bank statements match the payslips', 'Every rent sharer checked'),
    rules: [{ id: 'redo', label: 'A document fails', value: 'Ask for it again', options: ['Ask for it again', 'Reject the application'] }] },
  { id: 'CL8', name: 'Contractor sign-up check', usedBy: 'Supervisor', app: 'Supervisor portal', version: 2, by: 'Sarah Khan', at: '1 Sep 2026, 09:30',
    items: items('Photo ID', 'Right to work', 'Insurance cover at least the minimum', 'Trade registration for each trade', 'DBS check: both sides clear, in date', ['References from 2 customers', false]),
    rules: [{ id: 'redo', label: 'A document fails', value: 'Ask for more', options: ['Ask for more', 'Reject the sign-up'] }] },
  { id: 'CL9', name: 'New managed home', usedBy: 'Office Admin', app: 'Staff portals', version: 1, by: 'Michael Grant', at: '2 Jan 2026, 10:00',
    items: items('Rooms added with sizes and photos', 'Gas, EICR and EPC on file', 'Keys and access', 'Repair budget set', ['Property Management Plan saved', false]),
    rules: [{ ...PHOTOS, value: 'Optional' }] },
];

/* ======================= stages and pick-lists ======================= */
let gi = 0;
const st = (staff: string, customer: string, late: number | null, core = true, show = true): Stage => ({ id: 'ST' + ++gi, staff, customer, late, core, show });
export const PROCESSES: Process[] = [
  { id: 'lettings', name: 'Lettings', customer: 'Applicant', stages: [st('Applied', 'Applied', 2), st('Contact', 'Talked to LSP', 3), st('Screening', 'LSP checks', 5), st('Deposit & referencing', 'Deposit and references', 5), st('Supervisor review', 'Final check', 2), st('Move-in', 'Moving in', null), st('Moved in', 'Moved in', null)] },
  { id: 'jobs', name: 'Jobs (managed homes)', customer: 'Landlord and tenant', stages: [st('New', 'Reported', 1), st('Priced', 'Checked by LSP', 2), st('Waiting approval', 'Approved by LSP', 2, true, false), st('Landlord approval', 'Your approval', 3), st('Assigned', 'Visit booked', 2), st('In progress', 'Work in progress', 3), st('Proof uploaded', 'Checked by LSP', 2), st('Approved', 'Done', null), st('Invoiced', 'Invoiced', null, false)] },
  { id: 'client', name: 'Jobs (client homes)', customer: 'Letting agent', stages: [st('New', 'Requested', 1), st('Quote sent', 'Quote sent', 7), st('Quote accepted', 'You accept', 1), st('Assigned', 'Contractor booked', 2), st('In progress', 'Work in progress', 3), st('Proof uploaded', 'Checked by LSP', 2), st('Invoiced', 'Invoiced', null), st('Paid', 'Paid', null)] },
  { id: 'switch', name: 'Planned Switch', customer: 'Landlord', stages: [st('New enquiry', 'Enquiry received', 1), st('Contact pending', 'We’ll call you', 2), st('Assessment', 'Looking at your homes', 7), st('Decision', 'Plan agreed', 7), st('Proposal sent', 'Proposal sent', 5), st('Agreement signed', 'Agreement signed', 7), st('Onboarding', 'Setting up', 10), st('Activated', 'Managed by LSP', null)] },
  { id: 'enquiries', name: 'Enquiries', customer: 'Enquirer', stages: [st('New', 'Received', 1), st('Given to an Office Admin', 'We’ll call you', 1), st('Contacted', 'We’ve talked', 3), st('Done', 'Done', null)] },
  { id: 'moveout', name: 'Move-out', customer: 'Tenant', stages: [st('Notice', 'Notice given', 3), st('Inspection booked', 'Inspection booked', null), st('Inspection done', 'Inspection done', 2), st('Deposit returned', 'Deposit returned', 10), st('Moved out', 'Moved out', null)] },
  { id: 'signup', name: 'Contractor sign-up', customer: 'Contractor', stages: [st('Applied', 'Sent to LSP', 1), st('Checking', 'LSP checks', 2), st('More info asked', 'More info asked', 5, false), st('Approved', 'Approved', null)] },
];
export const PICKLISTS: PickList[] = [
  { id: 'PK1', name: 'Reasons a letting is not going ahead', usedIn: 'Lettings › Not going ahead', items: ['Failed referencing', 'Not affordable', 'Applicant pulled out', 'Home let to someone else', 'No reply from applicant'] },
  { id: 'PK2', name: 'Reasons to close an enquiry', usedIn: 'Enquiries › Close', items: ['Not interested', 'Outside our areas', 'Duplicate', 'Could not reach them', 'Chose another agent'] },
  { id: 'PK3', name: 'Reasons to decline a job', usedIn: 'Jobs › Decline', items: ['Tenant damage (quote the tenant)', 'Landlord said no', 'Not a repair', 'Done already', 'Too costly for now'] },
  { id: 'PK4', name: 'Repair types', usedIn: 'Report a repair (all portals)', items: ['Plumbing', 'Heating and hot water', 'Electrical', 'Roof and gutters', 'Doors, windows and locks', 'Damp and mould', 'Appliances', 'Pests', 'Other'] },
  { id: 'PK5', name: 'How they found us', usedIn: 'Website forms and enquiries', items: ['Google', 'Recommended', 'Rightmove', 'Leaflet', 'Social media', 'Other'] },
  { id: 'PK6', name: 'Reasons to unlock a record', usedIn: 'Records › Unlock', items: ['Typing mistake', 'Wrong photo attached', 'Missing information', 'Tenant dispute'] },
  { id: 'PK7', name: 'Reasons for moving out', usedIn: 'Tenancy › Give notice', items: ['Buying a home', 'Moving for work', 'Need more space', 'Cost', 'Other'] },
  { id: 'PK8', name: 'Urgency', usedIn: 'Report a repair, Book a job', items: ['Emergency (call LSP too)', 'Urgent (within 48 hours)', 'Routine'] },
  { id: 'PK9', name: 'Damage types', usedIn: 'Tenant damage', items: ['Walls and paint', 'Carpets and floors', 'Doors and locks', 'Appliances', 'Cleaning', 'Missing items'] },
  { id: 'PK10', name: 'Contractor trades', usedIn: 'Contractor sign-up, Contractors', items: ['Gas engineer', 'Electrician', 'Plumber', 'Roofer', 'Locksmith', 'Carpenter & locks', 'Site Inspector', 'Cleaner', 'General builder'] },
];

/* ======================= documents ======================= */
const A = (show: boolean, when = '', never?: boolean): Access => ({ show, when, never });
const NO = A(false, '', true);
export const WHENS = ['As soon as it is checked', 'As soon as it is uploaded', 'After both sides sign', 'When it is sent', 'After the work is approved', 'After it is locked', 'When a version is saved', 'Monthly, on payout day', 'On pay day', 'Once a year'];
let xid = 0;
const dt = (name: string, group: string, access: Partial<Record<Audience, Access>>, staffOnly = false, why?: string): DocType =>
  ({ id: 'DT' + ++xid, name, group, staffOnly, why, access: { Landlord: A(false), Tenant: A(false), 'Letting agent': A(false), Contractor: A(false), ...(staffOnly ? { Landlord: NO, Tenant: NO, 'Letting agent': NO, Contractor: NO } : {}), ...access } });
export const DOC_TYPES: DocType[] = [
  dt('Gas safety certificate', 'Certificates', { Landlord: A(true, 'As soon as it is checked'), Tenant: A(true, 'As soon as it is checked'), 'Letting agent': A(true, 'As soon as it is checked'), Contractor: A(true, 'As soon as it is uploaded') }),
  dt('Electrical safety report (EICR)', 'Certificates', { Landlord: A(true, 'As soon as it is checked'), Tenant: A(true, 'As soon as it is checked'), 'Letting agent': A(true, 'As soon as it is checked'), Contractor: A(true, 'As soon as it is uploaded') }),
  dt('Energy Performance Certificate', 'Certificates', { Landlord: A(true, 'As soon as it is checked'), Tenant: A(true, 'As soon as it is checked'), 'Letting agent': A(true, 'As soon as it is checked') }),
  dt('Tenancy agreement', 'Tenancy', { Landlord: A(true, 'After both sides sign'), Tenant: A(true, 'After both sides sign'), Contractor: NO }),
  dt('Deposit certificate', 'Tenancy', { Landlord: A(true, 'As soon as it is uploaded'), Tenant: A(true, 'As soon as it is uploaded'), Contractor: NO }),
  dt('Inspection report', 'Tenancy', { Landlord: A(true, 'After it is locked'), Tenant: A(true, 'After it is locked') }),
  dt('Damage quote', 'Tenancy', { Landlord: A(true, 'When it is sent'), Tenant: A(true, 'When it is sent'), Contractor: NO }),
  dt('Quote', 'Jobs and money', { Landlord: A(true, 'When it is sent'), 'Letting agent': A(true, 'When it is sent'), Tenant: NO }),
  dt('Invoice', 'Jobs and money', { Landlord: A(true, 'When it is sent'), 'Letting agent': A(true, 'When it is sent'), Tenant: NO }),
  dt('Job report with photos', 'Jobs and money', { Landlord: A(true, 'After the work is approved'), 'Letting agent': A(true, 'After the work is approved'), Contractor: A(true, 'After the work is approved'), Tenant: A(false) }),
  dt("Contractor's invoice", 'Jobs and money', { Contractor: A(true, 'As soon as it is uploaded'), Landlord: NO, Tenant: NO, 'Letting agent': NO }, false, "LSP's cost is never shown to landlords, tenants or agents."),
  dt('Rent statement', 'Jobs and money', { Landlord: A(true, 'Monthly, on payout day'), Tenant: NO, Contractor: NO }),
  dt('Rent receipt', 'Jobs and money', { Tenant: A(true, 'When it is sent') }),
  dt('Remittance', 'Jobs and money', { Contractor: A(true, 'On pay day'), Landlord: NO, Tenant: NO, 'Letting agent': NO }),
  dt('Property Management Plan', 'Homes', { Landlord: A(true, 'When a version is saved'), Tenant: NO }),
  dt('Management agreement', 'Agreements', { Landlord: A(true, 'After both sides sign'), Tenant: NO, Contractor: NO }),
  dt('Lease (homes leased by LSP)', 'Agreements', { Landlord: A(true, 'After both sides sign'), Tenant: NO, Contractor: NO }),
  dt('Overseas tax letter and certificate', 'Agreements', { Landlord: A(true, 'Once a year'), Tenant: NO, Contractor: NO, 'Letting agent': NO }),
  dt('Tenant KYC files (ID, payslips, bank statements)', 'Staff only', {}, true, 'Personal documents. Only the person who uploaded them sees their own.'),
  dt('Referencing report', 'Staff only', {}, true, 'From the outside referencing company.'),
  dt('Landlord bank check record', 'Staff only', {}, true, 'Proof of the phone check.'),
  dt('Supervisor decision notes', 'Staff only', {}, true, 'Why a job, tenant or tax status was decided.'),
  dt('Internal notes and call logs', 'Staff only', {}, true),
];

const sec = (...p: [string, string][]): Section[] => p.map(([h, t]) => ({ h, t }));
const AGR_CT = sec(['Jobs', 'LSP gives you jobs through this portal. Confirm each visit. You can hand a job back before you start it.'], ['Pay', 'You are paid your agreed hourly rate, or the fixed price on the job, plus parts LSP agrees first.'], ['Invoices', 'Invoice LSP from the job, with the photos. LSP pays approved invoices every Friday by bank transfer.'], ['Extra work', 'Extra work is only paid when LSP agrees it first, as follow-up work.'], ['Checks', 'Keep your insurance (at least £2 million), trade registration and DBS check in date. If one ends, LSP pauses you.'], ['Putting it right', 'If LSP sends work back, put it right at no extra cost.'], ['Ending', "Either side can end this agreement with 30 days' notice."]);
const people = (n: string[]) => n;
export const AGREEMENTS: Agreement[] = [
  { id: 'AG1', name: 'Landlord management agreement', to: 'Landlords', people: people(['Margaret Okafor', 'David Hughes', 'Rachel Evans', 'Tom Ahmed', 'Helen Brooks', 'Karen Patel', 'Simon Wright', 'Fiona Clarke']),
    versions: [
      { v: 2, status: 'Live', effective: '1 Apr 2026', by: 'Sarah Khan', at: '20 Mar 2026, 10:00', change: 'Repair budget alerts at 70%, 90% and 100%.', mode: 'everyone', sections: sec(['What LSP does', 'LSP manages your home on the plan you choose: tenants, rent, safety checks, inspections and repairs.'], ['Fees', 'The plan fee is a percentage of the rent received, taken before your payout on the 20th.'], ['Repairs', 'Repairs under your job limit are covered by your plan. Over the limit, the Supervisor decides or asks you first.'], ['Repair budget', 'Each home has a yearly repair budget. We tell you at 70%, 90% and 100%.'], ['Ending', "Either side can end this agreement with 2 months' notice."]) },
      { v: 1, status: 'Retired', effective: '1 Jan 2026', by: 'Michael Grant', at: '2 Dec 2025, 10:00', change: 'First version.', sections: sec(['What LSP does', 'LSP manages your home on the plan you choose.'], ['Fees', 'The plan fee is a percentage of the rent received.'], ['Ending', "Either side can end this agreement with 2 months' notice."]) },
    ],
    accepts: [{ name: 'Margaret Okafor', v: 2, at: '2 Apr 2026, 19:10' }, { name: 'David Hughes', v: 2, at: '1 Apr 2026, 08:30' }, { name: 'Rachel Evans', v: 2, at: '10 Jun 2026, 12:00' }, { name: 'Tom Ahmed', v: 2, at: '3 Apr 2026, 17:45' }, { name: 'Helen Brooks', v: 1, at: '20 Feb 2026, 11:00' }, { name: 'Karen Patel', v: 2, at: '5 May 2026, 09:12' }, { name: 'Simon Wright', v: 2, at: '12 Sep 2026, 14:00' }] },
  { id: 'AG2', name: 'Tenant portal terms', to: 'Tenants and applicants', people: people(['Daniel Price', 'Michael Okafor', 'Jay Patel', 'Liz Brown', 'Megan Price', 'Aisha Rahman']),
    versions: [{ v: 1, status: 'Live', effective: '1 Jan 2026', by: 'Michael Grant', at: '2 Dec 2025, 10:00', change: 'First version.', mode: 'everyone', sections: sec(['Your account', 'Keep your password and security code private.'], ['Repairs', 'Report repairs here. In an emergency, call LSP too.'], ['Rent', 'Pay rent on time to the account shown. Tell us early if you are struggling.'], ['Your information', 'We use your information as our privacy notice explains.']) }],
    accepts: [{ name: 'Daniel Price', v: 1, at: '1 May 2026, 10:00' }, { name: 'Michael Okafor', v: 1, at: '3 Mar 2026, 18:00' }, { name: 'Jay Patel', v: 1, at: '10 Feb 2026, 20:00' }, { name: 'Liz Brown', v: 1, at: '15 Jan 2026, 09:00' }, { name: 'Megan Price', v: 1, at: '2 Apr 2026, 12:30' }, { name: 'Aisha Rahman', v: 1, at: '12 Oct 2026, 20:14' }] },
  { id: 'AG3', name: 'Letting agent terms of business', to: 'Letting agents', people: people(['Rosewood Lettings', 'Northgate Homes', 'City Key Agents']),
    versions: [
      { v: 3, status: 'Draft', effective: '1 Jan 2027', by: 'Michael Grant', at: '14 Oct 2026, 16:30', change: 'Quotes are valid for 30 days.', sections: sec(['Booking work', 'Book jobs through the portal. Nothing is booked until you accept the quote.'], ['Quotes', 'Quotes are valid for 30 days.'], ['Invoices', 'Pay invoices within your payment terms, by card or bank transfer.'], ['Costs', 'The invoice matches the quote unless you accept extra work.']) },
      { v: 2, status: 'Live', effective: '1 Jun 2026', by: 'Sarah Khan', at: '20 May 2026, 10:00', change: 'Part payments allowed.', mode: 'new', sections: sec(['Booking work', 'Book jobs through the portal. Nothing is booked until you accept the quote.'], ['Invoices', 'Pay invoices within your payment terms, by card or bank transfer. Part payments are allowed.'], ['Costs', 'The invoice matches the quote unless you accept extra work.']) },
      { v: 1, status: 'Retired', effective: '1 Jan 2026', by: 'Michael Grant', at: '2 Dec 2025, 10:00', change: 'First version.', sections: sec(['Booking work', 'Book jobs through the portal.'], ['Invoices', 'Pay invoices within your payment terms.']) },
    ],
    accepts: [{ name: 'Claire Rose', org: 'Rosewood Lettings', v: 2, at: '2 Jun 2026, 09:00' }, { name: 'Ian Walsh', org: 'Northgate Homes', v: 1, at: '5 Feb 2026, 14:00' }, { name: 'Lucy Green', org: 'City Key Agents', v: 2, at: '20 Jul 2026, 10:15' }] },
  { id: 'AG4', name: 'Contractor agreement', to: 'Contractors', people: people(['HeatRight Ltd', 'TopTile Roofing', 'SecureFix', 'QuickPlumb', 'Volt Electrical', 'Clear View Inspections', 'FixIt Carpentry']),
    versions: [
      { v: 3, status: 'Live', effective: '1 Sep 2026', by: 'Sarah Khan', at: '1 Sep 2026, 09:00', change: 'Pay day is now every Friday.', mode: 'everyone', sections: AGR_CT },
      { v: 2, status: 'Retired', effective: '20 Mar 2026', by: 'Sarah Khan', at: '20 Mar 2026, 11:00', change: 'DBS check added to the checks.', sections: AGR_CT.map(x => x.h === 'Invoices' ? { ...x, t: 'Invoice LSP from the job, with the photos. LSP pays approved invoices every other Friday.' } : x) },
      { v: 1, status: 'Retired', effective: '2 Jan 2026', by: 'Sarah Khan', at: '2 Jan 2026, 10:00', change: 'First version.', sections: AGR_CT.filter(x => x.h !== 'Checks') },
    ],
    accepts: [{ name: 'Gary Holt', org: 'HeatRight Ltd', v: 3, at: '2 Sep 2026, 07:40' }, { name: 'Dean Cole', org: 'TopTile Roofing', v: 3, at: '3 Sep 2026, 18:00' }, { name: 'Rita Singh', org: 'SecureFix', v: 2, at: '21 Mar 2026, 09:00' }, { name: 'Neil Burke', org: 'QuickPlumb', v: 3, at: '1 Sep 2026, 20:10' }, { name: 'Owen Price', org: 'Volt Electrical', v: 3, at: '4 Sep 2026, 08:00' }, { name: 'Clare Vine', org: 'Clear View Inspections', v: 2, at: '22 Mar 2026, 10:00' }, { name: 'Fred Ince', org: 'FixIt Carpentry', v: 3, at: '5 Sep 2026, 12:30' }] },
  { id: 'AG5', name: 'Health, safety and conduct rules', to: 'Contractors', people: people(['HeatRight Ltd', 'TopTile Roofing', 'SecureFix', 'QuickPlumb', 'Volt Electrical', 'Clear View Inspections', 'FixIt Carpentry']),
    versions: [
      { v: 2, status: 'Live', effective: '1 Sep 2026', by: 'Sarah Khan', at: '1 Sep 2026, 09:00', change: 'Added the rule on making gas appliances safe.', mode: 'everyone', sections: sec(['Arriving', 'Carry photo ID and say you are from LSP. Be on time, or tell LSP before the visit.'], ['Tenants', "Be polite. Only use a tenant's number for the visit."], ['Keys', 'Return keys the same day. Never copy a key.'], ['Photos', 'Take before and after photos of every job.'], ['Making safe', 'Make anything unsafe safe straight away, label it, and tell the tenant and LSP.'], ['Leaving', 'Take your waste away and leave the home clean. No smoking in the home.']) },
      { v: 1, status: 'Retired', effective: '2 Jan 2026', by: 'Sarah Khan', at: '2 Jan 2026, 10:00', change: 'First version.', sections: sec(['Arriving', 'Carry photo ID and say you are from LSP.'], ['Keys', 'Return keys the same day.'], ['Leaving', 'Leave the home clean.']) },
    ],
    accepts: [{ name: 'Gary Holt', org: 'HeatRight Ltd', v: 2, at: '2 Sep 2026, 07:41' }, { name: 'Dean Cole', org: 'TopTile Roofing', v: 2, at: '3 Sep 2026, 18:01' }, { name: 'Rita Singh', org: 'SecureFix', v: 1, at: '21 Mar 2026, 09:01' }, { name: 'Neil Burke', org: 'QuickPlumb', v: 2, at: '1 Sep 2026, 20:11' }, { name: 'Owen Price', org: 'Volt Electrical', v: 2, at: '4 Sep 2026, 08:01' }, { name: 'Clare Vine', org: 'Clear View Inspections', v: 2, at: '5 Sep 2026, 10:00' }, { name: 'Fred Ince', org: 'FixIt Carpentry', v: 2, at: '5 Sep 2026, 12:31' }] },
  { id: 'AG6', name: 'Privacy notice', to: 'Everyone who signs in', people: people(['Margaret Okafor', 'David Hughes', 'Rachel Evans', 'Daniel Price', 'Aisha Rahman', 'Claire Rose', 'Gary Holt', 'Dean Cole', 'Liz Brown', 'Neil Burke']),
    versions: [{ v: 1, status: 'Live', effective: '1 Jan 2026', by: 'Michael Grant', at: '2 Dec 2025, 10:00', change: 'First version.', mode: 'everyone', sections: sec(['Who we are', 'Landlord Service Plans Limited, 1 Upper Street, London N1 0PQ.'], ['What we keep', 'Your contact details, documents you upload and the work we do for you.'], ['How long', "We keep records for 6 years after you leave. Rejected applicants' files are deleted after 6 months."], ['Your rights', 'Ask for a copy of your data or ask us to correct it at any time.']) }],
    accepts: [{ name: 'Margaret Okafor', v: 1, at: '2 Apr 2026, 19:09' }, { name: 'David Hughes', v: 1, at: '1 Apr 2026, 08:29' }, { name: 'Rachel Evans', v: 1, at: '10 Jun 2026, 11:59' }, { name: 'Daniel Price', v: 1, at: '1 May 2026, 09:59' }, { name: 'Aisha Rahman', v: 1, at: '12 Oct 2026, 20:13' }, { name: 'Claire Rose', org: 'Rosewood Lettings', v: 1, at: '2 Jun 2026, 08:58' }, { name: 'Gary Holt', org: 'HeatRight Ltd', v: 1, at: '2 Jan 2026, 08:00' }, { name: 'Dean Cole', org: 'TopTile Roofing', v: 1, at: '3 Jan 2026, 18:00' }, { name: 'Liz Brown', v: 1, at: '15 Jan 2026, 08:59' }, { name: 'Neil Burke', org: 'QuickPlumb', v: 1, at: '4 Jan 2026, 20:00' }] },
];

let vi = 0;
const va = (name: string, title: string, body: string, footer: string, isDefault = false): Variant => ({ id: 'V' + ++vi, name, title, body, footer, isDefault });
const FOOT = 'Landlord Service Plans Limited · Company number 13940065 · 1 Upper Street, London N1 0PQ';
export const DOC_TEMPLATES: DocTemplate[] = [
  { id: 'DTP1', name: 'Quote', usedFor: 'Letting agents and landlords', by: 'Michael Grant', at: '2 Jan 2026, 10:00', variants: [
    va('Standard quote', 'Quote {quote_no}', 'For: {company}\nSite: {address}\n\nWork: {job_title}\nTotal: {amount}\n\nThis quote is valid until {date}. Nothing is booked until you accept it.', FOOT, true),
    va('For landlord approval', 'Repair for your approval', 'For: {full_name}\nHome: {address}\n\nWork: {job_title}\nTotal: {amount}\nCovered by your plan: {covered}\nYou pay: {you_pay}\n\nWe only book it when you approve.', FOOT)] },
  { id: 'DTP2', name: 'Invoice', usedFor: 'Letting agents and landlords', by: 'Michael Grant', at: '2 Jan 2026, 10:00', variants: [
    va('Standard invoice', 'Invoice {invoice_no}', 'To: {company}\nSite: {address}\n\nWork: {job_title}\nTotal: {amount}\nDue: {due_date}\n\nPay to {bank_details}, reference {invoice_no}.', FOOT, true),
    va('Covered by plan', 'Invoice {invoice_no}', 'To: {full_name}\nHome: {address}\n\nWork: {job_title}\nTotal: {amount}\nCovered by your plan: {covered}\nBalance due: £0', FOOT)] },
  { id: 'DTP3', name: 'Job report', usedFor: 'Landlords, agents, contractors', by: 'Michael Grant', at: '2 Jan 2026, 10:00', variants: [va('Job report', 'Job report {job_no}', 'Home: {address}\nWork: {job_title}\nDone by: {contractor} on {date}\n\nBefore and after photos are attached. The work was checked by LSP.', FOOT, true)] },
  { id: 'DTP4', name: 'Property Management Plan', usedFor: 'Landlords', by: 'Sarah Khan', at: '1 Sep 2026, 09:00', variants: [va('Yearly plan', 'Property Management Plan · {address}', 'Prepared for {full_name}.\n\nRooms, certificates, repairs this year and what is coming up next year. Saved versions never change.', FOOT, true)] },
  { id: 'DTP5', name: 'Rent statement', usedFor: 'Landlords', by: 'Michael Grant', at: '2 Jan 2026, 10:00', variants: [va('Monthly statement', 'Statement · {month}', 'For {full_name}\n\nRent received, less the LSP fee, VAT and repairs you pay, equals the amount paid to you on the 20th: {amount}.', FOOT, true)] },
  { id: 'DTP6', name: 'Remittance', usedFor: 'Contractors', by: 'Michael Grant', at: '2 Jan 2026, 10:00', variants: [va('Remittance', 'Remittance · {date}', 'Paid to {contractor}: {amount}\n\nInvoices included are listed below.', FOOT, true)] },
  { id: 'DTP7', name: 'Damage quote', usedFor: 'Tenants', by: 'Michael Grant', at: '2 Jan 2026, 10:00', variants: [va('Damage quote', 'Damage quote · {address}', 'For: {full_name}\n\nDamage found: {job_title}\nTotal: {amount}\n\nAgree and pay, pay from your deposit, or tell us if you disagree.', FOOT, true)] },
  { id: 'DTP8', name: 'Rent reminder letter', usedFor: 'Tenants', by: 'Michael Grant', at: '2 Jan 2026, 10:00', variants: [
    va('Friendly reminder', 'Rent reminder', 'Dear {full_name},\n\nOur records show {balance} of rent is still to pay for {address}. Please pay it by {due_date}.', FOOT, true),
    va('Second reminder', 'Rent still to pay', 'Dear {full_name},\n\n{balance} is still to pay. If you are struggling, call {office_admin} on {office_phone} so we can agree a plan.', FOOT)] },
  { id: 'DTP9', name: 'Deposit return letter', usedFor: 'Tenants', by: 'Michael Grant', at: '2 Jan 2026, 10:00', variants: [va('Deposit return', 'Your deposit', 'Dear {full_name},\n\nWe are returning {amount} of your deposit for {address}. Any deductions are listed with the photos from the move-out inspection.', FOOT, true)] },
  { id: 'DTP10', name: 'Yearly tax certificate', usedFor: 'Overseas landlords', by: 'Sarah Khan', at: '1 Apr 2026, 09:00', variants: [va('Tax certificate (NRL6)', 'Tax certificate · {tax_year}', 'For {full_name}\n\nTax kept back from your rent and paid to HMRC in {tax_year}: {amount}.', FOOT, true)] },
  { id: 'DTP11', name: 'Welcome letter', usedFor: 'Landlords', by: 'Michael Grant', at: '2 Jan 2026, 10:00', variants: [va('Welcome', 'Welcome to LSP', 'Dear {full_name},\n\nThank you for choosing Landlord Service Plans. Your Office Admin is {office_admin} ({office_phone}).', FOOT, true)] },
];

/* ======================= audit history (seed) ======================= */
let aid = 0;
const au = (at: string, who: string, page: string, item: string, what: string, before: string, after: string, reason?: string): AuditEntry => ({ id: 'AU' + String(++aid).padStart(3, '0'), at, who, page, item, what, before, after, reason });
export const AUDIT: AuditEntry[] = [
  au('14 Oct 2026, 12:00', 'Michael Grant', 'Sub Admins', 'Zara Malik', 'Added a Sub Admin', '—', 'Company details, Plans, VAT & tax: view · Services & prices, Products & codes: edit', 'Helps with pricing'),
  au('14 Oct 2026, 16:30', 'Michael Grant', 'Agreements', 'Letting agent terms of business', 'Started a new draft version', '—', 'Version 3 (draft)'),
  au('13 Oct 2026, 11:20', 'Michael Grant', 'Users', 'Nadia Rossi', 'Invited a staff member', '—', 'Office Admin · West & South West', 'First Office Admin for Area 2'),
  au('8 Oct 2026, 14:22', 'Sarah Khan', 'Message templates', 'Landlord welcome and set password', 'Changed the message', 'Your account is ready.', 'Welcome to LSP. Your account is ready.'),
  au('1 Oct 2026, 09:05', 'Michael Grant', 'Message templates', 'Rent due soon', 'Changed the message', 'Pay to the LSP account.', 'Pay to {bank_details} with reference {reference}.'),
  au('20 Sep 2026, 16:00', 'Michael Grant', 'Areas', 'South & South East', 'Added an area', '—', 'Off · waiting list on', 'Agents asking about South London'),
  au('20 Sep 2026, 17:05', 'Michael Grant', 'Users', 'Owen Price', 'Disabled a user', 'Active', 'Disabled', 'Volt Electrical stopped working with LSP'),
  au('12 Sep 2026, 11:00', 'Sarah Khan', 'Checklists', 'Move-in inspection', 'Added an item', '7 items', '8 items · How the home works explained'),
  au('1 Sep 2026, 11:20', 'Michael Grant', 'Areas', 'West & South West', 'Added an area', '—', 'Opens 1 Mar 2027', 'Second Supervisor area'),
  au('12 Oct 2026, 15:20', 'Michael Grant', 'Teams & cover', 'North & North West', 'Set holiday cover', '—', 'Marcus Bell covers for Sarah Khan, 2 to 9 Nov 2026', 'Sarah on annual leave'),
  au('1 Sep 2026, 09:00', 'Sarah Khan', 'Agreements', 'Contractor agreement', 'Published version 3', 'Version 2', 'Version 3 · everyone must accept again', 'Pay day moved to every Friday'),
  au('2 Jun 2026, 10:00', 'Sarah Khan', 'Checklists', 'Routine inspection', 'Changed a rule', 'How often: Every 3 months', 'How often: Every 6 months', 'Client decision'),
  au('30 Jun 2026, 16:05', 'Michael Grant', 'Users', 'Ben Cole', 'Disabled a user', 'Active', 'Disabled', 'Left the company'),
  au('20 Mar 2026, 10:00', 'Sarah Khan', 'Agreements', 'Landlord management agreement', 'Published version 2', 'Version 1', 'Version 2 · everyone must accept again', 'Repair budget alerts added'),
];
