
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { db } from '../services/mockDb';
import { useAuth } from '../App';
import { MACHINE_TYPES, OPERATIONS, STATUS_OPTIONS } from '../constants';
import { PlanType, UserRole, Attachment, AIParameter } from '../types';

interface ConversionPlanPageProps {
  onBack: () => void;
  editingId?: string | null;
}

const ISO_GROUPS = [
  { code: 'P', name: 'Steel', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { code: 'M', name: 'Stainless Steel', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { code: 'K', name: 'Cast Iron', color: 'bg-red-50 text-red-700 border-red-200' },
  { code: 'N', name: 'Non-ferrous', color: 'bg-green-50 text-green-700 border-green-200' },
  { code: 'S', name: 'Superalloys', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { code: 'H', name: 'Hardened Steel', color: 'bg-gray-50 text-gray-700 border-gray-200' }
];

const STANDARDS = ['AISI', 'ASTM', 'DIN', 'BS', 'ANSI', 'JIS', 'AFNOR', 'AS', 'SAE', 'ASME'];

const ConversionPlanPage: React.FC<ConversionPlanPageProps> = ({ onBack, editingId }) => {
  const { user } = useAuth();
  const customers = db.getCustomers().filter(c => c.organizationId === user?.organizationId);
  const orgUsers = db.getUsers().filter(u => u.organizationId === user?.organizationId);

  const [formData, setFormData] = useState({
    customerId: '',
    projectName: '',
    machineType: MACHINE_TYPES[0],
    machineManufacturer: '',
    existingCompetitor: '',
    competitorProduct: '',
    unitPrice: 0,
    monthlyQty: 0,
    reasonForConversion: '',
    valueLakhs: 0,
    machineDetails: '', 
    componentMaterial: '',
    materialHardness: '',
    inputCondition: '',
    assignedTo: '',
    operation: OPERATIONS[0],
    solutionType: '' as 'TUNGALOY' | 'NTK' | '',
    catalogItemDescription: '',
    status: 'Open',
    aiParameters: [] as AIParameter[],
    machineAiParameters: [] as AIParameter[]
  });

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Modal State (Operation)
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiContent, setAiContent] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [tempAiParams, setTempAiParams] = useState<AIParameter[]>([]);

  // Machine AI State
  const [showMachineAIModal, setShowMachineAIModal] = useState(false);
  const [machineAiContent, setMachineAiContent] = useState('');
  const [loadingMachineAI, setLoadingMachineAI] = useState(false);
  const [tempMachineAiParams, setTempMachineAiParams] = useState<AIParameter[]>([]);
  const [tempManufacturer, setTempManufacturer] = useState('');
  const [loadingManufacturers, setLoadingManufacturers] = useState(false);
  const [manufacturerSuggestions, setManufacturerSuggestions] = useState<string[]>([]);

  // Material AI State
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [materialSuggestions, setMaterialSuggestions] = useState<any[]>([]);
  const [manualMaterial, setManualMaterial] = useState('');
  const [materialStep, setMaterialStep] = useState<'ISO' | 'STANDARD' | 'LIST'>('ISO');
  const [selectedIso, setSelectedIso] = useState<{code: string, name: string} | null>(null);
  const [selectedStandard, setSelectedStandard] = useState('');

  useEffect(() => {
      if (editingId) {
          const plan = db.getPlans().find(p => p.id === editingId);
          if (plan) {
              setFormData({
                  customerId: plan.customerId,
                  projectName: plan.projectName,
                  machineType: plan.machineType,
                  machineManufacturer: plan.machineManufacturer || '',
                  existingCompetitor: (plan as any).existingCompetitor || '',
                  competitorProduct: (plan as any).competitorProduct || '',
                  unitPrice: (plan as any).unitPrice || 0,
                  monthlyQty: (plan as any).monthlyQty || 0,
                  reasonForConversion: (plan as any).reasonForConversion || '',
                  valueLakhs: plan.valueLakhs,
                  machineDetails: (plan as any).machineDetails || '',
                  componentMaterial: plan.componentMaterial,
                  materialHardness: plan.materialHardness,
                  inputCondition: plan.inputCondition,
                  assignedTo: '', 
                  operation: (plan as any).operation || OPERATIONS[0],
                  solutionType: (plan as any).solutionType || '',
                  catalogItemDescription: (plan as any).catalogItemDescription || '',
                  status: plan.status,
                  aiParameters: (plan as any).aiParameters || [],
                  machineAiParameters: plan.machineAiParameters || []
              });
              setAttachments(plan.attachments || []);
          }
      }
  }, [editingId]);

  // Auto-calculate Annual Value (Lakhs)
  useEffect(() => {
     const annualVal = (formData.unitPrice * formData.monthlyQty * 12) / 100000;
     setFormData(prev => ({ ...prev, valueLakhs: parseFloat(annualVal.toFixed(2)) }));
  }, [formData.unitPrice, formData.monthlyQty]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = (ev) => {
              if (ev.target?.result) {
                  setAttachments(prev => [...prev, {
                      name: file.name,
                      data: ev.target!.result as string,
                      type: file.type.startsWith('image/') ? 'photo' : 'document'
                  }]);
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSolutionChange = (type: 'TUNGALOY' | 'NTK') => {
      setFormData({ ...formData, solutionType: type });
      if (type === 'TUNGALOY') {
          window.open('https://catalog.tungaloy.com/Index.aspx?lang=WZ&GFSTYP=M', '_blank');
      } else {
          window.open('https://catalog.ntkcuttingtools.com/', '_blank');
      }
  };

  const openAIModal = async (op: string) => {
    if (!op) return;
    setShowAIModal(true);
    if (formData.aiParameters.length > 0) {
        setTempAiParams([...formData.aiParameters]);
        return;
    }
    setLoadingAI(true);
    setAiContent('');
    setTempAiParams([]);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `For the metal cutting operation "${op}", list the essential Tool Nomenclatures (geometry, specifications) and Cutting Data Parameters (speed, feed, etc.) that need to be collected to propose a valid solution. Return the result as a JSON array.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      category: { type: Type.STRING, description: "Category like 'Tool Geometry' or 'Cutting Data'" },
                      parameter: { type: Type.STRING, description: "Name of the parameter" },
                      unit: { type: Type.STRING, description: "Unit of measurement (e.g. mm, m/min)" },
                      description: { type: Type.STRING, description: "Brief explanation" }
                    },
                    required: ["category", "parameter"]
                  }
                }
            }
        });
        
        if (response.text) {
          const rawData = JSON.parse(response.text);
          const params: AIParameter[] = rawData.map((item: any) => ({ ...item, value: '' }));
          setTempAiParams(params);
        } else {
          setAiContent("No structured data returned.");
        }
    } catch (error) {
        console.error("AI Error:", error);
        setAiContent("Unable to connect to Vertex AI/Gemini. Please check configuration.");
    } finally {
        setLoadingAI(false);
    }
  };

  const saveAiData = () => {
      setFormData({ ...formData, aiParameters: tempAiParams });
      setShowAIModal(false);
  };

  // Machine AI Functions
  const openMachineAIModal = () => {
      setShowMachineAIModal(true);
      setTempManufacturer(formData.machineManufacturer);
      setManufacturerSuggestions([]);
      if (formData.machineAiParameters.length > 0) {
          setTempMachineAiParams([...formData.machineAiParameters]);
      } else {
          setTempMachineAiParams([]);
      }
  };

  const suggestManufacturers = async () => {
      setLoadingManufacturers(true);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `List 5 top global manufacturers for "${formData.machineType}" machines. Return only a JSON array of strings.`,
            config: { responseMimeType: "application/json" }
        });
        if (response.text) {
            setManufacturerSuggestions(JSON.parse(response.text));
        }
      } catch (e) {
          console.error(e);
      } finally {
          setLoadingManufacturers(false);
      }
  };

  const fetchMachineAIData = async () => {
    if (!formData.machineType || !tempManufacturer) {
        setMachineAiContent("Please enter Manufacturer Name.");
        return;
    }
    setLoadingMachineAI(true);
    setMachineAiContent('');
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `For the "${formData.machineType}" machine manufactured by "${tempManufacturer}", list the essential technical parameters (e.g., Spindle Power, Max RPM, Table Size, Stroke X/Y/Z, Shank Type) that need to be collected for tooling selection. Return the result as a JSON array.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      category: { type: Type.STRING, description: "Category like 'Spindle' or 'Dimensions'" },
                      parameter: { type: Type.STRING, description: "Name of the parameter" },
                      unit: { type: Type.STRING, description: "Unit of measurement" },
                      description: { type: Type.STRING, description: "Brief explanation" }
                    },
                    required: ["category", "parameter"]
                  }
                }
            }
        });
        
        if (response.text) {
          const rawData = JSON.parse(response.text);
          const params: AIParameter[] = rawData.map((item: any) => ({ ...item, value: '' }));
          setTempMachineAiParams(params);
        } else {
          setMachineAiContent("No structured data returned.");
        }
    } catch (error) {
        console.error("AI Error:", error);
        setMachineAiContent("Unable to connect to AI.");
    } finally {
        setLoadingMachineAI(false);
    }
  };

  const saveMachineAiData = () => {
      setFormData({
          ...formData,
          machineManufacturer: tempManufacturer,
          machineAiParameters: tempMachineAiParams
      });
      setShowMachineAIModal(false);
  };

   // --- Material AI Functions ---

   const openMaterialModal = () => {
    setShowMaterialModal(true);
    setMaterialStep('ISO');
    setSelectedIso(null);
    setSelectedStandard('');
    setManualMaterial('');
    setMaterialSuggestions([]);
  };

  const handleIsoSelect = (iso: typeof ISO_GROUPS[0]) => {
      setSelectedIso(iso);
      setMaterialStep('STANDARD');
  };

  const handleStandardSelect = (std: string) => {
      setSelectedStandard(std);
      setMaterialStep('LIST');
      fetchMaterials(selectedIso!.name, std);
  };

  const fetchMaterials = async (isoName: string, standard: string) => {
      setLoadingMaterials(true);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `List 10 common industrial component materials that are ${isoName} (ISO ${selectedIso?.code}) according to ${standard} standard. Return JSON array.`,
              config: {
                  responseMimeType: "application/json",
                  responseSchema: {
                      type: Type.ARRAY,
                      items: {
                          type: Type.OBJECT,
                          properties: {
                              grade: { type: Type.STRING, description: "Material Grade/Name" },
                              description: { type: Type.STRING, description: "Brief properties or typical usage" }
                          }
                      }
                  }
              }
          });
          if (response.text) {
              setMaterialSuggestions(JSON.parse(response.text));
          }
      } catch (e) {
          console.error(e);
      } finally {
          setLoadingMaterials(false);
      }
  };

  const selectMaterial = (mat: string) => {
      setFormData({ ...formData, componentMaterial: mat });
      setShowMaterialModal(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.customerId) return;

    if (editingId) {
        // Edit Mode
        db.updatePlan(editingId, {
            ...formData,
            attachments: attachments
        });
        alert("Plan updated successfully!");
    } else {
        // Create Mode
        let ownerId = user.id;
        let ownerName = user.name;
        if (user.role === UserRole.ORG_ADMIN && formData.assignedTo) {
            const assignedUser = orgUsers.find(u => u.id === formData.assignedTo);
            if (assignedUser) {
                ownerId = assignedUser.id;
                ownerName = assignedUser.name;
            }
        }

        db.addPlan({
            ...formData,
            id: Math.random().toString(36).substr(2, 9),
            type: PlanType.CONVERSION,
            responsibility: ownerName,
            organizationId: user.organizationId,
            createdAt: new Date().toISOString(),
            createdBy: ownerId,
            attachments: attachments
        } as any);
        alert("Conversion plan created!");
    }
    onBack();
  };

  const canClose = user?.role === UserRole.RSM || user?.role === UserRole.ORG_ADMIN || user?.role === UserRole.SUPER_ADMIN;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-800 flex items-center gap-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>
        <h2 className="text-2xl font-bold text-slate-800">{editingId ? 'EDIT CONVERSION PLAN' : 'CONVERSION PLAN'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-slate-800 text-white p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="space-y-1">
             <label className="text-xs uppercase font-bold opacity-70">Customer Name*</label>
             <select required disabled={!!editingId} className="w-full bg-slate-700 border-none rounded p-2 text-white outline-none disabled:opacity-50" value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})}>
               <option value="">Select Customer</option>
               {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>
           </div>
           <div className="space-y-1">
             <label className="text-xs uppercase font-bold opacity-70">Project Name*</label>
             <input required type="text" className="w-full bg-slate-700 border-none rounded p-2 text-white outline-none" value={formData.projectName} onChange={e => setFormData({...formData, projectName: e.target.value})} />
           </div>
           
           {!editingId && user?.role === UserRole.ORG_ADMIN && (
               <div className="md:col-span-2 space-y-1 bg-slate-600 p-2 rounded border border-slate-500">
                  <label className="text-xs uppercase font-bold text-orange-300">Assign To (Admin Only)</label>
                  <select className="w-full bg-slate-700 border-none rounded p-2 text-white outline-none" value={formData.assignedTo} onChange={e => setFormData({...formData, assignedTo: e.target.value})}>
                      <option value="">Myself ({user.name})</option>
                      {orgUsers.map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                      ))}
                  </select>
               </div>
           )}

           {editingId && (
               <div className="md:col-span-2 space-y-1 bg-slate-700 p-2 rounded border border-slate-600">
                  <label className="text-xs uppercase font-bold text-orange-400">Status</label>
                  <select className="w-full bg-slate-800 border-none rounded p-2 text-white outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      {STATUS_OPTIONS.map(s => {
                          if (s.startsWith('Closed') && !canClose) return null;
                          return <option key={s} value={s}>{s}</option>
                      })}
                  </select>
               </div>
           )}
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-orange-500 text-white p-3 rounded-t-lg font-bold">Current Status & Proposal</div>
            <div className="space-y-3">
              <div className="space-y-1">
                 <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700/80">Operation</label>
                    <span className="text-[10px] text-orange-600 font-bold uppercase tracking-wider">AI Powered</span>
                 </div>
                 <select 
                    className="w-full border-b bg-transparent p-2 outline-none font-medium text-slate-800 cursor-pointer hover:bg-slate-50 transition-colors"
                    value={formData.operation} 
                    onChange={e => {
                        const val = e.target.value;
                        setFormData({...formData, operation: val, aiParameters: []}); 
                        openAIModal(val);
                    }}
                 >
                    {OPERATIONS.map(o => <option key={o} value={o}>{o}</option>)}
                 </select>
                 <button 
                   type="button" 
                   onClick={() => openAIModal(formData.operation)} 
                   className="text-[10px] text-blue-600 underline font-bold mt-1"
                 >
                   View/Edit AI Data ({formData.aiParameters.length} params)
                 </button>
              </div>

              {/* Solution Type Selection */}
              <div className="space-y-2 pt-2 pb-4 border-b">
                 <label className="text-xs font-bold text-slate-700/80">Select Solution (Opens E-Catalog)</label>
                 <div className="flex gap-4">
                     <button 
                        type="button" 
                        onClick={() => handleSolutionChange('TUNGALOY')}
                        className={`flex-1 py-2 px-4 rounded-lg font-bold transition-all ${formData.solutionType === 'TUNGALOY' ? 'bg-red-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                     >
                         TUNGALOY
                     </button>
                     <button 
                        type="button" 
                        onClick={() => handleSolutionChange('NTK')}
                        className={`flex-1 py-2 px-4 rounded-lg font-bold transition-all ${formData.solutionType === 'NTK' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                     >
                         NTK
                     </button>
                 </div>
                 {formData.solutionType && (
                     <div className="mt-2 animate-in fade-in slide-in-from-top-2">
                         <label className="text-[10px] uppercase font-bold text-slate-400">Final Assembly / Product Description (from Catalog)</label>
                         <textarea 
                            className="w-full border rounded-lg p-3 bg-yellow-50 text-slate-800 text-sm font-medium focus:ring-2 focus:ring-orange-500 outline-none" 
                            rows={3}
                            placeholder="Paste catalog item details here..."
                            value={formData.catalogItemDescription}
                            onChange={e => setFormData({...formData, catalogItemDescription: e.target.value})}
                         />
                     </div>
                 )}
              </div>

              <input placeholder="Existing Competitor" className="w-full border-b p-2 outline-none" value={formData.existingCompetitor} onChange={e => setFormData({...formData, existingCompetitor: e.target.value})} />
              <input placeholder="Competitor Product Desc" className="w-full border-b p-2 outline-none" value={formData.competitorProduct} onChange={e => setFormData({...formData, competitorProduct: e.target.value})} />
              
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Approx Unit Price</label>
                      <input type="number" className="w-full border-b p-2 outline-none" value={formData.unitPrice} onChange={e => setFormData({...formData, unitPrice: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Monthly Req Qty</label>
                      <input type="number" className="w-full border-b p-2 outline-none" value={formData.monthlyQty} onChange={e => setFormData({...formData, monthlyQty: Number(e.target.value)})} />
                  </div>
              </div>
              
              <textarea placeholder="Reason for Conversion" className="w-full border rounded p-2 outline-none" rows={3} value={formData.reasonForConversion} onChange={e => setFormData({...formData, reasonForConversion: e.target.value})} />
              
              <div className="flex items-center gap-2 bg-orange-50 p-2 rounded border border-orange-100">
                 <span className="font-bold text-slate-600 text-sm">Annual Value:</span>
                 <input 
                    readOnly 
                    type="number" 
                    className="bg-transparent w-24 p-1 outline-none font-black text-orange-600 text-lg" 
                    value={formData.valueLakhs} 
                 />
                 <span className="text-slate-500 text-xs font-bold uppercase">Lakhs</span>
              </div>

               {/* Attachments */}
              <div className="space-y-2 pt-4 border-t">
                  <label className="text-sm font-bold text-slate-600">Attachments</label>
                  <div className="flex gap-2">
                     <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded text-sm font-bold flex items-center gap-2">
                        Add File
                     </button>
                     <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                      {attachments.map((file, i) => (
                          <div key={i} className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded border border-blue-100 flex items-center gap-1">
                              <span>{file.name}</span>
                              <button type="button" onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 font-bold ml-1">×</button>
                          </div>
                      ))}
                  </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-600 text-white p-3 rounded-t-lg font-bold">Tech Specs</div>
            <div className="grid grid-cols-1 gap-3">
               <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500">Machine Type</label>
                  <select className="w-full border rounded p-2" value={formData.machineType} onChange={e => setFormData({...formData, machineType: e.target.value})}>
                    {MACHINE_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  
                  <button type="button" onClick={openMachineAIModal} className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 border border-blue-200 transition-colors shadow-sm">
                    <span className="text-lg">✨</span>
                    Add Machine Type - AI
                  </button>

                  <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                    Manufacturer: <span className="font-bold text-slate-700">{formData.machineManufacturer || 'Not Set'}</span>
                  </div>
               </div>
               
               <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Machine Details</label>
                  <input type="text" className="w-full border-b p-1 outline-none" value={formData.machineDetails} onChange={e => setFormData({...formData, machineDetails: e.target.value})} />
               </div>

               {/* Component Material Field with AI Button */}
               <div className="flex justify-between items-center border-b pb-1">
                   <label className="text-sm font-medium text-slate-600">Component Material</label>
                   <div className="flex items-center gap-2 flex-1 justify-end">
                       <input 
                         type="text" 
                         className="text-right border-none outline-none font-semibold text-slate-800 focus:text-orange-600 w-full" 
                         value={formData.componentMaterial} 
                         onChange={e => setFormData({...formData, componentMaterial: e.target.value})} 
                       />
                       <button type="button" onClick={openMaterialModal} className="text-orange-500 hover:text-orange-700 p-1 hover:bg-orange-50 rounded" title="AI Material Assistant">
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                       </button>
                   </div>
               </div>

               {[
                 { label: 'Material Hardness', key: 'materialHardness' },
                 { label: 'Input Condition', key: 'inputCondition' }
               ].map(field => (
                 <div key={field.key} className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">{field.label}</label>
                    <input type="text" className="w-full border-b p-1 outline-none" value={(formData as any)[field.key]} onChange={e => setFormData({...formData, [field.key]: e.target.value})} />
                 </div>
               ))}
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 flex justify-end">
          <button className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-12 rounded-xl shadow-lg transition-transform active:scale-95">
            {editingId ? 'Update Plan' : 'Submit Conversion Plan'}
          </button>
        </div>
      </form>
      
      {/* Operation AI Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col transform transition-all scale-100">
                <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-blue-50 to-white rounded-t-2xl">
                    <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                        <span className="text-2xl">✨</span> 
                        <div>
                            <span className="block text-xs text-orange-600 uppercase tracking-widest">Vertex AI Assistant</span>
                            <span className="block">{formData.operation} Data Collection Guide</span>
                        </div>
                    </h3>
                    <button onClick={() => setShowAIModal(false)} className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-full">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
                    {loadingAI ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-sm font-bold text-slate-500 animate-pulse">Consulting Knowledge Base...</p>
                        </div>
                    ) : tempAiParams.length > 0 ? (
                        <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-100">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-900 uppercase tracking-wider w-1/4">Parameter</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-900 uppercase tracking-wider w-1/6">Unit</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-900 uppercase tracking-wider w-1/4">Value (Input)</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-900 uppercase tracking-wider w-1/3">Description</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {tempAiParams.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3 text-sm font-bold text-slate-700">
                                                {item.parameter}
                                                <span className="block text-[10px] text-slate-400 font-normal">{item.category}</span>
                                            </td>
                                            <td className="px-4 py-3 text-xs font-mono text-slate-500">{item.unit || '-'}</td>
                                            <td className="px-4 py-3">
                                                <input 
                                                    type="text" 
                                                    className="w-full border border-slate-300 rounded p-1 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                                                    placeholder="Enter value..."
                                                    value={item.value || ''}
                                                    onChange={(e) => {
                                                        const newParams = [...tempAiParams];
                                                        newParams[idx].value = e.target.value;
                                                        setTempAiParams(newParams);
                                                    }}
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-600">{item.description}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-4 text-center text-slate-500">
                             {aiContent}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t bg-white rounded-b-2xl flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Powered by Google Gemini</span>
                    <div className="flex gap-2">
                        <button onClick={() => setShowAIModal(false)} className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition-colors">Cancel</button>
                        <button onClick={saveAiData} className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs transition-colors shadow-lg">Save AI Data</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Machine AI Modal */}
      {showMachineAIModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
                <div className="p-6 border-b bg-gradient-to-r from-orange-50 to-white rounded-t-2xl">
                    <h3 className="font-black text-lg text-slate-800">
                        <span className="text-orange-600">Vertex AI</span> Machine Details
                    </h3>
                    <p className="text-xs text-slate-500">Auto-generate parameters for {formData.machineType}</p>
                </div>
                
                <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1 space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-slate-500">Manufacturer</label>
                        <div className="flex gap-2">
                            <input 
                                autoFocus
                                type="text" 
                                placeholder="e.g. Mazak, DMG Mori, Doosan" 
                                className="flex-1 border p-2 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                                value={tempManufacturer}
                                onChange={e => setTempManufacturer(e.target.value)}
                            />
                            <button 
                                onClick={suggestManufacturers}
                                disabled={loadingManufacturers}
                                className="bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-blue-200"
                            >
                                {loadingManufacturers ? 'Loading...' : 'Suggest'}
                            </button>
                        </div>
                        {manufacturerSuggestions.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-1">
                                {manufacturerSuggestions.map(m => (
                                    <button 
                                        key={m} 
                                        onClick={() => setTempManufacturer(m)}
                                        className="text-[10px] bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded-full text-slate-700 transition-colors"
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <button 
                        onClick={fetchMachineAIData} 
                        disabled={loadingMachineAI}
                        className="w-full bg-slate-800 text-white px-4 py-3 rounded-lg font-bold text-sm hover:bg-slate-900 disabled:opacity-50 shadow-md"
                    >
                        {loadingMachineAI ? 'Generating Table...' : 'Get Machine Parameters'}
                    </button>

                    {tempMachineAiParams.length > 0 && (
                        <div className="bg-white rounded-xl border shadow-sm overflow-hidden mt-4 animate-in slide-in-from-bottom-2">
                             <table className="w-full text-left text-sm">
                                <thead className="bg-slate-100 text-xs uppercase font-bold text-slate-600">
                                    <tr>
                                        <th className="p-3">Parameter</th>
                                        <th className="p-3 w-32">Value</th>
                                        <th className="p-3">Unit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {tempMachineAiParams.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="p-3">
                                                <div className="font-bold text-slate-700">{item.parameter}</div>
                                                <div className="text-[10px] text-slate-400">{item.description}</div>
                                            </td>
                                            <td className="p-3">
                                                <input 
                                                    className="w-full border rounded p-1 text-sm outline-none focus:border-orange-500"
                                                    value={item.value}
                                                    onChange={e => {
                                                        const copy = [...tempMachineAiParams];
                                                        copy[idx].value = e.target.value;
                                                        setTempMachineAiParams(copy);
                                                    }}
                                                />
                                            </td>
                                            <td className="p-3 text-xs text-slate-500">{item.unit || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-white rounded-b-2xl flex justify-end gap-2">
                    <button onClick={() => setShowMachineAIModal(false)} className="px-4 py-2 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-lg">Cancel</button>
                    <button onClick={saveMachineAiData} className="px-6 py-2 bg-orange-600 text-white font-bold text-sm rounded-lg hover:bg-orange-700 shadow-lg">Save Machine Details</button>
                </div>
            </div>
        </div>
      )}

      {/* Material AI Modal - Multi-Step */}
      {showMaterialModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[85vh]">
                <div className="p-5 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
                    <div>
                        <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                            <span className="text-xl">✨</span> Material Assistant
                        </h3>
                        <p className="text-xs text-slate-500">
                            {materialStep === 'ISO' && "Step 1: Select ISO Group"}
                            {materialStep === 'STANDARD' && "Step 2: Select Standard"}
                            {materialStep === 'LIST' && `Step 3: Select ${selectedIso?.name} Material`}
                        </p>
                    </div>
                    <button onClick={() => setShowMaterialModal(false)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                    {/* STEP 1: ISO GROUP */}
                    {materialStep === 'ISO' && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {ISO_GROUPS.map(iso => (
                                <button 
                                    key={iso.code}
                                    onClick={() => handleIsoSelect(iso)}
                                    className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 hover:shadow-md ${iso.color}`}
                                >
                                    <span className="text-2xl font-black">{iso.code}</span>
                                    <span className="text-xs font-bold text-center uppercase">{iso.name}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* STEP 2: STANDARD */}
                    {materialStep === 'STANDARD' && (
                        <div className="space-y-4">
                            <button onClick={() => setMaterialStep('ISO')} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-bold">
                                ← Back to ISO Groups
                            </button>
                            <h4 className="font-bold text-slate-800">Select Standard for {selectedIso?.name} ({selectedIso?.code})</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {STANDARDS.map(std => (
                                    <button 
                                        key={std}
                                        onClick={() => handleStandardSelect(std)}
                                        className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-orange-50 hover:border-orange-200 text-slate-700 font-bold transition-all shadow-sm"
                                    >
                                        {std}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: LIST */}
                    {materialStep === 'LIST' && (
                        <div className="space-y-4">
                            <button onClick={() => setMaterialStep('STANDARD')} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-bold">
                                ← Back to Standards
                            </button>
                            
                            <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 flex justify-between items-center">
                                <span className="text-xs font-bold text-orange-800">ISO {selectedIso?.code} ({selectedIso?.name}) • {selectedStandard}</span>
                            </div>

                            {loadingMaterials ? (
                                <div className="text-center py-12">
                                    <div className="inline-block w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                                    <p className="text-xs font-bold text-slate-400">Vertex AI searching materials...</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {materialSuggestions.map((m, idx) => (
                                        <button 
                                            key={idx} 
                                            onClick={() => selectMaterial(`${selectedStandard} - ${m.grade}`)}
                                            className="w-full text-left p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group"
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-slate-800 group-hover:text-orange-600">{m.grade}</span>
                                                <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-500">{selectedStandard}</span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1">{m.description}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Manual Entry Fallback */}
                    <div className="mt-8 pt-4 border-t border-slate-100">
                        <label className="text-xs font-bold uppercase text-slate-400 block mb-2">Or Enter Manually</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                className="flex-1 border p-2 rounded-lg outline-none focus:ring-2 focus:ring-slate-200 text-sm" 
                                placeholder="Custom material..."
                                value={manualMaterial}
                                onChange={e => setManualMaterial(e.target.value)}
                            />
                            <button onClick={() => selectMaterial(manualMaterial)} className="bg-slate-800 text-white px-4 rounded-lg font-bold text-sm hover:bg-slate-900">Use</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ConversionPlanPage;
