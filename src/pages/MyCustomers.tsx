
import React from 'react';
import { db } from '../services/mockDb';
import { useAuth } from '../App';
import { UserRole } from '../types';

const MyCustomers: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user } = useAuth();
  
  const getAccessibleCustomers = () => {
    if (!user) return [];
    
    // 1. Base Filter: Organization Isolation
    let customers = db.getCustomers().filter(c => c.organizationId === user.organizationId);
    
    // 2. Role Based Filter
    if (user.role === UserRole.SUPER_ADMIN) return db.getCustomers(); // Super Admin sees all
    if (user.role === UserRole.ORG_ADMIN) return customers; // Org Admin sees all in Org

    // Logic: Find all user IDs that are in the subtree of the current user
    const allUsers = db.getUsers();
    const getSubordinateIds = (managerId: string): string[] => {
      const directs = allUsers.filter(u => u.parentId === managerId);
      let ids = directs.map(d => d.id);
      for (const direct of directs) {
        ids = [...ids, ...getSubordinateIds(direct.id)];
      }
      return ids;
    };

    const accessibleIds = new Set([user.id, ...getSubordinateIds(user.id)]);
    
    return customers.filter(c => accessibleIds.has(c.createdBy));
  };

  const customers = getAccessibleCustomers();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7 7-7" /></svg>
        </button>
        <h2 className="text-2xl font-bold text-slate-800">MY CUSTOMER PAGE</h2>
      </div>

      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-800 text-white text-xs uppercase tracking-wider">
              <th className="p-4 border">SI No</th>
              <th className="p-4 border">Customer Name</th>
              <th className="p-4 border">Added By</th>
              <th className="p-4 border">Annual Potential</th>
              <th className="p-4 border">Major Competitors</th>
              <th className="p-4 border">Business Share %</th>
              <th className="p-4 border">FY 26 Plan</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {customers.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-slate-400 italic">No customers found</td></tr>
            ) : (
              customers.map((c, idx) => {
                const creator = db.getUsers().find(u => u.id === c.createdBy);
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="p-4 border">{idx + 1}</td>
                    <td className="p-4 border">
                        <div className="font-bold text-slate-700">{c.name}</div>
                        <div className="text-xs text-slate-500">{c.address}</div>
                    </td>
                    <td className="p-4 border text-xs font-bold text-slate-600">
                        {creator ? `${creator.name} (${creator.role})` : 'Unknown'}
                    </td>
                    <td className="p-4 border font-semibold">{c.annualPotential} Lakhs</td>
                    <td className="p-4 border text-xs">
                      {c.competitors.filter(comp => comp.name).map(comp => `${comp.name} (${comp.share}%)`).join(', ') || '-'}
                    </td>
                    <td className="p-4 border">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-orange-500 h-full" style={{ width: `${c.tungaloyShare}%` }}></div>
                        </div>
                        <span className="font-bold">{c.tungaloyShare}%</span>
                      </div>
                    </td>
                    <td className="p-4 border text-xs italic text-slate-600">{c.fyPlan || 'No plan set'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MyCustomers;