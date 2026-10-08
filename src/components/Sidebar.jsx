import { useRef } from 'react';

export default function Sidebar({ activeView, setActiveView, currentUser, onLogout, onRoleChange, isMobileOpen, setIsMobileOpen }) {
  const popupRef = useRef(null);

  // ... (keep the rest of the hooks, we will just change the aside className below)

  const navItems = [
    { section: 'Overview', items: [{ id: 'view-dashboard', label: 'Dashboard', icon: 'fa-chart-line' }] },
    {
      section: 'Operations',
      items: [
        { id: 'view-drop', label: 'Data Ingestion', icon: 'fa-arrow-up-from-bracket' },
        { id: 'view-tenants', label: 'Tenant In Detail', icon: 'fa-building' },
        { id: 'view-ioc', label: 'Global IoC', icon: 'fa-database' },
        { id: 'view-meantime', label: 'Mean Time', icon: 'fa-stopwatch' },
        { id: 'view-shortcuts', label: 'Shortcuts', icon: 'fa-link' },
      ],
    },
    {
      section: 'Report Creating',
      items: [
        { id: 'view-notes', label: 'Analyst Notes', icon: 'fa-note-sticky' },
        { id: 'view-chronology', label: 'Chronology Table', icon: 'fa-timeline' },
        { id: 'view-enrichment', label: 'IOC Enrichment', icon: 'fa-vial-virus' },
        { id: 'view-markdown', label: 'Turn to Markdown', icon: 'fa-markdown', isBrand: true }
      ],
    },
    {
      section: 'Artificial Intelligence',
      items: [
        { id: 'view-ai', label: 'AI Analyst', icon: 'fa-robot' },
        { id: 'view-ai-chat', label: 'AI Chat Bot', icon: 'fa-message' }
      ],
    },
    {
      section: 'Configuration',
      items: [
        { id: 'view-apiconfig', label: 'API Config', icon: 'fa-gears' }
      ],
    },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      
      <aside className={`w-64 border-r border-slate-200 bg-white flex flex-col shrink-0 z-30 overflow-hidden shadow-[4px_0_24px_rgba(0,0,0,0.06)] fixed inset-y-0 left-0 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-slate-900 flex items-center justify-center overflow-hidden">
              <img src="/nexus-logo.png" alt="Nexus Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="font-semibold text-slate-900 tracking-tight leading-none text-base">Nexus SOC</h1>
              <p className="text-[10px] text-slate-500 font-medium mt-1">Intelligence Platform</p>
            </div>
          </div>
          <button 
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            onClick={() => setIsMobileOpen(false)}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {navItems.map((grp, idx) => (
            <div key={idx}>
              <div className="px-4 mb-2">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{grp.section}</p>
              </div>
              <ul className="space-y-0.5 px-3 mb-6">
                {grp.items.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        setActiveView(item.id);
                        if (window.innerWidth < 1024) setIsMobileOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-200 ${
                        activeView === item.id
                          ? 'bg-slate-100 text-slate-900 font-semibold'
                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <i className={`${item.isBrand ? 'fa-brands' : 'fa-solid'} ${item.icon} w-4 text-center opacity-70`}></i>
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

      <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-white relative">
        <div 
          className="flex items-center gap-3 overflow-hidden cursor-pointer p-1 -ml-1 rounded hover:bg-slate-50 transition-colors flex-1"
          onClick={() => {
            setActiveView('view-settings');
            if (window.innerWidth < 1024) setIsMobileOpen(false);
          }}
        >
          <div className="w-8 h-8 flex-shrink-0 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-medium text-xs">
            {currentUser?.name?.charAt(0) || 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-slate-900 font-medium text-sm truncate">{currentUser?.name || 'User'}</p>
            <p className="text-[10px] text-slate-500 truncate">{currentUser?.role || 'Analyst'}</p>
          </div>
        </div>

        <button 
          onClick={onLogout}
          title="Sign Out"
          className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors flex-shrink-0"
        >
          <i className="fa-solid fa-arrow-right-from-bracket text-sm"></i>
        </button>
      </div>
    </aside>
    </>
  );
}