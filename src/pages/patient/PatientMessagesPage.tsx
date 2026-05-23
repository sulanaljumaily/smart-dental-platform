import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare, ChevronRight, Building2, MessageCircle,
  Send, Paperclip, Search, MoreVertical, MapPin, Phone,
  Calendar, Clock, Activity, User, Stethoscope, Sparkles,
  Volume2, Mic, MicOff, AlertCircle, CheckCircle, ArrowLeft,
  ArrowRight, ExternalLink, RefreshCw, Star, Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useMessages } from '../../hooks/useMessages';
import { usePatientTreatments } from '../../hooks/usePatientTreatments';
import { Card } from '../../components/common/Card';
import { BottomNavigation } from '../../components/layout/BottomNavigation';
import { aiService } from '../../services/ai/AIService';
import { toast } from 'sonner';

interface PatientMessagesPageProps {
  hideNavigation?: boolean;
}

// Dental specialties config
const DENTAL_SPECIALTIES = [
  { id: 'general', label: 'فحص وكشف عام', icon: Stethoscope, color: 'from-emerald-500 to-teal-500', keys: ['كشف', 'فحص', 'عام'] },
  { id: 'orthodontics', label: 'تقويم الأسنان', icon: Activity, color: 'from-blue-500 to-indigo-500', keys: ['تقويم'] },
  { id: 'implants', label: 'زراعة الأسنان', icon: Sparkles, color: 'from-purple-500 to-pink-500', keys: ['زراعة', 'زرع'] },
  { id: 'cosmetic', label: 'حشوات تجميلية وتبييض', icon: Star, color: 'from-amber-500 to-orange-500', keys: ['حشوة', 'حشوات', 'تجميل', 'تبييض'] },
  { id: 'surgery', label: 'جراحة وقلع الأسنان', icon: AlertCircle, color: 'from-rose-500 to-red-500', keys: ['جراحة', 'قلع', 'خلع'] },
  { id: 'pediatric', label: 'طب أسنان الأطفال', icon: User, color: 'from-cyan-500 to-blue-500', keys: ['أطفال', 'طفل'] }
];

export const PatientMessagesPage: React.FC<PatientMessagesPageProps> = ({ hideNavigation = false }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { conversations, sendMessage, loading: messagesLoading } = useMessages();

  // Selected clinic state
  const [clinics, setClinics] = useState<any[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<any>(null);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Active sub-widgets and appointment list states
  const [activeBentoWidget, setActiveBentoWidget] = useState<'none' | 'booking' | 'appointments' | 'treatments' | 'info'>('none');
  const [clinicAppointments, setClinicAppointments] = useState<any[]>([]);
  const [patientRecord, setPatientRecord] = useState<any>(null);
  const [mobileTab, setMobileTab] = useState<'chat' | 'services'>('chat');

  // AI & Voice Modes states
  const [aiTextMode, setAiTextMode] = useState(true);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isConnectingVoice, setIsConnectingVoice] = useState(false);
  const [aiMessages, setAiMessages] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLoadingHistory, setAiLoadingHistory] = useState(false);

  // Booking states inside widget
  const [bookingType, setBookingType] = useState<'none' | 'new' | 'followup'>('none');
  const [selectedSpecialty, setSelectedSpecialty] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [timePeriod, setTimePeriod] = useState<'morning' | 'evening'>('morning');
  const [bookingNotes, setBookingNotes] = useState('');
  const [selectedFollowupPlan, setSelectedFollowupPlan] = useState<any>(null);
  const [selectedFollowupSession, setSelectedFollowupSession] = useState<any>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Fetch Treatment plans hook
  const { treatmentPlans, loading: treatmentsLoading } = usePatientTreatments(patientRecord?.id);

  // Refs for ElevenLabs Voice Mode
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const mediaSourceRef = useRef<MediaAudioSourceNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);

  // ElevenLabs Config
  const ELEVENLABS_AGENT_ID = 'agent_9501kqetfd9jf9hrqaxnp79yffak';

  // Refs for state closures inside WebSocket listeners
  const activeBentoWidgetRef = useRef(activeBentoWidget);
  const selectedClinicRef = useRef(selectedClinic);
  const treatmentPlansRef = useRef(treatmentPlans);
  const clinicAppointmentsRef = useRef(clinicAppointments);

  useEffect(() => {
    activeBentoWidgetRef.current = activeBentoWidget;
    selectedClinicRef.current = selectedClinic;
    treatmentPlansRef.current = treatmentPlans;
    clinicAppointmentsRef.current = clinicAppointments;
  });

  useEffect(() => {
    fetchClinics();
  }, [user]);

  const fetchClinics = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('patients')
        .select('id, clinic_id, clinic:clinics(*)')
        .or(`patient_user_id.eq.${user.id},user_id.eq.${user.id}`);

      if (error) throw error;

      if (data) {
        const uniqueClinics = Array.from(new Set(data.map(c => c.clinic_id)))
          .map(id => {
            const match = data.find(c => c.clinic_id === id);
            return {
              ...match?.clinic,
              patientId: match?.id
            };
          })
          .filter(Boolean);
        setClinics(uniqueClinics);
      }
    } catch (err) {
      console.error('Error fetching clinics:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveVoiceMessageToDb = async (senderId: string, recipientId: string, content: string) => {
    try {
      await supabase.from('direct_messages').insert({
        sender_id: senderId,
        recipient_id: recipientId,
        content: content,
        type: 'text',
        metadata: { is_ai: true, is_voice: true }
      });
    } catch (err) {
      console.error('Failed to save voice transcript:', err);
    }
  };

  const loadAiConversation = async (clinicUserId: string) => {
    if (!user || !clinicUserId) return;
    try {
      setAiLoadingHistory(true);
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${clinicUserId}),and(sender_id.eq.${clinicUserId},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const mapped = data.map((msg: any) => ({
          role: msg.sender_id === user.id ? 'user' : 'assistant',
          content: msg.content,
          timestamp: msg.created_at
        }));
        setAiMessages(mapped);
      } else {
        setAiMessages([
          {
            role: 'assistant',
            content: `أهلاً بك مراجعنا العزيز في المساعد الذكي لعيادة ${selectedClinic.name}. 👋\nأنا هنا لمساعدتك في استعراض خطتك العلاجية، مواعيدك، أو حجز موعد جديد بالصوت أو النص. كيف يمكنني خدمتك اليوم؟`
          }
        ]);
      }
    } catch (err) {
      console.error('Failed to load past AI conversation:', err);
      setAiMessages([
        {
          role: 'assistant',
          content: `أهلاً بك مراجعنا العزيز في المساعد الذكي لعيادة ${selectedClinic.name}. 👋\nأنا هنا لمساعدتك في استعراض خطتك العلاجية، مواعيدك، أو حجز موعد جديد بالصوت أو النص. كيف يمكنني خدمتك اليوم؟`
        }
      ]);
    } finally {
      setAiLoadingHistory(false);
    }
  };

  // Fetch appointments & patient record for selected clinic
  useEffect(() => {
    if (selectedClinic && user) {
      fetchClinicData();
      const clinicUserId = selectedClinic.user_id || selectedClinic.owner_id;
      if (clinicUserId) {
        loadAiConversation(clinicUserId);
      } else {
        setAiMessages([
          {
            role: 'assistant',
            content: `أهلاً بك مراجعنا العزيز في المساعد الذكي لعيادة ${selectedClinic.name}. 👋\nأنا هنا لمساعدتك في استعراض خطتك العلاجية، مواعيدك، أو حجز موعد جديد بالصوت أو النص. كيف يمكنني خدمتك اليوم؟`
          }
        ]);
      }
      
      // Reset states
      setActiveBentoWidget('none');
      setBookingType('none');
      setSelectedSpecialty(null);
      setSelectedDate('');
      setSelectedTime('');
      setBookingSuccess(false);
      setBookingNotes('');
    }
  }, [selectedClinic, user]);

  const fetchClinicData = async () => {
    if (!selectedClinic || !user) return;
    try {
      // 1. Fetch appointments
      const { data: apts } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_user_id', user.id)
        .eq('clinic_id', selectedClinic.id)
        .order('appointment_date', { ascending: false });

      if (apts) setClinicAppointments(apts);

      // 2. Fetch patient record
      const { data: record } = await supabase
        .from('patients')
        .select('*')
        .eq('patient_user_id', user.id)
        .eq('clinic_id', selectedClinic.id)
        .single();

      if (record) setPatientRecord(record);
    } catch (e) {
      console.error('Error fetching clinic details:', e);
    }
  };

  useEffect(() => {
    if (selectedClinic?.user_id) {
      setActiveChatId(selectedClinic.user_id);
    } else {
      setActiveChatId(null);
    }
  }, [selectedClinic]);

  const currentChat = conversations.find(c => c.id === activeChatId) || {
    partnerName: selectedClinic?.name || 'العيادة',
    messages: []
  };

  const handleSend = async () => {
    if (!messageText.trim()) return;

    // 1. ChatGPT Assistant mode (Exclusively AI Chat)
    const userMsg = messageText;
    setMessageText('');
    setAiMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setAiLoading(true);

    const clinicUserId = selectedClinic?.user_id || selectedClinic?.owner_id;

    // Save patient's message in direct_messages
    if (clinicUserId && user) {
      try {
        await supabase.from('direct_messages').insert({
          sender_id: user.id,
          recipient_id: clinicUserId,
          content: userMsg,
          type: 'text',
          metadata: { is_ai: true }
        });
      } catch (dbErr) {
        console.error('Failed to save user message to DB:', dbErr);
      }
    }

    try {
      // Construct dynamic context for ChatGPT
      const context = {
        clinic: selectedClinic,
        appointments: clinicAppointments,
        treatmentPlans: treatmentPlans,
        activeBentoWidget: activeBentoWidget,
        patientName: user?.name,
        currentDate: new Date().toISOString().split('T')[0]
      };

      const history = aiMessages.slice(-10).map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content
      }));

      const systemOverride = `أنت مساعد الذكاء الاصطناعي الذكي لعيادة ${selectedClinic.name}. تتحدث بلهجة ودودة ومهنية وتساعد المريض في إدارة ملفه.
إذا طلب المريض حجز موعد، قم بإرجاع tag الأداة المناسب: [ACTION: BOOK_APPOINTMENT]
إذا طلب المريض استعراض مواعيده، قم بإرجاع tag الأداة المناسب: [ACTION: SHOW_APPOINTMENTS]
إذا طلب المريض استعراض خطته العلاجية أو حالة الأسنان، قم بإرجاع tag الأداة المناسب: [ACTION: SHOW_TREATMENTS]
إذا طلب معلومات العيادة كالأطباء أو الموقع، قم بإرجاع tag الأداة المناسب: [ACTION: SHOW_CLINIC_INFO]`;

      const responseText = await aiService.chat(
        'patient_assistant',
        userMsg,
        context,
        user?.id,
        selectedClinic.id,
        'patient-assistant-session',
        undefined,
        undefined,
        [{ role: 'system', content: systemOverride }, ...history]
      );

      // Parse client side tags
      let parsedText = responseText;
      if (responseText.includes('[ACTION: BOOK_APPOINTMENT]')) {
        setActiveBentoWidget('booking');
        parsedText = parsedText.replace('[ACTION: BOOK_APPOINTMENT]', '');
        toast.success('جاري فتح نموذج حجز المواعيد...');
      } else if (responseText.includes('[ACTION: SHOW_APPOINTMENTS]')) {
        setActiveBentoWidget('appointments');
        parsedText = parsedText.replace('[ACTION: SHOW_APPOINTMENTS]', '');
        toast.success('جاري فتح مواعيدك المجدولة...');
      } else if (responseText.includes('[ACTION: SHOW_TREATMENTS]')) {
        setActiveBentoWidget('treatments');
        parsedText = parsedText.replace('[ACTION: SHOW_TREATMENTS]', '');
        toast.success('جاري فتح خطتك العلاجية وسجل الأسنان...');
      } else if (responseText.includes('[ACTION: SHOW_CLINIC_INFO]')) {
        setActiveBentoWidget('info');
        parsedText = parsedText.replace('[ACTION: SHOW_CLINIC_INFO]', '');
        toast.success('جاري عرض معلومات العيادة...');
      }

      // Save AI's response in direct_messages
      if (clinicUserId && user) {
        try {
          await supabase.from('direct_messages').insert({
            sender_id: clinicUserId,
            recipient_id: user.id,
            content: parsedText,
            type: 'text',
            metadata: { is_ai: true }
          });
        } catch (dbErr) {
          console.error('Failed to save AI response to DB:', dbErr);
        }
      }

      setAiMessages(prev => [...prev, { role: 'assistant', content: parsedText }]);
    } catch (err) {
      console.error('AI chat failed:', err);
      setAiMessages(prev => [...prev, { role: 'assistant', content: 'نأسف مراجعنا العزيز، حدث خطأ أثناء الاتصال بمساعد الذكاء الاصطناعي.' }]);
    } finally {
      setAiLoading(false);
    }
  };

  const filteredClinics = clinics.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Time slots mapping helpers
  const getNext7Days = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const bookingDates = getNext7Days();

  const morningSlots = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"];
  const eveningSlots = ["12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"];

  const formatTime12h = (time24: string): string => {
    if (!time24) return '';
    const [hoursStr, minutesStr] = time24.split(':');
    let hours = parseInt(hoursStr, 10);
    const suffix = hours >= 12 ? 'م' : 'ص';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutesStr} ${suffix}`;
  };

  // Handle Manual Book Appointment Submission
  const handleConfirmManualBooking = async () => {
    if (!selectedDate || !selectedTime || !selectedClinic || !user) return;
    setBookingLoading(true);

    try {
      const dateObj = new Date(selectedDate);
      const offset = dateObj.getTimezoneOffset();
      const adjustedDate = new Date(dateObj.getTime() - (offset * 60 * 1000));
      const formattedDate = adjustedDate.toISOString().split('T')[0];

      let notes = bookingNotes;
      if (bookingType === 'followup' && selectedFollowupPlan) {
        notes = `متابعة خطة علاجية: ${selectedFollowupPlan.notes || ''}\nجلسة: ${selectedFollowupSession?.title || 'عام'}\n\n${notes}`;
      }

      const { error } = await supabase.from('appointments').insert({
        clinic_id: parseInt(selectedClinic.id),
        patient_name: user.name,
        staff_id: null,
        doctor_name: 'غير محدد',
        appointment_date: formattedDate,
        appointment_time: selectedTime,
        type: bookingType === 'followup' ? 'متابعة خطة علاجية' : `${selectedSpecialty?.label || 'كشف عام'} (منصة المراجع)`,
        treatment_type: bookingType === 'followup' ? 'متابعة' : (selectedSpecialty?.label || 'كشف عام'),
        status: 'pending',
        notes: notes,
        phone_number: user.phone,
        cost: 0,
        patient_user_id: user.id,
        is_online_booking: true
      });

      if (error) throw error;

      setBookingSuccess(true);
      fetchClinicData();
      toast.success('تم إرسال طلب الحجز بنجاح بانتظار موافقة العيادة');
    } catch (e) {
      console.error(e);
      toast.error('حدث خطأ أثناء حجز الموعد. يرجى المحاولة مرة أخرى.');
    } finally {
      setBookingLoading(false);
    }
  };

  // ─── Play Audio chunks from ElevenLabs queue ─────────────────────────────────
  const playNextChunk = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0 || !audioCtxRef.current) return;
    isPlayingRef.current = true;
    const raw = audioQueueRef.current.shift()!;
    try {
      const int16 = new Int16Array(raw);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;

      const ctx = audioCtxRef.current;
      const buf = ctx.createBuffer(1, float32.length, ctx.sampleRate);
      buf.copyToChannel(float32, 0);

      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.onended = () => {
        isPlayingRef.current = false;
        playNextChunk();
      };
      src.start();
    } catch (e) {
      console.warn('[Audio Playback] decode error', e);
      isPlayingRef.current = false;
      playNextChunk();
    }
  }, []);

  // ─── Stop voice session ───────────────────────────────────────────────────
  const stopVoiceMode = useCallback(() => {
    if (scriptProcessorRef.current && mediaSourceRef.current) {
      mediaSourceRef.current.disconnect();
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
      mediaSourceRef.current = null;
    }
    inputAudioCtxRef.current?.close().catch(() => { });
    inputAudioCtxRef.current = null;
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setVoiceMode(false);
    toast.info('تم إيقاف المساعد الصوتي');
  }, []);

  // ─── Start ElevenLabs Voice Session ───────────────────────────────────────
  const startVoiceMode = async () => {
    setIsConnectingVoice(true);
    setAiTextMode(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 }
      });
      micStreamRef.current = stream;

      const ws = new WebSocket(
        `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${ELEVENLABS_AGENT_ID}`
      );
      wsRef.current = ws;
      audioCtxRef.current = new AudioContext({ sampleRate: 16000 });

      ws.onopen = () => {
        setVoiceMode(true);
        setIsConnectingVoice(false);
        toast.success('المساعد الصوتي متصل. يمكنك التحدث الآن!');

        // Dynamic voice prompt setup based on current clinic treatments and appointments
        const clinicName = selectedClinicRef.current?.name || 'عيادة طب الأسنان';
        const appointmentsSummary = (clinicAppointmentsRef.current || [])
          .map(a => `- موعد يوم ${a.appointment_date} الساعة ${a.appointment_time} (${a.status})`)
          .join('\n');
        const plansSummary = (treatmentPlansRef.current || [])
          .map(p => `- خطة علاج السن رقم ${p.toothNumber || p.toothNumbers?.join(',')} نوع ${p.type} بنسبة إنجاز ${p.progress}%`)
          .join('\n');

        ws.send(JSON.stringify({
          type: 'conversation_initiation_client_data',
          conversation_config_override: {
            agent: {
              first_message: `أهلاً بك مراجعنا العزيز في المساعد الصوتي لعيادة ${clinicName}. أنا هنا لمساعدتك في حجز المواعيد واستعراض سجلاتك العلاجية بالكامل. تفضل، كيف يمكنني مساعدتك؟`,
              language: 'ar',
              prompt: {
                prompt: `أنت المساعد الصوتي الذكي الحصري لعيادة ${clinicName} في العراق. تتحدث باللهجة العراقية الودودة والمهذبة وتقدم خدمات سريعة ومحترفة للمرضى.

==== البيانات الحالية للمريض (مرجع إلزامي) ====
المواعيد المجدولة الحالية:
${appointmentsSummary || '- لا توجد مواعيد مجدولة حالياً.'}

الخطط العلاجية وجلسات المتابعة:
${plansSummary || '- لا توجد خطط علاجية مسجلة حالياً.'}

==== الأدوات والتحكم بواجهة المريض (Client-side actions) ====
لديك أدوات فورية لتعديل واجهة المريض في المتصفح، استدعها فوراً عند طلب المريض:
1) لفتح نموذج حجز المواعيد الجديد: استدعِ show_booking
2) لعرض المواعيد وجدول الزيارات: استدعِ show_appointments
3) لعرض سجل الأسنان والخطط العلاجية: استدعِ show_treatments
4) لعرض أطباء وتفاصيل العيادة: استدعِ show_clinic_info

قواعد صارمة:
- كن ودوداً جداً وسريع الاستجابة.
- لا تقدم أي تشخيص طبي نهائي بل انصح بزيارة العيادة.`
              }
            }
          }
        }));

        // Capture microphone stream
        const inputCtx = new AudioContext({ sampleRate: 16000 });
        inputAudioCtxRef.current = inputCtx;
        const micSource = inputCtx.createMediaStreamSource(stream);
        mediaSourceRef.current = micSource;
        const processor = inputCtx.createScriptProcessor(2048, 1, 1);
        scriptProcessorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const float32 = e.inputBuffer.getChannelData(0);
          const int16 = new Int16Array(float32.length);
          for (let i = 0; i < float32.length; i++) {
            int16[i] = Math.round(Math.min(1, Math.max(-1, float32[i])) * 32767);
          }
          const bytes = new Uint8Array(int16.buffer);
          let bin = '';
          for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
          ws.send(JSON.stringify({ user_audio_chunk: btoa(bin) }));
        };
        micSource.connect(processor);

        const silentGain = inputCtx.createGain();
        silentGain.gain.value = 0;
        processor.connect(silentGain);
        silentGain.connect(inputCtx.destination);
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'audio') {
            const b64 = msg.audio_event?.audio_base_64 || msg.audio || '';
            if (b64) {
              const bin = atob(b64);
              const bytes = new Uint8Array(bin.length);
              for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
              const aligned = bytes.length % 2 === 0 ? bytes.buffer : bytes.buffer.slice(0, bytes.length - 1);
              audioQueueRef.current.push(aligned);
              playNextChunk();
            }
          } else if (msg.type === 'agent_response' || msg.type === 'agent_response_correction') {
            const text = msg.agent_response_event?.agent_response || msg.agent_response || '';
            if (text) {
              setAiMessages(prev => [...prev, { role: 'assistant', content: text }]);
              const clinicUserId = selectedClinicRef.current?.user_id || selectedClinicRef.current?.owner_id;
              if (clinicUserId && user) {
                saveVoiceMessageToDb(clinicUserId, user.id, text);
              }
            }
          } else if (msg.type === 'user_transcript') {
            const text = msg.user_transcription_event?.user_transcript || '';
            if (text) {
              setAiMessages(prev => [...prev, { role: 'user', content: text }]);
              const clinicUserId = selectedClinicRef.current?.user_id || selectedClinicRef.current?.owner_id;
              if (clinicUserId && user) {
                saveVoiceMessageToDb(user.id, clinicUserId, text);
              }
            }
          } else if (msg.type === 'interruption') {
            audioQueueRef.current = [];
            isPlayingRef.current = false;
          } else if (msg.type === 'client_tool_call') {
            const toolCall = msg.client_tool_call;
            if (!toolCall) return;
            const { tool_name, tool_call_id } = toolCall;
            let result = 'Success';
            let isError = false;

            try {
              if (tool_name === 'show_booking') {
                setActiveBentoWidget('booking');
                toast.success('تم فتح الحجز عبر المساعد الصوتي');
              } else if (tool_name === 'show_appointments') {
                setActiveBentoWidget('appointments');
                toast.success('تم فتح المواعيد عبر المساعد الصوتي');
              } else if (tool_name === 'show_treatments') {
                setActiveBentoWidget('treatments');
                toast.success('تم فتح خطط العلاج عبر المساعد الصوتي');
              } else if (tool_name === 'show_clinic_info') {
                setActiveBentoWidget('info');
                toast.success('تم فتح معلومات العيادة عبر المساعد الصوتي');
              } else {
                result = `Unknown tool "${tool_name}"`;
                isError = true;
              }
            } catch (err: any) {
              result = err.message || String(err);
              isError = true;
            }

            ws.send(JSON.stringify({
              type: 'client_tool_result',
              tool_call_id: tool_call_id,
              result: String(result),
              is_error: isError
            }));
          }
        } catch (e) {
          console.warn('[ElevenLabs WS] parse error:', e);
        }
      };

      ws.onerror = (err) => {
        console.error('[ElevenLabs WS] error:', err);
        toast.error('حدث خطأ في اتصال المساعد الصوتي');
        stopVoiceMode();
      };

      ws.onclose = () => {
        setVoiceMode(false);
      };
    } catch (err) {
      console.error(err);
      toast.error('تعذر تشغيل الميكروفون أو المساعد الصوتي');
      setIsConnectingVoice(false);
    }
  };

  return (
    <div className={`flex flex-col ${!hideNavigation ? 'min-h-screen pb-20 bg-gray-50' : ''}`} dir="rtl">
      {/* Header */}
      {!hideNavigation && (
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-4 pt-10 pb-6 shadow-lg relative z-20">
          <button onClick={() => navigate('/patient')} className="flex items-center gap-1 text-white/80 hover:text-white mb-3 transition-colors">
            <ChevronRight className="w-5 h-5" /> عودة للملف الشخصي
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <MessageSquare className="w-6 h-6" />
              </div>
              مركز المراجعين والعيادات
            </h1>
          </div>
        </div>
      )}

      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
        {!selectedClinic ? (
          /* View 1: Clinics Grid Selection */
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="بحث عن عيادة للتواصل..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-12 pl-4 py-4 bg-white border border-gray-100 rounded-3xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all shadow-sm"
              />
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 bg-white rounded-[2rem] animate-pulse border border-gray-100" />
                ))}
              </div>
            ) : filteredClinics.length > 0 ? (
              <div className="space-y-4">
                {filteredClinics.map(clinic => (
                  <button
                    key={clinic.id}
                    onClick={() => setSelectedClinic(clinic)}
                    className="group w-full bg-white border border-gray-100 p-5 rounded-[2rem] hover:border-teal-500 hover:shadow-xl hover:shadow-teal-50/50 transition-all flex items-center gap-5 text-right relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-teal-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shadow-md flex items-center justify-center bg-gray-50 border border-gray-100 group-hover:scale-105 transition-transform duration-500 shrink-0">
                      {clinic.image_url ? (
                        <img src={clinic.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-8 h-8 text-gray-400 group-hover:text-teal-600 transition-colors" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="font-black text-gray-900 text-base sm:text-lg group-hover:text-teal-600 transition-colors truncate">
                          {clinic.name}
                        </h3>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold">
                          <MapPin className="w-3.5 h-3.5 text-teal-500" />
                          <span>{clinic.governorate} - {clinic.address}</span>
                        </div>
                        <p className="text-xs text-gray-500 font-bold opacity-80 mt-1">
                          اضغط للدخول إلى مركز المراجع والدردشة مع العيادة
                        </p>
                      </div>
                    </div>

                    <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-all transform group-hover:-translate-x-2">
                      <ChevronRight className="w-5 h-5 rotate-180" />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200 shadow-sm">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-10 h-10 text-gray-200" />
                </div>
                <p className="text-gray-400 font-bold">لا توجد عيادات مرتبطة بسجلك حالياً</p>
              </div>
            )}
          </div>
        ) : (
          /* View 2: Overhauled Bento Grid & Chat Workspace */
          <div className="flex flex-col lg:flex-row gap-6 animate-in slide-in-from-left-4 duration-500">
            
            {/* Mobile Tab Selector */}
            <div className="lg:hidden flex bg-white/80 backdrop-blur border border-gray-100 p-1.5 rounded-2xl shadow-sm gap-2">
              <button
                onClick={() => setMobileTab('chat')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all ${mobileTab === 'chat' ? 'bg-teal-600 text-white shadow-md' : 'text-gray-600'}`}
              >
                الدردشة والمساعد الذكي
              </button>
              <button
                onClick={() => setMobileTab('services')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all ${mobileTab === 'services' ? 'bg-teal-600 text-white shadow-md' : 'text-gray-600'}`}
              >
                لوحة الخدمات الطبية المباشرة
              </button>
            </div>

            {/* Left Column (Desktop: 42% width) - Bento Grid & Interactive Services Board */}
            <div className={`w-full lg:w-[42%] flex flex-col gap-5 ${mobileTab === 'services' ? 'block' : 'hidden lg:flex'}`}>
              
              {activeBentoWidget === 'none' ? (
                /* 4-Bento Grid Cards greeting board */
                <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 p-6 rounded-[2.5rem] shadow-2xl border border-slate-700/50 flex flex-col gap-6 text-white min-h-[500px]">
                  <div>
                    <span className="px-3 py-1 bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-black rounded-full uppercase tracking-wider">لوحة المراجعين الذكية</span>
                    <h2 className="text-xl sm:text-2xl font-black mt-3">عيادة {selectedClinic.name}</h2>
                    <p className="text-xs text-slate-400 font-bold mt-1.5 leading-relaxed">أهلاً بك في البوابة الطبية الخاصة بك. يمكنك تتبع علاجك وجلساتك، استعراض المواعيد، أو حجز زيارة فورية.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                    {/* Card 1: Book Appointment */}
                    <button
                      onClick={() => { setActiveBentoWidget('booking'); setBookingType('none'); setBookingSuccess(false); }}
                      className="group relative overflow-hidden bg-gradient-to-br from-indigo-600/90 to-teal-600/90 hover:to-teal-500 hover:from-indigo-500 p-5 rounded-3xl text-right transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/10 border border-white/10"
                    >
                      <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur">
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="font-black text-sm text-white">طلب وحجز موعد</h4>
                      <p className="text-[10px] text-white/70 font-semibold mt-1 leading-normal">حجز كشف عام أو متابعة خطة علاجية حالية</p>
                      <ChevronRight className="w-4 h-4 absolute bottom-4 left-4 text-white/50 group-hover:text-white transition-all transform group-hover:-translate-x-1 rotate-180" />
                    </button>

                    {/* Card 2: My Appointments */}
                    <button
                      onClick={() => setActiveBentoWidget('appointments')}
                      className="group relative overflow-hidden bg-gradient-to-br from-purple-600/90 to-pink-600/90 hover:to-pink-500 hover:from-purple-500 p-5 rounded-3xl text-right transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/10 border border-white/10"
                    >
                      <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur">
                        <Clock className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="font-black text-sm text-white">مواعيدي وجدول الزيارات</h4>
                      <p className="text-[10px] text-white/70 font-semibold mt-1 leading-normal">استعراض المواعيد المجدولة وتأكيد الحضور</p>
                      <ChevronRight className="w-4 h-4 absolute bottom-4 left-4 text-white/50 group-hover:text-white transition-all transform group-hover:-translate-x-1 rotate-180" />
                    </button>

                    {/* Card 3: My Treatments */}
                    <button
                      onClick={() => setActiveBentoWidget('treatments')}
                      className="group relative overflow-hidden bg-gradient-to-br from-cyan-600/90 to-blue-600/90 hover:to-blue-500 hover:from-cyan-500 p-5 rounded-3xl text-right transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-cyan-500/10 border border-white/10"
                    >
                      <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur">
                        <Stethoscope className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="font-black text-sm text-white">خطة العلاج والأسنان</h4>
                      <p className="text-[10px] text-white/70 font-semibold mt-1 leading-normal">تتبع سجل حالة أسنانك ونسبة إنجاز الجلسات</p>
                      <ChevronRight className="w-4 h-4 absolute bottom-4 left-4 text-white/50 group-hover:text-white transition-all transform group-hover:-translate-x-1 rotate-180" />
                    </button>

                    {/* Card 4: Clinic Info */}
                    <button
                      onClick={() => setActiveBentoWidget('info')}
                      className="group relative overflow-hidden bg-gradient-to-br from-teal-600/90 to-emerald-600/90 hover:to-emerald-500 hover:from-teal-500 p-5 rounded-3xl text-right transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-teal-500/10 border border-white/10"
                    >
                      <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur">
                        <Info className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="font-black text-sm text-white">حول وأطباء العيادة</h4>
                      <p className="text-[10px] text-white/70 font-semibold mt-1 leading-normal">ساعات العمل الرسمية، العناوين، والتواصل الهاتفي</p>
                      <ChevronRight className="w-4 h-4 absolute bottom-4 left-4 text-white/50 group-hover:text-white transition-all transform group-hover:-translate-x-1 rotate-180" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Expanded Bento Cards Workspace Panel */
                <Card className="flex-1 bg-white border border-gray-100 p-5 rounded-[2.5rem] shadow-2xl flex flex-col min-h-[500px]">
                  
                  {/* Expanded Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-gray-50 mb-4 shrink-0">
                    <button
                      onClick={() => setActiveBentoWidget('none')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-900 rounded-xl transition-all text-xs font-black"
                    >
                      <ArrowRight className="w-4 h-4" /> العودة للرئيسية
                    </button>
                    <span className="text-xs font-black text-teal-600">
                      {activeBentoWidget === 'booking' && 'طلب حجز موعد'}
                      {activeBentoWidget === 'appointments' && 'مواعيدي وجدول الزيارات'}
                      {activeBentoWidget === 'treatments' && 'الخطط العلاجية وحالة الأسنان'}
                      {activeBentoWidget === 'info' && 'معلومات وتفاصيل العيادة'}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar">
                    
                    {/* WIDGET 1: Booking Flow */}
                    {activeBentoWidget === 'booking' && (
                      <div className="space-y-4 text-right">
                        {bookingSuccess ? (
                          <div className="p-8 text-center space-y-4 animate-in zoom-in-95">
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                              <CheckCircle className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-black text-gray-900">طلب الحجز قيد المراجعة</h3>
                            <p className="text-xs text-gray-500 leading-relaxed font-bold">
                              تم تسجيل طلب الحجز بنجاح ليوم <span className="text-teal-600 font-black">{selectedDate}</span> الساعة <span className="text-teal-600 font-black">{formatTime12h(selectedTime)}</span>. سيتم مراجعته وتأكيده فوراً من قبل طاقم العيادة وإشعارك!
                            </p>
                            <button
                              onClick={() => { setBookingSuccess(false); setBookingType('none'); }}
                              className="px-6 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-black shadow-md hover:bg-teal-700 transition-all"
                            >
                              حجز موعد إضافي
                            </button>
                          </div>
                        ) : bookingType === 'none' ? (
                          <div className="space-y-4 py-8 text-center">
                            <h3 className="font-black text-gray-800 text-base">ما هو نوع الموعد الذي ترغب بحجزه؟</h3>
                            <div className="grid grid-cols-2 gap-4">
                              <button
                                onClick={() => { setBookingType('new'); setSelectedSpecialty(null); setSelectedDate(''); setSelectedTime(''); }}
                                className="p-6 border border-gray-100 hover:border-teal-500 bg-gray-50 hover:bg-teal-50/30 rounded-3xl transition-all group text-center flex flex-col items-center justify-center gap-3"
                              >
                                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-teal-600">
                                  <Calendar className="w-6 h-6" />
                                </div>
                                <span className="font-black text-sm text-gray-800 group-hover:text-teal-700">موعد كشف جديد</span>
                                <span className="text-[10px] text-gray-400">حجز كشف عام أو زيارة تخصصية جديدة</span>
                              </button>
                              <button
                                onClick={() => { setBookingType('followup'); setSelectedFollowupPlan(null); setSelectedFollowupSession(null); setSelectedDate(''); setSelectedTime(''); }}
                                className="p-6 border border-gray-100 hover:border-teal-500 bg-gray-50 hover:bg-teal-50/30 rounded-3xl transition-all group text-center flex flex-col items-center justify-center gap-3"
                              >
                                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-teal-600">
                                  <Stethoscope className="w-6 h-6" />
                                </div>
                                <span className="font-black text-sm text-gray-800 group-hover:text-teal-700">متابعة خطة علاج</span>
                                <span className="text-[10px] text-gray-400">حجز جلسة مجدولة ضمن خطتك القائمة</span>
                              </button>
                            </div>
                          </div>
                        ) : bookingType === 'new' ? (
                          /* Booking new slot */
                          <div className="space-y-4 animate-in fade-in">
                            {/* Step 1: Specialty */}
                            {!selectedSpecialty ? (
                              <div className="space-y-3">
                                <label className="block text-xs font-black text-gray-400 uppercase">1. اختر التخصص الطبي المطلوب</label>
                                <div className="grid grid-cols-2 gap-2">
                                  {DENTAL_SPECIALTIES.map(sp => (
                                    <button
                                      key={sp.id}
                                      onClick={() => setSelectedSpecialty(sp)}
                                      className="p-3 bg-gray-50 hover:bg-teal-50 border border-gray-100 hover:border-teal-200 rounded-2xl flex items-center gap-3 text-right transition-all group"
                                    >
                                      <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-teal-600 shadow-inner group-hover:scale-105 transition-all">
                                        <sp.icon className="w-5 h-5" />
                                      </div>
                                      <div>
                                        <div className="text-xs font-black text-gray-800">{sp.label}</div>
                                        <div className="text-[9px] text-gray-400 font-bold mt-0.5">احجز كشفاً مخصصاً</div>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : !selectedDate ? (
                              /* Step 2: Date Picker */
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <label className="block text-xs font-black text-gray-400 uppercase">2. اختر تاريخ الزيارة</label>
                                  <button onClick={() => setSelectedSpecialty(null)} className="text-[10px] font-bold text-teal-600 hover:underline">تعديل التخصص</button>
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                  {bookingDates.map((date, idx) => {
                                    const formatted = date.toDateString();
                                    const dayName = date.toLocaleDateString('ar-IQ', { weekday: 'short' });
                                    const dayNum = date.getDate();
                                    const monthName = date.toLocaleDateString('ar-IQ', { month: 'short' });
                                    return (
                                      <button
                                        key={idx}
                                        onClick={() => setSelectedDate(formatted)}
                                        className="p-3 bg-gray-50 hover:bg-teal-50 border border-gray-100 hover:border-teal-200 rounded-2xl text-center transition-all hover:scale-105"
                                      >
                                        <div className="text-[9px] text-gray-400 font-bold">{dayName}</div>
                                        <div className="text-lg font-black text-gray-800 my-0.5">{dayNum}</div>
                                        <div className="text-[9px] text-gray-400 font-bold">{monthName}</div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : !selectedTime ? (
                              /* Step 3: Time Picker */
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <label className="block text-xs font-black text-gray-400 uppercase">3. اختر وقت الحجز المفضل</label>
                                  <button onClick={() => setSelectedDate('')} className="text-[10px] font-bold text-teal-600 hover:underline">تعديل التاريخ</button>
                                </div>
                                <div className="flex bg-gray-50 p-1 rounded-xl mb-3">
                                  <button
                                    onClick={() => setTimePeriod('morning')}
                                    className={`flex-1 py-2 text-center text-xs font-black rounded-lg transition-all ${timePeriod === 'morning' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500'}`}
                                  >
                                    صباحاً
                                  </button>
                                  <button
                                    onClick={() => setTimePeriod('evening')}
                                    className={`flex-1 py-2 text-center text-xs font-black rounded-lg transition-all ${timePeriod === 'evening' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500'}`}
                                  >
                                    مساءً
                                  </button>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  {(timePeriod === 'morning' ? morningSlots : eveningSlots).map(slot => (
                                    <button
                                      key={slot}
                                      onClick={() => setSelectedTime(slot)}
                                      className="p-2.5 bg-gray-50 hover:bg-teal-500 hover:text-white border border-gray-100 hover:border-teal-500 rounded-xl text-center text-xs font-black transition-all"
                                    >
                                      {formatTime12h(slot)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              /* Step 4: Summary & Confirm */
                              <div className="space-y-4 bg-teal-50/30 p-4 border border-teal-100/60 rounded-3xl animate-in zoom-in-95">
                                <h4 className="font-black text-gray-800 text-sm pb-2 border-b border-teal-100">ملخص موعد الكشف الجديد</h4>
                                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                                  <div className="text-gray-400">التخصص الطبي:</div>
                                  <div className="font-black text-gray-800 text-left">{selectedSpecialty.label}</div>
                                  <div className="text-gray-400">التاريخ المختار:</div>
                                  <div className="font-black text-gray-800 text-left">{selectedDate}</div>
                                  <div className="text-gray-400">الوقت المحدد:</div>
                                  <div className="font-black text-gray-800 text-left">{formatTime12h(selectedTime)}</div>
                                </div>

                                <div className="space-y-2 mt-4">
                                  <label className="block text-xs font-black text-gray-500">أعراض أو ملاحظات إضافية</label>
                                  <textarea
                                    value={bookingNotes}
                                    onChange={e => setBookingNotes(e.target.value)}
                                    placeholder="اكتب أي معلومات ترغب بإعلام الطبيب بها قبل موعدك..."
                                    className="w-full p-3 bg-white border border-teal-200/50 focus:border-teal-500 rounded-xl text-xs font-bold focus:ring-1 focus:ring-teal-500 focus:outline-none min-h-[80px]"
                                  />
                                </div>

                                <div className="flex gap-2 pt-2">
                                  <button
                                    onClick={() => setSelectedTime('')}
                                    className="flex-1 py-3 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-black text-gray-500"
                                  >
                                    تعديل الوقت
                                  </button>
                                  <button
                                    disabled={bookingLoading}
                                    onClick={handleConfirmManualBooking}
                                    className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-lg shadow-teal-100 flex items-center justify-center gap-1.5"
                                  >
                                    {bookingLoading ? 'جاري التأكيد...' : 'إرسال طلب الحجز'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Booking followup active plan session */
                          <div className="space-y-4 animate-in fade-in">
                            {!selectedFollowupPlan ? (
                              <div className="space-y-3">
                                <label className="block text-xs font-black text-gray-400 uppercase">اختر الخطة العلاجية للمتابعة</label>
                                {treatmentsLoading ? (
                                  <div className="text-center py-4 text-xs text-gray-400">جاري تحميل الخطط...</div>
                                ) : treatmentPlans.length > 0 ? (
                                  <div className="space-y-2.5">
                                    {treatmentPlans.map(plan => (
                                      <button
                                        key={plan.id}
                                        onClick={() => setSelectedFollowupPlan(plan)}
                                        className="w-full p-4 border border-gray-100 hover:border-teal-200 bg-gray-50 hover:bg-white rounded-2xl text-right transition-all flex justify-between items-center group"
                                      >
                                        <div>
                                          <span className="text-[9px] bg-teal-50 px-2 py-0.5 border border-teal-100 text-teal-600 rounded-full font-black">السن رقم {plan.toothNumber || plan.toothNumbers?.join(',')}</span>
                                          <h4 className="font-black text-gray-900 text-xs mt-1.5">{plan.notes || 'متابعة علاج السن'}</h4>
                                          <p className="text-[10px] text-gray-400 font-bold mt-1">تاريخ البدء: {plan.startDate}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-black text-teal-600">{plan.progress}%</span>
                                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-teal-600 rotate-180" />
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-8 bg-gray-50 border border-gray-100 rounded-2xl text-xs text-gray-400 font-bold">
                                    لا توجد خطط علاجية نشطة مسجلة لك في هذه العيادة.
                                  </div>
                                )}
                              </div>
                            ) : !selectedFollowupSession ? (
                              /* Choose active plan phase session */
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <label className="block text-xs font-black text-gray-400 uppercase">اختر جلسة المتابعة المطلوبة</label>
                                  <button onClick={() => setSelectedFollowupPlan(null)} className="text-[10px] font-bold text-teal-600 hover:underline">تعديل الخطة</button>
                                </div>
                                <div className="space-y-2">
                                  {selectedFollowupPlan.sessions?.filter((s: any) => s.status !== 'completed').map((session: any) => (
                                    <button
                                      key={session.id}
                                      onClick={() => setSelectedFollowupSession(session)}
                                      className="w-full p-4 border border-gray-100 hover:border-teal-200 bg-gray-50 hover:bg-white rounded-2xl text-right transition-all flex justify-between items-center group"
                                    >
                                      <div>
                                        <h4 className="font-black text-gray-800 text-xs">الجلسة {session.number}: {session.title}</h4>
                                        <p className="text-[10px] text-gray-400 font-bold mt-1">المدة التقديرية: {session.duration} دقيقة</p>
                                      </div>
                                      <span className="px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg text-[9px] font-black">جاهزة للحجز</span>
                                    </button>
                                  ))}
                                  {(!selectedFollowupPlan.sessions || selectedFollowupPlan.sessions.filter((s: any) => s.status !== 'completed').length === 0) && (
                                    <div className="text-center py-8 bg-gray-50 border border-gray-100 rounded-2xl text-xs text-gray-400 font-bold">
                                      لقد أكملت جميع جلسات هذه الخطة العلاجية بنجاح! 
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : !selectedDate ? (
                              /* Date Selection */
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <label className="block text-xs font-black text-gray-400 uppercase">اختر تاريخ الجلسة</label>
                                  <button onClick={() => setSelectedFollowupSession(null)} className="text-[10px] font-bold text-teal-600 hover:underline">تعديل الجلسة</button>
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                  {bookingDates.map((date, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => setSelectedDate(date.toDateString())}
                                      className="p-3 bg-gray-50 hover:bg-teal-50 border border-gray-100 hover:border-teal-200 rounded-2xl text-center transition-all hover:scale-105"
                                    >
                                      <div className="text-[9px] text-gray-400 font-bold">{date.toLocaleDateString('ar-IQ', { weekday: 'short' })}</div>
                                      <div className="text-lg font-black text-gray-800 my-0.5">{date.getDate()}</div>
                                      <div className="text-[9px] text-gray-400 font-bold">{date.toLocaleDateString('ar-IQ', { month: 'short' })}</div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : !selectedTime ? (
                              /* Time selection */
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <label className="block text-xs font-black text-gray-400 uppercase">اختر الوقت المناسب للجلسة</label>
                                  <button onClick={() => setSelectedDate('')} className="text-[10px] font-bold text-teal-600 hover:underline">تعديل التاريخ</button>
                                </div>
                                <div className="flex bg-gray-50 p-1 rounded-xl mb-3">
                                  <button
                                    onClick={() => setTimePeriod('morning')}
                                    className={`flex-1 py-2 text-center text-xs font-black rounded-lg transition-all ${timePeriod === 'morning' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500'}`}
                                  >
                                    صباحاً
                                  </button>
                                  <button
                                    onClick={() => setTimePeriod('evening')}
                                    className={`flex-1 py-2 text-center text-xs font-black rounded-lg transition-all ${timePeriod === 'evening' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500'}`}
                                  >
                                    مساءً
                                  </button>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  {(timePeriod === 'morning' ? morningSlots : eveningSlots).map(slot => (
                                    <button
                                      key={slot}
                                      onClick={() => setSelectedTime(slot)}
                                      className="p-2.5 bg-gray-50 hover:bg-teal-500 hover:text-white border border-gray-100 hover:border-teal-500 rounded-xl text-center text-xs font-black transition-all"
                                    >
                                      {formatTime12h(slot)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              /* Summary & Confirm */
                              <div className="space-y-4 bg-teal-50/30 p-4 border border-teal-100/60 rounded-3xl animate-in zoom-in-95">
                                <h4 className="font-black text-gray-800 text-sm pb-2 border-b border-teal-100">تأكيد موعد المتابعة</h4>
                                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                                  <div className="text-gray-400">الخطة:</div>
                                  <div className="font-black text-gray-800 text-left truncate">{selectedFollowupPlan.notes}</div>
                                  <div className="text-gray-400">الجلسة:</div>
                                  <div className="font-black text-gray-800 text-left">{selectedFollowupSession.title}</div>
                                  <div className="text-gray-400">التاريخ:</div>
                                  <div className="font-black text-gray-800 text-left">{selectedDate}</div>
                                  <div className="text-gray-400">الوقت:</div>
                                  <div className="font-black text-gray-800 text-left">{formatTime12h(selectedTime)}</div>
                                </div>

                                <div className="space-y-2 mt-4">
                                  <label className="block text-xs font-black text-gray-500">أعراض أو ملاحظات إضافية</label>
                                  <textarea
                                    value={bookingNotes}
                                    onChange={e => setBookingNotes(e.target.value)}
                                    placeholder="أي أعراض جانبية أو تفاصيل إضافية تود إبلاغ الطبيب بها..."
                                    className="w-full p-3 bg-white border border-teal-200/50 focus:border-teal-500 rounded-xl text-xs font-bold focus:ring-1 focus:ring-teal-500 focus:outline-none min-h-[80px]"
                                  />
                                </div>

                                <div className="flex gap-2 pt-2">
                                  <button
                                    onClick={() => setSelectedTime('')}
                                    className="flex-1 py-3 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-black text-gray-500"
                                  >
                                    تعديل الوقت
                                  </button>
                                  <button
                                    disabled={bookingLoading}
                                    onClick={handleConfirmManualBooking}
                                    className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-lg shadow-teal-100 flex items-center justify-center gap-1.5"
                                  >
                                    {bookingLoading ? 'جاري التأكيد...' : 'تأكيد وحجز الجلسة'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* WIDGET 2: Appointments list */}
                    {activeBentoWidget === 'appointments' && (
                      <div className="space-y-3 text-right">
                        {clinicAppointments.length > 0 ? (
                          <div className="space-y-3">
                            {clinicAppointments.map((apt) => {
                              const isPast = new Date(apt.appointment_date) < new Date();
                              return (
                                <div key={apt.id} className={`p-4 rounded-2xl border ${isPast ? 'bg-gray-50/50 border-gray-100 opacity-70' : 'bg-teal-50/20 border-teal-100/50'} relative overflow-hidden flex items-center gap-4`}>
                                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${isPast ? 'bg-gray-100 text-gray-400' : 'bg-teal-600 text-white'}`}>
                                    <Calendar className="w-5 h-5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                      <h4 className="font-black text-xs text-gray-900 truncate">{apt.type || 'موعد كشف'}</h4>
                                      <span className={`px-2 py-0.5 rounded text-[8px] font-black border ${
                                        apt.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                        apt.status === 'completed' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                        apt.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                                      }`}>
                                        {apt.status === 'confirmed' ? 'مؤكد' : apt.status === 'completed' ? 'مكتمل' : apt.status === 'pending' ? 'بانتظار التأكيد' : 'ملغي'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] text-gray-400 font-bold mt-1">
                                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-teal-600" />{apt.appointment_date} الساعة {formatTime12h(apt.appointment_time)}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-10 bg-gray-50 border border-gray-100 rounded-3xl text-xs text-gray-400 font-bold">
                            لا توجد مواعيد مجدولة أو زيارات سابقة مسجلة في هذه العيادة.
                          </div>
                        )}
                      </div>
                    )}

                    {/* WIDGET 3: Treatment Plans & Teeth Chart */}
                    {activeBentoWidget === 'treatments' && (
                      <div className="space-y-4 text-right">
                        {treatmentsLoading ? (
                          <div className="text-center py-8 text-xs text-gray-400">جاري تحميل الخطط العلاجية...</div>
                        ) : treatmentPlans.length > 0 ? (
                          <div className="space-y-4">
                            {/* Teeth status summary box */}
                            <div className="p-4 bg-slate-900 text-white rounded-3xl border border-slate-700 shadow-lg">
                              <h4 className="font-black text-xs text-teal-400 mb-2.5 flex items-center gap-1.5"><Activity className="w-4 h-4" /> ملخص حالة الأسنان العلاجية</h4>
                              <div className="flex gap-4 overflow-x-auto pb-1 text-[9px] font-bold">
                                {treatmentPlans.map(plan => (
                                  <div key={plan.id} className="shrink-0 bg-slate-800/80 p-2 rounded-xl border border-slate-700 text-center min-w-[70px]">
                                    <div className="text-teal-400 font-black text-xs">#{plan.toothNumber || plan.toothNumbers?.join(',')}</div>
                                    <div className="text-white mt-1">{plan.type}</div>
                                    <div className="text-slate-400 mt-0.5">{plan.status === 'completed' ? 'مكتمل' : 'نشط'}</div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Detailed treatment plans */}
                            <div className="space-y-3">
                              {treatmentPlans.map(plan => (
                                <div key={plan.id} className="p-4 border border-gray-100 bg-gray-50 rounded-3xl relative overflow-hidden space-y-3">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <span className="px-2 py-0.5 bg-teal-50 text-teal-600 border border-teal-100 rounded-full text-[9px] font-black">السن رقم {plan.toothNumber || plan.toothNumbers?.join(',')}</span>
                                      <h4 className="font-black text-xs text-gray-900 mt-2">{plan.notes || 'خطة علاج السن'}</h4>
                                    </div>
                                    <div className="text-left">
                                      <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-1 rounded-lg">{plan.progress}% إنجاز</span>
                                    </div>
                                  </div>

                                  {/* Progress bar */}
                                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                                    <div className="bg-gradient-to-r from-teal-500 to-cyan-500 h-full transition-all duration-500" style={{ width: `${plan.progress}%` }}></div>
                                  </div>

                                  <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold border-t border-gray-100/60 pt-2.5">
                                    <span>الجلسات: {plan.completedSessions} من {plan.totalSessions}</span>
                                    <span>تاريخ البدء: {plan.startDate}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-10 bg-gray-50 border border-gray-100 rounded-3xl text-xs text-gray-400 font-bold">
                            لا توجد خطط علاجية أو تقارير أسنان نشطة مسجلة لك حالياً في هذه العيادة.
                          </div>
                        )}
                      </div>
                    )}

                    {/* WIDGET 4: Clinic Info */}
                    {activeBentoWidget === 'info' && (
                      <div className="space-y-4 text-right">
                        <div className="p-5 border border-gray-100 bg-gray-50 rounded-3xl flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-teal-600/10 text-teal-600 flex items-center justify-center shrink-0 shadow-inner">
                            <Building2 className="w-7 h-7" />
                          </div>
                          <div>
                            <h4 className="font-black text-sm text-gray-900">{selectedClinic.name}</h4>
                            <p className="text-[10px] text-gray-400 font-bold mt-1">{selectedClinic.governorate} - {selectedClinic.address}</p>
                          </div>
                        </div>

                        <div className="bg-gray-50 p-4 border border-gray-100 rounded-3xl space-y-3 text-xs">
                          <div className="flex justify-between items-center py-1 border-b border-gray-100/60">
                            <span className="text-gray-400">ساعات العمل:</span>
                            <span className="font-black text-gray-800" dir="ltr">{selectedClinic.working_hours || '09:00 - 18:00'}</span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-b border-gray-100/60">
                            <span className="text-gray-400">أطباء العيادة:</span>
                            <span className="font-black text-gray-800">{selectedClinic.description || 'فريق نخبة من الأطباء الاختصاصيين'}</span>
                          </div>
                          <div className="flex justify-between items-center py-1">
                            <span className="text-gray-400">رقم الهاتف للتواصل:</span>
                            <a href={`tel:${selectedClinic.phone}`} className="font-black text-teal-600 hover:underline flex items-center gap-1" dir="ltr">
                              {selectedClinic.phone} <Phone className="w-3 h-3" />
                            </a>
                          </div>
                        </div>

                        {selectedClinic.address && (
                          <a
                            href={`https://maps.google.com/?q=${encodeURIComponent(selectedClinic.governorate + ' ' + selectedClinic.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-3 bg-gray-900 text-white rounded-2xl text-xs font-black hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                          >
                            <MapPin className="w-4 h-4 text-teal-500" /> عرض موقع العيادة على الخريطة <ExternalLink className="w-3.5 h-3.5 text-white/50" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </div>

            {/* Right Column (Desktop: 58% width) - Premium Unified Chat & AI Assistant Viewport */}
            <div className={`w-full lg:w-[58%] h-[calc(100vh-280px)] min-h-[550px] flex flex-col ${mobileTab === 'chat' ? 'flex' : 'hidden lg:flex'}`}>
              <Card className="flex-1 flex flex-col overflow-hidden bg-white border-gray-100 shadow-2xl relative rounded-[2.5rem]">
                
                {/* Chat header */}
                <div className="p-4 sm:p-5 border-b border-gray-50 flex items-center justify-between bg-white z-10 shadow-sm shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedClinic(null)}
                      className="p-2 hover:bg-gray-50 rounded-xl transition-colors text-gray-400 hover:text-teal-600"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                    <div className="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 shrink-0 shadow-inner overflow-hidden">
                      {selectedClinic.image_url ? (
                        <img src={selectedClinic.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <MessageCircle className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-black text-gray-900 text-xs sm:text-sm leading-tight">{selectedClinic.name}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <p className="text-[9px] text-emerald-600 font-bold">المساعد والدردشة نشطة</p>
                      </div>
                    </div>
                  </div>

                  {/* AI Assistant Badge */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 border border-teal-100 rounded-xl shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
                    <span className="text-[10px] font-black text-teal-700">مساعد العيادة الذكي (AI)</span>
                  </div>
                </div>

                {/* Mini Bento Grid Actions Row */}
                <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-teal-50/20 border-b border-gray-100/50 flex overflow-x-auto gap-2.5 scrollbar-hide shrink-0 z-10">
                  {/* Button 1: حجز موعد */}
                  <button
                    onClick={() => { setActiveBentoWidget('booking'); setBookingType('none'); setBookingSuccess(false); }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-2xl transition-all font-black text-xs shrink-0 ${
                      activeBentoWidget === 'booking'
                        ? 'bg-gradient-to-r from-indigo-600 to-teal-600 text-white shadow-md shadow-indigo-100 scale-105 border border-transparent'
                        : 'bg-white hover:bg-indigo-50/50 border border-gray-100 text-gray-700 hover:text-indigo-600'
                    }`}
                  >
                    <Calendar className={`w-4 h-4 ${activeBentoWidget === 'booking' ? 'text-white' : 'text-indigo-500'}`} />
                    <span>حجز موعد</span>
                  </button>

                  {/* Button 2: مواعيدي */}
                  <button
                    onClick={() => setActiveBentoWidget('appointments')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-2xl transition-all font-black text-xs shrink-0 ${
                      activeBentoWidget === 'appointments'
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-100 scale-105 border border-transparent'
                        : 'bg-white hover:bg-purple-50/50 border border-gray-100 text-gray-700 hover:text-purple-600'
                    }`}
                  >
                    <Clock className={`w-4 h-4 ${activeBentoWidget === 'appointments' ? 'text-white' : 'text-purple-500'}`} />
                    <span>مواعيدي والزيارات</span>
                  </button>

                  {/* Button 3: خطتي العلاجية */}
                  <button
                    onClick={() => setActiveBentoWidget('treatments')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-2xl transition-all font-black text-xs shrink-0 ${
                      activeBentoWidget === 'treatments'
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-100 scale-105 border border-transparent'
                        : 'bg-white hover:bg-cyan-50/50 border border-gray-100 text-gray-700 hover:text-cyan-600'
                    }`}
                  >
                    <Activity className={`w-4 h-4 ${activeBentoWidget === 'treatments' ? 'text-white' : 'text-cyan-500'}`} />
                    <span>الخطة العلاجية والأسنان</span>
                  </button>

                  {/* Button 4: تفاصيل العيادة */}
                  <button
                    onClick={() => setActiveBentoWidget('info')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-2xl transition-all font-black text-xs shrink-0 ${
                      activeBentoWidget === 'info'
                        ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-100 scale-105 border border-transparent'
                        : 'bg-white hover:bg-teal-50/50 border border-gray-100 text-gray-700 hover:text-teal-600'
                    }`}
                  >
                    <Info className={`w-4 h-4 ${activeBentoWidget === 'info' ? 'text-white' : 'text-teal-500'}`} />
                    <span>أطباء ومعلومات العيادة</span>
                  </button>
                </div>

                {/* Voice Session Pulsing banner when connecting or talking */}
                {voiceMode && (
                  <div className="bg-gradient-to-r from-slate-900 to-teal-950 px-4 py-2 flex items-center justify-between border-b border-teal-500/20 text-white shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="relative flex h-3 w-3 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </div>
                      <span className="text-[10px] font-black text-slate-200">المساعد الصوتي متصل... تكلم الآن</span>
                    </div>
                    <button
                      onClick={stopVoiceMode}
                      className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/30 rounded-lg text-[9px] font-black transition-all"
                    >
                      إنهاء الجلسة الصوتية
                    </button>
                  </div>
                )}

                {/* Messages logs threads */}
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-gray-50/30 custom-scrollbar">
                  {aiLoadingHistory && aiMessages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-gray-400">جاري تحميل أرشيف المحادثة...</div>
                  ) : (
                    aiMessages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                        <div className={`max-w-[85%] p-4 rounded-[1.5rem] shadow-sm ${msg.role === 'user'
                          ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-none'
                          : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                        }`}>
                          <div className="flex items-center gap-1.5 mb-1.5 shrink-0">
                            {msg.role === 'user' ? (
                              <User className="w-3.5 h-3.5 text-white/70" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                            )}
                            <span className="text-[9px] font-bold opacity-60">{msg.role === 'user' ? 'أنت' : 'مساعد العيادة الذكي'}</span>
                          </div>
                          <p className="text-xs sm:text-sm leading-relaxed font-semibold whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Typing / Loading Indicators */}
                  {aiLoading && (
                    <div className="flex justify-start animate-pulse">
                      <div className="bg-white border border-gray-100 p-4 rounded-[1.5rem] rounded-tl-none flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-bounce"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-bounce delay-100"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-bounce delay-200"></span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-gray-50 bg-white shrink-0">
                  <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-[1.5rem] border border-gray-100 focus-within:ring-2 focus-within:ring-teal-500 focus-within:bg-white transition-all">
                    
                    {/* Pulsing Voice Microphone trigger */}
                    <button
                      onClick={voiceMode ? stopVoiceMode : startVoiceMode}
                      disabled={isConnectingVoice}
                      className={`p-2.5 rounded-xl transition-all relative overflow-hidden ${
                        voiceMode
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'text-gray-400 hover:text-teal-600 hover:bg-teal-50'
                      }`}
                      title={voiceMode ? 'إيقاف المساعد الصوتي' : 'تفعيل المساعد الصوتي (ElevenLabs)'}
                    >
                      {isConnectingVoice ? (
                        <RefreshCw className="w-5 h-5 animate-spin text-teal-600" />
                      ) : voiceMode ? (
                        <MicOff className="w-5 h-5" />
                      ) : (
                        <Mic className="w-5 h-5" />
                      )}
                    </button>

                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      placeholder={aiTextMode ? "اكتب سؤالاً لمساعد الذكاء الاصطناعي..." : "اكتب رسالة للعيادة هنا..."}
                      className="flex-1 bg-transparent border-none focus:outline-none text-xs sm:text-sm px-2 py-2 font-bold"
                    />

                    <button
                      onClick={handleSend}
                      disabled={!messageText.trim()}
                      className="p-3 bg-teal-600 text-white rounded-xl shadow-lg shadow-teal-100 hover:bg-teal-700 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </Card>
            </div>

          </div>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
};
