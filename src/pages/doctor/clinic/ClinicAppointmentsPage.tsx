import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Calendar,
  List,
  Plus,
  Search,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
  MapPin,
  Edit2,
  FileText,
  Trash2,
  UserPlus,
  Save,
  ChevronDown,
  History, // Added
  Globe,
  MessageSquare,
  Bell,
  Settings,
  Send,
  Paperclip,
  User,
  Check,
  ChevronLeft,
  ChevronRight,
  Star,
  Activity,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/common/Card';
import { formatDate } from '../../../lib/utils';
import { BentoStatCard } from '../../../components/dashboard/BentoStatCard';
import { HorizontalCalendar } from '../../../components/calendar/HorizontalCalendar';
import { AppointmentModal } from '../../../components/appointments/AppointmentModal';
import { Appointment } from '../../../types';
import { useAppointments } from '../../../hooks/useAppointments';
import { supabase } from '../../../lib/supabase';
import { usePatients } from '../../../hooks/usePatients';
import { useOnlineRequests, OnlineRequest } from '../../../hooks/useOnlineRequests';
import { getStaffByClinic } from '../../../data/mock/clinicStaff';
import { useStaff } from '../../../hooks/useStaff';
import { useAuth } from '../../../contexts/AuthContext';


interface ClinicAppointmentsPageProps {
  clinicId: string;
}

export const ClinicAppointmentsPage: React.FC<ClinicAppointmentsPageProps> = ({ clinicId }) => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'calendar' | 'list'>('calendar');
  const [sectionTab, setSectionTab] = useState<'upcoming' | 'past' | 'messages'>('upcoming'); // New Tab State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Unified Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  const [selectedRequestForFile, setSelectedRequestForFile] = useState<OnlineRequest | null>(null); // New State
  const [isSavingPatient, setIsSavingPatient] = useState(false);
  const [doctors, setDoctors] = useState<{ id: string, name: string }[]>([]);

  const { patients, createPatient } = usePatients(clinicId);
  const {
    appointments,
    loading,
    createAppointment,
    updateAppointment,
    deleteAppointment
  } = useAppointments(clinicId);

  // Unified Staff Data
  const { staff } = useStaff(clinicId);

  useEffect(() => {
    if (!staff) return;
    const activeDoctors = staff
      .filter(s => s.status === 'active' && (s.position === 'doctor' || s.role_title?.toLowerCase().includes('doctor') || s.role_title?.includes('طبيب')))
      .map(d => ({ id: d.id.toString(), name: d.name })); // useStaff returns 'name' not 'full_name'

    if (activeDoctors.length > 0) {
      setDoctors(activeDoctors);
    } else {
      // Fallback to Mock Data
      const mockStaff = getStaffByClinic(clinicId).filter(s => s.position === 'doctor');
      if (mockStaff.length > 0) {
        setDoctors(mockStaff.map(s => ({ id: s.id, name: s.name })));
      } else {
        // Absolute fallback if no mock data exists
        setDoctors([{ id: '1', name: 'د. أحمد محمد (افتراضي)' }]);
      }
    }
  }, [staff, clinicId]);

  // Load Online Requests (Real Data)
  const { requests: onlineRequests, refresh: refreshRequests, confirmRequest, cancelRequest, linkPatientToRequest } = useOnlineRequests(clinicId);

  // Removed old mock useEffects

  // New state for pre-filling the Add Modal
  const [initialAppointmentData, setInitialAppointmentData] = useState<Partial<Appointment> | null>(null);

  // ==========================================
  // PHASE 3 & WhatsApp Integration Additions
  // ==========================================
  const { user } = useAuth();
  const [selectedAptForReminder, setSelectedAptForReminder] = useState<Appointment | null>(null);
  const [reminderMethod, setReminderMethod] = useState<'platform' | 'whatsapp_web' | 'twilio_sms' | 'whatsapp_api'>('platform');
  const [reminderMessage, setReminderMessage] = useState('');
  const [sendingReminder, setSendingReminder] = useState(false);

  // Platform-level messaging config (fetched from admin settings)
  const [platformMsgConfig, setPlatformMsgConfig] = useState<any>(null);

  // Chat/Messages settings
  const [activeChatPatient, setActiveChatPatient] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'chats'>('chats'); // Settings tab moved to admin panel

  // Unread messages tracking per patient
  const [patientLastMsg, setPatientLastMsg] = useState<Record<string, { content: string; ts: string; unread: number }>>({});
  const [readPatients, setReadPatients] = useState<Set<string>>(new Set());

  // Activate Portal Modal States
  const [selectedPatientForActivation, setSelectedPatientForActivation] = useState<{
    id: string;
    name: string;
    phone: string;
    patient_user_id?: string | null;
  } | null>(null);
  const [isActivatingPortal, setIsActivatingPortal] = useState(false);
  const [activationPhoneExists, setActivationPhoneExists] = useState<boolean | null>(null);
  const [checkingActivationPhone, setCheckingActivationPhone] = useState(false);

  // Effect to verify if phone exists on activation click
  useEffect(() => {
    if (!selectedPatientForActivation) {
      setActivationPhoneExists(null);
      return;
    }

    const verifyPhone = async () => {
      setCheckingActivationPhone(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('phone', selectedPatientForActivation.phone.trim())
          .maybeSingle();

        setActivationPhoneExists(!!data);
      } catch (err) {
        console.error('Error verifying phone:', err);
      } finally {
        setCheckingActivationPhone(false);
      }
    };

    verifyPhone();
  }, [selectedPatientForActivation]);

  // Load platform messaging config (set by admin — applies to all clinics)
  useEffect(() => {
    const fetchPlatformMessagingConfig = async () => {
      try {
        const { data } = await supabase
          .from('platform_settings')
          .select('value')
          .eq('key', 'messaging')
          .maybeSingle();
        if (data?.value) setPlatformMsgConfig(data.value);
        else setPlatformMsgConfig({ active_provider: 'whatsapp_web', allow_platform_messages: true, allow_whatsapp_web: true, providers: {} });
      } catch (e) { console.error('Error loading platform messaging config:', e); }
    };
    fetchPlatformMessagingConfig();
  }, []);

  // Load last message & unread count for every patient with a portal account
  useEffect(() => {
    if (!user?.id || patients.length === 0) return;
    const portalPatients = patients.filter(p => !!p.patient_user_id);
    if (portalPatients.length === 0) return;

    const fetchAllLastMessages = async () => {
      const map: Record<string, { content: string; ts: string; unread: number }> = {};
      await Promise.all(
        portalPatients.map(async (p) => {
          const pid = p.patient_user_id as string;
          const { data } = await supabase
            .from('direct_messages')
            .select('content, created_at, sender_id')
            .or(`and(sender_id.eq.${user.id},recipient_id.eq.${pid}),and(sender_id.eq.${pid},recipient_id.eq.${user.id})`)
            .order('created_at', { ascending: false })
            .limit(20);
          if (data && data.length > 0) {
            const last = data[0];
            // Count unread = messages FROM patient that are recent (since we have no read-receipts, count all patient messages)
            const unread = data.filter(m => m.sender_id === pid).length;
            map[p.id] = {
              content: last.content?.slice(0, 50) || '',
              ts: last.created_at,
              unread
            };
          }
        })
      );
      setPatientLastMsg(map);
    };

    fetchAllLastMessages();
  }, [patients, user]);

  // Set default reminder text when appointment is selected
  useEffect(() => {
    if (selectedAptForReminder) {
      const pName = getPatientName(selectedAptForReminder.patientId, selectedAptForReminder.patientName);
      const formatTime12h = (time24: string) => {
        if (!time24) return '';
        const [h, m] = time24.split(':');
        let hours = parseInt(h, 10);
        const ampm = hours >= 12 ? 'مساءً' : 'صباحاً';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${hours.toString().padStart(2, '0')}:${m} ${ampm}`;
      };

      const timeStr = formatTime12h(selectedAptForReminder.time);
      const dateStr = selectedAptForReminder.date;
      const typeStr = getTypeLabel(selectedAptForReminder.type);
      
      const isPlatformUser = patients.find(p => p.id === selectedAptForReminder.patientId)?.patient_user_id;
      const canUsePlatform = isPlatformUser && platformMsgConfig?.allow_platform_messages !== false;
      
      let initialMethod: 'platform' | 'whatsapp_web' | 'twilio_sms' | 'whatsapp_api' = 'platform';
      if (canUsePlatform) {
        initialMethod = 'platform';
      } else if (platformMsgConfig?.allow_whatsapp_web !== false) {
        initialMethod = 'whatsapp_web';
      } else if (platformMsgConfig?.twilio_sms_enabled) {
        initialMethod = 'twilio_sms';
      } else if (platformMsgConfig?.whatsapp_api_enabled) {
        initialMethod = 'whatsapp_api';
      } else {
        initialMethod = 'whatsapp_web';
      }

      setReminderMethod(initialMethod);

      if (initialMethod === 'twilio_sms') {
        const shortTimeStr = (() => {
          const [h, m] = selectedAptForReminder.time.split(':');
          let hours = parseInt(h, 10);
          const ampm = hours >= 12 ? 'م' : 'ص';
          hours = hours % 12;
          hours = hours ? hours : 12;
          return `${hours}:${m} ${ampm}`;
        })();
        const dayStr = (() => {
          if (!selectedAptForReminder?.date) return '';
          const parts = selectedAptForReminder.date.split('-');
          return parts.length === 3 ? parseInt(parts[2], 10).toString() : '';
        })();
        setReminderMessage(`تذكير: موعدك يوم ${dayStr} الساعة ${shortTimeStr}`);
      } else {
        setReminderMessage(
          `مرحباً ${pName}، نود تذكيرك بموعدك القادم في عيادتنا:\n` +
          `🗓️ التاريخ: ${dateStr}\n` +
          `⏰ الوقت: ${timeStr}\n` +
          `🦷 نوع الزيارة: ${typeStr}\n\n` +
          `يسعدنا حضورك في الموعد المحدد. في حال رغبتك بالتأجيل أو الإلغاء يرجى إعلامنا مسبقاً.`
        );
      }
    }
  }, [selectedAptForReminder, patients]);

  const formatToInternationalPhone = (phone: string, includePlus: boolean = true): string => {
    let cleaned = phone.replace(/\D/g, ''); // Keep only digits
    const countryCode = platformMsgConfig?.default_country_code || '964';

    // If it already starts with the country code, do nothing but keep it
    if (cleaned.startsWith(countryCode)) {
      return includePlus ? `+${cleaned}` : cleaned;
    }

    // Strip leading trunk prefix '0' if present
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }

    // Prepend country code
    cleaned = countryCode + cleaned;
    
    return includePlus ? `+${cleaned}` : cleaned;
  };

  const sendTwilioMessage = async (to: string, body: string, forceWhatsApp?: boolean) => {
    if (!platformMsgConfig?.providers?.twilio) {
      throw new Error('إعدادات Twilio غير متوفرة في المنصة');
    }
    const { account_sid, auth_token, sender_phone } = platformMsgConfig.providers.twilio;
    if (!account_sid || !auth_token || !sender_phone) {
      throw new Error('يرجى التحقق من إعدادات Twilio (Account SID, Auth Token, Sender Phone)');
    }
    const isWhatsApp = sender_phone.startsWith('whatsapp:') || forceWhatsApp;
    let fromVal = sender_phone;
    if (forceWhatsApp && !fromVal.startsWith('whatsapp:')) {
      fromVal = `whatsapp:${fromVal}`;
    }
    const toVal = isWhatsApp ? `whatsapp:${formatToInternationalPhone(to, true)}` : formatToInternationalPhone(to, true);

    const url = `https://api.twilio.com/2010-04-01/Accounts/${account_sid}/Messages.json`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${account_sid}:${auth_token}`),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ To: toVal, From: fromVal, Body: body }).toString()
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'فشل إرسال رسالة Twilio');
    }
    return await response.json();
  };

  const sendUltramsgMessage = async (to: string, body: string) => {
    if (!platformMsgConfig?.providers?.ultramsg) {
      throw new Error('إعدادات Ultramsg غير متوفرة في المنصة');
    }
    const { instance_id, token } = platformMsgConfig.providers.ultramsg;
    if (!instance_id || !token) {
      throw new Error('يرجى التحقق من إعدادات Ultramsg (Instance ID, Token)');
    }
    const toVal = formatToInternationalPhone(to, false);
    const url = `https://api.ultramsg.com/${instance_id}/messages/chat`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token, to: toVal, body }).toString()
    });
    if (!response.ok) throw new Error('فشل إرسال رسالة Ultramsg');
    return await response.json();
  };

  const sendGreenApiMessage = async (to: string, body: string) => {
    if (!platformMsgConfig?.providers?.greenapi) {
      throw new Error('إعدادات Green API غير متوفرة في المنصة');
    }
    const { id_instance, api_token } = platformMsgConfig.providers.greenapi;
    if (!id_instance || !api_token) {
      throw new Error('يرجى التحقق من إعدادات Green API (idInstance, apiTokenInstance)');
    }
    const toVal = formatToInternationalPhone(to, false) + '@c.us';
    const url = `https://api.green-api.com/waInstance${id_instance}/sendMessage/${api_token}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: toVal, message: body })
    });
    if (!response.ok) throw new Error('فشل إرسال رسالة Green API');
    return await response.json();
  };

  const handleSendReminder = async () => {
    if (!selectedAptForReminder) return;
    const patientObj = patients.find(p => p.id === selectedAptForReminder.patientId);
    const phone = selectedAptForReminder.patientPhone || patientObj?.phone;
    const recipientUserId = patientObj?.patient_user_id || selectedAptForReminder.patientUserId;

    if (!phone && reminderMethod !== 'platform') {
      toast.error('المريض ليس لديه رقم هاتف مسجل');
      return;
    }

    setSendingReminder(true);
    try {
      if (reminderMethod === 'platform') {
        if (!recipientUserId) {
          toast.error('المريض غير مرتبط بحساب منصة');
          setSendingReminder(false);
          return;
        }
        const { error } = await supabase
          .from('direct_messages')
          .insert({
            sender_id: user?.id,
            recipient_id: recipientUserId,
            content: reminderMessage,
            type: 'reminder',
          metadata: {
              appointment_id: selectedAptForReminder.id,
              date: selectedAptForReminder.date,
              time: (() => {
                const [h, m] = selectedAptForReminder.time.split(':');
                let hours = parseInt(h, 10);
                const ampm = hours >= 12 ? 'مساءً' : 'صباحاً';
                hours = hours % 12;
                hours = hours ? hours : 12;
                return `${hours.toString().padStart(2, '0')}:${m} ${ampm}`;
              })(),
              type: selectedAptForReminder.type
            }
          });
        if (error) throw error;
        toast.success('تم إرسال التذكير بنجاح إلى صندوق وارد المراجع على المنصة');
      } else if (reminderMethod === 'whatsapp_web') {
        const cleanPhone = formatToInternationalPhone(phone!, false);
        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(reminderMessage)}`;
        window.open(url, '_blank');
        toast.success('تم فتح نافذة WhatsApp Web للتأكيد والإرسال');
      } else if (reminderMethod === 'twilio_sms') {
        await sendTwilioMessage(phone!, reminderMessage, false);
        if (recipientUserId) {
          await supabase.from('direct_messages').insert({
            sender_id: user?.id,
            recipient_id: recipientUserId,
            content: `[تذكير مرسل عبر SMS]:\n${reminderMessage}`,
            type: 'reminder',
            metadata: { provider: 'twilio_sms' }
          });
        }
        toast.success('تم إرسال التذكير بنجاح عبر SMS');
      } else if (reminderMethod === 'whatsapp_api') {
        const prov = platformMsgConfig?.active_whatsapp_api_provider || 'twilio';
        if (prov === 'twilio') {
          await sendTwilioMessage(phone!, reminderMessage, true);
        } else if (prov === 'ultramsg') {
          await sendUltramsgMessage(phone!, reminderMessage);
        } else if (prov === 'greenapi') {
          await sendGreenApiMessage(phone!, reminderMessage);
        }
        
        if (recipientUserId) {
          await supabase.from('direct_messages').insert({
            sender_id: user?.id,
            recipient_id: recipientUserId,
            content: `[تذكير مرسل عبر واتساب تلقائي]:\n${reminderMessage}`,
            type: 'reminder',
            metadata: { provider: 'whatsapp_api', whatsapp_provider: prov }
          });
        }
        toast.success(`تم إرسال التذكير بنجاح عبر واتساب (${prov})`);
      }
      setSelectedAptForReminder(null);
    } catch (e: any) {
      console.error(e);
      const prov = platformMsgConfig?.active_whatsapp_api_provider || 'twilio';
      const isTwilio = reminderMethod === 'twilio_sms' || (reminderMethod === 'whatsapp_api' && prov === 'twilio');
      
      if (isTwilio && (e.message?.includes('Failed to fetch') || e.name === 'TypeError' || String(e).includes('TypeError'))) {
        toast.warning(
          '🔒 تم حظر الإرسال المباشر من المتصفح (CORS Policy) لحماية بياناتك:\n' +
          'تمنع Twilio طلبات الـ API المباشرة من متصفحات الويب لمنع سرقة مفاتيح الـ Auth Token الخاصة بالعيادة.\n' +
          'سيقوم خادم المنصة/الدوال البرمجية (Edge Functions) بالإرسال التلقائي الفعلي بأمان وسرية تامة في الخلفية.'
        );
      } else {
        toast.error('فشل إرسال التذكير: ' + e.message);
      }
    } finally {
      setSendingReminder(false);
    }
  };

  // Real-time Chat Loaders
  const fetchChatMessages = async (patientUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`and(sender_id.eq.${user?.id},recipient_id.eq.${patientUserId}),and(sender_id.eq.${patientUserId},recipient_id.eq.${user?.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setChatMessages(data || []);
    } catch (e) {
      console.error('Error fetching chat messages:', e);
    }
  };

  useEffect(() => {
    if (!activeChatPatient?.patient_user_id || !user?.id) return;
    
    fetchChatMessages(activeChatPatient.patient_user_id);

    const subscription = supabase
      .channel(`chat:${activeChatPatient.patient_user_id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages'
      }, (payload) => {
        const newMsg = payload.new;
        if (
          (newMsg.sender_id === user.id && newMsg.recipient_id === activeChatPatient.patient_user_id) ||
          (newMsg.sender_id === activeChatPatient.patient_user_id && newMsg.recipient_id === user.id)
        ) {
          setChatMessages(prev => [...prev, newMsg]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [activeChatPatient, user]);

  const handleSendMessage = async () => {
    if (!newMessageText.trim() || !activeChatPatient?.patient_user_id || !user?.id) return;

    setSendingMsg(true);
    try {
      const { error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: user.id,
          recipient_id: activeChatPatient.patient_user_id,
          content: newMessageText.trim(),
          type: 'text'
        });
      if (error) throw error;
      setNewMessageText('');
      fetchChatMessages(activeChatPatient.patient_user_id);
    } catch (e: any) {
      console.error(e);
      toast.error('فشل إرسال الرسالة: ' + e.message);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleConfirmRequest = async (request: OnlineRequest) => {
    // Direct confirm as requested (reverting modal logic)
    if (!request.patientId) {
      alert('يجب إنشاء ملف للمريض أولاً!');
      return;
    }
    const success = await confirmRequest(request.id);
    if (success) {
      alert(`تم تأكيد الحجز للمريض ${request.patientName} بنجاح!`);
      // refreshRequests(); // Handled by hook usually, or add if needed
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) {
      await cancelRequest(requestId);
      refreshRequests();
    }
  };

  const handleDeleteAppointment = (aptId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الموعد؟')) {
      deleteAppointment(aptId);
    }
  };

  // Helper to get patient name
  const getPatientName = (patientId: string, savedName?: string) => {
    if (savedName) return savedName; // Use saved name if available (e.g. from Online Request)
    if (!patientId) return 'مريض غير محدد';
    if (patientId.toString().startsWith('temp')) return "مريض زائر (جديد)";
    const patient = patients.find(p => p.id === patientId);
    return patient ? patient.name : 'مريض غير معروف';
  };

  const handleEditClick = (apt: Appointment) => {
    setEditingAppointment(apt);
    setIsModalOpen(true);
  };

  const handleSaveAppointment = async (appointmentData: Partial<Appointment>) => {
    if (editingAppointment) {
      await updateAppointment({ ...editingAppointment, ...appointmentData } as Appointment);
    } else {
      // handleSaveAppointment handles both create and update
      // No separate handleUpdateAppointment needed
      await createAppointment({
        ...appointmentData,
        clinicId,
        status: appointmentData.status || 'scheduled'
      } as Appointment);
    }
    setIsModalOpen(false);
    setEditingAppointment(null);
  };

  const handleCreatePatientFile = (request: OnlineRequest) => {
    // Open the modal for confirmation/editing
    setSelectedRequestForFile(request);
  };

  // Statistics
  const today = new Date().toLocaleDateString('en-CA');
  const todayAppointments = appointments.filter(apt => apt.date === today);
  const completed = appointments.filter(apt => apt.status === 'completed').length;
  const cancelled = appointments.filter(apt => apt.status === 'cancelled').length;
  const pending = appointments.filter(apt => apt.status === 'pending' || apt.status === 'confirmed').length;
  const completionRate = appointments.length > 0 ? Math.round((completed / appointments.length) * 100) : 0;

  // Filter Logic
  const filteredAppointments = appointments.filter(apt => {
    // Reliable Local YYYY-MM-DD
    const toLocalDateStr = (d: Date | string) => {
      // Start with a Date object
      const dateObj = typeof d === 'string' ? new Date(d) : d;
      // Use en-CA for YYYY-MM-DD format
      return dateObj.toLocaleDateString('en-CA');
    };

    const aptDateStr = apt.date; // Assuming apt.date is already YYYY-MM-DD string from DB. If not, sanitize.
    // If apt.date comes as full timestamp, normalize it:
    const normalizedAptDate = apt.date.includes('T') ? apt.date.split('T')[0] : apt.date;

    // For "Today" comparison
    const todayStr = toLocalDateStr(new Date()); // Local Today

    // Tab Filter
    if (sectionTab === 'past') {
      // Show only dates BEFORE today
      if (normalizedAptDate >= todayStr) return false;
    } else {
      // UPCOMING Tab
      // If View is Calendar, match selected date
      if (activeView === 'calendar') {
        const filterDate = toLocalDateStr(selectedDate);
        if (normalizedAptDate !== filterDate) return false;
      }
      // Note: We are ignoring "future only" filter here to allow Calendar to explore future AND today. 
      // But logic for "Past" explicitly HIDES past items.
    }

    // Filter by status
    if (selectedStatus !== 'all' && apt.status !== selectedStatus) return false;

    // Filter by Search
    if (searchTerm) {
      const pName = getPatientName(apt.patientId, apt.patientName);
      return pName.includes(searchTerm) || apt.notes?.includes(searchTerm);
    }

    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'confirmed': return 'text-purple-600 bg-purple-50 border-purple-100';
      case 'completed': return 'text-green-600 bg-green-50 border-green-100';
      case 'cancelled': return 'text-red-600 bg-red-50 border-red-100';
      case 'noshow': return 'text-orange-600 bg-orange-50 border-orange-100';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-100';
      case 'inprogress': return 'text-indigo-600 bg-indigo-50 border-indigo-100';
      default: return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'مجدول';
      case 'confirmed': return 'مؤكد';
      case 'completed': return 'مكتمل';
      case 'cancelled': return 'ملغي';
      case 'noshow': return 'لم يحضر';
      case 'pending': return 'قيد الانتظار';
      case 'inprogress': return 'جاري التنفيذ';
      default: return 'غير محدد';
    }
  };

  const getTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      'consultation': 'كشف / استشارة',
      'treatment': 'علاج',
      'followup': 'مراجعة',
      'emergency': 'طوارئ',
      'cleaning': 'تنظيف',
      'extraction': 'قلع',
      'filling': 'حشوة',
      'rootcanal': 'عصب',
      'orthodontics': 'تقويم',
      'surgery': 'جراحة'
    };
    return types[type] || type || 'زيارة عامة';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-100'; // normal
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'عاجل';
      case 'high': return 'مهم';
      case 'low': return 'منخفض';
      default: return 'عادي';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Bento Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <BentoStatCard
          title="مواعيد اليوم"
          value={todayAppointments.length}
          icon={Calendar}
          color="blue"
          trend="neutral"
          trendValue="مواعيد مجدولة"
          delay={100}
        />
        <BentoStatCard
          title="معدل الإكمال"
          value={`${completionRate}%`}
          icon={CheckCircle}
          color="green"
          trend="up"
          trendValue="إنجاز المواعيد"
          delay={200}
        />
        <BentoStatCard
          title="قيد الانتظار"
          value={pending}
          icon={Clock}
          color="orange"
          trend="neutral"
          trendValue="بانتظار الدخول"
          delay={300}
        />
        <BentoStatCard
          title="تم الإلغاء"
          value={cancelled}
          icon={XCircle}
          color="red"
          trend="down"
          trendValue="مواعيد ملغية"
          delay={400}
        />
      </div>

      {/* Main Control Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">

          {/* Section Tabs (New) */}
          <div className="flex bg-gray-50 rounded-xl p-1.5 border border-gray-100">
            <button
              onClick={() => { setSectionTab('upcoming'); setActiveView('calendar'); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${sectionTab === 'upcoming' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Clock className="w-4 h-4" /> المواعيد القادمة
            </button>
            <button
              onClick={() => { setSectionTab('past'); setActiveView('list'); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${sectionTab === 'past' ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <History className="w-4 h-4" /> المواعيد الفائتة
            </button>
            <button
              onClick={() => { setSectionTab('messages'); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${sectionTab === 'messages' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <MessageSquare className="w-4 h-4" /> الرسائل
            </button>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 w-full lg:w-auto justify-end">


            <div className="relative">
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="appearance-none px-4 pl-8 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none cursor-pointer"
              >
                <option value="all">كل الحالات</option>
                <option value="scheduled">جدول اليوم</option>
                <option value="confirmed">حجوزات مؤكدة</option>
                <option value="pending">طلبات معلقة</option>
                <option value="completed">مكتملة</option>
                <option value="cancelled">ملغي</option>
              </select>
              <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <button
              onClick={() => { setEditingAppointment(null); setIsModalOpen(true); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 transition-all cursor-pointer font-medium"
            >
              <Plus className="w-5 h-5" />
              <span>موعد جديد</span>
            </button>
          </div>
        </div>
      </div>

      {/* Calendar View (Only for Upcoming) */}
      {sectionTab === 'upcoming' && (
        <div className="space-y-6">
          <HorizontalCalendar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            appointments={appointments.filter(a => new Date(a.date).toISOString().split('T')[0] >= new Date().toISOString().split('T')[0])}
          />

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">
              مواعيد {selectedDate.toLocaleDateString('ar-IQ', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {filteredAppointments.length} موعد
            </span>
          </div>

          {/* List for Calendar Day */}
          {filteredAppointments.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredAppointments.map((apt) => (
                <div key={apt.id} className="group bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4 relative overflow-hidden">

                  {/* Status Indicator Strip */}
                  <div className={`absolute right-0 top-0 bottom-0 w-1.5 ${getStatusColor(apt.status).replace('text-', 'bg-').split(' ')[0]}`} />

                  <div className="flex items-center gap-5 w-full md:w-auto pr-4">
                    <div className="flex flex-col items-center justify-center min-w-[70px] h-18 bg-blue-50/50 rounded-2xl text-blue-700 border border-blue-100">
                      <span className="text-xl font-bold">
                        {(() => {
                          const [h, m] = apt.time.split(':');
                          let hours = parseInt(h, 10);
                          hours = hours % 12;
                          hours = hours ? hours : 12;
                          return `${hours.toString().padStart(2, '0')}:${m}`;
                        })()}
                      </span>
                      <span className="text-[10px] font-medium opacity-70">
                        {parseInt(apt.time.split(':')[0]) >= 12 ? 'مساءً' : 'صباحاً'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4 w-full">
                        <h4 className="font-bold text-gray-900 text-lg flex items-center gap-2 min-w-0 truncate">
                          {apt.type && apt.type.includes('أونلاين') && (
                            <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg border border-blue-100 animate-pulse text-xs" title="استشارة أونلاين">
                              <Globe className="w-3.5 h-3.5" />
                              <span className="hidden md:inline">أونلاين</span>
                            </span>
                          )}
                          <span className="truncate">{getPatientName(apt.patientId, apt.patientName)}</span>
                          {apt.patientId && apt.patientId.toString().startsWith('temp') && <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full flex-shrink-0">زائر</span>}
                        </h4>
                        {(apt.patientPhone || patients.find(p => p.id === apt.patientId)?.phone) && (
                          <a
                            href={`tel:${apt.patientPhone || patients.find(p => p.id === apt.patientId)?.phone}`}
                            className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-xl transition-all flex items-center justify-center flex-shrink-0"
                            title="اتصال سريع بالمريض"
                          >
                            <Phone className="w-5 h-5" />
                          </a>
                        )}
                      </div>
                      {/* اسم الطبيب المعالج */}
                      <div className="text-xs text-blue-600 font-semibold mt-0.5">
                        {apt.doctorName || doctors.find(d => d.id === apt.doctorId)?.name || 'طبيب غير محدد'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start md:items-center gap-3 w-full md:w-auto justify-end pl-2">
                    {/* 2x2 Grid for status matrix offsets */}
                    <div className="grid grid-cols-2 gap-1 text-center items-center">
                      {/* Top Right: Status */}
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getStatusColor(apt.status)} whitespace-nowrap`}>
                        {getStatusLabel(apt.status)}
                      </span>

                      {/* Top Left: Type */}
                      <span className="flex items-center justify-center gap-1 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100 text-xs text-gray-700 whitespace-nowrap">
                        {getTypeLabel(apt.type)}
                      </span>

                      {/* Bottom Right: Priority */}
                      {apt.priority && apt.priority !== 'normal' ? (
                        <span className={`flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-bold ${getPriorityColor(apt.priority)} whitespace-nowrap`}>
                          {getPriorityLabel(apt.priority)}
                        </span>
                      ) : (
                        <div className="invisible" />
                      )}

                      {/* Bottom Left: Duration */}
                      <span className="flex items-center justify-center gap-1 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100 text-xs text-gray-700 whitespace-nowrap">
                        <Clock className="w-3 h-3 text-gray-400" />
                        {apt.duration} د
                      </span>
                    </div>

                    <div className="h-12 w-px bg-gray-100 mx-2 hidden md:block"></div>

                    {/* Quick Actions */}
                    <div className="flex flex-col md:flex-row items-center gap-1">
                      <button
                        className="p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        title="إرسال تذكير بالموعد"
                        onClick={() => setSelectedAptForReminder(apt)}
                      >
                        <Bell className="w-5 h-5" />
                      </button>

                      {apt.patientUserId && (
                        <button
                          className="p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                          title="مراسلة المريض"
                          onClick={() => {
                            const patient = patients.find(p => p.id === apt.patientId);
                            setActiveChatPatient({
                              id: apt.patientId,
                              patient_user_id: apt.patientUserId,
                              name: patient ? patient.name : getPatientName(apt.patientId, apt.patientName),
                              phone: patient ? patient.phone : (apt.patientPhone || '')
                            });
                            setSectionTab('messages');
                            setActiveSubTab('chats');
                          }}
                        >
                          <MessageSquare className="w-5 h-5" />
                        </button>
                      )}
                      {patients.some(p => p.id === apt.patientId) && (
                          <button
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title="عرض الملف"
                            onClick={() => navigate(`/doctor/clinic/${clinicId}/patient/${apt.patientId}`)}
                          >
                            <FileText className="w-5 h-5" />
                          </button>
                      )}

                      <button
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"
                        title="تعديل الموعد"
                        onClick={() => handleEditClick(apt)}
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAppointment(apt.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="إلغاء الموعد">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
              <Calendar className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">لا يوجد مواعيد في هذا اليوم</h3>
              <p className="text-gray-500 mb-6">يمكنك إضافة موعد جديد أو استعراض الأيام الأخرى</p>
              <button
                onClick={() => { setEditingAppointment(null); setIsModalOpen(true); }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                إضافة موعد الآن
              </button>
            </div>
          )}
        </div>
      )}

      {/* Legacy Past View code remains same */}
      {sectionTab === 'past' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-gray-500" />
            سجل المواعيد الفائتة
            <span className="text-sm font-normal text-gray-500">({filteredAppointments.length})</span>
          </h3>
          {filteredAppointments.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredAppointments.map((apt) => (
                <div key={apt.id} className="bg-gray-50 hover:bg-white p-4 rounded-xl border border-gray-200/60 hover:border-gray-300 transition-all flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="flex flex-col items-center justify-center min-w-[60px] h-14 bg-white rounded-lg border border-gray-200 text-gray-600">
                      <span className="text-sm font-bold">{new Date(apt.date).getDate()}</span>
                      <span className="text-[10px]">{new Date(apt.date).toLocaleDateString('ar-IQ', { month: 'short' })}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800">{getPatientName(apt.patientId, apt.patientName)}</h4>
                      <div className="text-xs text-gray-500 flex gap-2 mt-1">
                        <span>{apt.time}</span>
                        <span>•</span>
                        <span>{apt.type}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusColor(apt.status)}`}>
                      {getStatusLabel(apt.status)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        className="p-1.5 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="إرسال تذكير بالموعد"
                        onClick={() => setSelectedAptForReminder(apt)}
                      >
                        <Bell className="w-4 h-4" />
                      </button>

                      {apt.patientUserId && (
                        <button
                          className="p-1.5 text-amber-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                          title="مراسلة المريض"
                          onClick={() => {
                            const patient = patients.find(p => p.id === apt.patientId);
                            setActiveChatPatient({
                              id: apt.patientId,
                              patient_user_id: apt.patientUserId,
                              name: patient ? patient.name : getPatientName(apt.patientId, apt.patientName),
                              phone: patient ? patient.phone : (apt.patientPhone || '')
                            });
                            setSectionTab('messages');
                            setActiveSubTab('chats');
                          }}
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      )}
                      {patients.some(p => p.id === apt.patientId) && (
                          <button
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="عرض الملف"
                            onClick={() => navigate(`/doctor/clinic/${clinicId}/patient/${apt.patientId}`)}
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                      )}
                      {(apt.patientPhone || patients.find(p => p.id === apt.patientId)?.phone) && (
                        <a
                          href={`tel:${apt.patientPhone || patients.find(p => p.id === apt.patientId)?.phone}`}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg flex items-center justify-center"
                          title="اتصال بالمريض"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              لا توجد مواعيد فائتة
            </div>
          )}
        </div>
      )}

      {/* Messages Tab View */}
      {sectionTab === 'messages' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm h-[600px] flex flex-col overflow-hidden relative">
              {/* Patient Chat Sidebar (Shown when NO patient is selected) */}
              {!activeChatPatient ? (
                <div className="flex-1 flex flex-col p-4 overflow-hidden animate-in fade-in duration-300">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5 text-gray-400" /> مراجعي العيادة
                  </h3>
                  {/* Search in Sidebar */}
                  <div className="relative mb-4">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="ابحث بالاسم أو الهاتف..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pr-9 pl-4 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    />
                  </div>

                  {/* Patient List — sorted by most recent message */}
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                    {[...patients]
                      .filter(p => searchTerm === '' || p.name.includes(searchTerm) || p.phone.includes(searchTerm))
                      .sort((a, b) => {
                        // Patients with recent messages come first
                        const tsA = patientLastMsg[a.id]?.ts || '';
                        const tsB = patientLastMsg[b.id]?.ts || '';
                        if (tsA && tsB) return tsB.localeCompare(tsA);
                        if (tsA) return -1;
                        if (tsB) return 1;
                        return 0;
                      })
                      .map(p => {
                        const isPortalActive = !!p.patient_user_id;
                        const isSelected = activeChatPatient?.id === p.id;
                        const msgInfo = patientLastMsg[p.id];
                        const hasUnread = isPortalActive && msgInfo && !readPatients.has(p.id) && !isSelected && msgInfo.unread > 0;

                        // Format relative time
                        const relTime = msgInfo?.ts ? (() => {
                          const diff = (Date.now() - new Date(msgInfo.ts).getTime()) / 1000;
                          if (diff < 60) return 'الآن';
                          if (diff < 3600) return `${Math.floor(diff/60)} د`;
                          if (diff < 86400) return `${Math.floor(diff/3600)} س`;
                          return new Date(msgInfo.ts).toLocaleDateString('ar-IQ', { month: 'short', day: 'numeric' });
                        })() : null;

                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              if (isPortalActive) {
                                setActiveChatPatient({
                                  id: p.id,
                                  patient_user_id: p.patient_user_id,
                                  name: p.name,
                                  phone: p.phone
                                });
                                // Mark as read
                                setReadPatients(prev => new Set([...prev, p.id]));
                              }
                            }}
                            className={`p-3 rounded-xl border transition-all flex items-center gap-3 ${
                              isPortalActive ? 'cursor-pointer' : 'opacity-60 cursor-default'
                            } ${
                              isSelected
                                ? 'bg-blue-50/80 border-blue-200 shadow-sm'
                                : hasUnread
                                  ? 'bg-gradient-to-r from-blue-50/60 to-indigo-50/40 border-blue-200/70 hover:border-blue-300'
                                  : 'bg-white hover:bg-gray-50/80 border-gray-100'
                            }`}
                          >
                            {/* Avatar with unread pulse */}
                            <div className="relative flex-shrink-0">
                              <div className={`w-11 h-11 rounded-xl text-white flex items-center justify-center font-bold text-sm shadow-sm ${
                                isSelected
                                  ? 'bg-gradient-to-br from-blue-600 to-indigo-700'
                                  : isPortalActive
                                    ? 'bg-gradient-to-br from-blue-500 to-indigo-500'
                                    : 'bg-gradient-to-br from-gray-400 to-gray-500'
                              }`}>
                                {p.name.charAt(0)}
                              </div>
                              {/* Unread badge */}
                              {hasUnread && (
                                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow-sm border-2 border-white animate-pulse">
                                  {msgInfo.unread > 9 ? '9+' : msgInfo.unread}
                                </span>
                              )}
                            </div>

                            {/* Info */}
                            <div className="min-w-0 flex-1 text-right">
                              <div className="flex items-center justify-between gap-1">
                                <h4 className={`font-bold text-sm truncate flex items-center gap-1 ${
                                  hasUnread ? 'text-gray-900' : 'text-gray-800'
                                }`}>
                                  {p.name}
                                  {isPortalActive && (
                                    <Globe className="w-3 h-3 text-emerald-500 shrink-0" />
                                  )}
                                </h4>
                                {relTime && (
                                  <span className={`text-[10px] shrink-0 font-bold ${
                                    hasUnread ? 'text-blue-600' : 'text-gray-400'
                                  }`}>{relTime}</span>
                                )}
                              </div>
                              {msgInfo ? (
                                <p className={`text-xs truncate mt-0.5 ${
                                  hasUnread ? 'text-gray-700 font-bold' : 'text-gray-400 font-medium'
                                }`}>
                                  {msgInfo.content || '...'}
                                </p>
                              ) : (
                                <p className="text-xs text-gray-400 truncate mt-0.5" dir="ltr">{p.phone}</p>
                              )}
                            </div>

                            {/* Activate button for non-portal patients */}
                            {!isPortalActive && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPatientForActivation({
                                    id: p.id,
                                    name: p.name,
                                    phone: p.phone,
                                    patient_user_id: p.patient_user_id
                                  });
                                }}
                                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[11px] font-black transition-all border border-amber-100 flex-shrink-0 shadow-sm"
                              >
                                تنشيط البوابة
                              </button>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : (
                /* Chat Viewport (Shown when a patient IS selected) */
                <div className="flex-1 flex flex-col h-full overflow-hidden relative animate-in slide-in-from-left duration-300">
                  {/* Chat Header */}
                  <div className="px-4 py-3 border-b bg-white flex items-center justify-between shadow-sm shrink-0">
                    <div className="flex items-center gap-3">
                      {/* Back Button */}
                      <button
                        onClick={() => setActiveChatPatient(null)}
                        className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-xl text-gray-500 transition-colors flex items-center justify-center border border-gray-200/60 bg-white shadow-sm"
                        title="رجوع للقائمة"
                      >
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                      </button>
                      <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-black text-sm shadow-md">
                          {activeChatPatient.name.charAt(0)}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                      </div>
                      <div className="text-right">
                        <h4 className="font-black text-gray-900 text-sm">{activeChatPatient.name}</h4>
                        <p className="text-[10px] text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse inline-block" />
                          متصل الآن
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/doctor/clinic/${clinicId}/patient/${activeChatPatient.id}`)}
                      className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 hover:from-blue-100 hover:to-indigo-100 border border-blue-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      الملف الطبي
                    </button>
                  </div>

                  {/* Messages Body */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3" dir="rtl" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f0f4ff 100%)' }}>
                    {chatMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full gap-5 py-10">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3xl flex items-center justify-center shadow-inner">
                          <MessageSquare className="w-10 h-10 text-indigo-400" />
                        </div>
                        <div className="text-center">
                          <p className="font-black text-gray-700">لا توجد رسائل بعد</p>
                          <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">ابدأ المحادثة مع <span className="font-bold text-gray-600">{activeChatPatient.name}</span><br/>باستخدام الأزرار أدناه أو اكتب رسالة مباشرةً</p>
                        </div>
                        <div className="grid grid-cols-1 gap-2 w-full max-w-[200px]">
                          {[
                            { icon: '🔔', text: 'أرسل تذكير بالموعد', color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
                            { icon: '🦷', text: 'أرسل الخطة العلاجية', color: 'text-teal-600 bg-teal-50 border-teal-100' },
                            { icon: '⭐', text: 'اطلب تقييم المراجع', color: 'text-amber-600 bg-amber-50 border-amber-100' },
                          ].map((s, i) => (
                            <div key={i} className={`flex items-center gap-2 rounded-xl px-3 py-2 border ${s.color} text-xs font-bold shadow-sm`}>
                              <span>{s.icon}</span> {s.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      chatMessages.map((msg) => {
                        const isMe     = msg.sender_id === user?.id;
                        const isAI     = msg.metadata?.is_ai === true && msg.metadata?.role === 'assistant';
                        const isReminder     = msg.type === 'reminder';
                        const isWidget = msg.type === 'widget';
                        const isConfirmation = msg.type === 'confirmation' || msg.content === 'لقد قمت بتأكيد حضوري للموعد المحدد عبر المنصة. شكراً لكم.';


                        if (isWidget) {
                          const wType = msg.metadata?.widget_type;

                          // ─── Premium Feedback Response Card ───
                          if (wType === 'feedback_response') {
                            const fRating = msg.metadata?.rating || 0;
                            const fComment = msg.metadata?.comment || '';
                            const fPatientName = msg.metadata?.patient_name || 'المراجع';
                            return (
                              <div key={msg.id} className="flex justify-end">
                                <div className="max-w-[88%] w-full bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border border-amber-200 rounded-3xl shadow-md overflow-hidden">
                                  {/* Card Header */}
                                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-white">
                                      <Star className="w-4 h-4 fill-white" />
                                      <span className="font-black text-sm">تقييم جديد من المراجع</span>
                                    </div>
                                    <span className="text-[10px] text-amber-100 font-bold">
                                      {new Date(msg.created_at).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  {/* Card Body */}
                                  <div className="p-4 space-y-3" dir="rtl">
                                    {/* Patient name */}
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-black text-xs shadow-sm">
                                        {fPatientName.charAt(0)}
                                      </div>
                                      <span className="font-black text-gray-800 text-sm">{fPatientName}</span>
                                    </div>
                                    {/* Stars */}
                                    <div className="flex items-center gap-1">
                                      {[1,2,3,4,5].map(s => (
                                        <Star key={s} className={`w-6 h-6 transition-all ${s <= fRating ? 'fill-amber-400 text-amber-500' : 'text-gray-200 fill-gray-100'}`} />
                                      ))}
                                      <span className="mr-1 text-sm font-black text-gray-700">{fRating}<span className="text-gray-400 font-bold">/5</span></span>
                                    </div>
                                    {/* Comment */}
                                    {fComment && (
                                      <div className="bg-white/80 rounded-2xl p-3 border border-amber-100 text-xs text-gray-700 font-bold leading-relaxed italic">
                                        "{fComment}"
                                      </div>
                                    )}
                                    {/* Rating label */}
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black ${
                                      fRating >= 5 ? 'bg-emerald-100 text-emerald-700' :
                                      fRating >= 4 ? 'bg-blue-100 text-blue-700' :
                                      fRating >= 3 ? 'bg-amber-100 text-amber-700' :
                                      'bg-red-100 text-red-700'
                                    }`}>
                                      <span>{fRating >= 5 ? '🌟 ممتاز' : fRating >= 4 ? '👍 جيد جداً' : fRating >= 3 ? '👌 جيد' : '⚠️ يحتاج تحسين'}</span>
                                      <span>— تم الحفظ في سجل التقييمات</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          // ─── Generic Widget Badge ───
                          const wConfig: Record<string, { icon: string; label: string; color: string; bg: string; border: string }> = {
                            booking: { icon: '📅', label: 'بطاقة حجز موعد جديد', color: 'text-indigo-700', bg: 'from-indigo-50 to-blue-50', border: 'border-indigo-100' },
                            appointments: { icon: '⏰', label: 'بطاقة استعراض المواعيد', color: 'text-purple-700', bg: 'from-purple-50 to-violet-50', border: 'border-purple-100' },
                            treatments: { icon: '🦷', label: 'بطاقة الخطة العلاجية', color: 'text-teal-700', bg: 'from-teal-50 to-cyan-50', border: 'border-teal-100' },
                            info: { icon: 'ℹ️', label: 'بطاقة معلومات العيادة', color: 'text-emerald-700', bg: 'from-emerald-50 to-green-50', border: 'border-emerald-100' },
                            feedback: { icon: '⭐', label: 'بطاقة طلب التقييم — تم الإرسال للمراجع', color: 'text-amber-700', bg: 'from-amber-50 to-orange-50', border: 'border-amber-100' },
                          };
                          const conf = wConfig[wType] || { icon: '📌', label: 'بطاقة تفاعلية', color: 'text-gray-700', bg: 'from-gray-50 to-gray-50', border: 'border-gray-100' };
                          return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
                              <div className={`max-w-[82%] bg-gradient-to-br ${conf.bg} border ${conf.border} rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3`}>
                                <span className="text-xl shrink-0">{conf.icon}</span>
                                <div>
                                  <p className={`font-black text-xs ${conf.color}`}>{conf.label}</p>
                                  <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                                    {isMe ? 'أرسلتها للمراجع' : 'أرسلها المراجع'}
                                    {' · '}
                                    {new Date(msg.created_at).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        if (isReminder) {
                          return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
                              <div className="max-w-[85%] bg-gradient-to-br from-blue-50/90 to-indigo-50/90 border border-blue-100 rounded-2xl p-4 shadow-sm">
                                <div className="flex items-center gap-2 text-blue-700 font-bold mb-2 text-xs">
                                  <Bell className="w-3.5 h-3.5 animate-bounce" />
                                  <span>تذكير بموعد — تم الإرسال</span>
                                </div>
                                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed mb-3 font-medium">{msg.content}</p>
                                {msg.metadata && (
                                  <div className="bg-white/80 rounded-xl p-2.5 border border-blue-50/50 text-xs grid grid-cols-2 gap-2 text-gray-600 font-bold">
                                    <div>🗓️ {msg.metadata.date}</div>
                                    <div>⏰ {msg.metadata.time}</div>
                                    <div className="col-span-2">🦷 {getTypeLabel(msg.metadata.type)}</div>
                                  </div>
                                )}
                                <div className="text-[10px] text-gray-400 mt-2 text-left">
                                  {new Date(msg.created_at).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                          );
                        }

                        if (isConfirmation) {
                          return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
                              <div className="max-w-[85%] bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-4 shadow-sm">
                                <div className="flex items-center gap-2 text-emerald-700 font-bold mb-2 text-xs">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>تأكيد حضور المراجع</span>
                                </div>
                                <p className="text-sm text-gray-700 font-bold leading-relaxed mb-3">
                                  أكد المراجع حضوره للموعد المجدول عبر المنصة.
                                </p>
                                {msg.metadata && (msg.metadata.date || msg.metadata.time) && (
                                  <div className="bg-white/80 rounded-xl p-2.5 border border-emerald-50 text-xs flex gap-4 text-gray-600 font-bold">
                                    {msg.metadata.date && <span>🗓️ {msg.metadata.date}</span>}
                                    {msg.metadata.time && <span>⏰ {msg.metadata.time}</span>}
                                  </div>
                                )}
                                <div className="text-[10px] text-gray-400 mt-2 text-left">
                                  {new Date(msg.created_at).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                          );
                        }

                        // ─── Detect old-format feedback text messages & render as premium card ───
                        const isFeedbackText = !isMe && (
                          msg.content?.includes('لقد قام المراجع بتقييم') ||
                          msg.content?.includes('تقييم المراجع:') ||
                          msg.metadata?.widget_type === 'feedback_response'
                        );

                        if (isFeedbackText) {
                          // Extract rating from content if metadata missing
                          const fRating = msg.metadata?.rating || (() => {
                            const match = msg.content?.match(/(\d)\s*من\s*5/);
                            return match ? parseInt(match[1]) : 0;
                          })();
                          const fComment = msg.metadata?.comment || (() => {
                            const match = msg.content?.match(/ملاحظات المراجع:\s*(.+)/s);
                            const raw = match ? match[1].trim() : '';
                            return raw === 'لا توجد تعليقات إضافية.' ? '' : raw;
                          })();
                          const fPatientName = msg.metadata?.patient_name || activeChatPatient?.name || 'المراجع';

                          return (
                            <div key={msg.id} className="flex justify-end">
                              <div className="max-w-[90%] w-full bg-gradient-to-br from-amber-50 via-orange-50/80 to-yellow-50 border border-amber-200/80 rounded-3xl shadow-lg shadow-amber-100/50 overflow-hidden animate-in fade-in duration-300">
                                {/* ── Header ── */}
                                <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-5 py-3.5 flex items-center justify-between">
                                  <div className="flex items-center gap-2.5 text-white">
                                    <div className="w-7 h-7 bg-white/20 rounded-xl flex items-center justify-center">
                                      <Star className="w-4 h-4 fill-white text-white" />
                                    </div>
                                    <div>
                                      <p className="font-black text-sm leading-none">تقييم جديد من المراجع</p>
                                      <p className="text-[10px] text-amber-100 mt-0.5 font-bold">وصل للتو — محفوظ في سجل التقييمات</p>
                                    </div>
                                  </div>
                                  <span className="text-[10px] text-amber-200 font-bold bg-white/10 px-2 py-1 rounded-lg">
                                    {new Date(msg.created_at).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>

                                {/* ── Body ── */}
                                <div className="p-4 space-y-3.5" dir="rtl">
                                  {/* Patient name row */}
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-black text-sm shadow-md shadow-amber-200/60">
                                      {fPatientName.charAt(0)}
                                    </div>
                                    <div>
                                      <p className="font-black text-gray-900 text-sm">{fPatientName}</p>
                                      <p className="text-[10px] text-gray-400 font-bold">أرسل تقييمه للعيادة</p>
                                    </div>
                                  </div>

                                  {/* Stars row */}
                                  <div className="bg-white/70 rounded-2xl px-4 py-3 border border-amber-100 flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                      {[1, 2, 3, 4, 5].map(s => (
                                        <Star
                                          key={s}
                                          className={`w-7 h-7 drop-shadow-sm transition-all ${
                                            s <= fRating
                                              ? 'fill-amber-400 text-amber-500 scale-110'
                                              : 'fill-gray-100 text-gray-200'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                    <div className="text-right">
                                      <p className="font-black text-2xl text-gray-900 leading-none">{fRating}<span className="text-gray-300 text-base font-bold">/5</span></p>
                                      <p className="text-[10px] text-gray-400 font-bold">
                                        {fRating === 5 ? 'ممتاز' : fRating === 4 ? 'جيد جداً' : fRating === 3 ? 'جيد' : fRating === 2 ? 'مقبول' : 'ضعيف'}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Comment */}
                                  {fComment && (
                                    <div className="bg-white/80 rounded-2xl px-4 py-3 border border-amber-100/80 relative">
                                      <div className="absolute -top-2 right-4 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                                        <span className="text-white text-[8px] font-black">"</span>
                                      </div>
                                      <p className="text-sm text-gray-700 font-bold leading-relaxed italic pt-1">
                                        {fComment}
                                      </p>
                                    </div>
                                  )}

                                  {/* Rating badge */}
                                  <div className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-black border ${
                                    fRating >= 5 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    fRating >= 4 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    fRating >= 3 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    'bg-red-50 text-red-700 border-red-200'
                                  }`}>
                                    <span>{fRating >= 5 ? '🌟' : fRating >= 4 ? '👍' : fRating >= 3 ? '👌' : '⚠️'}</span>
                                    <span>{fRating >= 5 ? 'تقييم ممتاز — استمر بهذا المستوى!' : fRating >= 4 ? 'تقييم جيد جداً — أداء رائع!' : fRating >= 3 ? 'تقييم جيد — هناك مجال للتحسين' : 'تقييم منخفض — يحتاج مراجعة'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
                            <div
                              className={`max-w-[72%] px-4 py-3 rounded-2xl text-sm shadow-sm ${
                                isMe
                                  ? 'bg-white border border-gray-100 text-gray-800 rounded-br-sm'
                                  : 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-bl-sm shadow-blue-200/50'
                              }`}
                            >
                              <p className="whitespace-pre-wrap leading-relaxed font-medium">{msg.content}</p>
                              <div className={`text-[9px] mt-1.5 text-left ${isMe ? 'text-gray-400' : 'text-blue-200'}`}>
                                {new Date(msg.created_at).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Premium Chat Input Area */}
                  <div className="border-t bg-white shrink-0">
                    {/* Premium Quick Actions Bar */}
                    <div className="px-3 pt-2.5 pb-1.5">
                      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-hide" dir="rtl">
                        {/* 1. Appointment Reminder */}
                        <button
                          onClick={() => {
                            const latestApt = appointments
                              .filter(apt => apt.patientId === activeChatPatient.id)
                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                            if (latestApt) {
                              setSelectedAptForReminder(latestApt);
                            } else {
                              toast.error("لا يوجد مواعيد مسجلة لهذا المريض لتذكيره بها");
                            }
                          }}
                          className="group relative overflow-hidden bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-2xl px-3.5 py-2 text-[11px] font-black transition-all flex items-center gap-1.5 active:scale-95 shadow-md shadow-indigo-200/60 hover:shadow-indigo-300/60 hover:scale-[1.03] shrink-0"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                          <Bell className="w-3.5 h-3.5 shrink-0" />
                          <span>تذكير بالموعد</span>
                        </button>

                        {/* 2. Ask Patient Feedback */}
                        <button
                          onClick={async () => {
                            if (sendingMsg || !activeChatPatient?.patient_user_id || !user?.id) return;
                            try {
                              const { error } = await supabase
                                .from('direct_messages')
                                .insert({
                                  sender_id: user.id,
                                  recipient_id: activeChatPatient.patient_user_id,
                                  content: '📊 أخذ رأي المراجع: يرجى تقييم زيارتكم للعيادة وتجربتكم معنا.',
                                  type: 'widget',
                                  metadata: { widget_type: 'feedback', role: 'assistant' }
                                });
                              if (error) throw error;
                              toast.success('تم إرسال بطاقة طلب التقييم للمريض بنجاح');
                              fetchChatMessages(activeChatPatient.patient_user_id);
                            } catch (err: any) {
                              console.error(err);
                              toast.error('فشل إرسال التقييم: ' + err.message);
                            }
                          }}
                          className="group relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-2xl px-3.5 py-2 text-[11px] font-black transition-all flex items-center gap-1.5 active:scale-95 shadow-md shadow-amber-200/60 hover:shadow-amber-300/60 hover:scale-[1.03] shrink-0"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                          <Star className="w-3.5 h-3.5 shrink-0" />
                          <span>أخذ رأي المراجع</span>
                        </button>

                        {/* 3. Send Treatment Plan */}
                        <button
                          onClick={async () => {
                            if (sendingMsg || !activeChatPatient?.patient_user_id || !user?.id) return;
                            try {
                              const { error } = await supabase
                                .from('direct_messages')
                                .insert({
                                  sender_id: user.id,
                                  recipient_id: activeChatPatient.patient_user_id,
                                  content: '🦷 بطاقة الخطة العلاجية: استعراض حالة الأسنان وجلسات العلاج المجدولة.',
                                  type: 'widget',
                                  metadata: { widget_type: 'treatments', role: 'assistant' }
                                });
                              if (error) throw error;
                              toast.success('تم إرسال بطاقة الخطة العلاجية للمريض بنجاح');
                              fetchChatMessages(activeChatPatient.patient_user_id);
                            } catch (err: any) {
                              console.error(err);
                              toast.error('فشل إرسال الخطة العلاجية: ' + err.message);
                            }
                          }}
                          className="group relative overflow-hidden bg-gradient-to-br from-teal-500 to-emerald-600 text-white rounded-2xl px-3.5 py-2 text-[11px] font-black transition-all flex items-center gap-1.5 active:scale-95 shadow-md shadow-teal-200/60 hover:shadow-teal-300/60 hover:scale-[1.03] shrink-0"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                          <Activity className="w-3.5 h-3.5 shrink-0" />
                          <span>الخطة العلاجية</span>
                        </button>
                      </div>
                    </div>

                    {/* Text Input Row */}
                    <div className="px-3 pb-3 pt-1">
                      <div className="flex items-end gap-2 bg-gray-50/80 rounded-2xl border border-gray-200/80 focus-within:border-blue-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100/60 transition-all p-1.5">
                        <textarea
                          value={newMessageText}
                          onChange={(e) => setNewMessageText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          placeholder="اكتب رسالتك للمراجع..."
                          rows={1}
                          className="flex-1 bg-transparent border-none outline-none resize-none text-sm px-2 py-1.5 font-medium placeholder:text-gray-400 max-h-24 leading-relaxed"
                          dir="rtl"
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={sendingMsg || !newMessageText.trim()}
                          className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl shadow-md shadow-blue-200/50 transition-all active:scale-95 disabled:opacity-40 disabled:shadow-none flex items-center justify-center shrink-0"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
        </div>
      )}

      {/* Online Requests Logic (Only visible in Upcoming) */}
      {sectionTab === 'upcoming' && (
        <div className="mt-8 border-t pt-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            طلبات الحجز الإلكتروني
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{onlineRequests.length}</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {onlineRequests.map(req => (
              <div key={req.id} className="bg-white p-5 rounded-xl border border-orange-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-gray-900 flex items-center gap-1.5 flex-wrap">
                      <span className="truncate max-w-[120px] sm:max-w-[160px]">{req.patientName}</span>
                      {req.hasFile ? (
                        <span title="مريض مسجل مسبقاً في العيادة" className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-100 font-bold shrink-0">
                          <CheckCircle className="w-2.5 h-2.5" /> مريض العيادة
                        </span>
                      ) : req.patientUserId ? (
                        <span title="لديه حساب في المنصة" className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 border border-blue-100 shrink-0">
                          <Globe className="w-2.5 h-2.5" /> المنصة
                        </span>
                      ) : null}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 flex-wrap">
                      <MapPin className="w-3 h-3" /> عبر {req.source === 'map' ? 'الخريطة' : 'التطبيق'}
                      {req.hasFile && (
                        <>
                          <span className="text-gray-300 mx-0.5">•</span>
                          <span className="text-emerald-600 font-bold text-[10px] bg-emerald-50 px-1.5 rounded">{req.type === 'followup' ? 'طلب متابعة' : 'طلب موعد'}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900 text-sm">
                      {(() => {
                        const [h, m] = req.time.split(':');
                        let hours = parseInt(h, 10);
                        const ampm = hours >= 12 ? 'مساءً' : 'صباحاً';
                        hours = hours % 12;
                        hours = hours ? hours : 12;
                        return `${hours.toString().padStart(2, '0')}:${m} ${ampm}`;
                      })()}
                    </p>
                    <p className="text-xs text-gray-500">{req.date}</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => {
                      if (!req.hasFile) {
                        // If no file, require creation first
                        alert('يجب إنشاء ملف للمريض أولاً قبل تأكيد الحجز.');
                        handleCreatePatientFile(req);
                      } else {
                        handleConfirmRequest(req);
                      }
                    }}
                    className={`flex-1 text-white py-2 rounded-lg text-sm font-medium transition-colors ${!req.hasFile ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                    disabled={!req.hasFile && false} // Just visual, we handle click to show alert
                  >
                    تأكيد الموعد
                  </button>

                  <button
                    onClick={() => handleCancelRequest(req.id)}
                    className="px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2 mt-2">
                  {!req.hasFile ? (
                    <button
                      onClick={() => handleCreatePatientFile(req)}
                      className="flex-1 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg flex items-center justify-center gap-1 font-bold"
                    >
                      <UserPlus className="w-3 h-3" /> إنشاء ملف للمريض
                    </button>
                  ) : (
                    <div className="flex-1 py-1.5 text-xs text-emerald-600 bg-emerald-50/50 rounded-lg flex items-center justify-center gap-1 font-bold cursor-default border border-emerald-100/50">
                      <CheckCircle className="w-3 h-3" /> ملف طبي متوفر
                    </div>
                  )}
                  <a
                    href={`tel:${req.phone}`}
                    className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors flex items-center justify-center"
                    title="اتصال بالمريض"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
            {onlineRequests.length === 0 && (
              <div className="col-span-full text-center py-6 text-gray-400 bg-gray-50 rounded-xl border border-dashed">
                لا توجد طلبات جديدة
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unified Appointment Modal */}
      <AppointmentModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingAppointment(null); }}
        onSave={handleSaveAppointment}
        editingAppointment={editingAppointment}
        preSelectedDate={selectedDate.toISOString().split('T')[0]}
        doctors={doctors.map(d => ({
          id: d.id,
          name: d.name,
          specialty: 'عام',
          schedule: {},
          isActive: true
        }))}
        patients={patients.map(p => ({
          id: p.id,
          fullName: p.name,
          firstName: p.name.split(' ')[0],
          lastName: p.name.split(' ').slice(1).join(' '),
          phone: p.phone,
          gender: p.gender,
          totalVisits: p.totalVisits,
          lastVisit: p.lastVisit,
          status: p.status
        }) as any)} // Map hook data to Component Prop Type
        clinicId={clinicId}
      />

      {/* Create Patient File Modal */}
      {
        selectedRequestForFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
              <div className="px-6 py-4 border-b flex justify-between items-center bg-blue-50">
                <h3 className="font-bold text-lg text-blue-800">إنشاء ملف مريض جديد</h3>
                <button onClick={() => setSelectedRequestForFile(null)} className="text-gray-400 hover:text-red-500">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (isSavingPatient) return;
                setIsSavingPatient(true);

                const formData = new FormData(e.currentTarget);
                const newName = formData.get('name') as string;
                const newPhone = formData.get('phone') as string;

                try {
                  // 1. Create Patient
                  let newPatient;
                  try {
                    newPatient = await createPatient({
                      name: newName,
                      phone: newPhone,
                      gender: formData.get('gender') as 'male' | 'female',
                      age: parseInt(formData.get('age') as string) || 30,
                      status: 'active',
                      paymentStatus: 'pending',
                      address: formData.get('address') as string,
                      notes: `تم إنشاء الملف من حجز إلكتروني - ${formData.get('notes')}`
                    });
                  } catch (err: any) {
                    if (err.message === 'patient_exists') {
                      // Patient already exists, link to the existing one!
                      if (confirm(`المريض "${newName}" موجود بالفعل في العيادة. هل تريد ربط هذا الحجز بملفه الحالي؟`)) {
                        newPatient = { id: err.patientId };
                      } else {
                        setIsSavingPatient(false);
                        return;
                      }
                    } else {
                      throw err;
                    }
                  }

                  // 2. Link Appointment to New Patient (if request exists)
                  if (newPatient && selectedRequestForFile.id) {
                    const success = await linkPatientToRequest(
                      selectedRequestForFile.id,
                      newPatient.id
                    );
                    if (!success) console.error('Error linking appointment locally');
                  }

                  toast.success("تم إنشاء الملف وربطه بالحجز بنجاح");
                  setSelectedRequestForFile(null);
                  refreshRequests();
                } catch (error) {
                  console.error(error);
                  alert("حدث خطأ أثناء إنشاء الملف");
                } finally {
                  setIsSavingPatient(false);
                }
              }} className="p-6 space-y-4">

                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4 text-sm text-blue-700">
                  يتم إنشاء الملف بناءً على طلب الحجز من: <span className="font-bold">{selectedRequestForFile.patientName}</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم المريض</label>
                  <input name="name" defaultValue={selectedRequestForFile.patientName} required className="w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                    <input
                      name="phone"
                      defaultValue={selectedRequestForFile.phone || ''}
                      required
                      className="w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">العمر</label>
                    <input name="age" type="number" defaultValue="30" className="w-full border rounded-lg p-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الجنس</label>
                  <select name="gender" className="w-full border rounded-lg p-2.5">
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                  <input name="address" placeholder="المنطقة / المدينة" className="w-full border rounded-lg p-2.5" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات طبية (من الحجز)</label>
                  <textarea
                    name="notes"
                    rows={3}
                    className="w-full border rounded-lg p-2.5"
                    placeholder="أي ملاحظات إضافية..."
                    defaultValue={selectedRequestForFile.notes ? `ملاحظات الحجز: ${selectedRequestForFile.notes}` : `سبب الزيارة: كشف عام (أونلاين)`}
                  ></textarea>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t">
                  <button
                    type="button"
                    onClick={() => setSelectedRequestForFile(null)}
                    className="px-5 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPatient}
                    className={`px-6 py-2 text-white rounded-lg font-medium shadow-sm flex items-center gap-2 transition-all ${isSavingPatient ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    {isSavingPatient ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        جاري الحفظ...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        إنشاء الملف وحفظ
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Appointment Reminder Slide-over Drawer */}
      {selectedAptForReminder && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          {/* Backdrop Click */}
          <div className="absolute inset-0" onClick={() => setSelectedAptForReminder(null)} />
          
          {/* Drawer Body */}
          <div className="relative w-full max-w-lg bg-white/95 backdrop-blur-md h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left lg:slide-in-from-right duration-300 border-r border-gray-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-150 flex items-center justify-between bg-blue-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md">
                  <Bell className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">إرسال تذكير بالموعد</h3>
                  <p className="text-xs text-gray-500">
                    للمريض: {getPatientName(selectedAptForReminder.patientId, selectedAptForReminder.patientName)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAptForReminder(null)}
                className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Patient Verification Status */}
              {(() => {
                const patientObj = patients.find(p => p.id === selectedAptForReminder.patientId);
                const isPlatformUser = !!(patientObj?.patient_user_id || selectedAptForReminder.patientUserId);
                return (
                  <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                    isPlatformUser 
                      ? 'bg-emerald-50/70 border-emerald-100 text-emerald-800' 
                      : 'bg-amber-50/70 border-amber-100 text-amber-800'
                  }`}>
                    <Globe className={`w-5 h-5 mt-0.5 ${isPlatformUser ? 'text-emerald-600' : 'text-amber-600'}`} />
                    <div>
                      <h4 className="font-bold text-sm">
                        {isPlatformUser ? 'المراجع مسجل بالمنصة ونشط' : 'حساب المنصة غير نشط لهذا المراجع'}
                      </h4>
                      <p className="text-xs mt-1 leading-relaxed opacity-90">
                        {isPlatformUser 
                          ? 'يمكنك إرسال التذكير مباشرة إلى صندوق الوارد الخاص به في تطبيق المريض كبطاقة تفاعلية.' 
                          : 'يمكنك تنشيط البوابة له من قسم المحادثات، أو إرسال التذكير عبر قنوات الواتساب/SMS.'}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Reminder Channel Selector */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">اختر قناة الإرسال</label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Platform Inbox (if registered) */}
                  {platformMsgConfig?.allow_platform_messages !== false && (() => {
                    const patientObj = patients.find(p => p.id === selectedAptForReminder.patientId);
                    const isPlatformUser = !!(patientObj?.patient_user_id || selectedAptForReminder.patientUserId);
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          if (isPlatformUser) {
                            setReminderMethod('platform');
                            const pName = patientObj?.name || 'مراجع';
                            const dateStr = selectedAptForReminder.date;
                            const timeStr = (() => {
                              const [h, m] = selectedAptForReminder.time.split(':');
                              let hours = parseInt(h, 10);
                              const ampm = hours >= 12 ? 'مساءً' : 'صباحاً';
                              hours = hours % 12;
                              hours = hours ? hours : 12;
                              return `${hours.toString().padStart(2, '0')}:${m} ${ampm}`;
                            })();
                            const typeStr = getTypeLabel(selectedAptForReminder.type);
                            setReminderMessage(
                              `مرحباً ${pName}، نود تذكيرك بموعدك القادم في عيادتنا:\n` +
                              `🗓️ التاريخ: ${dateStr}\n` +
                              `⏰ الوقت: ${timeStr}\n` +
                              `🦷 نوع الزيارة: ${typeStr}\n\n` +
                              `يسعدنا حضورك في الموعد المحدد. في حال رغبتك بالتأجيل أو الإلغاء يرجى إعلامنا مسبقاً.`
                            );
                          }
                        }}
                        className={`p-3.5 rounded-xl border-2 text-right transition-all flex flex-col justify-between h-24 ${
                          !isPlatformUser ? 'opacity-40 cursor-not-allowed border-gray-105 bg-gray-50' :
                          reminderMethod === 'platform' 
                            ? 'border-blue-600 bg-blue-50/40 text-blue-900 shadow-sm' 
                            : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                        }`}
                      >
                        <Globe className={`w-5 h-5 ${reminderMethod === 'platform' ? 'text-blue-600' : 'text-gray-400'}`} />
                        <div>
                          <span className="block font-bold text-xs">صندوق وارد المنصة</span>
                          <span className="text-[10px] opacity-75">إرسال كبطاقة تفاعلية</span>
                        </div>
                      </button>
                    );
                  })()}

                  {/* Free WhatsApp Web */}
                  {platformMsgConfig?.allow_whatsapp_web !== false && (
                    <button
                      type="button"
                      onClick={() => {
                        setReminderMethod('whatsapp_web');
                        const pName = patients.find(p => p.id === selectedAptForReminder.patientId)?.name || 'مراجع';
                        const dateStr = selectedAptForReminder.date;
                        const timeStr = (() => {
                          const [h, m] = selectedAptForReminder.time.split(':');
                          let hours = parseInt(h, 10);
                          const ampm = hours >= 12 ? 'مساءً' : 'صباحاً';
                          hours = hours % 12;
                          hours = hours ? hours : 12;
                          return `${hours.toString().padStart(2, '0')}:${m} ${ampm}`;
                        })();
                        const typeStr = getTypeLabel(selectedAptForReminder.type);
                        setReminderMessage(
                          `مرحباً ${pName}، نود تذكيرك بموعدك القادم في عيادتنا:\n` +
                          `🗓️ التاريخ: ${dateStr}\n` +
                          `⏰ الوقت: ${timeStr}\n` +
                          `🦷 نوع الزيارة: ${typeStr}\n\n` +
                          `يسعدنا حضورك في الموعد المحدد. في حال رغبتك بالتأجيل أو الإلغاء يرجى إعلامنا مسبقاً.`
                        );
                      }}
                      className={`p-3.5 rounded-xl border-2 text-right transition-all flex flex-col justify-between h-24 ${
                        reminderMethod === 'whatsapp_web' 
                          ? 'border-green-600 bg-green-50/40 text-green-900 shadow-sm' 
                          : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                      }`}
                    >
                      <MessageSquare className={`w-5 h-5 ${reminderMethod === 'whatsapp_web' ? 'text-green-600' : 'text-gray-400'}`} />
                      <div>
                        <span className="block font-bold text-xs">واتساب مجاني (رقم العيادة)</span>
                        <span className="text-[10px] opacity-75">فتح نافذة WhatsApp Web</span>
                      </div>
                    </button>
                  )}

                  {/* Twilio SMS */}
                  {platformMsgConfig?.twilio_sms_enabled && (
                    <button
                      type="button"
                      onClick={() => {
                        setReminderMethod('twilio_sms');
                        const timeStr = (() => {
                          const [h, m] = selectedAptForReminder.time.split(':');
                          let hours = parseInt(h, 10);
                          const ampm = hours >= 12 ? 'م' : 'ص';
                          hours = hours % 12;
                          hours = hours ? hours : 12;
                          return `${hours}:${m} ${ampm}`;
                        })();
                        const dayStr = (() => {
                          if (!selectedAptForReminder?.date) return '';
                          const parts = selectedAptForReminder.date.split('-');
                          return parts.length === 3 ? parseInt(parts[2], 10).toString() : '';
                        })();
                        setReminderMessage(`تذكير: موعدك يوم ${dayStr} الساعة ${timeStr}`);
                      }}
                      className={`p-3.5 rounded-xl border-2 text-right transition-all flex flex-col justify-between h-24 ${
                        reminderMethod === 'twilio_sms' 
                          ? 'border-red-600 bg-red-50/40 text-red-900 shadow-sm' 
                          : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                      }`}
                    >
                      <Zap className={`w-5 h-5 ${reminderMethod === 'twilio_sms' ? 'text-red-600' : 'text-gray-400'}`} />
                      <div>
                        <span className="block font-bold text-xs">رسالة نصية SMS تلقائية</span>
                        <span className="text-[10px] opacity-75">إرسال تلقائي عبر Twilio</span>
                      </div>
                    </button>
                  )}

                  {/* WhatsApp Automatic API */}
                  {platformMsgConfig?.whatsapp_api_enabled && (
                    <button
                      type="button"
                      onClick={() => {
                        setReminderMethod('whatsapp_api');
                        const pName = patients.find(p => p.id === selectedAptForReminder.patientId)?.name || 'مراجع';
                        const dateStr = selectedAptForReminder.date;
                        const timeStr = (() => {
                          const [h, m] = selectedAptForReminder.time.split(':');
                          let hours = parseInt(h, 10);
                          const ampm = hours >= 12 ? 'مساءً' : 'صباحاً';
                          hours = hours % 12;
                          hours = hours ? hours : 12;
                          return `${hours.toString().padStart(2, '0')}:${m} ${ampm}`;
                        })();
                        const typeStr = getTypeLabel(selectedAptForReminder.type);
                        setReminderMessage(
                          `مرحباً ${pName}، نود تذكيرك بموعدك القادم في عيادتنا:\n` +
                          `🗓️ التاريخ: ${dateStr}\n` +
                          `⏰ الوقت: ${timeStr}\n` +
                          `🦷 نوع الزيارة: ${typeStr}\n\n` +
                          `يسعدنا حضورك في الموعد المحدد. في حال رغبتك بالتأجيل أو الإلغاء يرجى إعلامنا مسبقاً.`
                        );
                      }}
                      className={`p-3.5 rounded-xl border-2 text-right transition-all flex flex-col justify-between h-24 ${
                        reminderMethod === 'whatsapp_api' 
                          ? 'border-teal-600 bg-teal-50/40 text-teal-900 shadow-sm' 
                          : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                      }`}
                    >
                      <Phone className={`w-5 h-5 ${reminderMethod === 'whatsapp_api' ? 'text-teal-600' : 'text-gray-400'}`} />
                      <div>
                        <span className="block font-bold text-xs">واتساب تلقائي API</span>
                        <span className="text-[10px] opacity-75">إرسال بالخلفية ({platformMsgConfig.active_whatsapp_api_provider})</span>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* Message Template / Textarea */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <label className="block text-sm font-bold text-gray-700">نص رسالة التذكير</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const pName = patients.find(p => p.id === selectedAptForReminder.patientId)?.name || 'test';
                        const dateStr = selectedAptForReminder.date;
                        const timeStr = (() => {
                          const [h, m] = selectedAptForReminder.time.split(':');
                          let hours = parseInt(h, 10);
                          const ampm = hours >= 12 ? 'مساءً' : 'صباحاً';
                          hours = hours % 12;
                          hours = hours ? hours : 12;
                          return `${hours.toString().padStart(2, '0')}:${m} ${ampm}`;
                        })();
                        const typeStr = getTypeLabel(selectedAptForReminder.type);
                        setReminderMessage(
                          `مرحباً ${pName}، نود تذكيرك بموعدك القادم في عيادتنا:\n` +
                          `🗓️ التاريخ: ${dateStr}\n` +
                          `⏰ الوقت: ${timeStr}\n` +
                          `🦷 نوع الزيارة: ${typeStr}\n\n` +
                          `يسعدنا حضورك في الموعد المحدد. في حال رغبتك بالتأجيل أو الإلغاء يرجى إعلامنا مسبقاً.`
                        );
                      }}
                      className="px-2.5 py-1 text-[11px] font-black border border-gray-200 rounded-lg bg-white hover:bg-gray-50 text-gray-600 transition-all cursor-pointer"
                    >
                      📄 قالب تفصيلي طويل
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const timeStr = (() => {
                          const [h, m] = selectedAptForReminder.time.split(':');
                          let hours = parseInt(h, 10);
                          const ampm = hours >= 12 ? 'م' : 'ص';
                          hours = hours % 12;
                          hours = hours ? hours : 12;
                          return `${hours}:${m} ${ampm}`;
                        })();
                        const dayStr = (() => {
                          if (!selectedAptForReminder?.date) return '';
                          const parts = selectedAptForReminder.date.split('-');
                          return parts.length === 3 ? parseInt(parts[2], 10).toString() : '';
                        })();
                        setReminderMessage(`تذكير: موعدك يوم ${dayStr} الساعة ${timeStr}`);
                      }}
                      className="px-2.5 py-1 text-[11px] font-black border border-emerald-200 rounded-lg bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 transition-all cursor-pointer"
                    >
                      ⚡ قالب قصير (شريحة واحدة)
                    </button>
                  </div>
                </div>
                <textarea
                  value={reminderMessage}
                  onChange={(e) => setReminderMessage(e.target.value)}
                  rows={5}
                  className="w-full border border-gray-200 rounded-xl p-3.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none resize-none leading-relaxed font-bold text-gray-700"
                  placeholder="نص التذكير..."
                />
                
                {/* Dynamic character counter & segment limits */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mt-1 text-[11px] font-bold">
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <span>عدد الأحرف:</span>
                    <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-800">{reminderMessage.length}</span>
                  </div>
                  {(() => {
                    const isArabic = /[\u0600-\u06FF]/.test(reminderMessage);
                    const limit = isArabic ? 70 : 160;
                    const segments = Math.ceil(reminderMessage.length / limit) || 1;
                    const isSingleSegment = segments === 1;

                    if (isSingleSegment) {
                      return (
                        <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1 shrink-0 self-start sm:self-auto">
                          <span>شريحة واحدة (الحد الأقصى {limit} حرف للغة العربية) - مضمونة الوصول ✅</span>
                        </span>
                      );
                    } else {
                      return (
                        <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 flex items-center gap-1 shrink-0 self-start sm:self-auto animate-pulse">
                          <span>متعدد الشرائح ({segments} شرائح) - قد تفشل في حساب Twilio التجريبي المجاني ⚠️</span>
                        </span>
                      );
                    }
                  })()}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-150 bg-gray-50/50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedAptForReminder(null)}
                className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium text-sm transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSendReminder}
                disabled={sendingReminder || !reminderMessage.trim()}
                className={`px-6 py-2.5 text-white rounded-xl font-bold text-sm shadow-md flex items-center gap-2 transition-all ${
                  sendingReminder ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-98'
                }`}
              >
                {sendingReminder ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    إرسال التذكير الآن
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activate Portal Confirmation Modal */}
      {selectedPatientForActivation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-150 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600 animate-pulse" />
                <h3 className="font-bold text-lg text-blue-900">تنشيط بوابة المراجع الذكية</h3>
              </div>
              <button
                onClick={() => setSelectedPatientForActivation(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl text-white flex items-center justify-center text-lg font-bold shadow-md">
                  {selectedPatientForActivation.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{selectedPatientForActivation.name}</h4>
                  <p className="text-xs text-gray-500 font-mono mt-0.5" dir="ltr">{selectedPatientForActivation.phone}</p>
                </div>
              </div>

              <div className="transition-all duration-300">
                {checkingActivationPhone ? (
                  <div className="flex items-center justify-center py-4 gap-2 text-sm text-blue-600 bg-blue-50/50 rounded-2xl border border-blue-100">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>جاري التحقق من رقم الهاتف في المنصة...</span>
                  </div>
                ) : activationPhoneExists ? (
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-100 text-amber-800">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <h5 className="font-bold text-sm text-amber-900 mb-1">الحساب مسجل مسبقاً!</h5>
                      <p className="leading-relaxed opacity-95">رقم الهاتف مرتبط بالفعل بحساب بوابة نشط في منصة سمارت دنتال.</p>
                      <p className="leading-relaxed opacity-90 mt-1 font-bold text-amber-950">عند التنشيط، سيتم ربط هذا الملف الطبي بالحساب الحالي مباشرة دون تعديل كلمة المرور الخاصة بالمراجع.</p>
                    </div>
                  </div>
                ) : activationPhoneExists === false ? (
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-green-50 border border-green-100 text-green-800">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <h5 className="font-bold text-sm text-green-950 mb-1">حساب جديد جاهز للتنشيط!</h5>
                      <p className="leading-relaxed opacity-95">رقم الهاتف متاح لإنشاء حساب بوابة مراجع جديد بالكامل.</p>
                      <p className="leading-relaxed opacity-90 mt-1">سيتم توليد كلمة مرور مؤقتة وتنشيط البوابة وإرسال تفاصيل الدخول تلقائياً للمريض عبر الواتساب والرسائل النصية.</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-3xl flex justify-end gap-3">
              <button
                onClick={() => setSelectedPatientForActivation(null)}
                className="px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-200 bg-gray-100 rounded-xl transition-all"
                disabled={isActivatingPortal}
              >
                إلغاء
              </button>
              <button
                onClick={async () => {
                  if (!selectedPatientForActivation) return;
                  setIsActivatingPortal(true);
                  try {
                    if (activationPhoneExists) {
                      // Link directly
                      const { data: profileData, error: profileErr } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('phone', selectedPatientForActivation.phone.trim())
                        .maybeSingle();

                      if (profileErr) throw profileErr;
                      if (!profileData) throw new Error('فشل العثور على الحساب المطابق');

                      const { error: updateErr } = await supabase
                        .from('patients')
                        .update({ patient_user_id: profileData.id })
                        .eq('id', selectedPatientForActivation.id);

                      if (updateErr) throw updateErr;
                      toast.success('تم ربط ملف المريض بالحساب النشط بنجاح!');

                      // Update state locally
                      selectedPatientForActivation.patient_user_id = profileData.id;
                      setActiveChatPatient({
                        id: selectedPatientForActivation.id,
                        patient_user_id: profileData.id,
                        name: selectedPatientForActivation.name,
                        phone: selectedPatientForActivation.phone
                      });
                    } else {
                      // Call Edge Function
                      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('send-patient-credentials', {
                        body: {
                          phone: selectedPatientForActivation.phone,
                          name: selectedPatientForActivation.name,
                          clinicName: 'عيادة الأسنان'
                        }
                      });

                      if (edgeError) throw edgeError;

                      if (edgeData?.error === 'patient_exists') {
                        toast.warning('هذا المراجع لديه حساب بالفعل');
                      } else if (edgeData?.userId) {
                        const { error: updateError } = await supabase
                          .from('patients')
                          .update({ patient_user_id: edgeData.userId })
                          .eq('id', selectedPatientForActivation.id);

                        if (updateError) throw updateError;
                        toast.success('تم تنشيط البوابة وإرسال بيانات الدخول بنجاح!');

                        selectedPatientForActivation.patient_user_id = edgeData.userId;
                        setActiveChatPatient({
                          id: selectedPatientForActivation.id,
                          patient_user_id: edgeData.userId,
                          name: selectedPatientForActivation.name,
                          phone: selectedPatientForActivation.phone
                        });
                      }
                    }
                    setSelectedPatientForActivation(null);
                  } catch (err: any) {
                    console.error(err);
                    toast.error('تعذر إكمال التنشيط: ' + err.message);
                  } finally {
                    setIsActivatingPortal(false);
                  }
                }}
                disabled={isActivatingPortal || checkingActivationPhone}
                className={`px-6 py-2.5 font-bold text-white rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2 ${
                  activationPhoneExists
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                }`}
              >
                {isActivatingPortal ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>جاري التنشيط...</span>
                  </>
                ) : activationPhoneExists ? (
                  'ربط الملف الآن'
                ) : (
                  'تنشيط الحساب وإرسال البيانات'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legacy Edit Modal Removed - Replaced by Unified AppointmentModal */}

    </div>
  );
};