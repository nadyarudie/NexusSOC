import { useState } from 'react';
import { toast } from 'sonner';

export default function LoginView({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (username === 'nadya' && password === '123') {
      onLogin({ id: 'u1', name: 'Nadya', role: 'Senior Analyst' });
    } else if (username === 'andrew' && password === '123') {
      onLogin({ id: 'u2', name: 'Andrew', role: 'Security Analyst' });
    } else {
      toast.error('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#fcfcfc]">
      <div className="w-full max-w-sm p-8 bg-white border border-slate-200 rounded-xl shadow-lg fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center overflow-hidden mb-4 shadow-md">
            <img src="/nexus-logo.png" alt="Nexus Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Nexus SOC</h1>
          <p className="text-sm text-slate-500 mt-1">Intelligence Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Username</label>
            <input 
              type="text" 
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full shadcn-input px-3.5 py-2.5" 
              placeholder="Enter username"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full shadcn-input px-3.5 py-2.5" 
              placeholder="Enter password"
            />
          </div>
          <button type="submit" className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm mt-2">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
