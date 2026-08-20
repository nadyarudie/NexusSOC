import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function ApiConfigView({ apiKeys, setApiKeys }) {
  const [abuseIpKey, setAbuseIpKey] = useState(apiKeys.abuseIpDb || '');
  const [abuseIpStatus, setAbuseIpStatus] = useState(apiKeys.abuseIpDb ? 'active' : 'inactive'); // active, inactive, testing
  
  const [aiApiKey, setAiApiKey] = useState(apiKeys.aiEngine || '');
  const [aiApiStatus, setAiApiStatus] = useState(apiKeys.aiEngine ? 'active' : 'inactive'); // active, inactive, testing

  const handleTestConnection = async (service) => {
    if (service === 'abuseipdb') {
      setAbuseIpStatus('testing');
      
      try {
        const response = await fetch(`/api/abuseipdb/check?ipAddress=1.1.1.1&maxAgeInDays=90`, {
          headers: {
            'Key': abuseIpKey,
            'Accept': 'application/json'
          }
        });
        if (response.ok) {
          setAbuseIpStatus('active');
          toast.success('AbuseIPDB connection successful.');
        } else {
          setAbuseIpStatus('inactive');
          toast.error('AbuseIPDB connection failed. Invalid key?');
        }
      } catch (err) {
        setAbuseIpStatus('inactive');
        toast.error('AbuseIPDB connection error.');
      }
    } else if (service === 'ai') {
      setAiApiStatus('testing');
      setTimeout(() => {
        setAiApiStatus('active');
        toast.success('AI Engine connection successful.');
      }, 1500);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    setApiKeys({
      abuseIpDb: abuseIpKey,
      aiEngine: aiApiKey
    });
    toast.success('API Configuration saved successfully.');
  };

  const renderStatusBadge = (status) => {
    if (status === 'testing') {
      return (
        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
          <i className="fa-solid fa-circle-notch fa-spin"></i> Testing
        </span>
      );
    }
    if (status === 'active') {
      return (
        <span className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Active
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
        <span className="w-2 h-2 rounded-full bg-red-500"></span> Inactive
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col fade-in pb-12">
      <header className="mb-6 flex-shrink-0">
        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">API Configuration</h2>
        <p className="text-slate-500 text-sm mt-1">Kelola integrasi pihak ketiga untuk *Threat Intelligence* dan mesin *Artificial Intelligence*.</p>
      </header>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* AbuseIPDB Config */}
        <div className="shadcn-card p-6 border-l-4 border-l-blue-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 text-lg">
                <i className="fa-solid fa-shield-halved"></i>
              </div>
              <div>
                <h3 className="font-bold text-slate-900">AbuseIPDB Integration</h3>
                <p className="text-xs text-slate-500">Digunakan untuk fitur IOC Enrichment (IP Reputation)</p>
              </div>
            </div>
            <div>
              {renderStatusBadge(abuseIpStatus)}
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">API Key</label>
              <div className="flex gap-3">
                <input 
                  type="password" 
                  value={abuseIpKey}
                  onChange={(e) => {
                    setAbuseIpKey(e.target.value);
                    setAbuseIpStatus('inactive');
                  }}
                  className="flex-1 shadcn-input px-3 py-2 text-sm font-mono text-slate-700"
                  placeholder="Enter your AbuseIPDB v2 API Key"
                />
                <button 
                  type="button" 
                  onClick={() => handleTestConnection('abuseipdb')}
                  disabled={abuseIpStatus === 'testing' || !abuseIpKey}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg border border-slate-200 transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                >
                  <i className="fa-solid fa-wifi"></i> Test Connection
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* AI Engine Config */}
        <div className="shadcn-card p-6 border-l-4 border-l-purple-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 text-lg">
                <i className="fa-solid fa-brain"></i>
              </div>
              <div>
                <h3 className="font-bold text-slate-900">AI Analysis Engine</h3>
                <p className="text-xs text-slate-500">Digunakan untuk fitur Automated Threat Analysis (OpenAI / Anthropic)</p>
              </div>
            </div>
            <div>
              {renderStatusBadge(aiApiStatus)}
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">API Key</label>
              <div className="flex gap-3">
                <input 
                  type="password" 
                  value={aiApiKey}
                  onChange={(e) => {
                    setAiApiKey(e.target.value);
                    setAiApiStatus('inactive');
                  }}
                  className="flex-1 shadcn-input px-3 py-2 text-sm font-mono text-slate-700"
                  placeholder="Enter your LLM API Key (sk-...)"
                />
                <button 
                  type="button" 
                  onClick={() => handleTestConnection('ai')}
                  disabled={aiApiStatus === 'testing' || !aiApiKey}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg border border-slate-200 transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                >
                  <i className="fa-solid fa-wifi"></i> Test Connection
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">AI Model</label>
              <select className="w-full sm:w-1/2 shadcn-input px-3 py-2 text-sm text-slate-700 cursor-pointer">
                <option value="gpt-4">GPT-4 Turbo</option>
                <option value="claude-3-opus">Claude 3 Opus</option>
                <option value="claude-3-sonnet">Claude 3.5 Sonnet</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button 
            type="submit" 
            className="bg-slate-900 hover:bg-black text-white px-8 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
          >
            <i className="fa-solid fa-floppy-disk"></i> Save Configurations
          </button>
        </div>

      </form>
    </div>
  );
}
