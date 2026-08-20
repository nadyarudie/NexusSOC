import { useState } from 'react';

export default function DashboardTenantsView({ setActiveView, tenants, setTenants }) {
  const [selectedTenant, setSelectedTenant] = useState(null);

  // Forms
  const [tenantForm, setTenantForm] = useState({ show: false, id: null, name: '' });
  const [agentForm, setAgentForm] = useState({ show: false, id: null, name: '', ip: '' });

  // Tenant actions
  const handleSaveTenant = (e) => {
    e.preventDefault();
    if (tenantForm.id) {
      const updated = tenants.map(t => t.id === tenantForm.id ? { ...t, name: tenantForm.name } : t);
      setTenants(updated);
      if (selectedTenant && selectedTenant.id === tenantForm.id) {
        setSelectedTenant({ ...selectedTenant, name: tenantForm.name });
      }
    } else {
      setTenants([...tenants, { id: Date.now(), name: tenantForm.name, agents: [] }]);
    }
    setTenantForm({ show: false, id: null, name: '' });
  };

  const handleDeleteTenant = (id, e) => {
    e.stopPropagation();
    if(confirm('Are you sure you want to delete this tenant?')) {
      setTenants(tenants.filter(t => t.id !== id));
      if (selectedTenant && selectedTenant.id === id) setSelectedTenant(null);
    }
  };

  // Agent actions
  const handleSaveAgent = (e) => {
    e.preventDefault();
    const updatedTenants = tenants.map(t => {
      if (t.id === selectedTenant.id) {
        let newAgents;
        if (agentForm.id) {
          newAgents = t.agents.map(a => a.id === agentForm.id ? { ...a, name: agentForm.name, ip: agentForm.ip } : a);
        } else {
          newAgents = [...t.agents, { id: Date.now(), name: agentForm.name, ip: agentForm.ip }];
        }
        return { ...t, agents: newAgents };
      }
      return t;
    });
    setTenants(updatedTenants);
    setSelectedTenant(updatedTenants.find(t => t.id === selectedTenant.id));
    setAgentForm({ show: false, id: null, name: '', ip: '' });
  };

  const handleDeleteAgent = (agentId) => {
    if(confirm('Are you sure you want to delete this agent?')) {
      const updatedTenants = tenants.map(t => {
        if (t.id === selectedTenant.id) {
          return { ...t, agents: t.agents.filter(a => a.id !== agentId) };
        }
        return t;
      });
      setTenants(updatedTenants);
      setSelectedTenant(updatedTenants.find(t => t.id === selectedTenant.id));
    }
  };

  return (
    <div className="max-w-7xl mx-auto block fade-in flex flex-col h-full">
      {!selectedTenant ? (
        // TENANTS LIST
        <>
          <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <button 
                  onClick={() => setActiveView && setActiveView('view-dashboard')}
                  className="text-slate-400 hover:text-slate-900 transition-colors text-sm font-medium"
                >
                  <i className="fa-solid fa-arrow-left mr-1"></i> Back to Dashboard
                </button>
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Monitored Tenants</h2>
              <p className="text-slate-500 text-sm mt-1">Manage environments and their active agents.</p>
            </div>
            <button 
              onClick={() => setTenantForm({ show: true, id: null, name: '' })}
              className="btn-primary py-2 px-4 text-sm flex items-center gap-2"
            >
              <i className="fa-solid fa-plus"></i> Add Tenant
            </button>
          </header>

          {tenantForm.show && (
            <div className="shadcn-card p-6 mb-8 fade-in bg-slate-50 border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-4">{tenantForm.id ? 'Edit Tenant' : 'New Tenant'}</h3>
              <form onSubmit={handleSaveTenant} className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tenant Name</label>
                  <input 
                    type="text" 
                    required 
                    value={tenantForm.name} 
                    onChange={e => setTenantForm({...tenantForm, name: e.target.value})}
                    className="w-full shadcn-input px-3 py-2" 
                    placeholder="e.g. Universitas Indonesia"
                  />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button type="button" onClick={() => setTenantForm({show: false, id: null, name: ''})} className="btn-secondary px-4 py-2 text-sm flex-1">Cancel</button>
                  <button type="submit" className="btn-primary px-4 py-2 text-sm flex-1">Save</button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tenants.map(tenant => (
              <div 
                key={tenant.id}
                onClick={() => setSelectedTenant(tenant)}
                className="shadcn-card p-6 cursor-pointer hover:border-slate-800 transition-colors flex flex-col justify-between group relative"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                    <i className="fa-solid fa-building-columns"></i>
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => setTenantForm({ show: true, id: tenant.id, name: tenant.name })}
                      className="w-8 h-8 rounded flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    >
                      <i className="fa-solid fa-pen text-xs"></i>
                    </button>
                    <button 
                      onClick={(e) => handleDeleteTenant(tenant.id, e)}
                      className="w-8 h-8 rounded flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors"
                    >
                      <i className="fa-solid fa-trash text-xs"></i>
                    </button>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{tenant.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{tenant.agents.length} Wazuh Agents</p>
                </div>
              </div>
            ))}
            {tenants.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
                No tenants found. Add one to get started.
              </div>
            )}
          </div>
        </>
      ) : (
        // AGENTS LIST
        <div className="flex-1 flex flex-col">
          <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <button 
                  onClick={() => setSelectedTenant(null)}
                  className="text-slate-400 hover:text-slate-900 transition-colors text-sm font-medium"
                >
                  <i className="fa-solid fa-arrow-left mr-1"></i> Back to Tenants
                </button>
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">{selectedTenant.name}</h2>
              <p className="text-slate-500 text-sm mt-1">Manage Wazuh agents for this environment.</p>
            </div>
            <button 
              onClick={() => setAgentForm({ show: true, id: null, name: '', ip: '' })}
              className="btn-primary py-2 px-4 text-sm flex items-center gap-2"
            >
              <i className="fa-solid fa-plus"></i> Add Agent
            </button>
          </header>

          {agentForm.show && (
            <div className="shadcn-card p-6 mb-8 fade-in bg-slate-50 border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-4">{agentForm.id ? 'Edit Agent' : 'New Agent'}</h3>
              <form onSubmit={handleSaveAgent} className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Agent Name</label>
                  <input 
                    type="text" 
                    required 
                    value={agentForm.name} 
                    onChange={e => setAgentForm({...agentForm, name: e.target.value})}
                    className="w-full shadcn-input px-3 py-2" 
                    placeholder="e.g. Wazuh-Agent-01"
                  />
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-xs font-medium text-slate-700 mb-1">IP Address</label>
                  <input 
                    type="text" 
                    required 
                    value={agentForm.ip} 
                    onChange={e => setAgentForm({...agentForm, ip: e.target.value})}
                    className="w-full shadcn-input px-3 py-2 font-mono text-sm" 
                    placeholder="10.0.0.1"
                  />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button type="button" onClick={() => setAgentForm({show: false, id: null, name: '', ip: ''})} className="btn-secondary px-4 py-2 text-sm flex-1">Cancel</button>
                  <button type="submit" className="btn-primary px-4 py-2 text-sm flex-1">Save</button>
                </div>
              </form>
            </div>
          )}

          <div className="shadcn-card overflow-hidden">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-3">Agent Name</th>
                  <th className="px-6 py-3">IP Address</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedTenant.agents.map(agent => (
                  <tr key={agent.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <i className="fa-solid fa-shield-halved text-slate-400 mr-2"></i>
                      {agent.name}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-500">{agent.ip}</td>
                    <td className="px-6 py-4">
                      <span className="badge bg-slate-100 text-slate-600 border border-slate-200">Online</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setAgentForm({ show: true, id: agent.id, name: agent.name, ip: agent.ip })}
                          className="w-8 h-8 rounded flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                        >
                          <i className="fa-solid fa-pen text-xs"></i>
                        </button>
                        <button 
                          onClick={() => handleDeleteAgent(agent.id)}
                          className="w-8 h-8 rounded flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors"
                        >
                          <i className="fa-solid fa-trash text-xs"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {selectedTenant.agents.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                      No agents found for this tenant.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}