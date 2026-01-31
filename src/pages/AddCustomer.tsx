
import React, { useState } from 'react';
import { db } from '../services/mockDb';
import { useAuth } from '../App';
import { SECTORS } from '../constants';
import { UserRole } from '../types';

const AddCustomer: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user } = useAuth();
  const orgUsers = db.getUsers().filter(u => u.organizationId === user?.organizationId);
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    pinCode: '',
    contactPerson: '',
    contactNumber: '',
    businessSector: 'Automotive',
    tungaloyShare: 0,
    annualPotential: 0,
    majorCompetitor1: '',
    majorCompetitor1Share: 0,
    majorCompetitor2: '',
    majorCompetitor2Share: 0,
    fyPlan: '',
    assignedTo: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    let ownerId = user.id;
    if (user.role === UserRole.ORG_ADMIN && formData.assignedTo) {
        ownerId = formData.assignedTo;
    }

    db.addCustomer({
      id: Math.random().toString(36).substr(2, 9),
      createdBy: ownerId,
      organizationId: user.organizationId,
      name: formData.name,
      address: formData.address,
      pinCode: formData.pinCode,
      contactPerson: formData.contactPerson,
      contactNumber: formData.contactNumber,
      businessSector: formData.businessSector,
      tungaloyShare: formData.tungaloyShare,
      annualPotential: formData.annualPotential,
      competitors: [
        { name: formData.majorCompetitor1, share: formData.majorCompetitor1Share },
        { name: formData.majorCompetitor2, share: formData.majorCompetitor2Share }
      ],
      fyPlan: formData.fyPlan
    });

    alert("Customer data saved!");
    onBack();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          Back to Dashboard
        </button>
        <h2 className="text-2xl font-bold text-slate-800">ADD CUSTOMER</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md border overflow-hidden">
        {user?.role === UserRole.ORG_ADMIN && (
            <div className="p-6 bg-slate-800 text-white">
                <label className="text-xs uppercase font-bold text-orange-300">Assign Customer To (Admin Only)</label>
                <select className="w-full bg-slate-700 border-none rounded p-2 text-white outline-none mt-1" value={formData.assignedTo} onChange={e => setFormData({...formData, assignedTo: e.target.value})}>
                    <option value="">Myself ({user.name})</option>
                    {orgUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                </select>
            </div>
        )}

        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-semibold text-slate-700">Customer Name *</label>
            <input required type="text" className="w-full border-b-2 border-slate-200 focus:border-orange-500 p-2 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-semibold text-slate-700">Address *</label>
            <textarea required className="w-full border-b-2 border-slate-200 focus:border-orange-500 p-2 outline-none resize-none" rows={2} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">PIN Code</label>
            <input type="text" className="w-full border-b-2 border-slate-200 focus:border-orange-500 p-2 outline-none" value={formData.pinCode} onChange={e => setFormData({...formData, pinCode: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Business Sector</label>
            <select className="w-full border-b-2 border-slate-200 focus:border-orange-500 p-2 outline-none bg-white" value={formData.businessSector} onChange={e => setFormData({...formData, businessSector: e.target.value})}>
              {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Contact Person</label>
            <input type="text" className="w-full border-b-2 border-slate-200 focus:border-orange-500 p-2 outline-none" value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Contact Number</label>
            <input type="tel" className="w-full border-b-2 border-slate-200 focus:border-orange-500 p-2 outline-none" value={formData.contactNumber} onChange={e => setFormData({...formData, contactNumber: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Annual Business Potential (Lakhs)</label>
            <input type="number" className="w-full border-b-2 border-slate-200 focus:border-orange-500 p-2 outline-none" value={formData.annualPotential} onChange={e => setFormData({...formData, annualPotential: Number(e.target.value)})} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Tungaloy Share (%)</label>
            <input type="number" max="100" className="w-full border-b-2 border-slate-200 focus:border-orange-500 p-2 outline-none" value={formData.tungaloyShare} onChange={e => setFormData({...formData, tungaloyShare: Number(e.target.value)})} />
          </div>

          <div className="md:col-span-2 space-y-4 pt-4">
            <h3 className="font-bold text-slate-800 border-l-4 border-orange-500 pl-2 mb-2">Major Competitors</h3>
            
            {/* Added Headers as requested */}
            <div className="grid grid-cols-2 gap-4 mb-1">
               <label className="text-xs font-bold uppercase text-slate-500">Competitor Name</label>
               <label className="text-xs font-bold uppercase text-slate-500">Business Share %</label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <input placeholder="Competitor Name 1" className="border-b-2 p-2 outline-none focus:border-orange-500" value={formData.majorCompetitor1} onChange={e => setFormData({...formData, majorCompetitor1: e.target.value})} />
              <input placeholder="0" type="number" className="border-b-2 p-2 outline-none focus:border-orange-500" value={formData.majorCompetitor1Share} onChange={e => setFormData({...formData, majorCompetitor1Share: Number(e.target.value)})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input placeholder="Competitor Name 2" className="border-b-2 p-2 outline-none focus:border-orange-500" value={formData.majorCompetitor2} onChange={e => setFormData({...formData, majorCompetitor2: e.target.value})} />
              <input placeholder="0" type="number" className="border-b-2 p-2 outline-none focus:border-orange-500" value={formData.majorCompetitor2Share} onChange={e => setFormData({...formData, majorCompetitor2Share: Number(e.target.value)})} />
            </div>
          </div>

          <div className="md:col-span-2 space-y-1 pt-4">
            <label className="text-sm font-semibold text-slate-700">FY 26 Plan</label>
            <textarea className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-orange-500" rows={3} value={formData.fyPlan} onChange={e => setFormData({...formData, fyPlan: e.target.value})} />
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t flex justify-end">
          <button className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-10 rounded-xl shadow-lg transition-transform active:scale-95">
            Save Customer Data
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddCustomer;