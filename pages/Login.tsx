import React, { useState } from 'react';
import { db } from '../services/mockDb';
import { UserRole } from '../types';

interface LoginProps {
  onLogin: (orgName: string, email: string, pass: string) => Promise<{ success: boolean, message?: string }>;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Login State
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Registration State
  const [regOrgName, setRegOrgName] = useState('');
  const [regAdminName, setRegAdminName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      const result = await onLogin(orgName, email, password);
      if (!result.success) {
        setError(result.message || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
        const existingOrgs = db.getOrganizations();
        if (existingOrgs.some(o => o.name.toLowerCase() === regOrgName.trim().toLowerCase())) {
            setError("Organization name already registered.");
            setLoading(false);
            return;
        }

        const orgId = 'org_' + Math.random().toString(36).substr(2, 9);
        await db.addOrganization({
            id: orgId,
            name: regOrgName.trim(),
            adminEmail: regEmail.trim(),
            isApproved: false,
            createdAt: new Date().toISOString()
        });

        await db.addUser({
            id: 'user_' + Math.random().toString(36).substr(2, 9),
            email: regEmail.trim(),
            name: regAdminName.trim(),
            password: regPassword.trim(),
            role: UserRole.ORG_ADMIN,
            organizationId: orgId,
            organizationName: regOrgName.trim(),
            isApproved: true
        });

        setSuccess("Registration successful! Please wait for Super Admin approval.");
        setIsRegistering(false);
        setOrgName(regOrgName);
        setEmail(regEmail);
        setRegOrgName('');
        setRegAdminName('');
        setRegEmail('');
        setRegPassword('');
    } catch (e: any) {
        setError("Registration failed: " + e.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 relative">
      
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
           <h2 className="text-3xl font-black text-slate-800 tracking-tight">Sales Tracker</h2>
           <p className="text-sm text-slate-400">Enquiry Management System</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center font-bold animate-pulse">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm text-center font-bold">
            {success}
          </div>
        )}

        {/* Toggle Switches */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
                onClick={() => { setIsRegistering(false); setError(''); }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isRegistering ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
            >
                Login
            </button>
            <button 
                onClick={() => { setIsRegistering(true); setError(''); }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isRegistering ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
            >
                Register Org
            </button>
        </div>

        {!isRegistering ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4 animate-in fade-in slide-in-from-left-4">
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Organization Name</label>
                <input 
                type="text" 
                className="w-full border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-orange-500 transition-colors font-bold text-slate-700"
                placeholder="e.g. Acme Corp (Optional for Super Admin)"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                />
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Email ID</label>
                <input 
                required
                type="email" 
                className="w-full border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-orange-500 transition-colors"
                placeholder="name@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                />
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
                <input 
                required
                type="password" 
                className="w-full border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-orange-500 transition-colors"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                />
            </div>

            <button 
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {loading ? 'Verifying...' : 'Login securely'}
            </button>
            
            <div className="text-center pt-2">
                <p className="text-xs text-slate-400">
                Staff Members: Contact your Admin for credentials.
                </p>
            </div>
            </form>
        ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">New Organization Name</label>
                    <input 
                        required
                        type="text" 
                        className="w-full border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors font-bold text-slate-700"
                        placeholder="e.g. Global Tech"
                        value={regOrgName}
                        onChange={e => setRegOrgName(e.target.value)}
                    />
                </div>
                
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Admin Name</label>
                    <input 
                        required
                        type="text" 
                        className="w-full border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors"
                        placeholder="John Doe"
                        value={regAdminName}
                        onChange={e => setRegAdminName(e.target.value)}
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Admin Email</label>
                    <input 
                        required
                        type="email" 
                        className="w-full border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors"
                        placeholder="admin@globaltech.com"
                        value={regEmail}
                        onChange={e => setRegEmail(e.target.value)}
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Set Password</label>
                    <input 
                        required
                        type="password" 
                        className="w-full border-2 border-slate-200 rounded-xl p-3 outline-none focus:border-blue-500 transition-colors"
                        placeholder="Create a strong password"
                        value={regPassword}
                        onChange={e => setRegPassword(e.target.value)}
                    />
                </div>

                <button 
                    disabled={loading}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? 'Creating Account...' : 'Register Organization'}
                </button>
            </form>
        )}
      </div>
    </div>
  );
};

export default Login;