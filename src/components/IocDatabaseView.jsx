import { useState, useMemo } from 'react';
import { toast } from 'sonner';

const tenants = ['Universitas Indonesia', 'Institut Teknologi Bandung', 'Universitas Gadjah Mada'];
const agents = ['Wazuh-Agent-UI-01', 'Wazuh-Agent-ITB-01', 'Wazuh-Agent-UGM-01'];
const rules = ['Multiple 400 Errors', 'Malware Detected', 'Suspicious Login'];

const generateIocs = (type, count) => {
  return Array.from({ length: count }, (_, i) => {
    let value = '';
    if (type === 'IPv4') {
      value = `192.168.1.${100 + i}`;
    }
    else if (type === 'SHA256') value = `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b85${i}`;
    else value = `http://malicious-login-${i}.com/auth`;

    const isIp = type === 'IPv4';
    
    // Generate 1 to 3 random report IDs for this IoC
    const reportsCount = i % 3 === 0 ? 2 : (i % 5 === 0 ? 3 : 1);
    const reportIds = Array.from({ length: reportsCount }, (_, r) => `#${2000 + i + (r * 10)}`);

    return {
      id: `${type.toLowerCase()}-${i+1}`,
      value,
      type,
      country: isIp ? (i % 3 === 0 ? 'Russia' : (i % 2 === 0 ? 'Indonesia' : 'United States')) : undefined,
      asn: isIp ? `AS${1000 + i}` : undefined,
      status: i % 4 === 0 ? 'Malicious' : 'Safe',
      reportId: reportIds, // Now an array
      tenant: tenants[i % tenants.length],
      agent: agents[i % agents.length],
      rule: rules[i % rules.length]
    };
  });
};

const initialData = {
  ip: generateIocs('IPv4', 25),
  hash: generateIocs('SHA256', 18),
  url: generateIocs('URL', 22)
};

export default function IocDatabaseView({ setActiveView }) {
  const [data, setData] = useState(initialData);
  const [activeType, setActiveType] = useState('ip');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTenant, setFilterTenant] = useState('');
  const [filterAgent, setFilterAgent] = useState('');
  const [filterRule, setFilterRule] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Inline Editing
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // DQL Generator State
  const [dqlMode, setDqlMode] = useState('include');
  const [generatedQuery, setGeneratedQuery] = useState('');

  // Reset page and selections when type changes
  const handleTabChange = (type) => {
    setActiveType(type);
    setCurrentPage(1);
    setSelectedIds(new Set());
    setEditingId(null);
    setGeneratedQuery('');
  };

  // Filter Data
  const filteredData = useMemo(() => {
    return data[activeType].filter(item => {
      const matchSearch = item.value.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.reportId.some(id => id.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchTenant = filterTenant === '' || item.tenant === filterTenant;
      const matchAgent = filterAgent === '' || item.agent === filterAgent;
      const matchRule = filterRule === '' || item.rule === filterRule;
      return matchSearch && matchTenant && matchAgent && matchRule;
    });
  }, [data, activeType, searchQuery, filterTenant, filterAgent, filterRule]);

  // Paginate Data
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  // Selection Logic
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allPageIds = paginatedData.map(item => item.id);
      setSelectedIds(new Set([...selectedIds, ...allPageIds]));
    } else {
      const newSelected = new Set(selectedIds);
      paginatedData.forEach(item => newSelected.delete(item.id));
      setSelectedIds(newSelected);
    }
    setGeneratedQuery('');
  };

  const handleSelectOne = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
    setGeneratedQuery('');
  };

  const isAllSelected = paginatedData.length > 0 && paginatedData.every(item => selectedIds.has(item.id));

  // Edit Logic
  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = () => {
    if (!editForm.value || editForm.value.trim() === '') {
      toast.error('Validation Error', { description: 'Value cannot be empty.' });
      return;
    }
    if (activeType === 'ip') {
      if (!editForm.country || editForm.country.trim() === '') {
        toast.error('Validation Error', { description: 'Country cannot be empty.' });
        return;
      }
      if (!editForm.asn || editForm.asn.trim() === '') {
        toast.error('Validation Error', { description: 'ASN cannot be empty.' });
        return;
      }
    }
    
    const newData = { ...data };
    const index = newData[activeType].findIndex(i => i.id === editingId);
    if (index > -1) {
      newData[activeType][index] = { ...editForm };
      setData(newData);
    }
    setEditingId(null);
    setEditForm({});
    toast.success('Saved successfully');
  };

  const deleteItem = (id) => {
    if(confirm('Are you sure you want to delete this indicator?')) {
      const newData = { ...data };
      newData[activeType] = newData[activeType].filter(i => i.id !== id);
      setData(newData);
      
      const newSelected = new Set(selectedIds);
      newSelected.delete(id);
      setSelectedIds(newSelected);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'Malicious') {
      return <span className="px-2 py-1 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wider">Malicious</span>;
    }
    return <span className="px-2 py-1 rounded text-[10px] font-bold bg-green-100 text-green-700 uppercase tracking-wider">Safe</span>;
  };

  // DQL Generator Logic
  const handleGenerateKql = () => {
    if (selectedIds.size === 0) {
      toast.error('No indicators selected', { description: 'Please select at least one indicator from the table.' });
      return;
    }
    
    const selectedItems = data[activeType].filter(item => selectedIds.has(item.id));
    const values = selectedItems.flatMap(item => 
      item.value.split(',').map(v => `"${v.trim()}"`)
    ).join(' OR ');

    let field = '';
    if (activeType === 'ip') field = 'data.srcip';
    else if (activeType === 'hash') field = 'syscheck.sha256';
    else if (activeType === 'url') field = 'data.url';

    const query = dqlMode === 'include' ? `${field}: (${values})` : `NOT ${field}: (${values})`;
    
    navigator.clipboard.writeText(query);
    setGeneratedQuery(query);
    toast.success('KQL copied to clipboard!', { description: 'The query is ready to be pasted into Wazuh.' });
  };

  const handleAddIoc = () => {
    const newId = `new-${Date.now()}`;
    const newItem = {
      id: newId,
      value: '',
      type: activeType === 'ip' ? 'IPv4' : (activeType === 'hash' ? 'SHA256' : 'URL'),
      country: '',
      asn: '',
      status: 'Safe',
      reportId: [],
      tenant: '',
      agent: '',
      rule: ''
    };
    
    const newData = { ...data };
    newData[activeType] = [newItem, ...newData[activeType]];
    setData(newData);
    
    setCurrentPage(1);
    
    setEditingId(newId);
    setEditForm({ ...newItem });
  };

  return (
    <div className="max-w-7xl mx-auto fade-in">
      <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Global IoC Database</h2>
          <p className="text-slate-500 text-sm mt-1">Central repository of extracted threat indicators.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`h-9 px-3 rounded-md border text-xs font-medium transition-colors flex items-center gap-2 ${showFilters ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <i className="fa-solid fa-filter text-[10px]"></i> Filters
            </button>
            <div className="relative w-full sm:w-64">
              <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input 
                type="text" 
                placeholder="Search indicators or reports..." 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="shadcn-input w-full pl-8 pr-3 py-2 text-sm" 
              />
            </div>
          </div>
        </div>
      </header>

      {/* FILTER BAR (Collapsible) */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-white border border-slate-200 rounded-lg shadow-sm fade-in">
          <div className="flex-1">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Rule</label>
            <select 
              value={filterRule} 
              onChange={e => { setFilterRule(e.target.value); setCurrentPage(1); }}
              className="shadcn-input px-3 py-2 text-sm w-full"
            >
              <option value="">All Rules</option>
              {rules.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Tenant</label>
            <select 
              value={filterTenant} 
              onChange={e => { setFilterTenant(e.target.value); setCurrentPage(1); }}
              className="shadcn-input px-3 py-2 text-sm w-full"
            >
              <option value="">All Tenants</option>
              {tenants.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Agent</label>
            <select 
              value={filterAgent} 
              onChange={e => { setFilterAgent(e.target.value); setCurrentPage(1); }}
              className="shadcn-input px-3 py-2 text-sm w-full"
            >
              <option value="">All Agents</option>
              {agents.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* SELECTION ACTION BAR (KQL GENERATOR) */}
      {selectedIds.size > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 fade-in">
          <div className="flex items-center gap-3 text-slate-700 text-sm pl-2">
            <i className="fa-solid fa-layer-group text-slate-400"></i>
            <span><span className="font-bold text-slate-900">{selectedIds.size}</span> indicators selected</span>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select 
              value={dqlMode}
              onChange={e => setDqlMode(e.target.value)}
              className="shadcn-input px-3 py-2 text-sm bg-white flex-1 sm:flex-none cursor-pointer"
            >
              <option value="include">Include (OR)</option>
              <option value="exclude">Exclude (NOT)</option>
            </select>
            <button 
              onClick={handleGenerateKql}
              className="bg-[#0f172a] hover:bg-[#1e293b] text-white py-2 px-4 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-sm whitespace-nowrap"
            >
              <i className="fa-solid fa-terminal text-xs"></i> Generate Wazuh KQL
            </button>
          </div>
        </div>
      )}

      {generatedQuery && (
        <div className="mb-6 fade-in relative">
          <textarea 
            readOnly 
            value={generatedQuery}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs font-mono text-slate-800 resize-none outline-none shadow-sm focus:ring-2 focus:ring-slate-200"
            rows="2"
          />
          <button 
            onClick={() => {
              navigator.clipboard.writeText(generatedQuery);
              toast.success('Copied again!');
            }}
            className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors shadow-sm"
            title="Copy to clipboard"
          >
            <i className="fa-regular fa-copy text-xs"></i>
          </button>
        </div>
      )}

      {/* TAB SWITCHER & ACTION */}
      <div className="flex justify-between items-end border-b border-slate-200 mb-6 flex-shrink-0">
        <div className="flex gap-6 overflow-x-auto">
          <button
            onClick={() => handleTabChange('ip')}
            className={`text-sm font-semibold pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeType === 'ip' 
                ? 'text-slate-900 border-slate-900' 
                : 'text-slate-500 hover:text-slate-700 border-transparent'
            }`}
          >
            <i className="fa-solid fa-network-wired text-xs"></i> IP Addresses
          </button>
          <button
            onClick={() => handleTabChange('hash')}
            className={`text-sm font-semibold pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeType === 'hash' 
                ? 'text-slate-900 border-slate-900' 
                : 'text-slate-500 hover:text-slate-700 border-transparent'
            }`}
          >
            <i className="fa-solid fa-hashtag text-xs"></i> File Hashes
          </button>
          <button
            onClick={() => handleTabChange('url')}
            className={`text-sm font-semibold pb-3 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeType === 'url' 
                ? 'text-slate-900 border-slate-900' 
                : 'text-slate-500 hover:text-slate-700 border-transparent'
            }`}
          >
            <i className="fa-solid fa-link text-xs"></i> URLs
          </button>
        </div>
        <div className="pb-2">
          <button 
            onClick={handleAddIoc} 
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-1.5 px-3 rounded-md text-xs font-semibold shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <i className="fa-solid fa-plus text-slate-400"></i> Add IoC
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 gap-6">
        {/* TABLE SECTION */}
        <div className="shadcn-card flex-1 min-h-0 flex flex-col overflow-hidden mb-8">
          <div className="overflow-auto flex-1">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 w-12">
                    <input 
                      type="checkbox" 
                      className="cursor-pointer"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3 w-48">Source</th>
                  <th className="px-4 py-3 w-28">Type</th>
                  {activeType === 'ip' && (
                    <>
                      <th className="px-4 py-3 w-40">Country</th>
                      <th className="px-4 py-3 w-28">ASN</th>
                    </>
                  )}
                  <th className="px-4 py-3 w-32">Status</th>
                  <th className="px-4 py-3 w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.map(item => {
                  const isEditing = editingId === item.id;
                  
                  return (
                    <tr key={item.id} className={`group transition-colors ${selectedIds.has(item.id) ? 'bg-slate-100/50' : 'hover:bg-slate-50'} ${isEditing ? 'bg-slate-50' : ''}`}>
                      <td className="px-4 py-4">
                        <input 
                          type="checkbox" 
                          className="cursor-pointer"
                          checked={selectedIds.has(item.id)}
                          onChange={() => handleSelectOne(item.id)}
                        />
                      </td>
                      
                      <td className="px-4 py-4 font-mono text-slate-900 truncate max-w-xs" title={isEditing ? '' : item.value}>
                        {isEditing ? (
                          <input type="text" value={editForm.value} onChange={e => setEditForm({...editForm, value: e.target.value})} className="shadcn-input px-2 py-1 w-full text-xs font-mono" />
                        ) : item.value}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2 items-center">
                          {item.reportId.map(rid => (
                            <button 
                              key={rid}
                              onClick={() => setActiveView && setActiveView('view-reports')}
                              className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium text-xs text-left"
                              title={item.rule}
                            >
                              {rid}
                            </button>
                          ))}
                        </div>
                      </td>
                      
                      <td className="px-4 py-4">
                        <span className="badge bg-slate-100 text-slate-600 border border-slate-200">{item.type}</span>
                      </td>
                      
                      {activeType === 'ip' && (
                        <>
                          <td className="px-4 py-4 font-medium text-slate-700">
                            {isEditing ? (
                              <input type="text" value={editForm.country} onChange={e => setEditForm({...editForm, country: e.target.value})} className="shadcn-input px-2 py-1 w-full text-xs" />
                            ) : item.country}
                          </td>
                          <td className="px-4 py-4 font-mono text-slate-500 text-xs">
                            {isEditing ? (
                              <input type="text" value={editForm.asn} onChange={e => setEditForm({...editForm, asn: e.target.value})} className="shadcn-input px-2 py-1 w-full text-xs" />
                            ) : item.asn}
                          </td>
                        </>
                      )}
                      
                      <td className="px-4 py-4">
                        {isEditing ? (
                          <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className="shadcn-input px-2 py-1 text-xs">
                            <option value="Safe">Safe</option>
                            <option value="Malicious">Malicious</option>
                          </select>
                        ) : getStatusBadge(item.status)}
                      </td>
                      
                      <td className="px-4 py-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={saveEdit} className="w-7 h-7 rounded flex items-center justify-center text-green-600 hover:bg-green-100 transition-colors" title="Save">
                              <i className="fa-solid fa-check text-xs"></i>
                            </button>
                            <button onClick={cancelEdit} className="w-7 h-7 rounded flex items-center justify-center text-red-600 hover:bg-red-100 transition-colors" title="Cancel">
                              <i className="fa-solid fa-xmark text-xs"></i>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEdit(item)} className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors" title="Edit inline">
                              <i className="fa-solid fa-pen text-xs"></i>
                            </button>
                            <button onClick={() => deleteItem(item.id)} className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors" title="Delete">
                              <i className="fa-solid fa-trash text-xs"></i>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={activeType === 'ip' ? 8 : 6} className="px-6 py-12 text-center text-slate-500">
                      No indicators found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* PAGINATION */}
          <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Showing {filteredData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} entries
            </span>
            <div className="flex items-center gap-1">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors"
              >
                <i className="fa-solid fa-chevron-left text-xs"></i>
              </button>
              <span className="text-xs font-medium text-slate-700 px-3">
                Page {currentPage} of {totalPages}
              </span>
              <button 
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage(p => p + 1)}
                className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors"
              >
                <i className="fa-solid fa-chevron-right text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}