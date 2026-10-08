import { useState } from 'react';

const initialShortcuts = [
  { id: 'asoc', title: "ASOC Analyst Portal", url: "https://sites.google.com/sgu.ac.id/asoc/analyst", icon: "fa-google", type: "sites", visibility: 'global' },
  { id: 'petra', title: "Petra", url: "https://drive.google.com/drive/folders/1sHGrjwHxF7n7GUHce4GMfndd-_xIhpnF?usp=drive_link", icon: "fa-google-drive", type: "drive", visibility: 'global' },
  { id: 'wicida', title: "Wicida", url: "https://drive.google.com/drive/folders/1i3W-D7ssCqnWbn6oQ8By5hFzqIcK-BgU?usp=drive_link", icon: "fa-google-drive", type: "drive", visibility: 'global' },
  { id: 'sgu', title: "SGU", url: "https://drive.google.com/drive/folders/1gLxM4VlmsheBfXVRfxHfX1XMm3f1BxT3?usp=drive_link", icon: "fa-google-drive", type: "drive", visibility: 'global' },
  { id: 'ikmi', title: "IKMI Cirebon", url: "https://drive.google.com/drive/folders/1vFUTLITDElmtlnj9SnfEHpyFBAcabPHF?usp=drive_link", icon: "fa-google-drive", type: "drive", visibility: 'global' },
  { id: 'pradita', title: "Pradita", url: "https://drive.google.com/drive/folders/1cGxZZfXncPcnX6gPLADQ0_I26iE8kWQP?usp=drive_link", icon: "fa-google-drive", type: "drive", visibility: 'global' },
];

export default function ShortcutsView({ currentUser }) {
  const [shortcuts, setShortcuts] = useState(initialShortcuts);
  const [reminders, setReminders] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    portalId: 'asoc',
    time: '',
    actionText: ''
  });

  const [addFormData, setAddFormData] = useState({
    title: '',
    url: '',
    visibility: 'private'
  });

  const handleSaveReminder = (e) => {
    e.preventDefault();
    if (!formData.time || !formData.actionText) return;
    
    const portal = shortcuts.find(s => s.id === formData.portalId);
    setReminders([...reminders, {
      id: Date.now(),
      portalTitle: portal?.title || 'Unknown Portal',
      url: portal?.url || '#',
      time: formData.time,
      actionText: formData.actionText
    }]);
    
    setFormData({ portalId: shortcuts[0]?.id || '', time: '', actionText: '' });
    setIsModalOpen(false);
  };

  const handleAddShortcut = (e) => {
    e.preventDefault();
    if (!addFormData.title || !addFormData.url) return;

    setShortcuts([...shortcuts, {
      id: Date.now().toString(),
      title: addFormData.title,
      url: addFormData.url,
      icon: "fa-link", // default icon for user added links
      type: "custom",
      visibility: addFormData.visibility,
      owner: currentUser?.id
    }]);

    setAddFormData({ title: '', url: '', visibility: 'private' });
    setIsAddModalOpen(false);
  };

  const deleteReminder = (id) => {
    setReminders(reminders.filter(r => r.id !== id));
  };

  const deleteShortcut = (id) => {
    setShortcuts(shortcuts.filter(s => s.id !== id));
  };

  // Filter shortcuts: show all global, plus private shortcuts belonging to current user
  const visibleShortcuts = shortcuts.filter(s => 
    s.visibility === 'global' || s.owner === currentUser?.id
  );

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col pb-6 fade-in-no-transform">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 fade-in">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Operations Shortcuts</h2>
          <p className="text-slate-500 text-sm mt-1">Quick access to external ASOC portals and drive folders.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsAddModalOpen(true)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-3 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center">
            <i className="fa-solid fa-plus mr-1.5"></i> Add Shortcut
          </button>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary py-1.5 px-3 text-sm whitespace-nowrap shadow-sm flex items-center">
            <i className="fa-regular fa-bell mr-1.5"></i> Set Reminder
          </button>
        </div>
      </header>

      {/* Add Shortcut Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-slate-900">Add New Shortcut</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <form onSubmit={handleAddShortcut} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g., Internal Wiki"
                  value={addFormData.title}
                  onChange={e => setAddFormData({...addFormData, title: e.target.value})}
                  className="w-full shadcn-input px-3 py-2 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">URL</label>
                <input 
                  type="url" 
                  required
                  placeholder="https://..."
                  value={addFormData.url}
                  onChange={e => setAddFormData({...addFormData, url: e.target.value})}
                  className="w-full shadcn-input px-3 py-2 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Visibility</label>
                <select 
                  value={addFormData.visibility}
                  onChange={e => setAddFormData({...addFormData, visibility: e.target.value})}
                  className="w-full shadcn-input px-3 py-2 text-sm"
                >
                  <option value="private">Private (Only me)</option>
                  <option value="global">Global (Everyone)</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" className="bg-slate-900 hover:bg-black text-white px-5 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm">
                  Save Shortcut
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reminder Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-slate-900">Set Portal Reminder</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <form onSubmit={handleSaveReminder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Target Portal</label>
                <select 
                  value={formData.portalId}
                  onChange={e => setFormData({...formData, portalId: e.target.value})}
                  className="w-full shadcn-input px-3 py-2 text-sm"
                >
                  {visibleShortcuts.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Reminder Time</label>
                <input 
                  type="datetime-local" 
                  required
                  value={formData.time}
                  onChange={e => setFormData({...formData, time: e.target.value})}
                  className="w-full shadcn-input px-3 py-2 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Action / Notes</label>
                <textarea 
                  required
                  placeholder="e.g., Check latest SOC report uploads..."
                  value={formData.actionText}
                  onChange={e => setFormData({...formData, actionText: e.target.value})}
                  className="w-full shadcn-input px-3 py-2 min-h-[100px] resize-y text-sm"
                ></textarea>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" className="btn-primary py-2 px-5">
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 fade-in">
        {visibleShortcuts.map((link) => (
          <div 
            key={link.id} 
            className="shadcn-card p-6 flex items-center gap-4 group hover:border-slate-300 transition-colors shadow-sm relative overflow-hidden cursor-pointer"
            onClick={() => window.open(link.url, '_blank')}
          >
            {link.visibility === 'private' && (
              <div className="absolute top-0 left-0 bg-slate-100 text-slate-500 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-br-lg z-10">
                Private
              </div>
            )}
            
            <button 
              onClick={(e) => { e.stopPropagation(); deleteShortcut(link.id); }}
              className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all z-10"
              title="Delete Shortcut"
            >
              <i className="fa-solid fa-trash-can text-xs"></i>
            </button>

            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${link.type === 'sites' ? 'bg-blue-50 text-blue-600' : link.type === 'drive' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-700'}`}>
              <i className={`${link.type === 'custom' ? 'fa-solid' : 'fa-brands'} ${link.icon} text-xl group-hover:scale-110 transition-transform`}></i>
            </div>
            <div className="overflow-hidden flex-1 pr-4">
              <h3 className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">{link.title}</h3>
              <p className="text-xs text-slate-500 truncate mt-0.5">{link.url}</p>
            </div>
          </div>
        ))}
      </div>

      {reminders.length > 0 && (
        <div className="mt-auto">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 border-b border-slate-200 pb-2">
            <i className="fa-regular fa-bell mr-2 text-slate-400"></i>
            Active Reminders
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {reminders.sort((a, b) => new Date(a.time) - new Date(b.time)).map(r => (
              <div key={r.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-4 relative group">
                <div className="text-yellow-600 pt-1 shrink-0">
                  <i className="fa-regular fa-clock text-lg"></i>
                </div>
                <div className="flex-1 pr-8">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-yellow-900">{r.portalTitle}</span>
                    <span className="text-xs font-medium text-yellow-700 bg-yellow-200/50 px-2 py-0.5 rounded-full">
                      {new Date(r.time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  <p className="text-sm text-yellow-800 leading-relaxed">{r.actionText}</p>
                </div>
                <button 
                  onClick={() => deleteReminder(r.id)}
                  className="absolute top-4 right-4 text-yellow-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Dismiss Reminder"
                >
                  <i className="fa-solid fa-check"></i>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
