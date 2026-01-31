
import React, { useState, useEffect, createContext, useContext } from 'react';
import { User, UserRole } from './types';
import Login from './pages/Login.tsx';
import Home from './pages/Home.tsx';
import AddCustomer from './pages/AddCustomer.tsx';
import MyCustomers from './pages/MyCustomers.tsx';
import MyEnquiries from './pages/MyEnquiries.tsx';
import ProjectPlanPage from './pages/ProjectPlan.tsx';
import ConversionPlanPage from './pages/ConversionPlan.tsx';
import RetentionPlanPage from './pages/RetentionPlan.tsx';
import AdminPanel from './pages/AdminPanel.tsx';
import { db } from './services/mockDb';

interface AuthContextType {
  user: User | null;
  login: (orgName: string, email: string, pass: string) => Promise<{ success: boolean, message?: string }>;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const initCloud = async () => {
        try {
            await db.init(); // Pull data from cloud/local
        } catch (e) {
            console.error("Cloud init failed", e);
        } finally {
            setIsOffline(db.isOfflineMode());
            setIsLoading(false);
        }
    };
    initCloud();
  }, []);

  const login = async (orgName: string, email: string, pass: string) => {
    const cleanEmail = email.trim();
    const cleanPass = pass.trim();

    // 1. Try Super Admin Hardcoded (Fallback/Initial)
    if ((cleanEmail === 'keerthithiruvarasan@gmail.com' || cleanEmail === 'keerthithiruvarsan@gmail.com') && cleanPass === '123456789@Asdf') {
       let superAdmin = db.getUsers().find(u => u.role === UserRole.SUPER_ADMIN);
       
       // Fallback: If not found in synced data (e.g. fresh cloud DB), create ephemeral session
       if (!superAdmin) {
           superAdmin = {
             id: 'super_admin_session',
             name: 'Super Admin',
             email: cleanEmail,
             role: UserRole.SUPER_ADMIN,
             organizationId: 'system_global',
             organizationName: 'System',
             isApproved: true
           };
       }
       
       setUser(superAdmin);
       setCurrentPage('home');
       return { success: true };
    }

    // 2. Standard Login Logic (Checks Sync Data)
    const org = db.getOrganizations().find(o => o.name.toLowerCase() === orgName.trim().toLowerCase());
    if (!org) {
      return { success: false, message: "Organization not found." };
    }
    if (!org.isApproved) {
      return { success: false, message: "Organization is pending approval by Super Admin." };
    }

    // Check against synced user list (Password hashing should be added in real prod, using plain for transition compatibility)
    const found = db.getUsers().find(u => 
      u.organizationId === org.id &&
      u.email === cleanEmail && 
      u.password === cleanPass
    );

    if (found) {
      if (!found.isApproved) {
        return { success: false, message: "Account locked or pending approval." };
      }
      setUser(found);
      setCurrentPage('home');
      return { success: true };
    }
    
    return { success: false, message: "Invalid User ID or Password for this Organization." };
  };

  const logout = () => {
    setUser(null);
    setCurrentPage('login');
    setEditingId(null);
  };

  const handleNavigate = (page: string) => {
    setEditingId(null); // Clear edit state when navigating manually
    setCurrentPage(page);
  };

  const handleEdit = (id: string, page: string) => {
    setEditingId(id);
    setCurrentPage(page);
  };

  const renderPage = () => {
    if (!user) return <Login onLogin={login} />;

    switch (currentPage) {
      case 'home': return <Home onNavigate={handleNavigate} />;
      case 'add-customer': return <AddCustomer onBack={() => handleNavigate('home')} />;
      case 'my-customers': return <MyCustomers onBack={() => handleNavigate('home')} />;
      case 'my-enquiries': return <MyEnquiries onBack={() => handleNavigate('home')} onEdit={handleEdit} />;
      case 'new-project': return <ProjectPlanPage onBack={() => handleNavigate('home')} editingId={editingId} />;
      case 'conversion': return <ConversionPlanPage onBack={() => handleNavigate('home')} editingId={editingId} />;
      case 'retention': return <RetentionPlanPage onBack={() => handleNavigate('home')} editingId={editingId} />;
      case 'admin': return <AdminPanel onBack={() => handleNavigate('home')} />;
      default: return <Home onNavigate={handleNavigate} />;
    }
  };

  if (isLoading) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
              <h2 className="text-xl font-bold text-slate-800 animate-pulse">Loading Sales Tracker...</h2>
              <p className="text-sm text-slate-500">Initializing Web Session</p>
          </div>
      )
  }

  const isAdmin = user?.role === UserRole.RSM || user?.role === UserRole.ORG_ADMIN || user?.role === UserRole.SUPER_ADMIN;

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans tracking-tight">
        {/* Offline Banner - Subtle for Web */}
        {isOffline && (
          <div className="bg-yellow-50 border-b border-yellow-100 text-yellow-800 px-4 py-1 text-[10px] font-bold text-center flex items-center justify-center gap-2">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>Running in Local Mode (Changes saved to browser storage)</span>
          </div>
        )}

        <header className="bg-white border-b sticky top-0 z-50 px-6 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => user && handleNavigate('home')}>
            <div className="w-9 h-9 bg-orange-600 rounded-lg flex items-center justify-center text-white font-black text-xl shadow-md shadow-orange-100">T</div>
            <div className="hidden md:block">
              <h1 className="font-black text-slate-800 text-base uppercase tracking-widest leading-none">Sales Tracker</h1>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Web Portal</span>
            </div>
          </div>

          {user && (
            <nav className="flex items-center gap-1 md:gap-4">
                <NavButton active={currentPage === 'home'} label="Dashboard" onClick={() => handleNavigate('home')} />
                <NavButton active={currentPage === 'my-enquiries'} label="Enquiries" onClick={() => handleNavigate('my-enquiries')} />
                <NavButton active={currentPage === 'my-customers'} label="Customers" onClick={() => handleNavigate('my-customers')} />
                {isAdmin && (
                    <NavButton active={currentPage === 'admin'} label="Admin" onClick={() => handleNavigate('admin')} />
                )}
            </nav>
          )}

          {user && (
            <div className="flex items-center gap-4">
              <div className="hidden lg:flex flex-col items-end">
                <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded-full mb-1">
                  {user.organizationName}
                </span>
                <p className="text-xs font-bold text-slate-700">{user.name}</p>
              </div>
              <button 
                onClick={logout}
                className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all text-slate-400"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
          )}
        </header>

        <main className="flex-1 overflow-auto max-w-7xl mx-auto w-full p-4 md:p-8">
          {renderPage()}
        </main>
      </div>
    </AuthContext.Provider>
  );
};

const NavButton: React.FC<{ active: boolean, label: string, onClick: () => void }> = ({ active, label, onClick }) => (
    <button 
        onClick={onClick}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
            active 
            ? 'bg-slate-800 text-white shadow-md' 
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
        }`}
    >
        {label}
    </button>
);

export default App;
