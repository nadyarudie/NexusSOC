import { useState, useEffect } from "react";
import { Toaster } from "sonner";
import { supabase } from "./lib/supabase";
import Sidebar from "./components/Sidebar";
import DashboardView from "./components/DashboardView";
import IngestionView from "./components/IngestionView";
import EnvironmentsView from "./components/EnvironmentsView";
import IocDatabaseView from "./components/IocDatabaseView";
import MeanTimeView from "./components/MeanTimeView";
import MarkdownView from "./components/MarkdownView";
import DashboardTenantsView from "./components/DashboardTenantsView";
import ReportsView from "./components/ReportsView";
import LoginView from "./components/LoginView";
import NotesView from "./components/NotesView";
import ShortcutsView from "./components/ShortcutsView";
import IocEnrichmentView from "./components/IocEnrichmentView";
import ChronologyView from "./components/ChronologyView";
import AiAnalysisView from "./components/AiAnalysisView";
import ApiConfigView from "./components/ApiConfigView";
import AiChatBotView from "./components/AiChatBotView";
import SettingsView from "./components/SettingsView";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeView, setActiveView] = useState("view-dashboard");
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [notes, setNotes] = useState([]);
  const [apiKeys, setApiKeys] = useState({
    abuseIpDb: "",
    aiEngine: "",
  });
  const [userRoles, setUserRoles] = useState(() => {
    const saved = localStorage.getItem("nexus_roles");
    return saved
      ? JSON.parse(saved)
      : { u1: "Ticket Maker", u2: "Report Maker" };
  });

  useEffect(() => {
    async function loadTenants() {
      const { data, error } = await supabase.from("tenants").select(`
          id,
          name,
          agents (
            id,
            name,
            ip
          )
        `);

      if (error) {
        console.error("Error fetching tenants:", error.message);
      } else if (data) {
        setTenants(data);
      }
    }

    loadTenants();
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('nexus_theme') || 'light';
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem("nexus_user");
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (user) => {
    // Override the hardcoded role with the dynamic one
    const dynamicUser = { ...user, role: userRoles[user.id] };
    localStorage.setItem("nexus_user", JSON.stringify(dynamicUser));
    setCurrentUser(dynamicUser);
  };

  const handleLogout = () => {
    localStorage.removeItem("nexus_user");
    setCurrentUser(null);
  };

  const handleRoleChange = (newRole) => {
    if (!currentUser) return;

    const newRoles = {
      ...userRoles,
      [currentUser.id]: newRole,
    };

    setUserRoles(newRoles);
    localStorage.setItem("nexus_roles", JSON.stringify(newRoles));

    const updatedUser = { ...currentUser, role: newRole };
    setCurrentUser(updatedUser);
    localStorage.setItem("nexus_user", JSON.stringify(updatedUser));
  };

  const handleProfileUpdate = (updates) => {
    if (!currentUser) return;
    
    // Update current user state
    const updatedUser = { ...currentUser, ...updates };
    setCurrentUser(updatedUser);
    localStorage.setItem("nexus_user", JSON.stringify(updatedUser));

    // Also update credentials store so changes persist across logouts
    const savedUsers = JSON.parse(localStorage.getItem('nexus_credentials') || '{}');
    savedUsers[currentUser.id] = { 
      ...(savedUsers[currentUser.id] || {}), 
      ...updates 
    };
    localStorage.setItem('nexus_credentials', JSON.stringify(savedUsers));
  };

  const renderActiveView = () => {
    switch (activeView) {
      case "view-dashboard":
        return (
          <DashboardView
            setActiveView={setActiveView}
            currentUser={currentUser}
          />
        );
      case "view-dashboard-tenants":
        return (
          <DashboardTenantsView
            setActiveView={setActiveView}
            tenants={tenants}
            setTenants={setTenants}
          />
        );
      case "view-reports":
        return <ReportsView setActiveView={setActiveView} />;
      case "view-drop":
        return <IngestionView tenants={tenants} />;
      case "view-tenants":
        return <EnvironmentsView />;
      case "view-ioc":
        return <IocDatabaseView setActiveView={setActiveView} />;
      case "view-meantime":
        return <MeanTimeView />;
      case "view-shortcuts":
        return <ShortcutsView currentUser={currentUser} />;
      case "view-notes":
        return <NotesView notes={notes} setNotes={setNotes} />;
      case "view-markdown":
        return <MarkdownView />;
      case "view-chronology":
        return <ChronologyView notes={notes} />;
      case "view-enrichment":
        return <IocEnrichmentView notes={notes} apiKeys={apiKeys} />;
      case "view-ai-chat": return <AiChatBotView apiKeys={apiKeys} />; 
      case "view-ai":
        return <AiAnalysisView notes={notes} />;
      case "view-apiconfig":
        return <ApiConfigView apiKeys={apiKeys} setApiKeys={setApiKeys} />;
      case "view-settings":
        return <SettingsView currentUser={currentUser} onRoleChange={handleRoleChange} onProfileUpdate={handleProfileUpdate} />;
      default:
        return (
          <DashboardView
            setActiveView={setActiveView}
            currentUser={currentUser}
          />
        );
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
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        currentUser={currentUser}
        onLogout={handleLogout}
        onRoleChange={handleRoleChange}

        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />
      <main className="flex-1 h-full relative overflow-hidden bg-[#fafafa] flex flex-col">
        {/* Mobile Header */}
        <div className="lg:hidden h-14 border-b border-slate-200 bg-white flex items-center px-4 shrink-0 shadow-sm">
          <button 
            className="w-10 h-10 flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
            onClick={() => setIsMobileOpen(true)}
          >
            <i className="fa-solid fa-bars"></i>
          </button>
          <div className="flex-1 text-center font-semibold text-slate-900 tracking-tight text-sm">
            Nexus SOC
          </div>
          <div className="w-10 h-10"></div> {/* Spacer for centering */}
        </div>

        <div
          className="w-full flex-1 overflow-y-auto relative p-4 lg:p-10"
          id="main-scroll-area"
        >
          {renderActiveView()}
        </div>
      </main>
    </div>
  );
}
