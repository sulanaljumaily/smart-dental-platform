import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useCurrentClinic } from '../../../hooks/useCurrentClinic';
import { supabase } from '../../../lib/supabase';
import {
  User, Phone, Mail, MapPin, Calendar, Activity,
  FileText, Eye, Clock, ChevronRight, Share2, Printer, MoreVertical,
  Plus, Search, Filter, ShieldCheck, AlertCircle, CheckCircle,
  X, DollarSign, Brain, Sparkles, Send, ImageIcon, ExternalLink, Trash2,
  Minus, ChevronLeft, Settings as SettingsIcon, Save, Edit2, Archive,
  HeartPulse, Syringe, Pill, Star, Beaker, History as HistoryIcon,
  MessageSquare, Upload, RefreshCcw, Info, ArrowRight, AlertTriangle
} from 'lucide-react';

import { ComprehensiveTransactionModal } from '../../../components/finance/ComprehensiveTransactionModal';
import { toast } from 'sonner';

import { Button } from '../../../components/common/Button';
import { Card } from '../../../components/common/Card';
import { TeethChart } from '../../../components/treatment/TeethChart';
import { ToothInteractionModal } from '../../../components/treatment/ToothInteractionModal';
import { TreatmentSessionManager } from '../../../components/treatment/TreatmentSessionManager';
import { ToothCondition, TreatmentPlan, TreatmentSession } from '../../../types/treatment';
import { usePatient } from '../../../hooks/usePatient';
import { usePatientTreatments } from '../../../hooks/usePatientTreatments';
import { useAppointments } from '../../../hooks/useAppointments';
import { useFinance } from '../../../hooks/useFinance';
import { useTreatments, TreatmentService } from '../../../hooks/useTreatments';
import { formatDate } from '../../../lib/utils';
import { Modal } from '../../../components/common/Modal';
import { useLabs } from '../../../hooks/useLabs';
import { useLabOrders } from '../../../hooks/useLabOrders';
import { useAuth } from '../../../contexts/AuthContext';
import { useAIAnalysis } from '../../../hooks/useAIAnalysis';
import { ImageUploadZone } from '../../../components/ai/ImageUploadZone';
import { AnalysisResultCard } from '../../../components/ai/AnalysisResultCard';
import { PatientImageGallery } from '../../../components/patient/PatientImageGallery';
import { SmartAssistantChat } from '../../../components/ai/SmartAssistantChat';
import { useStorage } from '../../../hooks/useStorage';
import { ImageEditorModal } from '../../../components/common/ImageEditorModal';
import { FilePreviewModal } from '../../../components/common/FilePreviewModal';
import { CreateOrderModal } from './sections/components/CreateOrderModal';

interface FileItem {
  id: string;
  name: string;
  type: 'xray' | 'report' | 'prescription' | 'lab';
  date: string;
  size: string;
  url?: string;
}

export const ClinicPatientProfile = () => {
  const { patientId, clinicId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'overview' | 'treatment' | 'medical' | 'smart' | 'archive' | 'finance' | 'settings'>('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsPopupOpen, setIsDetailsPopupOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'general' | 'treatment'>('general');
  const [selectedTooth, setSelectedTooth] = useState<ToothCondition | null>(null);

  // Edit State
  const [isEditingHistory, setIsEditingHistory] = useState(false);
  const [tempVitals, setTempVitals] = useState({
    bp: '',
    pulse: '',
    temperature: '',
    weight: '',
    height: '',
    sugar: ''
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  // AI & Analysis State
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileToAnalyze, setFileToAnalyze] = useState<File | null>(null);
  const [analysisNotes, setAnalysisNotes] = useState('');
  const [selectedAnalysis, setSelectedAnalysis] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Lab State
  const [isLabModalOpen, setIsLabModalOpen] = useState(false);
  const [selectedLabPlan, setSelectedLabPlan] = useState<TreatmentPlan | null>(null);

  // Other UI State
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  // Finance State
  const [isFinanceModalOpen, setIsFinanceModalOpen] = useState(false);
  const [financeModalType, setFinanceModalType] = useState<'income' | 'expense'>('income');

  // --- HOOKS & DATA ---
  const { user } = useAuth();
  const { clinic: currentClinic } = useCurrentClinic();

  // Use param ID (preferred) or found clinic ID
  const effectiveClinicId = clinicId || currentClinic?.id || '';

  // Restore original hook signature
  const { patient, loading: patientLoading, error, updatePatientProfile } = usePatient(patientId);
  const { appointments } = useAppointments(user?.id); // Keep original string arg
  const { transactions, addTransaction } = useFinance(user?.id, patientId);
  const { uploadFile, loading: fileUploading, error: uploadError } = useStorage();

  // Lab Hooks
  const { labs, savedLabs } = useLabs({ clinicId: user?.id });
  const { createOrder: submitOrder } = useLabOrders();
  const allLabs = [...(savedLabs || []), ...(labs || [])];

  // Treatments for Tooth Interaction Modal
  const { treatments: clinicTreatments } = useTreatments(effectiveClinicId);

  // Patient Treatments Data (Teeth Conditions & Plans)
  const {
    teeth: patientTeeth,
    treatmentPlans,
    updateTooth,
    addPlan,
    updateSession,
    completeSession,
    deletePlan,
    loading: treatmentsLoading
  } = usePatientTreatments(patientId);

  // Files State - DB Backed
  const [files, setFiles] = useState<FileItem[]>([]);

  useEffect(() => {
    const fetchFiles = async () => {
      if (!patientId) return;
      const { data } = await supabase
        .from('patient_files')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (data) {
        setFiles(data.map(f => ({
          id: f.id,
          name: f.name,
          type: f.type as any,
          date: f.date || new Date(f.created_at).toLocaleDateString(),
          size: f.size || '-',
          url: f.url
        })));
      }
    };
    fetchFiles();
  }, [patientId]);

  // Derived Data - with null safety for nested vitals
  const rawMedicalData = patient?.medicalHistoryData;
  const medicalData = {
    vitals: {
      weight: rawMedicalData?.vitals?.weight ?? '-',
      height: rawMedicalData?.vitals?.height ?? '-',
      bp: rawMedicalData?.vitals?.bp ?? '-',
      sugar: rawMedicalData?.vitals?.sugar ?? '-',
      pulse: rawMedicalData?.vitals?.pulse ?? '-'
    },
    conditions: rawMedicalData?.conditions ?? [],
    allergies: rawMedicalData?.allergies ?? [],
    habits: rawMedicalData?.habits ?? [],
    notes: rawMedicalData?.notes ?? ''
  };

  const patientAppointments = appointments.filter(a => a.patientId === patientId);
  const nextAppointment = patientAppointments
    .filter(a => new Date(a.date) > new Date() && a.status !== 'cancelled')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const patientTransactions = transactions.filter(t => t.patientId === patientId);
  const totalPaid = patientTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const activePlans = treatmentPlans.filter(p => p.status !== 'completed' && p.status !== 'cancelled');
  const outstanding = 0; // Placeholder

  // Effects

  // Effects
  useEffect(() => {
    if (patient) {
      setTempName(patient.name);
      if (patient.medicalHistoryData?.vitals) {
        setTempVitals(prev => ({ ...prev, ...patient.medicalHistoryData!.vitals }));
      }
    }
  }, [patient]);

  // --- HANDLERS ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'xray' | 'report') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const result = await uploadFile(file, 'patient-docs', `${patientId}/${type}s`);
        if (result) {
          // Save to DB
          const newFilePayload = {
            patient_id: patientId,
            name: file.name,
            type: type,
            url: result.url,
            size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
            date: new Date().toISOString()
          };

          const { data: dbFile, error: dbError } = await supabase
            .from('patient_files')
            .insert(newFilePayload)
            .select()
            .single();

          if (dbError) throw dbError;

          if (dbFile) {
            const newFile: FileItem = {
              id: dbFile.id,
              name: dbFile.name,
              type: dbFile.type as any,
              date: new Date(dbFile.created_at).toLocaleDateString('ar-IQ'),
              size: dbFile.size,
              url: dbFile.url
            };
            setFiles(prev => [newFile, ...prev]);
            // toast.success('تم رفع الملف وحفظه بنجاح');
          }
        }
      } catch (err) {
        console.error("Upload failed", err);
      }
    }
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => handleFileUpload(e, 'report');
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => handleFileUpload(e, 'xray');

  const handleToothClick = (tooth: ToothCondition) => {
    setSelectedTooth(tooth);
    // Simple logic: always open popover for now, or check plan
    setIsDetailsPopupOpen(true);
  };

  const handleEditCondition = () => {
    setIsDetailsPopupOpen(false);
    setModalInitialTab('general');
    setIsModalOpen(true);
  };

  const handleAddTreatment = () => {
    setIsDetailsPopupOpen(false);
    setModalInitialTab('treatment');
    setIsModalOpen(true);
  };

  // --- Patient Data Handling (Supabase Integrated) ---


  const handleUpdateSession = (planId: string, sessionId: string, data: any) => {
    updateSession(planId, sessionId, data);
  };

  const handleLabRequest = (plan: TreatmentPlan) => {
    setSelectedLabPlan(plan);
    setIsLabModalOpen(true);
  };

  const handleCancelPlan = (planId: string) => {
    if (window.confirm('هل أنت متأكد من إلغاء خطة العلاج هذه؟')) {
      deletePlan(planId);
    }
  };



  const addQuickPlan = (typeKey: string) => {
    // Map UI string keys to Database Names (approximate match or ID based)
    // ideally we click on the specific treatment from a list, but for now we map the buttons
    let searchName = '';
    if (typeKey === 'endo') searchName = 'علاج عصب';
    if (typeKey === 'crown') searchName = 'تاج';
    if (typeKey === 'implant') searchName = 'زركون'; // or implant
    if (typeKey === 'ortho') searchName = 'تقويم';

    const template = clinicTreatments.find(t => t.name.includes(searchName));

    if (!template) {
      // toast.error("عذراً، هذا العلاج غير متوفر في قائمة العيادة الحالية");
      alert("عذراً، هذا العلاج غير متوفر في قائمة العيادة الحالية");
      return;
    }

    const phases = Array.isArray(template.defaultPhases) ? template.defaultPhases : [];
    const totalSessions = phases.length > 0 ? phases.length : 1;

    const newPlan: TreatmentPlan = {
      id: `plan-${Date.now()}`,
      patientId: patientId || 'unknown',
      toothNumber: 0,
      type: typeKey as any,
      status: 'planned',
      totalSessions: totalSessions,
      completedSessions: 0,
      progress: 0,
      sessions: phases.length > 0 ? phases.map((step: any, i: number) => ({
        id: `sess-${Date.now()}-${i}`,
        number: i + 1,
        title: step.title || `جلسة ${i + 1}`,
        status: 'pending',
        duration: step.duration || 30,
        schemaId: step.schemaId || 'general',
        data: {}
      })) : [
        {
          id: `sess-${Date.now()}-0`,
          number: 1,
          title: template.name,
          status: 'pending',
          duration: 30,
          schemaId: 'general',
          data: {}
        }
      ],
      cost: template.basePrice || 0,
      paid: 0,
      startDate: new Date().toLocaleDateString('en-GB'),
      notes: template.name
    };

    addPlan(newPlan);
  };

  const handleModalSave = async (data: any) => {
    if (!patientId) return;

    // 1. Update Tooth Condition
    await updateTooth(data.toothNumber, data.condition, data.notes);

    // 2. Create Treatment Plan (if treatment selected)
    if (data.treatmentPlan) {
      const newPlan: TreatmentPlan = {
        id: crypto.randomUUID(), // Temp ID, will be replaced by DB ID on refresh
        patientId: patientId,
        toothNumber: data.toothNumber,
        type: data.treatmentType || 'general',
        status: 'planned',
        totalSessions: data.treatmentPlan.sessions.length,
        completedSessions: 0,
        progress: 0,
        sessions: data.treatmentPlan.sessions.map((s: any, i: number) => ({
          id: `sess-${Date.now()}-${i}`,
          number: i + 1,
          title: s.title,
          status: 'pending',
          duration: s.duration,
          schemaId: s.schemaId,
          data: {}
        })),
        cost: data.estimatedCost || 0,
        paid: 0,
        startDate: data.startDate,
        notes: data.notes
      };

      addPlan(newPlan);
    }

    setIsModalOpen(false);
  };

  /* Financial State (Real) */
  // Complete Session & Add Transaction
  const handleCompleteSession = async (planId: string, sessionId: string, cost?: number) => {
    // 1. Update Treatment Plan via Hook
    completeSession(planId, sessionId, cost || 0);

    // 2. Add Financial Transaction if cost > 0
    if (cost && cost > 0) {
      try {
        await addTransaction({
          amount: cost,
          type: 'income',
          category: 'treatment',
          description: `جلسة علاج - خطة #${planId.slice(-4)}`,
          date: new Date().toISOString(),
          paymentMethod: 'cash',
          patientId: patientId
        });
        alert(`تم إكمال الجلسة وتسجيل دفعة بقيمة ${cost.toLocaleString()} د.ع`);
      } catch (e) {
        console.error("Failed to add transaction", e);
        alert("تم إكمال الجلسة ولكن فشل تسجيل الدفعة المالية");
      }
    } else {
      alert("تم إكمال الجلسة بنجاح");
    }
  };

  const handleSmartAnalysis = () => {
    setIsAnalyzing(true);
    // Simulate AI Analysis
    setTimeout(() => {
      setIsAnalyzing(false);
      const newReport: FileItem = {
        id: `rep-${Date.now()}`,
        name: `تقرير تحليل ذكي - ${new Date().toLocaleDateString('ar-IQ')}`,
        type: 'report',
        date: new Date().toLocaleDateString('ar-IQ'),
        size: '1.2 MB'
      };
      setFiles(prev => [newReport, ...prev]);
      alert("تم اكتمال التحليل الذكي وتم حفظ التقرير في الأرشيف بنجاح");
    }, 2500);
  };

  const toggleCondition = (condition: string) => {
    if (!patientId) return;

    const currentConditions = medicalData.conditions || [];
    const newConditions = currentConditions.includes(condition)
      ? currentConditions.filter(c => c !== condition)
      : [...currentConditions, condition];

    const newData = { ...medicalData, conditions: newConditions };
    updatePatientProfile({ medicalHistoryData: newData });
  };

  // Render Helpers
  const renderOverviewTab = () => {
    // Calculate derived state for UI
    const activeTreatment = treatmentPlans.find(p => p.status !== 'completed' && p.status !== 'cancelled');
    const completedPercentage = activeTreatment ? activeTreatment.progress : 0;
    const treatmentStatus = activeTreatment ? 'قيد المعالجة' : 'لا يوجد علاج نشط';

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in">
        <Card className="p-6 border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm">الموعد القادم</p>
              <h3 className="text-xl font-bold mt-1 text-gray-900">
                {nextAppointment ? new Date(nextAppointment.date).toLocaleDateString('ar-IQ') : 'لا يوجد موعد'}
              </h3>
              <p className="text-blue-600 text-sm mt-2 font-medium flex items-center gap-2">
                {nextAppointment ? `${nextAppointment.type} - ${formatDate(nextAppointment.time)}` : '-'}
                {nextAppointment && nextAppointment.type.includes('أونلاين') && (
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200 animate-pulse">
                    أونلاين
                  </span>
                )}
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl">
              <Calendar className="text-blue-600 w-6 h-6" />
            </div>
          </div>
        </Card>
        <Card className="p-6 border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm">الرصيد المستحق</p>
              <h3 className="text-xl font-bold mt-1 text-gray-900">{outstanding.toLocaleString()} د.ع</h3>
              <p className="text-green-600 text-sm mt-2 font-medium">مدفوع: {totalPaid.toLocaleString()} د.ع</p>
            </div>
            <div className="bg-green-50 p-3 rounded-xl">
              <DollarSign className="text-green-600 w-6 h-6" />
            </div>
          </div>
        </Card>
        <Card className="p-6 border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm">حالة العلاج</p>
              <h3 className="text-xl font-bold mt-1 text-gray-900">{treatmentStatus}</h3>
              <p className="text-purple-600 text-sm mt-2 font-medium">مكتمل: {completedPercentage}%</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-xl">
              <Activity className="text-purple-600 w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* Dynamic Medical Alerts */}
        {(() => {
          const history = Array.isArray(patient?.medicalHistory)
            ? patient.medicalHistory
            : (typeof patient?.medicalHistory === 'string' ? patient.medicalHistory.split(',') : []);

          const hasAlerts = history.some(h => h.includes('حساسية') || h.includes('Allergy'));

          return hasAlerts && (
            <div className="md:col-span-3">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-4 items-start shadow-sm">
                <div className="bg-yellow-100 p-2 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-yellow-700" />
                </div>
                <div>
                  <h4 className="font-bold text-yellow-900 text-lg">تنبيه طبي</h4>
                  <p className="text-yellow-800">
                    {history.join('، ')}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Merged Medical History Section */}
        <div className="md:col-span-3 mt-8 pt-8 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg shadow-indigo-200">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-800">السجل الطبي والعلامات الحيوية</h3>
          </div>
          {renderMedicalHistoryTab()}
        </div>
      </div>
    );
  };

  const renderTreatmentPlanTab = () => {
    const activePlans = treatmentPlans.filter(p => p.status !== 'completed' && p.status !== 'cancelled');
    const archivedPlans = treatmentPlans.filter(p => p.status === 'completed' || p.status === 'cancelled');

    return (
      <div className="space-y-8 animate-in fade-in">
        {/* Chart Section */}
        <div className="space-y-6">
          <TeethChart teeth={patientTeeth} onToothClick={handleToothClick} />

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" onClick={() => addQuickPlan('endo')} className="h-auto py-3 flex flex-col gap-2">
              <Activity className="w-5 h-5 text-red-500" />
              <span>علاج العصب</span>
            </Button>
            <Button variant="outline" onClick={() => addQuickPlan('crown')} className="h-auto py-3 flex flex-col gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <span>التركيبات الثابتة</span>
            </Button>
            <Button variant="outline" onClick={() => addQuickPlan('ortho')} className="h-auto py-3 flex flex-col gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              <span>التقويم</span>
            </Button>
            <Button variant="outline" onClick={() => addQuickPlan('implant')} className="h-auto py-3 flex flex-col gap-2">
              <Syringe className="w-5 h-5 text-green-500" />
              <span>الزراعة</span>
            </Button>
          </div>

          {/* Active Treatments List */}
          <div>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900">
              <Activity className="w-5 h-5 text-blue-600" />
              خطط العلاج الجارية
            </h3>

            {activePlans.length === 0 ? (
              <div className="text-center p-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-300 transition-colors cursor-pointer" onClick={() => setIsModalOpen(true)}>
                <div className="bg-white mx-auto w-16 h-16 rounded-full flex items-center justify-center shadow-sm mb-4">
                  <Plus className="w-8 h-8 text-blue-500" />
                </div>
                <h4 className="font-bold text-gray-900 mb-1">لا توجد خطط علاج نشطة</h4>
                <p className="text-gray-500">اختر نوع العلاج من الأعلى أو اضغط على السن في المخطط</p>
              </div>
            ) : (
              <div className="space-y-6">
                {activePlans.map(plan => (
                  <Card key={plan.id} className="overflow-hidden border-0 shadow-md ring-1 ring-gray-100">
                    <div className="bg-white border-b p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-2xl shadow-blue-200 shadow-lg">
                            {plan.toothNumber !== 0 ? plan.toothNumber : 'عام'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-xl text-gray-900">
                                {plan.notes || (plan.type === 'endo' ? 'علاج عصب' : 'خطة علاج')}
                              </h4>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${plan.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                {plan.status === 'completed' ? 'مكتمل' : 'قيد المعالجة'}
                              </span>
                              {/* Online Badge - If plan contains notes saying 'Online' or derived from an online appointment, though here it's treatment plan. 
                                  Let's check if we can add it to appointments list instead if available. 
                                  Wait, this is the treatment plan render. The user asked for "Patient File" and "Upcoming Appointments".
                                  Let's scroll down to Appointments tab or just add it to the patient header if appropriate?
                                  The request said: "distinguish online bookings in the patient file". 
                                  Usually this means in the list of visits/appointments.
                              */}
                            </div>
                            <div className="text-sm text-gray-500 mt-1 flex items-center gap-3">
                              <span>تاريخ البدء: {plan.startDate}</span>
                              <span>•</span>
                              <span>الطبيب: د. أحمد محمد</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-left">
                          <span className="block text-2xl font-bold text-gray-900">{(plan.cost || 0).toLocaleString()} <span className="text-xs text-gray-500 font-normal">د.ع</span></span>
                          <span className="text-xs text-emerald-600 font-medium">مدفوع جزئياً</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="relative pt-2">
                        <div className="flex items-center justify-between text-xs font-bold text-gray-500 mb-1">
                          <span>التقدم في العلاج</span>
                          <span>{plan.progress}%</span>
                        </div>
                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${plan.status === 'completed' ? 'bg-green-500' : 'bg-blue-600'
                              }`}
                            style={{ width: `${plan.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="flex justify-between items-center mb-4">
                        <div className="text-sm text-gray-500">
                          {plan.completedSessions} من {plan.totalSessions} جلسات مكتملة
                        </div>
                        <Button
                          onClick={() => setExpandedPlanId(expandedPlanId === plan.id ? null : plan.id)}
                          variant={expandedPlanId === plan.id ? "ghost" : "primary"}
                          className={expandedPlanId === plan.id ? "" : "bg-blue-600 hover:bg-blue-700 text-white"}
                        >
                          {expandedPlanId === plan.id ? 'إخفاء التفاصيل' : 'عرض الخطة'}
                        </Button>
                      </div>

                      {expandedPlanId === plan.id && (
                        <div className="animate-in slide-in-from-top-4 fade-in duration-300 border-t pt-4">
                          <TreatmentSessionManager
                            plan={plan}
                            onUpdateSession={updateSession}
                            onCompleteSession={completeSession}
                          />

                          <div className="mt-6 pt-5 border-t border-gray-100 flex justify-between items-center">
                            <Button
                              variant="outline"
                              className="text-gray-700 border-gray-300 hover:bg-gray-50"
                              onClick={() => {
                                setSelectedLabPlan(plan);
                                setIsLabModalOpen(true);
                              }}
                            >
                              <Beaker className="w-4 h-4 ml-2 text-indigo-600" />
                              طلب معمل للسن #{plan.toothNumber}
                            </Button>

                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  // Mock Cancel

                                }}
                              >
                                إلغاء الخطة
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Archived Section */}
            {
              archivedPlans.length > 0 && (
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-500">
                    <CheckCircle className="w-5 h-5" />
                    الأرشيف والخطط المكتملة
                  </h3>
                  <div className="space-y-4 opacity-75 grayscale hover:grayscale-0 transition-all duration-500">
                    {archivedPlans.map(plan => (
                      <div key={plan.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex justify-between items-center hover:bg-white hover:shadow-sm transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center font-bold text-gray-600">
                            {plan.toothNumber}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-800">{plan.type === 'endo' ? 'علاج عصب' : 'خطة شاملة'}</h4>
                            <p className="text-xs text-gray-500">مكتمل بتاريخ: {plan.startDate}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setExpandedPlanId(expandedPlanId === plan.id ? null : plan.id)}>
                          عرض التفاصيل
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            }

          </div >
        </div >
      </div >
    );
  };



  /* Finance Tab Render */
  const renderFinanceTab = () => (
    <div className="animate-in fade-in space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div>
          <h3 className="text-xl font-bold text-gray-900">سجل المدفوعات</h3>
          <p className="text-gray-500 text-sm mt-1">إجمالي المدفوعات: {totalPaid.toLocaleString()} د.ع</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-600" />
          السجل المالي ({patientTransactions.length})
        </h3>
      </div>

      <div className="space-y-4">
        {patientTransactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">لا توجد معاملات مسجلة</div>
        ) : (
          patientTransactions.map(t => (
            <div key={t.id} className="bg-white p-4 rounded-lg border border-gray-100 flex justify-between items-center">
              <div>
                <p className="font-bold text-gray-900">{t.description}</p>
                <p className="text-sm text-gray-500">{new Date(t.date).toLocaleDateString('ar-IQ')}</p>
              </div>
              <div className="font-bold text-green-600">
                +{t.amount.toLocaleString()} د.ع
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl mb-6">
        <div>
          <h3 className="font-bold text-gray-900">سجل المعاملات المالية</h3>
          <p className="text-gray-500 text-sm">شامل الجلسات، الأدوية، والمصروفات المرتبطة</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="text-rose-600 hover:bg-rose-50 border-rose-200" onClick={() => { setFinanceModalType('expense'); setIsFinanceModalOpen(true); }}>
            <Minus className="w-4 h-4 ml-2" />
            تسجيل مصروف
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200"
            onClick={() => { setFinanceModalType('income'); setIsFinanceModalOpen(true); }}
          >
            <Plus className="w-4 h-4 ml-2" />
            إضافة دفعة
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-xs font-medium text-gray-500">رقم الوصل</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500">التاريخ</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500">الوصف</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500">المبلغ</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {patientTransactions.filter(t => t.type === 'income').map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-mono text-sm text-gray-600">#{t.id.slice(0, 8)}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{formatDate(t.date)}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{t.description}</td>
                <td className="px-6 py-4 font-bold text-emerald-600">{t.amount.toLocaleString()} د.ع</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">مدفوع</span>
                </td>
              </tr>
            ))}
            {patientTransactions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  لا توجد سجلات مالية لهذا المريض
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div >
  );

  /* --- ARCHIVE GALLERY LOGIC --- */
  const getImages = () => files.filter(f => f.type === 'xray' || f.name.match(/\.(jpg|jpeg|png|gif)$/i));
  const currentImageIndex = previewUrl ? getImages().findIndex(f => f.url === previewUrl) : -1;

  const handleNextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const images = getImages();
    if (images.length === 0) return;
    const nextIndex = (currentImageIndex + 1) % images.length;
    setPreviewUrl(images[nextIndex].url);
  };

  const handlePrevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const images = getImages();
    if (images.length === 0) return;
    const prevIndex = (currentImageIndex - 1 + images.length) % images.length;
    setPreviewUrl(images[prevIndex].url);
  };

  /* --- FINANCE MODAL LOGIC --- */


  const handleFinanceSave = async (data: any) => {
    await addTransaction({
      ...data,
      clinicId: '0', // Default clinic
      patientId: patientId // Ensure patient ID is attached
    });
    setIsFinanceModalOpen(false);
  };

  /* Archive Tab Render */
  const [archiveSubTab, setArchiveSubTab] = useState<'gallery' | 'files'>('gallery');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<FileItem | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null); // Added this line

  const handleSaveEditedImage = (newUrl: string) => {
    if (editingFile) {
      setFiles(prev => prev.map(f => f.id === editingFile.id ? { ...f, url: newUrl } : f));
      // Optionally upload the blob to server here
      setPreviewUrl(newUrl); // Update preview if open
    }
  };

  const renderArchiveTab = () => (
    <div className="animate-in fade-in space-y-6">
      {/* Sub-Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-xl w-fit mb-6">
        <button
          onClick={() => setArchiveSubTab('gallery')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${archiveSubTab === 'gallery' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            معرض الصور
          </div>
        </button>
        <button
          onClick={() => setArchiveSubTab('files')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${archiveSubTab === 'files' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            المستندات والتقارير
          </div>
        </button>
      </div>

      {archiveSubTab === 'gallery' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2">
          {/* Gallery Toolbar */}
          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-purple-600" />
                معرض الصور
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{getImages().length}</span>
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {isSelectionMode ? (
                <>
                  <span className="text-sm font-bold text-indigo-600 px-2">{selectedImageIds.length} تم تحديده</span>
                  <Button variant="ghost" size="sm" onClick={() => {
                    if (selectedImageIds.length === getImages().length) setSelectedImageIds([]);
                    else setSelectedImageIds(getImages().map(f => f.id));
                  }}>
                    {selectedImageIds.length === getImages().length ? 'إلغاء الكل' : 'تحديد الكل'}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => {
                    if (confirm(`حذف ${selectedImageIds.length} صور؟`)) {
                      setFiles(prev => prev.filter(f => !selectedImageIds.includes(f.id)));
                      setSelectedImageIds([]);
                      setIsSelectionMode(false);
                    }
                  }} disabled={selectedImageIds.length === 0}>
                    <Trash2 className="w-4 h-4 ml-1" />
                    حذف
                  </Button>
                  <div className="w-px h-6 bg-gray-200 mx-1"></div>
                  <Button variant="ghost" size="sm" onClick={() => { setIsSelectionMode(false); setSelectedImageIds([]); }}>
                    إلغاء
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setIsSelectionMode(true)} className="text-gray-600 border-gray-300">
                  <CheckCircle className="w-4 h-4 ml-2" />
                  تحديد
                </Button>
              )}

              {!isSelectionMode && (
                <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-blue-200 flex items-center gap-2">
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                  <Plus className="w-4 h-4" />
                  إضافة صورة
                </label>
              )}
            </div>
          </div>

          {/* Gallery Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {getImages().length === 0 ? (
              <div className="col-span-full py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">لا توجد صور مرفقة</p>
              </div>
            ) : (
              getImages().map(file => {
                const isSelected = selectedImageIds.includes(file.id);
                return (
                  <div key={file.id}
                    className={`group relative aspect-square bg-gray-100 rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${isSelectionMode && isSelected
                      ? 'border-indigo-500 ring-2 ring-indigo-200 ring-offset-2'
                      : 'border-transparent hover:shadow-lg'
                      }`}
                    onClick={() => {
                      if (isSelectionMode) {
                        setSelectedImageIds(prev =>
                          prev.includes(file.id) ? prev.filter(id => id !== file.id) : [...prev, file.id]
                        );
                      } else {
                        setPreviewUrl(file.url || null);
                      }
                    }}>

                    {file.url ? (
                      <img src={file.url} alt={file.name} className={`w-full h-full object-cover transition-transform duration-500 ${!isSelectionMode && 'group-hover:scale-110'}`} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    )}

                    {/* Selection Indicator Overlay */}
                    {isSelectionMode && (
                      <div className={`absolute inset-0 bg-black/10 flex items-start justify-end p-2 transition-all ${isSelected ? 'bg-indigo-500/20' : ''}`}>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white/50 border-white'
                          }`}>
                          {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                        </div>
                      </div>
                    )}

                    {/* Caption Gradient (Only in view mode) */}
                    {!isSelectionMode && (
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs truncate font-medium text-center">{file.name}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {archiveSubTab === 'files' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2">
          {/* Upload for Docs */}
          <label className="cursor-pointer bg-gradient-to-br from-blue-50 to-indigo-50 hover:to-indigo-100 p-6 rounded-2xl border border-blue-100 flex flex-col items-center text-center transition-all group">
            <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleDocumentUpload} />
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-blue-600 mb-3 group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">رفع تقارير طبية</h3>
            <p className="text-gray-500 text-xs">تحاليل، تقارير خارجية، وصفات</p>
          </label>

          {/* 2. Documents Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                المستندات والتقارير
              </h3>
              <span className="text-xs text-gray-500">{files.filter(f => f.type !== 'xray').length} ملف</span>
            </div>
            <table className="w-full text-right">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="px-6 py-3">اسم الملف</th>
                  <th className="px-6 py-3">التاريخ</th>
                  <th className="px-6 py-3">الحجم</th>
                  <th className="px-6 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {files.filter(f => f.type !== 'xray').map((file) => (
                  <tr key={file.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium text-gray-900">{file.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{file.date}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{file.size}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); setPreviewFile(file); }} title="عرض الملف">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('حذف الملف؟')) setFiles(prev => prev.filter(f => f.id !== file.id));
                        }} title="حذف الملف">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {files.filter(f => f.type !== 'xray').length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-400 text-sm">لا توجد مستندات</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      <FilePreviewModal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
      />

      {/* Image Preview Modal (Gallery style) */}
      {
        previewUrl && (
          <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setPreviewUrl(null)}>
            {/* Close Button */}
            <button className="absolute top-4 right-4 text-white/50 hover:text-white p-2 z-50 transition-colors" onClick={() => setPreviewUrl(null)}>
              <X className="w-8 h-8" />
            </button>

            {/* Toolbar */}
            <div className="absolute top-4 left-4 flex gap-2 z-50">
              <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors" onClick={(e) => {
                e.stopPropagation();
                const currentImg = getImages()[currentImageIndex];
                if (currentImg) {
                  setEditingFile(currentImg);
                  setIsEditorOpen(true);
                }
              }}>
                <Edit2 className="w-4 h-4" />
                <span className="text-sm font-medium">تعديل</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-full backdrop-blur-md transition-colors" onClick={(e) => {
                e.stopPropagation();
                const currentImg = getImages()[currentImageIndex];
                if (currentImg) handleArchiveAnalysis(currentImg.id);
              }}>
                <Brain className="w-4 h-4" />
                <span className="text-sm font-medium">تحليل AI</span>
              </button>
            </div>

            {/* Navigation Left */}
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 p-4 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all hidden md:block"
              onClick={handlePrevImage}
            >
              <ChevronLeft className="w-10 h-10" />
            </button>

            {/* Main Image */}
            <img src={previewUrl} className="max-w-full max-h-[90vh] rounded-lg shadow-2xl select-none" onClick={e => e.stopPropagation()} />

            {/* Navigation Right */}
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 p-4 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all hidden md:block"
              onClick={handleNextImage}
            >
              <ChevronRight className="w-10 h-10" />
            </button>

            {/* Image Info / Counter */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur text-white px-4 py-1.5 rounded-full text-sm">
              {currentImageIndex + 1} / {getImages().length}
            </div>
          </div>
        )
      }

      {/* Image Editor Modal */}
      {
        isEditorOpen && editingFile && (
          <ImageEditorModal
            isOpen={isEditorOpen}
            imageUrl={editingFile.url || ''}
            onClose={() => setIsEditorOpen(false)}
            onSave={handleSaveEditedImage}
          />
        )
      }


    </div >
  );

  // Need to add state locally for the editor:
  // (We'll do this via a separate replace call if needed, but we can try to inject it before this function if we were editing the whole file,
  // but since we are editing a block, we need to ensure the state variables exist appropriately.
  // Wait, I can't inject state inside renderArchiveTab if I don't change the beginning of it.
  // I will assume I need to add state variables at the start of renderArchiveTab in a separate call or this will fail compilation.
  // Actually, I can replace the whole renderArchiveTab function start to finish to include the new state.)

  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);

  const { history: aiHistory, uploading: aiUploading, analyzing: aiAnalyzing, analyzeImage, analyzeExistingImage, refresh: refreshAI } = useAIAnalysis(patientId);

  // Chat History State - DB Backed
  const [chatHistory, setChatHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchChats = async () => {
      if (!patientId) return;
      const { data } = await supabase
        .from('smart_assistant_chats')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (data) {
        setChatHistory(data.map(c => ({
          id: c.id,
          date: new Date(c.created_at).toLocaleDateString('ar-IQ'),
          summary: c.summary,
          messages: c.messages
        })));
      }
    };
    fetchChats();
  }, [patientId]);

  // Workflow Step 1: User Selects File
  const handleAIFileSelect = (file: File) => {
    setFileToAnalyze(file);
    setPreviewUrl(URL.createObjectURL(file));
    setSelectedAnalysis(null);
    setAnalysisNotes('');
  };

  // Workflow Step 2: User Clicks Analyze
  const handleManualAnalyze = async () => {
    if (!previewUrl) return;

    let result;
    if (fileToAnalyze) {
      // Upload and Analyze
      result = await analyzeImage(fileToAnalyze);
    } else {
      // Analyze Existing URL (from Archive)
      result = await analyzeExistingImage(previewUrl);
    }

    if (result) {
      const displayResult = {
        image_url: previewUrl,
        result_json: result,
        created_at: new Date().toISOString(),
        notes: analysisNotes // We might want to save this later
      };
      setSelectedAnalysis(displayResult);
      // Clear preview state to show result
      setPreviewUrl(null);
      setFileToAnalyze(null);
    }
  };

  const handleSaveChat = async (messages: any[]) => {
    if (!patientId) return;

    // Save to DB
    const summaryText = messages.length > 0 ? messages[messages.length - 1].text.substring(0, 50) + '...' : 'محادثة جديدة';

    try {
      const { data, error } = await supabase
        .from('smart_assistant_chats')
        .insert({
          patient_id: patientId,
          doctor_id: user?.id,
          title: 'محادثة مساعد ذكي',
          summary: `محادثة (${messages.length} رسائل) - ${summaryText}`,
          messages: messages
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newChatLog = {
          id: data.id,
          date: new Date(data.created_at).toLocaleDateString('ar-IQ'),
          summary: data.summary,
          messages: data.messages
        };
        setChatHistory(prev => [newChatLog, ...prev]);
        toast.success('تم حفظ المحادثة في سجل التشخيصات بنجاح');
      }
    } catch (err) {
      console.error('Error saving chat:', err);
      toast.error('فشل حفظ المحادثة');
    }
  };

  const handleDeleteAnalysis = (id: string, type: 'image' | 'chat') => {
    if (window.confirm('هل أنت متأكد من حذف هذا السجل؟')) {
      if (type === 'image') {
        alert('تم حذف السجل بنجاح (محاكاة)');
      } else {
        setChatHistory(prev => prev.filter(c => c.id !== id));
      }
    }
  };

  const handleSaveToArchive = async (item: any, type: 'image' | 'chat') => {
    if (type === 'image') {
      try {
        const { data, error } = await supabase
          .from('patient_files')
          .insert({
            patient_id: patientId,
            name: `تشخيص AI - ${new Date().toLocaleDateString('ar-IQ')}`,
            type: 'xray',
            url: item.image_url || item.imageUrl,
            size: 'AI Processed',
            date: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;

        if (data) {
          const newFile: FileItem = {
            id: data.id,
            name: data.name,
            type: data.type as any,
            date: new Date(data.created_at).toLocaleDateString('ar-IQ'),
            size: data.size || '-',
            url: data.url
          };
          setFiles(prev => [newFile, ...prev]);
          alert('تم حفظ الصورة والتشخيص في الأرشيف (قسم الصور)');
        }
      } catch (err) {
        console.error('Archive Save Error:', err);
        alert('فشل الحفظ في الأرشيف');
      }
    } else {
      // ... existing chat save logic ...
      // Create a Blob for the Chat Content
      const chatContent = `
        سجل محادثة المساعد الطبي الذكي
        التاريخ: ${item.date}
        الملخص: ${item.summary}
        ----------------------------------------
        ${item.messages ? item.messages.map((m: any) => `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.sender === 'user' ? 'الطبيب' : 'المساعد'}: ${m.text}`).join('\n\n') : 'لا توجد تفاصيل'}
      `;
      const blob = new Blob([chatContent], { type: 'text/plain;charset=utf-8' });
      const fileName = `chat-log-${Date.now()}.txt`;
      const file = new File([blob], fileName, { type: 'text/plain' });

      try {
        const result = await uploadFile(file, 'patient-docs', `${patientId}/reports`);

        if (result) {
          const { data, error } = await supabase
            .from('patient_files')
            .insert({
              patient_id: patientId,
              name: `محادثة مساعد ذكي - ${new Date().toLocaleDateString('ar-IQ')}`,
              type: 'report',
              url: result.url,
              size: '15 KB',
              date: new Date().toISOString()
            })
            .select()
            .single();

          if (error) throw error;

          if (data) {
            const newDoc: FileItem = {
              id: data.id,
              name: data.name,
              type: data.type as any,
              date: new Date(data.created_at).toLocaleDateString('ar-IQ'),
              size: data.size,
              url: data.url
            };
            setFiles(prev => [newDoc, ...prev]);
            toast.success('تم حفظ المحادثة في المستندات (قسم التقارير)');
          }
        }
      } catch (err) {
        console.error('Chat Archive Error:', err);
        toast.error('فشل حفظ المحادثة');
      }
    }
  };

  // Fixed Archive Analysis Handoff
  const handleArchiveAnalysis = async (imageId: string) => {
    const image = files.find(f => f.id === imageId);
    if (image) {
      // Switch to Smart Services tab
      setActiveTab('smart');
      setIsAnalysisModalOpen(true);

      // Setup Preview Mode
      const mockUrl = image.url || 'https://images.unsplash.com/photo-1606811971618-4486d14f3f72';
      setPreviewUrl(mockUrl);
      setFileToAnalyze(null); // It's an existing file
      setSelectedAnalysis(null); // Ensure we don't show old result
      setAnalysisNotes('');
    }
  };

  // Render Helper for Analysis Modal Content
  const renderAnalysisModalContent = () => {
    // 1. Result View
    if (selectedAnalysis) {
      return (
        <div className="animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-lg text-gray-800">نتيجة التحليل</h4>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleSaveToArchive(selectedAnalysis, 'image')}>
                <Save className="w-4 h-4 ml-2" />
                حفظ في سجل التشخيص
              </Button>
              <Button variant="ghost" size="sm" onClick={() => {
                setSelectedAnalysis(null);
                setPreviewUrl(null);
              }}>
                <Plus className="w-4 h-4 ml-2" />
                تشخيص جديد
              </Button>
            </div>
          </div>
          <AnalysisResultCard
            imageUrl={selectedAnalysis.image_url}
            result={selectedAnalysis.result_json}
            date={selectedAnalysis.created_at}
          />
        </div>
      );
    }

    // 2. Preview & Analyze View
    if (previewUrl) {
      return (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200 relative group">
            <img src={previewUrl} alt="Preview" className="w-full h-64 object-contain bg-black/5" />
            {!aiAnalyzing && !aiUploading && (
              <button
                onClick={() => setPreviewUrl(null)}
                className="absolute top-2 right-2 bg-white/90 p-2 rounded-full shadow-sm hover:text-red-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">إضافة ملاحظات للطبيب أو النظام (اختياري)</label>
            <textarea
              value={analysisNotes}
              onChange={(e) => setAnalysisNotes(e.target.value)}
              className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-gray-50 focus:bg-white transition-all text-sm"
              placeholder="اكتب أي ملاحظات حول الصورة هنا..."
              rows={2}
              disabled={aiAnalyzing || aiUploading}
            />
          </div>

          {(aiAnalyzing || aiUploading) && (
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-4">
              <div className="w-12 h-12 relative flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div className="flex-1">
                <p className="font-bold text-blue-800 mb-1">{aiUploading ? 'جاري رفع الصورة...' : 'جاري تحليل الصورة بالذكاء الاصطناعي...'}</p>
                <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full animate-pulse w-2/3"></div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleManualAnalyze}
              className="w-full h-11 text-base font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20 border-0 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              disabled={aiAnalyzing || aiUploading}
            >
              <span className="flex items-center justify-center gap-2 w-full">
                {aiAnalyzing ? 'جاري العمل...' : 'بدء التحليل الآن'}
                {!aiAnalyzing && <Brain className="w-5 h-5" />}
              </span>
            </Button>
          </div>
        </div>
      );
    }

    // 3. Upload View
    return (
      <div>
        <p className="text-gray-600 mb-4">
          قم برفع صورة الأشعة (X-Ray) وسيقوم النظام بتحليلها فوراً.
        </p>
        <ImageUploadZone
          onFileSelect={handleAIFileSelect}
          isUploading={false} // Loading handles in Preview Mode now
        />
      </div>
    );
  };


  const renderSmartServicesTab = () => (
    <div className="animate-in fade-in space-y-8">
      {/* Header Banner Removed */}
      <div className="hidden"></div>

      {/* Service Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Image Analysis Card */}
        <div
          onClick={() => {
            setSelectedAnalysis(null); // Reset for new upload
            setIsAnalysisModalOpen(true);
          }}
          className="group cursor-pointer bg-white rounded-2xl p-1 border border-transparent hover:border-indigo-200 shadow-sm hover:shadow-xl transition-all duration-300"
        >
          <div className="relative h-48 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl overflow-hidden mb-4 flex items-center justify-center group-hover:scale-[0.98] transition-transform">
            <div className="absolute inset-0 bg-grid-indigo-500/[0.05] [mask-image:linear-gradient(0deg,white,transparent)]" />
            <div className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-500">
              <Brain className="w-10 h-10" />
            </div>
          </div>
          <div className="px-5 pb-5">
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">تحليل الصور (AI Diagnosis)</h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-4">
              رفع صور الأشعة للكشف التلقائي عن التسوسات والالتهابات بدقة عالية مع تقرير فوري.
            </p>
            <div className="flex items-center text-indigo-600 font-bold text-sm">
              بدء التحليل <ArrowRight className="w-4 h-4 mr-2 group-hover:translate-x-[-4px] transition-transform" />
            </div>
          </div>
        </div>

        {/* Smart Assistant Card */}
        <div
          onClick={() => setIsChatModalOpen(true)}
          className="group cursor-pointer bg-white rounded-2xl p-1 border border-transparent hover:border-purple-200 shadow-sm hover:shadow-xl transition-all duration-300"
        >
          <div className="relative h-48 bg-gradient-to-br from-purple-50 to-fuchsia-50 rounded-xl overflow-hidden mb-4 flex items-center justify-center group-hover:scale-[0.98] transition-transform">
            <div className="absolute inset-0 bg-grid-purple-500/[0.05] [mask-image:linear-gradient(0deg,white,transparent)]" />
            <div className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform duration-500">
              <MessageSquare className="w-10 h-10" />
            </div>
          </div>
          <div className="px-5 pb-5">
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">المساعد الذكي (Smart Assistant)</h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-4">
              محادثة تفاعلية مع مساعد ذكي للحصول على توصيات علاجية، وكتابة تقارير، والإجابة على الأسئلة.
            </p>
            <div className="flex items-center text-purple-600 font-bold text-sm">
              فتح المحادثة <ArrowRight className="w-4 h-4 mr-2 group-hover:translate-x-[-4px] transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <HistoryIcon className="w-5 h-5 text-gray-500" />
            سجل التشخيصات والتحليلات
            <div className="flex gap-2">
              {/* Filter buttons could go here */}
            </div>
          </h3>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {aiHistory.length === 0 && chatHistory.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-gray-300" />
              </div>
              <h4 className="text-lg font-bold text-gray-900">لا يوجد سجل نشاط</h4>
              <p className="text-gray-500">لم يتم إجراء أي عمليات تحليل أو محادثات مع المساعد الذكي بعد.</p>
            </div>
          ) : (
            <table className="w-full text-right">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">النوع</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">التاريخ</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">النتيجة / الملخص</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* AI Image History */}
                {aiHistory.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <Brain className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-gray-900">تحليل صورة</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(item.created_at).toLocaleDateString('ar-IQ')}
                      <span className="block text-xs text-gray-400">{new Date(item.created_at).toLocaleTimeString('ar-IQ')}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                             ${item.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                           `}>
                        {item.status === 'completed' ? 'مكتمل' : 'جاري المعالجة'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-50" onClick={() => {
                          setSelectedAnalysis(item);
                          setIsAnalysisModalOpen(true);
                        }}>
                          عرض
                        </Button>
                        <Button size="sm" variant="ghost" className="text-gray-600 hover:bg-gray-50" onClick={() => handleSaveToArchive(item, 'image')}>
                          <Archive className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => handleDeleteAnalysis(item.id, 'image')}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {/* Chat Mock History */}
                {chatHistory.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-gray-900">محادثة</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.date}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm truncate max-w-xs">{item.summary}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-50" onClick={() => setIsChatModalOpen(true)}>
                          متابعة
                        </Button>
                        <Button size="sm" variant="ghost" className="text-gray-600 hover:bg-gray-50" onClick={() => handleSaveToArchive(item, 'chat')}>
                          <Archive className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => handleDeleteAnalysis(item.id, 'chat')}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div >
  );



  /* Medical History State - Integrated locally for now */
  /* Medical History State - Integrated via usePatient */
  // We use the patient.medicalHistoryData directly from the hook primarily, 
  // but we might want local state for the form if editing.

  // For now simple toggle:


  const renderMedicalHistoryTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in">

      {/* Sidebar - Summary & Vitals */}
      <div className="lg:col-span-4 space-y-6">
        {/* Vital Signs Card */}
        <Card className="p-0 overflow-hidden border-orange-200">
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 border-b border-orange-200 flex justify-between items-center">
            <h3 className="font-bold text-orange-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-600" />
              العلامات الحيوية
            </h3>
            <span className="text-xs text-orange-700 bg-white/50 px-2 py-1 rounded">آخر تحديث: اليوم</span>
          </div>

          <div className="p-4 grid grid-cols-2 gap-4">
            <div className="bg-white p-3 rounded-lg border border-orange-100 shadow-sm text-center">
              <span className="text-xs text-gray-500 block mb-1">الضغط (BP)</span>
              {isEditingHistory ? (
                <input
                  value={tempVitals.bp}
                  onChange={e => setTempVitals({ ...tempVitals, bp: e.target.value })}
                  className="w-full text-center font-bold text-gray-900 border-b border-orange-300 focus:outline-none"
                />
              ) : (
                <span className="font-bold text-xl text-gray-800 font-mono">{medicalData.vitals.bp}</span>
              )}
            </div>
            <div className="bg-white p-3 rounded-lg border border-orange-100 shadow-sm text-center">
              <span className="text-xs text-gray-500 block mb-1">السكر (Mg/dl)</span>
              {isEditingHistory ? (
                <input
                  value={tempVitals.sugar}
                  onChange={e => setTempVitals({ ...tempVitals, sugar: e.target.value })}
                  className="w-full text-center font-bold text-gray-900 border-b border-orange-300 focus:outline-none"
                />
              ) : (
                <span className="font-bold text-xl text-gray-800 font-mono">{medicalData.vitals.sugar}</span>
              )}
            </div>
            <div className="bg-white p-3 rounded-lg border border-orange-100 shadow-sm text-center">
              <span className="text-xs text-gray-500 block mb-1">النبض (BPM)</span>
              {isEditingHistory ? (
                <input
                  value={tempVitals.pulse}
                  onChange={e => setTempVitals({ ...tempVitals, pulse: e.target.value })}
                  className="w-full text-center font-bold text-gray-900 border-b border-orange-300 focus:outline-none"
                />
              ) : (
                <span className="font-bold text-xl text-gray-800 font-mono">{medicalData.vitals.pulse}</span>
              )}
            </div>
            <div className="bg-white p-3 rounded-lg border border-orange-100 shadow-sm text-center">
              <span className="text-xs text-gray-500 block mb-1">الوزن (Kg)</span>
              {isEditingHistory ? (
                <input
                  value={tempVitals.weight}
                  onChange={e => setTempVitals({ ...tempVitals, weight: e.target.value })}
                  className="w-full text-center font-bold text-gray-900 border-b border-orange-300 focus:outline-none"
                />
              ) : (
                <span className="font-bold text-xl text-gray-800 font-mono">{medicalData.vitals.weight}</span>
              )}
            </div>
          </div>
          <div className="p-4 pt-0">
            <Button
              variant="outline"
              className={`w-full ${isEditingHistory ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'text-orange-700 hover:bg-orange-50 border-orange-200'}`}
              onClick={() => {
                if (isEditingHistory) {
                  // Save
                  const newData = { ...medicalData, vitals: tempVitals };
                  // We don't setMedicalData locally because we rely on 'medicalData' variable derived from 'patient'
                  // setMedicalData(newData); // Removed local set
                  if (patientId) updatePatientProfile({ medicalHistoryData: newData });
                  setIsEditingHistory(false);
                } else {
                  // Edit
                  setTempVitals(prev => ({ ...prev, ...medicalData.vitals }));
                  setIsEditingHistory(true);
                }
              }}
            >
              {isEditingHistory ? <><Save className="w-4 h-4 ml-2" /> حفظ السجل الطبي</> : <><Edit2 className="w-4 h-4 ml-2" /> تعديل السجل الطبي</>}
            </Button>
          </div>
        </Card>

        {/* Alerts Card */}
        <Card className="p-5 border-l-4 border-l-red-500 bg-red-50/20">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2">
            <HeartPulse className="w-5 h-5 text-red-500" />
            تنبيهات طبية هامة
          </h3>
          <div className="space-y-3">
            {medicalData.allergies.map(allergy => (
              <div key={allergy} className="bg-red-100 text-red-800 px-3 py-2 rounded-lg text-sm font-bold flex justify-between items-center shadow-sm">
                <span>حساسية: {allergy === 'penicillin' ? 'بنسيلين' : allergy}</span>
                <AlertTriangle className="w-4 h-4" />
              </div>
            ))}
            {medicalData.conditions.includes('hypertension') && (
              <div className="bg-yellow-50 text-yellow-800 px-3 py-2 rounded-lg text-sm font-bold border border-yellow-200 flex justify-between items-center">
                <span>تحذير: ضغط دم مرتفع</span>
                <Activity className="w-4 h-4" />
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Main Content - History Form */}
      <div className="lg:col-span-8 space-y-6">
        <Card className="p-6">
          <h3 className="font-bold text-lg text-gray-800 mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            استبيان التاريخ الطبي
          </h3>

          <div className="space-y-8">
            {/* Systemic Diseases */}
            <div>
              <h4 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider">الأمراض المزمنة</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {['diabetes', 'hypertension', 'heart_disease', 'asthma', 'hepatitis', 'bleeding_disorder'].map(cond => (
                  <label key={cond} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${medicalData.conditions.includes(cond) ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'
                    }`}>
                    <div className={`w-5 h-5 rounded flex items-center justify-center border ${medicalData.conditions.includes(cond) ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'
                      } ${!isEditingHistory ? 'opacity-60' : ''}`}>
                      {medicalData.conditions.includes(cond) && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      disabled={!isEditingHistory}
                      checked={medicalData.conditions.includes(cond)}
                      onChange={() => toggleCondition(cond)}
                    />
                    <span className={`text-sm font-bold ${medicalData.conditions.includes(cond) ? 'text-blue-700' : 'text-gray-600'}`}>
                      {cond === 'diabetes' ? 'السكري' :
                        cond === 'hypertension' ? 'ضغط الدم' :
                          cond === 'heart_disease' ? 'مريض قلب' :
                            cond === 'asthma' ? 'الربو' :
                              cond === 'hepatitis' ? 'التهاب الكبد' : 'سيولة الدم'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h4 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider">سجل الزيارات والعمليات</h4>
              <div className="space-y-4 relative before:absolute before:inset-y-0 before:right-2.5 before:w-0.5 before:bg-gray-200 before:top-2 before:bottom-2">
                {patientAppointments.length > 0 ? (
                  patientAppointments
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((appt, i) => (
                      <div key={appt.id} className="relative flex gap-4">
                        <div className={`w-6 h-6 rounded-full shrink-0 z-10 border-2 border-white shadow-sm mt-1 ${appt.type === 'surgery' ? 'bg-red-500' :
                          appt.type === 'emergency' ? 'bg-orange-500' : 'bg-blue-500'
                          }`}></div>
                        <div className="bg-gray-50 rounded-lg p-3 flex-1 border border-gray-100">
                          <div className="flex justify-between items-start">
                            <h4 className="font-bold text-gray-800 text-sm">{appt.type === 'surgery' ? 'عملية جراحية' : (appt.type === 'consultation' ? 'كشفية' : 'جلسة علاج')}</h4>
                            <span className="text-xs text-gray-500 dir-ltr">{formatDate(appt.date)}</span>
                          </div>
                          <p className="text-gray-600 text-xs mt-1">د. {appt.doctorName} - {appt.status === 'completed' ? 'مكتمل' : 'قادم'}</p>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">لا توجد زيارات مسجلة</div>
                )}
              </div>
            </div>

          </div>
        </Card>
      </div>
    </div>
  );

  if (patientLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">جاري تحميل ملف المريض...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 font-bold text-lg">لم يتم العثور على المريض</p>
          <Button className="mt-4" onClick={() => navigate('/doctor')}>
            العودة للقائمة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 mb-8 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/doctor')}>
                <ArrowRight className="w-5 h-5" />
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        className="px-2 py-1 text-lg font-bold text-gray-900 border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          if (patient && tempName.trim()) {
                            updatePatientProfile({ name: tempName });
                            // setPatient({ ...patient, name: tempName }); // Removed local set as hooks handle it
                            setIsEditingName(false);
                          }
                        }}
                        className="p-1 text-green-600 hover:bg-green-50 rounded-full"
                        title="حفظ"
                      >
                        <Save className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setTempName(patient?.name || '');
                          setIsEditingName(false);
                        }}
                        className="p-1 text-red-500 hover:bg-red-50 rounded-full"
                        title="إلغاء"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2 group">
                      ملف المريض: {patient?.name || 'جاري التحميل...'}
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50"
                        title="تعديل الاسم"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <span className={`text-xs font-normal px-2 py-0.5 rounded-full ${patient?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {patient?.status === 'active' ? 'نشط' : (patient?.status === 'emergency' ? 'طوارئ' : 'غير نشط')}
                      </span>
                    </h1>
                  )}
                </div>
                <p className="text-xs text-gray-500">رقم الملف: #{patientId?.slice(0, 8) || '...'} • آخر زيارة: {patient?.lastVisit ? new Date(patient.lastVisit).toLocaleDateString('en-GB') : '-'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm"><SettingsIcon className="w-4 h-4 ml-2" /> إعدادات</Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-6 space-x-reverse overflow-x-auto">
            {[
              { id: 'overview', label: 'نظرة عامة' },
              { id: 'treatment', label: 'خطة العلاج' },

              { id: 'smart', label: 'الخدمات الذكية' },
              { id: 'archive', label: 'الأرشيف' },
              { id: 'finance', label: 'المالية' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-3 pt-1 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'treatment' && renderTreatmentPlanTab()}
        {activeTab === 'medical' && renderMedicalHistoryTab()}
        {activeTab === 'smart' && renderSmartServicesTab()}
        {activeTab === 'archive' && renderArchiveTab()}
        {activeTab === 'finance' && renderFinanceTab()}
      </div>

      <ToothInteractionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        toothNumber={selectedTooth?.number || 0}
        initialData={selectedTooth || undefined}
        onSave={handleModalSave}
        availableTreatments={clinicTreatments.map(t => ({
          id: t.id,
          name: t.name,
          category: t.category,
          basePrice: t.basePrice,
          costEstimate: t.costEstimate,
          profitMargin: t.profitMargin,
          popularity: t.popularity,
          expectedSessions: t.expectedSessions,
          isActive: t.isActive,
          isComplex: t.isComplex,
          totalRevenue: t.totalRevenue || 0
        }))}
        initialTab={modalInitialTab}
      />

      {/* Tooth Details Popup for Existing Teeth */}
      <Modal
        isOpen={isDetailsPopupOpen}
        onClose={() => setIsDetailsPopupOpen(false)}
        title={`تفاصيل السن #${selectedTooth?.number}`}
        size="md"
      >
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <h4 className="font-bold text-gray-900 mb-2">الحالة الحالية</h4>
            <div className="flex items-center gap-2 text-blue-800">
              <span className="font-medium">
                {selectedTooth?.condition === 'healthy' ? 'سليم' :
                  selectedTooth?.condition === 'decayed' ? 'تسوس' :
                    selectedTooth?.condition === 'missing' ? 'مفقود' :
                      selectedTooth?.condition === 'filled' ? 'محشو' :
                        selectedTooth?.condition === 'crown' ? 'تاج' :
                          selectedTooth?.condition}
              </span>
            </div>
            {selectedTooth?.notes && (
              <p className="text-sm text-gray-600 mt-2 bg-white/50 p-2 rounded">
                ملاحظات: {selectedTooth.notes}
              </p>
            )}
          </div>

          {/* History Section */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              تاريخ العلاجات السابقة
            </h4>
            {(selectedTooth?.existingTreatments?.length || 0) > 0 ? (
              <ul className="space-y-2">
                {selectedTooth!.existingTreatments!.map((tx, idx) => (
                  <li key={idx} className="text-sm flex items-center gap-2 text-gray-600 bg-white p-2 rounded shadow-sm border-r-2 border-gray-300">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    {tx}
                  </li>
                ))}
              </ul>
            ) : treatmentPlans.filter(p => p.toothNumber === selectedTooth?.number && p.status === 'completed').length > 0 ? (
              <ul className="space-y-2">
                {treatmentPlans.filter(p => p.toothNumber === selectedTooth?.number && p.status === 'completed').map((plan, idx) => (
                  <li key={plan.id} className="text-sm flex items-center justify-between text-gray-600 bg-white p-2 rounded shadow-sm border-r-2 border-green-500">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      {plan.type === 'endo' ? 'علاج جذور' : plan.type === 'implant' ? 'زراعة' : plan.type === 'prosthetic' ? 'تركيبات' : 'علاجات عامة'}
                    </span>
                    <span className="text-xs text-gray-400">{new Date(plan.startDate).toLocaleDateString('en-GB')}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 italic">لا توجد علاجات سابقة مسجلة</p>
            )}
          </div>

          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              الخطط العلاجية النشطة
            </h4>
            {treatmentPlans.filter(p => p.toothNumber === selectedTooth?.number && p.status !== 'completed').length > 0 ? (
              <ul className="space-y-3">
                {treatmentPlans.filter(p => p.toothNumber === selectedTooth?.number && p.status !== 'completed').map((plan, idx) => (
                  <li key={plan.id} className="text-sm bg-white p-3 rounded-lg shadow-sm border border-blue-100 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">{idx + 1}</span>
                        <div>
                          <span className="font-bold text-gray-800 block">
                            {plan.type === 'endo' ? 'علاج جذور (Root Canal)' :
                              plan.type === 'implant' ? 'زراعة أسنان (Implant)' :
                                plan.type === 'prosthetic' ? 'تركيبات (Prosthetic)' : 'علاجات عامة'}
                          </span>
                          <span className="text-[10px] text-gray-400 block mt-0.5">ID: {plan.id.slice(0, 6)} • {new Date(plan.startDate).toLocaleDateString('en-GB')}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCancelPlan(plan.id)}
                        className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-all"
                        title="إلغاء الخطة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">التقدم: {plan.completedSessions} / {plan.totalSessions} جلسات</span>
                        <span className="font-bold text-blue-600">{Math.round((plan.completedSessions / plan.totalSessions) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${(plan.completedSessions / plan.totalSessions) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 italic py-2 text-center">لا توجد خطط نشطة حالياً</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <Button
              onClick={handleEditCondition}
              variant="outline"
              className="h-12 border-blue-200 hover:bg-blue-50 hover:border-blue-300 text-blue-700"
            >
              <FileText className="w-4 h-4 ml-2" />
              تعديل حالة السن
              <span className="block text-[10px] text-blue-400 font-normal mr-1">(تبويب الحالة)</span>
            </Button>
            <Button
              onClick={handleAddTreatment}
              className="h-12 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
            >
              <Plus className="w-4 h-4 ml-2" />
              إضافة علاج جديد
              <span className="block text-[10px] text-blue-200 font-normal mr-1">(تبويب العلاج)</span>
            </Button>
          </div>
        </div>
      </Modal>


      {/* Unified Lab Order Modal */}
      <CreateOrderModal
        isOpen={isLabModalOpen}
        onClose={() => setIsLabModalOpen(false)}
        clinicId={effectiveClinicId}
        patientId={patientId}
        patientName={patient?.name}
      // If a specific plan triggered this, we could pre-fill notes, but the modal is generic now.
      // We can pass initial notes if we extend the modal props later.
      />

      {/* Image Analysis Modal */}
      <Modal
        isOpen={isAnalysisModalOpen}
        onClose={() => setIsAnalysisModalOpen(false)}
        title="تشخيص الصور بالأشعة والذكاء الاصطناعي"
      >
        <div className="space-y-6">
          {renderAnalysisModalContent()}
        </div>
      </Modal>

      {/* Smart Assistant Modal */}
      <Modal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        title="المساعد الطبي الذكي"
        contentClassName="p-0 overflow-hidden flex flex-col h-[65vh]"
        size="lg"
      >
        <div className="flex-1 flex flex-col h-full overflow-hidden min-h-0">
          <SmartAssistantChat patientId={patient.id} patientName={patient.name} onSave={handleSaveChat} />
        </div>
      </Modal>
      {/* Financial Transaction Modal */}
      <ComprehensiveTransactionModal
        isOpen={isFinanceModalOpen}
        onClose={() => setIsFinanceModalOpen(false)}
        type={financeModalType}
        clinicId={user?.id || '0'} // Dynamic from Auth
        preselectedPatientId={patientId}
        onSave={async (data) => {
          try {
            await addTransaction(data);
            setIsFinanceModalOpen(false);
            alert('تم حفظ المعاملة بنجاح');
          } catch (e) {
            console.error(e);
            alert('حدث خطأ أثناء الحفظ');
          }
        }}
      />
    </div>
  );
};
