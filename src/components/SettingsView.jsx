import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function SettingsView({ currentUser, onRoleChange, onProfileUpdate }) {
  const [activeTab, setActiveTab] = useState('profile');
  
  const [name, setName] = useState(currentUser?.name || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [role, setRole] = useState(currentUser?.role || '');
  

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [theme, setTheme] = useState(localStorage.getItem('nexus_theme') || 'light');

  useEffect(() => {
    setName(currentUser?.name || '');
    setUsername(currentUser?.username || '');
    setRole(currentUser?.role || '');
  }, [currentUser]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('nexus_theme', theme);
  }, [theme]);

  const handleSaveProfile = () => {
    const updates = {};
    if (name.trim() !== currentUser?.name) updates.name = name.trim();
    if (username.trim() !== currentUser?.username) updates.username = username.trim();
    if (role !== currentUser?.role) updates.role = role;
    
    if (Object.keys(updates).length > 0) {
      if (onProfileUpdate) onProfileUpdate(updates);
      if (updates.role && onRoleChange) onRoleChange(updates.role);
    }
    toast.success('Profile updated successfully');
  };


  const handleSavePassword = () => {
    if (!currentPassword) {
      toast.error('Current password is required');
      return;
    }
    if (!newPassword) {
      toast.error('New password is required');
      return;
    }
    
    // In a real app we'd verify the password with the server.
    // For this mock, if the current pass doesn't match local storage, we reject.
    const savedUsers = JSON.parse(localStorage.getItem('nexus_credentials') || '{}');
    const userCreds = savedUsers[currentUser?.id] || { password: '123' };
    
    if (currentPassword !== userCreds.password) {
      toast.error('Incorrect current password');
      return;
    }
    
    savedUsers[currentUser?.id] = { ...userCreds, password: newPassword };
    localStorage.setItem('nexus_credentials', JSON.stringify(savedUsers));
    
    toast.success('Password updated successfully');
    setCurrentPassword('');
    setNewPassword('');
  };

  return (
    <div className="w-full max-w-4xl mx-auto fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your account settings and preferences.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 w-full rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        <div className="flex border-b border-slate-100 dark:border-slate-800">
          <button onClick={() => setActiveTab('profile')} className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'profile' ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Profile</button>
          <button onClick={() => setActiveTab('security')} className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'security' ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Security</button>
          <button onClick={() => setActiveTab('appearance')} className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'appearance' ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Appearance</button>
        </div>

        <div className="p-6">
          {activeTab === 'profile' && (
            <div className="space-y-4 fade-in">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Display Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Username</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Role</label>
                <select 
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10"
                >
                  <option value="Ticket Maker">Ticket Maker</option>
                  <option value="Report Maker">Report Maker</option>
                  <option value="Security Analyst">Security Analyst</option>
                  <option value="Senior Analyst">Senior Analyst</option>
                </select>
              </div>
              <div className="pt-2">
                <button onClick={handleSaveProfile} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors">
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4 fade-in">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Current Password</label>
                <input 
                  type="password" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10"
                  placeholder="Enter current password"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">New Password</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10"
                  placeholder="Enter new password"
                />
              </div>
              <div className="pt-2">
                <button onClick={handleSavePassword} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors">
                  Update Password
                </button>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-4 fade-in">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Theme</label>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setTheme('light')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-blue-500 bg-blue-50 dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                >
                  <i className="fa-regular fa-sun text-2xl mb-2 text-slate-900 dark:text-white"></i>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">Light</span>
                </button>
                <button 
                  onClick={() => setTheme('dark')}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-blue-500 bg-slate-100 dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                >
                  <i className="fa-regular fa-moon text-2xl mb-2 text-slate-900 dark:text-white"></i>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">Dark</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
