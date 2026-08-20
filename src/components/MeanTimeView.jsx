import { useState, useEffect } from 'react';

export default function MeanTimeView() {
  const generateDummyCases = () => {
    const cases = [];
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // Generate some dummy closed cases across the current month
    for(let i = 1; i <= 28; i++) {
      const numCases = Math.floor(Math.random() * 5); // 0 to 4 cases per day
      for(let j=0; j<numCases; j++) {
        const detectedAt = new Date(year, month, i, 10, 0, 0).getTime();
        const startedAt = detectedAt + Math.random() * 3600000; // 0-1 hr later
        const closedAt = startedAt + Math.random() * 14400000; // 0-4 hr later
        cases.push({
          id: `dummy_${i}_${j}`,
          wazuh: `WZ-${1000 + i*10 + j}`,
          iris: `IR-${400 + i*5 + j}`,
          detectedAt,
          startedAt,
          closedAt,
          status: 'closed'
        });
      }
    }
    return cases;
  };

  const [cases, setCases] = useState(generateDummyCases);
  const [wazuhId, setWazuhId] = useState('');
  const [irisId, setIrisId] = useState('');
  const [detectedAt, setDetectedAt] = useState('');
  const [now, setNow] = useState(() => Date.now());

  // Month/Year Filter state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (ms) => {
    if (ms < 0) return '0s';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const handleStartTracking = (e) => {
    e.preventDefault();
    if (!wazuhId || !irisId || !detectedAt) return;

    const detectedTime = new Date(detectedAt).getTime();
    const newCase = {
      id: 'case_' + Math.random().toString(36).substring(2, 9),
      wazuh: wazuhId,
      iris: irisId,
      detectedAt: detectedTime,
      startedAt: Date.now(),
      closedAt: null,
      status: 'active',
    };

    setCases([newCase, ...cases]);
    setWazuhId('');
    setIrisId('');
    setDetectedAt('');
  };

  const handleCloseCase = (id) => {
    setCases(cases.map((c) => (c.id === id ? { ...c, status: 'closed', closedAt: Date.now() } : c)));
  };

  const closedCases = cases.filter((c) => c.status === 'closed');
  const mttdSum = closedCases.reduce((acc, c) => acc + (c.startedAt - c.detectedAt), 0);
  const mttrSum = closedCases.reduce((acc, c) => acc + (c.closedAt - c.detectedAt), 0);

  const avgMttd = closedCases.length > 0 ? mttdSum / closedCases.length : 0;
  const avgMttr = closedCases.length > 0 ? mttrSum / closedCases.length : 0;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  
  const todayCases = cases.filter(c => c.detectedAt >= todayStart.getTime() && c.detectedAt <= todayEnd.getTime());

  const handleDownloadCsv = () => {
    const headers = ['Wazuh ID', 'Iris ID', 'Detection Time', 'Status', 'MTTR (ms)'];
    const rows = todayCases.map(c => [
      c.wazuh,
      c.iris,
      new Date(c.detectedAt).toLocaleString(),
      c.status,
      c.status === 'closed' ? (c.closedAt - c.detectedAt) : ''
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `incidents_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto block fade-in">
      <header className="mb-8">
        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Mean Time Metrics</h2>
        <p className="text-slate-500 text-sm mt-1">Track Mean Time to Detect (MTTD) and Respond (MTTR).</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="shadcn-card p-6 flex flex-col">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-900">Log New Incident</h3>
            <p className="text-xs text-slate-500">Initiate response timer manually.</p>
          </div>
          <form onSubmit={handleStartTracking} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Wazuh ID</label>
              <input type="text" value={wazuhId} onChange={(e) => setWazuhId(e.target.value)} required placeholder="e.g., WZ-9921" className="w-full shadcn-input px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Iris ID</label>
              <input type="text" value={irisId} onChange={(e) => setIrisId(e.target.value)} required placeholder="e.g., IR-401" className="w-full shadcn-input px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Manual Detection Time</label>
              <input type="datetime-local" value={detectedAt} onChange={(e) => setDetectedAt(e.target.value)} required className="w-full shadcn-input px-3 py-2" />
            </div>
            <button type="submit" className="btn-primary w-full py-2.5 mt-2">Start Tracking</button>
          </form>
        </div>

        <div className="shadcn-card p-6 flex flex-col bg-slate-900 text-white border-transparent">
          <div className="flex flex-col items-center justify-center text-center mb-6">
            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <i className="fa-solid fa-search text-slate-300 text-lg"></i>
            </div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Average MTTD (Month)</span>
            <div className="mt-3 text-4xl font-bold tracking-tight">{closedCases.length > 0 ? formatDuration(avgMttd) : '--'}</div>
            <p className="text-xs text-slate-500 mt-2">Mean Time to Detect</p>
          </div>
          
          <div className="mt-auto border-t border-slate-800 pt-4">
            <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Past Months</h4>
            <ul className="space-y-2">
              <li className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Jul 2026</span>
                <span className="font-mono text-slate-300">0h 42m 15s</span>
              </li>
              <li className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Jun 2026</span>
                <span className="font-mono text-slate-300">0h 48m 30s</span>
              </li>
              <li className="flex justify-between items-center text-sm">
                <span className="text-slate-400">May 2026</span>
                <span className="font-mono text-slate-300">0h 55m 00s</span>
              </li>
              <li className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Apr 2026</span>
                <span className="font-mono text-slate-300">1h 05m 12s</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="shadcn-card p-6 flex flex-col bg-blue-50 border-blue-100">
          <div className="flex flex-col items-center justify-center text-center mb-6">
            <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center mb-4">
              <i className="fa-solid fa-stopwatch text-blue-700 text-lg"></i>
            </div>
            <span className="text-xs font-medium text-blue-800 uppercase tracking-wide">Average MTTR (Month)</span>
            <div className="mt-3 text-4xl font-bold tracking-tight text-blue-950">{closedCases.length > 0 ? formatDuration(avgMttr) : '--'}</div>
            <p className="text-xs text-blue-600/70 mt-2">Mean Time to Respond</p>
          </div>

          <div className="mt-auto border-t border-blue-200 pt-4">
            <h4 className="text-[10px] font-semibold text-blue-800/60 uppercase tracking-wider mb-3">Past Months</h4>
            <ul className="space-y-2">
              <li className="flex justify-between items-center text-sm">
                <span className="text-blue-900/70">Jul 2026</span>
                <span className="font-mono text-blue-900 font-medium">1h 10m 05s</span>
              </li>
              <li className="flex justify-between items-center text-sm">
                <span className="text-blue-900/70">Jun 2026</span>
                <span className="font-mono text-blue-900 font-medium">1h 22m 15s</span>
              </li>
              <li className="flex justify-between items-center text-sm">
                <span className="text-blue-900/70">May 2026</span>
                <span className="font-mono text-blue-900 font-medium">1h 45m 30s</span>
              </li>
              <li className="flex justify-between items-center text-sm">
                <span className="text-blue-900/70">Apr 2026</span>
                <span className="font-mono text-blue-900 font-medium">2h 10m 00s</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="shadcn-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Incident Tracking Queue (Today)</h3>
          <button onClick={handleDownloadCsv} className="flex items-center gap-2 text-xs font-medium bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded transition-colors shadow-sm">
            <i className="fa-solid fa-download text-slate-400"></i> Download CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-white border-b border-slate-100 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-3">IDs (Wazuh / Iris)</th>
                <th className="px-6 py-3">Detection Time</th>
                <th className="px-6 py-3">Elapsed MTTR</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {todayCases.map((c) => {
                const isClosed = c.status === 'closed';
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{c.wazuh}</div>
                      <div className="text-[10px] text-slate-500">{c.iris}</div>
                    </td>
                    <td className="px-6 py-4 text-xs">{new Date(c.detectedAt).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      {isClosed ? (
                        <span className="font-medium text-slate-800">{formatDuration(c.closedAt - c.detectedAt)}</span>
                      ) : (
                        <span className="font-mono font-medium text-red-600">{formatDuration(now - c.detectedAt)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isClosed ? (
                        <span className="badge bg-slate-100 text-slate-600">Closed</span>
                      ) : (
                        <span className="badge bg-red-100 text-red-700 border border-red-200">Active</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isClosed ? (
                        <span className="text-xs text-slate-400"><i className="fa-solid fa-check mr-1"></i>Resolved</span>
                      ) : (
                        <button onClick={() => handleCloseCase(c.id)} className="text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded transition-colors">
                          Close Timer
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {todayCases.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-sm">
              No incidents tracked today.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}