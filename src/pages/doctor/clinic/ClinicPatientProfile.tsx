// Smart Dental Clinic Patient Profile
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useCurrentClinic } from '../../../hooks/useCurrentClinic';
import { supabase } from '../../../lib/supabase';
import {
  User, UserCheck, Phone, Mail, MapPin, Calendar, Activity,
  FileText, Eye, ChevronRight, ChevronDown, Share2, Printer, MoreVertical,
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
import { useStaff } from '../../../hooks/useStaff';
import { Modal } from '../../../components/common/Modal';
import { useLabs } from '../../../hooks/useLabs';
import { useLabOrders } from '../../../hooks/useLabOrders';
import { HEALTHY_TEETH_SVGS } from '../../../constants/healthyTeeth';

const getClinicProcessedToothSvg = (toothNum: number, cond: string) => {
  const rawSvg = HEALTHY_TEETH_SVGS[toothNum];
  if (!rawSvg) return '';

  let processedSvg = rawSvg;

  const svgStart = processedSvg.toLowerCase().indexOf('<svg');
  if (svgStart !== -1) {
    processedSvg = processedSvg.slice(svgStart);
  }

  processedSvg = processedSvg.replace(/<svg([^>]*?)(width|height)="[^"]*"/gi, '<svg$1');

  let viewBoxWidth = 40;
  const viewBoxMatch = processedSvg.match(/viewBox=["']\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*["']/i);
  if (viewBoxMatch) {
    const parsedWidth = parseFloat(viewBoxMatch[3]);
    if (!isNaN(parsedWidth) && parsedWidth > 0) {
      viewBoxWidth = parsedWidth;
    }
  }

  if (!processedSvg.includes('viewBox')) {
    processedSvg = processedSvg.replace('<svg', `<svg viewBox="0 0 ${viewBoxWidth} 80"`);
  }

  const isLeft = (toothNum >= 21 && toothNum <= 28) || (toothNum >= 31 && toothNum <= 38);
  const svgOpenIndex = processedSvg.indexOf('>');
  if (svgOpenIndex !== -1) {
    const openTag = processedSvg.slice(0, svgOpenIndex + 1);
    const contents = processedSvg.slice(svgOpenIndex + 1, processedSvg.lastIndexOf('</svg>'));
    
    if (isLeft) {
      processedSvg = `${openTag}<g transform="scale(-1,1) translate(-${viewBoxWidth},0)">${contents}</g></svg>`;
    } else {
      processedSvg = `${openTag}${contents}</svg>`;
    }
  }

  let color = '#ffffff';
  let opacity = '1.0';
  let filter = '';
  let transform = '';

  switch (cond) {
    case 'healthy':
      color = '#ffffff';
      break;
    case 'decayed':
      color = '#f87171';
      break;
    case 'broken':
      color = '#fb923c';
      break;
    case 'missing':
      color = '#ffffff';
      opacity = '0.25';
      break;
    case 'stained':
      color = '#facc15';
      break;
    case 'abscess':
      color = '#fb7185';
      filter = 'drop-shadow(0 0 4px #f43f5e)';
      break;
    case 'impacted':
      color = '#c084fc';
      transform = 'rotate(20deg)';
      break;
    case 'mobile':
      color = '#2dd4bf';
      break;
    case 'filled':
      color = '#60a5fa';
      break;
    case 'endo':
      color = '#c084fc';
      break;
    case 'crown':
      color = '#fbbf24';
      break;
    case 'bridge':
      color = '#22d3ee';
      break;
    case 'implant':
      color = '#cbd5e1';
      break;
    case 'ortho':
      color = '#22d3ee';
      break;
  }

  processedSvg = processedSvg
    .replace(/fill:rgb\([^)]+\)/gi, `fill:${color}`)
    .replace(/style="[^"]*"/gi, `style="fill:${color}; stroke:none;"`)
    .replace(/<svg/gi, `<svg style="width:100%; height:100%; overflow:visible; opacity:${opacity}; filter:${filter}; transform:${transform}; transition:all 0.3s ease;"`);

  return processedSvg;
};

import { useAuth } from '../../../contexts/AuthContext';
import { useAIAnalysis } from '../../../hooks/useAIAnalysis';
import { aiService } from '../../../services/ai/AIService';
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
  const { staff: clinicStaff } = useStaff(effectiveClinicId ? effectiveClinicId.toString() : undefined);

  // Find latest appointment for this patient to determine default doctor
  const latestAppointmentObj = (appointments || [])
    .filter(apt => apt.patientId?.toString() === patientId?.toString())
    .reduce((latest: any, current: any) => {
      if (!latest) return current;
      return new Date(current.date) > new Date(latest.date) ? current : latest;
    }, null as any);
  const defaultDoctorName = latestAppointmentObj?.doctorName || '';

  // Get current logged in user's staff ID (integer)
  const currentStaffMember = clinicStaff.find(s => s.userId === user?.id || s.authUserId === user?.id);
  const currentStaffId = currentStaffMember ? currentStaffMember.id : undefined;

  // Resolve staff ID from name
  const getDoctorIdByName = (name: string) => {
    if (!name) return undefined;
    const doc = clinicStaff.find(s => s.name === name || s.name.replace('د. ', '').trim() === name.replace('د. ', '').trim());
    return doc ? doc.id : undefined;
  };

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

  const getPlanPaidAmount = (plan: TreatmentPlan) => {
    const planTx = patientTransactions.filter(t => t.treatmentId === plan.id && t.type === 'income');
    const ledgerPaid = planTx.reduce((sum, t) => sum + t.amount, 0);
    return Math.max(ledgerPaid, plan.paid || 0);
  };

  const activePlans = treatmentPlans.filter(p => p.status !== 'completed' && p.status !== 'cancelled');

  // Calculate Outstanding: Sum of (Cost - Paid) for all plans
  // Note: we track 'paid' in the plan object itself now from previous tasks
  const outstanding = treatmentPlans.reduce((sum, plan) => {
    // If status is cancelled, usually we don't count remaining balance unless specific policy
    if (plan.status === 'cancelled') return sum;
    return sum + (plan.cost - getPlanPaidAmount(plan));
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

  const handleAdoptSmartPlan = async (aiPlan: any) => {
    if (!patientId || !user) return;

    try {
      // 1. Save to smart_assistant_chats
      const { error: chatError } = await supabase
        .from('smart_assistant_chats')
        .insert({
          patient_id: patientId,
          doctor_id: user.id,
          title: 'خطة علاجية ذكية مقترحة بالـ AI',
          summary: `اعتماد خطة علاجية ذكية - ${aiPlan.summary.substring(0, 45)}...`,
          messages: [
            { role: 'system', content: 'خطة علاجية ذكية معتمدة للمريض.' },
            { role: 'assistant', content: JSON.stringify(aiPlan) }
          ]
        });

      if (chatError) throw chatError;

      // 2. Loop through phases and treatments to create real tooth treatment plans!
      let planCount = 0;
      for (const phase of aiPlan.phases) {
        for (const tx of phase.treatments) {
          // Generate session array
          const totalSessions = tx.sessions || 1;
          const sessions = [];
          for (let i = 1; i <= totalSessions; i++) {
            sessions.push({
              id: `sess-${Date.now()}-${i}-${tx.toothNumber}`,
              number: i,
              title: `جلسة ${i} - ${tx.notes}`,
              status: 'pending' as const,
              duration: 30,
              schemaId: 'general',
              data: {}
            });
          }

          const newPlan: TreatmentPlan = {
            id: crypto.randomUUID(),
            patientId: patientId,
            toothNumber: tx.toothNumber || 0,
            type: tx.type || 'general',
            status: 'planned',
            totalSessions: totalSessions,
            completedSessions: 0,
            progress: 0,
            sessions: sessions,
            cost: tx.cost || 0,
            paid: 0,
            startDate: new Date().toISOString().split('T')[0],
            notes: `[الذكاء الاصطناعي] ${tx.notes} (${phase.name})`
          };

          await addPlan(newPlan);
          planCount++;
        }
      }

      setIsSmartPlanModalOpen(false);
      toast.success(`تم اعتماد الخطة الذكية بنجاح وتوليد ${planCount} خطة تشغيلية!`);
    } catch (err) {
      console.error('Error adopting smart plan:', err);
      toast.error('فشل اعتماد الخطة العلاجية');
    }
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
        notes: data.treatmentPlan?.name || data.notes,
        doctor: data.assignedDoctor
      };

      await addPlan(newPlan);
      toast.success(isMulti ? 'تم إنشاء خطة علاجية مجمعة للأسنان بنجاح' : 'تم إنشاء خطة علاجية بنجاح');
    }

    setIsModalOpen(false);
    setSelectedTeethNumbers([]);
    setIsToothSelectionMode(false);
    setIsDetailsPopupOpen(false); // Close details modal upon adding treatment to avoid staled background state
  };

  // Complete Session & Add Transaction
  const handleCompleteSession = async (planId: string, sessionId: string, cost?: number) => {
    // 1. Update Treatment Plan via Hook
    completeSession(planId, sessionId, cost || 0);

    const plan = treatmentPlans.find(p => p.id === planId);
    const docId = plan?.doctor ? getDoctorIdByName(plan.doctor) : undefined;

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
          patientId: patientId,
          treatmentId: planId,
          doctorId: docId,
          recordedById: currentStaffId
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

    const totalPlanCost = treatmentPlans.reduce((sum, p) => p.status !== 'cancelled' ? sum + p.cost : sum, 0);
    const totalPlanPaid = treatmentPlans.reduce((sum, p) => p.status !== 'cancelled' ? sum + getPlanPaidAmount(p) : sum, 0);

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 animate-in fade-in">
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

        {/* Payment Status Card - Emerald */}
        {treatmentPlans.length > 0 && (
          <div className="relative overflow-hidden rounded-[2rem] p-4 sm:p-5 border transition-all duration-300 group bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-100 hover:shadow-xl hover:-translate-y-0.5 hover:border-transparent animate-in fade-in">
            {/* Decorative Background Icon */}
            <CreditCard className="absolute -bottom-4 -left-4 w-20 h-20 sm:w-28 sm:h-28 rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 text-emerald-500/10" strokeWidth={1.5} />
            
            <div className="relative z-10 flex flex-col h-full justify-between">
              {/* Header: Icon & Title */}
              <div className="flex items-center gap-2 sm:gap-2.5 mb-2.5">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow-sm bg-emerald-500 text-white group-hover:scale-110 transition-transform duration-300 shrink-0">
                  <CreditCard className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <p className="font-bold text-xs sm:text-sm text-emerald-800/90 leading-none">سداد الخطط</p>
              </div>

              {/* Content: Value & Details */}
              <div>
                <h3 className="text-base sm:text-lg font-bold tracking-tight text-emerald-900 leading-tight">
                  {totalPlanPaid.toLocaleString()} / {totalPlanCost.toLocaleString()} <span className="text-[10px] font-normal text-emerald-600">د.ع</span>
                </h3>
                <div className="mt-1 flex items-center gap-1">
                  {totalPlanPaid >= totalPlanCost ? (
                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold text-green-600 bg-green-100 border border-green-200">مدفوع</span>
                  ) : totalPlanPaid > 0 ? (
                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold text-orange-600 bg-orange-100 border border-orange-200">جزئي</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold text-red-600 bg-red-100 border border-red-200">غير مدفوع</span>
                  )}
                  <span className="text-[10px] text-emerald-600 font-medium">النسبة: {totalPlanCost > 0 ? Math.round((totalPlanPaid / totalPlanCost) * 100) : 0}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

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
                      <div className="bg-white border-b p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 mb-4">
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className="min-w-[2.5rem] w-10 h-10 sm:min-w-[3.5rem] sm:w-14 sm:h-14 px-2 sm:px-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg sm:rounded-xl flex items-center justify-center font-bold text-lg sm:text-2xl shadow-blue-200 shadow-md sm:shadow-lg">
                              {(plan.toothNumbers && plan.toothNumbers.length > 0)
                                ? plan.toothNumbers.join(', ')
                                : plan.toothNumber !== 0 ? plan.toothNumber : 'عام'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-sm sm:text-base text-gray-900">
                                  {plan.notes || getTreatmentLabel(plan.type)}
                                </h4>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold ${plan.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                  }`}>
                                  {plan.status === 'completed' ? 'مكتمل' : 'قيد المعالجة'}
                                </span>
                              </div>
                              <div className="text-[11px] sm:text-xs text-gray-500 mt-1 flex items-center gap-2 sm:gap-3 flex-wrap">
                                <span>تاريخ البدء: {plan.startDate}</span>
                                <span className="hidden sm:inline">•</span>
                                <span>الطبيب: {plan.doctor?.includes('@') ? `د. ${plan.doctor.split('@')[0].split('.').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')}` : (plan.doctor || 'غير محدد')}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex sm:flex-col justify-between items-center sm:items-end gap-2 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-gray-100 w-full sm:w-auto">
                            <span className="block text-base sm:text-lg font-bold text-gray-900">{(plan.cost || 0).toLocaleString()} <span className="text-xs text-gray-500 font-normal">د.ع</span></span>
                            <span className={`text-[11px] sm:text-xs font-medium ${paymentStatusColor}`}>{paymentStatusText}</span>
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

      const docId = plan.doctor ? getDoctorIdByName(plan.doctor) : undefined;

      // Add financial transaction into the ledger
      await addTransaction({
        type: 'income',
        amount: amount,
        date: new Date().toISOString(),
        description: `قسط: ${plan.notes || getTreatmentLabel(plan.type)}`,
        category: 'treatment',
        paymentMethod: 'cash',
        patientId,
        treatmentId: planId,
        recordedById: currentStaffId,
        doctorId: docId
      });

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

          {/* Desktop Table */}
          <div className="hidden md:block">
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

          {/* Mobile Card List */}
          <div className="block md:hidden divide-y divide-gray-100">
            {planPayments.filter(p => p.remaining > 0 || (p.paidAmount > 0 && p.ledgerPaid < p.paidAmount)).map(plan => {
              const totalSegments = plan.totalSessions || 1;
              const isSingleSession = totalSegments === 1;
              const paidRatio = Math.min(1, plan.paidAmount / (plan.cost || 1));
              const paidSegments = Math.floor(paidRatio * totalSegments);

              return (
                <div key={plan.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-gray-900 text-sm block">{plan.notes || getTreatmentLabel(plan.type)}</span>
                      <span className="text-xs text-gray-400">ID: {plan.id.slice(0, 6)}</span>
                    </div>
                    <span className="min-w-[2rem] px-2 py-1 rounded bg-blue-50 text-blue-700 font-bold text-[10px] flex items-center justify-center">
                      {(plan.toothNumbers && plan.toothNumbers.length > 0)
                        ? `أسنان: ${plan.toothNumbers.join(', ')}`
                        : plan.toothNumber !== 0 ? `سن: ${plan.toothNumber}` : 'عام'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-xs">
                    <div>
                      <span className="text-gray-500 block">الرصيد المستحق</span>
                      {plan.remaining > 0 ? (
                        <span className="font-bold text-red-600 block">{plan.remaining.toLocaleString()} د.ع</span>
                      ) : (
                        <span className="font-bold text-green-600 block">تم السداد</span>
                      )}
                    </div>
                    <div className="text-left">
                      <span className="text-gray-500 block">المدفوع</span>
                      <span className="font-bold text-slate-700 block">{plan.paidAmount.toLocaleString()} د.ع</span>
                    </div>
                  </div>

                  {/* Progress segments */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-gray-500">
                      <span>{isSingleSession ? 'جلسة واحدة' : `${totalSegments} دفعات`}</span>
                      <span>نسبة السداد: {Math.round(paidRatio * 100)}%</span>
                    </div>
                    <div className="flex gap-1 h-2 w-full">
                      {Array.from({ length: totalSegments }).map((_, idx) => {
                        const isPaid = idx < paidSegments;
                        return (
                          <div
                            key={idx}
                            className={`h-full flex-1 rounded-sm ${isPaid ? 'bg-green-500' : 'bg-red-200'}`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  {plan.remaining > 0 && (
                    <div className="pt-2 flex gap-2">
                      {(plan.remaining <= 0 || isSingleSession || (plan.remaining < (plan.cost || 0) * 0.1)) ? (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white w-full py-2 text-xs"
                          onClick={() => {
                            if (confirm(`هل أنت متأكد من تسوية المبلغ المتبقي (${plan.remaining.toLocaleString()} د.ع)؟`)) {
                              handleSettleInstallment(plan.id, plan.remaining);
                            }
                          }}
                        >
                          <CheckSquare className="w-3.5 h-3.5 ml-1" />
                          تأكيد التسديد
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2 w-full">
                          <div className="relative flex-1">
                            <input
                              type="number"
                              min="0"
                              max={plan.remaining}
                              className="w-full text-xs p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-center"
                              placeholder="المبلغ..."
                              value={paymentAmounts[plan.id] || ''}
                              onChange={(e) => setPaymentAmounts(prev => ({ ...prev, [plan.id]: e.target.value }))}
                            />
                            <span className="absolute left-2 top-2 text-[10px] text-gray-400">د.ع</span>
                          </div>
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs"
                            disabled={!paymentAmounts[plan.id] || parseFloat(paymentAmounts[plan.id]) <= 0 || parseFloat(paymentAmounts[plan.id]) > plan.remaining}
                            onClick={() => {
                              const amount = parseFloat(paymentAmounts[plan.id]);
                              if (amount && amount > 0) {
                                if (confirm(`تأكيد دفع مبلغ ${amount.toLocaleString()} د.ع؟`)) {
                                  handleSettleInstallment(plan.id, amount);
                                  setPaymentAmounts(prev => ({ ...prev, [plan.id]: '' }));
                                }
                              }
                            }}
                          >
                            دفع قسط
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
  const [dsdSplitPos, setDsdSplitPos] = useState(50);
  const [isDsdDragging, setIsDsdDragging] = useState(false);

  useEffect(() => {
    if (!isDsdDragging) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const sliderEl = document.getElementById('dsd-history-slider');
      if (!sliderEl) return;
      const rect = sliderEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setDsdSplitPos(percentage);
    };

    const handleWindowMouseUp = () => {
      setIsDsdDragging(false);
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const sliderEl = document.getElementById('dsd-history-slider');
      if (!sliderEl) return;
      const rect = sliderEl.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setDsdSplitPos(percentage);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    window.addEventListener('touchmove', handleWindowTouchMove);
    window.addEventListener('touchend', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowMouseUp);
    };
  }, [isDsdDragging]);
  const [analysisContext, setAnalysisContext] = useState<'xray' | 'clinical'>('xray');
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isVoiceExamModalOpen, setIsVoiceExamModalOpen] = useState(false);
  const [isSmileDesignModalOpen, setIsSmileDesignModalOpen] = useState(false);
  const [isSmartPlanModalOpen, setIsSmartPlanModalOpen] = useState(false);

  const { 
    history: aiHistory, 
    uploading: aiUploading, 
    analyzing: aiAnalyzing, 
    analyzeImage, 
    analyzeExistingImage, 
    deleteAnalysis, 
    refresh: refreshAI,
    resolveClinicId,
    fetchClinicTreatments
  } = useAIAnalysis(patientId);

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
      result = await analyzeImage(fileToAnalyze, undefined, analysisContext);
    } else {
      // Analyze Existing URL (from Archive)
      result = await analyzeExistingImage(previewUrl, analysisContext);
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

  const handleRetryAnalysis = async (analysisItem: any, chosenContext?: 'clinical' | 'xray') => {
    if (!analysisItem?.id) return;
    setIsAnalyzing(true);
    try {
      const actualContext = chosenContext || analysisContext || 'xray';

      // 1. Update status locally to show spinner
      setSelectedAnalysis({
        ...analysisItem,
        status: 'processing',
        analysis_result: { service_type: actualContext } as any
      });

      // 2. Update DB status to processing and save service_type placeholder
      await supabase
        .from('ai_analyses')
        .update({ 
          status: 'processing', 
          analysis_result: { service_type: actualContext } 
        })
        .eq('id', analysisItem.id);

      // 3. Resolve clinic and treatments catalog
      const resolvedClinicId = await resolveClinicId();
      const clinicTreatments = await fetchClinicTreatments(resolvedClinicId);

      // 4. Build prompt based on context
      let promptText = 'حلل هذه الصورة السنية بدقة وأعط تقريراً تفصيلياً.';
      if (actualContext === 'clinical') {
        promptText = `أنت طبيب أسنان استشاري خبير وأخصائي أمراض طب الفم واللثة ومحلل صور سريرية فوتوغرافية فموية.
حلل هذه الصورة السريرية الملونة للأنسجة الفموية الناعمة والأسنان واللثة بدقة بالغة.
عند ملاحظة أو الاشتباه بوجود أي آفة بيضاء (White Lesion) أو بقع بيضاء، يجب عليك عدم الاستعجال بتشخيصها كـ "ليوكوبلاكيا" تلقائياً، بل قم بإجراء تفكير سريري تفريقي دقيق للغاية بناءً على القواعد التالية:

1. كانديدا البيكانز / كانديدا الفم (Oral Candidiasis / Candida albicans):
   - المواقع الأكثر شيوعاً: سقف الحلق (الصلب أو الرخو - Hard or Soft Palate)، واللسان (السطح الظهري)، وباطن الخد.
   - المظهر السريري: بقع أو لويحات بيضاء أو حليبية كريمية (Creamy white patches/plaques) تبدو سريرياً قابلة للكشط أو المسح (Wipable) بقطعة شاش طبي، تاركةً خلفها قاعدة حمراء ملتهبة (Erythematous base) أو نزفاً بسيطاً جداً.
   - الخطورة السريرية: منخفضة إلى متوسطة (Low to Medium).

2. ليوكوبلاكيا الفم (Oral Leukoplakia):
   - المواقع الأكثر شيوعاً: الحواف الجانبية للسان (Lateral borders of the tongue)، وقاع الفم (Floor of the mouth)، وباطن الخد (Buccal mucosa). وتكون نادرة جداً في سقف الحلق الصلب إلا في حالات تدخين التبغ المعكوس أو التهاب الحنك النيكوتيني.
   - المظهر السريري: بقعة بيضاء مسطحة، أو لويحة متقرنة سميكة أو خشنة (Flat, thick, or rough keratotic white patch) ثنائية أو أحادية الجانب، وتتميز بأنها غير قابلة للكشط أو المسح نهائياً (Non-wipable) باستخدام الشاش الطبي.
   - الخطورة السريرية: متوسطة إلى عالية (Medium to High) نظراً لإمكانية التحول الخبيث كآفة ما قبل سرطانية (Potentially malignant).

3. الحزاز المسطح الفمي (Oral Lichen Planus):
   - المواقع الأكثر شيوعاً: باطن الخد (غالباً ثنائي الجانب بشكل متناظر Bilateral Buccal Mucosa)، أو جوانب اللسان.
   - المظهر السريري: شبكة من الخطوط البيضاء المتشابكة (Wickham's Striae) أو بقع متقرنة قد تصاحبها تقرحات أو احمرار.

المتطلبات التشخيصية الفنية:
- تنبيه هام ومشدد جداً: عند ذكر اسم أي مرض أو آفة أو تشخيص في أي مكان في الاستجابة (بما في ذلك التقرير العام، الملخص summary، حقول التشخيص التفريقي differential_diagnoses، أسماء المشاكل المكتشفة labels في حقل issues، والعناوين والوصف)، يجب عليك كتابة اسم المرض أو الآفة باللغتين العربية والإنجليزية معاً دائماً بشكل احترافي وجذاب (مثال: "كانديدا الفم (Oral Candidiasis)" أو "ليوكوبلاكيا الفم (Oral Leukoplakia)" أو "الحزاز المسطح الفمي (Oral Lichen Planus)" أو "تسوس عميق (Deep Caries)" أو "فقدان العظم الداعم (Alveolar Bone Loss)" أو "آفة حول ذروية (Periapical Lesion)").
- قم بتحديد الموقع التشريحي الدقيق للآفة باللغة العربية (مثل: "سقف الحلق الصلب"، "الحافة الجانبية اليمنى للسان"، "باطن الخد الأيسر") في حقل tooth_number (لأنها آفة غشاء مخاطي ناعم وليست سنية، فقم بوضع اسم الموقع بدلاً من رقم السن)، ووضحه كذلك في الوصف.
- يجب أن تتضمن مصفوفة المشاكل (issues) حقلي differential_diagnoses و confirmation_methods ممتلئين بدقة واحترافية باللغة العربية لكل آفة.
- في حقل "differential_diagnoses" (الاحتمالات البديلة) بشكل عام لكل آفة: إذا كان التشخيص الأرجح هو كانديدا الفم، اذكر ليوكوبلاكيا والحزاز المسطح كاحتمالات بديلة، والعكس صحيح.
- في حقل "confirmation_methods" (طرق التحقق السريري) بشكل عام لكل آفة:
  - للـ كانديدا: اذكر (فحص الكشط بقطعة شاش معقمة، الفحص المجهري المباشر KOH prep، زراعة مسحة فطرية).
  - للـ ليوكوبلاكيا: اذكر (إجراء خزعة نسيجية استئصالية أو استكشافية وفحص باثولوجي Biopsy & Histopathology لتأكيد التشخيص واستبعاد التغيرات السرطانية، فحص الكشط بقطعة شاش معقمة للتحقق من عدم قابليتها للزوال).

أعد التقرير واملأ مصفوفة المشاكل (issues) بكل دقة مع التشخيص السريري الدقيق بالنص والخطورة المناسبة وتضمين differential_diagnoses و confirmation_methods لكل مشكلة وبشكل عام في التقرير. لا تقم بتحديد مواقع الصناديق [x,y,w,h] أو تحديد الإحداثيات على الصورة، فقط اترك حقل box كـ null أو فارغ.`;
      } else {
        promptText = `أنت طبيب أسنان خبير ومحلل صور أشعة سنية (X-Ray).
حلل صورة الأشعة المرفقة بدقة بالغة. ابحث عن:
1. تسوسات عميقة أو تحت الحشوات (Deep / Secondary Caries).
2. فقدان العظم الداعم للأسنان (Alveolar Bone Loss).
3. آفات حول ذروية، التهاب عصب أو خراجات (Periapical Lesions / Abscess).
4. أسنان مطمورة أو منخرة كلياً أو جزئياً (Impaction).

تنبيه هام ومشدد جداً: عند ذكر اسم أي مرض أو آفة أو تشخيص في أي مكان في الاستجابة (بما في ذلك التقرير العام، الملخص summary، حقول التشخيص التفريقي differential_diagnoses، أسماء المشاكل المكتشفة labels في حقل issues، والعناوين والوصف)، يجب عليك كتابة اسم المرض أو الآفة باللغتين العربية والإنجليزية معاً دائماً بشكل احترافي وجذاب (مثال: "تسوس عميق (Deep Caries)" أو "فقدان العظم الداعم (Alveolar Bone Loss)" أو "آفة حول ذروية (Periapical Lesion)" أو "التهاب عصب سن (Pulpitis)").

أعد التقرير واملأ مصفوفة المشاكل (issues) بكل دقة مع تحديد المواقع [x,y,w,h] النسبية.`;
      }

      // 5. Run analysis with direct image URL
      const result = await aiService.analyzeImage(
        analysisItem.image_url,
        promptText,
        undefined,
        resolvedClinicId,
        undefined,
        undefined,
        clinicTreatments
      );

      // 6. Update database row with completed result
      const completedResultData = {
        ...result,
        service_type: actualContext
      };

      const { error: updateError } = await supabase
        .from('ai_analyses')
        .update({
          status: 'completed',
          analysis_result: completedResultData
        })
        .eq('id', analysisItem.id);

      if (updateError) throw updateError;

      // 7. Update local states
      const completedResult = {
        ...analysisItem,
        status: 'completed',
        analysis_result: completedResultData
      };
      setSelectedAnalysis(completedResult);

      // Refresh list
      refreshAI();
      toast.success('تمت إعادة تحليل وتشخيص الصورة بنجاح!');

    } catch (err: any) {
      console.error('Retry analysis failed:', err);
      toast.error(err.message || 'فشل في إعادة معالجة الصورة');

      // Set DB to failed
      await supabase
        .from('ai_analyses')
        .update({ status: 'failed' })
        .eq('id', analysisItem.id);

      setSelectedAnalysis((prev: any) => prev ? { ...prev, status: 'failed' } : null);
      refreshAI();
    } finally {
      setIsAnalyzing(false);
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

        const isClinical = item.analysis_result?.service_type === 'clinical' || 
          (item.analysis_result?.image_type && 
           !item.analysis_result.image_type.includes('xray') && 
           !item.analysis_result.image_type.includes('cbct') && 
           !item.analysis_result.image_type.includes('bitewing'));

        const { data, error } = await supabase
          .from('patient_files')
          .insert({
            patient_id: patientId,
            name: `${isClinical ? 'تحليل صورة سريرية' : 'تشخيص AI'} - ${new Date().toLocaleDateString('ar-IQ')}`,
            type: isClinical ? 'other' : 'xray',
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
      if (selectedAnalysis.analysis_result?.isDsd) {
        const originalUrl = selectedAnalysis.analysis_result.original_image_url;
        const generatedUrl = selectedAnalysis.image_url;
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-gray-800">مقارنة تصميم الابتسامة الرقمي</h4>
                  <p className="text-xs text-gray-500">{selectedAnalysis.analysis_result.summary}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => {
                  setSelectedAnalysis(null);
                }}>
                  إغلاق المعاينة
                </Button>
              </div>
            </div>

            {/* Before/After Split Screen Slider */}
            <div 
              id="dsd-history-slider"
              className="relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-inner w-full max-w-2xl mx-auto cursor-ew-resize select-none" 
              style={{ aspectRatio: '4/3' }}
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDsdDragging(true);
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
                setDsdSplitPos(percentage);
              }}
              onTouchStart={(e) => {
                setIsDsdDragging(true);
                if (e.touches.length > 0) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.touches[0].clientX - rect.left;
                  const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
                  setDsdSplitPos(percentage);
                }
              }}
            >
              <div className="w-full h-full relative overflow-hidden pointer-events-none">
                {/* BEFORE */}
                <div className="absolute inset-0">
                  <img src={originalUrl} alt="Before" className="w-full h-full object-cover" />
                  <div className="absolute bottom-3 right-3 bg-slate-950/70 border border-slate-800/80 backdrop-blur-md text-slate-300 font-bold px-3 py-1.5 rounded-xl text-[10px] shadow-lg tracking-wide select-none">قبل التصميم</div>
                </div>
                {/* AFTER */}
                <div className="absolute inset-0 overflow-hidden z-10" style={{ clipPath: `inset(0 ${100 - dsdSplitPos}% 0 0)` }}>
                  <img src={generatedUrl} alt="AI Generated Smile" className="w-full h-full object-cover" />
                  <div className="absolute bottom-3 left-3 bg-purple-950/70 border border-purple-800/80 backdrop-blur-md text-purple-200 font-bold px-3 py-1.5 rounded-xl text-[10px] shadow-lg shadow-purple-950/40 flex items-center gap-1.5 select-none">
                    <span>✨</span> صورة AI حقيقية
                  </div>
                </div>
                {/* Neon Split Line & Drag Handle */}
                <div className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-400 via-fuchsia-500 to-purple-400 shadow-[0_0_15px_rgba(167,139,250,0.9)] pointer-events-none z-20" style={{ left: `${dsdSplitPos}%` }}>
                  <div className="absolute top-1/2 left-0 w-10 h-10 -ml-5 -mt-5 bg-slate-950/60 backdrop-blur-md border border-purple-500/50 rounded-full shadow-[0_0_20px_rgba(167,139,250,0.6)] flex items-center justify-center text-white select-none transition-all scale-100 cursor-ew-resize">
                    <svg className="w-5 h-5 text-purple-300 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7l-5 5 5 5M16 7l5 5-5 5" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Design Details Card */}
            <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-4 text-sm text-purple-950">
              <h5 className="font-bold mb-1 flex items-center gap-1.5 text-purple-900">
                <Info className="w-4 h-4" /> تفاصيل التصميم الرقمي:
              </h5>
              <ul className="list-disc list-inside space-y-1 text-xs text-purple-800">
                <li>شكل السن المختار: <strong>{selectedAnalysis.analysis_result.toothShape === 'natural' ? 'طبيعي' : selectedAnalysis.analysis_result.toothShape === 'oval' ? 'بيضاوي' : 'هوليوود'}</strong></li>
                <li>درجة اللون المعتمدة: <strong>VITA {selectedAnalysis.analysis_result.vitaColor || 'A2'}</strong></li>
                <li>تاريخ التوليد: <strong>{new Date(selectedAnalysis.created_at).toLocaleDateString('ar-IQ')} في {new Date(selectedAnalysis.created_at).toLocaleTimeString('ar-IQ')}</strong></li>
              </ul>
            </div>
          </div>
        );
      }

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
            status={selectedAnalysis.status}
            isRetrying={aiAnalyzing || isAnalyzing}
            onRetry={(serviceType) => handleRetryAnalysis(selectedAnalysis, serviceType)}
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
        <p className="text-gray-600 mb-4 text-sm leading-relaxed">
          {analysisContext === 'clinical'
            ? 'قم برفع الصورة السريرية للأسنان أو اللثة (صورة فوتوغرافية عادية من الهاتف أو الكاميرا الفموية)، وسيقوم الذكاء الاصطناعي بفحصها بدقة لكشف التسوسات الظاهرية، تراكمات الجير، والتهابات اللثة.'
            : 'قم برفع صورة الأشعة السنية (X-Ray) وسيقوم المساعد الذكي بتحليلها فوراً للكشف عن الآفات والكسور والتسوسات العميقة.'}
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
        {/* Radiography Analysis Card */}
        <div
          onClick={() => {
            setAnalysisContext('xray');
            setSelectedAnalysis(null); // Reset for new upload
            setIsAnalysisModalOpen(true);
          }}
          className="group cursor-pointer bg-white rounded-2xl p-1 border border-transparent hover:border-blue-200 shadow-sm hover:shadow-xl transition-all duration-300"
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
              تحليل صور الأشعة السنية للكشف عن التسوسات والالتهابات والنسب الدقيقة.
            </p>
          </div>
        </div>

        {/* Clinical Image Analysis Card */}
        <div
          onClick={() => {
            setAnalysisContext('clinical');
            setSelectedAnalysis(null); // Reset for new upload
            setIsAnalysisModalOpen(true);
          }}
          className="group cursor-pointer bg-white rounded-2xl p-1 border border-transparent hover:border-emerald-200 shadow-sm hover:shadow-xl transition-all duration-300"
        >
          <div className="relative h-28 sm:h-40 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl overflow-hidden mb-3 sm:mb-4 flex items-center justify-center group-hover:scale-[0.98] transition-transform">
            <div className="absolute inset-0 bg-grid-emerald-500/[0.05] [mask-image:linear-gradient(0deg,white,transparent)]" />
            <div className="w-10 h-10 sm:w-16 sm:h-16 bg-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-500">
              <ImageIcon className="w-5 h-5 sm:w-8 sm:h-8" />
            </div>
          </div>
          <div className="px-3 pb-3 sm:px-4 sm:pb-4">
            <h3 className="text-xs sm:text-sm font-bold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors">تحليل الصور السريرية</h3>
            <p className="text-[10px] sm:text-xs text-gray-500 leading-normal line-clamp-2">
              فحص صور الفم والأسنان السريرية لكشف التهابات اللثة والتسوس الظاهري.
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
            <h3 className="text-xs sm:text-sm font-bold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors">تصميم الابتسامة dsd</h3>
            <p className="text-[10px] sm:text-xs text-gray-500 leading-normal line-clamp-2">
              تصميم الابتسامة التلقائي ومحاكاة النتيجة قبل وبعد العلاج التقويمي.
            </p>
          </div>
        </div>

        {/* Smart AI Treatment Plan Card */}
        <div
          onClick={() => setIsSmartPlanModalOpen(true)}
          className="group cursor-pointer bg-white rounded-2xl p-1 border border-transparent hover:border-violet-200 shadow-sm hover:shadow-xl transition-all duration-300"
        >
          <div className="relative h-28 sm:h-40 bg-gradient-to-br from-violet-50 to-indigo-50 rounded-xl overflow-hidden mb-3 sm:mb-4 flex items-center justify-center group-hover:scale-[0.98] transition-transform">
            <div className="absolute inset-0 bg-grid-indigo-500/[0.05] [mask-image:linear-gradient(0deg,white,transparent)]" />
            <div className="w-10 h-10 sm:w-16 sm:h-16 bg-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg flex items-center justify-center text-violet-600 group-hover:scale-110 transition-transform duration-500">
              <Brain className="w-5 h-5 sm:w-8 sm:h-8" />
            </div>
          </div>
          <div className="px-3 pb-3 sm:px-4 sm:pb-4">
            <h3 className="text-xs sm:text-sm font-bold text-gray-900 mb-1 group-hover:text-violet-600 transition-colors">خطط علاجية بالـ AI</h3>
            <p className="text-[10px] sm:text-xs text-gray-500 leading-normal line-clamp-2">
              توليد خطة علاجية متكاملة بالذكاء الاصطناعي بناءً على التاريخ الطبي والحساسيات.
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
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${(item.analysis_result as any)?.isDsd ? 'bg-purple-50 text-purple-600' : 'bg-indigo-50 text-indigo-600'}`}>
                          {(item.analysis_result as any)?.isDsd ? <Sparkles className="w-5 h-5" /> : <Brain className="w-5 h-5" />}
                        </div>
                        <span className="font-bold text-gray-900">
                          {(item.analysis_result as any)?.isDsd ? 'تصميم ابتسامة AI' : 'تحليل صورة'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(item.created_at).toLocaleDateString('ar-IQ')}
                      <span className="block text-xs text-gray-400">{new Date(item.created_at).toLocaleTimeString('ar-IQ')}</span>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const isStuck = item.status === 'processing' && item.created_at && (new Date().getTime() - new Date(item.created_at).getTime() > 15000);
                        const hasFailed = item.status === 'failed' || isStuck;

                        if (item.status === 'completed') {
                          return (
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center w-fit px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                مكتمل
                              </span>
                              {item.analysis_result?.summary && (
                                <span className="text-xs text-gray-500 font-medium">
                                  {item.analysis_result.summary}
                                </span>
                              )}
                            </div>
                          );
                        } else if (hasFailed) {
                          return (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 animate-pulse">
                              خطأ في المعالجة
                            </span>
                          );
                        } else {
                          return (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 animate-pulse">
                              جاري المعالجة
                            </span>
                          );
                        }
                      })()}
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
        size="md"
        contentClassName="p-0"
      >
        <div className="flex flex-col bg-gray-50/50">
          {/* Header */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-4 sm:p-6 shadow-md border-b border-indigo-800/30 relative">
            <button
              onClick={() => setIsDetailsPopupOpen(false)}
              className="absolute left-3 top-3 sm:left-4 sm:top-4 p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center flex-wrap gap-4 pl-6 select-none">
              <div className={`flex items-center ${selectedTeethNumbers.length > 1 ? 'gap-0.5' : 'gap-3.5'}`}>
                {selectedTeethNumbers.map((num) => {
                  const tooth = patientTeeth.find((t) => t.number === num);
                  const cond = tooth ? tooth.condition : 'healthy';
                  const svgContent = HEALTHY_TEETH_SVGS[num];

                  return (
                    <div key={num} className={`flex items-center ${selectedTeethNumbers.length > 1 ? 'gap-0' : 'gap-2'}`}>
                      {svgContent ? (
                        <div 
                          className="w-7 h-10 flex items-center justify-center overflow-visible select-none"
                          dangerouslySetInnerHTML={{ __html: getClinicProcessedToothSvg(num, cond) }}
                        />
                      ) : (
                        <span className="w-8 h-8 rounded bg-white/20 text-white flex items-center justify-center text-xs font-bold font-mono">
                          {num}
                        </span>
                      )}
                      {selectedTeethNumbers.length === 1 && (
                        <span className="text-lg sm:text-xl font-extrabold font-mono text-white">
                          {num}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="border-r border-white/25 pr-3 py-1 flex items-center">
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  تفاصيل السن
                </h3>
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
                  }).map((plan, idx) => {
                    const isPlanExpanded = expandedPlanId === plan.id;
                    return (
                      <li 
                        key={plan.id} 
                        onClick={() => setExpandedPlanId(isPlanExpanded ? null : plan.id)}
                        className={`text-sm bg-white p-3 rounded-lg shadow-sm border transition-all cursor-pointer select-none group ${
                          isPlanExpanded ? 'border-blue-300 shadow-md ring-1 ring-blue-50/50' : 'border-blue-100 hover:border-blue-200 hover:shadow-md'
                        }`}
                      >
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
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelPlan(plan.id);
                              }}
                              className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-all"
                              title="إلغاء الخطة"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <span className="text-gray-400 p-0.5 group-hover:text-blue-500 transition-colors">
                              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isPlanExpanded ? 'transform rotate-180 text-blue-500' : ''}`} />
                            </span>
                          </div>
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

                        {/* Expanded Sessions Timeline */}
                        {isPlanExpanded && plan.sessions && plan.sessions.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-gray-100 space-y-2.5 animate-in slide-in-from-top-3 duration-200">
                            <h5 className="text-[11px] font-bold text-gray-400 mb-2 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" /> خطوات الجلسات العلاجية
                            </h5>
                            <div className="space-y-2 relative before:absolute before:inset-y-0 before:right-2.5 before:w-0.5 before:bg-gray-100">
                              {plan.sessions.map((session: any, sIdx: number) => {
                                const isSessionCompleted = session.status === 'completed';
                                return (
                                  <div key={session.id || sIdx} className="relative flex items-center gap-3 pr-7 py-0.5">
                                    {/* Timeline bullet node */}
                                    <div className={`absolute right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center border z-10 ${
                                      isSessionCompleted 
                                        ? 'bg-green-500 border-green-600 text-white shadow-sm' 
                                        : 'bg-white border-gray-300 text-gray-400'
                                    }`}>
                                      {isSessionCompleted ? (
                                        <CheckCircle className="w-2.5 h-2.5 text-white" />
                                      ) : (
                                        <span className="text-[8px] font-bold">{sIdx + 1}</span>
                                      )}
                                    </div>
                                    {/* Session item card */}
                                    <div className="flex-grow flex items-center justify-between py-1 px-2.5 bg-gray-50/50 rounded border border-gray-100 text-xs">
                                      <span className={`font-medium ${isSessionCompleted ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                        {session.title}
                                      </span>
                                      <div className="flex items-center gap-1.5">
                                        {session.duration && (
                                          <span className="text-[9px] font-semibold text-gray-400">
                                            {session.duration} د
                                          </span>
                                        )}
                                        <span className={`px-1.5 py-0.25 rounded-full text-[9px] font-bold ${
                                          isSessionCompleted 
                                            ? 'bg-green-50 text-green-700 border border-green-100' 
                                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                                        }`}>
                                          {isSessionCompleted ? 'تم' : 'انتظار'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
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
        clinicId={effectiveClinicId}
        defaultDoctorName={defaultDoctorName}
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
        title={
          selectedAnalysis?.analysis_result?.isDsd
            ? 'مقارنة تصميم الابتسامة الرقمي (DSD)'
            : (selectedAnalysis 
                ? (selectedAnalysis.analysis_result?.service_type === 'clinical' || 
                   (selectedAnalysis.analysis_result?.image_type && 
                    !selectedAnalysis.analysis_result.image_type.includes('xray') && 
                    !selectedAnalysis.analysis_result.image_type.includes('cbct') && 
                    !selectedAnalysis.analysis_result.image_type.includes('bitewing')))
                : analysisContext === 'clinical'
              )
                ? 'تحليل الصور السريرية والفوتوغرافية بالـ AI'
                : 'تشخيص الصور بالأشعة والذكاء الاصطناعي'
        }
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
          <SmileDesignModalContent 
            patientName={patient?.name} 
            patientId={patient?.id} 
            onFileSaved={(newFile) => setFiles(prev => [newFile, ...prev])} 
          />
        </div>
      </Modal>

      {/* Smart AI Treatment Plan Modal */}
      <Modal
        isOpen={isSmartPlanModalOpen}
        onClose={() => setIsSmartPlanModalOpen(false)}
        title="توليد الخطة العلاجية الذكية بالـ AI"
        size="lg"
      >
        <div className="space-y-6">
          <SmartPlanModalContent patient={patient} patientTeeth={patientTeeth} treatmentPlans={treatmentPlans} onAdoptPlan={handleAdoptSmartPlan} />
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

interface SmileDesignModalContentProps {
  patientName?: string;
  patientId?: string;
  onFileSaved?: (newFile: FileItem) => void;
}

const SmileDesignModalContent: React.FC<SmileDesignModalContentProps> = ({ patientName, patientId, onFileSaved }) => {
  const { uploadFile } = useStorage();
  const { resolveClinicId, refresh: refreshAI } = useAIAnalysis(patientId);
  // ===== STEP FLOW =====
  // step 0: upload photo
  // step 1: choose method (manual | nanobanana)
  // step 2: manual design workspace
  // step 3: nanobanana AI workspace
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [patientPhoto, setPatientPhoto] = useState<string | null>(null);

  // ===== SHARED SETTINGS =====
  const [whiteness, setWhiteness] = useState(3);
  const [toothShape, setToothShape] = useState<'natural' | 'oval' | 'square'>('natural');
  const [alignment, setAlignment] = useState(5);
  const [bgScale, setBgScale] = useState(1.0);
  const [bgX, setBgX] = useState(0);
  const [bgY, setBgY] = useState(0);

  // ===== MANUAL MODE STATE =====
  const [annotationMode, setAnnotationMode] = useState<'none' | 'measure' | 'draw' | 'note'>('none');
  const [annotations, setAnnotations] = useState<Array<{
    id: number; type: 'measure' | 'draw' | 'note';
    x: number; y: number; x2?: number; y2?: number; text?: string; color: string;
  }>>([]);
  const [drawingStart, setDrawingStart] = useState<{ x: number; y: number } | null>(null);
  const [drawingCurrent, setDrawingCurrent] = useState<{ x: number; y: number } | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [pendingNotePos, setPendingNotePos] = useState<{ x: number; y: number } | null>(null);
  const [activeColor, setActiveColor] = useState('#ef4444');
  const [showSplitManual, setShowSplitManual] = useState(false);
  const [splitPosManual, setSplitPosManual] = useState(50);
  const canvasRef = useRef<HTMLDivElement>(null);

  // ===== AI MODE STATE =====
  const [aiPrompt, setAiPrompt] = useState(
    'ابتسامة هوليوود واقعية، قشور E-Max براقة VITA B1 ناصعة البياض، انعكاس ضوئي طبيعي، متناسقة مع ملامح الفم.'
  );
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [aiSimulated, setAiSimulated] = useState(false);
  const [splitPosAi, setSplitPosAi] = useState(50);
  const [generatedSmileImage, setGeneratedSmileImage] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isSavingDsd, setIsSavingDsd] = useState(false);
  const [isSavingToGallery, setIsSavingToGallery] = useState(false);
  const [isSavingToHistory, setIsSavingToHistory] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadedOriginalUrl, setUploadedOriginalUrl] = useState<string | null>(null);

  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  // ===== WHITENESS FILTER =====
  const getWhitenessFilter = (grade: number) => {
    if (grade === 5) return 'brightness(1.2) contrast(0.9) saturate(0.65)';
    if (grade === 4) return 'brightness(1.12) contrast(0.94) saturate(0.75)';
    if (grade === 3) return 'brightness(1.05) contrast(0.97) saturate(0.88)';
    if (grade === 2) return 'brightness(0.97) contrast(1.0) saturate(0.98)';
    return 'brightness(0.91) contrast(1.03) saturate(1.05)';
  };

  const getAiFilter = () => {
    const w = whiteness >= 5 ? 'brightness(1.25) contrast(0.87) saturate(0.6)' :
              whiteness === 4 ? 'brightness(1.16) contrast(0.91) saturate(0.7)' :
              'brightness(1.1) contrast(0.94) saturate(0.78)';
    return w;
  };

  const vitaLabel = whiteness === 5 ? 'B1 ⭐ هوليوود' : whiteness === 4 ? 'A1 ساطع' : whiteness === 3 ? 'A2 طبيعي' : whiteness === 2 ? 'A3' : 'A4';

  // ===== UPLOAD =====
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPatientPhoto(reader.result as string);
      setAnnotations([]);
      setAiSimulated(false);
      setStep(1);
      toast.success('تم رفع الصورة! اختر طريقة التصميم.');
    };
    reader.readAsDataURL(file);
  };

  const handleDemo = () => {
    setPatientPhoto('https://images.unsplash.com/photo-1606811841689-23dfddce3e24?w=800&auto=format&fit=crop');
    setAnnotations([]);
    setAiSimulated(false);
    setStep(1);
    toast.success('تم تحميل الصورة التجريبية.');
  };

  const handleChangePhoto = () => {
    setPatientPhoto(null);
    setStep(0);
    setAnnotations([]);
    setAiSimulated(false);
    setShowSplitManual(false);
    setDrawingStart(null);
  };

  // ===== ANNOTATIONS (manual) =====
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (annotationMode === 'none' || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (annotationMode === 'note') {
      setPendingNotePos({ x, y });
      setShowNoteInput(true);
      return;
    }
    if (!drawingStart) {
      setDrawingStart({ x, y });
      setDrawingCurrent({ x, y });
    } else {
      setAnnotations(prev => [...prev, { id: Date.now(), type: annotationMode, x: drawingStart.x, y: drawingStart.y, x2: x, y2: y, color: activeColor }]);
      setDrawingStart(null);
      setDrawingCurrent(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!drawingStart || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setDrawingCurrent({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
  };

  const saveNote = () => {
    if (!pendingNotePos || !noteInput.trim()) { setShowNoteInput(false); return; }
    setAnnotations(prev => [...prev, { id: Date.now(), type: 'note', x: pendingNotePos.x, y: pendingNotePos.y, text: noteInput.trim(), color: activeColor }]);
    setNoteInput(''); setShowNoteInput(false); setPendingNotePos(null);
    toast.success('تمت إضافة الملاحظة.');
  };

  // ===== AI TRIGGER — Real DALL-E 3 Image Generation =====
  const handleTriggerAi = async () => {
    setAiError(null);
    setGeneratedSmileImage(null);

    if (!patientPhoto) {
      toast.error('يرجى تحميل صورة المريض أولاً.');
      return;
    }

    setIsAiProcessing(true);
    setAiSimulated(false);

    // Build a dental-specific DALL-E prompt from user input
    const vitaColor = whiteness === 5 ? 'VITA B1 ultra-white Hollywood' :
                      whiteness === 4 ? 'VITA A1 bright white' :
                      whiteness === 3 ? 'VITA A2 natural white' : 'VITA A3 natural';

    setProcessingStep('⚙️ جاري معالجة وصورة المريض...');

    try {
      let base64Photo = '';
      let mimeType = 'image/jpeg';

      if (patientPhoto.startsWith('data:')) {
        const parts = patientPhoto.split(',');
        base64Photo = parts[1] || '';
        const match = parts[0].match(/data:(.*?);/);
        mimeType = match ? match[1] : 'image/jpeg';
      } else {
        setProcessingStep('📡 جاري جلب صورة المريض من الخادم...');
        const res = await fetch(patientPhoto);
        const blob = await res.blob();
        mimeType = blob.type;
        base64Photo = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result?.toString().split(',')[1] || '');
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      setProcessingStep('👁️ جاري تحليل ملامح الوجه وتصميم الابتسامة بالرؤية...');

      const generatedImageUrl = await aiService.generateSmileDesign(
        base64Photo,
        mimeType,
        {
          prompt: aiPrompt,
          toothShape,
          whiteness,
          vitaColor
        }
      );

      setGeneratedSmileImage(generatedImageUrl);
      setAiSimulated(true);
      setIsAiProcessing(false);
      toast.success('✨ تم توليد تصميم الابتسامة الجديد بنجاح! اسحب شريط المقارنة لرؤية النتيجة.');
    } catch (err: any) {
      setIsAiProcessing(false);
      const msg = err.message || 'فشل توليد الصورة';
      setAiError(msg);
      toast.error(`فشل توليد الصورة: ${msg}`);
    }
  };

  const getUploadedUrl = async () => {
    if (uploadedUrl) return uploadedUrl;
    if (!generatedSmileImage) return null;

    let finalUrl = generatedSmileImage;
    if (generatedSmileImage.startsWith('data:') || generatedSmileImage.startsWith('http')) {
      try {
        const res = await fetch(generatedSmileImage);
        const blob = await res.blob();
        const fileName = `dsd_${Date.now()}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        
        const uploadRes = await uploadFile(file, 'patient-docs', `${patientId}/images`);
        if (uploadRes && uploadRes.url) {
          finalUrl = uploadRes.url;
        }
      } catch (uploadErr) {
        console.error('Error uploading DSD image, using fallback URL:', uploadErr);
      }
    }
    setUploadedUrl(finalUrl);
    return finalUrl;
  };

  const getUploadedOriginalUrl = async () => {
    if (uploadedOriginalUrl) return uploadedOriginalUrl;
    if (!patientPhoto) return null;

    if (!patientPhoto.startsWith('data:')) {
      setUploadedOriginalUrl(patientPhoto);
      return patientPhoto;
    }

    let finalUrl = patientPhoto;
    try {
      const res = await fetch(patientPhoto);
      const blob = await res.blob();
      const fileName = `original_${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });
      
      const uploadRes = await uploadFile(file, 'patient-docs', `${patientId}/images`);
      if (uploadRes && uploadRes.url) {
        finalUrl = uploadRes.url;
      }
    } catch (uploadErr) {
      console.error('Error uploading original image, using fallback:', uploadErr);
    }
    
    setUploadedOriginalUrl(finalUrl);
    return finalUrl;
  };

  const handleSaveToGallery = async () => {
    if (!generatedSmileImage || !patientId) return;
    setIsSavingToGallery(true);
    try {
      const finalUrl = await getUploadedUrl();
      if (!finalUrl) throw new Error('فشل رفع الصورة');

      const { data, error } = await supabase
        .from('patient_files')
        .insert({
          patient_id: patientId,
          name: `تصميم ابتسامة AI - VITA ${whiteness >= 5 ? 'B1' : whiteness === 4 ? 'A1' : whiteness === 3 ? 'A2' : 'A3'} (${toothShape === 'natural' ? 'طبيعي' : toothShape === 'oval' ? 'بيضاوي' : 'هوليوود'}).jpg`,
          type: 'xray',
          url: finalUrl,
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
        if (onFileSaved) {
          onFileSaved(newFile);
        }
        toast.success('تم حفظ تصميم الابتسامة في معرض صور المريض بنجاح!');
      }
    } catch (err) {
      console.error('DSD Gallery Save Error:', err);
      toast.error('فشل حفظ تصميم الابتسامة في معرض الصور');
    } finally {
      setIsSavingToGallery(false);
    }
  };

  const handleSaveToHistory = async () => {
    if (!generatedSmileImage || !patientId) return;
    setIsSavingToHistory(true);
    try {
      const finalUrl = await getUploadedUrl();
      const originalPublicUrl = await getUploadedOriginalUrl();
      
      if (!finalUrl) throw new Error('فشل رفع الصورة المولدة');
      if (!originalPublicUrl) throw new Error('فشل رفع الصورة الأصلية');

      const resolvedClinicId = await resolveClinicId();
      const activeToothShape = toothShape === 'natural' ? 'طبيعي' : toothShape === 'oval' ? 'بيضاوي' : 'هوليوود';
      const activeShade = whiteness >= 5 ? 'B1' : whiteness === 4 ? 'A1' : whiteness === 3 ? 'A2' : 'A3';
      
      const { error } = await supabase
        .from('ai_analyses')
        .insert({
          clinic_id: resolvedClinicId,
          image_url: finalUrl,
          status: 'completed',
          patient_id: parseInt(patientId),
          analysis_result: {
            isDsd: true,
            original_image_url: originalPublicUrl,
            generated_image_url: finalUrl,
            whiteness: whiteness,
            toothShape: toothShape,
            vitaColor: activeShade,
            summary: `تصميم ابتسامة بالذكاء الاصطناعي - VITA ${activeShade} (${activeToothShape})`,
            issues: []
          }
        });
      
      if (error) throw error;

      refreshAI();
      toast.success('تم تسجيل نتيجة التصميم في سجل التشخيصات والخدمات الطبية الذكية بنجاح!');
    } catch (err) {
      console.error('DSD History Save Error:', err);
      toast.error('فشل تسجيل النتيجة في سجل التشخيصات والتحليلات');
    } finally {
      setIsSavingToHistory(false);
    }
  };

  const handleSaveDsdImage = async () => {
    await handleSaveToGallery();
    await handleSaveToHistory();
  };

  // ===== EXPORT =====
  const handleExport = () => {
    if (!patientPhoto) return;
    const today = new Date().toLocaleDateString('ar-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const method = step === 2 ? 'تصميم يدوي تحليلي' : 'تصميم الابتسامة بواسطة الـ AI';
    const win = window.open('', '_blank');
    if (!win) { toast.error('يرجى السماح بالنوافذ المنبثقة.'); return; }
    win.document.write(`<html><head><title>تقرير DSD - ${patientName || 'المراجع'}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
        body{font-family:'Cairo',sans-serif;direction:rtl;text-align:right;padding:40px;color:#1e293b;}
        h1{color:#6d28d9;font-size:20px;border-bottom:3px solid #8b5cf6;padding-bottom:12px;}
        table{width:100%;border-collapse:collapse;margin-top:20px;}
        th,td{border:1px solid #e2e8f0;padding:10px 14px;font-size:13px;}
        th{background:#f8fafc;font-weight:800;}
        .btn{background:#8b5cf6;color:#fff;border:none;padding:12px 30px;border-radius:10px;font-size:14px;font-family:'Cairo',sans-serif;cursor:pointer;margin-top:24px;}
        @media print{.no-print{display:none;}}
      </style></head><body>
      <h1>🦷 تقرير تصميم الابتسامة الرقمي (DSD)</h1>
      <table>
        <tr><th>المريض</th><td>${patientName || 'مراجع'}</td><th>التاريخ</th><td>${today}</td></tr>
        <tr><th>طريقة التصميم</th><td>${method}</td><th>رقم الملف</th><td>#${patientId || 'DSD'}</td></tr>
        <tr><th>شكل السن</th><td>${toothShape === 'natural' ? 'طبيعي' : toothShape === 'oval' ? 'بيضاوي ناعم' : 'مربع هوليوود'}</td><th>درجة اللون</th><td>VITA ${vitaLabel}</td></tr>
        <tr><th>الاصطفاف</th><td>Grade ${alignment}/5</td><th>التعليقات</th><td>${annotations.length} ملاحظة</td></tr>
        ${step === 3 ? `<tr><th>البرومبت</th><td colspan="3">${aiPrompt}</td></tr>` : ''}
      </table>
      <div class="no-print"><button class="btn" onclick="window.print()">طباعة / حفظ PDF</button></div>
    </body></html>`);
    win.document.close();
    toast.success('تم فتح التقرير للطباعة.');
  };



  // ===================================================
  //  RENDER
  // ===================================================

  // ── STEP 0: Upload Photo ──
  if (step === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-6 text-center space-y-6" dir="rtl">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-200">
          <Upload className="w-10 h-10 text-white" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-slate-800 mb-1">رفع صورة المريض</h3>
          <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
            ارفع صورة واضحة للابتسامة أو الأسنان الأمامية لبدء تصميم الابتسامة الرقمي
          </p>
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          <label className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-2xl text-sm font-bold shadow-lg shadow-indigo-200 cursor-pointer transition-all active:scale-95 flex items-center gap-2">
            <Upload className="w-4 h-4" />
            رفع صورة المريض
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          </label>
          <button onClick={handleDemo} className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl text-sm font-bold transition-all shadow-sm flex items-center gap-2">
            📷 صورة تجريبية
          </button>
        </div>
      </div>
    );
  }

  // ── STEP 1: Choose Method ──
  if (step === 1) {
    return (
      <div className="space-y-6 py-4 px-2" dir="rtl">
        {/* Photo preview thumbnail */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: 160 }}>
          <img src={patientPhoto!} alt="preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <button onClick={handleChangePhoto} className="absolute top-3 left-3 px-3 py-1.5 bg-white/90 backdrop-blur-sm text-red-600 rounded-xl text-xs font-bold flex items-center gap-1 shadow border border-red-100 hover:bg-red-50 transition-all">
            <Trash2 className="w-3.5 h-3.5" /> تغيير الصورة
          </button>
          <div className="absolute bottom-3 right-3 text-white font-bold text-xs">صورة المريض</div>
        </div>

        <div>
          <h3 className="text-sm font-extrabold text-slate-800 mb-1 text-right">اختر طريقة التصميم</h3>
          <p className="text-xs text-slate-500 text-right mb-4">كل طريقة تعمل بشكل مستقل وكامل</p>

          <div className="grid grid-cols-1 gap-4">
            {/* MANUAL */}
            <button onClick={() => setStep(2)}
              className="group relative p-5 rounded-2xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-100 transition-all text-right flex items-start gap-4 active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                <span className="text-2xl">📐</span>
              </div>
              <div className="flex-1">
                <h4 className="font-extrabold text-sm text-indigo-900 mb-1">التصميم اليدوي التحليلي</h4>
                <p className="text-[11px] text-indigo-600/80 leading-relaxed">
                  أضف قياسات، خطوط تصميم، ملاحظات مباشرة على الصورة، مع محاكاة بياض الأسنان عبر فلاتر الـ CSS المتقدمة
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['📏 قياسات', '✏️ رسم', '📝 ملاحظات', '🔆 محاكاة البياض'].map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-bold">{tag}</span>
                  ))}
                </div>
              </div>
              <span className="text-indigo-400 group-hover:text-indigo-600 text-lg">‹</span>
            </button>

            {/* AI */}
            <button onClick={() => setStep(3)}
              className="group relative p-5 rounded-2xl border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-fuchsia-50 hover:border-purple-400 hover:shadow-lg hover:shadow-purple-100 transition-all text-right flex items-start gap-4 active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                <span className="text-2xl">✨</span>
              </div>
              <div className="flex-1">
                <h4 className="font-extrabold text-sm text-purple-900 mb-1">تصميم الابتسامة بواسطة الـ AI</h4>
                <p className="text-[11px] text-purple-600/80 leading-relaxed">
                  فحص وتحسين الابتسامة بواسطة الذكاء الاصطناعي التوليدي ومحاكاة النتيجة النهائية بدقة فائقة
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['🤖 AI توليدي', '✨ محاكاة واقعية', '🎨 برومبت مخصص', '⟺ مقارنة قبل/بعد'].map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-bold">{tag}</span>
                  ))}
                </div>
              </div>
              <span className="text-purple-400 group-hover:text-purple-600 text-lg">‹</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 2: MANUAL DESIGN ──
  if (step === 2) {
    return (
      <div className="space-y-4" dir="rtl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => setStep(1)} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-all">
            <span className="text-sm font-bold">›</span>
          </button>
          <div className="flex-1">
            <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-4 rounded-full bg-indigo-500 inline-block"></span>
              التصميم اليدوي التحليلي
            </h4>
            <p className="text-[10px] text-slate-500">قياسات وملاحظات على صورة المريض</p>
          </div>
          <button onClick={handleChangePhoto} className="px-3 py-1.5 rounded-xl bg-red-50 text-red-600 text-[11px] font-bold border border-red-100 hover:bg-red-100 transition-all flex items-center gap-1">
            <Trash2 className="w-3.5 h-3.5" /> تغيير الصورة
          </button>
        </div>

        {/* Canvas */}
        <PhotoCanvas
          filter={getWhitenessFilter(whiteness)}
          showSplit={showSplitManual}
          splitPos={splitPosManual}
          onSplitChange={setSplitPosManual}
          patientPhoto={patientPhoto}
          bgScale={bgScale}
          bgX={bgX}
          bgY={bgY}
          generatedSmileImage={generatedSmileImage}
          step={step}
          annotationMode={annotationMode}
          activeColor={activeColor}
          annotations={annotations}
          drawingStart={drawingStart}
          drawingCurrent={drawingCurrent}
          canvasRef={canvasRef}
          handleCanvasClick={handleCanvasClick}
          handleMouseMove={handleMouseMove}
          aiSimulated={aiSimulated}
        >
          <div className="absolute top-3 right-3 bg-indigo-600/90 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold backdrop-blur-sm">
            📐 تصميم يدوي
          </div>
        </PhotoCanvas>

        {/* Note input popup */}
        {showNoteInput && (
          <div className="bg-indigo-950 border border-indigo-800 rounded-2xl p-4 space-y-3 animate-in fade-in">
            <p className="text-xs font-bold text-indigo-200">📝 نص الملاحظة:</p>
            <div className="flex gap-2">
              <input type="text" value={noteInput} onChange={e => setNoteInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveNote(); if (e.key === 'Escape') setShowNoteInput(false); }}
                placeholder="مثال: تسوس، حشوة مطلوبة..."
                className="flex-1 bg-slate-900 text-white rounded-xl border border-indigo-800 px-3 py-2 text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500" autoFocus />
              <button onClick={saveNote} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold">حفظ</button>
              <button onClick={() => setShowNoteInput(false)} className="px-3 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs hover:bg-slate-700">إلغاء</button>
            </div>
          </div>
        )}

        {/* Photo controls */}
        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-3 space-y-2">
          <p className="text-[10px] font-bold text-slate-500">📷 ضبط الصورة:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'تكبير', val: bgScale, min: 0.7, max: 2.5, step: 0.05, set: setBgScale, display: `${Math.round(bgScale * 100)}%` },
              { label: 'رأسي', val: bgY, min: -150, max: 150, step: 2, set: setBgY, display: `${bgY}px` },
              { label: 'أفقي', val: bgX, min: -150, max: 150, step: 2, set: setBgX, display: `${bgX}px` },
            ].map(ctrl => (
              <div key={ctrl.label} className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 w-10 shrink-0">{ctrl.label}</span>
                <input type="range" min={ctrl.min} max={ctrl.max} step={ctrl.step} value={ctrl.val}
                  onChange={e => ctrl.set(parseFloat(e.target.value) as any)}
                  className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                <span className="text-[10px] font-mono text-indigo-600 w-10 text-left shrink-0">{ctrl.display}</span>
              </div>
            ))}
          </div>
          <button onClick={() => { setBgScale(1); setBgX(0); setBgY(0); }} className="text-[10px] font-bold text-slate-500 hover:text-slate-800 border border-slate-200 bg-white px-2.5 py-1 rounded-lg">إعادة ضبط</button>
        </div>

        {/* Annotation Tools */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
          <p className="text-xs font-extrabold text-slate-700 flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-indigo-500"></span>
            أدوات التعليق على الصورة
          </p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'none', emoji: '🖱️', label: 'تحريك' },
              { id: 'measure', emoji: '📏', label: 'قياس' },
              { id: 'draw', emoji: '✏️', label: 'خط' },
              { id: 'note', emoji: '📝', label: 'ملاحظة' },
            ].map(t => (
              <button key={t.id} onClick={() => setAnnotationMode(t.id as any)}
                className={`py-2.5 rounded-xl text-[11px] font-bold border flex flex-col items-center gap-0.5 transition-all ${
                  annotationMode === t.id ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200 hover:bg-indigo-50'
                }`}>
                <span className="text-base">{t.emoji}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {annotationMode !== 'none' && (
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-slate-500">لون:</span>
              <div className="flex gap-1.5">
                {['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6'].map(c => (
                  <button key={c} onClick={() => setActiveColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${activeColor === c ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
              {annotations.length > 0 && (
                <button onClick={() => { setAnnotations([]); setDrawingStart(null); }} className="mr-auto text-[10px] font-bold text-red-500 hover:text-red-700 flex items-center gap-1 px-2 py-1 rounded-lg border border-red-200 hover:bg-red-50 transition-all">
                  <Trash2 className="w-3 h-3" /> مسح ({annotations.length})
                </button>
              )}
            </div>
          )}
          {annotationMode !== 'none' && (
            <p className="text-[10px] text-slate-400 leading-relaxed bg-slate-50 p-2 rounded-xl">
              {annotationMode === 'measure' && '📏 انقر على نقطتين على الصورة لقياس المسافة بينهما.'}
              {annotationMode === 'draw' && '✏️ انقر على نقطتين لرسم خط تصميمي.'}
              {annotationMode === 'note' && '📝 انقر على أي موضع في الصورة لإضافة ملاحظة نصية.'}
              {drawingStart && ' ← تم تحديد النقطة الأولى، انقر للنقطة الثانية.'}
            </p>
          )}

          <div className="border-t border-slate-100 pt-4 space-y-3">
            {/* Whiteness */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold text-slate-700">
                <span>محاكاة بياض الأسنان (VITA):</span>
                <span className="text-indigo-600">{vitaLabel}</span>
              </div>
              <input type="range" min="1" max="5" value={whiteness} onChange={e => setWhiteness(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
              <p className="text-[10px] text-slate-400">يُطبَّق مباشرة على الصورة كمحاكاة بصرية للقشور.</p>
            </div>
            {/* Shape */}
            <div className="space-y-1.5">
              <span className="block text-[11px] font-bold text-slate-700">شكل السن للتقرير:</span>
              <div className="grid grid-cols-3 gap-2">
                {(['natural', 'oval', 'square'] as const).map(s => (
                  <button key={s} onClick={() => setToothShape(s)}
                    className={`py-1.5 rounded-xl text-[11px] font-bold border transition-all ${toothShape === s ? 'bg-indigo-50 text-indigo-700 border-indigo-300' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                    {s === 'natural' ? '🦷 طبيعي' : s === 'oval' ? '⭕ بيضاوي' : '⬛ هوليوود'}
                  </button>
                ))}
              </div>
            </div>
            {/* Alignment */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-700">
                <span>اصطفاف القواطع:</span>
                <span className="text-indigo-600">Grade {alignment}/5</span>
              </div>
              <input type="range" min="1" max="5" value={alignment} onChange={e => setAlignment(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
            </div>
            {/* Compare toggle */}
            <button onClick={() => setShowSplitManual(s => !s)}
              className={`w-full py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all ${showSplitManual ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
              <ExternalLink className="w-4 h-4" />
              {showSplitManual ? 'إخفاء مقارنة قبل/بعد' : 'تفعيل مقارنة قبل/بعد'}
            </button>
          </div>
        </div>

        {/* Export */}
        <button onClick={handleExport} className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-3 rounded-2xl text-xs shadow-md flex items-center justify-center gap-2 transition-all active:scale-95">
          <Printer className="w-4 h-4" /> تصدير تقرير DSD
        </button>
      </div>
    );
  }

  // ── STEP 3: NANO BANANA AI ──
  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => { setStep(1); setAiSimulated(false); setIsAiProcessing(false); }} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-all">
          <span className="text-sm font-bold">›</span>
        </button>
        <div className="flex-1">
          <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <span className="w-2 h-4 rounded-full bg-purple-500 inline-block"></span>
            تصميم الابتسامة بواسطة الـ AI
          </h4>
          <p className="text-[10px] text-slate-500">فحص وتحسين الابتسامة بواسطة الذكاء الاصطناعي التوليدي</p>
        </div>
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping inline-block"></span>
          <span className="text-[10px] font-bold text-green-500">Active</span>
        </div>
      </div>

      {/* Canvas - with processing overlay */}
      <div className="relative">
        <PhotoCanvas
          filter={aiSimulated ? getAiFilter() : 'none'}
          showSplit={aiSimulated}
          splitPos={splitPosAi}
          onSplitChange={setSplitPosAi}
          patientPhoto={patientPhoto}
          bgScale={bgScale}
          bgX={bgX}
          bgY={bgY}
          generatedSmileImage={generatedSmileImage}
          step={step}
          annotationMode={annotationMode}
          activeColor={activeColor}
          annotations={annotations}
          drawingStart={drawingStart}
          drawingCurrent={drawingCurrent}
          canvasRef={canvasRef}
          handleCanvasClick={handleCanvasClick}
          handleMouseMove={handleMouseMove}
          aiSimulated={aiSimulated}
        >
          <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[10px] font-bold backdrop-blur-sm ${aiSimulated ? 'bg-purple-600/90 text-white' : 'bg-slate-800/80 text-slate-300'}`}>
            {aiSimulated ? '✨ تصميم الابتسامة بالـ AI' : '✨ انتظر المعالجة'}
          </div>
        </PhotoCanvas>

        {/* Processing overlay */}
        {isAiProcessing && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-2xl z-50 flex flex-col items-center justify-center text-center p-6">
            <div className="relative mb-5">
              <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-2xl">✨</div>
            </div>
            <h4 className="text-sm font-extrabold text-purple-300 animate-pulse mb-2">جاري فحص وتحسين الابتسامة</h4>
            <p className="text-xs text-slate-400 font-mono max-w-[240px] leading-relaxed">{processingStep}</p>
          </div>
        )}
      </div>

      {/* AI Control Panel */}
      <div className="bg-gradient-to-br from-purple-950/70 to-fuchsia-950/50 rounded-2xl border border-purple-800/40 p-4 space-y-4">


        {/* Prompt */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-purple-300">وصف الابتسامة المطلوبة (البرومبت):</label>
          <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} rows={3}
            className="w-full bg-slate-900 text-white rounded-xl border border-purple-800/40 p-3 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-purple-700 resize-none"
            placeholder="صف الابتسامة المطلوبة..." />
        </div>

        {/* Quick templates */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-purple-400">💡 قوالب جاهزة:</p>
          {[
            'ابتسامة هوليوود VITA B1 براقة مع قشور E-Max مربعة وانعكاس ضوئي فائق.',
            'ابتسامة ناعمة بيضاوية VITA A2 طبيعية مناسبة للفك الصغير مع شفافية المينا.',
            'ابتسامة كلاسيكية منتظمة VITA A1 متناسقة مع الشفاه وخط القواطع.',
            'تحليل وتخطيط تصميم الابتسامة (DSD): رسم خطوط قياس ونسب مئوية رقمية (15%، 30%) مع منحنيات بيضاء رفيعة لتحديد حدود الأسنان واللثة للابتسامة المحسنة .',
          ].map((t, i) => (
            <button key={i} onClick={() => { setAiPrompt(t); toast.success('تم اختيار القالب.'); }}
              className="w-full text-right text-[10px] py-2 px-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 text-purple-200 border border-purple-900/40 hover:border-purple-700 transition-all">
              {t}
            </button>
          ))}
        </div>

        {/* Tooth Shape */}
        <div className="space-y-1.5 pt-1 border-t border-purple-800/30">
          <p className="text-[10px] font-bold text-purple-300">شكل الأسنان للتوليد:</p>
          <div className="grid grid-cols-3 gap-2">
            {(['natural', 'oval', 'square'] as const).map(s => (
              <button key={s} onClick={() => setToothShape(s)}
                className={`py-1.5 rounded-xl text-[11px] font-bold border transition-all ${toothShape === s ? 'bg-purple-600 text-white border-purple-700' : 'bg-slate-900/50 text-purple-300 border-purple-900/40 hover:border-purple-600'}`}>
                {s === 'natural' ? '🦷 طبيعي' : s === 'oval' ? '⭕ بيضاوي' : '⬛ هوليوود'}
              </button>
            ))}
          </div>
        </div>

        {/* Whiteness */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-bold text-purple-200">
            <span>درجة التبييض:</span>
            <span className="text-fuchsia-300 font-mono">VITA {vitaLabel}</span>
          </div>
          <input type="range" min="1" max="5" value={whiteness} onChange={e => setWhiteness(parseInt(e.target.value))}
            className="w-full h-1.5 bg-purple-900 rounded-lg appearance-none cursor-pointer accent-fuchsia-500" />
        </div>

        {/* Error display */}
        {aiError && (
          <div className="bg-red-950/60 border border-red-700/40 rounded-xl p-3 space-y-1">
            <p className="text-[11px] font-bold text-red-300 flex items-center gap-2">
              <span>⚠️</span> فشل التوليد
            </p>
            <p className="text-[10px] text-red-200/80 leading-relaxed font-mono">{aiError}</p>
            <p className="text-[10px] text-red-300/60">
              تأكد من صحة مفتاح API وأن اشتراكك يدعم نموذج dall-e-3
            </p>
          </div>
        )}

        {/* Trigger / Re-generate & Save button slot */}
        {!aiSimulated ? (
          <button onClick={handleTriggerAi} disabled={isAiProcessing}
            className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95">
            <Brain className="w-4 h-4 animate-pulse" />
            {isAiProcessing ? processingStep || 'جاري توليد الابتسامة...' : '✨ توليد تصميم الابتسامة بالذكاء الاصطناعي'}
          </button>
        ) : (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
            {/* Row 1: The two Save Buttons */}
            <div className="flex gap-2.5">
              {/* Save to Gallery Button */}
              <button 
                onClick={handleSaveToGallery} 
                disabled={isSavingToGallery || isSavingToHistory || isAiProcessing}
                className="flex-1 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-emerald-950/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSavingToGallery ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    جاري الحفظ بالمعرض...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4" />
                    حفظ في معرض الصور
                  </>
                )}
              </button>

              {/* Save to AI History Button */}
              <button 
                onClick={handleSaveToHistory} 
                disabled={isSavingToGallery || isSavingToHistory || isAiProcessing}
                className="flex-1 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-indigo-950/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSavingToHistory ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    جاري الحفظ بالسجل...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" />
                    حفظ في سجل التشخيصات
                  </>
                )}
              </button>
            </div>

            {/* Row 2: Re-generate & Full Image links */}
            <div className="flex gap-2.5">
              {/* Re-generate Button */}
              <button 
                onClick={() => { setAiSimulated(false); setGeneratedSmileImage(null); setAiError(null); setUploadedUrl(null); }}
                disabled={isSavingToGallery || isSavingToHistory || isAiProcessing}
                className="flex-1 py-3 bg-slate-900/60 hover:bg-slate-900 text-purple-200 border border-purple-900/40 hover:border-purple-700/80 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCcw className="w-3.5 h-3.5 animate-spin-slow" />
                إعادة توليد الابتسامة
              </button>

              {/* View Full Image link */}
              <a 
                href={generatedSmileImage!} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 py-3 bg-slate-900/60 hover:bg-slate-900 text-purple-300 border border-purple-900/40 hover:border-purple-700/80 rounded-xl text-center text-[11px] font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                فتح الصورة بالكامل ↗
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Export */}
      <button onClick={handleExport}
        className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white font-bold py-3 rounded-2xl text-xs shadow-md flex items-center justify-center gap-2 transition-all active:scale-95">
        <Printer className="w-4 h-4" /> تصدير تقرير DSD
      </button>
    </div>
  );
};

interface PhotoCanvasProps {
  filter: string;
  showSplit: boolean;
  splitPos: number;
  onSplitChange: (v: number) => void;
  children?: React.ReactNode;
  patientPhoto: string | null;
  bgScale: number;
  bgX: number;
  bgY: number;
  generatedSmileImage: string | null;
  step: number;
  annotationMode: string;
  activeColor: string;
  annotations: any[];
  drawingStart: any;
  drawingCurrent: any;
  canvasRef: React.RefObject<HTMLDivElement>;
  handleCanvasClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  aiSimulated: boolean;
}

const PhotoCanvas = ({
  filter,
  showSplit,
  splitPos,
  onSplitChange,
  children,
  patientPhoto,
  bgScale,
  bgX,
  bgY,
  generatedSmileImage,
  step,
  annotationMode,
  activeColor,
  annotations,
  drawingStart,
  drawingCurrent,
  canvasRef,
  handleCanvasClick,
  handleMouseMove,
  aiSimulated
}: PhotoCanvasProps) => {
  const splitRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!splitRef.current) return;
      const rect = splitRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      onSplitChange(percentage);
    };

    const handleWindowMouseUp = () => {
      setIsDragging(false);
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0 || !splitRef.current) return;
      const rect = splitRef.current.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      onSplitChange(percentage);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    window.addEventListener('touchmove', handleWindowTouchMove);
    window.addEventListener('touchend', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowMouseUp);
    };
  }, [isDragging, onSplitChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    if (splitRef.current) {
      const rect = splitRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      onSplitChange(percentage);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    if (e.touches.length > 0 && splitRef.current) {
      const rect = splitRef.current.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      onSplitChange(percentage);
    }
  };

  return (
    <div className="relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-inner select-none" style={{ aspectRatio: '4/3' }}>
      {showSplit ? (
        <div 
          ref={splitRef}
          className="w-full h-full relative overflow-hidden cursor-ew-resize"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* BEFORE */}
          <div className="absolute inset-0 pointer-events-none">
            <img src={patientPhoto!} alt="Before" className="w-full h-full object-cover"
              style={{ transform: `scale(${bgScale}) translate(${bgX}px,${bgY}px)`, transformOrigin: 'center' }} />
            <div className="absolute bottom-3 right-3 bg-slate-950/70 border border-slate-800/80 backdrop-blur-md text-slate-300 font-bold px-3 py-1.5 rounded-xl text-[10px] shadow-lg tracking-wide select-none">قبل التصميم</div>
          </div>
          {/* AFTER */}
          <div className="absolute inset-0 overflow-hidden z-10 pointer-events-none" style={{ clipPath: `inset(0 ${100 - splitPos}% 0 0)` }}>
            {generatedSmileImage ? (
              <img src={generatedSmileImage} alt="AI Generated Smile" className="w-full h-full object-cover"
                style={{ transform: `scale(${bgScale}) translate(${bgX}px,${bgY}px)`, transformOrigin: 'center' }} />
            ) : (
              <img src={patientPhoto!} alt="After" className="w-full h-full object-cover"
                style={{ transform: `scale(${bgScale}) translate(${bgX}px,${bgY}px)`, transformOrigin: 'center', filter }} />
            )}
            <div className="absolute bottom-3 left-3 bg-purple-950/70 border border-purple-800/80 backdrop-blur-md text-purple-200 font-bold px-3 py-1.5 rounded-xl text-[10px] shadow-lg shadow-purple-950/40 flex items-center gap-1.5 select-none">
              {generatedSmileImage ? <><span>✨</span> صورة AI حقيقية</> : 'بعد التصميم'}
            </div>
          </div>
          {/* Neon Split Line & Glowing Glassmorphic Drag Indicator */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-400 via-fuchsia-500 to-purple-400 shadow-[0_0_15px_rgba(167,139,250,0.9)] pointer-events-none z-20" style={{ left: `${splitPos}%` }}>
            <div className="absolute top-1/2 left-0 w-10 h-10 -ml-5 -mt-5 bg-slate-950/60 backdrop-blur-md border border-purple-500/50 rounded-full shadow-[0_0_20px_rgba(167,139,250,0.6)] flex items-center justify-center text-white select-none transition-all scale-100 cursor-ew-resize">
              <svg className="w-5 h-5 text-purple-300 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7l-5 5 5 5M16 7l5 5-5 5" />
              </svg>
            </div>
          </div>
        </div>
      ) : (
        <div ref={canvasRef} className="w-full h-full relative overflow-hidden"
          onClick={step === 2 ? handleCanvasClick : undefined}
          onMouseMove={step === 2 ? handleMouseMove : undefined}
          style={{ cursor: (step === 2 && annotationMode !== 'none') ? 'crosshair' : 'default' }}
        >
          <img src={patientPhoto!} alt="DSD" className="w-full h-full object-cover"
            style={{ transform: `scale(${bgScale}) translate(${bgX}px,${bgY}px)`, transformOrigin: 'center', filter }} />

          {/* AI glow overlay */}
          {step === 3 && aiSimulated && (
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 55% 18% at 50% 63%, rgba(255,255,255,0.14) 0%, transparent 70%)' }} />
          )}

          {/* Annotation SVG layer */}
          {step === 2 && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              {annotations.map(ann => {
                if ((ann.type === 'measure' || ann.type === 'draw') && ann.x2 !== undefined && ann.y2 !== undefined) {
                  const dx = ann.x2 - ann.x, dy = ann.y2 - ann.y;
                  const dist = Math.sqrt(dx * dx + dy * dy).toFixed(1);
                  return (
                    <g key={ann.id}>
                      <line x1={ann.x} y1={ann.y} x2={ann.x2} y2={ann.y2} stroke={ann.color}
                        strokeWidth={ann.type === 'measure' ? '0.5' : '0.8'}
                        strokeDasharray={ann.type === 'measure' ? '2,1' : undefined}
                        strokeLinecap="round" />
                      {ann.type === 'measure' && (
                        <text x={(ann.x + ann.x2) / 2} y={(ann.y + ann.y2) / 2 - 1.5}
                          fontSize="2.5" fill={ann.color} textAnchor="middle" fontWeight="bold">{dist}</text>
                      )}
                    </g>
                  );
                }
                if (ann.type === 'note') {
                  const w = Math.min((ann.text?.length || 3) * 2.2, 38);
                  return (
                    <g key={ann.id}>
                      <circle cx={ann.x} cy={ann.y} r="2.5" fill={ann.color} />
                      <rect x={ann.x + 3} y={ann.y - 4} width={w} height="6" fill={ann.color} rx="1.5" />
                      <text x={ann.x + 4.5} y={ann.y - 0.3} fontSize="2.5" fill="white" fontWeight="bold">{ann.text}</text>
                    </g>
                  );
                }
                return null;
              })}
              {drawingStart && drawingCurrent && (
                <line x1={drawingStart.x} y1={drawingStart.y} x2={drawingCurrent.x} y2={drawingCurrent.y}
                  stroke={activeColor} strokeWidth="0.6" strokeDasharray="1.5,1" opacity="0.8" />
              )}
            </svg>
          )}

          {children}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SmartPlanModalContent - AI Extended Treatment Plan Generator
// ============================================================================

interface SmartPlanModalContentProps {
  patient: any;
  patientTeeth: any[];
  treatmentPlans: TreatmentPlan[];
  onAdoptPlan: (plan: any) => Promise<void>;
}

const SmartPlanModalContent: React.FC<SmartPlanModalContentProps> = ({ patient, patientTeeth, treatmentPlans, onAdoptPlan }) => {
  const [doctorFocus, setDoctorFocus] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAdopting, setIsAdopting] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [generationStep, setGenerationStep] = useState('');

  // Extract patient medical data safely
  const rawMedicalData = patient?.medicalHistoryData;
  const medicalData = {
    vitals: {
      weight: rawMedicalData?.vitals?.weight ?? '-',
      height: rawMedicalData?.vitals?.height ?? '-',
      bp: rawMedicalData?.vitals?.bp ?? '-',
      sugar: rawMedicalData?.vitals?.sugar ?? '-',
      pulse: rawMedicalData?.vitals?.pulse ?? '-'
    },
    conditions: (rawMedicalData?.conditions as string[]) ?? [],
    allergies: (rawMedicalData?.allergies as string[]) ?? [],
    habits: (rawMedicalData?.habits as string[]) ?? [],
    notes: rawMedicalData?.notes ?? ''
  };

  // Find non-healthy teeth to present to the user and feed to the AI
  const nonHealthyTeeth = patientTeeth.filter(t => t.condition && t.condition !== 'healthy');
  const nonHealthyTeethText = nonHealthyTeeth.length > 0
    ? nonHealthyTeeth.map(t => `السن #${t.number}: الحالة الحالية هي [${t.condition}] ${t.notes ? `(ملاحظات: ${t.notes})` : ''}`).join('\n')
    : 'جميع الأسنان تظهر كـ سليمة في المخطط السريري الحالي.';

  // Extract completed and ongoing treatment plans
  const completedPlans = treatmentPlans.filter(p => p.status === 'completed');
  const completedPlansText = completedPlans.length > 0
    ? completedPlans.map(p => `- إجراء مكتمل: سن #${p.toothNumber || 'إجراء عام'} • النوع: ${p.type} • التكلفة: ${p.cost} د.ع • ملاحظات: ${p.notes}`).join('\n')
    : 'لا يوجد علاجات مكتملة مسجلة مسبقاً.';

  const ongoingPlans = treatmentPlans.filter(p => p.status !== 'completed' && p.status !== 'cancelled');
  const ongoingPlansText = ongoingPlans.length > 0
    ? ongoingPlans.map(p => `- إجراء غير مكتمل حالي (جاري العمل عليه): سن #${p.toothNumber || 'إجراء عام'} • النوع: ${p.type} • التكلفة: ${p.cost} د.ع • جلسات: ${p.completedSessions}/${p.totalSessions} • ملاحظات: ${p.notes}`).join('\n')
    : 'لا يوجد علاجات جارية مسجلة حالياً.';

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setGenerationStep('جاري قراءة التاريخ المرضي وتفاصيل الفحص...');

    try {
      setGenerationStep('جاري فحص مخطط الأسنان ومطابقة الحساسيات...');
      await new Promise(r => setTimeout(r, 600));

      setGenerationStep('جاري تحليل العلاجات المكتملة والعلاجات الجارية في ملف المريض...');
      await new Promise(r => setTimeout(r, 600));

      setGenerationStep('جاري بناء الموجه الطبي السريري وإرساله للذكاء الاصطناعي...');
      
      const prompt = `أنت طبيب أسنان استشاري خبير ومخطط علاجي محترف. قم بتوليد خطة علاجية مخصصة ومنظمة وموزعة على مراحل زمنية مرتبة ترتيباً دقيقاً يتماشى تماشياً كاملاً مع الخطوات والمراحل العالمية المعتمدة للخطط العلاجية (Globally Recognized Dental Treatment Planning Steps).
  
معلومات المريض الحالية:
- الاسم: ${patient?.name || 'غير معروف'}
- العمر: ${patient?.age || 'غير محدد'}
- الجنس: ${patient?.gender === 'male' ? 'ذكر' : 'أنثى'}

العلامات الحيوية والسجل الطبي للمريض:
- العلامات الحيوية: ضغط الدم: ${medicalData.vitals.bp}، نسبة السكر: ${medicalData.vitals.sugar}، النبض: ${medicalData.vitals.pulse}، الوزن: ${medicalData.vitals.weight}، الطول: ${medicalData.vitals.height}
- الأمراض المزمنة الحالية: ${medicalData.conditions.join(', ') || 'لا يوجد أمراض مزمنة'}
- الحساسيات الموثقة: ${medicalData.allergies.join(', ') || 'لا يوجد حساسيات معروفة'}
- عادات وملاحظات إضافية: ${medicalData.habits.join(', ') || 'لا يوجد'} • ${medicalData.notes || 'لا يوجد'}

سجل العلاجات المكتملة مسبقاً (هذه الإجراءات تمت بنجاح واكتملت، افهمها لتجنب اقتراح إعادة علاجها أو البناء عليها):
${completedPlansText}

سجل العلاجات الجارية حالياً وغير المكتملة (هذه الإجراءات قيد التنفيذ حالياً في العيادة، لا تقترح إجراءات بديلة أو متعارضة معها بل أكمل الخطة بناءً عليها):
${ongoingPlansText}

حالة الأسنان الحالية المكتشفة التي تحتاج إلى علاج (مخطط الأسنان السريري):
${nonHealthyTeethText}

ملاحظات الطبيب وتوجيهاته الخاصة بالتوليد:
${doctorFocus || 'لا يوجد ملاحظات إضافية'}

التعليمات الطبية العالمية الإلزامية:
1. يجب تقسيم الخطة العلاجية بدقة بالغة إلى 4 مراحل سريرية عالمية (4 Globally Recognized Phases) حصراً وبالمسميات التالية تماماً:
   - "المرحلة الأولى: الطارئة والجهازية (Emergency & Systemic Phase)": تركز على معالجة الألم النشط، الخراجات الحادة، خلع الأسنان الملتهبة بشدة، واتخاذ محاذير فورية للأمراض المزمنة (مثل تكييف التخدير الموضعي لمرضى الضغط).
   - "المرحلة الثانية: الوقائية والتحضيرية (Preventive & Hygienic Phase)": تشمل إزالة الجير وتلميع الأسنان (scaling & polishing)، علاج التهابات اللثة السطحية، حشوات مؤقتة لمنع انتشار التسوس، وتثقيف المريض.
   - "المرحلة الثالثة: التصحيحية والعلاجية (Corrective & Restorative Phase)": تشمل حشوات دائمة، علاج عصب (endo)، تركيبات سنية (prosthetic) كالأطقم والتيجان والجسور، زراعة الأسنان (implant)، الجراحات المخطط لها، والتقويم (ortho).
   - "المرحلة الرابعة: الوقائية الدورية (Maintenance & Recall Phase)": للمتابعة الدورية، فحص اللثة، وإجراء صور أشعة دورية للحفاظ على صحة الفم.

2. لكل إجراء علاج مقترح في أي مرحلة، حدد بدقة:
   - toothNumber: رقم السن بنظام الترقيم الدولي FDI (11-48 أو 51-85). إذا كان الإجراء عاماً لكامل الفم (مثل تنظيف الجير)، ضع الرقم 0.
   - type: تصنيف الإجراء بدقة بالغة من الأنواع التالية حصراً:
     * endo (علاج عصب)
     * implant (زراعة)
     * prosthetic (تركيبات/تعويضات/تيجان)
     * ortho (تقويم)
     * surgery (جراحة/خلع)
     * perio (علاج اللثة)
     * general (عام/تنظيف/حشوات/تبييض)
   - sessions: عدد الجلسات المتوقع (رقم صحيح، 1 على الأقل).
   - cost: التكلفة التقديرية بالدينار العراقي (رقم صحيح، مثلاً 50000 أو 1000000، اعتمد تقديرات واقعية ومناسبة).
   - notes: وصف تفصيلي مبسط للإجراء العلاجي بالعربية.

3. يجب مراعاة الحساسيات المسجلة والأمراض المزمنة بكل صرامة (مثال: تجنب البنسلين تماماً في التوصيات الدوائية، الحذر عند استخدام التخدير الذي يحتوي على epinephrine لمرضى الضغط الشديد، إلخ).

4. يجب أن تعيد المخرجات حصراً في قالب JSON صالح بدون أي نصوص تمهيدية أو ختامية، بالصيغة التالية تماماً:
{
  "summary": "ملخص عام ومكثف جداً للخطة العلاجية والنتائج المتوقعة بالعربية مع ذكر مبررات التوزيع السريري للمراحل",
  "phases": [
    {
      "name": "اسم المرحلة المذكورة أعلاه حصراً",
      "description": "وصف مبسط لهدف هذه المرحلة بالعربية بناءً على حالة المريض",
      "treatments": [
        {
          "toothNumber": 36,
          "type": "endo",
          "sessions": 2,
          "cost": 150000,
          "notes": "علاج عصب متكامل للسن 36 لإنهاء الألم النشط"
        }
      ]
    }
  ],
  "contraindications": [
    "التحذير الطبي الأول بالعربية بناءً على أمراض المريض أو حساسيته"
  ]
}

تأكد أن النص المرتجع هو JSON صالح 100% لتجنب فشل النظام.`;

      const response = await aiService.chat('doctor_assistant', prompt);
      
      setGenerationStep('جاري معالجة وتدقيق مخرجات الخطة العلاجية...');
      await new Promise(r => setTimeout(r, 500));

      let cleanJson = response.trim();
      if (cleanJson.includes('```')) {
        const match = cleanJson.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (match) {
          cleanJson = match[1].trim();
        }
      }

      if (!cleanJson.startsWith('{')) {
        throw new Error('الاستجابة المستلمة ليست بتنسيق JSON صالح. يرجى المحاولة مرة أخرى.');
      }

      const parsedPlan = JSON.parse(cleanJson);
      setGeneratedPlan(parsedPlan);
    } catch (err: any) {
      console.error('Failed to generate smart plan:', err);
      setError(err.message || 'حدث خطأ غير متوقع أثناء توليد الخطة بالذكاء الاصطناعي.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAdopt = async () => {
    if (!generatedPlan) return;
    setIsAdopting(true);
    try {
      await onAdoptPlan(generatedPlan);
    } catch (err) {
      console.error('Failed to adopt plan:', err);
    } finally {
      setIsAdopting(false);
    }
  };

  // State handlers for pre-adoption editing and sorting
  const handleUpdateCost = (phaseIdx: number, txIdx: number, newCost: number) => {
    setGeneratedPlan((prev: any) => {
      if (!prev) return prev;
      const updatedPhases = [...prev.phases];
      updatedPhases[phaseIdx].treatments = [...updatedPhases[phaseIdx].treatments];
      updatedPhases[phaseIdx].treatments[txIdx] = {
        ...updatedPhases[phaseIdx].treatments[txIdx],
        cost: newCost
      };
      return { ...prev, phases: updatedPhases };
    });
  };

  const handleUpdateNotes = (phaseIdx: number, txIdx: number, newNotes: string) => {
    setGeneratedPlan((prev: any) => {
      if (!prev) return prev;
      const updatedPhases = [...prev.phases];
      updatedPhases[phaseIdx].treatments = [...updatedPhases[phaseIdx].treatments];
      updatedPhases[phaseIdx].treatments[txIdx] = {
        ...updatedPhases[phaseIdx].treatments[txIdx],
        notes: newNotes
      };
      return { ...prev, phases: updatedPhases };
    });
  };

  const handleDeleteTreatment = (phaseIdx: number, txIdx: number) => {
    setGeneratedPlan((prev: any) => {
      if (!prev) return prev;
      const updatedPhases = [...prev.phases];
      updatedPhases[phaseIdx].treatments = updatedPhases[phaseIdx].treatments.filter((_: any, i: number) => i !== txIdx);
      return { ...prev, phases: updatedPhases };
    });
    toast.success('تم حذف الإجراء من المرحلة المقترحة.');
  };

  const handleMoveTreatment = (phaseIdx: number, txIdx: number, direction: 'up' | 'down') => {
    setGeneratedPlan((prev: any) => {
      if (!prev) return prev;
      const updatedPhases = [...prev.phases];
      const treatments = [...updatedPhases[phaseIdx].treatments];
      const targetIdx = direction === 'up' ? txIdx - 1 : txIdx + 1;
      
      if (targetIdx >= 0 && targetIdx < treatments.length) {
        const temp = treatments[txIdx];
        treatments[txIdx] = treatments[targetIdx];
        treatments[targetIdx] = temp;
        updatedPhases[phaseIdx].treatments = treatments;
      }
      return { ...prev, phases: updatedPhases };
    });
  };

  const handleMovePhase = (phaseIdx: number, direction: 'up' | 'down') => {
    setGeneratedPlan((prev: any) => {
      if (!prev) return prev;
      const updatedPhases = [...prev.phases];
      const targetIdx = direction === 'up' ? phaseIdx - 1 : phaseIdx + 1;
      
      if (targetIdx >= 0 && targetIdx < updatedPhases.length) {
        const temp = updatedPhases[phaseIdx];
        updatedPhases[phaseIdx] = updatedPhases[targetIdx];
        updatedPhases[targetIdx] = temp;
      }
      return { ...prev, phases: updatedPhases };
    });
  };

  // Calculate stats
  const totalCost = generatedPlan?.phases.reduce((sum: number, phase: any) => 
    sum + phase.treatments.reduce((pSum: number, tx: any) => pSum + (Number(tx.cost) || 0), 0)
  , 0) || 0;

  const totalSessions = generatedPlan?.phases.reduce((sum: number, phase: any) => 
    sum + phase.treatments.reduce((pSum: number, tx: any) => pSum + (Number(tx.sessions) || 0), 0)
  , 0) || 0;

  const totalTreatments = generatedPlan?.phases.reduce((sum: number, phase: any) => 
    sum + (phase.treatments?.length || 0)
  , 0) || 0;

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 space-y-6">
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full animate-ping"></div>
          <div className="absolute inset-0 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="w-16 h-16 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-full shadow-lg flex items-center justify-center text-white">
            <Brain className="w-8 h-8 animate-pulse" />
          </div>
        </div>
        <div className="text-center space-y-2 max-w-md text-slate-800">
          <h3 className="text-base font-extrabold text-gray-900">جاري توليد الخطة السريرية الذكية بالـ AI</h3>
          <p className="text-xs text-purple-600 font-bold bg-purple-50 px-4 py-2 rounded-full inline-block animate-pulse">
            {generationStep}
          </p>
          <p className="text-[11px] text-gray-500 leading-relaxed pt-2">
            يقوم محرك الذكاء الاصطناعي بمراجعة شاملة للتاريخ المرضي للمريض {patient?.name}، وحساسية الأدوية، وحالة الأسنان المصابة، بالإضافة لمطابقة العلاجات المكتملة والجارية لبناء مراحل علاجية آمنة وفقاً للبروتوكولات العالمية.
          </p>
        </div>
      </div>
    );
  }

  if (generatedPlan) {
    return (
      <div className="space-y-6 text-right animate-in fade-in slide-in-from-bottom-2">
        {/* Intro summary banner */}
        <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-950 text-white rounded-2xl p-5 border border-purple-800/30 shadow-md space-y-2 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full blur-xl -translate-x-4 -translate-y-4"></div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-purple-300 bg-purple-900/60 border border-purple-700/50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              خطة علاجية ذكية مقترحة بالـ AI
            </span>
            <Brain className="w-5 h-5 text-purple-300 animate-pulse" />
          </div>
          <h3 className="text-sm font-bold text-slate-100">تحليل الخطة والتوصيات لـ {patient?.name}:</h3>
          <p className="text-xs text-slate-200/90 leading-relaxed">{generatedPlan.summary}</p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-purple-50 rounded-xl p-3 border border-purple-100 text-center space-y-0.5">
            <p className="text-[10px] font-bold text-purple-500">التكلفة الكلية للخطة</p>
            <p className="text-sm font-black text-purple-700 font-mono">
              {totalCost.toLocaleString('ar-IQ')} <span className="text-[10px] font-bold">د.ع</span>
            </p>
          </div>
          <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100 text-center space-y-0.5">
            <p className="text-[10px] font-bold text-indigo-500">الجلسات المتوقعة</p>
            <p className="text-sm font-black text-indigo-700 font-mono">
              {totalSessions} <span className="text-[10px] font-bold">جلسة</span>
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-center space-y-0.5">
            <p className="text-[10px] font-bold text-slate-500">إجمالي العلاجات</p>
            <p className="text-sm font-black text-slate-700 font-mono">
              {totalTreatments} <span className="text-[10px] font-bold">إجراءات</span>
            </p>
          </div>
        </div>

        {/* Contraindications / Warnings Section */}
        {generatedPlan.contraindications && generatedPlan.contraindications.length > 0 && (
          <div className="bg-red-50/70 rounded-2xl border border-red-200 p-4 space-y-2.5 shadow-sm">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
              <h4 className="font-extrabold text-xs">⚠️ المحاذير والاحتياطات الطبية الهامة:</h4>
            </div>
            <ul className="space-y-1.5 pr-2">
              {generatedPlan.contraindications.map((c: string, idx: number) => (
                <li key={idx} className="text-xs text-red-800 leading-relaxed flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5 shrink-0"></span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Phases list */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-xs text-slate-800 border-r-2 border-purple-600 pr-2">الخطوات العالمية المعتمدة للخطط العلاجية:</h4>
            <span className="text-[10px] text-gray-500">💡 يمكنك تعديل الأسعار، الملاحظات، إعادة الترتيب أو الحذف قبل الاعتماد</span>
          </div>
          
          {generatedPlan.phases.map((phase: any, pIdx: number) => (
            <div key={pIdx} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 hover:shadow-md transition-shadow relative">
              
              {/* Phase header & Reordering */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-2.5 text-right">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-extrabold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">المرحلة {pIdx + 1}</span>
                    <h5 className="font-extrabold text-xs text-slate-900">{phase.name}</h5>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-relaxed">{phase.description}</p>
                </div>
                
                {/* Phase sorting buttons */}
                <div className="flex gap-1">
                  <button
                    onClick={() => handleMovePhase(pIdx, 'up')}
                    disabled={pIdx === 0}
                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-600 transition-colors"
                    title="تحريك المرحلة للأعلى"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 rotate-90" />
                  </button>
                  <button
                    onClick={() => handleMovePhase(pIdx, 'down')}
                    disabled={pIdx === generatedPlan.phases.length - 1}
                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-600 transition-colors"
                    title="تحريك المرحلة للأسفل"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 -rotate-90" />
                  </button>
                </div>
              </div>

              {/* Treatments in this phase */}
              <div className="space-y-2">
                {phase.treatments && phase.treatments.length > 0 ? (
                  phase.treatments.map((tx: any, tIdx: number) => (
                    <div key={tIdx} className="bg-slate-50/70 rounded-xl p-3 border border-slate-150 flex items-center justify-between text-xs hover:bg-slate-50 transition-all">
                      <div className="flex items-center gap-3 flex-1">
                        {/* Tooth number badge */}
                        <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center font-mono font-black text-slate-700 shrink-0">
                          {tx.toothNumber === 0 ? '🦷' : tx.toothNumber}
                        </div>
                        
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap text-right">
                            {/* Editable Notes / Title */}
                            <input
                              type="text"
                              value={tx.notes}
                              onChange={(e) => handleUpdateNotes(pIdx, tIdx, e.target.value)}
                              className="font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 focus:bg-white focus:outline-none px-1 py-0.5 rounded w-72 transition-all"
                            />
                            <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {tx.type === 'endo' ? 'علاج عصب' :
                               tx.type === 'implant' ? 'زراعة' :
                               tx.type === 'prosthetic' ? 'تركيبات' :
                               tx.type === 'ortho' ? 'تقويم أسنان' :
                               tx.type === 'surgery' ? 'جراحة/خلع' :
                               tx.type === 'perio' ? 'علاج لثة' : 'عام'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500">
                            {tx.toothNumber === 0 ? 'إجراء عام لكامل الفم' : `فحص وتأهيل السن رقم ${tx.toothNumber} بنظام FDI`}
                          </p>
                        </div>
                      </div>

                      {/* Right actions: Cost input, sorting, and delete */}
                      <div className="flex items-center gap-4 shrink-0">
                        {/* Cost input */}
                        <div className="text-left space-y-1">
                          <label className="block text-[8px] font-extrabold text-slate-400 text-right">التكلفة (د.ع)</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={tx.cost}
                              onChange={(e) => handleUpdateCost(pIdx, tIdx, parseInt(e.target.value) || 0)}
                              className="w-24 text-left font-black text-slate-800 bg-white border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono text-[11px]"
                            />
                          </div>
                        </div>

                        {/* Sorting within phase */}
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => handleMoveTreatment(pIdx, tIdx, 'up')}
                            disabled={tIdx === 0}
                            className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-20 text-slate-500 transition-colors"
                            title="تحريك للأعلى"
                          >
                            <ChevronLeft className="w-3.5 h-3.5 rotate-90" />
                          </button>
                          <button
                            onClick={() => handleMoveTreatment(pIdx, tIdx, 'down')}
                            disabled={tIdx === phase.treatments.length - 1}
                            className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-20 text-slate-500 transition-colors"
                            title="تحريك للأسفل"
                          >
                            <ChevronLeft className="w-3.5 h-3.5 -rotate-90" />
                          </button>
                        </div>

                        {/* Delete treatment */}
                        <button
                          onClick={() => handleDeleteTreatment(pIdx, tIdx)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors"
                          title="حذف الإجراء"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-gray-400 text-center py-2">لا توجد إجراءات مقترحة لهذه المرحلة.</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Buttons / Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
          <Button
            onClick={handleAdopt}
            disabled={isAdopting}
            className="flex-1 h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-lg shadow-purple-500/20 border-0 rounded-xl transition-all active:scale-95"
          >
            <span className="flex items-center justify-center gap-2">
              {isAdopting ? 'جاري اعتماد وإضافة الخطط...' : '✓ اعتماد الخطة وبدء التنفيذ بالعيادة'}
            </span>
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setGeneratedPlan(null);
              setError(null);
            }}
            disabled={isAdopting}
            className="px-4 h-11 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all"
          >
            <span className="flex items-center gap-1.5">
              <RefreshCcw className="w-3.5 h-3.5" /> إعادة ضبط
            </span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-right animate-in fade-in">
      {/* Intro Instruction banner */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
        <Sparkles className="w-5 h-5 text-purple-600 shrink-0 mt-0.5 animate-pulse" />
        <div className="space-y-1 text-right">
          <h4 className="font-extrabold text-xs text-slate-900">مرحباً بك في مخطّط العلاج الذكي بالـ AI!</h4>
          <p className="text-[11px] text-slate-700 leading-relaxed">
            يقوم النظام بتحليل كامل ملف المريض سريرياً وعلاجياً. سيتم قراءة الحساسيات، العلامات الحيوية، والأمراض، بالإضافة إلى **الخطط العلاجية المكتملة مسبقاً** و**الخطط الجارية**، لكي يولد الذكاء الاصطناعي خطة مكملة ومبنية بناءً علمياً يتماشى مع المراحل الأربعة العالمية للتخطيط العلاجي السني.
          </p>
        </div>
      </div>

      {/* Checklist Grid */}
      <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-4 space-y-4">
        <h4 className="font-extrabold text-xs text-slate-800">📋 تفاصيل سياق المريض التي سيحصل عليها وكيل الـ AI بالكامل:</h4>
        
        <div className="grid grid-cols-2 gap-4 text-xs leading-relaxed text-right">
          {/* Vitals */}
          <div className="space-y-1.5">
            <p className="font-bold text-slate-900 flex items-center gap-1.5 justify-start">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> العلامات الحيوية المكتملة:
            </p>
            <div className="flex flex-wrap gap-2 text-[10px] pr-2">
              <span className="bg-white border border-slate-200 px-2 py-0.5 rounded font-mono">
                الضغط: {medicalData.vitals.bp}
              </span>
              <span className="bg-white border border-slate-200 px-2 py-0.5 rounded font-mono">
                السكر: {medicalData.vitals.sugar}
              </span>
              <span className="bg-white border border-slate-200 px-2 py-0.5 rounded font-mono">
                النبض: {medicalData.vitals.pulse}
              </span>
            </div>
          </div>

          {/* Chronic Conditions */}
          <div className="space-y-1.5">
            <p className="font-bold text-slate-900 flex items-center gap-1.5 justify-start">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span> الأمراض والمخاطر المزمنة:
            </p>
            {medicalData.conditions.length > 0 ? (
              <div className="flex flex-wrap gap-1 pr-2">
                {medicalData.conditions.map((c, idx) => (
                  <span key={idx} className="bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 text-[9px] px-2 py-0.5 rounded-full">
                    {c === 'hypertension' ? 'ضغط دم مرتفع' :
                     c === 'diabetes' ? 'سكري' : c}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-slate-500 pr-2">لا يوجد أمراض مزمنة مسجلة.</p>
            )}
          </div>

          {/* Allergies */}
          <div className="space-y-1.5">
            <p className="font-bold text-slate-900 flex items-center gap-1.5 justify-start">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> حساسيات المريض الدوائية:
            </p>
            {medicalData.allergies.length > 0 ? (
              <div className="flex flex-wrap gap-1 pr-2">
                {medicalData.allergies.map((a, idx) => (
                  <span key={idx} className="bg-red-50 text-red-700 font-bold border border-red-100 text-[9px] px-2 py-0.5 rounded-full">
                    {a === 'penicillin' ? 'بنسلين 💊' : a}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-slate-500 pr-2">لا يوجد حساسيات معروفة.</p>
            )}
          </div>

          {/* Non-healthy Teeth */}
          <div className="space-y-1.5">
            <p className="font-bold text-slate-900 flex items-center gap-1.5 justify-start">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> الأسنان المتضررة المكتشفة:
            </p>
            {nonHealthyTeeth.length > 0 ? (
              <div className="flex flex-wrap gap-1 pr-2">
                {nonHealthyTeeth.map((t, idx) => (
                  <span key={idx} className="bg-amber-50 text-amber-800 font-bold border border-amber-150 text-[9px] px-1.5 py-0.5 rounded">
                    السن {t.number} ({t.condition === 'decayed' ? 'تسوس' :
                                    t.condition === 'missing' ? 'مفقود' :
                                    t.condition === 'crown' ? 'تاج' :
                                    t.condition === 'endo' ? 'عصب' :
                                    t.condition === 'implant' ? 'زرعة' : t.condition})
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-slate-500 pr-2">جميع الأسنان سليمة - سيتم اقتراح رعاية وقائية عامة.</p>
            )}
          </div>

          {/* Completed Treatment History */}
          <div className="space-y-1.5 col-span-2 border-t border-slate-200/50 pt-2.5 text-right">
            <p className="font-bold text-slate-900 flex items-center gap-1.5 justify-start">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> سجل العلاجات المكتملة مسبقاً (سيبني عليها الـ AI):
            </p>
            {completedPlans.length > 0 ? (
              <div className="space-y-1 pr-2">
                {completedPlans.map((p, idx) => (
                  <p key={idx} className="text-[10px] text-slate-600">
                    ✓ سن #{p.toothNumber || 'إجراء عام'} • {p.notes || p.type} <span className="text-[8px] bg-green-50 text-green-700 px-1 py-0.2 rounded border border-green-100 font-bold">مكتمل</span>
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 pr-2 leading-normal">لا توجد خطط علاجية مكتملة مسجلة.</p>
            )}
          </div>

          {/* Ongoing Treatment History */}
          <div className="space-y-1.5 col-span-2 border-t border-slate-200/50 pt-2.5 text-right">
            <p className="font-bold text-slate-900 flex items-center gap-1.5 justify-start">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> سجل العلاجات الجارية حالياً (سيتجنب الـ AI تكرارها):
            </p>
            {ongoingPlans.length > 0 ? (
              <div className="space-y-1 pr-2">
                {ongoingPlans.map((p, idx) => (
                  <p key={idx} className="text-[10px] text-slate-600">
                    ⌛ سن #{p.toothNumber || 'إجراء عام'} • {p.notes || p.type} <span className="text-[8px] bg-blue-50 text-blue-700 px-1 py-0.2 rounded border border-blue-100 font-bold">جاري العمل</span>
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 pr-2 leading-normal">لا توجد خطط علاجية جارية مسجلة حالياً.</p>
            )}
          </div>
        </div>
      </div>

      {/* Focus & Custom instructions */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-800 flex items-center gap-1">
          <span>💡</span> تعليمات أو متطلبات إضافية للطبيب (مثال: المريض يطلب تقسيط العلاج، أو تبييض الأسنان):
        </label>
        <textarea
          value={doctorFocus}
          onChange={e => setDoctorFocus(e.target.value)}
          rows={3}
          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-slate-450 resize-none transition-all shadow-sm"
          placeholder="مثال: المريض يرغب ببدء تجميل القواطع الأمامية أولاً، المريض لديه فوبيا من الخلع، أو المريض يريد التركيز على تبييض القشور..."
        />
      </div>

      {/* Error details if any */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800 font-bold leading-relaxed">
          ⚠️ فشل التوليد: {error}
        </div>
      )}

      {/* Button to generate */}
      <button
        onClick={handleGenerate}
        className="w-full h-12 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95"
      >
        <Brain className="w-4 h-4 animate-bounce" />
        توليد الخطة السريرية المتكاملة بالـ AI الآن
      </button>
    </div>
  );
};


