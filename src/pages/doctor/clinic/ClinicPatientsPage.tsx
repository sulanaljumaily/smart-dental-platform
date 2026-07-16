import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Users, Search, Plus, User, Phone, Mail, MapPin,
  Calendar, FileText, AlertCircle, CheckCircle,
  Clock, Heart, Trash2, X, Globe, Settings, Bell, XCircle, MessageSquare, Send
} from 'lucide-react';
import { formatDate } from '../../../lib/utils';
import { Card } from '../../../components/common/Card';
import { BentoStatCard } from '../../../components/dashboard/BentoStatCard';
import { useSubscriptionLimits } from '../../../hooks/useSubscriptionLimits';
import { usePatients } from '../../../hooks/usePatients';
import { supabase } from '../../../lib/supabase';

interface ClinicPatientsPageProps {
  clinicId: string;
}

export const ClinicPatientsPage: React.FC<ClinicPatientsPageProps> = ({ clinicId }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { checkLimit } = useSubscriptionLimits();

  // Supabase Integration
  const { patients, loading, createPatient, deletePatient, updatePatient } = usePatients(clinicId);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: '',
    phone: '',
    age: '',
    gender: 'male',
    email: '',
    address: '',
    notes: ''
  });
  const [createPortalAccount, setCreatePortalAccount] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  
  const [phoneCheckStatus, setPhoneCheckStatus] = useState<{
    checked: boolean;
    exists: boolean;
    profileName?: string;
    profileId?: string;
    checking: boolean;
  }>({ checked: false, exists: false, checking: false });

  // Phone Check Effect
  useEffect(() => {
    if (!createPortalAccount) {
      setPhoneCheckStatus({ checked: false, exists: false, checking: false });
      return;
    }

    const cleanPhone = newPatient.phone.trim();
    if (cleanPhone.length < 8) {
      setPhoneCheckStatus({ checked: false, exists: false, checking: false });
      return;
    }

    const timer = setTimeout(async () => {
      setPhoneCheckStatus(prev => ({ ...prev, checking: true }));
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name')
          .eq('phone', cleanPhone)
          .maybeSingle();

        if (data) {
          setPhoneCheckStatus({
            checked: true,
            exists: true,
            profileName: data.name,
            profileId: data.id,
            checking: false
          });
        } else {
          setPhoneCheckStatus({
            checked: true,
            exists: false,
            checking: false
          });
        }
      } catch (err) {
        console.error('Error checking phone registration:', err);
        setPhoneCheckStatus(prev => ({ ...prev, checking: false }));
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [newPatient.phone, createPortalAccount]);

  // ==========================================
  // Patient Settings & Reminders Modal States
  // ==========================================
  const [selectedPatientForSettings, setSelectedPatientForSettings] = useState<any | null>(null);
  const [isActivatingPortalForSettings, setIsActivatingPortalForSettings] = useState(false);
  const [patientSettingsPhoneExists, setPatientSettingsPhoneExists] = useState<boolean | null>(null);
  const [checkingSettingsPhone, setCheckingSettingsPhone] = useState(false);

  // Edit Patient Info States
  const [editPatientData, setEditPatientData] = useState<{
    name: string;
    phone: string;
    age: string;
    gender: 'male' | 'female';
    email: string;
    address: string;
    notes: string;
    status: 'active' | 'inactive' | 'emergency';
  } | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    if (selectedPatientForSettings) {
      setEditPatientData({
        name: selectedPatientForSettings.name || '',
        phone: selectedPatientForSettings.phone || '',
        age: selectedPatientForSettings.age?.toString() || '',
        gender: selectedPatientForSettings.gender || 'male',
        email: selectedPatientForSettings.email || '',
        address: selectedPatientForSettings.address || '',
        notes: selectedPatientForSettings.notes || '',
        status: selectedPatientForSettings.status || 'active'
      });
    } else {
      setEditPatientData(null);
    }
  }, [selectedPatientForSettings]);

  const handleUpdatePatientSettings = async () => {
    if (!selectedPatientForSettings || !editPatientData) return;
    if (!editPatientData.name || !editPatientData.phone) {
      toast.error('يرجى إدخال الاسم ورقم الهاتف');
      return;
    }

    setIsSavingSettings(true);
    try {
      await updatePatient(selectedPatientForSettings.id, {
        name: editPatientData.name,
        phone: editPatientData.phone,
        age: parseInt(editPatientData.age) || 0,
        gender: editPatientData.gender,
        email: editPatientData.email,
        address: editPatientData.address,
        notes: editPatientData.notes,
        status: editPatientData.status
      });
      toast.success('تم حفظ تعديلات بيانات المراجع بنجاح');
      setSelectedPatientForSettings(null);
    } catch (e: any) {
      console.error(e);
      toast.error('حدث خطأ أثناء حفظ التعديلات: ' + (e.message || ''));
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Appointment Reminder Drawer States
  const [selectedAptForReminder, setSelectedAptForReminder] = useState<any | null>(null);
  const [reminderMethod, setReminderMethod] = useState<'platform' | 'whatsapp_web' | 'twilio' | 'ultramsg' | 'greenapi'>('platform');
  const [reminderMessage, setReminderMessage] = useState('');
  const [sendingReminder, setSendingReminder] = useState(false);
  const [whatsappSettings, setWhatsappSettings] = useState<any>(null);
  const [platformMsgConfig, setPlatformMsgConfig] = useState<any>(null);
  const [patientAppointments, setPatientAppointments] = useState<any[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  // Load WhatsApp settings
  const fetchWhatsappSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_settings')
        .select('*')
        .eq('clinic_id', parseInt(clinicId))
        .maybeSingle();

      if (data) {
        setWhatsappSettings(data);
      } else {
        setWhatsappSettings({
          clinic_id: parseInt(clinicId),
          provider: 'whatsapp_web',
          phone_number: '',
          api_key: '',
          api_url: '',
          is_active: true
        });
      }
    } catch (e) {
      console.error('Error fetching settings:', e);
    }
  };

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

  useEffect(() => {
    fetchWhatsappSettings();
    const fetchPlatformMessagingConfig = async () => {
      try {
        const { data } = await supabase
          .from('platform_settings')
          .select('value')
          .eq('key', 'messaging')
          .maybeSingle();
        if (data?.value) setPlatformMsgConfig(data.value);
        else setPlatformMsgConfig({ default_country_code: '964' });
      } catch (e) { console.error('Error loading platform messaging config:', e); }
    };
    fetchPlatformMessagingConfig();
  }, [clinicId]);

  // Effect to verify phone registration inside patient settings modal
  useEffect(() => {
    if (!selectedPatientForSettings) {
      setPatientSettingsPhoneExists(null);
      setPatientAppointments([]);
      return;
    }

    const checkPhoneAndFetchAppointments = async () => {
      setCheckingSettingsPhone(true);
      setLoadingAppointments(true);
      try {
        // 1. Check if phone is registered in profiles
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('phone', selectedPatientForSettings.phone.trim())
          .maybeSingle();
        setPatientSettingsPhoneExists(!!data);

        // 2. Fetch appointments for this patient
        const { data: aptData } = await supabase
          .from('appointments')
          .select('*')
          .eq('patient_id', selectedPatientForSettings.id)
          .order('appointment_date', { ascending: false });

        if (aptData) {
          const mapped = aptData.map((a: any) => ({
            id: a.id,
            clinicId: a.clinic_id?.toString(),
            patientId: a.patient_id?.toString(),
            patientName: a.patient_name,
            date: a.appointment_date || a.date,
            time: a.appointment_time || a.time || a.start_time,
            status: a.status,
            type: a.type || a.appointment_type,
            patientPhone: a.patient_phone || a.phone_number || a.phone || '',
            patientUserId: a.patient_user_id || undefined
          }));
          setPatientAppointments(mapped);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setCheckingSettingsPhone(false);
        setLoadingAppointments(false);
      }
    };

    checkPhoneAndFetchAppointments();
  }, [selectedPatientForSettings]);

  // Set default reminder text when appointment is selected inside patients tab
  useEffect(() => {
    if (selectedAptForReminder && selectedPatientForSettings) {
      const pName = selectedPatientForSettings.name;
      const timeStr = selectedAptForReminder.time;
      const dateStr = selectedAptForReminder.date;
      const isPlatformUser = !!(selectedPatientForSettings.patient_user_id || selectedPatientForSettings.user_id);
      setReminderMethod(isPlatformUser ? 'platform' : 'whatsapp_web');
      setReminderMessage(
        `مرحباً مراجعنا العزيز ${pName}، نود تذكيرك بموعدك القادم في عيادتنا للأسنان بتاريخ ${dateStr} الساعة ${timeStr}. نتمنى لك دوام الصحة والعافية.`
      );
    }
  }, [selectedAptForReminder, selectedPatientForSettings]);

  // Paid WhatsApp direct helpers
  const sendTwilioMessage = async (to: string, body: string, settings: any) => {
    const { api_key, api_url, phone_number } = settings;
    if (!api_url || !api_key || !phone_number) {
      throw new Error('يرجى التحقق من إعدادات Twilio (Account SID, Auth Token, Sender Phone)');
    }
    const isWhatsApp = phone_number.startsWith('whatsapp:');
    const fromVal = phone_number;
    const toVal = isWhatsApp ? (to.startsWith('whatsapp:') ? to : `whatsapp:${to}`) : to;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${api_url}/Messages.json`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${api_url}:${api_key}`),
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

  const sendUltramsgMessage = async (to: string, body: string, settings: any) => {
    const { api_key, api_url } = settings;
    if (!api_key || !api_url) {
      throw new Error('يرجى التحقق من إعدادات Ultramsg (Instance ID, Token)');
    }
    const cleanTo = to.replace(/\D/g, '');
    const url = `https://api.ultramsg.com/${api_url}/messages/chat`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: api_key, to: cleanTo, body }).toString()
    });
    if (!response.ok) throw new Error('فشل إرسال رسالة Ultramsg');
    return await response.json();
  };

  const sendGreenApiMessage = async (to: string, body: string, settings: any) => {
    const { api_key, api_url } = settings;
    if (!api_key || !api_url) {
      throw new Error('يرجى التحقق من إعدادات Green API (idInstance, apiTokenInstance)');
    }
    const cleanTo = to.replace(/\D/g, '') + '@c.us';
    const url = `https://api.green-api.com/waInstance${api_url}/sendMessage/${api_key}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: cleanTo, message: body })
    });
    if (!response.ok) throw new Error('فشل إرسال رسالة Green API');
    return await response.json();
  };

  const handleSendReminder = async () => {
    if (!selectedAptForReminder || !selectedPatientForSettings) return;
    const phone = selectedPatientForSettings.phone;
    const recipientUserId = selectedPatientForSettings.patient_user_id || selectedPatientForSettings.user_id;

    if (!phone && reminderMethod !== 'platform') {
      toast.error('لا يمكن الإرسال: لا يتوفر رقم هاتف مسجل للمراجع');
      return;
    }

    setSendingReminder(true);
    try {
      if (reminderMethod === 'platform') {
        if (!recipientUserId) {
          toast.error('رقم الهاتف غير مرتبط ببوابة المنصة. يرجى التنشيط أولاً.');
          setSendingReminder(false);
          return;
        }

        const { error } = await supabase
          .from('direct_messages')
          .insert({
            clinic_id: parseInt(clinicId),
            recipient_id: recipientUserId,
            content: reminderMessage,
            type: 'reminder',
            metadata: {
              appointment_id: selectedAptForReminder.id,
              date: selectedAptForReminder.date,
              time: selectedAptForReminder.time,
              type: selectedAptForReminder.type
            }
          });

        if (error) throw error;
        toast.success('تم إرسال التذكير بنجاح لصندوق وارد المريض!');
      } else if (reminderMethod === 'whatsapp_web') {
        const cleanPhone = formatToInternationalPhone(phone, false);
        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(reminderMessage)}`;
        window.open(url, '_blank');
        toast.success('تم فتح نافذة WhatsApp Web لإرسال الرسالة');
      } else {
        if (!whatsappSettings || !whatsappSettings.is_active) {
          throw new Error('يرجى تهيئة وتفعيل بوابة الواتساب المدفوعة في إعدادات المحادثات أولاً.');
        }

        if (reminderMethod === 'twilio') {
          await sendTwilioMessage(phone, reminderMessage, whatsappSettings);
        } else if (reminderMethod === 'ultramsg') {
          await sendUltramsgMessage(phone, reminderMessage, whatsappSettings);
        } else if (reminderMethod === 'greenapi') {
          await sendGreenApiMessage(phone, reminderMessage, whatsappSettings);
        }

        if (recipientUserId) {
          await supabase
            .from('direct_messages')
            .insert({
              clinic_id: parseInt(clinicId),
              recipient_id: recipientUserId,
              content: `[تذكير مرسل عبر الواتساب]:\n${reminderMessage}`,
              type: 'reminder',
              metadata: { provider: reminderMethod }
            });
        }
        toast.success(`تم إرسال التذكير بنجاح عبر ${reminderMethod}`);
      }
      setSelectedAptForReminder(null);
    } catch (err: any) {
      console.error(err);
      const isTwilio = reminderMethod === 'twilio';
      if (isTwilio && (err.message?.includes('Failed to fetch') || err.name === 'TypeError' || String(err).includes('TypeError'))) {
        toast.warning(
          '🔒 تم حظر الإرسال المباشر من المتصفح (CORS Policy) لحماية بياناتك:\n' +
          'تمنع Twilio طلبات الـ API المباشرة من متصفحات الويب لمنع سرقة مفاتيح الـ Auth Token الخاصة بالعيادة.\n' +
          'سيقوم خادم المنصة/الدوال البرمجية (Edge Functions) بالإرسال التلقائي الفعلي بأمان وسرية تامة في الخلفية.'
        );
      } else {
        toast.error('تعذر إرسال التذكير: ' + err.message);
      }
    } finally {
      setSendingReminder(false);
    }
  };

  const handleCreatePatient = async () => {
    if (!newPatient.name || !newPatient.phone) {
      toast.error('يرجى إدخال الاسم ورقم الهاتف');
      return;
    }

    const limitCheck = checkLimit('patients');
    if (!limitCheck.allowed) {
      toast.error(limitCheck.message);
      return;
    }
    try {
      let patientUserId = null;

      if (createPortalAccount) {
        if (phoneCheckStatus.exists && phoneCheckStatus.profileId) {
          patientUserId = phoneCheckStatus.profileId;
          toast.info(`هذا الرقم مسجل بالمنصة بالفعل. تم ربط المريض تلقائياً بحسابه المسجل باسم "${phoneCheckStatus.profileName}".`);
        } else {
          setIsCreatingAccount(true);
          // Invoke Edge Function to create auth.users account and send SMS
          const { data: edgeData, error: edgeError } = await supabase.functions.invoke('send-patient-credentials', {
            body: {
              phone: newPatient.phone,
              name: newPatient.name,
              clinicName: 'عيادة الأسنان' // In a real app, pass actual clinic name
            }
          });

          setIsCreatingAccount(false);

          if (edgeError) {
            console.error('Edge function error:', edgeError);
            toast.warning('تعذر إنشاء حساب البوابة. سيتم حفظ المريض محلياً فقط.');
          } else if (edgeData?.error === 'patient_exists') {
            toast.warning('هذا المراجع لديه حساب بوابة بالفعل، يرجى ربط الملف لاحقاً.');
          } else if (edgeData?.userId) {
            patientUserId = edgeData.userId;
            if (edgeData.smsStatus === 'sent' || edgeData.whatsappStatus === 'sent') {
              toast.success('تم إنشاء حساب البوابة وإرسال بيانات الدخول عبر SMS و WhatsApp بنجاح!');
            } else {
              toast.warning('تم إنشاء حساب البوابة، لكن إرسال الرسائل (SMS / WhatsApp) يتطلب تهيئة متغيرات بيئة Twilio.');
            }
          }
        }
      }

      await createPatient({
        name: newPatient.name,
        phone: newPatient.phone,
        age: parseInt(newPatient.age) || 0,
        gender: newPatient.gender as any,
        email: newPatient.email,
        address: newPatient.address,
        notes: newPatient.notes,
        status: 'active',
        paymentStatus: 'pending',
        patient_user_id: patientUserId
      });
      setShowModal(false);
      setNewPatient({ name: '', phone: '', age: '', gender: 'male', email: '', address: '', notes: '' });
      setCreatePortalAccount(false);
      toast.success('تم إضافة المريض بنجاح');
    } catch (e) {
      setIsCreatingAccount(false);
      toast.error('حدث خطأ');
    }
  };

  const handleDeletePatient = async (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف ملف المريض "${name}"؟\nهذا الإجراء لا يمكن التراجع عنه.`)) {
      try {
        await deletePatient(id);
        // alert('تم حذف المريض بنجاح'); // Optional: Feedback is usually immediate via UI update
      } catch (e) {
        toast.error('حدث خطأ أثناء الحذف');
      }
    }
  };

  // Stats
  const stats = {
    total: patients.length,
    active: patients.filter(p => p.status === 'active').length,
    emergency: patients.filter(p => p.status === 'emergency').length,
    pendingPayments: 0, // Placeholder
    avgVisits: 0 // Placeholder
  };

  // Filter
  const filteredPatients = patients.filter(patient => {
    const matchesSearch = searchTerm === '' ||
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.phone.includes(searchTerm);

    const matchesStatus = selectedStatus === 'all' || patient.status === selectedStatus;
    // Payment status is mocked/placeholder for now
    // const matchesPayment = selectedPayment === 'all' || patient.paymentStatus === selectedPayment;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'inactive': return 'text-gray-600 bg-gray-100';
      case 'emergency': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'نشط';
      case 'inactive': return 'غير نشط';
      case 'emergency': return 'طوارئ';
      default: return 'غير محدد';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'overdue': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'مدفوع';
      case 'pending': return 'معلق';
      case 'overdue': return 'متأخر';
      default: return 'غير محدد';
    }
  };

  return (
    <div className="space-y-6">

      {/* Bento Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <BentoStatCard
          title="إجمالي المرضى"
          value={stats.total}
          icon={Users}
          color="blue"
          trend="up"
          trendValue={`${stats.active} نشط`}
          delay={100}
        />
        <BentoStatCard
          title="حالات الطوارئ"
          value={stats.emergency}
          icon={AlertCircle}
          color="red"
          trend={stats.emergency > 0 ? "down" : "neutral"}
          trendValue="تتطلب انتباه"
          delay={200}
        />
        <BentoStatCard
          title="المدفوعات المعلقة"
          value={stats.pendingPayments}
          icon={Clock}
          color="orange"
          trend="neutral"
          trendValue="فواتير غير مسددة"
          delay={300}
        />
        <BentoStatCard
          title="متوسط الزيارات"
          value={stats.avgVisits}
          icon={Calendar}
          color="purple"
          trend="neutral"
          trendValue="لكل مريض"
          delay={400}
        />
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">

          {/* Search and Filters */}
          <div className="flex flex-row flex-wrap sm:flex-nowrap gap-3 flex-1 w-full">

            {/* Search */}
            <div className="relative w-full sm:flex-1 sm:max-w-md group">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors w-4 h-4" />
              <input
                type="text"
                placeholder="البحث بالاسم أو رقم الهاتف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none"
              />
            </div>

            {/* Status Filter */}
            <div className="relative w-[calc(50%-6px)] sm:w-40">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="appearance-none w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none cursor-pointer"
              >
                <option value="all">جميع الحالات</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
                <option value="emergency">طوارئ</option>
              </select>
            </div>

            {/* Payment Filter */}
            <div className="relative w-[calc(50%-6px)] sm:w-40">
              <select
                value={selectedPayment}
                onChange={(e) => setSelectedPayment(e.target.value)}
                className="appearance-none w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none cursor-pointer"
              >
                <option value="all">جميع المدفوعات</option>
                <option value="paid">مدفوع</option>
                <option value="pending">معلق</option>
                <option value="overdue">متأخر</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
            {/* View Toggle */}
            <div className="flex bg-gray-50 rounded-xl p-1.5 border border-gray-100">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'grid'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                شبكة
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                قائمة
              </button>
            </div>

            {/* Add Button */}
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 transition-all font-medium"
            >
              <Plus className="w-5 h-5" />
              <span className="text-sm">مريض جديد</span>
            </button>
          </div>
        </div>
      </div>

      {/* Patients Display */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">المرضى ({filteredPatients.length})</h2>
            <div className="text-sm text-gray-600">
              يظهر {filteredPatients.length} من {patients.length} مريض
            </div>
          </div>

          {filteredPatients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">لا توجد نتائج</h3>
              <p className="text-gray-500">لم يتم العثور على مرضى مطابقين للبحث</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="group bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-300 cursor-pointer relative overflow-hidden"
                  onClick={() => navigate(`/doctor/clinic/${clinicId}/patient/${patient.id}`)}
                >
                  {/* Hover Accent */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Patient Header */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl text-white flex items-center justify-center shadow-blue-100 shadow-lg text-lg font-bold">
                        {patient.name.charAt(0)}
                      </div>
                      {/* Platform User Badge */}
                      {(patient.patient_user_id || patient.user_id) && (
                        <div 
                          className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md border border-green-100 group-hover:scale-110 transition-transform duration-300"
                          title="مرتبط بحساب المنصة"
                        >
                          <div className="relative">
                            <Globe className="w-4 h-4 text-green-500" />
                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate text-lg group-hover:text-blue-600 transition-colors">{patient.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                        <span>{patient.age} سنة</span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        <span>{patient.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-3 mb-5 bg-gray-50/50 p-3 rounded-xl border border-gray-50">
                    <div className="flex items-center gap-2.5 text-sm text-gray-600">
                      <Phone className="w-4 h-4 text-blue-500" />
                      <span dir="ltr" className="font-mono">{patient.phone}</span>
                    </div>
                    {patient.address && (
                      <div className="flex items-center gap-2.5 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-red-500" />
                        <span className="truncate">{patient.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Status Badges */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getStatusColor(patient.status)}`}>
                      {getStatusLabel(patient.status)}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getPaymentStatusColor(patient.paymentStatus)}`}>
                      {getPaymentStatusLabel(patient.paymentStatus)}
                    </span>
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-3 mb-4">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{patient.lastVisit ? formatDate(patient.lastVisit) : 'لم يزر العيادة'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      <span>{patient.totalVisits} زيارة</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/doctor/clinic/${clinicId}/patient/${patient.id}`);
                      }}
                      className="flex-1 py-2 px-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm hover:shadow-blue-200"
                    >
                      عرض الملف
                    </button>
                     <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPatientForSettings(patient);
                      }}
                      className="w-10 flex items-center justify-center bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200"
                      title="إعدادات المريض"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePatient(patient.id, patient.name);
                      }}
                      className="w-10 flex items-center justify-center bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-100"
                      title="حذف الملف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => navigate(`/doctor/clinic/${clinicId}/patient/${patient.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{patient.name}</h3>
                      <p className="text-sm text-gray-600">
                        {patient.age} سنة • {patient.gender === 'male' ? 'ذكر' : 'أنثى'} • {patient.phone}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-left">
                      <div className="text-sm text-gray-600">
                        آخر زيارة: {formatDate(patient.lastVisit || '')}
                      </div>
                      <div className="text-sm text-gray-600">
                        {patient.totalVisits} زيارة
                      </div>
                    </div>

                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(patient.status)}`}>
                      {getStatusLabel(patient.status)}
                    </div>

                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(patient.paymentStatus)}`}>
                      {getPaymentStatusLabel(patient.paymentStatus)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <BentoStatCard
          title="مرضى نشطين"
          value={stats.active}
          icon={Users}
          color="blue"
          trend="up"
          trendValue="نشط"
          delay={100}
        />

        <BentoStatCard
          title="حالات طوارئ"
          value={stats.emergency}
          icon={Heart}
          color="red"
          trend={stats.emergency > 0 ? "down" : "neutral"}
          trendValue="طوارئ"
          delay={200}
        />

        <BentoStatCard
          title="مدفوعات مكتملة"
          value={stats.total - stats.pendingPayments}
          icon={CheckCircle}
          color="green"
          trend="neutral"
          trendValue="مكتمل"
          delay={300}
        />
      </div>

      {/* Add Patient Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-blue-50">
              <h3 className="font-bold text-lg text-blue-800">إضافة مريض جديد</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
                <input
                  type="text"
                  value={newPatient.name}
                  onChange={e => setNewPatient({ ...newPatient, name: e.target.value })}
                  className="w-full border rounded-lg p-2.5"
                  placeholder="اسم المريض"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  value={newPatient.phone}
                  onChange={e => setNewPatient({ ...newPatient, phone: e.target.value })}
                  className="w-full border rounded-lg p-2.5"
                  placeholder="077..."
                />
                {createPortalAccount && (
                  <div className="mt-1.5 transition-all duration-300">
                    {phoneCheckStatus.checking ? (
                      <div className="flex items-center gap-1.5 text-xs text-blue-600">
                        <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span>جاري التحقق من الرقم...</span>
                      </div>
                    ) : phoneCheckStatus.exists ? (
                      <div className="flex items-start gap-1.5 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100 mt-1">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">مسجل مسبقاً باسم:</p>
                          <p className="opacity-95">{phoneCheckStatus.profileName}</p>
                          <p className="text-[10px] opacity-75 mt-0.5">سيتم ربط الملف بالحساب القائم تلقائياً.</p>
                        </div>
                      </div>
                    ) : phoneCheckStatus.checked ? (
                      <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 p-2 rounded-lg border border-green-100 mt-1">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span>رقم جديد ومتاح للتنشيط!</span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العمر</label>
                <input
                  type="number"
                  value={newPatient.age}
                  onChange={e => setNewPatient({ ...newPatient, age: e.target.value })}
                  className="w-full border rounded-lg p-2.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الجنس</label>
                <select
                  value={newPatient.gender}
                  onChange={e => setNewPatient({ ...newPatient, gender: e.target.value })}
                  className="w-full border rounded-lg p-2.5"
                >
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                <input
                  type="text"
                  value={newPatient.address}
                  onChange={e => setNewPatient({ ...newPatient, address: e.target.value })}
                  className="w-full border rounded-lg p-2.5"
                  placeholder="بغداد..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <textarea
                  value={newPatient.notes}
                  onChange={e => setNewPatient({ ...newPatient, notes: e.target.value })}
                  className="w-full border rounded-lg p-2.5"
                  rows={3}
                />
              </div>

              {/* SMS & Portal Account Checkbox */}
              <div className="pt-4 border-t border-gray-100 col-span-2">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-1">
                    <input
                      type="checkbox"
                      checked={createPortalAccount}
                      onChange={(e) => setCreatePortalAccount(e.target.checked)}
                      className="w-5 h-5 border-2 border-gray-300 rounded text-blue-600 focus:ring-blue-500 transition-all cursor-pointer peer appearance-none checked:bg-blue-600 checked:border-blue-600"
                    />
                    <CheckCircle className="w-3.5 h-3.5 text-white absolute opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                      إنشاء حساب بوابة المراجع وإرسال بيانات الدخول تلقائياً (SMS و WhatsApp)
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      سيتم إنشاء حساب للمراجع على منصة سمارت دنتال وإرسال رسالة نصية وواتساب تحتوي على كلمة المرور عبر Twilio.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2.5 text-gray-700 font-medium hover:bg-gray-200 bg-gray-100 rounded-xl transition-colors"
                disabled={isCreatingAccount}
              >
                إلغاء
              </button>
              <button
                onClick={handleCreatePatient}
                disabled={isCreatingAccount}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2"
              >
                {isCreatingAccount ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    جاري الإنشاء...
                  </>
                ) : (
                  'حفظ المريض'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Settings Modal */}
      {selectedPatientForSettings && editPatientData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-150 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-2.5">
                <Settings className="w-5 h-5 text-gray-750 animate-pulse" />
                <h3 className="font-bold text-lg text-gray-900">إعدادات ملف المراجع</h3>
              </div>
              <button
                onClick={() => setSelectedPatientForSettings(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Patient Edit Form */}
              <div className="p-5 rounded-2xl border border-gray-150 bg-white shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                  <User className="w-4.5 h-4.5 text-blue-600" />
                  <h5 className="font-bold text-sm text-gray-900">تعديل المعلومات العامة للمراجع</h5>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">الاسم الكامل</label>
                    <input
                      type="text"
                      value={editPatientData.name}
                      onChange={e => setEditPatientData({ ...editPatientData, name: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">رقم الهاتف</label>
                    <input
                      type="text"
                      value={editPatientData.phone}
                      onChange={e => setEditPatientData({ ...editPatientData, phone: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">العمر</label>
                    <input
                      type="number"
                      value={editPatientData.age}
                      onChange={e => setEditPatientData({ ...editPatientData, age: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">الجنس</label>
                    <select
                      value={editPatientData.gender}
                      onChange={e => setEditPatientData({ ...editPatientData, gender: e.target.value as any })}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                    >
                      <option value="male">ذكر</option>
                      <option value="female">أنثى</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">العنوان</label>
                    <input
                      type="text"
                      value={editPatientData.address}
                      onChange={e => setEditPatientData({ ...editPatientData, address: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">حالة الملف</label>
                    <select
                      value={editPatientData.status}
                      onChange={e => setEditPatientData({ ...editPatientData, status: e.target.value as any })}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                    >
                      <option value="active">نشط</option>
                      <option value="inactive">غير نشط</option>
                      <option value="emergency">طوارئ</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">البريد الإلكتروني</label>
                    <input
                      type="email"
                      value={editPatientData.email}
                      onChange={e => setEditPatientData({ ...editPatientData, email: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">ملاحظات عامة</label>
                    <textarea
                      value={editPatientData.notes}
                      onChange={e => setEditPatientData({ ...editPatientData, notes: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              {/* Settings Action Blocks */}
              <div className="space-y-4">
                {/* Portal Account Status & Action Block */}
                <div className="p-4 rounded-2xl border border-gray-150 bg-white shadow-sm space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4.5 h-4.5 text-blue-600" />
                      <h5 className="font-bold text-sm text-gray-900">حساب البوابة الإلكترونية للمراجع</h5>
                    </div>
                    {!!(selectedPatientForSettings.patient_user_id || selectedPatientForSettings.user_id) ? (
                      <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-bold rounded-md border border-green-100 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                        نشط ومرتبط
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-md border border-amber-100">
                        غير نشط
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed">
                    تتيح البوابة الإلكترونية للمراجع حجز المواعيد ذاتياً، والدردشة مع المساعد الذكي AI، واستعراض خططه العلاجية المعتمدة فورياً.
                  </p>

                  {checkingSettingsPhone ? (
                    <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50/50 p-2 rounded-xl border border-blue-100">
                      <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>جاري فحص حالة رقم المريض في المنصة...</span>
                    </div>
                  ) : patientSettingsPhoneExists && !(selectedPatientForSettings.patient_user_id || selectedPatientForSettings.user_id) ? (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-800 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <span>تم العثور على حساب مسجل!</span>
                      </div>
                      <p className="opacity-90">رقم هاتف هذا المراجع لديه حساب بوابة نشط بالفعل في المنصة.</p>
                      <button
                        onClick={async () => {
                          setIsActivatingPortalForSettings(true);
                          try {
                            const { data: profileData, error: profileErr } = await supabase
                              .from('profiles')
                              .select('id')
                              .eq('phone', selectedPatientForSettings.phone.trim())
                              .maybeSingle();

                            if (profileErr) throw profileErr;
                            if (!profileData) throw new Error('فشل العثور على الحساب المطابق');

                            const { error: updateErr } = await supabase
                              .from('patients')
                              .update({ patient_user_id: profileData.id })
                              .eq('id', selectedPatientForSettings.id);

                            if (updateErr) throw updateErr;
                            toast.success('تم ربط ملف المراجع بالحساب النشط بنجاح!');

                            // Update local patient object
                            selectedPatientForSettings.patient_user_id = profileData.id;
                            setSelectedPatientForSettings({ ...selectedPatientForSettings });
                          } catch (err: any) {
                            console.error(err);
                            toast.error('فشل الربط: ' + err.message);
                          } finally {
                            setIsActivatingPortalForSettings(false);
                          }
                        }}
                        className="px-3.5 py-1.5 bg-amber-600 text-white font-bold rounded-lg text-[11px] hover:bg-amber-700 transition-colors w-full mt-1.5"
                        disabled={isActivatingPortalForSettings}
                      >
                        {isActivatingPortalForSettings ? 'جاري ربط الملف...' : 'ربط الملف بالحساب النشط فوراً'}
                      </button>
                    </div>
                  ) : !(selectedPatientForSettings.patient_user_id || selectedPatientForSettings.user_id) ? (
                    <button
                      onClick={async () => {
                        setIsActivatingPortalForSettings(true);
                        try {
                          const { data: edgeData, error: edgeError } = await supabase.functions.invoke('send-patient-credentials', {
                            body: {
                              phone: selectedPatientForSettings.phone,
                              name: selectedPatientForSettings.name,
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
                              .eq('id', selectedPatientForSettings.id);

                            if (updateError) throw updateError;
                            toast.success('تم تنشيط الحساب بنجاح وإرسال بيانات الدخول!');

                            selectedPatientForSettings.patient_user_id = edgeData.userId;
                            setSelectedPatientForSettings({ ...selectedPatientForSettings });
                          }
                        } catch (err: any) {
                          console.error(err);
                          toast.error('تعذر تنشيط الحساب: ' + err.message);
                        } finally {
                          setIsActivatingPortalForSettings(false);
                        }
                      }}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-100 flex items-center justify-center gap-1.5 transition-all"
                      disabled={isActivatingPortalForSettings}
                    >
                      {isActivatingPortalForSettings ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>جاري إنشاء وتنشيط البوابة...</span>
                        </>
                      ) : (
                        <>
                          <User className="w-4 h-4" />
                          <span>تنشيط حساب المراجع وإرسال بيانات الدخول</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="p-3 bg-green-50 rounded-xl border border-green-100 text-xs text-green-850 flex items-center justify-between">
                      <span>البوابة الإلكترونية نشطة ومتاحة للاستخدام.</span>
                      <button
                        onClick={async () => {
                          setIsActivatingPortalForSettings(true);
                          try {
                            const { data, error } = await supabase.functions.invoke('send-patient-credentials', {
                              body: {
                                phone: selectedPatientForSettings.phone,
                                name: selectedPatientForSettings.name,
                                clinicName: 'عيادة الأسنان'
                              }
                            });
                            if (error) throw error;
                            toast.success('تمت إعادة إرسال بيانات الدخول بنجاح للمراجع!');
                          } catch (e: any) {
                            toast.error('تعذر إعادة الإرسال: ' + e.message);
                          } finally {
                            setIsActivatingPortalForSettings(false);
                          }
                        }}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-[10px]"
                        disabled={isActivatingPortalForSettings}
                      >
                        {isActivatingPortalForSettings ? 'جاري الإرسال...' : 'إعادة إرسال بيانات الدخول'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Appointment Reminder Block */}
                <div className="p-4 rounded-2xl border border-gray-150 bg-white shadow-sm space-y-3.5">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4.5 h-4.5 text-amber-500 animate-bounce" />
                    <h5 className="font-bold text-sm text-gray-900">رسائل التذكير والمواعيد</h5>
                  </div>

                  <p className="text-xs text-gray-500 leading-relaxed">
                    تذكير المريض بمواعيده القادمة وجلساته العلاجية القادمة لضمان الحضور والالتزام بالجدول العلاجي.
                  </p>

                  {loadingAppointments ? (
                    <div className="flex items-center justify-center py-2 text-xs text-gray-400">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin ml-2"></div>
                      <span>جاري جلب مواعيد المريض...</span>
                    </div>
                  ) : patientAppointments.length === 0 ? (
                    <div className="text-center p-3 bg-gray-50 border border-gray-100 rounded-xl">
                      <p className="text-xs text-gray-500 font-medium">لا توجد مواعيد مجدولة لهذا المريض في العيادة حالياً.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                      <p className="text-xs font-bold text-gray-700">اختر موعداً لإرسال تذكير به:</p>
                      {patientAppointments.map((apt) => (
                        <div
                          key={apt.id}
                          onClick={() => {
                            setSelectedAptForReminder(apt);
                          }}
                          className="p-3 bg-gray-50 hover:bg-amber-50/40 hover:border-amber-200 border border-gray-150 rounded-xl cursor-pointer flex items-center justify-between text-xs transition-all"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900">{apt.date}</span>
                              <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                              <span className="text-gray-500 font-mono" dir="ltr">{apt.time}</span>
                            </div>
                            <p className="text-gray-400 font-medium text-[10px]">{apt.type}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            apt.status === 'confirmed' || apt.status === 'scheduled' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {apt.status === 'confirmed' ? 'مؤكد' : apt.status === 'scheduled' ? 'مجدول' : apt.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-3xl flex justify-end gap-3">
              <button
                onClick={() => setSelectedPatientForSettings(null)}
                className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-bold transition-colors"
                disabled={isSavingSettings}
              >
                إلغاء
              </button>
              <button
                onClick={handleUpdatePatientSettings}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-lg shadow-blue-150"
                disabled={isSavingSettings}
              >
                {isSavingSettings ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    جاري الحفظ...
                  </>
                ) : (
                  'حفظ التعديلات'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Reminder Slide-over Drawer inside Patients Page */}
      {selectedAptForReminder && selectedPatientForSettings && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => setSelectedAptForReminder(null)} />

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
                    للمريض: {selectedPatientForSettings.name}
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
                const isPlatformUser = !!(selectedPatientForSettings.patient_user_id || selectedPatientForSettings.user_id);
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
                          : 'يمكنك تنشيط البوابة له أولاً لتمكينه من تلقي الرسائل، أو إرسال التذكير عبر قنوات الواتساب/SMS.'}
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
                  {(() => {
                    const isPlatformUser = !!(selectedPatientForSettings.patient_user_id || selectedPatientForSettings.user_id);
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          if (isPlatformUser) {
                            setReminderMethod('platform');
                            const pName = selectedPatientForSettings?.name || 'مراجع';
                            const dateStr = selectedAptForReminder.date;
                            const timeStr = selectedAptForReminder.time;
                            setReminderMessage(
                              `مرحباً مراجعنا العزيز ${pName}، نود تذكيرك بموعدك القادم في عيادتنا للأسنان بتاريخ ${dateStr} الساعة ${timeStr}. نتمنى لك دوام الصحة والعافية.`
                            );
                          }
                        }}
                        className={`p-3.5 rounded-xl border-2 text-right transition-all flex flex-col justify-between h-24 ${
                          !isPlatformUser ? 'opacity-40 cursor-not-allowed border-gray-150 bg-gray-50' :
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
                  <button
                    type="button"
                    onClick={() => {
                      setReminderMethod('whatsapp_web');
                      const pName = selectedPatientForSettings?.name || 'مراجع';
                      const dateStr = selectedAptForReminder.date;
                      const timeStr = selectedAptForReminder.time;
                      setReminderMessage(
                        `مرحباً مراجعنا العزيز ${pName}، نود تذكيرك بموعدك القادم في عيادتنا للأسنان بتاريخ ${dateStr} الساعة ${timeStr}. نتمنى لك دوام الصحة والعافية.`
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

                  {/* Twilio */}
                  <button
                    type="button"
                    onClick={() => {
                      setReminderMethod('twilio');
                      const timeStr = (() => {
                        const parts = selectedAptForReminder.time.split(' ');
                        const timeOnly = parts[0];
                        const ampm = parts[1] || '';
                        const cleanAmpm = ampm.replace('صباحاً', 'ص').replace('مساءً', 'م');
                        return `${timeOnly} ${cleanAmpm}`.trim();
                      })();
                      setReminderMessage(`تذكير: موعدك غداً الساعة ${timeStr}`);
                    }}
                    className={`p-3.5 rounded-xl border-2 text-right transition-all flex flex-col justify-between h-24 ${
                      reminderMethod === 'twilio'
                        ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                    }`}
                  >
                    <Settings className={`w-5 h-5 ${reminderMethod === 'twilio' ? 'text-indigo-600' : 'text-gray-400'}`} />
                    <div>
                      <span className="block font-bold text-xs">Twilio SMS / WhatsApp</span>
                      <span className="text-[10px] opacity-75">إرسال تلقائي مدفوع</span>
                    </div>
                  </button>

                  {/* Ultramsg */}
                  <button
                    type="button"
                    onClick={() => {
                      setReminderMethod('ultramsg');
                      const pName = selectedPatientForSettings?.name || 'مراجع';
                      const dateStr = selectedAptForReminder.date;
                      const timeStr = selectedAptForReminder.time;
                      setReminderMessage(
                        `مرحباً مراجعنا العزيز ${pName}، نود تذكيرك بموعدك القادم في عيادتنا للأسنان بتاريخ ${dateStr} الساعة ${timeStr}. نتمنى لك دوام الصحة والعافية.`
                      );
                    }}
                    className={`p-3.5 rounded-xl border-2 text-right transition-all flex flex-col justify-between h-24 ${
                      reminderMethod === 'ultramsg'
                        ? 'border-purple-600 bg-purple-50/40 text-purple-900 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                    }`}
                  >
                    <Settings className={`w-5 h-5 ${reminderMethod === 'ultramsg' ? 'text-purple-600' : 'text-gray-400'}`} />
                    <div>
                      <span className="block font-bold text-xs">بوابة Ultramsg</span>
                      <span className="text-[10px] opacity-75">إرسال بالخلفية عبر API</span>
                    </div>
                  </button>

                  {/* Green API */}
                  <button
                    type="button"
                    onClick={() => {
                      setReminderMethod('greenapi');
                      const pName = selectedPatientForSettings?.name || 'مراجع';
                      const dateStr = selectedAptForReminder.date;
                      const timeStr = selectedAptForReminder.time;
                      setReminderMessage(
                        `مرحباً مراجعنا العزيز ${pName}، نود تذكيرك بموعدك القادم في عيادتنا للأسنان بتاريخ ${dateStr} الساعة ${timeStr}. نتمنى لك دوام الصحة والعافية.`
                      );
                    }}
                    className={`p-3.5 rounded-xl border-2 text-right transition-all flex flex-col justify-between h-24 col-span-2 ${
                      reminderMethod === 'greenapi'
                        ? 'border-emerald-600 bg-emerald-50/40 text-emerald-900 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                    }`}
                  >
                    <Settings className={`w-5 h-5 ${reminderMethod === 'greenapi' ? 'text-emerald-600' : 'text-gray-400'}`} />
                    <div>
                      <span className="block font-bold text-xs">بوابة Green API</span>
                      <span className="text-[10px] opacity-75">إرسال بالخلفية عبر API</span>
                    </div>
                  </button>
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
                        const pName = selectedPatientForSettings?.name || 'test';
                        const dateStr = selectedAptForReminder.date;
                        const timeStr = selectedAptForReminder.time;
                        setReminderMessage(
                          `مرحباً مراجعنا العزيز ${pName}، نود تذكيرك بموعدك القادم في عيادتنا للأسنان بتاريخ ${dateStr} الساعة ${timeStr}. نتمنى لك دوام الصحة والعافية.`
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
                          const parts = selectedAptForReminder.time.split(' ');
                          const timeOnly = parts[0];
                          const ampm = parts[1] || '';
                          const cleanAmpm = ampm.replace('صباحاً', 'ص').replace('مساءً', 'م');
                          return `${timeOnly} ${cleanAmpm}`.trim();
                        })();
                        setReminderMessage(`تذكير: موعدك غداً الساعة ${timeStr}`);
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
    </div>
  );
};