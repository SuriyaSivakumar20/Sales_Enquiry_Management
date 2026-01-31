
import React from 'react';
import { useAuth } from '../App';
import { UserRole } from '../types';

interface HomeProps {
  onNavigate: (page: string) => void;
}

const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { user } = useAuth();

  const tabs = [
    { id: 'new-project', label: 'New Project Plan', color: 'bg-orange-500' },
    { id: 'conversion', label: 'Conversion Plan', color: 'bg-orange-500' },
    { id: 'retention', label: 'Retention Plan', color: 'bg-orange-500' },
    { id: 'add-customer', label: 'Add Customer', color: 'bg-orange-500' },
    { id: 'my-customers', label: 'My Customers', color: 'bg-orange-500' },
    { id: 'my-enquiries', label: 'My Enquiries', color: 'bg-orange-500' },
  ];

  const showAdmin = user?.role === UserRole.RSM || user?.role === UserRole.ORG_ADMIN || user?.role === UserRole.SUPER_ADMIN;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">DASHBOARD</h2>
        <p className="text-slate-500 font-medium">Select an action to continue</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            className={`${tab.color} text-white font-bold p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center text-xl text-center min-h-[140px] uppercase`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {showAdmin && (
        <div className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-blue-800">Administrator Panel</h3>
            <p className="text-blue-600">
               {user?.role === UserRole.SUPER_ADMIN ? 'Approve Organizations.' : 'Manage Users and Hierarchy.'}
            </p>
          </div>
          <button 
            onClick={() => onNavigate('admin')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow transition-colors"
          >
            Open Admin Panel
          </button>
        </div>
      )}
    </div>
  );
};

export default Home;
