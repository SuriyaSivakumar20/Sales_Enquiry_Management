
import React, { useState, useEffect } from 'react';
import { db } from '../services/mockDb';
import { User, UserRole } from '../types';
import { useAuth } from '../App';

const AdminPanel: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user } = useAuth();
  
  // Super Admin Logic: Use state to trigger re-renders on updates
  const [organizations, setOrganizations] = useState(db.getOrganizations());
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'users'>('hierarchy');

  // Refresh data when component mounts
  useEffect(() => {
    setOrganizations(db.getOrganizations());
  }, []);
  
  const handleApproveOrg = (id: string) => {
    db.updateOrganization(id, { isApproved: true });
    setOrganizations(db.getOrganizations());
  };

  // Org Admin Logic
  const allUsers = db.getUsers().filter(u => u.organizationId === user?.organizationId);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: UserRole.RSM,
    parentId: ''
  });

  // Editing state
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const getPotentialParents = (role: UserRole) => {
    if (role === UserRole.SALES_ENG) return allUsers.filter(u => u.role === UserRole.RSM);
    if (role === UserRole.DEALER) return allUsers.filter(u => u.role === UserRole.SALES_ENG);
    if (role === UserRole.DSE) return allUsers.filter(u => u.role === UserRole.DEALER);
    return [];
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.role !== UserRole.ORG_ADMIN) return;
    
    // Validate hierarchy
    if (newUser.role !== UserRole.RSM && !newUser.parentId) {
      alert(`Parent assignment required for ${newUser.role}`);
      return;
    }

    db.addUser({
      id: Math.random().toString(36).substr(2, 9),
      email: newUser.email,
      password: newUser.password,
      name: newUser.name,
      role: newUser.role,
      organizationId: user.organizationId,
      organizationName: user.organizationName,
      parentId: newUser.parentId,
      isApproved: true
    });

    alert(`${newUser.role} Created Successfully!`);
    setNewUser({ name: '', email: '', password: '', role: UserRole.RSM, parentId: '' });
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    db.updateUser(editingUser.id, {
        email: editingUser.email,
        password: editingUser.password,
        parentId: editingUser.parentId
    });
    alert("User details updated successfully");
    setEditingUser(null);
  };

  // --- SUPER ADMIN VIEW ---
  if (user?.role === UserRole.SUPER_ADMIN) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
           <button onClick={onBack} className="p-3 hover:bg-slate-200 rounded-2xl bg-white shadow-sm border"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7 7-7" /></svg></button>
           <h2 className="text-3xl font-black text-slate-800">Super Admin Dashboard</h2>
        </div>

        <div className="space-y-4">
           <h3 className="text-xl font-bold text-slate-700">Manage Organizations</h3>
           {organizations.length === 0 ? (
             <p className="text-slate-400">No organizations found.</p>
           ) : (
             organizations.map(org => (
               <div key={org.id} className="bg-white p-6 rounded-2xl shadow-lg border flex justify-between items-center transition-all hover:shadow-xl">
                 <div>
                   <h4 className="font-bold text-lg text-slate-800">{org.name}</h4>
                   <p className="text-sm text-slate-500 font-medium">Admin: {org.adminEmail}</p>
                   {org.isApproved && <span className="inline-block mt-2 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Active</span>}
                 </div>
                 
                 {org.isApproved ? (
                    <button 
                      disabled 
                      className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-6 py-2 rounded-lg font-bold cursor-default flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                      Approved
                    </button>
                 ) : (
                    <button 
                      onClick={() => handleApproveOrg(org.id)} 
                      className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 rounded-lg font-bold shadow-md hover:shadow-lg transition-all transform active:scale-95"
                    >
                      Approve
                    </button>
                 )}
               </div>
             ))
           )}
        </div>
      </div>
    );
  }

  // --- ORG ADMIN & RSM VIEW ---
  // RSM can only view Hierarchy, Org Admin can do everything.
  const isOrgAdmin = user?.role === UserRole.ORG_ADMIN;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-3 hover:bg-slate-200 rounded-2xl bg-white shadow-sm border"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7 7-7" /></svg></button>
            <div>
                <h2 className="text-3xl font-black text-slate-800">Organization Management</h2>
                <p className="text-slate-500 font-bold">{user?.organizationName}</p>
            </div>
         </div>
         {isOrgAdmin && (
             <div className="flex gap-2 bg-white p-1 rounded-xl border">
                 <button onClick={() => setActiveTab('hierarchy')} className={`px-4 py-2 rounded-lg text-sm font-bold uppercase transition-all ${activeTab === 'hierarchy' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>Hierarchy & Create</button>
                 <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg text-sm font-bold uppercase transition-all ${activeTab === 'users' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>User Management</button>
             </div>
         )}
      </div>

      {activeTab === 'hierarchy' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* CREATE USER FORM - RESTRICTED TO ORG ADMIN */}
            {isOrgAdmin ? (
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 h-fit">
                <h3 className="text-xl font-black text-slate-800 mb-6">Create New User</h3>
                <form onSubmit={handleCreateUser} className="space-y-4">
                    <div>
                    <label className="text-xs font-bold uppercase text-slate-500">Role</label>
                    <select 
                        className="w-full border-2 border-slate-200 rounded-xl p-3 font-bold text-slate-700"
                        value={newUser.role}
                        onChange={e => setNewUser({...newUser, role: e.target.value as UserRole, parentId: ''})}
                    >
                        <option value={UserRole.RSM}>RSM</option>
                        <option value={UserRole.SALES_ENG}>SALES ENGINEER</option>
                        <option value={UserRole.DEALER}>DEALER</option>
                        <option value={UserRole.DSE}>DSE (Dealer Sales Eng)</option>
                    </select>
                    </div>

                    {newUser.role !== UserRole.RSM && (
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500">Reports To (Parent)</label>
                        <select 
                            required
                            className="w-full border-2 border-slate-200 rounded-xl p-3"
                            value={newUser.parentId}
                            onChange={e => setNewUser({...newUser, parentId: e.target.value})}
                        >
                            <option value="">Select Parent...</option>
                            {getPotentialParents(newUser.role).map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                            ))}
                        </select>
                    </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500">Full Name</label>
                        <input required type="text" className="w-full border-2 border-slate-200 rounded-xl p-3" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500">Password</label>
                        <input required type="text" className="w-full border-2 border-slate-200 rounded-xl p-3" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                    </div>
                    </div>
                    
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-500">Login ID (Email)</label>
                        <input required type="email" className="w-full border-2 border-slate-200 rounded-xl p-3" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                    </div>

                    <button className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-orange-600 transition-colors">Create Account</button>
                </form>
                </div>
            ) : (
                <div className="bg-orange-50 p-8 rounded-3xl border border-orange-200 text-center flex flex-col items-center justify-center">
                    <svg className="w-12 h-12 text-orange-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <h3 className="font-bold text-orange-800 text-lg">Read Only View</h3>
                    <p className="text-orange-600 mt-2">Only Organization Admins can create new users.</p>
                </div>
            )}

            {/* TREE VIEW */}
            <div className={`bg-slate-50 p-8 rounded-3xl border border-slate-200 overflow-auto max-h-[600px] ${!isOrgAdmin ? 'col-span-2' : ''}`}>
            <h3 className="text-xl font-black text-slate-800 mb-6">Hierarchy Tree</h3>
            <div className="space-y-4">
                {allUsers.filter(u => u.role === UserRole.RSM).map(rsm => (
                    <div key={rsm.id} className="ml-0">
                    <div className="bg-red-100 text-red-800 p-3 rounded-lg font-bold border border-red-200 shadow-sm flex justify-between">
                        <span>RSM: {rsm.name}</span>
                        <span className="text-xs opacity-70">{rsm.email}</span>
                    </div>
                    {/* Sales Engs */}
                    {allUsers.filter(se => se.parentId === rsm.id).map(se => (
                        <div key={se.id} className="ml-8 mt-2 border-l-2 border-slate-300 pl-4">
                        <div className="bg-blue-100 text-blue-800 p-2 rounded-lg font-bold border border-blue-200 text-sm flex justify-between">
                            <span>SE: {se.name}</span>
                            <span className="text-xs opacity-70">{se.email}</span>
                        </div>
                        {/* Dealers */}
                        {allUsers.filter(d => d.parentId === se.id).map(dealer => (
                            <div key={dealer.id} className="ml-8 mt-2 border-l-2 border-slate-300 pl-4">
                                <div className="bg-indigo-100 text-indigo-800 p-2 rounded-lg font-bold border border-indigo-200 text-sm flex justify-between">
                                <span>DLR: {dealer.name}</span>
                                <span className="text-xs opacity-70">{dealer.email}</span>
                                </div>
                                {/* DSEs */}
                                {allUsers.filter(dse => dse.parentId === dealer.id).map(dse => (
                                <div key={dse.id} className="ml-8 mt-2 border-l-2 border-slate-300 pl-4">
                                    <div className="bg-slate-200 text-slate-700 p-2 rounded-lg font-bold border border-slate-300 text-xs flex justify-between">
                                        <span>DSE: {dse.name}</span>
                                        <span className="text-[10px] opacity-70">{dse.email}</span>
                                    </div>
                                </div>
                                ))}
                            </div>
                        ))}
                        </div>
                    ))}
                    </div>
                ))}
                {allUsers.filter(u => u.role === UserRole.RSM).length === 0 && (
                    <p className="text-slate-400 italic">No RSMs created yet. Start by creating an RSM.</p>
                )}
            </div>
            </div>
        </div>
      )}

      {/* USER MANAGEMENT TABLE */}
      {activeTab === 'users' && isOrgAdmin && (
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
             {editingUser ? (
                 <div className="p-8 bg-slate-50">
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-slate-800">Edit User: {editingUser.name}</h3>
                        <button onClick={() => setEditingUser(null)} className="text-slate-500 hover:text-red-500">Cancel</button>
                     </div>
                     <form onSubmit={handleUpdateUser} className="space-y-4 max-w-lg">
                        <div>
                             <label className="text-xs font-bold uppercase text-slate-500">Login Email</label>
                             <input type="email" className="w-full border-2 rounded-xl p-3" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} />
                        </div>
                        <div>
                             <label className="text-xs font-bold uppercase text-slate-500">Password</label>
                             <input type="text" className="w-full border-2 rounded-xl p-3" value={editingUser.password || ''} onChange={e => setEditingUser({...editingUser, password: e.target.value})} />
                        </div>
                        {editingUser.role !== UserRole.RSM && (
                             <div>
                                <label className="text-xs font-bold uppercase text-slate-500">Report To (Parent Change)</label>
                                <select 
                                    className="w-full border-2 rounded-xl p-3" 
                                    value={editingUser.parentId || ''} 
                                    onChange={e => setEditingUser({...editingUser, parentId: e.target.value})}
                                >
                                    <option value="">Select Parent...</option>
                                    {getPotentialParents(editingUser.role).map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                             </div>
                        )}
                        <button className="bg-slate-900 text-white font-bold py-3 px-8 rounded-xl">Save Changes</button>
                     </form>
                 </div>
             ) : (
                <table className="w-full text-left">
                    <thead className="bg-slate-800 text-white text-xs uppercase">
                        <tr>
                            <th className="p-4">Name</th>
                            <th className="p-4">Role</th>
                            <th className="p-4">Email</th>
                            <th className="p-4">Password</th>
                            <th className="p-4">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {allUsers.map(u => (
                            <tr key={u.id} className="hover:bg-slate-50">
                                <td className="p-4 font-bold">{u.name}</td>
                                <td className="p-4"><span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded">{u.role}</span></td>
                                <td className="p-4">{u.email}</td>
                                <td className="p-4 font-mono text-slate-500">{u.password}</td>
                                <td className="p-4">
                                    {u.role !== UserRole.ORG_ADMIN && (
                                        <button onClick={() => setEditingUser(u)} className="text-orange-600 font-bold hover:underline">Edit</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             )}
          </div>
      )}
    </div>
  );
};

export default AdminPanel;
