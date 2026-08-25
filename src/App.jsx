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

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeView, setActiveView] = useState("view-dashboard");
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
    const otherUserId = currentUser.id === "u1" ? "u2" : "u1";
    const otherRole =
      newRole === "Ticket Maker" ? "Report Maker" : "Ticket Maker";

    const newRoles = {
      [currentUser.id]: newRole,
      [otherUserId]: otherRole,
    };

    setUserRoles(newRoles);
    localStorage.setItem("nexus_roles", JSON.stringify(newRoles));

    const updatedUser = { ...currentUser, role: newRole };
    setCurrentUser(updatedUser);
    localStorage.setItem("nexus_user", JSON.stringify(updatedUser));
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
        return <ShortcutsView />;
      case "view-notes":
        return <NotesView notes={notes} setNotes={setNotes} />;
      case "view-markdown":
        return <MarkdownView />;
      case "view-chronology":
        return <ChronologyView notes={notes} />;
      case "view-enrichment":
        return <IocEnrichmentView notes={notes} apiKeys={apiKeys} />;
      case "view-ai":
        return <AiAnalysisView notes={notes} />;
      case "view-apiconfig":
        return <ApiConfigView apiKeys={apiKeys} setApiKeys={setApiKeys} />;
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
      />
      <main className="flex-1 h-full relative overflow-hidden bg-[#fafafa]">
        <div
          className="w-full h-full overflow-y-auto relative p-6 lg:p-10"
          id="main-scroll-area"
        >
          {renderActiveView()}
        </div>
      </main>
    </div>
  );
}
