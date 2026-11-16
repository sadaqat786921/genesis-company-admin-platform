import { useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useStore, type Route as R } from './store';
import { Sidebar, Login } from './Shell';
import { Toasts } from './ui';
import { Overview } from './pages/Overview';
import { Company, Tax } from './pages/Business';
import { Areas } from './pages/Areas';
import { Plans, Services, Products } from './pages/Catalogue';
import { Users } from './pages/Users';
import { Roles, Teams } from './pages/Roles';
import { Onboarding } from './pages/Onboarding';
import { Reminders } from './pages/Reminders';
import { Templates } from './pages/Templates';
import { Checklists } from './pages/Checklists';
import { Stages } from './pages/Stages';
import { Access, DocTemplates } from './pages/Documents';
import { Agreements } from './pages/Agreements';
import { Audit } from './pages/Audit';

const PAGES: Record<R, () => React.ReactNode> = {
  overview: Overview, company: Company, areas: Areas, plans: Plans, services: Services, products: Products, tax: Tax,
  users: Users, roles: Roles, teams: Teams,
  'onb-tenant': () => <Onboarding role="tenant" />, 'onb-landlord': () => <Onboarding role="landlord" />, 'onb-agent': () => <Onboarding role="agent" />, 'onb-contractor': () => <Onboarding role="contractor" />,
  reminders: Reminders, templates: Templates, checklists: Checklists, stages: Stages, access: Access, agreements: Agreements, doctemplates: DocTemplates, audit: Audit,
};

const KEY = 'genesis-ca-signed-in';
const read = () => { try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; } };
const write = (v: boolean) => { try { v ? sessionStorage.setItem(KEY, '1') : sessionStorage.removeItem(KEY); } catch { /* ignore */ } };

function Platform({ onLogout }: { onLogout: () => void }) {
  const s = useStore();
  const Page = PAGES[s.route];
  return <div className="app">
    <Sidebar onLogout={onLogout} />
    <main className="content" key={s.route + (s.detail ?? '')}><Page /></main>
  </div>;
}

export default function App() {
  const [auth, setAuth] = useState(read);
  const nav = useNavigate();
  const signIn = () => { write(true); setAuth(true); const h = location.hash.replace('#', ''); if (!h || h === '/' || h === '/login') nav('/overview', { replace: true }); };
  if (!auth) return <><Login onDone={signIn} /><Toasts /></>;
  return <>
    <Routes>
      <Route path="/" element={<Navigate to="/overview" replace />} />
      <Route path="/login" element={<Navigate to="/overview" replace />} />
      <Route path="/*" element={<Platform onLogout={() => { write(false); setAuth(false); nav('/login', { replace: true }); }} />} />
    </Routes>
    <Toasts />
  </>;
}
