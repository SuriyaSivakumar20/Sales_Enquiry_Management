
import React, { useState, useEffect } from 'react';
import { db } from '../services/mockDb';
import { useAuth } from '../App';
import { UserRole, PlanType, ProjectPlan, ConversionPlan, RetentionPlan, UpdateLogEntry } from '../types';

interface MyEnquiriesProps {
  onBack: () => void;
  onEdit: (id: string, page: string) => void;
}

const MyEnquiries: React.FC<MyEnquiriesProps> = ({ onBack, onEdit }) => {
  const { user } = useAuth();
  const allUsers = db.getUsers();
  const allCustomers = db.getCustomers();
  const [filterType, setFilterType] = useState<string>('all');
  
  // Custom Columns State
  const [customColumns, setCustomColumns] = useState<string[]>([]);
  const [newColumnName, setNewColumnName] = useState('');
  const [showAddColumn, setShowAddColumn] = useState(false);
  // Force update hack for real-time table refresh when db changes
  const [updateKey, setUpdateKey] = useState(0);

  useEffect(() => {
    // Load custom columns from localStorage
    const saved = localStorage.getItem('sales_tracker_custom_columns');
    if (saved) {
      setCustomColumns(JSON.parse(saved));
    }
  }, []);

  const handleAddColumn = () => {
    if (!newColumnName.trim()) return;
    const newCols = [...customColumns, newColumnName.trim()];
    setCustomColumns(newCols);
    localStorage.setItem('sales_tracker_custom_columns', JSON.stringify(newCols));
    setNewColumnName('');
    setShowAddColumn(false);
  };

  const handleCustomFieldChange = (planId: string, col: string, val: string) => {
    const plan = db.getPlans().find(p => p.id === planId);
    if (plan) {
      const updatedFields = { ...(plan.customFields || {}), [col]: val };
      db.updatePlan(planId, { customFields: updatedFields });
      setUpdateKey(prev => prev + 1); // Refresh table
    }
  };

  const handleUpdateStatusChange = (planId: string, status: string) => {
    if (!user) return;
    const plan = db.getPlans().find(p => p.id === planId);
    if (!plan) return;

    const logEntry: UpdateLogEntry = {
        status: status,
        updatedBy: user.name,
        updatedById: user.id,
        timestamp: new Date().toISOString()
    };

    const currentLog = plan.updateStatusLog || [];
    const newLog = [...currentLog, logEntry];

    db.updatePlan(planId, { 
        updateStatus: status,
        updateStatusLog: newLog
    });
    setUpdateKey(prev => prev + 1);
  };

  const getAccessiblePlans = () => {
    if (!user) return [];
    
    let plans = db.getPlans().filter(p => p.organizationId === user.organizationId);
    
    if (user.role === UserRole.SUPER_ADMIN) return db.getPlans();
    if (user.role === UserRole.ORG_ADMIN) return plans;

    const getSubordinateIds = (managerId: string): string[] => {
      const directs = allUsers.filter(u => u.parentId === managerId);
      let ids = directs.map(d => d.id);
      for (const direct of directs) {
        ids = [...ids, ...getSubordinateIds(direct.id)];
      }
      return ids;
    };

    const accessibleIds = new Set([user.id, ...getSubordinateIds(user.id)]);
    return plans.filter(p => accessibleIds.has(p.createdBy));
  };

  const filteredPlans = getAccessiblePlans().filter(p => filterType === 'all' || p.type === filterType);

  const getCustomerName = (id: string) => allCustomers.find(c => c.id === id)?.name || 'Unknown';
  const getCreatorName = (id: string) => allUsers.find(u => u.id === id)?.name || 'Unknown';

  const handleEditClick = (plan: any) => {
    let page = 'new-project';
    if (plan.type === PlanType.CONVERSION) page = 'conversion';
    if (plan.type === PlanType.RETENTION) page = 'retention';
    onEdit(plan.id, page);
  };

  const exportToCSV = () => {
    const baseHeaders = [
      'SI No', 'Date Created', 'Created By', 'Plan Type', 'Customer', 'Project Name', 
      'Machine Type', 'Machine Manufacturer', 'Machine AI Parameters',
      'Value (Lakhs)', 'Status', 'Update Status', 'Update History (Log)', 'Responsibility',
      'Cycle Time (Ticked)', 'Tool List (Ticked)', 'Required Date',
      'Existing Competitor', 'Competitor Product', 'Unit Price', 'Reason for Conversion',
      'Tungaloy Product Desc', 'Reason for Trial', 'Competitor Name', 'Competitor Product (Ret)', 'Operation',
      'Solution Type', 'Catalog Description', 'Operation AI Data'
    ];

    const headers = [...baseHeaders, ...customColumns];

    const rows = filteredPlans.map((p, idx) => {
      // Format AI Data
      let opAiData = '';
      if ((p as any).aiParameters) {
        opAiData = (p as any).aiParameters.map((ai: any) => `${ai.parameter}: ${ai.value || 'N/A'}`).join(' | ');
      }

      let machineAiData = '';
      if (p.machineAiParameters) {
        machineAiData = p.machineAiParameters.map((ai: any) => `${ai.parameter}: ${ai.value || 'N/A'}`).join(' | ');
      }

      // Format Update History Log
      const historyString = p.updateStatusLog 
        ? p.updateStatusLog.map(l => `[${new Date(l.timestamp).toLocaleDateString()} ${new Date(l.timestamp).toLocaleTimeString()}] ${l.status} by ${l.updatedBy}`).join('; ')
        : '';

      const common = [
        idx + 1,
        new Date(p.createdAt).toLocaleDateString(),
        getCreatorName(p.createdBy),
        p.type,
        getCustomerName(p.customerId),
        p.projectName,
        p.machineType,
        p.machineManufacturer || '',
        machineAiData,
        p.valueLakhs,
        p.status,
        p.updateStatus || '',
        historyString,
        p.responsibility,
      ];

      let projectFields = ['', '', ''];
      let conversionFields = ['', '', '', ''];
      let retentionFields = ['', '', '', '', ''];
      let solutionFields = ['', '', opAiData]; 

      if (p.type === PlanType.NEW_PROJECT) {
        const dp = p as ProjectPlan;
        projectFields = [dp.cycleTime ? 'Yes' : 'No', dp.toolList ? 'Yes' : 'No', dp.requiredDate || ''];
      } else if (p.type === PlanType.CONVERSION) {
        const cp = p as ConversionPlan;
        conversionFields = [cp.existingCompetitor || '', cp.competitorProduct || '', cp.unitPrice?.toString() || '', cp.reasonForConversion || ''];
        solutionFields = [cp.solutionType || '', cp.catalogItemDescription || '', opAiData];
      } else if (p.type === PlanType.RETENTION) {
        const rp = p as RetentionPlan;
        retentionFields = [rp.tungaloyProductDesc || '', rp.reasonForTrial || '', rp.competitorName || '', rp.competitorProductDesc || '', rp.operation || ''];
        solutionFields = [rp.solutionType || '', rp.catalogItemDescription || '', opAiData];
      }

      const customData = customColumns.map(col => p.customFields?.[col] || '');

      return [...common, ...projectFields, ...conversionFields, ...retentionFields, ...solutionFields, ...customData]
        .map(val => `"${val}"`).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sales_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">Consolidated Enquiry Report</h2>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
           {['all', PlanType.NEW_PROJECT, PlanType.CONVERSION, PlanType.RETENTION].map(t => (
             <button 
              key={t}
              onClick={() => setFilterType(t)} 
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${filterType === t ? 'bg-orange-600 text-white shadow-md' : 'bg-white text-slate-500 border hover:bg-slate-50'}`}
             >
               {t === 'all' ? 'Show All' : t}
             </button>
           ))}
           <div className="border-l pl-2 ml-2">
              <button onClick={() => setShowAddColumn(true)} className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-800 text-white hover:bg-slate-700 flex items-center gap-1">
                 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                 Add Column
              </button>
           </div>
        </div>
      </div>

      {showAddColumn && (
        <div className="bg-white p-4 rounded-xl border shadow-lg flex items-center gap-2 max-w-md animate-in slide-in-from-top-2">
           <input 
             autoFocus
             type="text" 
             placeholder="Column Name (e.g. Remarks)" 
             className="border p-2 rounded text-sm flex-1 outline-none focus:ring-2 focus:ring-orange-500"
             value={newColumnName}
             onChange={e => setNewColumnName(e.target.value)}
           />
           <button onClick={handleAddColumn} className="bg-orange-600 text-white px-4 py-2 rounded text-sm font-bold">Add</button>
           <button onClick={() => setShowAddColumn(false)} className="text-slate-500 px-2 text-sm">Cancel</button>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-xl overflow-x-auto border border-slate-200">
        <table className="w-full text-left border-collapse min-w-[1600px]">
          <thead>
            <tr className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-widest">
              <th className="p-5 border-r border-slate-700 min-w-[50px]">SI</th>
              <th className="p-5 border-r border-slate-700 min-w-[100px]">Date</th>
              <th className="p-5 border-r border-slate-700 min-w-[150px]">Created By</th>
              <th className="p-5 border-r border-slate-700 min-w-[100px]">Type</th>
              <th className="p-5 border-r border-slate-700 min-w-[150px]">Customer</th>
              <th className="p-5 border-r border-slate-700 min-w-[200px]">Project Info</th>
              <th className="p-5 border-r border-slate-700 min-w-[100px]">Value (L)</th>
              <th className="p-5 border-r border-slate-700 min-w-[120px]">Status</th>
              <th className="p-5 border-r border-slate-700 min-w-[180px] bg-slate-800 text-orange-400">Update</th>
              <th className="p-5 border-r border-slate-700 min-w-[120px]">Responsibility</th>
              <th className="p-5 border-r border-slate-700 min-w-[200px]">AI Data / Solution</th>
              <th className="p-5 border-r border-slate-700 min-w-[200px]">Details</th>
              {customColumns.map(col => (
                  <th key={col} className="p-5 border-r border-slate-700 bg-slate-800 min-w-[150px]">{col}</th>
              ))}
              <th className="p-5 min-w-[100px]">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredPlans.length === 0 ? (
              <tr><td colSpan={13 + customColumns.length} className="p-20 text-center text-slate-300 font-medium italic text-lg">No records matching criteria</td></tr>
            ) : (
              filteredPlans.map((p, idx) => {
                const updateOptions = p.type === PlanType.NEW_PROJECT 
                    ? ['Proposal Given', 'Tool List Given', 'Order Won', 'Order Lost']
                    : ['Trial Planned', 'Trial Mat Received', 'Trial On Going', 'Trial Completed'];

                return (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-all group">
                  <td className="p-5 font-mono text-slate-400">{idx + 1}</td>
                  <td className="p-5 font-bold text-slate-600 text-xs">
                     {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-5">
                    <div className="font-bold text-slate-800 text-xs uppercase">{getCreatorName(p.createdBy)}</div>
                  </td>
                  <td className="p-5">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                      p.type === PlanType.NEW_PROJECT ? 'bg-blue-100 text-blue-700' :
                      p.type === PlanType.CONVERSION ? 'bg-emerald-100 text-emerald-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>{p.type}</span>
                  </td>
                  <td className="p-5 font-semibold text-slate-800">{getCustomerName(p.customerId)}</td>
                  <td className="p-5">
                    <div className="font-bold text-slate-900">{p.projectName}</div>
                    <div className="text-xs text-slate-500 font-bold">{p.machineType}</div>
                    {p.machineManufacturer && (
                        <div className="text-[10px] text-slate-400">Mfg: {p.machineManufacturer}</div>
                    )}
                    {p.attachments && p.attachments.length > 0 && (
                      <div className="flex gap-2 mt-1">
                        {p.attachments.map((att, i) => (
                           <span key={i} title={att.name} className="text-[10px] bg-slate-200 px-1 rounded flex items-center gap-1">
                             <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                             {att.type}
                           </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="p-5">
                    <span className="font-black text-orange-600 text-base">₹{p.valueLakhs || 0}</span>
                  </td>
                  <td className="p-5">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${p.status.includes('Closed') ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {p.status}
                    </span>
                  </td>
                  <td className="p-5">
                      <select 
                        disabled={p.status.startsWith('Closed')}
                        value={p.updateStatus || ''} 
                        onChange={(e) => handleUpdateStatusChange(p.id, e.target.value)}
                        className={`w-full text-xs font-bold border-none outline-none rounded p-2 bg-slate-100 cursor-pointer focus:ring-2 focus:ring-orange-500 ${p.status.startsWith('Closed') ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-200'}`}
                      >
                        <option value="">Select Progress...</option>
                        {updateOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      {p.updateStatusLog && p.updateStatusLog.length > 0 && (
                          <div className="text-[9px] text-slate-400 mt-1 italic leading-tight">
                              Last updated by {p.updateStatusLog[p.updateStatusLog.length - 1].updatedBy}
                          </div>
                      )}
                  </td>
                  <td className="p-5 text-slate-500 font-medium">{p.responsibility}</td>
                  <td className="p-5 space-y-2">
                     {p.machineAiParameters && p.machineAiParameters.length > 0 && (
                        <div className="text-[10px] bg-blue-50 text-slate-600 p-2 rounded border border-blue-100 max-h-20 overflow-y-auto">
                            <span className="font-bold block text-blue-800 mb-1">Machine AI Data:</span>
                            {p.machineAiParameters.map((ai: any, i: number) => (
                                <div key={i} className="flex justify-between border-b border-blue-100 last:border-0">
                                    <span>{ai.parameter}:</span>
                                    <span className="font-bold">{ai.value || '-'}</span>
                                </div>
                            ))}
                        </div>
                     )}
                     
                     {(p as any).aiParameters && (p as any).aiParameters.length > 0 && (
                        <div className="text-[10px] bg-yellow-50 text-slate-600 p-2 rounded border border-yellow-100 max-h-20 overflow-y-auto">
                            <span className="font-bold block text-orange-600 mb-1">Op. AI Data:</span>
                            {(p as any).aiParameters.map((ai: any, i: number) => (
                                <div key={i} className="flex justify-between border-b border-yellow-100 last:border-0">
                                    <span>{ai.parameter}:</span>
                                    <span className="font-bold">{ai.value || '-'}</span>
                                </div>
                            ))}
                        </div>
                     )}
                     {(p as ConversionPlan).solutionType && (
                         <span className="bg-green-50 text-green-700 px-2 py-1 rounded font-bold text-[10px] block w-fit">Sol: {(p as any).solutionType}</span>
                     )}
                  </td>
                  <td className="p-5 bg-slate-50/30 group-hover:bg-white transition-colors">
                     {p.type === PlanType.NEW_PROJECT && (
                       <div className="text-xs space-y-0.5">
                         <p><strong>Required:</strong> {(p as ProjectPlan).requiredDate}</p>
                         <p className={(p as ProjectPlan).cycleTime ? 'text-green-600 font-bold' : 'text-slate-400'}>Cycle Time: {(p as ProjectPlan).cycleTime ? 'Yes' : 'No'}</p>
                         <p className={(p as ProjectPlan).toolList ? 'text-green-600 font-bold' : 'text-slate-400'}>Tool List: {(p as ProjectPlan).toolList ? 'Yes' : 'No'}</p>
                       </div>
                     )}
                     {p.type === PlanType.CONVERSION && (
                       <div className="text-xs space-y-0.5 text-emerald-800">
                         <p><strong>Vs:</strong> {(p as ConversionPlan).existingCompetitor}</p>
                         <p><strong>Reason:</strong> {(p as ConversionPlan).reasonForConversion}</p>
                       </div>
                     )}
                     {p.type === PlanType.RETENTION && (
                       <div className="text-xs space-y-0.5 text-purple-800">
                         <p><strong>Op:</strong> {(p as RetentionPlan).operation}</p>
                         <p><strong>Product:</strong> {(p as RetentionPlan).tungaloyProductDesc}</p>
                       </div>
                     )}
                  </td>
                  {/* Custom Columns Data Cells */}
                  {customColumns.map(col => (
                      <td key={col} className="p-5">
                          <input 
                            type="text" 
                            className="w-full bg-transparent border-b border-transparent focus:border-orange-500 focus:bg-white outline-none text-xs text-slate-700 transition-all"
                            placeholder="-"
                            value={p.customFields?.[col] || ''}
                            onChange={(e) => handleCustomFieldChange(p.id, col, e.target.value)}
                          />
                      </td>
                  ))}
                  <td className="p-5">
                      <button 
                        onClick={() => handleEditClick(p)} 
                        disabled={p.status.startsWith('Closed')}
                        className={`font-bold text-xs uppercase px-3 py-1.5 rounded-lg border transition-all ${
                            p.status.startsWith('Closed') 
                            ? 'text-slate-300 border-slate-200 cursor-not-allowed' 
                            : 'text-orange-600 border-orange-200 hover:bg-orange-50 hover:border-orange-300'
                        }`}
                      >
                          {p.status.startsWith('Closed') ? 'Locked' : 'Edit'}
                      </button>
                  </td>
                </tr>
              );
             })
            )}
          </tbody>
        </table>
      </div>
      
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4">
        <p className="text-xs text-slate-400 font-medium">Total Records: {filteredPlans.length}</p>
        <button 
           onClick={exportToCSV}
           className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-10 rounded-2xl flex items-center gap-3 shadow-xl transform active:scale-95 transition-all"
         >
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
           EXPORT CONSOLIDATED DATA (CSV)
         </button>
      </div>
    </div>
  );
};

export default MyEnquiries;
