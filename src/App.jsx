import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import IngestionView from './components/IngestionView';
import EnvironmentsView from './components/EnvironmentsView';
import IocDatabaseView from './components/IocDatabaseView';
import MeanTimeView from './components/MeanTimeView';
import MarkdownView from './components/MarkdownView';
import DashboardTenantsView from './components/DashboardTenantsView';
import ReportsView from './components/ReportsView';
import LoginView from './components/LoginView';
import NotesView from './components/NotesView';
import ShortcutsView from './components/ShortcutsView';
import IocEnrichmentView from './components/IocEnrichmentView';
import ChronologyView from './components/ChronologyView';
import AiAnalysisView from './components/AiAnalysisView';
import ApiConfigView from './components/ApiConfigView';

const initialTenants = [
  { id: 1, name: 'Petra', agents: [{ id: 101, name: 'ReverseProxy-Petra', ip: '203.189.120.136' }, { id: 102, name: 'Wazuh-Agent-Petra-02', ip: '10.0.1.16' }] },
  { id: 2, name: 'Wicida', agents: [{ id: 201, name: 'Wazuh-Agent-Wicida-01', ip: '10.0.2.10' }, { id: 202, name: 'server-sebatik', ip: '157.245.206.186' }] },
  { id: 3, name: 'SGU', agents: [{ id: 301, name: 'Wazuh-Agent-SGU-01', ip: '10.0.3.5' }, { id: 302, name: 'Wazuh-Agent-SGU-02', ip: '10.0.3.6' }, { id: 303, name: 'Wazuh-Agent-SGU-03', ip: '10.0.3.7' }] },
  { id: 4, name: 'IKMI Cirebon', agents: [{ id: 401, name: 'Wazuh-Agent-IKMI-01', ip: '10.0.4.22' }] },
  { id: 5, name: 'Pradita', agents: [{ id: 501, name: 'Wazuh-Agent-Pradita-01', ip: '10.0.5.33' }, { id: 502, name: 'Wazuh-Agent-Pradita-02', ip: '10.0.5.34' }] },
];

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeView, setActiveView] = useState('view-dashboard');
  const [tenants, setTenants] = useState(initialTenants);
  const [notes, setNotes] = useState([]);
  const [apiKeys, setApiKeys] = useState({
    abuseIpDb: '',
    aiEngine: ''
  });
  const [userRoles, setUserRoles] = useState(() => {
    const saved = localStorage.getItem('nexus_roles');
    return saved ? JSON.parse(saved) : { u1: 'Ticket Maker', u2: 'Report Maker' };
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('nexus_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (user) => {
    // Override the hardcoded role with the dynamic one
    const dynamicUser = { ...user, role: userRoles[user.id] };
    localStorage.setItem('nexus_user', JSON.stringify(dynamicUser));
    setCurrentUser(dynamicUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('nexus_user');
    setCurrentUser(null);
  };

  const handleRoleChange = (newRole) => {
    if (!currentUser) return;
    const otherUserId = currentUser.id === 'u1' ? 'u2' : 'u1';
    const otherRole = newRole === 'Ticket Maker' ? 'Report Maker' : 'Ticket Maker';
    
    const newRoles = {
      [currentUser.id]: newRole,
      [otherUserId]: otherRole
    };
    
    setUserRoles(newRoles);
    localStorage.setItem('nexus_roles', JSON.stringify(newRoles));
    
    const updatedUser = { ...currentUser, role: newRole };
    setCurrentUser(updatedUser);
    localStorage.setItem('nexus_user', JSON.stringify(updatedUser));
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'view-dashboard':
        return <DashboardView setActiveView={setActiveView} currentUser={currentUser} />;
      case 'view-dashboard-tenants':
        return <DashboardTenantsView setActiveView={setActiveView} tenants={tenants} setTenants={setTenants} />;
      case 'view-reports':
        return <ReportsView setActiveView={setActiveView} />;
      case 'view-drop':
        return <IngestionView tenants={tenants} />;
      case 'view-tenants':
        return <EnvironmentsView />;
      case 'view-ioc':
        return <IocDatabaseView setActiveView={setActiveView} />;
      case 'view-meantime':
        return <MeanTimeView />;
      case 'view-shortcuts':
        return <ShortcutsView />;
      case 'view-notes':
        return <NotesView notes={notes} setNotes={setNotes} />;
      case 'view-markdown':
        return <MarkdownView />;
      case 'view-chronology':
        return <ChronologyView notes={notes} />;
      case 'view-enrichment':
        return <IocEnrichmentView notes={notes} apiKeys={apiKeys} />;
      case 'view-ai':
        return <AiAnalysisView notes={notes} />;
      case 'view-apiconfig':
        return <ApiConfigView apiKeys={apiKeys} setApiKeys={setApiKeys} />;
      default:
        return <DashboardView setActiveView={setActiveView} currentUser={currentUser} />;
    }
  };

  if (!currentUser) {
    return (
      <>
        <Toaster position="top-right" richColors />
        <LoginView onLogin={handleLogin} />
      </>
    );
  }

  return (
    <div className="h-screen w-full flex font-sans bg-[#fcfcfc]">
      <Toaster position="top-right" richColors />
      <Sidebar activeView={activeView} setActiveView={setActiveView} currentUser={currentUser} onLogout={handleLogout} onRoleChange={handleRoleChange} />
      <main className="flex-1 h-full relative overflow-hidden bg-[#fafafa]">
        <div className="w-full h-full overflow-y-auto relative p-6 lg:p-10" id="main-scroll-area">
          {renderActiveView()}
        </div>
      </main>
    </div>
  );
}