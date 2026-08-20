import { useState } from 'react';

export default function EnvironmentsView() {
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [tenantSearch, setTenantSearch] = useState('');
  const [eventSearch, setEventSearch] = useState('');

  const tenants = [
    { id: 't1', name: 'Petra' },
    { id: 't2', name: 'Wicida' },
    { id: 't3', name: 'SGU' },
    { id: 't4', name: 'IKMI Cirebon' },
    { id: 't5', name: 'Pradita' },
  ];

  // Dummy data grouped by date to simulate a schedule/agenda view
  const mockSchedule = {
    't1': [
      { date: 'Today, Aug 20', events: [
        { id: 'r1', time: '10:00 AM', title: '#2072 - CMS (WordPress or Joomla) brute force attempt.', iocs: ['10.0.1.15', 'http://malicious-login.com/auth'] },
        { id: 'r2', time: '02:30 PM', title: '#2076 - Postfix_ Multiple attempts to send e-mail to invalid recipient or from unknown sender domain.', iocs: ['e3b0c44298fc1c149afbf4c8...'] }
      ]},
      { date: 'Yesterday, Aug 19', events: [
        { id: 'r3', time: '11:45 AM', title: '#2071 - Multiple common web attacks from same source ip.', iocs: ['192.168.1.100', '192.168.1.101'] }
      ]}
    ],
    't2': [
      { date: 'Today, Aug 20', events: [
        { id: 'r4', time: '09:15 AM', title: '#2069 - Multiple web server 400 error codes from same source ip (Wicida)', iocs: ['bad-domain.net', 'fake-office365-login.com'] }
      ]}
    ],
    't3': [
      { date: 'Today, Aug 20', events: [
        { id: 'r5', time: '08:00 AM', title: '#4002 - [R] Apparmor DENIED on leaning-sgu-dimas-124', iocs: ['/usr/sbin/nginx'] },
        { id: 'r6', time: '01:15 PM', title: '#4008 - CIS Ubuntu Linux 24.04 LTS Benchmark v1.0.0. & SCA on leaning-sgu-dimas-124', iocs: [] }
      ]}
    ],
    't4': [
      { date: 'Yesterday, Aug 19', events: [
        { id: 'r7', time: '03:45 PM', title: '#2056 - SQL injection attempt (IKMI)', iocs: ["' OR '1'='1", "UNION SELECT"] }
      ]}
    ],
    't5': [
      { date: 'Today, Aug 20', events: [
        { id: 'r8', time: '10:30 AM', title: '#2052 - ModSecurity_ Rejected a query (Pradita)', iocs: ['114.114.114.114'] },
        { id: 'r9', time: '11:00 AM', title: '#2054 - High amount of POST requests in a small period of time (Pradita)', iocs: ['103.22.44.55'] }
      ]}
    ]
  };

  const renderGrid = () => {
    const filteredTenants = tenants.filter(t => t.name.toLowerCase().includes(tenantSearch.toLowerCase()));

    return (
      <div className="fade-in h-full flex flex-col pb-6 block">
        <header className="mb-8 shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Tenant In Detail</h2>
            <p className="text-slate-500 text-sm mt-1">Select a monitored environment to view its reporting schedule.</p>
          </div>
          <div className="relative w-full md:w-64">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input 
              type="text" 
              placeholder="Search tenants..." 
              value={tenantSearch}
              onChange={(e) => setTenantSearch(e.target.value)}
              className="shadcn-input w-full pl-8 pr-3 py-2 text-sm bg-white"
            />
          </div>
        </header>
        
        {filteredTenants.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm border border-dashed border-slate-300 rounded-lg bg-slate-50/50">
            No tenants matching your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTenants.map(t => (
              <div 
                key={t.id} 
                onClick={() => { setSelectedTenant(t); setEventSearch(''); }}
                className="shadcn-card p-6 cursor-pointer hover:border-slate-400 group transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <i className="fa-solid fa-building"></i>
                  </div>
                </div>
                <h3 className="font-semibold text-slate-900">{t.name}</h3>
                <p className="text-xs text-slate-500 mt-1">Click to view daily reports</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderAgenda = () => {
    const rawSchedule = mockSchedule[selectedTenant.id] || [];
    const schedule = rawSchedule.map(day => ({
      ...day,
      events: day.events.filter(e => 
        e.title.toLowerCase().includes(eventSearch.toLowerCase()) || 
        e.iocs.some(ioc => ioc.toLowerCase().includes(eventSearch.toLowerCase()))
      )
    })).filter(day => day.events.length > 0);
    
    return (
      <div className="fade-in flex flex-col h-full max-w-4xl">
        <header className="mb-6 shrink-0 border-b border-slate-200 pb-4">
          <button 
            onClick={() => { setSelectedTenant(null); setSelectedReport(null); setEventSearch(''); }}
            className="text-sm font-medium text-slate-500 hover:text-slate-900 mb-4 flex items-center gap-2 transition-colors"
          >
            <i className="fa-solid fa-arrow-left"></i> Back to Tenants
          </button>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                <i className="fa-solid fa-building"></i>
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">{selectedTenant.name}</h2>
                <p className="text-slate-500 text-sm mt-0.5">Reporting Schedule</p>
              </div>
            </div>
            <div className="relative w-full sm:w-64 shrink-0">
              <i className="fa-solid fa-filter absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input 
                type="text" 
                placeholder="Filter by title or IoC..." 
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                className="shadcn-input w-full pl-8 pr-3 py-2 text-sm bg-white"
              />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto pr-2 pb-12">
          {rawSchedule.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm border border-dashed border-slate-300 rounded-lg bg-slate-50/50">
              No reports scheduled for this tenant yet.
            </div>
          ) : schedule.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm border border-dashed border-slate-300 rounded-lg bg-slate-50/50">
              No reports match your filter criteria.
            </div>
          ) : (
            <div className="space-y-8">
              {schedule.map((day, idx) => (
                <div key={idx} className="relative">
                  <h3 className="text-sm font-bold text-slate-900 mb-4 sticky top-0 bg-[#fcfcfc] py-2 z-10 border-b border-slate-100">
                    {day.date}
                  </h3>
                  <div className="space-y-2">
                    {day.events.map(event => {
                      const isExpanded = selectedReport?.id === event.id;
                      return (
                        <div 
                          key={event.id}
                          className={`rounded-lg border transition-all overflow-hidden ${
                            isExpanded ? 'border-blue-200 bg-blue-50/30 shadow-sm' : 'border-transparent hover:bg-slate-100 cursor-pointer'
                          }`}
                        >
                          <div 
                            className="flex items-start gap-4 p-3"
                            onClick={() => setSelectedReport(isExpanded ? null : event)}
                          >
                            <div className="w-20 shrink-0 text-right pt-0.5">
                              <span className={`text-xs font-medium ${isExpanded ? 'text-blue-700' : 'text-slate-500'}`}>
                                {event.time}
                              </span>
                            </div>
                            <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 bg-blue-500 relative z-0">
                            </div>
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${isExpanded ? 'text-slate-900' : 'text-slate-700'}`}>
                                {event.title}
                              </p>
                            </div>
                          </div>
                          
                          {isExpanded && (
                            <div className="pl-[104px] pr-4 pb-4">
                              <div className="bg-white border border-slate-200 rounded-md p-3 shadow-sm">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Extracted IoCs</p>
                                {event.iocs.length > 0 ? (
                                  <ul className="space-y-1">
                                    {event.iocs.map((ioc, i) => (
                                      <li key={i} className="text-sm text-slate-700 font-mono flex items-center gap-2">
                                        <i className="fa-solid fa-angle-right text-[10px] text-slate-400"></i> {ioc}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-sm text-slate-500 italic">No indicators extracted.</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full">
      {selectedTenant ? renderAgenda() : renderGrid()}
    </div>
  );
}
