import { useState, useRef, useEffect } from 'react';

export default function Sidebar({ activeView, setActiveView, currentUser, onLogout, onRoleChange }) {
  const [showRolePopup, setShowRolePopup] = useState(false);
  const popupRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setShowRolePopup(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        { id: 'view-ai', label: 'AI Analyst', icon: 'fa-robot' },
        { id: 'view-markdown', label: 'Turn to Markdown', icon: 'fa-markdown', isBrand: true }
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
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0 z-20 overflow-hidden shadow-[4px_0_24px_rgba(0,0,0,0.06)]">
      <div className="p-6 border-b border-slate-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-slate-900 flex items-center justify-center overflow-hidden">
          <img src="/nexus-logo.png" alt="Nexus Logo" className="w-full h-full object-cover" />
        </div>
        <div>
          <h1 className="font-semibold text-slate-900 tracking-tight leading-none text-base">Nexus SOC</h1>
          <p className="text-[10px] text-slate-500 font-medium mt-1">Intelligence Platform</p>
        </div>
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
                    onClick={() => setActiveView(item.id)}
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

      <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-white relative" ref={popupRef}>
        <div 
          className="flex items-center gap-3 overflow-hidden cursor-pointer p-1 -ml-1 rounded hover:bg-slate-50 transition-colors flex-1"
          onClick={() => setShowRolePopup(!showRolePopup)}
        >
          <div className="w-8 h-8 flex-shrink-0 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-medium text-xs">
            {currentUser?.name?.charAt(0) || 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-slate-900 font-medium text-sm truncate">{currentUser?.name || 'User'}</p>
            <p className="text-[10px] text-slate-500 truncate">{currentUser?.role || 'Analyst'}</p>
          </div>
        </div>
        
        {showRolePopup && (
          <div className="absolute bottom-16 left-4 bg-white border border-slate-200 rounded-lg shadow-xl w-48 py-2 z-50 fade-in">
            <p className="px-4 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 mb-1">Select Role</p>
            <button 
              onClick={() => { onRoleChange('Ticket Maker'); setShowRolePopup(false); }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
            >
              <i className="fa-solid fa-ticket text-slate-400 w-4 text-center"></i> Ticket Maker
            </button>
            <button 
              onClick={() => { onRoleChange('Report Maker'); setShowRolePopup(false); }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
            >
              <i className="fa-solid fa-file-invoice text-slate-400 w-4 text-center"></i> Report Maker
            </button>
          </div>
        )}

        <button 
          onClick={onLogout}
          title="Sign Out"
          className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors flex-shrink-0"
        >
          <i className="fa-solid fa-arrow-right-from-bracket text-sm"></i>
        </button>
      </div>
    </aside>
  );
}