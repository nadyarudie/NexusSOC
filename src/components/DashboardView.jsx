import { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import confetti from 'canvas-confetti';

export default function DashboardView({ setActiveView, currentUser }) {
  const trendRef = useRef(null);
  const orgRef = useRef(null);
  
  const [distributionType, setDistributionType] = useState('tenant');
  const [isBlinking, setIsBlinking] = useState(false);
  const reportsCount = 1500; // Updated to be a multiple of 50

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const milestoneKey = `milestone_reports_${today}`;

    if (reportsCount % 50 === 0 && !localStorage.getItem(milestoneKey)) {
      setIsBlinking(true);
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
      localStorage.setItem(milestoneKey, 'true');

      // Stop blinking after 5 seconds
      setTimeout(() => {
        setIsBlinking(false);
      }, 5000);
    }
  }, [reportsCount]);

  // Effect for Trend Chart
  useEffect(() => {
    let trendChartInstance = null;
    const isDark = document.documentElement.classList.contains('dark');
    const mainColor = isDark ? '#f8fafc' : '#0f172a';
    const bgFill = isDark ? 'rgba(248, 250, 252, 0.1)' : 'rgba(15, 23, 42, 0.05)';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDark ? '#cbd5e1' : '#64748b';

    if (trendRef.current) {
      trendChartInstance = new Chart(trendRef.current, {
        type: 'line',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{
            label: 'Events',
            data: [65, 59, 80, 81, 56, 55, 40],
            borderColor: mainColor,
            tension: 0.4,
            fill: true,
            backgroundColor: bgFill
          }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false, 
          plugins: { legend: { display: false } },
          scales: {
            x: {
              grid: { color: gridColor },
              ticks: { color: textColor }
            },
            y: {
              grid: { color: gridColor },
              ticks: { color: textColor }
            }
          }
        }
      });
    }

    return () => {
      if (trendChartInstance) trendChartInstance.destroy();
    };
  }, []);

  // Effect for Distribution Chart (re-runs when distributionType changes)
  useEffect(() => {
    let orgChartInstance = null;
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#f8fafc' : '#64748b';
    const borderColor = isDark ? '#1e293b' : '#ffffff';
    
    let chartLabels, chartData, chartColors;
    
    if (distributionType === 'tenant') {
       chartLabels = ['UI', 'ITB', 'UGM', 'IPB', 'UNAIR'];
       chartData = [300, 150, 200, 120, 80];
       chartColors = isDark ? ['#f8fafc', '#cbd5e1', '#94a3b8', '#64748b', '#475569'] : ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8'];
    } else if (distributionType === 'agent') {
       chartLabels = ['Agent-UI-01', 'Agent-UI-02', 'Agent-ITB-01', 'Agent-UGM-01', 'Others'];
       chartData = [150, 150, 150, 100, 300];
       chartColors = isDark ? ['#f8fafc', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b'] : ['#0f172a', '#1e293b', '#334155', '#475569', '#cbd5e1'];
    } else if (distributionType === 'rule') {
       chartLabels = ['Failed Login', 'Malware', 'Phishing', 'DDoS', 'Policy Violation'];
       chartData = [400, 150, 120, 80, 100];
       chartColors = isDark ? ['#f8fafc', '#cbd5e1', '#94a3b8', '#64748b', '#475569'] : ['#0f172a', '#475569', '#64748b', '#94a3b8', '#e2e8f0'];
    }

    if (orgRef.current) {
      orgChartInstance = new Chart(orgRef.current, {
        type: 'doughnut',
        data: {
          labels: chartLabels,
          datasets: [{
            data: chartData,
            backgroundColor: chartColors,
            borderWidth: 2,
            borderColor: borderColor
          }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false, 
          cutout: '75%',
          plugins: {
            legend: {
              position: 'right',
              labels: { boxWidth: 10, font: { size: 10 }, color: textColor }
            }
          }
        }
      });
    }

    return () => {
      if (orgChartInstance) orgChartInstance.destroy();
    };
  }, [distributionType]);

  return (
    <div className="max-w-7xl mx-auto flex flex-col h-full fade-in">
      <header className="mb-6 flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Hi, {currentUser?.name || 'User'} !</h2>
          <p className="text-slate-500 text-sm mt-1">Aggregated threat telemetry across monitored environments.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 flex-shrink-0">
        <div 
          onClick={() => setActiveView && setActiveView('view-dashboard-tenants')}
          className="shadcn-card p-6 flex flex-col justify-between cursor-pointer hover:border-slate-800 hover:ring-1 hover:ring-slate-800 transition-all group"
        >
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-slate-500 group-hover:text-slate-900 transition-colors">Monitored Tenants</span>
            <i className="fa-solid fa-server text-slate-400 group-hover:text-slate-900 transition-colors"></i>
          </div>
          <div className="mt-4">
            <p className="text-4xl font-semibold text-slate-900 tracking-tight">5</p>
            <p className="text-[11px] text-slate-400 mt-2 font-medium uppercase tracking-wide group-hover:text-slate-600 transition-colors">Active Nodes (Click to manage)</p>
          </div>
        </div>
        <div 
          onClick={() => setActiveView && setActiveView('view-reports')}
          className={`shadcn-card p-6 flex flex-col justify-between cursor-pointer hover:border-slate-800 hover:ring-1 hover:ring-slate-800 transition-all group ${
            isBlinking ? 'animate-pulse bg-yellow-50 border-yellow-200' : ''
          }`}
        >
          <div className="flex justify-between items-start">
            <span className={`text-sm font-medium transition-colors ${isBlinking ? 'text-yellow-700' : 'text-slate-500 group-hover:text-slate-900'}`}>Analyzed Reports</span>
            <i className={`fa-solid fa-file-shield transition-colors ${isBlinking ? 'text-yellow-500' : 'text-slate-400 group-hover:text-slate-900'}`}></i>
          </div>
          <div className="mt-4">
            <p className={`text-4xl font-semibold tracking-tight ${isBlinking ? 'text-yellow-800' : 'text-slate-900'}`}>
              {reportsCount.toLocaleString()}
            </p>
            <p className={`text-[11px] mt-2 font-medium uppercase tracking-wide transition-colors ${isBlinking ? 'text-yellow-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
              Logs Processed (Click to view)
            </p>
          </div>
        </div>
        <div className="shadcn-card p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-slate-500">Unique Indicators</span>
            <i className="fa-solid fa-crosshairs text-slate-400"></i>
          </div>
          <div className="mt-4">
            <p className="text-4xl font-semibold text-slate-900 tracking-tight">349</p>
            <p className="text-[11px] text-slate-400 mt-2 font-medium uppercase tracking-wide">Extracted Entities</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="shadcn-card p-6 lg:col-span-2 flex flex-col">
          <div className="mb-4 flex-shrink-0">
            <h3 className="text-base font-semibold text-slate-900">Ingestion Velocity</h3>
            <p className="text-xs text-slate-500">7-Day Trend Analysis</p>
          </div>
          <div className="relative w-full h-[250px] lg:h-full lg:flex-1">
            <canvas ref={trendRef}></canvas>
          </div>
        </div>
        <div className="shadcn-card p-6 flex flex-col">
          <div className="mb-4 flex items-start justify-between flex-shrink-0">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Distribution</h3>
              <p className="text-xs text-slate-500">Events by {distributionType}</p>
            </div>
            <select 
              value={distributionType}
              onChange={(e) => setDistributionType(e.target.value)}
              className="text-xs border border-slate-200 rounded px-2 py-1 bg-slate-50 text-slate-700 outline-none focus:border-slate-400 cursor-pointer"
            >
              <option value="tenant">By Tenant</option>
              <option value="agent">By Agent</option>
              <option value="rule">By Rule</option>
            </select>
          </div>
          <div className="relative w-full h-[250px] lg:h-full lg:flex-1">
            <canvas ref={orgRef}></canvas>
          </div>
        </div>
      </div>
    </div>
  );
}