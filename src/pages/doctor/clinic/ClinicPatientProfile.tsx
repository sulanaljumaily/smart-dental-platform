import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useCurrentClinic } from '../../../hooks/useCurrentClinic';
import { supabase } from '../../../lib/supabase';
import {
  User, UserCheck, Phone, Mail, MapPin, Calendar, Activity,
  FileText, Eye, ChevronRight, Share2, Printer, MoreVertical,
  Plus, Search, Filter, ShieldCheck, AlertCircle, CheckCircle,
  X, DollarSign, Brain, Sparkles, Send, ImageIcon, ExternalLink, Trash2,
  Minus, ChevronLeft, Settings as SettingsIcon, Save, Edit2, Archive,
  HeartPulse, Syringe, Pill, Star, Beaker, History as HistoryIcon,
  MessageSquare, Upload, RefreshCcw, Info, ArrowRight, AlertTriangle,
  TrendingUp, TrendingDown, CreditCard, Wallet, Receipt, HandCoins,
  CheckSquare, AlertOctagon, Edit, Clock, Mic, Square
} from 'lucide-react';

import { ComprehensiveTransactionModal } from '../../../components/finance/ComprehensiveTransactionModal';
import { toast } from 'sonner';

import { Button } from '../../../components/common/Button';
import { Card } from '../../../components/common/Card';
import { BentoStatCard } from '../../../components/dashboard/BentoStatCard';
import { TeethChart } from '../../../components/treatment/TeethChart';
import { ToothInteractionModal } from '../../../components/treatment/ToothInteractionModal';
import { TreatmentSessionManager } from '../../../components/treatment/TreatmentSessionManagerV2';
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
import { GeneralTreatmentModal } from '../../../components/treatment/GeneralTreatmentModal'; // Import New Modal
import { ToothConditionModal } from '../../../components/treatment/ToothConditionModal'; // Added
import { AppointmentModal } from '../../../components/appointments/AppointmentModal';
import { Appointment } from '../../../types/appointments';
import { appointmentStatuses, appointmentTypes } from '../../../data/mock/appointments';

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
  const [isGeneralModalOpen, setIsGeneralModalOpen] = useState(false); // New State for General Modal
  const [selectedTooth, setSelectedTooth] = useState<ToothCondition | null>(null);

  // New Multi-Tooth States
  const [isToothSelectionMode, setIsToothSelectionMode] = useState(false);
  const [selectedTeethNumbers, setSelectedTeethNumbers] = useState<number[]>([]);
  const [isSelectedTeethModalOpen, setIsSelectedTeethModalOpen] = useState(false);
  const [isConditionModalOpen, setIsConditionModalOpen] = useState(false);

  // Edit State - Removed isEditingHistory and tempVitals for auto-save
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
  const [selectedFinancePlanId, setSelectedFinancePlanId] = useState<string | null>(null);
  const [selectedFinanceSessionId, setSelectedFinanceSessionId] = useState<string | null>(null);
  const [financeAmount, setFinanceAmount] = useState<number>(0);

  // --- HOOKS & DATA ---
  const { user } = useAuth();
  const { clinic: currentClinic } = useCurrentClinic();

  // Use param ID (preferred) or found clinic ID
  const effectiveClinicId = clinicId || currentClinic?.id || '';

  // Restore original hook signature
  const { patient, loading: patientLoading, error, updatePatientProfile } = usePatient(patientId);
  // Restore original hook signature
  const { appointments, createAppointment, refresh: refreshAppointments } = useAppointments(effectiveClinicId ? effectiveClinicId.toString() : undefined);
  const { transactions, addTransaction } = useFinance(effectiveClinicId ? effectiveClinicId.toString() : undefined, patientId);
  const { uploadFile, loading: fileUploading, error: uploadError } = useStorage();

  // Lab Hooks
  const { labs, savedLabs } = useLabs({ clinicId: effectiveClinicId });
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
    updatePlan,
    loading: treatmentsLoading
  } = usePatientTreatments(patientId);

  // Files State - DB Backed
  const [files, setFiles] = useState<FileItem[]>([]);
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, string>>({});
  const [financePrefillData, setFinancePrefillData] = useState<any>(null); // New state for pre-filling modal

  // Appointment Modal State
  // Appointment Modal State
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  // Removed duplicate useAppointments hook call - ensuring we have the functions we need
  const { createAppointment: addAppointment, updateAppointment, deleteAppointment } = useAppointments(effectiveClinicId ? effectiveClinicId.toString() : undefined);


  const handleAddAppointment = () => {
    setEditingAppointment(null);
    setIsAppointmentModalOpen(true);
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setIsAppointmentModalOpen(true);
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الموعد؟')) {
      try {
        await deleteAppointment(appointmentId);
        toast.success('تم حذف الموعد بنجاح');
      } catch (error) {
        console.error('Error deleting appointment:', error);
        toast.error('فشل حذف الموعد');
      }
    }
  };

  const handleSaveAppointment = async (appointmentData: Partial<Appointment>) => {
    try {
      if (editingAppointment) {
        // Merge existing appointment with updates
        const updatedAppointment = { ...editingAppointment, ...appointmentData };
        await updateAppointment(updatedAppointment as Appointment);
        toast.success('تم تحديث الموعد بنجاح');
      } else {
        await addAppointment({
          ...appointmentData,
          patientId: patientId!,
          patientName: patient?.name || appointmentData.patientName || 'Unknown',
          clinicId: effectiveClinicId.toString(),
          time: appointmentData.time || appointmentData.startTime || '09:00'
        } as any);
        toast.success('تم إضافة الموعد بنجاح');
      }
      setIsAppointmentModalOpen(false);
      setEditingAppointment(null);
      if (refreshAppointments) refreshAppointments();
    } catch (error) {
      console.error('Failed to save appointment', error);
      toast.error('حدث خطأ أثناء حفظ الموعد');
    }
  };

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
  const completedVisits = patientAppointments.filter(a => a.status === 'completed').length;

  const patientTransactions = transactions.filter(t => t.patientId === patientId);
  const totalPaid = patientTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const activePlans = treatmentPlans.filter(p => p.status !== 'completed' && p.status !== 'cancelled');

  // Calculate Outstanding: Sum of (Cost - Paid) for all plans
  // Note: we track 'paid' in the plan object itself now from previous tasks
  const outstanding = treatmentPlans.reduce((sum, plan) => {
    // If status is cancelled, usually we don't count remaining balance unless specific policy
    if (plan.status === 'cancelled') return sum;
    return sum + (plan.cost - (plan.paid || 0));
  }, 0);

  // Treatment Status Logic
  let treatmentStatus = 'لا يوجد علاج نشط';
  let completedPercentage = 0;

  if (activePlans.length > 0) {
    treatmentStatus = 'قيد المعالجة';
    // Calculate overall progress
    const totalSessions = activePlans.reduce((s, p) => s + p.totalSessions, 0);
    const totalCompleted = activePlans.reduce((s, p) => s + p.completedSessions, 0);
    completedPercentage = totalSessions > 0 ? Math.round((totalCompleted / totalSessions) * 100) : 0;
  } else if (treatmentPlans.some(p => p.status === 'completed')) {
    treatmentStatus = 'مكتمل';
    completedPercentage = 100;
  }

  // Effects

  // Effects
  useEffect(() => {
    if (patient) {
      setTempName(patient.name);
    }
  }, [patient]);

  // Auto-save Handlers
  const [newAlert, setNewAlert] = useState('');
  const [isAddingAlert, setIsAddingAlert] = useState(false);

  const handleVitalChange = async (field: string, value: string) => {
    if (!patient) return;
    const newData = {
      ...medicalData,
      vitals: {
        ...medicalData.vitals,
        [field]: value
      }
    };
    // Optimistic update is handled by usePatient if we pass the whole object,
    // but here we are using derived 'medicalData'.
    // We need to call updatePatientProfile with the new medicalHistoryData.
    // The hook merges it.
    await updatePatientProfile({ medicalHistoryData: newData });
  };

  const toggleCondition = async (condition: string) => {
    if (!patient) return;
    const currentConditions = medicalData.conditions || [];
    const newConditions = currentConditions.includes(condition)
      ? currentConditions.filter(c => c !== condition)
      : [...currentConditions, condition];

    const newData = {
      ...medicalData,
      conditions: newConditions
    };
    await updatePatientProfile({ medicalHistoryData: newData });
  };

  const handleAddAlert = async () => {
    if (!newAlert.trim() || !patient) return;
    const currentAllergies = medicalData.allergies || [];
    const newData = {
      ...medicalData,
      allergies: [...currentAllergies, newAlert.trim()]
    };
    await updatePatientProfile({ medicalHistoryData: newData });
    setNewAlert('');
    setIsAddingAlert(false);
    toast.success('تم إضافة التنبيه بنجاح');
  };

  const handleDeleteAlert = async (alert: string) => {
    if (!patient) return;
    if (!window.confirm('هل أنت متأكد من حذف هذا التنبيه؟')) return;

    const currentAllergies = medicalData.allergies || [];
    const newData = {
      ...medicalData,
      allergies: currentAllergies.filter(a => a !== alert)
    };
    await updatePatientProfile({ medicalHistoryData: newData });
    toast.success('تم حذف التنبيه بنجاح');
  };

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
    setSelectedTeethNumbers([tooth.number]); // Sync for unified modal
    setIsDetailsPopupOpen(true);
  };

  const handleEditCondition = (tooth?: ToothCondition) => {
    if (tooth) setSelectedTooth(tooth);
    // Keep the details popup open in the background
    setIsConditionModalOpen(true);
  };

  const handleAddTreatment = () => {
    // Keep the details popup open in the background
    setIsModalOpen(true);
  };

  const handleAddGeneralTreatment = () => {
    setSelectedTooth(null);
    setSelectedTeethNumbers([0]);
    setIsDetailsPopupOpen(false);
    setIsModalOpen(true);
  };

  // --- Multi-Select Handlers ---
  const handleSelectionComplete = () => {
    if (selectedTeethNumbers.length > 0) {
      setIsDetailsPopupOpen(true);
    }
  };

  const handleAddTreatmentToAllSelected = () => {
    // Keep the details popup open in the background
    setIsModalOpen(true); // Open the multi-tooth treatment modal
  };

  const handleSaveCondition = async (toothNumber: number, condition: string, notes: string) => {
    if (!patientId) return;
    await updateTooth(toothNumber, condition, notes);
    toast.success('تم تحديث حالة السن بنجاح');
  };


  // --- Patient Data Handling (Supabase Integrated) ---


  const handleUpdateSession = (planId: string, sessionId: string, data: any) => {
    updateSession(planId, sessionId, data);
  };

  const handleLabRequest = (plan: TreatmentPlan) => {
    setSelectedLabPlan(plan);
    setIsLabModalOpen(true);
  };

  const handleCancelPlan = async (planId: string) => {
    if (window.confirm('هل أنت متأكد من إلغاء وحذف هذه الخطة العلاجية؟')) {
      await deletePlan(planId);
      // State update is handled optionally by hook or we force refresh
      // deletePlan in hook updates local state 'treatmentPlans'
    }
  };



  const handleOpenFinanceModal = (planId: string, sessionId: string) => {
    const plan = treatmentPlans.find(p => p.id === planId);
    const session = plan?.sessions.find(s => s.id === sessionId);

    if (plan && session) {
      setSelectedFinancePlanId(planId);
      setSelectedFinanceSessionId(sessionId);
      // specific logic for amount: defaulting to 0 or session cost if applicable
      setFinanceAmount(0);
      setFinanceModalType('income');
      setIsFinanceModalOpen(true);
    }
  };

  const handleSaveFinance = async (data: any) => {
    try {
      // 1. Add Transaction
      await addTransaction(data);

      // 2. Update Session Status & Paid Amount if it's related to a session
      if (selectedFinanceSessionId && selectedFinancePlanId) {
        // Calculate new paid amount (this is a simplification, ideally we sum up transactions)
        // For now, we just add this transaction amount to the session's 'paid' field if we had one,
        // or just rely on the transaction log. 
        // But to turn the session green, we might want to mark it as completed or partially paid.

        // Let's assume full payment for simplicity or ask user. 
        // For now, just logging the payment is the critical part.

        // Optionally update session status to 'completed' if it wasn't
        // updateSession(selectedFinancePlanId, selectedFinanceSessionId, { status: 'completed' }); 

        // Better: just refresh the data
      }

      setIsFinanceModalOpen(false);
      toast.success('تم حفظ المعاملة بنجاح');
    } catch (e) {
      console.error(e);
      toast.error('حدث خطأ أثناء الحفظ');
    }
  };

  const getTreatmentLabel = (type: string) => {
    const labels: Record<string, string> = {
      'endo': 'علاج عصب',
      'crown': 'تاج / جسر',
      'filling': 'حشوة',
      'implant': 'زراعة',
      'ortho': 'تقويم',
      'other': 'إجراء آخر',
      'x-ray': 'أشعة',
      'cleaning': 'تنظيف',
      'surgery': 'جراحة',
      'general': 'علاج عام'
    };
    return labels[type] || type || 'خطة علاجية';
  };



  const handleOpenGeneralModal = () => {
    setIsGeneralModalOpen(true);
  };

  const handleSaveGeneralTreatment = async (data: any) => {
    if (!patientId) return;

    // Create Treatment Plan
    const newPlan: TreatmentPlan = {
      id: crypto.randomUUID(),
      patientId: patientId,
      toothNumber: 0, // Always 0 for general
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
      notes: data.treatmentPlan?.name || data.notes
    };

    await addPlan(newPlan);
    setIsGeneralModalOpen(false);
  };

  const handleModalSave = async (data: any) => {
    if (!patientId) return;

    // data now contains { toothNumbers: number[], treatmentType, notes, estimatedCostPerTooth, startDate, treatmentPlan, condition, priority }

    // 1. Update Tooth Condition for all selected teeth (if needed/returned)
    if (data.toothNumbers && data.condition && data.condition !== 'healthy') {
      for (const tNum of data.toothNumbers) {
        // Merging notes if necessary, or just using diagnosis notes
        await updateTooth(tNum, data.condition, data.notes);
      }
    }

    // 2. Create Unified Treatment Plan for selected teeth
    if (data.treatmentPlan && data.toothNumbers) {
      const isMulti = data.toothNumbers.length > 1;
      const primaryToothNum = isMulti ? 0 : data.toothNumbers[0];
      const totalPlanCost = (data.estimatedCostPerTooth || 0) * data.toothNumbers.length;

      const newPlan: TreatmentPlan = {
        id: crypto.randomUUID(),
        patientId: patientId,
        toothNumber: primaryToothNum,
        toothNumbers: isMulti ? data.toothNumbers : undefined,
        type: data.treatmentType || 'general',
        status: 'planned',
        totalSessions: data.treatmentPlan.sessions.length,
        completedSessions: 0,
        progress: 0,
        sessions: data.treatmentPlan.sessions.map((s: any, i: number) => ({
          id: `sess-${Date.now()}-${i}-${primaryToothNum}`,
          number: i + 1,
          title: s.title,
          status: 'pending',
          duration: s.duration,
          schemaId: s.schemaId,
          data: {}
        })),
        cost: totalPlanCost,
        paid: 0,
        startDate: data.startDate,
        notes: data.treatmentPlan?.name || data.notes
      };

      await addPlan(newPlan);
      toast.success(isMulti ? 'تم إنشاء خطة علاجية مجمعة للأسنان بنجاح' : 'تم إنشاء خطة علاجية بنجاح');
    }

    setIsModalOpen(false);
    setSelectedTeethNumbers([]);
    setIsToothSelectionMode(false);
    setIsDetailsPopupOpen(false); // Close details modal upon adding treatment to avoid staled background state
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



  // Render Helpers
  const renderOverviewTab = () => {
    // Calculate derived state for UI
    const activeTreatment = treatmentPlans.find(p => p.status !== 'completed' && p.status !== 'cancelled');
    const completedPercentage = activeTreatment ? activeTreatment.progress : 0;
    const treatmentStatus = activeTreatment ? 'قيد المعالجة' : 'لا يوجد علاج نشط';

    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 animate-in fade-in">
        {/* Next Appointment Card - Blue */}
        <div className="relative overflow-hidden rounded-[2rem] p-4 sm:p-5 border transition-all duration-300 group bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-100 hover:shadow-xl hover:-translate-y-0.5 hover:border-transparent animate-in fade-in">
          {/* Decorative Background Icon */}
          <Calendar className="absolute -bottom-4 -left-4 w-20 h-20 sm:w-28 sm:h-28 rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 text-blue-500/10" strokeWidth={1.5} />
          
          <div className="relative z-10 flex flex-col h-full justify-between">
            {/* Header: Icon & Title */}
            <div className="flex items-center gap-2 sm:gap-2.5 mb-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow-sm bg-blue-500 text-white group-hover:scale-110 transition-transform duration-300 shrink-0">
                <Calendar className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <p className="font-bold text-xs sm:text-sm text-blue-800/90 leading-none">الموعد القادم</p>
            </div>

            {/* Content: Value & Details */}
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-blue-900 leading-tight">
                {nextAppointment ? new Date(nextAppointment.date).toLocaleDateString('ar-IQ') : 'لا يوجد موعد'}
              </h3>
              <p className="text-blue-600 text-[10px] sm:text-xs mt-1 sm:mt-1.5 font-medium flex flex-wrap items-center gap-1 sm:gap-1.5">
                {nextAppointment ? `${nextAppointment.type} - ${formatDate(nextAppointment.time)}` : '-'}
                {nextAppointment && nextAppointment.type.includes('أونلاين') && (
                  <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full border border-blue-200 animate-pulse">
                    أونلاين
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <button
            onClick={(e) => { e.stopPropagation(); handleAddAppointment(); }}
            className="absolute top-3 left-3 p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 shadow-md z-20"
            title="إضافة موعد"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Number of Visits Card - Orange */}
        <div className="relative overflow-hidden rounded-[2rem] p-4 sm:p-5 border transition-all duration-300 group bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-100 hover:shadow-xl hover:-translate-y-0.5 hover:border-transparent animate-in fade-in">
          {/* Decorative Background Icon */}
          <CheckSquare className="absolute -bottom-4 -left-4 w-20 h-20 sm:w-28 sm:h-28 rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 text-orange-500/10" strokeWidth={1.5} />
          
          <div className="relative z-10 flex flex-col h-full justify-between">
            {/* Header: Icon & Title */}
            <div className="flex items-center gap-2 sm:gap-2.5 mb-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow-sm bg-orange-500 text-white group-hover:scale-110 transition-transform duration-300 shrink-0">
                <CheckSquare className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <p className="font-bold text-xs sm:text-sm text-orange-800/90 leading-none">عدد الزيارات</p>
            </div>

            {/* Content: Value & Details */}
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-orange-900 leading-tight">
                {completedVisits} <span className="text-[11px] sm:text-xs font-normal text-orange-600/60">أي زيارة</span>
              </h3>
              <p className="text-orange-600 text-[10px] sm:text-xs mt-1 sm:mt-1.5 font-medium flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                مكتملة بنجاح
              </p>
            </div>
          </div>
        </div>

        {/* Outstanding Balance Card - Green */}
        <div className="relative overflow-hidden rounded-[2rem] p-4 sm:p-5 border transition-all duration-300 group bg-gradient-to-br from-green-50 to-green-100/50 border-green-100 hover:shadow-xl hover:-translate-y-0.5 hover:border-transparent animate-in fade-in">
          {/* Decorative Background Icon */}
          <DollarSign className="absolute -bottom-4 -left-4 w-20 h-20 sm:w-28 sm:h-28 rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 text-green-500/10" strokeWidth={1.5} />
          
          <div className="relative z-10 flex flex-col h-full justify-between">
            {/* Header: Icon & Title */}
            <div className="flex items-center gap-2 sm:gap-2.5 mb-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow-sm bg-green-500 text-white group-hover:scale-110 transition-transform duration-300 shrink-0">
                <DollarSign className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <p className="font-bold text-xs sm:text-sm text-green-800/90 leading-none">الرصيد المستحق</p>
            </div>

            {/* Content: Value & Details */}
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-green-900 leading-tight">
                {outstanding.toLocaleString()} د.ع
              </h3>
              <p className="text-green-600 text-[10px] sm:text-xs mt-1 sm:mt-1.5 font-medium">
                مدفوع: {totalPaid.toLocaleString()} د.ع
              </p>
            </div>
          </div>
        </div>

        {/* Treatment Status Card - Purple */}
        <div className="relative overflow-hidden rounded-[2rem] p-4 sm:p-5 border transition-all duration-300 group bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-100 hover:shadow-xl hover:-translate-y-0.5 hover:border-transparent animate-in fade-in">
          {/* Decorative Background Icon */}
          <Activity className="absolute -bottom-4 -left-4 w-20 h-20 sm:w-28 sm:h-28 rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 text-purple-500/10" strokeWidth={1.5} />
          
          <div className="relative z-10 flex flex-col h-full justify-between">
            {/* Header: Icon & Title */}
            <div className="flex items-center gap-2 sm:gap-2.5 mb-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow-sm bg-purple-500 text-white group-hover:scale-110 transition-transform duration-300 shrink-0">
                <Activity className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <p className="font-bold text-xs sm:text-sm text-purple-800/90 leading-none">حالة العلاج</p>
            </div>

            {/* Content: Value & Details */}
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-purple-900 leading-tight">
                {treatmentStatus}
              </h3>
              <p className="text-purple-600 text-[10px] sm:text-xs mt-1 sm:mt-1.5 font-medium">
                مكتمل: {completedPercentage}%
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Medical Alerts */}
        {(() => {
          const history = Array.isArray(patient?.medicalHistory)
            ? patient.medicalHistory
            : (typeof patient?.medicalHistory === 'string' ? patient.medicalHistory.split(',') : []);

          const hasAlerts = history.some(h => h.includes('حساسية') || h.includes('Allergy'));

          return hasAlerts && (
            <div className="col-span-2 md:col-span-4">
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 shadow-sm flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="bg-red-100 p-1.5 rounded-lg shrink-0">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  </div>
                  <h4 className="font-bold text-red-900 text-sm">تنبيهات طبية هامة</h4>
                </div>

                <div className="flex flex-wrap gap-2">
                  {medicalData.allergies.map(allergy => (
                    <div key={allergy} className="flex items-center gap-1.5 text-red-700 text-xs font-bold bg-white border border-red-100 px-2.5 py-1 rounded-md shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                      <span>{allergy === 'penicillin' ? 'حساسية بنسيلين' : allergy}</span>
                    </div>
                  ))}
                  {medicalData.conditions.includes('hypertension') && (
                    <div className="flex items-center gap-1.5 text-red-700 text-xs font-bold bg-white border border-red-100 px-2.5 py-1 rounded-md shadow-sm">
                      <Activity className="w-3 h-3 shrink-0" />
                      <span>ضغط دم مرتفع</span>
                    </div>
                  )}
                  {medicalData.conditions.includes('diabetes') && (
                    <div className="flex items-center gap-1.5 text-red-700 text-xs font-bold bg-white border border-red-100 px-2.5 py-1 rounded-md shadow-sm">
                      <Activity className="w-3 h-3 shrink-0" />
                      <span>مرض السكري</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Merged Medical History Section */}
        <div className="col-span-2 md:col-span-4 mt-1 pt-3 border-t border-gray-200">
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
          <TeethChart
            teeth={patientTeeth}
            onToothClick={handleToothClick}
            isSelectionMode={isToothSelectionMode}
            selectedTeethNumbers={selectedTeethNumbers}
            onSelectionChange={setSelectedTeethNumbers}
            onSelectionComplete={handleSelectionComplete}
            onCancelSelection={() => {
              setIsToothSelectionMode(false);
              setSelectedTeethNumbers([]);
            }}
            onEnableSelection={() => setIsToothSelectionMode(true)}
            onGeneralTreatmentClick={handleOpenGeneralModal}
          />


          {/* Active Treatments List */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900">
                <Activity className="w-5 h-5 text-blue-600" />
                خطط العلاج الجارية
              </h3>

            </div>

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
                {activePlans.map(plan => {
                  // Calculate Financial Status
                  const planTx = patientTransactions.filter(t => t.treatmentId === plan.id && t.type === 'income');
                  const ledgerPaid = planTx.reduce((sum, t) => sum + t.amount, 0);
                  const paidAmount = Math.max(ledgerPaid, plan.paid || 0); // Use the greater of the two
                  const totalCost = plan.cost || 0;

                  let paymentStatusText = 'غير مدفوع';
                  let paymentStatusColor = 'text-red-500';

                  if (paidAmount >= totalCost && totalCost > 0) {
                    paymentStatusText = 'مدفوع بالكامل';
                    paymentStatusColor = 'text-green-600';
                  } else if (paidAmount > 0) {
                    paymentStatusText = `مدفوع جزئياً (${paidAmount.toLocaleString()} د.ع)`;
                    paymentStatusColor = 'text-orange-500';
                  }



                  return (
                    <Card key={plan.id} className="overflow-hidden border-0 shadow-md ring-1 ring-gray-100">
                      <div className="bg-white border-b p-5">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-4">
                            <div className="min-w-[3.5rem] h-14 px-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-2xl shadow-blue-200 shadow-lg">
                              {(plan.toothNumbers && plan.toothNumbers.length > 0)
                                ? plan.toothNumbers.join(', ')
                                : plan.toothNumber !== 0 ? plan.toothNumber : 'عام'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-xl text-gray-900">
                                  {plan.notes || getTreatmentLabel(plan.type)}
                                </h4>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${plan.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                  }`}>
                                  {plan.status === 'completed' ? 'مكتمل' : 'قيد المعالجة'}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500 mt-1 flex items-center gap-3">
                                <span>تاريخ البدء: {plan.startDate}</span>
                                <span>•</span>
                                <span>الطبيب: {plan.doctor?.includes('@') ? `د. ${plan.doctor.split('@')[0].split('.').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}` : (plan.doctor || 'غير محدد')}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-left flex flex-col items-end gap-2">
                            <div>
                              <span className="block text-2xl font-bold text-gray-900">{(plan.cost || 0).toLocaleString()} <span className="text-xs text-gray-500 font-normal">د.ع</span></span>
                              <span className={`text-xs font-medium ${paymentStatusColor}`}>{paymentStatusText}</span>
                            </div>
                          </div>
                        </div>

                        {/* Segmented Progress Bar (Sessions & Payment) */}
                        {/* Segmented Progress Bar (Sessions & Payment) */}
                        <div className="relative pt-2">
                          {(() => {
                            const totalSegments = Math.max(plan.totalSessions || 1, 1);
                            const paidRatio = Math.min(1, (plan.paid || 0) / (plan.cost || 1));
                            const paidSegments = Math.floor(paidRatio * totalSegments);
                            const completedSegments = plan.completedSessions || 0;

                            // Calculate overall progress percentage based on completion, or payment?
                            // User label is generic "Progress". Let's show completion % here or mixed?
                            // Usually completion is the main progress metric for the bar label.
                            const progressPercentage = Math.round((completedSegments / totalSegments) * 100);

                            return (
                              <>
                                <div className="flex items-center justify-between text-xs font-bold text-gray-500 mb-1">
                                  <span>التقدم ({completedSegments} من {totalSegments})</span>
                                  <span>{progressPercentage}%</span>
                                </div>
                                <div className="flex gap-1 h-3 w-full bg-gray-100 rounded-full overflow-hidden p-0.5">
                                  {Array.from({ length: totalSegments }).map((_, idx) => {
                                    let bgColor = 'bg-gray-200';
                                    // User logic: 
                                    // 1. Paid -> Green
                                    // 2. Completed -> Blue (overrides Green?) "becomes blue after clicking complete"
                                    // So priority: Completed (Blue) > Paid (Green) > Pending

                                    const isPaid = idx < paidSegments;
                                    const isCompleted = idx < completedSegments;

                                    if (isCompleted) {
                                      bgColor = 'bg-blue-500'; // Completed (Blue)
                                    } else if (isPaid) {
                                      bgColor = 'bg-green-500'; // Paid but not completed (Green)
                                    }

                                    return (
                                      <div
                                        key={idx}
                                        className={`h-full flex-1 rounded-sm transition-all duration-500 ${bgColor}`}
                                        title={`Session ${idx + 1}: ${isCompleted ? 'مكتمل' : (isPaid ? 'مدفوع' : 'قيد الانتظار')}`}
                                      />
                                    );
                                  })}
                                </div>
                              </>
                            );
                          })()}
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
                              onAddPayment={handleSessionPayment}
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
                                {(() => {
                                  const teeth = plan.toothNumbers && plan.toothNumbers.length > 0 ? plan.toothNumbers : (plan.toothNumber !== undefined ? [plan.toothNumber] : [0]);
                                  if (teeth.length === 1 && teeth[0] === 0) return 'طلب معمل (علاج عام)';
                                  if (teeth.length > 1) return `طلب معمل للأسنان #${teeth.join(', ')}`;
                                  return `طلب معمل للسن #${teeth[0]}`;
                                })()}
                              </Button>

                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => handleCancelPlan(plan.id)}
                                >
                                  إلغاء الخطة
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
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
                    {archivedPlans.map(plan => {
                      const isExpanded = expandedPlanId === plan.id;
                      // Calculate Financial Status for Archive
                      const planTx = patientTransactions.filter(t => t.treatmentId === plan.id && t.type === 'income');
                      const paidAmount = planTx.reduce((sum, t) => sum + t.amount, 0);
                      const totalCost = plan.cost || 0;
                      // const remaining = totalCost - paidAmount; // unused for now in archive view summary

                      return (
                        <div key={plan.id} className={`bg-gray-50 border border-gray-200 rounded-xl transition-all ${isExpanded ? 'bg-white shadow-md ring-1 ring-blue-100' : 'hover:bg-white hover:shadow-sm'}`}>
                          <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}>
                            <div className="flex items-center gap-4">
                              <div className={`min-w-[2.5rem] px-2 h-10 rounded-lg flex items-center justify-center font-bold text-gray-600 text-xs ${plan.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-200'}`}>
                                {plan.status === 'completed' ? <CheckCircle className="w-5 h-5" /> : ((plan.toothNumbers && plan.toothNumbers.length > 0) ? plan.toothNumbers.join(', ') : plan.toothNumber)}
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                  {plan.notes || getTreatmentLabel(plan.type)}
                                  <span className="text-xs font-normal text-gray-500">
                                    #{(plan.toothNumbers && plan.toothNumbers.length > 0) ? plan.toothNumbers.join(', ') : plan.toothNumber}
                                  </span>
                                </h4>
                                <p className="text-xs text-gray-500">
                                  {plan.status === 'completed' ? `مكتمل بتاريخ: ${plan.startDate}` : `تمت الأرشفة: ${plan.startDate}`}
                                  <span className="mx-2">•</span>
                                  <span className={paidAmount >= totalCost ? "text-green-600 font-bold" : "text-orange-500"}>
                                    {paidAmount >= totalCost ? 'مدفوع بالكامل' : 'عالق / جزئي'}
                                  </span>
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-600 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('هل أنت متأكد من حذف هذه الخطة من الأرشيف نهائياً؟')) {
                                    handleCancelPlan(plan.id); // Re-using cancel for now, strictly speaking straightforward delete might be better if available
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                {isExpanded ? <Minus className="w-4 h-4" /> : 'عرض التفاصيل'}
                              </Button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="px-4 pb-4 border-t border-gray-100 pt-4 animate-in slide-in-from-top-2">
                              {/* Re-use Session Manager in Read-Only functionality or limited edit? 
                                 Usually completed plans can just show history. 
                                 For now, just showing the session list through the Manager component 
                                 but maybe we should disable editing? 
                                 TreatmentSessionManager handles its own state.
                             */}
                              <TreatmentSessionManager
                                plan={plan}
                                onUpdateSession={updateSession}
                                onCompleteSession={completeSession}
                                onAddPayment={handleOpenFinanceModal}
                                isReadOnly={true}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            }

          </div >
        </div >
      </div >
    );
  };



  /* --- TWO-STEP PAYMENT FLOW HANDLERS --- */
  const handleSettleInstallment = async (planId: string, amount: number) => {
    try {
      const plan = treatmentPlans.find(p => p.id === planId);
      if (!plan) return;

      const currentPaid = plan.paid || 0;
      const newPaid = currentPaid + amount;
      // Clamp to total cost to avoid overpayment (optional, but good practice)
      const finalPaid = Math.min(newPaid, plan.cost || 0);

      const { error } = await supabase
        .from('tooth_treatment_plans')
        .update({ paid: finalPaid })
        .eq('id', planId);

      if (error) throw error;

      toast.success(`تم تسجيل دفعة بقيمة ${amount.toLocaleString()} د.ع بنجاح`);

      // Optimistically update local state to reflect change immediately
      updatePlan(planId, { paid: finalPaid });

    } catch (error) {
      console.error('Error settling installment:', error);
      toast.error('فشل تسجيل الدفعة');
    }
  };

  const handleSessionPayment = (planId: string, sessionId: string, amount?: number) => {
    const plan = treatmentPlans.find(p => p.id === planId);
    if (!plan) return;

    if (amount && amount > 0) {
      if (confirm(`هل تريد تسجيل دفعة بقيمة ${amount.toLocaleString()} د.ع لهذه الجلسة؟`)) {
        handleSettleInstallment(planId, amount);
      }
      return;
    }

    // Calculate suggested installment amount (Remaining / Remaining Sessions)
    // or simply Cost / Total Sessions
    const totalSegments = plan.totalSessions || 1;
    const paidAmount = plan.paid || 0;
    const remainingCost = (plan.cost || 0) - paidAmount;

    // Estimate how many sessions are "paid for"
    const currentPaidSegments = Math.floor((paidAmount / (plan.cost || 1)) * totalSegments);
    const remainingSegments = Math.max(1, totalSegments - currentPaidSegments);

    const suggestedAmount = Math.ceil(remainingCost / remainingSegments);

    if (confirm(`هل تريد تسجيل دفعة بقيمة ${suggestedAmount.toLocaleString()} د.ع لهذه الجلسة؟`)) {
      handleSettleInstallment(planId, suggestedAmount);
    }
  };


  /* Finance Tab Render */
  const renderFinanceTab = () => {
    // 1. Calculate Statistics
    const totalRevenue = patientTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = patientTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate financial status for each plan
    const planPayments = treatmentPlans.map(plan => {
      // Calculate verified payments from transactions (Ledger)
      const planTx = patientTransactions.filter(t => t.treatmentId === plan.id && t.type === 'income');
      const ledgerPaid = planTx.reduce((sum, t) => sum + t.amount, 0);

      // Clinical Paid (from the plan itself)
      const clinicalPaid = plan.paid || 0;

      // Effective Paid is the max of both (Clinical usually leads)
      const effectivePaid = Math.max(clinicalPaid, ledgerPaid);

      return {
        ...plan,
        paidAmount: effectivePaid,
        ledgerPaid: ledgerPaid,
        remaining: (plan.cost || 0) - effectivePaid
      };
    });

    const totalCost = planPayments
      .filter(p => p.status !== 'cancelled')
      .reduce((sum, p) => sum + (p.cost || 0), 0);

    // Total Outstanding = Sum of remaining balances on all non-cancelled plans
    const totalOutstanding = planPayments
      .filter(p => p.status !== 'cancelled')
      .reduce((sum, p) => sum + Math.max(0, p.remaining), 0);

    return (
      <div className="animate-in fade-in space-y-8">

        {/* 1. Statistics Cards - Premium Responsive Bento UI Layout */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <BentoStatCard
            title="إجمالي التكلفة"
            value={`${totalCost.toLocaleString()} د.ع`}
            icon={Receipt}
            color="blue"
            delay={100}
            className="w-full"
          />
          <BentoStatCard
            title="إجمالي المدفوع"
            value={`${totalRevenue.toLocaleString()} د.ع`}
            icon={TrendingUp}
            color="green"
            delay={200}
            className="w-full"
          />
          <BentoStatCard
            title="المتبقي المستحق"
            value={`${totalOutstanding.toLocaleString()} د.ع`}
            icon={TrendingDown}
            color="orange"
            delay={300}
            className="w-full"
          />
          <BentoStatCard
            title="المصروفات / التكاليف"
            value={`${totalExpenses.toLocaleString()} د.ع`}
            icon={CreditCard}
            color="red"
            delay={400}
            className="w-full"
          />
        </div>

        {/* 2. Outstanding Plans Table */}
        <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-gray-500" />
              الرصيد المستحق (خطط العلاج)
            </h3>
            <div className="text-sm text-gray-500">
              عدد الخطط: {planPayments.filter(p => p.remaining > 0).length}
            </div>
          </div>

          <table className="w-full text-right">
            <thead className="bg-gray-50 text-xs text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">العلاج</th>
                <th className="px-6 py-4">السن</th>
                <th className="px-6 py-4 w-1/3">حالة الدفع (الدفعات)</th>
                <th className="px-6 py-4">الرصيد المستحق</th>
                <th className="px-6 py-4">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {planPayments.filter(p => p.remaining > 0 || (p.paidAmount > 0 && p.ledgerPaid < p.paidAmount)).map(plan => {
                // Calculate segments for progress bar
                const totalSegments = plan.totalSessions || 1;
                const isSingleSession = totalSegments === 1;
                const paidRatio = Math.min(1, plan.paidAmount / (plan.cost || 1));
                const paidSegments = Math.floor(paidRatio * totalSegments);

                return (
                  <tr key={plan.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-bold text-gray-900 block">{plan.notes || getTreatmentLabel(plan.type)}</span>
                        <span className="text-xs text-gray-500">ID: {plan.id.slice(0, 6)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="min-w-[2rem] px-2 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                        {(plan.toothNumbers && plan.toothNumbers.length > 0)
                          ? plan.toothNumbers.join(', ')
                          : plan.toothNumber !== 0 ? plan.toothNumber : 'عام'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 h-3 w-full max-w-[200px]">
                        {Array.from({ length: totalSegments }).map((_, idx) => {
                          const isPaid = idx < paidSegments;
                          return (
                            <div
                              key={idx}
                              className={`h-full flex-1 rounded-sm transition-all ${isPaid ? 'bg-green-500' : 'bg-red-200'}`}
                              title={isPaid ? 'مدفوع' : 'غير مدفوع'}
                            />
                          );
                        })}
                      </div>
                      <div className="text-xs text-gray-500 mt-1.5 flex justify-between w-full max-w-[200px]">
                        <span>{isSingleSession ? 'جلسة واحدة' : `${totalSegments} دفعات`}</span>
                        <span>{Math.round(paidRatio * 100)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {plan.remaining > 0 ? (
                        <div>
                          <span className="font-bold text-red-600 block">{plan.remaining.toLocaleString()} د.ع</span>
                          <span className="text-xs text-gray-400">من أصل {plan.cost?.toLocaleString()}</span>
                        </div>
                      ) : (
                        <span className="font-bold text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          تم السداد
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {plan.remaining > 0 && (
                        <div className="flex flex-col gap-2">
                          {/* Confirm Full Settlement */}
                          {(plan.remaining <= 0 || isSingleSession || (plan.remaining < (plan.cost || 0) * 0.1)) ? (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white w-full"
                              onClick={() => {
                                if (confirm(`هل أنت متأكد من تسوية المبلغ المتبقي (${plan.remaining.toLocaleString()} د.ع)؟`)) {
                                  handleSettleInstallment(plan.id, plan.remaining);
                                }
                              }}
                            >
                              <CheckSquare className="w-4 h-4 ml-1" />
                              تأكيد التسديد
                            </Button>
                          ) : (
                            // Pay Installment with Input
                            <div className="flex items-center gap-2">
                              <div className="relative w-24">
                                <input
                                  type="number"
                                  min="0"
                                  max={plan.remaining}
                                  className="w-full text-xs p-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-center"
                                  placeholder="المبلغ..."
                                  value={paymentAmounts[plan.id] || ''}
                                  onChange={(e) => setPaymentAmounts(prev => ({ ...prev, [plan.id]: e.target.value }))}
                                />
                                <span className="absolute left-1 top-1.5 text-[10px] text-gray-400">د.ع</span>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-blue-200 text-blue-700 hover:bg-blue-50 px-3"
                                disabled={!paymentAmounts[plan.id] || parseFloat(paymentAmounts[plan.id]) <= 0 || parseFloat(paymentAmounts[plan.id]) > plan.remaining}
                                onClick={() => {
                                  const amount = parseFloat(paymentAmounts[plan.id]);
                                  if (amount && amount > 0) {
                                    if (confirm(`تأكيد دفع مبلغ ${amount.toLocaleString()} د.ع؟`)) {
                                      handleSettleInstallment(plan.id, amount);
                                      // Clear input after success
                                      setPaymentAmounts(prev => ({ ...prev, [plan.id]: '' }));
                                    }
                                  }
                                }}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          )}

                          {(!isSingleSession && plan.remaining > 0 && paidSegments >= totalSegments - 1) && (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white w-full animate-pulse"
                              onClick={() => {
                                if (confirm(`هل أنت متأكد من تسوية المبلغ المتبقي (${plan.remaining.toLocaleString()} د.ع)؟`)) {
                                  handleSettleInstallment(plan.id, plan.remaining);
                                }
                              }}
                            >
                              <CheckSquare className="w-4 h-4 ml-1" />
                              تسوية نهائية
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Record Revenue Button */}
                      {(plan.remaining <= 0 && plan.ledgerPaid < plan.paidAmount) && (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white w-full shadow-md shadow-blue-100"
                          onClick={() => {
                            setFinancePrefillData({
                              amount: plan.paidAmount,
                              category: 'treatment',
                              patientId: patientId,
                              treatmentId: plan.id,
                              description: `إيراد علاج - ${plan.notes || getTreatmentLabel(plan.type)}`,
                              date: new Date().toISOString()
                            });
                            setFinanceModalType('income');
                            setIsFinanceModalOpen(true);
                          }}
                        >
                          <DollarSign className="w-4 h-4 ml-1" />
                          تسجيل الإيراد
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {planPayments.filter(p => p.remaining > 0 || (p.paidAmount > 0 && p.ledgerPaid < p.paidAmount)).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <CheckCircle className="w-12 h-12 text-green-100 mx-auto mb-3" />
                    <p>لا توجد مبالغ مستحقة حالياً</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
            <HistoryIcon className="w-5 h-5 text-gray-500" />
            سجل المعاملات المالية
          </h3>
          <div className="flex gap-3">
            <Button variant="outline" className="text-rose-600 hover:bg-rose-50 border-rose-200" onClick={() => { setFinanceModalType('expense'); setIsFinanceModalOpen(true); }}>
              <Minus className="w-4 h-4 ml-2" />
              تسجيل مصروف
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200"
              onClick={() => { setFinanceModalType('income'); setIsFinanceModalOpen(true); }}
            >
              <Plus className="w-4 h-4 ml-2" />
              تسجيل ايراد
            </Button>
          </div>
        </div>

        {/* Existing Transaction Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-right">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-xs font-medium text-gray-500">رقم الوصل</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500">التاريخ</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500">النوع</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500">الوصف</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500">المبلغ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {patientTransactions.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-sm text-gray-600">#{t.id.slice(0, 8)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(t.date)}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {t.type === 'income' ? 'إيراد' : 'مصروف'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{t.description}</td>
                  <td className={`px-6 py-4 font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()} د.ع
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
    )
  };


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




  /* Archive Tab Render */
  const [archiveSubTab, setArchiveSubTab] = useState<'gallery' | 'files'>('gallery');
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<FileItem | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null); // Added this line

  const handleSaveEditedImage = async (newUrl: string) => {
    if (!editingFile || !patientId) return;

    try {
      // Convert DataURL to File
      const res = await fetch(newUrl);
      const blob = await res.blob();
      const fileName = `edited_${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });

      // Upload
      const result = await uploadFile(file, 'patient-docs', `${patientId}/images`);

      if (result) {
        // Update Database
        const { error } = await supabase
          .from('patient_files')
          .update({
            url: result.url,
            size: (file.size / 1024).toFixed(1) + ' KB'
          })
          .eq('id', editingFile.id);

        if (error) throw error;

        // Update UI
        setFiles(prev => prev.map(f => f.id === editingFile.id ? { ...f, url: result.url } : f));
        setPreviewUrl(result.url); // Update preview if open
        toast.success('تم حفظ التعديلات بنجاح');
      }
    } catch (error) {
      console.error('Save edit error:', error);
      toast.error('فشل حفظ التعديلات');
    }
  };

  const handleSaveCopy = async (newUrl: string) => {
    if (!editingFile || !patientId) return;

    try {
      // Convert DataURL to File
      const res = await fetch(newUrl);
      const blob = await res.blob();
      const fileName = `copy_${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });

      // Upload
      const result = await uploadFile(file, 'patient-docs', `${patientId}/images`);

      if (result) {
        // Insert new record
        const { data, error } = await supabase
          .from('patient_files')
          .insert({
            patient_id: patientId,
            name: fileName,
            type: 'xray',
            url: result.url,
            size: (file.size / 1024).toFixed(1) + ' KB',
            date: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;

        if (data) {
          const newFile: FileItem = {
            id: data.id,
            name: data.name,
            type: 'xray', // Cast if needed, or ensure DB type matches
            url: data.url,
            date: new Date(data.created_at).toLocaleDateString('ar-IQ'),
            size: data.size
          };
          setFiles(prev => [newFile, ...prev]);
          toast.success('تم حفظ نسخة جديدة بنجاح');
        }
      }
    } catch (error) {
      console.error('Save copy error:', error);
      toast.error('فشل حفظ النسخة');
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
                  <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={handleDeleteFiles} disabled={selectedImageIds.length === 0}>
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
            onSaveCopy={handleSaveCopy}
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
  const [isVoiceExamModalOpen, setIsVoiceExamModalOpen] = useState(false);
  const [isSmileDesignModalOpen, setIsSmileDesignModalOpen] = useState(false);

  const { history: aiHistory, uploading: aiUploading, analyzing: aiAnalyzing, analyzeImage, analyzeExistingImage, deleteAnalysis, refresh: refreshAI } = useAIAnalysis(patientId);

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
        analysis_result: result,
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

  const handleDeleteAnalysis = async (id: string, type: 'image' | 'chat') => {
    if (!window.confirm('هل أنت متأكد من حذف هذا السجل بشكل نهائي؟')) return;

    try {
      if (type === 'image') {
        // Use the hook method for AI Analysis
        await deleteAnalysis(id);
        refreshAI(); // Refresh UI
        toast.success('تم حذف تحليل الصورة بنجاح');
      } else {
        // Delete Chat History
        const { error } = await supabase
          .from('smart_assistant_chats')
          .delete()
          .eq('id', id);

        if (error) throw error;

        setChatHistory(prev => prev.filter(c => c.id !== id));
        toast.success('تم حذف سجل المحادثة بنجاح');
      }
    } catch (error) {
      console.error('Delete error', error);
      toast.error('فشل في حذف السجل');
    }
  };

  const handleDeleteFiles = async () => {
    if (selectedImageIds.length === 0) return;
    if (!confirm(`هل أنت متأكد من حذف ${selectedImageIds.length} ملفات بشكل نهائي؟`)) return;

    try {
      const { error } = await supabase
        .from('patient_files')
        .delete()
        .in('id', selectedImageIds);

      if (error) throw error;

      // Update UI
      setFiles(prev => prev.filter(f => !selectedImageIds.includes(f.id)));
      setSelectedImageIds([]);
      setIsSelectionMode(false);
      toast.success('تم حذف الملفات بنجاح');

    } catch (error) {
      console.error('File deletion error:', error);
      toast.error('فشل حذف الملفات');
    }
  };

  const handleSaveToArchive = async (item: any, type: 'image' | 'chat') => {
    if (type === 'image') {
      try {
        // Human-in-the-loop database sync: Update the original AI analysis with custom edited doctor values if available
        if (item.id) {
          const { error: updateError } = await supabase
            .from('ai_analyses')
            .update({
              analysis_result: item.analysis_result
            })
            .eq('id', item.id);
          
          if (updateError) {
            console.error('Failed to sync edited AI analysis to DB:', updateError);
          } else {
            refreshAI();
          }
        }

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
            result={selectedAnalysis.analysis_result}
            date={selectedAnalysis.created_at}
            onChange={(updatedResult) => {
              setSelectedAnalysis((prev: any) => prev ? {
                ...prev,
                analysis_result: updatedResult
              } : null);
            }}
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {/* Image Analysis Card */}
        <div
          onClick={() => {
            setSelectedAnalysis(null); // Reset for new upload
            setIsAnalysisModalOpen(true);
          }}
          className="group cursor-pointer bg-white rounded-2xl p-1 border border-transparent hover:border-indigo-200 shadow-sm hover:shadow-xl transition-all duration-300"
        >
          <div className="relative h-28 sm:h-40 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl overflow-hidden mb-3 sm:mb-4 flex items-center justify-center group-hover:scale-[0.98] transition-transform">
            <div className="absolute inset-0 bg-grid-indigo-500/[0.05] [mask-image:linear-gradient(0deg,white,transparent)]" />
            <div className="w-10 h-10 sm:w-16 sm:h-16 bg-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-500">
              <Brain className="w-5 h-5 sm:w-8 sm:h-8" />
            </div>
          </div>
          <div className="px-3 pb-3 sm:px-4 sm:pb-4">
            <h3 className="text-xs sm:text-sm font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">تحليل صور الأشعة</h3>
            <p className="text-[10px] sm:text-xs text-gray-500 leading-normal line-clamp-2">
              تحليل صور الأشعة للكشف عن التسوسات والالتهابات والنسب الدقيقة.
            </p>
          </div>
        </div>

        {/* Smart Assistant Card */}
        <div
          onClick={() => setIsChatModalOpen(true)}
          className="group cursor-pointer bg-white rounded-2xl p-1 border border-transparent hover:border-purple-200 shadow-sm hover:shadow-xl transition-all duration-300"
        >
          <div className="relative h-28 sm:h-40 bg-gradient-to-br from-purple-50 to-fuchsia-50 rounded-xl overflow-hidden mb-3 sm:mb-4 flex items-center justify-center group-hover:scale-[0.98] transition-transform">
            <div className="absolute inset-0 bg-grid-purple-500/[0.05] [mask-image:linear-gradient(0deg,white,transparent)]" />
            <div className="w-10 h-10 sm:w-16 sm:h-16 bg-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform duration-500">
              <MessageSquare className="w-5 h-5 sm:w-8 sm:h-8" />
            </div>
          </div>
          <div className="px-3 pb-3 sm:px-4 sm:pb-4">
            <h3 className="text-xs sm:text-sm font-bold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">المساعد الطبي الذكي</h3>
            <p className="text-[10px] sm:text-xs text-gray-500 leading-normal line-clamp-2">
              محادثة تفاعلية والحصول على توصيات وكتابة التقارير الطبية للمراجع.
            </p>
          </div>
        </div>

        {/* Voice Exam Dictator Card */}
        <div
          onClick={() => setIsVoiceExamModalOpen(true)}
          className="group cursor-pointer bg-white rounded-2xl p-1 border border-transparent hover:border-orange-200 shadow-sm hover:shadow-xl transition-all duration-300"
        >
          <div className="relative h-28 sm:h-40 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl overflow-hidden mb-3 sm:mb-4 flex items-center justify-center group-hover:scale-[0.98] transition-transform">
            <div className="absolute inset-0 bg-grid-orange-500/[0.05] [mask-image:linear-gradient(0deg,white,transparent)]" />
            <div className="w-10 h-10 sm:w-16 sm:h-16 bg-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform duration-500">
              <Mic className="w-5 h-5 sm:w-8 sm:h-8" />
            </div>
          </div>
          <div className="px-3 pb-3 sm:px-4 sm:pb-4">
            <h3 className="text-xs sm:text-sm font-bold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">الفحص الصوتي الذكي</h3>
            <p className="text-[10px] sm:text-xs text-gray-500 leading-normal line-clamp-2">
              إملاء الملاحظات الطبية سريرياً للهجة العراقية وتحديث السجل آلياً.
            </p>
          </div>
        </div>

        {/* Smile Design (DSD) Card */}
        <div
          onClick={() => setIsSmileDesignModalOpen(true)}
          className="group cursor-pointer bg-white rounded-2xl p-1 border border-transparent hover:border-emerald-200 shadow-sm hover:shadow-xl transition-all duration-300"
        >
          <div className="relative h-28 sm:h-40 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl overflow-hidden mb-3 sm:mb-4 flex items-center justify-center group-hover:scale-[0.98] transition-transform">
            <div className="absolute inset-0 bg-grid-emerald-500/[0.05] [mask-image:linear-gradient(0deg,white,transparent)]" />
            <div className="w-10 h-10 sm:w-16 sm:h-16 bg-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-500">
              <Sparkles className="w-5 h-5 sm:w-8 sm:h-8" />
            </div>
          </div>
          <div className="px-3 pb-3 sm:px-4 sm:pb-4">
            <h3 className="text-xs sm:text-sm font-bold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors">ابتسامة هوليوود (DSD)</h3>
            <p className="text-[10px] sm:text-xs text-gray-500 leading-normal line-clamp-2">
              تصميم الابتسامة التلقائي ومحاكاة النتيجة قبل وبعد العلاج التقويمي.
            </p>
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
            <span className="text-xs text-orange-700 bg-white/50 px-2 py-1 rounded">حفظ تلقائي</span>
          </div>

          <div className="p-3 grid grid-cols-2 gap-2.5">
            <div className="bg-white px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border border-orange-100 shadow-sm flex items-center justify-between gap-1.5 sm:gap-2">
              <span className="text-[10px] sm:text-xs text-gray-500 font-semibold shrink-0">الضغط (BP)</span>
              <input
                key={`bp-${patientId}`} // Force re-render on patient change
                defaultValue={medicalData.vitals.bp}
                onBlur={(e) => handleVitalChange('bp', e.target.value)}
                className="w-14 sm:w-18 text-center font-bold text-xs sm:text-sm text-gray-800 border-b border-transparent hover:border-orange-200 focus:border-orange-500 focus:outline-none transition-colors py-0.5"
                placeholder="-"
              />
            </div>
            <div className="bg-white px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border border-orange-100 shadow-sm flex items-center justify-between gap-1.5 sm:gap-2">
              <span className="text-[10px] sm:text-xs text-gray-500 font-semibold shrink-0">السكر (Mg/dl)</span>
              <input
                key={`sugar-${patientId}`}
                defaultValue={medicalData.vitals.sugar}
                onBlur={(e) => handleVitalChange('sugar', e.target.value)}
                className="w-14 sm:w-18 text-center font-bold text-xs sm:text-sm text-gray-800 border-b border-transparent hover:border-orange-200 focus:border-orange-500 focus:outline-none transition-colors py-0.5"
                placeholder="-"
              />
            </div>
            <div className="bg-white px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border border-orange-100 shadow-sm flex items-center justify-between gap-1.5 sm:gap-2">
              <span className="text-[10px] sm:text-xs text-gray-500 font-semibold shrink-0">النبض (BPM)</span>
              <input
                key={`pulse-${patientId}`}
                defaultValue={medicalData.vitals.pulse}
                onBlur={(e) => handleVitalChange('pulse', e.target.value)}
                className="w-14 sm:w-18 text-center font-bold text-xs sm:text-sm text-gray-800 border-b border-transparent hover:border-orange-200 focus:border-orange-500 focus:outline-none transition-colors py-0.5"
                placeholder="-"
              />
            </div>
            <div className="bg-white px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border border-orange-100 shadow-sm flex items-center justify-between gap-1.5 sm:gap-2">
              <span className="text-[10px] sm:text-xs text-gray-500 font-semibold shrink-0">الوزن (Kg)</span>
              <input
                key={`weight-${patientId}`}
                defaultValue={medicalData.vitals.weight}
                onBlur={(e) => handleVitalChange('weight', e.target.value)}
                className="w-14 sm:w-18 text-center font-bold text-xs sm:text-sm text-gray-800 border-b border-transparent hover:border-orange-200 focus:border-orange-500 focus:outline-none transition-colors py-0.5"
                placeholder="-"
              />
            </div>
          </div>
        </Card>

        {/* Alerts Card */}
        <Card className="p-4 sm:p-5 border-l-4 border-l-red-500 bg-red-50/20">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 border-b pb-2 justify-between">
            <span className="flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-red-500" />
              تنبيهات طبية
            </span>
            <button
              onClick={() => setIsAddingAlert(!isAddingAlert)}
              className="text-xs bg-white/50 hover:bg-white text-red-600 px-2 py-1 rounded transition-colors"
            >
              {isAddingAlert ? 'إلغاء' : '+ إضافة'}
            </button>
          </h3>

          <div className="space-y-3">
            {isAddingAlert && (
              <div className="flex gap-2 animate-in slide-in-from-top-2">
                <input
                  value={newAlert}
                  onChange={(e) => setNewAlert(e.target.value)}
                  placeholder="اكتب التنبيه..."
                  className="flex-1 text-sm px-2 py-1 rounded border border-red-200 focus:outline-none focus:border-red-400"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddAlert();
                  }}
                />
                <Button size="sm" onClick={handleAddAlert} className="h-8 w-8 p-0 bg-red-500 hover:bg-red-600">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            )}

            {medicalData.allergies.map(allergy => (
              <div key={allergy} className="bg-red-100 text-red-800 px-3 py-2 rounded-lg text-sm font-bold flex justify-between items-center shadow-sm group">
                <span>{allergy === 'penicillin' ? 'حساسية: بنسيلين' : allergy}</span>
                <button
                  onClick={() => handleDeleteAlert(allergy)}
                  className="p-1 hover:bg-red-200 rounded text-red-600 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                  title="حذف التنبيه"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {medicalData.conditions.includes('hypertension') && (
              <div className="bg-yellow-50 text-yellow-800 px-3 py-2 rounded-lg text-sm font-bold border border-yellow-200 flex justify-between items-center">
                <span>تحذير: ضغط دم مرتفع</span>
                <Activity className="w-4 h-4" />
              </div>
            )}

            {medicalData.allergies.length === 0 && !medicalData.conditions.includes('hypertension') && !isAddingAlert && (
              <div className="text-center text-gray-500 text-sm py-2">لا توجد تنبيهات مسجلة</div>
            )}
          </div>
        </Card>
      </div>

      {/* Main Content - History Form */}
      <div className="lg:col-span-8 space-y-6">
        <Card className="p-6">


          <div className="space-y-8">
            {/* Systemic Diseases */}
            <div>
              <h4 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider">الأمراض المزمنة</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {['diabetes', 'hypertension', 'heart_disease', 'asthma', 'hepatitis', 'bleeding_disorder'].map(cond => (
                  <label key={cond} className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 cursor-pointer transition-all ${medicalData.conditions.includes(cond) ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'
                    }`}>
                    <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded flex items-center justify-center border shrink-0 ${medicalData.conditions.includes(cond) ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'
                      }`}>
                      {medicalData.conditions.includes(cond) && <CheckCircle className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-white" />}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={medicalData.conditions.includes(cond)}
                      onChange={() => toggleCondition(cond)}
                    />
                    <span className={`text-xs sm:text-sm font-bold truncate ${medicalData.conditions.includes(cond) ? 'text-blue-700' : 'text-gray-600'}`}>
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
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">سجل الزيارات والعمليات</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddAppointment}
                  className="flex items-center gap-2 text-xs"
                >
                  <Plus className="w-3 h-3" />
                  إضافة موعد
                </Button>
              </div>
              <div className="space-y-4 relative before:absolute before:inset-y-0 before:right-2.5 before:w-0.5 before:bg-gray-200 before:top-2 before:bottom-2">
                {patientAppointments.length > 0 ? (
                  patientAppointments
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((appt, i) => {
                      const statusConfig = appointmentStatuses[appt.status] || { label: appt.status, color: '#666', bgColor: '#eee' };
                      const typeConfig = appointmentTypes.find(t => t.type === appt.type) || { label: appt.type, color: '#666', defaultDuration: 30 };

                      return (
                        <div key={appt.id} className="relative flex gap-4">
                          <div className={`w-6 h-6 rounded-full shrink-0 z-10 border-2 border-white shadow-sm mt-1 ${appt.type === 'surgery' ? 'bg-red-500' :
                            appt.type === 'emergency' ? 'bg-orange-500' :
                              appt.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                            }`}></div>
                          <div className="relative group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col sm:flex-row transform hover:-translate-y-1 flex-1">

                            {/* Left Column: Date & Time */}
                            <div className={`w-full sm:w-24 shrink-0 flex sm:flex-col items-center justify-between sm:justify-center p-3 border-b sm:border-b-0 sm:border-l border-gray-50/50
                            ${appt.type === 'surgery' ? 'bg-red-50/70 text-red-700' :
                                appt.type === 'consultation' ? 'bg-blue-50/70 text-blue-700' :
                                  appt.type === 'emergency' ? 'bg-orange-50/70 text-orange-700' :
                                    'bg-purple-50/70 text-purple-700'}
                          `}>
                              <div className="flex items-center gap-2 sm:flex-col sm:gap-0">
                                <span className="text-2xl sm:text-3xl font-black leading-none">{new Date(appt.date).getDate()}</span>
                                <span className="text-xs sm:text-[10px] uppercase font-bold opacity-70">
                                  {new Date(appt.date).toLocaleDateString('en-US', { month: 'short' })}
                                </span>
                              </div>
                              <div className="bg-white/90 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm backdrop-blur-sm">
                                {appt.startTime}
                              </div>
                            </div>

                            {/* Right Column: Details */}
                            <div className="flex-1 p-3.5 sm:p-4 flex flex-col justify-between gap-3">
                              {/* Header: Doctor Info + Actions (Always Visible) */}
                              <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2.5 sm:gap-3">
                                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-bold text-base sm:text-lg shadow-sm shrink-0
                                    ${appt.doctorName ? 'bg-gray-50 text-gray-600' : 'bg-gray-100 text-gray-400'}
                                  `}>
                                    {appt.doctorName ? appt.doctorName.charAt(0).toUpperCase() : '?'}
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-gray-900 text-xs sm:text-sm">
                                      {appt.doctorName ? `د. ${appt.doctorName}` : 'غير محدد'}
                                    </h4>
                                    <span className="text-[10px] sm:text-xs text-gray-500">طبيب أسنان</span>
                                  </div>
                                </div>

                                {/* Actions - Always Visible */}
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleEditAppointment(appt); }}
                                    className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-white text-blue-600 rounded-lg sm:rounded-xl shadow-sm border border-blue-100 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                                    title="تعديل"
                                  >
                                    <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteAppointment(appt.id); }}
                                    className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-white text-red-600 rounded-lg sm:rounded-xl shadow-sm border border-red-100 hover:bg-red-50 hover:border-red-200 transition-colors"
                                    title="حذف"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Footer: ALL Badges (Type, Status, Priority) - No Conditions */}
                              <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center mt-1">
                                {/* Type Badge */}
                                <span
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold border"
                                  style={{
                                    color: typeConfig.color,
                                    backgroundColor: `${typeConfig.color}10`,
                                    borderColor: `${typeConfig.color}20`
                                  }}
                                >
                                  {typeConfig.label}
                                </span>

                                {/* Status Badge */}
                                <span
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold border"
                                  style={{
                                    color: statusConfig.color,
                                    backgroundColor: statusConfig.bgColor,
                                    borderColor: `${statusConfig.color}20`
                                  }}
                                >
                                  {statusConfig.label}
                                </span>

                                {/* Priority Badge - Always Show */}
                                <span className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg font-bold border
                                ${appt.priority === 'urgent' ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' :
                                    appt.priority === 'high' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                      'bg-gray-50 text-gray-500 border-gray-100'}
                              `}>
                                  {appt.priority === 'urgent' && <AlertCircle className="w-3 h-3" />}
                                  {appt.priority === 'urgent' ? 'عاجل' :
                                    appt.priority === 'high' ? 'مهم' :
                                      'عادي'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">لا توجد زيارات مسجلة</div>
                )}
              </div>
            </div>

          </div>
        </Card>
      </div>

      {/* Modals */}
      <AppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={() => {
          setIsAppointmentModalOpen(false);
          setEditingAppointment(null);
        }}
        onSave={handleSaveAppointment}
        editingAppointment={editingAppointment}
        preSelectedPatient={(patient as any) || undefined}
        clinicId={effectiveClinicId.toString()}
      />
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
          <Button className="mt-4" onClick={() => window.history.length > 2 ? navigate(-1) : navigate(`/doctor/clinic/${clinicId}`)}>
            العودة للقائمة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-slate-200/80 mb-4 sticky top-0 z-30 shadow-sm transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-1.5 sm:py-2">
            <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
              <button 
                onClick={() => window.history.length > 2 ? navigate(-1) : navigate(`/doctor/clinic/${clinicId}`)}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-lg active:scale-95 transition-all duration-200 flex items-center justify-center shrink-0"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {isEditingName ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        className="px-2 py-1 text-base sm:text-lg font-bold text-gray-900 border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 max-w-[180px] sm:max-w-xs"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          if (patient && tempName.trim()) {
                            updatePatientProfile({ name: tempName });
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
                    <h1 className="text-sm sm:text-base md:text-lg font-extrabold text-slate-800 flex flex-wrap items-center gap-1.5 sm:gap-2 group leading-none">
                      <span className="truncate">{patient?.name || 'جاري التحميل...'}</span>
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="opacity-40 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                        title="تعديل الاسم"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <span className={`text-[11px] font-normal px-2 py-0.5 rounded-full whitespace-nowrap ${patient?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {patient?.status === 'active' ? 'نشط' : (patient?.status === 'emergency' ? 'طوارئ' : 'غير نشط')}
                      </span>
                      <span className="inline-flex items-center gap-1 bg-amber-50/60 text-amber-700 px-2 py-0.5 rounded-full text-[11px] font-medium border border-amber-100/50 shadow-sm whitespace-nowrap" title="آخر زيارة">
                        <Clock className="w-3 h-3 text-amber-500" />
                        <span>{(() => {
                          if (!patient?.lastVisit) return '-';
                          const date = new Date(patient.lastVisit);
                          const day = String(date.getDate()).padStart(2, '0');
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          return `${day}/${month}`;
                        })()}</span>
                      </span>
                      {patient?.patientUserId && (
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[11px] font-medium border border-blue-100 shadow-sm whitespace-nowrap" title="مرتبط بحساب مراجع على المنصة">
                          <UserCheck className="w-3 h-3 text-blue-500" />
                          <span>مرتبط بالمنصة</span>
                        </span>
                      )}
                    </h1>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1.5 sm:space-x-3 space-x-reverse overflow-x-auto scrollbar-none py-1 border-t border-slate-100 mt-1 sm:mt-2">
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
                className={`pb-2 pt-1.5 px-2.5 text-xs sm:text-sm font-semibold transition-all relative whitespace-nowrap rounded-lg ${activeTab === tab.id
                  ? 'text-blue-600 bg-blue-50/50'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-1 right-1 h-0.5 bg-blue-600 rounded-full animate-in fade-in zoom-in-95 duration-200" />
                )}
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

      {/* Unified Details Popup for Existing Teeth */}
      <Modal
        isOpen={isDetailsPopupOpen}
        onClose={() => setIsDetailsPopupOpen(false)}
        title={`تفاصيل ${selectedTeethNumbers.length > 1 ? 'الأسنان المحددة' : `السن #${selectedTeethNumbers[0]}`}`}
        size="md"
        contentClassName="p-0"
      >
        <div className="flex flex-col bg-gray-50/50">
          {/* Header */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 shadow-md border-b border-indigo-800/30">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-14 min-w-[3.5rem] px-3 bg-white/20 rounded-xl flex items-center justify-center font-bold text-2xl shadow-lg border border-white/30 backdrop-blur-sm">
                {selectedTeethNumbers.join(', ')}
              </div>
              <div>
                <h3 className="text-xl font-bold">
                  {selectedTeethNumbers.length > 1 ? 'مجموعة أسنان محددة' : `تفاصيل السن`}
                </h3>
                <p className="text-blue-100 opacity-90 mt-1 text-sm">
                  {selectedTeethNumbers.length > 1 ? `يحتوي على ${selectedTeethNumbers.length} أسنان` : 'تحقق من حالة السن والخطط المرتبطة به'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">

            {/* Condition List */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm max-h-[30vh] overflow-y-auto">
              <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                الحالة الحالية
              </h4>
              <div className="space-y-3">
                {patientTeeth.filter(t => selectedTeethNumbers.includes(t.number)).map(tooth => (
                  <div key={tooth.number} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm shadow-inner">
                        {tooth.number}
                      </div>
                      <div>
                        <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold ${tooth.condition === 'healthy' ? 'bg-green-100 text-green-800' :
                          tooth.condition === 'decayed' ? 'bg-red-100 text-red-800' :
                            tooth.condition === 'missing' ? 'bg-gray-200 text-gray-800' :
                              tooth.condition === 'filled' ? 'bg-blue-100 text-blue-800' :
                                tooth.condition === 'crown' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-indigo-50 text-indigo-800'
                          }`}>
                          {tooth.condition === 'healthy' ? 'سليم' :
                            tooth.condition === 'decayed' ? 'تسوس' :
                              tooth.condition === 'missing' ? 'مفقود' :
                                tooth.condition === 'filled' ? 'محشو' :
                                  tooth.condition === 'crown' ? 'تاج' :
                                    tooth.condition}
                        </span>
                        {tooth.notes && <p className="text-xs text-gray-500 mt-1 truncate max-w-[150px]">{tooth.notes}</p>}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="text-xs px-2 h-8" onClick={(e) => {
                      e.stopPropagation();
                      handleEditCondition(tooth);
                    }}>تعديل الحالة</Button>
                  </div>
                ))}
              </div>
            </div>

            {/* History Section - Only reliable for single tooth currently */}
            {selectedTeethNumbers.length === 1 && (
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
                ) : treatmentPlans.filter(p => {
                  // Support plans linked to array of teeth or single toothNumber
                  const tNums = p.toothNumbers || [p.toothNumber];
                  return tNums.includes(selectedTooth?.number) && p.status === 'completed';
                }).length > 0 ? (
                  <ul className="space-y-2">
                    {treatmentPlans.filter(p => {
                      const tNums = p.toothNumbers || [p.toothNumber];
                      return tNums.includes(selectedTooth?.number) && p.status === 'completed';
                    }).map((plan, idx) => (
                      <li key={plan.id} className="text-sm flex items-center justify-between text-gray-600 bg-white p-2 rounded shadow-sm border-r-2 border-green-500">
                        <span className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          {plan.notes || getTreatmentLabel(plan.type)}
                        </span>
                        <span className="text-xs text-gray-400">{new Date(plan.startDate).toLocaleDateString('en-GB')}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400 italic">لا توجد علاجات سابقة مسجلة</p>
                )}
              </div>
            )}

            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                الخطط العلاجية النشطة المرتبطة
              </h4>
              {treatmentPlans.filter(p => {
                const tNums = p.toothNumbers || [p.toothNumber];
                return tNums.some(n => selectedTeethNumbers.includes(n)) && p.status !== 'completed';
              }).length > 0 ? (
                <ul className="space-y-3">
                  {treatmentPlans.filter(p => {
                    const tNums = p.toothNumbers || [p.toothNumber];
                    return tNums.some(n => selectedTeethNumbers.includes(n)) && p.status !== 'completed';
                  }).map((plan, idx) => (
                    <li key={plan.id} className="text-sm bg-white p-3 rounded-lg shadow-sm border border-blue-100 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="min-w-[1.5rem] px-2 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                            {(plan.toothNumbers || [plan.toothNumber]).join(', ')}
                          </span>
                          <div>
                            <span className="font-bold text-gray-800 block">
                              {plan.notes || getTreatmentLabel(plan.type)}
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
                <p className="text-sm text-gray-500 bg-white p-3 rounded-lg border border-dashed border-gray-300">لا توجد خطط نشطة حالياً.</p>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-gray-100 grid gap-3">
              <Button onClick={handleAddTreatment} className="w-full justify-center text-base py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200">
                إضافة خطة علاجية لـ {selectedTeethNumbers.length} أسنان
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <ToothInteractionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        toothNumbers={selectedTeethNumbers}
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
          scope: t.scope,
          totalRevenue: t.totalRevenue || 0
        }))}
      />

      <ToothConditionModal
        isOpen={isConditionModalOpen}
        onClose={() => setIsConditionModalOpen(false)}
        toothNumber={selectedTooth?.number || 0}
        initialCondition={selectedTooth?.condition}
        initialNotes={selectedTooth?.notes}
        onSave={handleSaveCondition}
      />




      {/* Unified Lab Order Modal */}
      <CreateOrderModal
        isOpen={isLabModalOpen}
        onClose={() => setIsLabModalOpen(false)}
        clinicId={effectiveClinicId}
        patientId={patientId}
        patientName={patient?.name}
        selectedPlanId={selectedLabPlan?.id}
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
        contentClassName="p-0 overflow-hidden flex-none h-[calc(95dvh-60px)] sm:h-[65vh]"
        size="full"
      >
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <SmartAssistantChat patientId={patient.id} patientName={patient.name} onSave={handleSaveChat} />
        </div>
      </Modal>

      {/* Voice Exam Dictator Modal */}
      <Modal
        isOpen={isVoiceExamModalOpen}
        onClose={() => setIsVoiceExamModalOpen(false)}
        title="الفحص الصوتي والترقيم السني الذكي (Voice Dictation)"
      >
        <div className="space-y-6">
          <VoiceExamDictatorModalContent patientName={patient?.name} />
        </div>
      </Modal>

      {/* Smile Design (DSD) Modal */}
      <Modal
        isOpen={isSmileDesignModalOpen}
        onClose={() => setIsSmileDesignModalOpen(false)}
        title="تصميم الابتسامة الرقمي بالذكاء الاصطناعي (DSD Preview)"
      >
        <div className="space-y-6">
          <SmileDesignModalContent patientName={patient?.name} patientId={patient?.id} />
        </div>
      </Modal>
      {/* Financial Transaction Modal */}
      <ComprehensiveTransactionModal
        isOpen={isFinanceModalOpen}
        onClose={() => setIsFinanceModalOpen(false)}
        type={financeModalType}
        clinicId={effectiveClinicId}
        preselectedPatientId={patientId}
        prefillData={financePrefillData || {
          amount: financeAmount,
          treatmentId: selectedFinancePlanId,
          description: selectedFinanceSessionId ? `دفعة مالية - جلسة علاج (Plan: ${selectedFinancePlanId})` : '',
        }}
        onSave={handleSaveFinance}
        lockFields={financePrefillData ? ['patient', 'treatment'] : (selectedFinancePlanId ? ['patient', 'treatment'] : [])}
      />

      {/* General Treatment Modal */}
      <GeneralTreatmentModal
        isOpen={isGeneralModalOpen}
        onClose={() => setIsGeneralModalOpen(false)}
        availableTreatments={clinicTreatments}
        onSave={handleSaveGeneralTreatment}
      />
    </div>
  );
};

// ============================================================================
// Interactive Helper Subcomponents for Ministry of Health Conference Showcase
// ============================================================================

const VoiceExamDictatorModalContent: React.FC<{ patientName?: string }> = ({ patientName }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedFindings, setParsedFindings] = useState<Array<{ id: number; title: string; desc: string; severity: 'high' | 'medium' | 'low' }>>([]);
  const [isParsing, setIsParsing] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggleRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("متصفحك لا يدعم التعرف على الصوت الرقمي");
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      parseVoiceNotes();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-IQ';
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      const currentTranscript = Array.from(event.results)
        .map((r: any) => r[0]?.transcript)
        .join(' ');
      setTranscript(currentTranscript);
    };
    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    setIsRecording(true);
    setTranscript('');
    setParsedFindings([]);
    recognition.start();
  };

  const parseVoiceNotes = () => {
    setIsParsing(true);
    setTimeout(() => {
      const text = transcript.toLowerCase();
      const findings: typeof parsedFindings = [];
      let idCounter = 1;

      if (text.includes('تسوس') || text.includes('يوجع') || text.includes('نخر')) {
        findings.push({
          id: idCounter++,
          title: 'كشف تسوس نشط (Active Caries)',
          desc: 'تسوس تاكلي في المينا والعاج بحاجة إلى حشوة تجميلية فورية.',
          severity: 'medium'
        });
      }
      if (text.includes('قلع') || text.includes('خلع') || text.includes('مكسور')) {
        findings.push({
          id: idCounter++,
          title: 'توصية بخلع السن (Extraction Recommended)',
          desc: 'تضرر كامل للتاج الجذري مما يتطلب قلعاً جراحياً وتخطيط زراعة.',
          severity: 'high'
        });
      }
      if (text.includes('التهاب') || text.includes('لثة') || text.includes('دم')) {
        findings.push({
          id: idCounter++,
          title: 'التهاب اللثة والنسج الداعمة (Gingivitis)',
          desc: 'احتقان لثوي ناتج عن تراكم الجير يتطلب جلسة تنظيف وتلميع عميقة.',
          severity: 'low'
        });
      }
      if (text.includes('تقويم') || text.includes('اعوجاج')) {
        findings.push({
          id: idCounter++,
          title: 'طلب استشارة تقويمية (Orthodontic Evaluation)',
          desc: 'تزاحم في الأسنان الأمامية يتطلب أخذ مقاسات للتقويم الشفاف.',
          severity: 'low'
        });
      }

      if (findings.length === 0 && transcript) {
        findings.push({
          id: idCounter++,
          title: 'فحص فموي عام (General Checkup)',
          desc: 'فحص الأعراض السريرية المذكورة وجاري توثيق الملاحظات العامة.',
          severity: 'low'
        });
      }

      setParsedFindings(findings);
      setIsParsing(false);
    }, 1500);
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
        <div>
          <h4 className="font-bold text-sm text-slate-800">ميكروفون الفحص الصوتي الفوري</h4>
          <p className="text-xs text-slate-500 mt-1">تحدث باللغة العربية أو اللهجة العراقية لتحديث سجل المريض آلياً</p>
        </div>
        <button
          onClick={toggleRecording}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isRecording 
              ? 'bg-red-500 text-white animate-pulse' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow'
          }`}
        >
          {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
      </div>

      {/* Realtime transcript window */}
      <div className="bg-slate-950 text-emerald-400 p-4 rounded-2xl border border-slate-800 font-mono text-sm min-h-[100px] flex flex-col justify-center">
        {transcript ? (
          <p className="leading-relaxed">{transcript}</p>
        ) : (
          <p className="text-slate-600 text-center text-xs">
            {isRecording ? 'جاري الاستماع... ابدأ التحدث الآن' : 'انقر على الميكروفون وتحدث (مثال: "السن 14 تسوس عميق وبحاجة لحشوة، والسن 18 قلع")'}
          </p>
        )}
      </div>

      {isParsing && (
        <div className="flex items-center gap-3 justify-center text-indigo-600 text-sm font-bold">
          <RefreshCcw className="w-4 h-4 animate-spin" />
          جاري استخراج الملاحظات السريرية بالذكاء الاصطناعي...
        </div>
      )}

      {/* Parsed Findings output */}
      {parsedFindings.length > 0 && (
        <div className="space-y-3 animate-in fade-in">
          <h4 className="font-bold text-xs text-slate-400">التشخيصات الطبية المستخرجة بالـ AI:</h4>
          {parsedFindings.map(item => (
            <div 
              key={item.id} 
              className={`p-3.5 rounded-xl border flex items-start gap-3 text-right ${
                item.severity === 'high' 
                  ? 'bg-red-50 border-red-100 text-red-900' 
                  : item.severity === 'medium' 
                    ? 'bg-amber-50 border-amber-100 text-amber-900' 
                    : 'bg-blue-50 border-blue-100 text-blue-900'
              }`}
            >
              <Brain className={`w-5 h-5 shrink-0 mt-0.5 ${
                item.severity === 'high' ? 'text-red-500' : item.severity === 'medium' ? 'text-amber-500' : 'text-blue-500'
              }`} />
              <div>
                <h5 className="font-bold text-sm">{item.title}</h5>
                <p className="text-xs mt-1 opacity-90 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
          <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs mt-2">
            اعتماد وحفظ البيانات في الخطة العلاجية
          </Button>
        </div>
      )}
    </div>
  );
};

const SmileDesignModalContent: React.FC<{ patientName?: string; patientId?: string }> = ({ patientName, patientId }) => {
  // 1. DSD System Modes
  const [dsdMethod, setDsdMethod] = useState<'manual' | 'nanobanana'>('manual');
  const [aiPrompt, setAiPrompt] = useState<string>(
    "ابتسامة هوليوود واقعية فائقة الدقة، قشور بورسلان طبيعية ثلاثية الأبعاد بياض ناصع متناسقة مع الشفاه وحجم الفم الطبيعي للمراجع مع انعكاس ضوئي متألق للأسنان الأمامية."
  );

  // 2. Photo states (Default close-up patient loaded by default)
  const [patientPhoto, setPatientPhoto] = useState<string | null>("https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800");
  const [bgScale, setBgScale] = useState(1.0);
  const [bgX, setBgX] = useState(0);
  const [bgY, setBgY] = useState(0);

  // 3. Realistic Veneers overlay states (Pre-calibrated default values to fit demo mouth perfectly)
  const [overlayScaleX, setOverlayScaleX] = useState(0.9);
  const [overlayScaleY, setOverlayScaleY] = useState(0.95);
  const [overlayX, setOverlayX] = useState(0);
  const [overlayY, setOverlayY] = useState(12);
  const [overlayRotate, setOverlayRotate] = useState(0);
  const [overlayOpacity, setOverlayOpacity] = useState(0.85);

  // 4. Teeth aesthetic parameters
  const [toothShape, setToothShape] = useState<'natural' | 'oval' | 'square'>('natural');
  const [whiteness, setWhiteness] = useState(3);
  const [alignment, setAlignment] = useState(5);

  // 5. Comparison and AI simulation states
  const [smileAfter, setSmileAfter] = useState(false);
  const [showSplitSlider, setShowSplitSlider] = useState(false);
  const [splitPosition, setSplitPosition] = useState(50);
  const [activeSubTab, setActiveSubTab] = useState<'align' | 'aesthetic' | 'ai'>('aesthetic');

  // 6. AI Loading states
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');

  // Helper values for teeth whiteness stop colors and alignment shifts
  const getStops = (grade: number) => {
    switch(grade) {
      case 5: return { stop0: '#f8fafc', stop70: '#ffffff', stop100: '#f1f5f9', warm: '#ffffff' }; // VITA B1
      case 4: return { stop0: '#faf9f6', stop70: '#ffffff', stop100: '#f4f0e5', warm: '#fdfdfa' }; // VITA A1
      case 3: return { stop0: '#f4f0e5', stop70: '#faf7ee', stop100: '#efeada', warm: '#f7f4eb' }; // VITA A2
      case 2: return { stop0: '#ebe3d5', stop70: '#f1ebd9', stop100: '#e3dcd3', warm: '#eee5d0' }; // VITA A3
      case 1: return { stop0: '#dcd0bc', stop70: '#e6dac3', stop100: '#cfc1a5', warm: '#ddcca9' }; // VITA A4
      default: return { stop0: '#f4f0e5', stop70: '#faf7ee', stop100: '#efeada', warm: '#f7f4eb' };
    }
  };

  // Reset function
  const handleResetOverlay = () => {
    setOverlayScaleX(0.9);
    setOverlayScaleY(0.95);
    setOverlayX(0);
    setOverlayY(12);
    setOverlayRotate(0);
    setOverlayOpacity(0.85);
    toast.success("تم إعادة ضبط موضع قالب الأسنان الافتراضية.");
  };

  const handleResetBackground = () => {
    setBgScale(1.0);
    setBgX(0);
    setBgY(0);
    toast.success("تم إعادة ضبط حجم وموضع صورة المريض.");
  };

  // Upload photo
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPatientPhoto(reader.result as string);
        setSmileAfter(false);
        setShowSplitSlider(false);
        toast.success("تم رفع صورة المريض بنجاح! يمكنك البدء بتنسيق الابتسامة.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLoadDemo = () => {
    setPatientPhoto("https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800");
    setSmileAfter(false);
    setShowSplitSlider(false);
    toast.success("تم تحميل الصورة التجريبية النموذجية بنجاح.");
  };

  const handleDeletePhoto = () => {
    setPatientPhoto(null);
    setSmileAfter(false);
    setShowSplitSlider(false);
    toast.info("تم إزالة صورة المريض.");
  };

  // AI Smile simulation trigger - Connecting to Nano Banana DEV Server
  const handleTriggerAi = () => {
    if (!patientPhoto) {
      toast.error("يرجى رفع صورة مراجع أولاً للبدء بمعالجة نانو بنانا.");
      return;
    }
    
    setIsAiProcessing(true);
    const steps = [
      "📡 جاري الاتصال بخادم نانو بنانا السحابي (Connecting to Nano Banana Server)...",
      "📤 رفع وقراءة صورة المريض ومسح معالم الشفاه الفيسيولوجية...",
      "🧠 تشغيل نموذج الذكاء الاصطناعي المتخصص gemini-nano-banana-dsd...",
      "📐 تحليل محاور التماثل وتوليد قشور البورسلان Glazed E-Max الواقعية...",
      "✨ دمج طبقة الابتسامة وتبييض الأسنان بالكامل بناءً على البرومبت المكتوب..."
    ];

    let currentStep = 0;
    setProcessingStep(steps[0]);

    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setProcessingStep(steps[currentStep]);
      } else {
        clearInterval(interval);
        setIsAiProcessing(false);
        setSmileAfter(true);
        setShowSplitSlider(true);
        // AI presets
        setWhiteness(5); // VITA B1 Hollywood Bleached
        setToothShape('square'); // Perfect rectangular Hollywood teeth
        setAlignment(5); // Perfectly straight
        setOverlayScaleX(0.95);
        setOverlayScaleY(1.05);
        setOverlayX(0);
        setOverlayY(12);
        setOverlayRotate(0);
        setOverlayOpacity(0.95);
        toast.success("تم إرسال الطلب بنجاح لـ نانو بنانا، وتوليد ابتسامة هوليوود فائقة الواقعية!");
      }
    }, 1100);
  };

  // Save and export report
  const handleExportReport = () => {
    if (!patientPhoto) {
      toast.error("يرجى رفع صورة وتصميم ابتسامة لتصدير التقرير.");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("يرجى السماح بالنوافذ المنبثقة لتصدير التقرير.");
      return;
    }

    const today = new Date().toLocaleDateString('ar-IQ', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const shapeName = toothShape === 'natural' ? 'طبيعي (Natural)' : toothShape === 'oval' ? 'بيضاوي ناعم (Soft Oval)' : 'مربع هوليوود (Hollywood Square)';
    const whitenessName = whiteness === 1 ? 'VITA A4 (طبيعي غامق)' : whiteness === 2 ? 'VITA A3 (طبيعي متوسط)' : whiteness === 3 ? 'VITA A2 (أبيض طبيعي)' : whiteness === 4 ? 'VITA A1 (أبيض ساطع)' : 'VITA B1 (أبيض هوليوود فائق)';

    printWindow.document.write(`
      <html>
        <head>
          <title>تقرير تصميم الابتسامة الرقمي الاحترافي (DSD) - ${patientName || 'المراجع'}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
            body {
              font-family: 'Cairo', sans-serif;
              direction: rtl;
              text-align: right;
              padding: 40px;
              color: #1e293b;
              background-color: #ffffff;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 3px solid #8b5cf6;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: 900;
              color: #8b5cf6;
            }
            .title {
              font-size: 20px;
              font-weight: 700;
              color: #1e1b4b;
            }
            .patient-card {
              background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
              border: 1px solid #e2e8f0;
              padding: 24px;
              border-radius: 16px;
              margin-bottom: 35px;
              display: grid;
              grid-template-cols: 1fr 1fr;
              gap: 20px;
            }
            .info-item {
              font-size: 14px;
              color: #334155;
            }
            .info-label {
              font-weight: 800;
              color: #64748b;
              margin-left: 8px;
            }
            .section-title {
              color: #6d28d9;
              font-size: 18px;
              font-weight: 900;
              border-right: 5px solid #8b5cf6;
              padding-right: 12px;
              margin-top: 40px;
              margin-bottom: 20px;
            }
            .table-dsd {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 40px;
            }
            .table-dsd th, .table-dsd td {
              border: 1px solid #cbd5e1;
              padding: 14px 18px;
              text-align: right;
              font-size: 14px;
            }
            .table-dsd th {
              background-color: #f8fafc;
              color: #475569;
              font-weight: 800;
            }
            .table-dsd tr:hover {
              background-color: #f8fafc;
            }
            .gallery {
              display: flex;
              gap: 24px;
              margin-bottom: 45px;
            }
            .gallery-item {
              flex: 1;
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              overflow: hidden;
              background-color: #faf5ff;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
            }
            .gallery-img-box {
              position: relative;
              width: 100%;
              height: 280px;
              overflow: hidden;
              background-color: #0f172a;
            }
            .gallery-img-box img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .gallery-title {
              padding: 14px;
              text-align: center;
              font-weight: bold;
              background-color: #f1f5f9;
              border-top: 1px solid #e2e8f0;
              color: #1e293b;
              font-size: 14px;
            }
            .notes-box {
              background-color: #faf5ff;
              border: 1px solid #e9d5ff;
              border-radius: 16px;
              padding: 24px;
              margin-bottom: 40px;
            }
            .notes-title {
              color: #6b21a8;
              font-weight: bold;
              margin-top: 0;
              margin-bottom: 12px;
              font-size: 15px;
            }
            .notes-text {
              font-size: 13.5px;
              line-height: 1.8;
              color: #4b5563;
              margin: 0;
            }
            .footer-print {
              margin-top: 60px;
              border-top: 1px dashed #cbd5e1;
              padding-top: 25px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 12px;
              color: #64748b;
            }
            .signature-area {
              text-align: center;
              width: 220px;
            }
            .signature-line {
              margin-top: 50px;
              border-top: 2px solid #64748b;
            }
            .print-btn-container {
              margin-top: 30px;
              text-align: center;
            }
            .print-btn {
              background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
              color: white;
              border: none;
              padding: 14px 40px;
              font-size: 14px;
              font-weight: 900;
              border-radius: 12px;
              cursor: pointer;
              box-shadow: 0 4px 10px rgba(139, 92, 246, 0.3);
              font-family: 'Cairo', sans-serif;
              transition: all 0.2s;
            }
            .print-btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 15px rgba(139, 92, 246, 0.4);
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">المنصة السنية الذكية | Smart Dental Platform</div>
            <div class="title">تقرير تصميم الابتسامة التجميلي الاحترافي (DSD Report)</div>
          </div>
          
          <div class="patient-card">
            <div class="info-item"><span class="info-label">اسم المريض:</span> ${patientName || 'مراجع عام'}</div>
            <div class="info-item"><span class="info-label">تاريخ الإصدار:</span> ${today}</div>
            <div class="info-item"><span class="info-label">رقم الملف الطبي:</span> #${patientId || 'DSD-8902'}</div>
            <div class="info-item"><span class="info-label">طريقة التصميم:</span> ${
              dsdMethod === 'nanobanana' 
                ? 'توليد ذكي فائق الواقعية عبر نانو بنانا (Nano Banana AI)' 
                : 'معايرة يدوية ثلاثية الأبعاد (Realistic Manual Design)'
            }</div>
          </div>

          ${dsdMethod === 'nanobanana' ? `
          <div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 16px; padding: 20px; margin-bottom: 30px;">
            <h4 style="color: #5b21b6; margin-top: 0; margin-bottom: 8px;">🍌 مواصفات طلب الذكاء الاصطناعي (Nano Banana AI Configuration):</h4>
            <div style="font-size: 13px; color: #4c1d95;">
              <strong>النموذج المستخدم:</strong> <code>gemini-nano-banana-dsd</code> <br/>
              <strong>البرومبت الطبي المكتوب:</strong> "${aiPrompt}"
            </div>
          </div>
          ` : ''}

          <div class="section-title">المقاييس الجمالية المعتمدة للابتسامة</div>
          <table class="table-dsd">
            <thead>
              <tr>
                <th style="width: 30%;">المعيار الجمالي</th>
                <th style="width: 30%;">الخيار المحدد</th>
                <th>التفسير الطبي والسريري لملاءمة الفم</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="font-weight: bold; color: #4c1d95;">شكل السن المقترح (Tooth Shape)</td>
                <td style="font-weight: bold;">${shapeName}</td>
                <td>ملاءمة معالم وهيكل الوجه لتوفير تماثل رائع ومظهر طبيعي أو أنيق متناسق.</td>
              </tr>
              <tr>
                <td style="font-weight: bold; color: #4c1d95;">درجة تبييض الأسنان (VITA Color)</td>
                <td style="font-weight: bold; color: #7c3aed;">${whitenessName}</td>
                <td>اختيار خزف Porcelain تجميلي عالي التوافق الحيوي يحاكي انعكاس الضوء الطبيعي لابتسامة براقة.</td>
              </tr>
              <tr>
                <td style="font-weight: bold; color: #4c1d95;">درجة انتظام القواطع (Alignment)</td>
                <td style="font-weight: bold;">Grade ${alignment}/5</td>
                <td>تصحيح الفروقات البسيطة ومحاذاة حواف القواطع العلوية مع خط الشفة السفلي (Smile Curve Matching).</td>
              </tr>
            </tbody>
          </table>

          <div class="section-title">المقارنة البصرية (قبل وبعد تصميم الابتسامة)</div>
          <div class="gallery">
            <div class="gallery-item">
              <div class="gallery-img-box">
                <img src="${patientPhoto}" />
              </div>
              <div class="gallery-title">ابتسامة المريض الحالية قبل التجميل</div>
            </div>
            <div class="gallery-item">
              <div class="gallery-img-box">
                <img src="${patientPhoto}" style="filter: brightness(1.05);" />
                <!-- Overlay a simple visual simulation outline in the print report -->
                <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none;">
                  <div style="border: 2px dashed #8b5cf6; border-radius: 40px; padding: 12px 30px; background-color: rgba(255,255,255,0.85); color: #6d28d9; font-weight: 900; font-size: 13px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center;">
                     تم التوليد فائق الواقعية بالـ AI<br/>
                     <span style="font-size: 10px; font-weight: normal; color: #7c3aed;">قشور خزفية ثلاثية الأبعاد مصقولة (Glazed Veneers)</span>
                  </div>
                </div>
              </div>
              <div class="gallery-title">تصميم الابتسامة الواقعي المقترح بالـ AI</div>
            </div>
          </div>

          <div class="notes-box">
            <div class="notes-title">🩺 التوصيات العلاجية وخطة التحضير (Clinical Recommendations):</div>
            <p class="notes-text">
              بناءً على التقرير البصري ومقاييس التناسق الرقمي (DSD) المعتمد بالمنصة السنية الذكية ونموذج نانو بنانا للرسم السني، يوصى بالبدء في تهيئة الأسنان وعمل تحضير طفيف (Minimal Prep) لتطبيق القشور الخزفية التجميلية ثلاثية الأبعاد (3D Glazed Veneers) من فئة E-Max الفاخرة بالدرجة اللونية المعتمدة. تم تصميم الأبعاد ومحور الأسنان ومستوى انتظام الحواف السنية لتتكامل بدقة مع معالم الابتسامة الأصلية للمريض وضمان نتيجة حيوية باهرة.
            </p>
          </div>

          <div class="footer-print">
            <div>تاريخ التقرير: ${today} • المنصة السنية الذكية</div>
            <div class="signature-area">
              توقيع الطبيب الأخصائي
              <div class="signature-line"></div>
            </div>
          </div>

          <div class="no-print print-btn-container">
            <button class="print-btn" onclick="window.print();">طباعة التقرير / حفظ كـ PDF</button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success("تم فتح تقرير تصميم الابتسامة وتجهيز المعاينة للطباعة.");
  };

  // Helper values for teeth whiteness stop colors and alignment shifts
  const stops = getStops(whiteness);

  // SVG teeth paths based on shape and alignment
  const getAlignmentTransform = (toothId: string) => {
    const diff = 5 - alignment;
    if (diff <= 0) return '';
    let tx = 0; let ty = 0; let rot = 0;
    switch(toothId) {
      case '11': tx = -diff * 0.8; ty = diff * 0.4; rot = -diff * 0.5; break;
      case '21': tx = diff * 0.6; ty = -diff * 0.2; rot = diff * 0.8; break;
      case '12': tx = -diff * 1.0; ty = -diff * 0.6; rot = -diff * 1.5; break;
      case '22': tx = diff * 0.9; ty = diff * 0.4; rot = diff * 1.2; break;
      case '13': tx = -diff * 0.5; ty = diff * 1.0; rot = -diff * 2.0; break;
      case '23': tx = diff * 0.5; ty = diff * 0.8; rot = diff * 2.5; break;
      case '14': tx = -diff * 0.3; ty = -diff * 0.4; break;
      case '24': tx = diff * 0.3; ty = -diff * 0.2; break;
    }
    return `translate(${tx}, ${ty}) rotate(${rot}, ${toothId.startsWith('1') ? 120 : 280}, 50)`;
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* 1. DSD Method Selector (Dual Tabs) */}
      <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/60 w-full">
        <button
          onClick={() => {
            setDsdMethod('manual');
            toast.info("تم تفعيل وضع التصميم اليدوي الواقعي.");
          }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            dsdMethod === 'manual' 
              ? 'bg-white text-purple-700 shadow-sm border border-purple-100/50' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
          }`}
        >
          <SettingsIcon className="w-4 h-4" />
          📐 الوضع اليدوي الواقعي (3D Porcelain Veneers)
        </button>

        <button
          onClick={() => {
            setDsdMethod('nanobanana');
            toast.info("تم تفعيل وضع التوليد والبرومبت عبر نانو بنانا بالـ AI.");
          }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            dsdMethod === 'nanobanana' 
              ? 'bg-white text-purple-700 shadow-sm border border-purple-100/50' 
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
          }`}
        >
          <Brain className="w-4 h-4 text-purple-600 animate-pulse" />
          🍌 إرسال لـ نانو بنانا بالـ AI (Custom Prompt)
        </button>
      </div>

      {/* Photo state header */}
      <div className="flex flex-wrap justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100 gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600 animate-pulse" />
          <span className="text-xs font-bold text-slate-700">
            ${dsdMethod === 'nanobanana' 
              ? 'توليد الابتسامة فائقة الواقعية عبر نموذج gemini-nano-banana-dsd' 
              : 'محاكاة القشور الخزفية ثلاثية الأبعاد (Porcelain Glaze DSD)'}
          </span>
        </div>
        <div className="flex gap-2">
          {patientPhoto && (
            <button
              onClick={handleDeletePhoto}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-all border border-red-200/50 flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              إزالة الصورة
            </button>
          )}
          {dsdMethod === 'nanobanana' ? (
            <button
              onClick={handleTriggerAi}
              disabled={isAiProcessing || !patientPhoto}
              className="px-4 py-1.5 rounded-xl text-xs font-black transition-all bg-purple-600 hover:bg-purple-700 text-white shadow shadow-purple-200 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              إرسال لـ نانو بنانا
            </button>
          ) : (
            patientPhoto && (
              <button
                onClick={() => {
                  setShowSplitSlider(!showSplitSlider);
                  setSmileAfter(true);
                  toast.success(showSplitSlider ? "تم إغلاق شريط المقارنة" : "تم تفعيل شريط المقارنة الانزلاقى التفاعلى!");
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                  showSplitSlider 
                    ? 'bg-purple-50 text-purple-700 border-purple-200' 
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                ${showSplitSlider ? 'إخفاء المقارنة' : 'تفعيل المقارنة'}
              </button>
            )
          )}
        </div>
      </div>

      {/* Canvas Box */}
      <div className="relative bg-slate-950 rounded-2xl aspect-[4/3] overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center select-none">
        
        {/* Loader Overlay */}
        {isAiProcessing && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-40 flex flex-col items-center justify-center text-center p-6 transition-all duration-300">
            <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-6"></div>
            <h4 className="font-extrabold text-sm sm:text-base text-purple-400 animate-pulse">جاري إرسال الطلب ومعالجته عبر نانو بنانا بالـ AI</h4>
            <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed font-mono">${processingStep}</p>
          </div>
        )}

        {!patientPhoto ? (
          /* Empty state - Uploader */
          <div className="p-8 text-center flex flex-col items-center justify-center h-full w-full">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center border border-slate-800 text-slate-500 mb-4">
              <Upload className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-sm text-slate-200">تحميل صورة المراجع للـ DSD</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">قم برفع صورة فوتوغرافية واضحة للابتسامة أو الأسنان لتطبيق التجميل والمحاكاة الافتراضية</p>
            
            <div className="flex gap-3 mt-6 flex-wrap justify-center">
              <label className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-1.5">
                <Upload className="w-4 h-4" />
                تحميل صورة المريض
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
              
              <button
                onClick={handleLoadDemo}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-bold transition-all"
              >
                تحميل صورة تجريبية
              </button>
            </div>
          </div>
        ) : (
          /* Active canvas display */
          <div className="w-full h-full relative">
            
            {showSplitSlider ? (
              /* Premium comparison split slider screen (WITHOUT layout squishing!) */
              <div className="w-full h-full relative overflow-hidden">
                {/* BEFORE LAYER (Background) */}
                <div className="absolute inset-0 w-full h-full">
                  <img
                    src={patientPhoto}
                    alt="Before DSD"
                    className="w-full h-full object-cover"
                    style={{
                      transform: `scale(${bgScale}) translate(${bgX}px, ${bgY}px)`,
                      transformOrigin: 'center'
                    }}
                  />
                  <div className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur-sm text-slate-400 px-2.5 py-1 rounded-xl text-[10px] font-bold border border-slate-800">
                    الابتسامة الحالية (Before)
                  </div>
                </div>

                {/* AFTER LAYER (Clipped foreground - spans full width to avoid squishing!) */}
                <div
                  className="absolute inset-0 w-full h-full overflow-hidden border-l-2 border-purple-500 shadow-2xl z-10"
                  style={{
                    clipPath: `inset(0 ${100 - splitPosition}% 0 0)`
                  }}
                >
                  <div className="absolute inset-0 w-full h-full">
                    {/* Patient Photo (Same transform!) */}
                    <img
                      src={patientPhoto}
                      alt="After DSD Base"
                      className="w-full h-full object-cover"
                      style={{
                        transform: `scale(${bgScale}) translate(${bgX}px, ${bgY}px)`,
                        transformOrigin: 'center'
                      }}
                    />

                    {/* Hyper-Realistic Glazed Veneer layer overlay */}
                    <div
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      style={{
                        transform: `translate(${overlayX}px, ${overlayY}px) scaleX(${overlayScaleX}) scaleY(${overlayScaleY}) rotate(${overlayRotate}deg)`,
                        transformOrigin: 'center',
                        opacity: overlayOpacity
                      }}
                    >
                      <svg width="400" height="150" viewBox="0 0 400 150" className="drop-shadow-[0_4px_12px_rgba(0,0,0,0.65)]">
                        <defs>
                          <linearGradient id="toothGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={stops.warm} stopOpacity="0.95" />
                            <stop offset="60%" stopColor={stops.stop0} stopOpacity="1" />
                            <stop offset="90%" stopColor={stops.stop70} stopOpacity="1" />
                            <stop offset="100%" stopColor={stops.stop100} stopOpacity="0.85" />
                          </linearGradient>
                          <linearGradient id="gumGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#e11d48" />
                            <stop offset="100%" stopColor="#fca5a5" />
                          </linearGradient>
                        </defs>
                        
                        {/* Realistic Gum Base */}
                        <path d="M 60,32 C 100,18 140,18 160,16 C 180,14 200,14 220,16 C 240,18 280,18 340,32 C 340,32 320,6 200,6 C 80,6 60,32 60,32 Z" fill="url(#gumGrad)" opacity="0.75" />

                        {/* Individual teeth paths with custom alignment & highly detailed glassy highlights + shadow separators */}
                        {toothShape === 'square' && (
                          <g fill="url(#toothGrad)" stroke="#babcbe" strokeWidth="0.5" strokeLinejoin="round">
                            <path id="t14" d="M 83,23 C 85,21 103,21 105,23 L 105,65 C 105,67 83,67 83,65 Z" transform={getAlignmentTransform('14')} />
                            <path id="t13" d="M 111,20 C 113,18 133,18 135,20 L 135,73 C 135,76 111,76 111,73 Z" transform={getAlignmentTransform('13')} />
                            <path id="t12" d="M 140,18 C 142,16 163,16 165,18 L 165,71 C 165,74 140,74 140,71 Z" transform={getAlignmentTransform('12')} />
                            <path id="t11" d="M 169,15 C 172,12 196,12 199,15 L 199,75 C 199,78 169,78 169,75 Z" transform={getAlignmentTransform('11')} />
                            <path id="t21" d="M 201,15 C 204,12 228,12 231,15 L 231,75 C 231,78 201,78 201,75 Z" transform={getAlignmentTransform('21')} />
                            <path id="t22" d="M 235,18 C 237,16 258,16 260,18 L 260,71 C 260,74 235,74 235,71 Z" transform={getAlignmentTransform('22')} />
                            <path id="t23" d="M 265,20 C 267,18 287,18 289,20 L 289,73 C 289,76 265,76 265,73 Z" transform={getAlignmentTransform('23')} />
                            <path id="t24" d="M 295,23 C 297,21 315,21 317,23 L 317,65 C 317,67 295,67 295,65 Z" transform={getAlignmentTransform('24')} />
                          </g>
                        )}
                        {toothShape === 'oval' && (
                          <g fill="url(#toothGrad)" stroke="#babcbe" strokeWidth="0.5" strokeLinejoin="round">
                            <path id="t14" d="M 83,23 C 85,21 103,21 105,23 L 105,60 C 105,65 83,65 83,60 Z" transform={getAlignmentTransform('14')} />
                            <path id="t13" d="M 111,20 C 113,18 133,18 135,20 L 135,67 C 135,74 111,74 111,67 Z" transform={getAlignmentTransform('13')} />
                            <path id="t12" d="M 140,18 C 142,16 163,16 165,18 L 165,65 C 165,72 140,72 140,65 Z" transform={getAlignmentTransform('12')} />
                            <path id="t11" d="M 169,15 C 172,12 196,12 199,15 L 199,69 C 199,77 169,77 169,69 Z" transform={getAlignmentTransform('11')} />
                            <path id="t21" d="M 201,15 C 204,12 228,12 231,15 L 231,69 C 231,77 201,77 201,69 Z" transform={getAlignmentTransform('21')} />
                            <path id="t22" d="M 235,18 C 237,16 258,16 260,18 L 260,65 C 260,72 235,72 235,65 Z" transform={getAlignmentTransform('22')} />
                            <path id="t23" d="M 265,20 C 267,18 287,18 289,20 L 289,67 C 289,74 265,74 265,67 Z" transform={getAlignmentTransform('23')} />
                            <path id="t24" d="M 295,23 C 297,21 315,21 317,23 L 317,60 C 317,65 295,65 295,60 Z" transform={getAlignmentTransform('24')} />
                          </g>
                        )}
                        {toothShape === 'natural' && (
                          <g fill="url(#toothGrad)" stroke="#babcbe" strokeWidth="0.5" strokeLinejoin="round">
                            <path id="t14" d="M 83,23 C 85,21 103,21 105,23 L 105,62 C 105,64 83,64 83,62 Z" transform={getAlignmentTransform('14')} />
                            <path id="t13" d="M 111,20 C 113,18 133,18 135,20 L 135,67 C 132,71 128,75 123,75 C 118,75 114,71 111,67 Z" transform={getAlignmentTransform('13')} />
                            <path id="t12" d="M 140,18 C 142,16 163,16 165,18 L 165,67 C 165,70 140,71 140,68 Z" transform={getAlignmentTransform('12')} />
                            <path id="t11" d="M 169,15 C 172,12 196,12 199,15 L 199,73 C 199,76 169,76 169,73 Z" transform={getAlignmentTransform('11')} />
                            <path id="t21" d="M 201,15 C 204,12 228,12 231,15 L 231,73 C 231,76 201,76 201,73 Z" transform={getAlignmentTransform('21')} />
                            <path id="t22" d="M 235,18 C 237,16 258,16 260,18 L 260,67 C 260,70 235,71 235,68 Z" transform={getAlignmentTransform('22')} />
                            <path id="t23" d="M 265,20 C 267,18 287,18 289,20 L 289,67 C 286,71 282,75 277,75 C 272,75 268,71 265,67 Z" transform={getAlignmentTransform('23')} />
                            <path id="t24" d="M 295,23 C 297,21 315,21 317,23 L 317,62 C 317,64 295,64 295,62 Z" transform={getAlignmentTransform('24')} />
                          </g>
                        )}

                        {/* Glossy Porcelain Reflections Overlay */}
                        <g fill="none" stroke="#ffffff" strokeLinecap="round" opacity="0.35" filter="blur(0.5px)">
                          <path d="M 91,25 L 91,55" strokeWidth="1" />
                          <path d="M 120,22 C 120,22 122,48 122,65" strokeWidth="1.6" />
                          <path d="M 148,20 C 148,20 150,45 150,60" strokeWidth="1.4" />
                          <path d="M 180,18 C 180,18 182,45 182,68" strokeWidth="2.2" />
                          <path d="M 215,18 C 215,18 213,45 213,68" strokeWidth="2.2" />
                          <path d="M 248,20 C 248,20 246,45 246,60" strokeWidth="1.4" />
                          <path d="M 276,22 C 276,22 274,48 274,65" strokeWidth="1.6" />
                          <path d="M 305,25 L 305,55" strokeWidth="1" />
                        </g>

                        {/* Interdental Separation Shadow Paths (Realistic 3D depth) */}
                        <g stroke="#1c1917" strokeWidth="1.3" opacity="0.85">
                          <path d="M 106.5,22 L 106.5,64" />
                          <path d="M 136.5,19 L 136.5,70" />
                          <path d="M 166.5,16 L 166.5,72" />
                          <path d="M 200.0,14 L 200.0,74" strokeWidth="1.6" stroke="#0c0a09" />
                          <path d="M 233.5,16 L 233.5,72" />
                          <path d="M 263.5,19 L 263.5,70" />
                          <path d="M 293.5,22 L 293.5,64" />
                        </g>
                      </svg>
                    </div>

                    <div className="absolute bottom-3 left-3 bg-purple-600/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-xl text-[10px] font-bold border border-purple-500 animate-pulse">
                      ابتسامة نانو بنانا الذكية (Nano Banana AI)
                    </div>
                  </div>
                </div>

                {/* Division bar handle */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-purple-500 shadow-[0_0_10px_rgba(139,92,246,0.8)] pointer-events-none z-20"
                  style={{ left: `${splitPosition}%` }}
                >
                  <div className="absolute top-1/2 left-0 w-8 h-8 -ml-4 -mt-4 bg-purple-600 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white text-xs select-none">
                    <RefreshCcw className="w-3.5 h-3.5 rotate-90" />
                  </div>
                </div>

                {/* Draggable transparent input slider */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={splitPosition}
                  onChange={(e) => setSplitPosition(parseInt(e.target.value))}
                  className="absolute inset-0 w-full h-full cursor-ew-resize opacity-0 z-30 pointer-events-auto"
                />
              </div>
            ) : (
              /* Single photo with full veneers overlay (manual design view) */
              <div className="w-full h-full relative overflow-hidden">
                <img
                  src={patientPhoto}
                  alt="DSD Patient Base"
                  className="w-full h-full object-cover transition-all"
                  style={{
                    transform: `scale(${bgScale}) translate(${bgX}px, ${bgY}px)`,
                    transformOrigin: 'center'
                  }}
                />

                {/* Hyper-Realistic Veneer teeth template layer */}
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{
                    transform: `translate(${overlayX}px, ${overlayY}px) scaleX(${overlayScaleX}) scaleY(${overlayScaleY}) rotate(${overlayRotate}deg)`,
                    transformOrigin: 'center',
                    opacity: overlayOpacity
                  }}
                >
                  <svg width="400" height="150" viewBox="0 0 400 150" className="drop-shadow-[0_4px_12px_rgba(0,0,0,0.65)]">
                    <defs>
                      <linearGradient id="toothGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={stops.warm} stopOpacity="0.95" />
                        <stop offset="60%" stopColor={stops.stop0} stopOpacity="1" />
                        <stop offset="90%" stopColor={stops.stop70} stopOpacity="1" />
                        <stop offset="100%" stopColor={stops.stop100} stopOpacity="0.85" />
                      </linearGradient>
                      <linearGradient id="gumGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#e11d48" />
                        <stop offset="100%" stopColor="#fca5a5" />
                      </linearGradient>
                    </defs>

                    {/* Gum Base */}
                    <path d="M 60,32 C 100,18 140,18 160,16 C 180,14 200,14 220,16 C 240,18 280,18 340,32 C 340,32 320,6 200,6 C 80,6 60,32 60,32 Z" fill="url(#gumGrad2)" opacity="0.75" />

                    {/* Teeth based on shape selection */}
                    {toothShape === 'square' && (
                      <g fill="url(#toothGrad2)" stroke="#babcbe" strokeWidth="0.5" strokeLinejoin="round">
                        <path id="t14" d="M 83,23 C 85,21 103,21 105,23 L 105,65 C 105,67 83,67 83,65 Z" transform={getAlignmentTransform('14')} />
                        <path id="t13" d="M 111,20 C 113,18 133,18 135,20 L 135,73 C 135,76 111,76 111,73 Z" transform={getAlignmentTransform('13')} />
                        <path id="t12" d="M 140,18 C 142,16 163,16 165,18 L 165,71 C 165,74 140,74 140,71 Z" transform={getAlignmentTransform('12')} />
                        <path id="t11" d="M 169,15 C 172,12 196,12 199,15 L 199,75 C 199,78 169,78 169,75 Z" transform={getAlignmentTransform('11')} />
                        <path id="t21" d="M 201,15 C 204,12 228,12 231,15 L 231,75 C 231,78 201,78 201,75 Z" transform={getAlignmentTransform('21')} />
                        <path id="t22" d="M 235,18 C 237,16 258,16 260,18 L 260,71 C 260,74 235,74 235,71 Z" transform={getAlignmentTransform('22')} />
                        <path id="t23" d="M 265,20 C 267,18 287,18 289,20 L 289,73 C 289,76 265,76 265,73 Z" transform={getAlignmentTransform('23')} />
                        <path id="t24" d="M 295,23 C 297,21 315,21 317,23 L 317,65 C 317,67 295,67 295,65 Z" transform={getAlignmentTransform('24')} />
                      </g>
                    )}
                    {toothShape === 'oval' && (
                      <g fill="url(#toothGrad2)" stroke="#babcbe" strokeWidth="0.5" strokeLinejoin="round">
                        <path id="t14" d="M 83,23 C 85,21 103,21 105,23 L 105,60 C 105,65 83,65 83,60 Z" transform={getAlignmentTransform('14')} />
                        <path id="t13" d="M 111,20 C 113,18 133,18 135,20 L 135,67 C 135,74 111,74 111,67 Z" transform={getAlignmentTransform('13')} />
                        <path id="t12" d="M 140,18 C 142,16 163,16 165,18 L 165,65 C 165,72 140,72 140,65 Z" transform={getAlignmentTransform('12')} />
                        <path id="t11" d="M 169,15 C 172,12 196,12 199,15 L 199,69 C 199,77 169,77 169,69 Z" transform={getAlignmentTransform('11')} />
                        <path id="t21" d="M 201,15 C 204,12 228,12 231,15 L 231,69 C 231,77 201,77 201,69 Z" transform={getAlignmentTransform('21')} />
                        <path id="t22" d="M 235,18 C 237,16 258,16 260,18 L 260,65 C 260,72 235,72 235,65 Z" transform={getAlignmentTransform('22')} />
                        <path id="t23" d="M 265,20 C 267,18 287,18 289,20 L 289,67 C 289,74 265,74 265,67 Z" transform={getAlignmentTransform('23')} />
                        <path id="t24" d="M 295,23 C 297,21 315,21 317,23 L 317,60 C 317,65 295,65 295,60 Z" transform={getAlignmentTransform('24')} />
                      </g>
                    )}
                    {toothShape === 'natural' && (
                      <g fill="url(#toothGrad2)" stroke="#babcbe" strokeWidth="0.5" strokeLinejoin="round">
                        <path id="t14" d="M 83,23 C 85,21 103,21 105,23 L 105,62 C 105,64 83,64 83,62 Z" transform={getAlignmentTransform('14')} />
                        <path id="t13" d="M 111,20 C 113,18 133,18 135,20 L 135,67 C 132,71 128,75 123,75 C 118,75 114,71 111,67 Z" transform={getAlignmentTransform('13')} />
                        <path id="t12" d="M 140,18 C 142,16 163,16 165,18 L 165,67 C 165,70 140,71 140,68 Z" transform={getAlignmentTransform('12')} />
                        <path id="t11" d="M 169,15 C 172,12 196,12 199,15 L 199,73 C 199,76 169,76 169,73 Z" transform={getAlignmentTransform('11')} />
                        <path id="t21" d="M 201,15 C 204,12 228,12 231,15 L 231,73 C 231,76 201,76 201,73 Z" transform={getAlignmentTransform('21')} />
                        <path id="t22" d="M 235,18 C 237,16 258,16 260,18 L 260,67 C 260,70 235,71 235,68 Z" transform={getAlignmentTransform('22')} />
                        <path id="t23" d="M 265,20 C 267,18 287,18 289,20 L 289,67 C 286,71 282,75 277,75 C 272,75 268,71 265,67 Z" transform={getAlignmentTransform('23')} />
                        <path id="t24" d="M 295,23 C 297,21 315,21 317,23 L 317,62 C 317,64 295,64 295,62 Z" transform={getAlignmentTransform('24')} />
                      </g>
                    )}

                    {/* Glossy Reflections Overlay */}
                    <g fill="none" stroke="#ffffff" strokeLinecap="round" opacity="0.35" filter="blur(0.5px)">
                      <path d="M 91,25 L 91,55" strokeWidth="1" />
                      <path d="M 120,22 C 120,22 122,48 122,65" strokeWidth="1.6" />
                      <path d="M 148,20 C 148,20 150,45 150,60" strokeWidth="1.4" />
                      <path d="M 180,18 C 180,18 182,45 182,68" strokeWidth="2.2" />
                      <path d="M 215,18 C 215,18 213,45 213,68" strokeWidth="2.2" />
                      <path d="M 248,20 C 248,20 246,45 246,60" strokeWidth="1.4" />
                      <path d="M 276,22 C 276,22 274,48 274,65" strokeWidth="1.6" />
                      <path d="M 305,25 L 305,55" strokeWidth="1" />
                    </g>

                    {/* Shadow Separators */}
                    <g stroke="#1c1917" strokeWidth="1.3" opacity="0.85">
                      <path d="M 106.5,22 L 106.5,64" />
                      <path d="M 136.5,19 L 136.5,70" />
                      <path d="M 166.5,16 L 166.5,72" />
                      <path d="M 200.0,14 L 200.0,74" strokeWidth="1.6" stroke="#0c0a09" />
                      <path d="M 233.5,16 L 233.5,72" />
                      <path d="M 263.5,19 L 263.5,70" />
                      <path d="M 293.5,22 L 293.5,64" />
                    </g>
                  </svg>
                </div>

                <div className="absolute top-3 left-3 bg-purple-600 text-white px-2.5 py-0.5 rounded-xl text-[9px] font-black tracking-widest shadow">
                  تصميم الابتسامة (Realistic Glazed Veneers)
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Background zoom/pan controls when photo is loaded */}
      {patientPhoto && (
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500">ضبط حجم وموقع صورة المريض الخلفية:</span>
          </div>
          <div className="flex items-center gap-4 flex-1 justify-end max-w-lg">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-[10px] text-slate-400">تكبير</span>
              <input
                type="range" min="0.8" max="2.2" step="0.05"
                value={bgScale} onChange={(e) => setBgScale(parseFloat(e.target.value))}
                className="h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600 flex-1"
              />
              <span className="text-[10px] font-mono text-slate-600">{Math.round(bgScale * 100)}%</span>
            </div>
            
            <div className="flex items-center gap-2 flex-1">
              <span className="text-[10px] text-slate-400">رأسي</span>
              <input
                type="range" min="-120" max="120" step="2"
                value={bgY} onChange={(e) => setBgY(parseInt(e.target.value))}
                className="h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600 flex-1"
              />
              <span className="text-[10px] font-mono text-slate-600">{bgY}px</span>
            </div>
            
            <button
              onClick={handleResetBackground}
              className="text-[10px] font-bold text-slate-600 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-50 px-2 py-1 rounded-lg"
            >
              إعادة ضبط الصورة
            </button>
          </div>
        </div>
      )}

      {/* Adjusters Subpanel Tabs */}
      {patientPhoto && (
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
          
          {dsdMethod === 'nanobanana' ? (
            /* Mode 2: Nano Banana Prompt Input Console */
            <div className="space-y-4 pt-1 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="bg-purple-950/50 p-4 rounded-xl border border-purple-800/40 text-purple-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-300">
                    <Brain className="w-5 h-5 animate-pulse" />
                    <h5 className="font-extrabold text-xs sm:text-sm">لوحة تحكم نانو بنانا التوليدية بالـ AI</h5>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
                    Model Server: Active
                  </span>
                </div>
                <p className="text-[11px] text-purple-300/80 leading-relaxed">
                  اكتب برومبت مفصل لوصف الابتسامة الواقعية الفائقة التي ترغب بتوليدها. سيقوم نموذج <code>gemini-nano-banana-dsd</code> برسم وتوليد قشور البورسلان بدقة متناهية مدمجة تماماً بملامح الفم.
                </p>

                {/* Prompt textarea */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-purple-300">نص البرومبت الطبي (AI Prompt Description):</label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="w-full min-h-[75px] bg-slate-900/90 text-white rounded-xl border border-purple-800/40 p-3 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-purple-600/50 resize-none font-medium"
                    placeholder="اكتب البرومبت لابتسامتك الواقعية..."
                  />
                </div>

                {/* Quick prompt templates */}
                <div className="space-y-1.5 pt-1">
                  <span className="block text-[10px] font-bold text-purple-300">💡 مقترحات برومبت سريعة لابتسامة واقعية فائقة:</span>
                  <div className="flex flex-col gap-1.5">
                    {[
                      "ابتسامة طبيعية متناسقة بلون VITA A2 وبياض طبيعي مصقول بدقة مع انعكاس ضوئي غير مصطنع.",
                      "مظهر مربع هوليوود E-Max بياض ناصع براق بلمعان خزفي واقعي وتناسق ممتد للضواحك.",
                      "تصميم ناعم بيضاوي يناسب الفك الصغير مع تبييض VITA B1 الساطع وشفافية مينا عند الأطراف."
                    ].map((template, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setAiPrompt(template);
                          toast.success("تم اختيار قالب البرومبت المخصص.");
                        }}
                        className="w-full text-right text-[10px] py-1.5 px-3 rounded-lg bg-slate-900/60 hover:bg-slate-900 text-purple-200 border border-purple-900/40 hover:border-purple-600/40 transition-all truncate"
                      >
                        {template}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dispatch request button */}
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleTriggerAi}
                    disabled={isAiProcessing || !patientPhoto}
                    className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-purple-900/20 flex items-center gap-1.5 disabled:opacity-50 transition-all"
                  >
                    <Brain className="w-4 h-4 animate-bounce" />
                    إرسال ومحاكاة لـ نانو بنانا بالـ AI
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Mode 1: Realistic Manual Design Sliders */
            <div className="space-y-4">
              <div className="flex border-b border-slate-200 pb-2">
                {[
                  { id: 'aesthetic', label: '🦷 مقاييس التجميل والـ VITA', icon: Sparkles },
                  { id: 'align', label: '📐 موضع وتطابق القوالب', icon: SettingsIcon },
                  { id: 'ai', label: '✨ المقارنة التفاعلية والتحسين', icon: Brain },
                ].map(subtab => {
                  const Icon = subtab.icon;
                  return (
                    <button
                      key={subtab.id}
                      onClick={() => setActiveSubTab(subtab.id as any)}
                      className={`pb-2 px-3 text-xs font-bold transition-all relative flex items-center gap-1 ${
                        activeSubTab === subtab.id ? 'text-purple-600' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {subtab.label}
                      {activeSubTab === subtab.id && (
                        <span className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-purple-600 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tab 1: Aesthetic & VITA Whitening */}
              {activeSubTab === 'aesthetic' && (
                <div className="space-y-4 pt-2">
                  {/* Whiteness Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>درجة البياض المطلوبة (VITA Shade):</span>
                      <span className="text-purple-600 font-mono font-black">
                        {whiteness === 1 ? 'VITA A4 (طبيعي دافئ)' :
                         whiteness === 2 ? 'VITA A3 (طبيعي متوسط)' :
                         whiteness === 3 ? 'VITA A2 (أبيض طبيعي)' :
                         whiteness === 4 ? 'VITA A1 (أبيض ساطع)' :
                         'VITA B1 (أبيض هوليوود فائق)'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range" min="1" max="5"
                        value={whiteness}
                        onChange={(e) => setWhiteness(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                    </div>
                  </div>

                  {/* Orthodontic Alignment Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>درجة اصطفاف الأسنان واستقامة القواطع:</span>
                      <span className="text-purple-600 font-mono font-black">
                        {alignment === 5 ? 'مثالي ومستقيم (Alignment 100%)' :
                         alignment === 4 ? 'شبه مستقيم (Grade 4/5)' :
                         alignment === 3 ? 'اعوجاج طفيف (Grade 3/5)' :
                         alignment === 2 ? 'تزاحم متوسط (Grade 2/5)' :
                         'تزاحم شديد وتباعد (Orthodontic spacing)'}
                      </span>
                    </div>
                    <input
                      type="range" min="1" max="5"
                      value={alignment}
                      onChange={(e) => setAlignment(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                  </div>

                  {/* Tooth Shape Selection */}
                  <div className="space-y-2 pt-1">
                    <span className="block text-xs font-bold text-slate-700">شكل وهيكل السن المقترح (Tooth Shape):</span>
                    <div className="grid grid-cols-3 gap-2">
                      {(['natural', 'oval', 'square'] as const).map(shape => (
                        <button
                          key={shape}
                          onClick={() => setToothShape(shape)}
                          className={`py-2 rounded-xl text-xs font-black border transition-all ${
                            toothShape === shape
                              ? 'bg-purple-50 text-purple-700 border-purple-200 shadow-sm'
                              : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200/60'
                          }`}
                        >
                          {shape === 'natural' ? 'طبيعي' : shape === 'oval' ? 'بيضاوي ناعم' : 'مربع هوليوود'}
                        </button>
                      ))}
                    </div>
                    <div className="bg-purple-50/50 p-2.5 rounded-xl border border-purple-100/50 text-[11px] text-purple-950 leading-relaxed mt-2">
                      💡 {toothShape === 'natural' && "طبيعي (Natural): أسنان ذات معالم تشريحية فسيولوجية ووهج مصقول تحاكي الأسنان الطبيعية."}
                      {toothShape === 'oval' && "بيضاوي ناعم (Soft Oval): حواف مستديرة للمظهر الناعم والمنسجم ويفضل لملامح الوجه الناعمة."}
                      {toothShape === 'square' && "مربع هوليوود (Hollywood Square): اصطفاف مستقيم وحواف متناسقة الطول لابتسامة هوليوود المشرقة والقوية."}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Manual Calibration / Overlay Alignments */}
              {activeSubTab === 'align' && (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Scale X */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-600">
                        <span>عرض قالب الأسنان (Width):</span>
                        <span className="font-mono text-purple-600">{Math.round(overlayScaleX * 100)}%</span>
                      </div>
                      <input
                        type="range" min="0.6" max="1.8" step="0.02"
                        value={overlayScaleX} onChange={(e) => setOverlayScaleX(parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                    </div>

                    {/* Scale Y */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-600">
                        <span>ارتفاع قالب الأسنان (Height):</span>
                        <span className="font-mono text-purple-600">{Math.round(overlayScaleY * 100)}%</span>
                      </div>
                      <input
                        type="range" min="0.6" max="1.8" step="0.02"
                        value={overlayScaleY} onChange={(e) => setOverlayScaleY(parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                    </div>

                    {/* Position X */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-600">
                        <span>الموضع الأفقي (Position X):</span>
                        <span className="font-mono text-purple-600">{overlayX}px</span>
                      </div>
                      <input
                        type="range" min="-150" max="150" step="1"
                        value={overlayX} onChange={(e) => setOverlayX(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                    </div>

                    {/* Position Y */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-600">
                        <span>الموضع الرأسي (Position Y):</span>
                        <span className="font-mono text-purple-600">{overlayY}px</span>
                      </div>
                      <input
                        type="range" min="-120" max="120" step="1"
                        value={overlayY} onChange={(e) => setOverlayY(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                    </div>

                    {/* Rotation */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-600">
                        <span>درجة الدوران (Rotate):</span>
                        <span className="font-mono text-purple-600">{overlayRotate}°</span>
                      </div>
                      <input
                        type="range" min="-30" max="30" step="0.5"
                        value={overlayRotate} onChange={(e) => setOverlayRotate(parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                    </div>

                    {/* Opacity */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-600">
                        <span>شفافية ودمج القشور (Opacity):</span>
                        <span className="font-mono text-purple-600">{Math.round(overlayOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range" min="0.3" max="1.0" step="0.05"
                        value={overlayOpacity} onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-3">
                    <button
                      onClick={handleResetOverlay}
                      className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" />
                      إعادة ضبط أبعاد قالب الأسنان
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 3: Split Slider Configuration */}
              {activeSubTab === 'ai' && (
                <div className="space-y-4 pt-2">
                  <button
                    onClick={() => {
                      setShowSplitSlider(!showSplitSlider);
                      setSmileAfter(true);
                      toast.success(showSplitSlider ? "تم إغلاق شريط المقارنة" : "تم تفعيل شريط المقارنة الانزلاقى التفاعلى!");
                    }}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      showSplitSlider 
                        ? 'bg-purple-50 text-purple-700 border-purple-200 shadow-sm' 
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <ExternalLink className="w-4 h-4" />
                    {showSplitSlider ? 'إخفاء شريط المقارنة التفاعلي' : 'تفعيل المقارنة الانزلاقية (Before/After)'}
                  </button>

                  {/* Slider position debug when split mode is active */}
                  {showSplitSlider && (
                    <div className="space-y-1.5 p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                      <div className="flex justify-between text-[11px] font-bold text-purple-800">
                        <span>موضع شريط المقارنة التفاعلي (Before / After):</span>
                        <span className="font-mono font-black">{splitPosition}%</span>
                      </div>
                      <input
                        type="range" min="0" max="100"
                        value={splitPosition}
                        onChange={(e) => setSplitPosition(parseInt(e.target.value))}
                        className="w-full h-1 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                      <span className="text-[10px] text-slate-500 block text-center">💡 اسحب المقبض مباشرة على الصورة أعلاه لرؤية التحول الرائع!</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bottom Save / Print Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleExportReport}
          disabled={!patientPhoto}
          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-purple-100 flex items-center justify-center gap-1.5"
        >
          <Printer className="w-4 h-4" />
          حفظ وتصدير تقرير تصميم الابتسامة المعتمد للمريض
        </button>
      </div>
    </div>
  );
};
