import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConversation } from '@elevenlabs/react';
import {
  Brain, MessageCircle, User, Image as ImageIcon, X, MapPin, Calendar as CalendarIcon,
  Mic, Volume2, Send, Phone, Check, ChevronLeft, ChevronRight, Sparkles, Stethoscope, Baby, Scissors,
  Smile, Activity, Crown, Clock, PhoneOff, Loader2, Heart, Bone, Pill, AlertCircle
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { aiService } from '../../services/ai/AIService';
import { usePublicClinics } from '../../hooks/usePublicClinics';
import { Clinic } from '../../types';
import { supabase } from '../../lib/supabase';

const ELEVENLABS_AGENT_ID = 'agent_9501kqetfd9jf9hrqaxnp79yffak';

const SPECIALTIES = [
  { id: 'general', label: 'طب أسنان عام', icon: Stethoscope, color: 'from-blue-600 to-blue-400', keys: ['عام', 'كشف', 'general', 'أسنان عام'] },
  { id: 'ortho', label: 'تقويم الأسنان', icon: Smile, color: 'from-blue-500 to-cyan-500', keys: ['تقويم', 'orthodontic'] },
  { id: 'kids', label: 'طب أسنان أطفال', icon: Baby, color: 'from-cyan-500 to-teal-400', keys: ['أطفال', 'اطفال', 'pediatric', 'أسنان أطفال'] },
  { id: 'root', label: 'علاج الجذور', icon: Heart, color: 'from-indigo-500 to-blue-500', keys: ['جذور', 'root canal', 'علاج الجذور'] },
  { id: 'gum', label: 'لثة وأنسجة داعمة', icon: Activity, color: 'from-blue-500 to-sky-400', keys: ['لثة', 'أنسجة', 'periodontal', 'اللثة'] },
  { id: 'implant', label: 'زراعة الأسنان', icon: Bone, color: 'from-slate-600 to-blue-500', keys: ['زراعة', 'implant'] },
  { id: 'surgery', label: 'جراحة وجه وفكين', icon: Scissors, color: 'from-sky-600 to-blue-600', keys: ['جراحة', 'فكين', 'surgery', 'وجه'] },
  { id: 'cosmetic', label: 'تجميل الأسنان', icon: Crown, color: 'from-teal-600 to-cyan-500', keys: ['تجميل', 'تبييض', 'cosmetic', 'فينير'] },
];

const GOVERNORATES = [
  'بغداد', 'البصرة', 'نينوى', 'أربيل', 'النجف', 'كربلاء', 'ديالى',
  'كركوك', 'ذي قار', 'ميسان', 'المثنى', 'الأنبار', 'بابل',
  'صلاح الدين', 'واسط', 'القادسية', 'دهوك', 'السليمانية',
];

// English / city / variant aliases -> canonical Arabic name
const GOV_ALIASES: Record<string, string> = {
  'baghdad': 'بغداد', 'بغداد محافظة': 'بغداد', 'محافظة بغداد': 'بغداد',
  'basra': 'البصرة', 'basrah': 'البصرة', 'بصرة': 'البصرة',
  'mosul': 'نينوى', 'الموصل': 'نينوى', 'موصل': 'نينوى', 'ninawa': 'نينوى', 'nineveh': 'نينوى',
  'erbil': 'أربيل', 'arbil': 'أربيل', 'هولير': 'أربيل', 'اربيل': 'أربيل',
  'najaf': 'النجف',
  'karbala': 'كربلاء', 'kerbala': 'كربلاء',
  'diyala': 'ديالى', 'بعقوبة': 'ديالى',
  'kirkuk': 'كركوك',
  'thiqar': 'ذي قار', 'dhi qar': 'ذي قار', 'الناصرية': 'ذي قار', 'ناصرية': 'ذي قار',
  'maysan': 'ميسان', 'missan': 'ميسان', 'العمارة': 'ميسان', 'عمارة': 'ميسان',
  'muthanna': 'المثنى', 'السماوة': 'المثنى', 'سماوة': 'المثنى',
  'anbar': 'الأنبار', 'الانبار': 'الأنبار', 'الرمادي': 'الأنبار', 'رمادي': 'الأنبار', 'الفلوجة': 'الأنبار',
  'babil': 'بابل', 'babylon': 'بابل', 'الحلة': 'بابل', 'حلة': 'بابل',
  'saladin': 'صلاح الدين', 'salahuddin': 'صلاح الدين', 'salah al-din': 'صلاح الدين',
  'تكريت': 'صلاح الدين', 'سامراء': 'صلاح الدين',
  'wasit': 'واسط', 'الكوت': 'واسط', 'كوت': 'واسط',
  'qadisiyyah': 'القادسية', 'qadisiya': 'القادسية', 'الديوانية': 'القادسية', 'ديوانية': 'القادسية',
  'duhok': 'دهوك', 'dohuk': 'دهوك',
  'sulaymaniyah': 'السليمانية', 'sulaimaniyah': 'السليمانية', 'السليمانيه': 'السليمانية',
};

// Normalize any governorate string (Arabic/English/with suffix "محافظة") to canonical
function normalizeGov(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  const lower = trimmed.toLowerCase();
  if (GOV_ALIASES[lower]) return GOV_ALIASES[lower];
  // Strip trailing/leading "محافظة"
  const stripped = trimmed.replace(/^محافظة\s+/, '').replace(/\s+محافظة$/, '').trim();
  for (const g of GOVERNORATES) {
    if (stripped === g || stripped.includes(g) || g.includes(stripped)) return g;
  }
  for (const [alias, canonical] of Object.entries(GOV_ALIASES)) {
    if (lower.includes(alias) || alias.includes(lower)) return canonical;
  }
  return null;
}

type Step = 'intro' | 'specialty' | 'governorate' | 'clinics' | 'date' | 'time' | 'patient' | 'confirmed' | 'register' | 'completed' | 'guest_confirmed';

type CardKind =
  | { kind: 'specialty' }
  | { kind: 'governorate' }
  | { kind: 'clinics'; clinics: Clinic[] }
  | { kind: 'date' }
  | { kind: 'time' }
  | { kind: 'patient' }
  | { kind: 'confirmation' }
  | { kind: 'register' }
  | { kind: 'completed' }
  | { kind: 'guest_confirmed' };

type ChatMessage = {
  id: string;
  role: 'user' | 'ai';
  content: string;
  image?: string | null;
  card?: CardKind;
};

interface BookingState {
  specialty?: typeof SPECIALTIES[number];
  governorate?: string;
  clinic?: Clinic;
  date?: string;
  time?: string;
  patient: { name: string; phone: string; age: string; gender: 'male' | 'female' | '' };
}

const TIME_SLOTS = {
  morning: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00'],
  evening: ['16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'],
};

export const SmartDiagnosisPage: React.FC = () => {
  const navigate = useNavigate();
  const { clinics } = usePublicClinics();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // ElevenLabs WebSocket refs — raw PCM16 pipeline (NO MediaRecorder/WebM)
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);      // output (24kHz)
  const inputAudioCtxRef = useRef<AudioContext | null>(null); // input (16kHz)
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const micStreamRef = useRef<MediaStream | null>(null);
  const [lastVoiceMsg, setLastVoiceMsg] = useState<string>('');
  const [input, setInput] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>('intro');
  const [voiceMode, setVoiceMode] = useState(false);
  const voiceModeRef = useRef(false);
  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);
  const [isConnectingVoice, setIsConnectingVoice] = useState(false);
  const [booking, setBooking] = useState<BookingState>({
    patient: { name: '', phone: '', age: '', gender: '' }
  });
  const [sessionId] = useState<string>(() => {
    let sid = localStorage.getItem('smart_diagnosis_session_id');
    if (!sid) { sid = crypto.randomUUID(); localStorage.setItem('smart_diagnosis_session_id', sid); }
    return sid;
  });

  const [createdAppointmentId, setCreatedAppointmentId] = useState<number | null>(null);
  const [registerPassword, setRegisterPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);
  const initialMessageSent = useRef(false);

  // Refs to bookingState/clinics for ElevenLabs client tools (closures)
  const bookingRef = useRef(booking);
  const clinicsRef = useRef(clinics);
  useEffect(() => { bookingRef.current = booking; }, [booking]);
  useEffect(() => { clinicsRef.current = clinics; }, [clinics]);

  // Initial greeting + first card
  useEffect(() => {
    if (messages.length === 0 && !initialMessageSent.current) {
      initialMessageSent.current = true;
      pushAi('أنا المساعد الذكي لمنصة طب الأسنان ، أساعدك في إيجاد أفضل عيادة لحالتك.', { kind: 'specialty' });
      setStep('specialty');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const pushAi = (content: string, card?: CardKind) => {
    // نستخدم القيمة المباشرة لـ voiceModeRef لتجنب مشاكل Closure
    // البطاقات يجب أن تظهر دائماً في الدردشة حتى في وضع الصوت
    if (voiceModeRef.current && !card) {
      setLastVoiceMsg(content.replace('🎙️ ', ''));
      return;
    }
    
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'ai', content, card }]);
    
    if (voiceModeRef.current && content) {
      setLastVoiceMsg(content.replace('🎙️ ', ''));
    }
  };

  const pushUser = (content: string, image?: string | null) =>
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content, image }]);

  // استخدام Refs للوظائف لضمان وصولها للـ WebSocket بأحدث نسخة (تجنباً لمشاكل Stale Closure)
  const pushAiRef = useRef(pushAi);
  const pushUserRef = useRef(pushUser);
  const handleSpecialtyRef = useRef<(sp: typeof SPECIALTIES[number], isVoice?: boolean) => void>(() => {});
  const handleGovernorateRef = useRef<(gov: string, isVoice?: boolean) => void>(() => {});
  const handleClinicRef = useRef<(c: Clinic) => void>(() => {});
  const handleDateRef = useRef<(iso: string, label: string) => void>(() => {});
  const handleTimeRef = useRef<(t: string) => void>(() => {});
  const handleConfirmBookingRef = useRef<() => Promise<void>>(async () => {});
  const showGovernorateCardRef = useRef<(label?: string) => void>(() => {});
  const showDateCardRef = useRef<() => void>(() => {});
  const showTimeCardRef = useRef<() => void>(() => {});
  const showPatientCardRef = useRef<() => void>(() => {});
  const showConfirmationCardRef = useRef<() => void>(() => {});
  useEffect(() => {
    pushAiRef.current = pushAi;
    pushUserRef.current = pushUser;
  });

  // Filter clinics by current selection
  const filteredClinics = useMemo(() => {
    let list = clinics;
    if (booking.governorate) list = list.filter(c => (c.governorate || '').includes(booking.governorate!));
    if (booking.specialty) {
      const keys = booking.specialty.keys;
      list = list.filter(c =>
        c.specialties?.some(s => keys.some(k => s.toLowerCase().includes(k.toLowerCase()))) ||
        c.services?.some(s => keys.some(k => s.toLowerCase().includes(k.toLowerCase())))
      );
    }
    return list.slice(0, 8);
  }, [clinics, booking.governorate, booking.specialty]);

  // ============== Step Handlers ==============
  const handleSpecialty = (sp: typeof SPECIALTIES[number], isVoice = false) => {
    setBooking(prev => ({ ...prev, specialty: sp }));
    if (!isVoice) pushUser(`أحتاج ${sp.label}`);

    setStep('governorate');
    // For manual clicks, immediately show the governorate card.
    // For voice, the agent must explicitly call `show_governorate` to render the card.
    if (!isVoice) {
      pushAi(`📋 تم اختيار ${sp.label}. يرجى اختيار المحافظة:`, { kind: 'governorate' });
    }
  };

  // Show the governorate selection card (used by voice agent via show_governorate tool)
  const showGovernorateCard = (specialtyLabel?: string) => {
    setStep('governorate');
    const label = specialtyLabel || booking.specialty?.label;
    const msg = label
      ? `📋 اختصاص ${label} — يرجى اختيار المحافظة من البطاقة:`
      : 'يرجى اختيار المحافظة من البطاقة:';
    pushAi(msg, { kind: 'governorate' });
  };

  const handleGovernorate = (gov: string, isVoice = false) => {
    setBooking(prev => ({ ...prev, governorate: gov }));
    if (!isVoice) pushUser(`أنا في ${gov}`);

    setStep('clinics');
    const allClinics = clinicsRef.current;
    const sp = bookingRef.current.specialty;
    // Normalize each clinic governorate before comparing
    let filtered = allClinics.filter(c => normalizeGov(c.governorate) === gov);
    if (sp) {
      const keys = sp.keys;
      const matchSpec = filtered.filter(c =>
        c.specialties?.some(s => keys.some(k => s.toLowerCase().includes(k.toLowerCase()))) ||
        c.services?.some(s => keys.some(k => s.toLowerCase().includes(k.toLowerCase())))
      );
      if (matchSpec.length > 0) filtered = matchSpec;
    }
    const list = filtered.slice(0, 8);
    const statusMsg = list.length > 0
      ? `📍 محافظة ${gov} — وجدت ${list.length} عيادة${sp ? ` متخصصة في ${sp.label}` : ''}:`
      : `📍 محافظة ${gov} — لا توجد عيادات مسجّلة حالياً في هذه المحافظة. جاري عرض العيادات المتاحة:`;
    const finalList = list.length > 0 ? list : allClinics.slice(0, 8);
    pushAi(statusMsg, { kind: 'clinics', clinics: finalList });
  };

  const handleClinic = (clinic: Clinic) => {
    setBooking(prev => ({ ...prev, clinic }));
    pushUser(`اخترت ${clinic.name}`);
    pushAi(`اختيار رائع! 👏\nالآن اختر اليوم المناسب لموعدك:`, { kind: 'date' });
    setStep('date');
  };

  const handleDate = (dateISO: string, label: string) => {
    setBooking(prev => ({ ...prev, date: dateISO }));
    pushUser(`أريد يوم ${label}`);
    setTimeout(() => {
      pushAi('اختر الوقت المفضل لك:', { kind: 'time' });
      setStep('time');
    }, 300);
  };

  const handleTime = (time: string) => {
    setBooking(prev => ({ ...prev, time }));
    pushUser(`الساعة ${time}`);
    setTimeout(() => {
      pushAi('ممتاز! آخر خطوة — أدخل بياناتك لتأكيد الحجز:', { kind: 'patient' });
      setStep('patient');
    }, 300);
  };

  // Cards-only helpers for voice agent (show specific card without changing data)
  const showDateCard = () => { setStep('date'); pushAi('اختر اليوم المناسب لموعدك:', { kind: 'date' }); };
  const showTimeCard = () => { setStep('time'); pushAi('اختر الوقت المفضل:', { kind: 'time' }); };
  const showPatientCard = () => { setStep('patient'); pushAi('أدخل بياناتك لتأكيد الحجز:', { kind: 'patient' }); };
  const showConfirmationCard = () => {
    const b = bookingRef.current;
    pushAi(`📋 ملخص الحجز:\n${b.clinic?.name || ''} — ${b.date || ''} ${b.time || ''}`, { kind: 'confirmation' });
  };

  const handleConfirmBooking = async () => {
    const b = bookingRef.current;
    if (!b.clinic || !b.date || !b.time || !b.patient.name || !b.patient.phone) return;
    setIsLoading(true);
    try {
      const dateObj = new Date(b.date);
      const offset = dateObj.getTimezoneOffset();
      const adjusted = new Date(dateObj.getTime() - offset * 60 * 1000);
      const formattedDate = adjusted.toISOString().split('T')[0];

      const { data, error } = await supabase.from('appointments').insert({
        clinic_id: parseInt(b.clinic.id),
        patient_name: b.patient.name,
        doctor_name: 'سيتم التحديد من العيادة',
        appointment_date: formattedDate,
        appointment_time: b.time,
        type: `${b.specialty?.label || 'كشف عام'} (مساعد ذكي)`,
        treatment_type: b.specialty?.label || 'كشف عام',
        status: 'pending',
        notes: `حجز عبر المساعد الذكي\nالعمر: ${b.patient.age || '—'}\nالجنس: ${b.patient.gender === 'male' ? 'ذكر' : b.patient.gender === 'female' ? 'أنثى' : '—'}\nالمحافظة: ${b.governorate || '—'}`,
        phone_number: b.patient.phone,
        cost: 0,
      }).select('id').single();
      if (error) throw error;

      if (data) {
        setCreatedAppointmentId(data.id);
      }

      pushAi(`تم تأكيد حجزك بنجاح! ✅\n\n**${b.clinic.name}**\n📅 ${formattedDate}\n🕐 ${b.time}\n📞 ستتواصل معك العيادة قريباً على ${b.patient.phone}`, { kind: 'register' });
      setStep('register');
    } catch (e) {
      console.error(e);
      pushAi('عذراً، حدث خطأ أثناء الحجز. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterAccount = async () => {
    const b = bookingRef.current;
    if (!registerPassword || registerPassword.length < 6) {
      setRegisterError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    setRegisterError('');
    setIsRegistering(true);
    try {
      const phoneDigits = b.patient.phone.replace(/\D/g, '');
      const syntheticEmail = `${phoneDigits}@patient.smartdental.com`;
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: syntheticEmail,
        password: registerPassword,
        options: {
          data: {
            full_name: b.patient.name,
            role: 'patient',
            phone: b.patient.phone
          }
        }
      });

      if (signUpError) throw signUpError;

      if (signUpData.user) {
        const newUserId = signUpData.user.id;
        
        // Create user profile in profiles table
        const { error: profileError } = await supabase.from('profiles').insert({
          id: newUserId,
          email: syntheticEmail,
          full_name: b.patient.name,
          role: 'patient',
          phone: b.patient.phone
        });

        if (profileError) {
          console.error('[profiles creation error]:', profileError);
        }

        // Link the appointment
        if (createdAppointmentId) {
          const { error: linkError } = await supabase.from('appointments')
            .update({ patient_user_id: newUserId })
            .eq('id', createdAppointmentId);
            
          if (linkError) {
            console.error('[linking error]:', linkError);
          }
        }
        
        pushAi('تم إنشاء حساب لك بنجاح! 🎉 أدخل مركز المراجعين لتتبع حالتك ورؤية مواعيدك.', { kind: 'completed' });
        setStep('completed');
      } else {
        throw new Error('تعذر إنشاء الحساب');
      }
    } catch (err: any) {
      console.error('Registration failed:', err);
      setRegisterError(err?.message || 'حدث خطأ غير متوقع أثناء إنشاء الحساب. يرجى المحاولة لاحقاً.');
    } finally {
      setIsRegistering(false);
    }
  };

  // تحديث جميع Refs الخاصة بالـ handlers في كل render لضمان عدم وجود Stale Closures داخل WebSocket
  useEffect(() => {
    handleSpecialtyRef.current = handleSpecialty;
    handleGovernorateRef.current = handleGovernorate;
    handleClinicRef.current = handleClinic;
    handleDateRef.current = handleDate;
    handleTimeRef.current = handleTime;
    handleConfirmBookingRef.current = handleConfirmBooking;
    showGovernorateCardRef.current = showGovernorateCard;
    showDateCardRef.current = showDateCard;
    showTimeCardRef.current = showTimeCard;
    showPatientCardRef.current = showPatientCard;
    showConfirmationCardRef.current = showConfirmationCard;
  });


  const handleSendMessage = async () => {
    if ((!input.trim() && !imagePreview) || isLoading) return;
    const userText = input;
    const img = imagePreview;

    // 1. إذا كان المساعد الصوتي فعالاً، نرسل النص لخادم ElevenLabs مباشرة
    if (voiceMode && wsRef.current?.readyState === WebSocket.OPEN) {
      pushUser(userText);
      setInput('');
      setImagePreview(null);
      // إرسال النص كرسالة مقاطعة/تفاعل مع المساعد الصوتي بدلاً من المساعد الذكي
      wsRef.current.send(JSON.stringify({ type: 'user_message', text: userText }));
      return;
    }

    // 2. إذا لم يكن المساعد الصوتي فعالاً، نرسله لمساعد الذكاء الاصطناعي (LLM) كالمعتاد
    pushUser(userText, img);
    setInput(''); setImagePreview(null);
    setIsLoading(true);
    try {
      let base64: string | undefined, mime: string | undefined;
      if (img) {
        const m = img.match(/^data:(image\/[^;]+);base64,(.+)$/);
        if (m) { mime = m[1]; base64 = m[2]; }
      }
      const history = messages.filter(m => m.content).slice(-12).map(m => ({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const, content: m.content
      }));
      const response = await aiService.chat(
        'patient_assistant',
        userText || 'حلل الصورة المرفقة',
        { booking: bookingRef.current, step },
        undefined, undefined, sessionId,
        base64, mime, history
      );
      pushAi(response);
    } catch (e) {
      pushAi('عذراً حدث خطأ، حاول مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const toggleListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const r = new SR(); r.lang = 'ar-IQ'; r.interimResults = true;
    r.onresult = (ev: any) => setInput(Array.from(ev.results).map((x: any) => x[0]?.transcript).join(' '));
    r.onend = () => setIsListening(false);
    recognitionRef.current = r; setIsListening(true); r.start();
  };

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[*_#`>]/g, ''));
    u.lang = 'ar-IQ'; window.speechSynthesis.speak(u);
  };

  // (useConversation hook removed since we use raw WebSocket now)


  // ─── Decode + play PCM16 (24kHz) coming from ElevenLabs ─────────────────
  const playNextChunk = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0 || !audioCtxRef.current) return;
    isPlayingRef.current = true;
    const raw = audioQueueRef.current.shift()!;
    try {
      // ElevenLabs sends PCM_16000 or PCM_24000 (Int16, little-endian)
      const int16 = new Int16Array(raw);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;

      const ctx = audioCtxRef.current;
      const buf = ctx.createBuffer(1, float32.length, ctx.sampleRate);
      buf.copyToChannel(float32, 0);

      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.onended = () => { isPlayingRef.current = false; playNextChunk(); };
      src.start();
    } catch (e) {
      console.warn('[Audio] decode error', e);
      isPlayingRef.current = false;
      playNextChunk();
    }
  }, []);

  // ─── Stop voice session ───────────────────────────────────────────────────
  const stopVoiceMode = useCallback(() => {
    // Stop ScriptProcessor + input AudioContext
    if (scriptProcessorRef.current && mediaSourceRef.current) {
      mediaSourceRef.current.disconnect();
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
      mediaSourceRef.current = null;
    }
    inputAudioCtxRef.current?.close().catch(() => { });
    inputAudioCtxRef.current = null;
    // Stop mic stream
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current = null;
    // Close WS
    wsRef.current?.close();
    wsRef.current = null;
    // Reset playback
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setVoiceMode(false);
    voiceModeRef.current = false; // تحديث فوري
    setLastVoiceMsg('');
  }, []);

  // ─── Start voice session (WebSocket, bypasses WebRTC/ICE NAT issues) ──────
  const startVoiceMode = async () => {
    setIsConnectingVoice(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 }
      });
      micStreamRef.current = stream;

      const ws = new WebSocket(
        `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${ELEVENLABS_AGENT_ID}`
      );
      wsRef.current = ws;
      audioCtxRef.current = new AudioContext({ sampleRate: 16000 }); // تطابق مع تردد ElevenLabs الافتراضي لمنع السرعة الزائدة

      ws.onopen = () => {
        console.log('[ElevenLabs WS] connected');
        setVoiceMode(true);
        voiceModeRef.current = true;
        setIsConnectingVoice(false);
        pushAiRef.current('🎙️ المساعد الصوتي متصل، تكلم الآن…');

        // Build dynamic context: real specialties, real governorates with clinics, real clinic names
        const allClinicsNow = clinicsRef.current;
        const govsWithClinics = Array.from(new Set(
          allClinicsNow.map(c => normalizeGov(c.governorate)).filter(Boolean) as string[]
        ));
        const clinicsByGovStr = govsWithClinics.map(g => {
          const names = allClinicsNow.filter(c => normalizeGov(c.governorate) === g).map(c => c.name);
          return `  - ${g}: ${names.join(' | ')}`;
        }).join('\n');
        const specialtiesStr = SPECIALTIES.map(sp => `  - ${sp.label}`).join('\n');

        ws.send(JSON.stringify({
          type: 'conversation_initiation_client_data',
          conversation_config_override: {
            agent: {
              first_message: 'أهلاً بك في منصة طب الأسنان الذكية! أنا مساعدك الصوتي. ما الذي تحتاجه؟',
              language: 'ar',
              prompt: {
                prompt: `أنت المساعد الصوتي الرسمي لمنصة طب الأسنان في العراق. تتحدث بلهجة عربية عراقية ودودة ومحترفة باسم المنصة.

==== بيانات المنصة الحقيقية (مرجع إلزامي — ممنوع منعاً باتاً اختراع أي اسم خارج هذه القوائم) ====
الاختصاصات المتاحة:
${specialtiesStr}

المحافظات التي توجد فيها عيادات مسجلة فعلياً + أسماء العيادات الفعلية:
${clinicsByGovStr || '  (لا توجد عيادات محمّلة بعد — استخدم أداة show_clinics بعد اختيار المحافظة)'}

كل المحافظات العراقية المدعومة كمدخل:
${GOVERNORATES.join('، ')}

==== التسلسل الإلزامي للأدوات (ممنوع كسره) ====
1) عند معرفة الاختصاص → استدعِ select_specialty (تظهر بطاقة الاختصاص).
2) فوراً بعدها → استدعِ show_governorate (تظهر بطاقة المحافظات)، ثم اسأل المريض شفهياً عن محافظته.
3) عند معرفة المحافظة → استدعِ select_governorate باسم المحافظة (تُفلتر العيادات تلقائياً وتظهر بطاقة العيادات).
4) اذكر للمريض أسماء العيادات الموجودة فعلياً في تلك المحافظة من القائمة أعلاه فقط — لا تخترع أسماء.
5) عند اختياره عيادة → استدعِ select_clinic بالاسم الحقيقي.
6) استدعِ show_date ثم اسأل عن اليوم → عند معرفة التاريخ استدعِ pick_date (YYYY-MM-DD).
7) استدعِ show_time → عند معرفة الوقت استدعِ pick_time.
8) استدعِ show_patient_form → اجمع (الاسم، رقم الهاتف، العمر، الجنس) → استدعِ fill_patient_info.
9) استدعِ show_confirmation → عند موافقة المريض استدعِ confirm_booking.

قواعد صارمة:
- لا تستدعِ select_governorate قبل show_governorate.
- لا تنطق أي اسم عيادة غير موجود في القائمة الحقيقية أعلاه.
- إذا لم توجد عيادات في محافظة المريض، أخبره بذلك واقترح أقرب محافظة فيها عيادات.
- كن مختصراً ومتعاطفاً. لا تعطِ تشخيصاً طبياً نهائياً.`
              }
            }
          }
        }));

        // ─ Capture PCM16 at 16kHz via ScriptProcessor and send to ElevenLabs ─
        // ElevenLabs expects: raw Int16 LE PCM, 16000 Hz, mono — NOT WebM/Opus
        const inputCtx = new AudioContext({ sampleRate: 16000 });
        inputAudioCtxRef.current = inputCtx;
        const micSource = inputCtx.createMediaStreamSource(stream);
        mediaSourceRef.current = micSource;
        // bufferSize=2048 → frames of 128ms @ 16kHz (always multiple of 2)
        const processor = inputCtx.createScriptProcessor(2048, 1, 1);
        scriptProcessorRef.current = processor;
        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const float32 = e.inputBuffer.getChannelData(0);
          const int16 = new Int16Array(float32.length);
          for (let i = 0; i < float32.length; i++) {
            int16[i] = Math.round(Math.min(1, Math.max(-1, float32[i])) * 32767);
          }
          // Encode as base64 raw PCM16 LE
          const bytes = new Uint8Array(int16.buffer);
          let bin = '';
          for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
          ws.send(JSON.stringify({ user_audio_chunk: btoa(bin) }));
        };
        micSource.connect(processor);
        // Connect to a silent gain node so the processor actually fires
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
              pushAiRef.current(`🎙️ ${text}`);
            }
          } else if (msg.type === 'user_transcript') {
            const text = msg.user_transcription_event?.user_transcript || '';
            if (text) pushUserRef.current(`🎙️ ${text}`);
          } else if (msg.type === 'interruption') {
            audioQueueRef.current = [];
            isPlayingRef.current = false;
          } else if (msg.type === 'client_tool_call') {
            const toolCall = msg.client_tool_call;
            if (!toolCall) return;
            const { tool_name, tool_call_id, parameters = {} } = toolCall;
            console.log(`[ElevenLabs Tool] Calling ${tool_name}`, parameters);
            let result = '';
            let isError = false;

            try {
              if (tool_name === 'select_specialty') {
                const inputSpec = String(parameters.specialty_id || parameters.specialty || parameters.name || '').toLowerCase().trim();
                const sp = SPECIALTIES.find(s =>
                  s.id === inputSpec ||
                  s.keys.some(k => inputSpec.includes(k.toLowerCase()) || k.toLowerCase().includes(inputSpec)) ||
                  s.label.includes(inputSpec) ||
                  (inputSpec && inputSpec.includes(s.label))
                );
                if (sp) {
                  handleSpecialtyRef.current(sp, true);
                  // عرض بطاقة المحافظة فوراً كاحتياط — حتى لو لم يستدعِ الـ agent show_governorate
                  setTimeout(() => showGovernorateCardRef.current(sp.label), 200);
                  result = `Success: Selected specialty "${sp.label}". The governorate selection card has been displayed in the UI. Now ask the patient verbally which governorate (محافظة) they live in, then call select_governorate with the governorate name.`;
                } else {
                  pushAiRef.current(`لم أستطع مطابقة "${inputSpec}" مع الاختصاصات المتاحة. يرجى الاختيار من القائمة:`, { kind: 'specialty' });
                  result = `Error: Could not match "${inputSpec}" to any specialty. Available specialties: ${SPECIALTIES.map(s => s.label).join(', ')}`;
                  isError = true;
                }
              } else if (tool_name === 'show_governorate') {
                showGovernorateCardRef.current(bookingRef.current.specialty?.label);
                result = `Success: Governorate selection card is now displayed. Available governorates: ${GOVERNORATES.join(', ')}. Ask the patient which governorate they live in, then call select_governorate.`;
              } else if (tool_name === 'select_governorate') {
                const inputGov = String(parameters.governorate_name || parameters.governorate || parameters.name || '').trim();
                const g = normalizeGov(inputGov);
                if (g) {
                  handleGovernorateRef.current(g, true);
                  const cnt = clinicsRef.current.filter(c => normalizeGov(c.governorate) === g).length;
                  const names = clinicsRef.current.filter(c => normalizeGov(c.governorate) === g).map(c => c.name).slice(0, 8);
                  result = `Success: Selected governorate "${g}". Found ${cnt} clinic(s). Available clinic names to read: ${names.join(' | ') || '—'}. The clinics card is shown. Read these EXACT clinic names to the patient (do not invent names) then call select_clinic with the chosen name.`;
                } else {
                  showGovernorateCardRef.current(bookingRef.current.specialty?.label);
                  result = `Error: Could not match "${inputGov}" to any governorate. Available governorates: ${GOVERNORATES.join(', ')}. The governorate card is re-displayed for manual selection.`;
                  isError = true;
                }
              } else if (tool_name === 'show_clinics') {
                setStep('clinics');
                const gov = bookingRef.current.governorate;
                const sp = bookingRef.current.specialty;
                let list = clinicsRef.current;
                if (gov) list = list.filter(c => normalizeGov(c.governorate) === gov);
                if (sp) {
                  const keys = sp.keys;
                  const matched = list.filter(c =>
                    c.specialties?.some(s => keys.some(k => s.toLowerCase().includes(k.toLowerCase()))) ||
                    c.services?.some(s => keys.some(k => s.toLowerCase().includes(k.toLowerCase())))
                  );
                  if (matched.length > 0) list = matched;
                }
                const finalList = list.slice(0, 8);
                pushAiRef.current(
                  finalList.length > 0
                    ? `🔄 العيادات المتاحة${gov ? ` في ${gov}` : ''}:`
                    : `لا توجد عيادات مطابقة${gov ? ` في ${gov}` : ''} حالياً.`,
                  { kind: 'clinics', clinics: finalList }
                );
                result = `Success: Displayed ${finalList.length} clinic(s)${gov ? ` in ${gov}` : ''}.`;
              } else if (tool_name === 'select_clinic') {
                const inputClinic = String(parameters.clinic_name || parameters.clinic_id || parameters.name || '').toLowerCase().trim();
                const c = clinicsRef.current.find(cl =>
                  cl.name.toLowerCase().includes(inputClinic) ||
                  (inputClinic && inputClinic.includes(cl.name.toLowerCase())) ||
                  cl.id === inputClinic
                );
                if (c) {
                  handleClinicRef.current(c);
                  result = `Success: Selected clinic "${c.name}". The date picker is now displayed. Ask the patient which day they prefer, then call pick_date.`;
                } else {
                  pushAiRef.current(`لم أجد عيادة باسم "${inputClinic}". يرجى الاختيار من القائمة:`, { kind: 'clinics', clinics: clinicsRef.current.slice(0, 8) });
                  result = `Error: No clinic matched "${inputClinic}".`;
                  isError = true;
                }
              } else if (tool_name === 'pick_date') {
                const d = new Date(parameters.date);
                if (isNaN(d.getTime())) {
                  pushAiRef.current('يرجى اختيار تاريخ صحيح:', { kind: 'date' });
                  result = 'Error: Invalid date format. Use YYYY-MM-DD.';
                  isError = true;
                } else {
                  handleDateRef.current(d.toISOString(), d.toLocaleDateString('ar-IQ'));
                  result = `Success: Date picked ${parameters.date}. Now ask the patient for a preferred time and call pick_time.`;
                }
              } else if (tool_name === 'pick_time') {
                handleTimeRef.current(String(parameters.time));
                result = `Success: Time picked ${parameters.time}. Now collect patient info (name, phone, age, gender) and call fill_patient_info.`;
              } else if (tool_name === 'fill_patient_info') {
                setBooking(prev => ({
                  ...prev,
                  patient: {
                    name: parameters.name || parameters.patient_name || prev.patient.name,
                    phone: parameters.phone || parameters.phone_number || prev.patient.phone,
                    age: parameters.age || prev.patient.age,
                    gender: (parameters.gender as any) || prev.patient.gender,
                  }
                }));
                setStep('patient');
                result = 'Success: Patient info saved. Confirm details with the patient verbally, then call confirm_booking.';
              } else if (tool_name === 'confirm_booking') {
                const b = bookingRef.current;
                if (!b.patient.name || !b.patient.phone) {
                  result = 'Error: Missing patient name or phone. Ask the patient for them and call fill_patient_info first.';
                  isError = true;
                  pushAiRef.current('يرجى تزويدي باسمك الكامل ورقم هاتفك لإتمام الحجز.');
                } else {
                  await handleConfirmBookingRef.current();
                  result = 'Success: Booking confirmed and saved.';
                }
              } else if (tool_name === 'show_date') {
                showDateCardRef.current();
                result = 'Success: Date picker card displayed. Ask the patient which day they prefer.';
              } else if (tool_name === 'show_time') {
                showTimeCardRef.current();
                result = 'Success: Time slots card displayed. Ask the patient for their preferred time.';
              } else if (tool_name === 'show_patient_form') {
                showPatientCardRef.current();
                result = 'Success: Patient info form displayed. Ask the patient for name, phone, age, gender.';
              } else if (tool_name === 'show_confirmation') {
                showConfirmationCardRef.current();
                result = 'Success: Confirmation card displayed. Ask patient to confirm.';
              } else {
                result = `Error: Unknown tool "${tool_name}".`;
                isError = true;
              }
            } catch (err: any) {
              result = `Error: ${err?.message || String(err)}`;
              isError = true;
            }

            // ✅ صيغة ElevenLabs WebSocket الصحيحة لإرجاع نتيجة الأداة
            ws.send(JSON.stringify({
              type: 'client_tool_result',
              tool_call_id: tool_call_id,
              result: String(result),
              is_error: isError,
            }));
          }
        } catch (err) { console.warn('[ElevenLabs WS] parse error:', err); }
      };


      ws.onerror = (err) => {
        console.error('[ElevenLabs WS] error:', err);
        pushAi('خطأ في الاتصال بالمساعد الصوتي.');
        stopVoiceMode();
      };

      ws.onclose = (ev) => {
        console.log('[ElevenLabs WS] closed:', ev.code, ev.reason);
        stream.getTracks().forEach(t => t.stop());
        setVoiceMode(false);
      };

    } catch (e: any) {
      console.error('[Voice] start error:', e);
      if (e.name === 'NotAllowedError') {
        pushAi('⚠️ يرجى السماح بالوصول للميكروفون من إعدادات المتصفح، ثم حاول مجدداً.');
      } else {
        pushAi('تعذر بدء المساعد الصوتي. تأكد من الاتصال بالإنترنت والميكروفون.');
      }
      setIsConnectingVoice(false);
    }
  };

  // ============== Cards UI ==============
  const renderCard = (card: CardKind) => {
    if (card.kind === 'specialty') {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-2">
          {SPECIALTIES.map(sp => {
            const Icon = sp.icon;
            return (
              <button
                key={sp.id}
                onClick={() => handleSpecialty(sp)}
                className={`group relative overflow-hidden bg-gradient-to-br ${sp.color} text-white p-2 rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 flex items-center gap-2 text-right border border-white/20`}
              >
                <div className="bg-white/20 p-1.5 rounded-lg shrink-0">
                  <Icon className="w-4 h-4 opacity-100" />
                </div>
                <div className="text-[11px] font-bold leading-tight flex-1">{sp.label}</div>
              </button>
            );
          })}
        </div>
      );
    }
    if (card.kind === 'governorate') {
      return (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
          {GOVERNORATES.map(g => (
            <button
              key={g}
              onClick={() => handleGovernorate(g)}
              className="bg-white border-2 border-blue-100 hover:border-blue-500 hover:bg-blue-50 text-gray-800 text-xs font-semibold py-2 px-2 rounded-xl transition-all hover:scale-105 flex items-center justify-center gap-1"
            >
              <MapPin className="w-3 h-3 text-blue-500" />{g}
            </button>
          ))}
        </div>
      );
    }
    if (card.kind === 'clinics') {
      return (
        <div className="-mx-2 mt-3 overflow-x-auto pb-2 scrollbar-thin">
          <div className="flex gap-3 px-2 snap-x snap-mandatory min-w-max">
            {card.clinics.map(c => (
              <div
                key={c.id}
                className="snap-start shrink-0 w-64 bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden hover:shadow-xl hover:border-blue-300 transition-all"
              >
                <div className="h-28 bg-gradient-to-br from-blue-400 to-purple-500 relative overflow-hidden">
                  {c.image && <img src={c.image} alt={c.name} className="w-full h-full object-cover" />}
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-600 flex items-center gap-1">
                    ⭐ {c.rating || 4.5}
                  </div>
                </div>
                <div className="p-3">
                  <div className="font-bold text-sm text-gray-900 truncate">{c.name}</div>
                  <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-1">
                    <MapPin className="w-3 h-3" />{c.governorate || c.address || 'العراق'}
                  </div>
                  <div className="text-[11px] text-gray-600 mt-1 truncate">
                    {c.specialties?.slice(0, 2).join('، ')}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-1">
                    <Clock className="w-3 h-3" />{c.workingHours || '09:00 - 21:00'}
                  </div>
                  <button
                    onClick={() => handleClinic(c)}
                    className="mt-2 w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1"
                  >
                    <CalendarIcon className="w-3 h-3" />احجز هنا
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (card.kind === 'date') {
      const days = Array.from({ length: 14 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() + i);
        return d;
      });
      return (
        <div className="-mx-2 mt-3 overflow-x-auto pb-2">
          <div className="flex gap-2 px-2">
            {days.map(d => {
              const dayName = d.toLocaleDateString('ar-IQ', { weekday: 'short' });
              const dayNum = d.getDate();
              const month = d.toLocaleDateString('ar-IQ', { month: 'short' });
              const iso = d.toISOString();
              return (
                <button
                  key={iso}
                  onClick={() => handleDate(iso, `${dayName} ${dayNum} ${month}`)}
                  className="shrink-0 w-16 bg-white border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 rounded-xl py-2 px-1 transition-all text-center hover:scale-105"
                >
                  <div className="text-[10px] text-gray-500">{dayName}</div>
                  <div className="text-lg font-bold text-gray-900">{dayNum}</div>
                  <div className="text-[10px] text-gray-500">{month}</div>
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    if (card.kind === 'time') {
      return (
        <div className="mt-3 space-y-3">
          <div>
            <div className="text-xs font-bold text-amber-600 mb-1.5 flex items-center gap-1">☀️ الفترة الصباحية</div>
            <div className="flex flex-wrap gap-1.5">
              {TIME_SLOTS.morning.map(t => (
                <button key={t} onClick={() => handleTime(t)}
                  className="bg-amber-50 hover:bg-amber-500 hover:text-white text-amber-700 text-xs font-bold py-1.5 px-3 rounded-lg border border-amber-200 transition-all">
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-indigo-600 mb-1.5 flex items-center gap-1">🌙 الفترة المسائية</div>
            <div className="flex flex-wrap gap-1.5">
              {TIME_SLOTS.evening.map(t => (
                <button key={t} onClick={() => handleTime(t)}
                  className="bg-indigo-50 hover:bg-indigo-500 hover:text-white text-indigo-700 text-xs font-bold py-1.5 px-3 rounded-lg border border-indigo-200 transition-all">
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }
    if (card.kind === 'patient') {
      return (
        <div className="mt-3 bg-white border border-gray-200 rounded-2xl p-3 space-y-2 text-right">
          <input
            type="text" placeholder="الاسم الكامل"
            value={booking.patient.name}
            onChange={e => setBooking(p => ({ ...p, patient: { ...p.patient, name: e.target.value } }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-right"
          />
          <input
            type="tel" placeholder="رقم الهاتف (07XXXXXXXXX)"
            value={booking.patient.phone}
            onChange={e => setBooking(p => ({ ...p, patient: { ...p.patient, phone: e.target.value } }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-right"
          />
          <select
            value={booking.governorate || ''}
            onChange={e => setBooking(p => ({ ...p, governorate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none bg-white text-right"
            aria-label="المحافظة"
          >
            <option value="">المحافظة (بغداد، البصرة، ...)</option>
            {GOVERNORATES.map(gov => (
              <option key={gov} value={gov}>{gov}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number" placeholder="العمر"
              value={booking.patient.age}
              onChange={e => setBooking(p => ({ ...p, patient: { ...p.patient, age: e.target.value } }))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-right"
            />
            <select
              value={booking.patient.gender}
              onChange={e => setBooking(p => ({ ...p, patient: { ...p.patient, gender: e.target.value as any } }))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none bg-white text-right"
              aria-label="اختيار الجنس"
            >
              <option value="">الجنس</option>
              <option value="male">ذكر</option>
              <option value="female">أنثى</option>
            </select>
          </div>
          <button
            disabled={!booking.patient.name || !booking.patient.phone || !booking.governorate || isLoading}
            onClick={handleConfirmBooking}
            className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            تأكيد الحجز
          </button>
        </div>
      );
    }
    if (card.kind === 'confirmation') {
      return (
        <div className="mt-3 bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-2xl p-4 text-center">
          <div className="w-12 h-12 mx-auto bg-emerald-500 rounded-full flex items-center justify-center mb-2">
            <Check className="w-6 h-6 text-white" />
          </div>
          <div className="font-bold text-emerald-800">تم الحجز بنجاح</div>
          <button onClick={() => navigate('/')} className="mt-3 text-xs font-bold text-emerald-700 hover:underline">
            العودة للرئيسية
          </button>
        </div>
      );
    }
    if (card.kind === 'register') {
      return (
        <div className="mt-3 bg-gradient-to-br from-indigo-50/75 via-blue-50/50 to-white border border-blue-100 rounded-3xl p-5 shadow-lg space-y-4 text-right relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100/30 rounded-full blur-xl -mr-8 -mt-8" />
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800">إنشاء حساب مراجع</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">تابع مواعيدك وخطتك العلاجية تلقائياً</p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            أنشئ حساب مراجع الآن لربط هذا الموعد وتلقي الإشعارات وتتبع حالة الحجز مباشرة من مركز المراجعين.
          </p>

          <div className="space-y-2">
            <div className="relative">
              <span className="absolute inset-y-0 right-3 flex items-center text-slate-400 pointer-events-none">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                value={registerPassword}
                onChange={e => { setRegisterPassword(e.target.value); setRegisterError(''); }}
                placeholder="أدخل كلمة مرور (6 أحرف على الأقل)"
                className="w-full pr-10 pl-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-right"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 left-3 flex items-center text-slate-400 hover:text-blue-600 transition-colors"
                aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {registerError && (
              <p className="text-[11px] text-red-500 font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {registerError}
              </p>
            )}
            <p className="text-[10px] text-emerald-600 font-semibold pr-1">
              ✓ رقم هاتفك سيكون اسم المستخدم الخاص بك لتسجيل الدخول
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleRegisterAccount}
              disabled={isRegistering || !registerPassword}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold py-2.5 rounded-xl text-xs disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-100"
            >
              {isRegistering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              إكمال إنشاء الحساب
            </button>
            <button
              onClick={() => {
                pushAi('تم تأكيد حجزك كزائر بنجاح! يرجى انتظار اتصال من العيادة لتأكيد موعدك.', { kind: 'guest_confirmed' });
                setStep('guest_confirmed');
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs transition-all"
            >
              تخطي
            </button>
          </div>
        </div>
      );
    }
    if (card.kind === 'completed') {
      return (
        <div className="mt-3 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-3xl p-5 text-center space-y-3">
          <div className="w-12 h-12 mx-auto bg-emerald-500 rounded-full flex items-center justify-center shadow-md shadow-emerald-100">
            <Check className="w-6 h-6 text-white" />
          </div>
          <div className="font-extrabold text-sm text-emerald-800">تم إنشاء الحساب بنجاح! 🎉</div>
          <p className="text-xs text-emerald-700/90 leading-relaxed font-semibold">
            تم ربط موعدك بحسابك الجديد بنجاح. يمكنك الآن الدخول إلى مركز المراجعين لتتبع حالتك.
          </p>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => navigate('/patient')}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-extrabold py-2.5 rounded-xl text-xs transition-all shadow-md shadow-emerald-100"
            >
              دخول مركز المراجعين
            </button>
            <button
              onClick={() => navigate('/')}
              className="bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-700 font-bold px-4 py-2.5 rounded-xl text-xs transition-all"
            >
              الرئيسية
            </button>
          </div>
        </div>
      );
    }
    if (card.kind === 'guest_confirmed') {
      const clinicPhone = booking.clinic?.phone;
      return (
        <div className="mt-3 bg-gradient-to-br from-teal-50 to-cyan-50/50 border border-teal-100 rounded-3xl p-5 text-center space-y-4 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-teal-100/30 rounded-full blur-lg -mr-6 -mt-6" />
          
          <div className="w-12 h-12 mx-auto bg-teal-500 rounded-full flex items-center justify-center shadow-md shadow-teal-100 text-white">
            <Check className="w-6 h-6" />
          </div>

          <div className="space-y-1 text-right">
            <div className="font-extrabold text-sm text-teal-900">تمت جدولة موعدك كزائر بنجاح! 🎉</div>
            <p className="text-xs text-slate-600 font-medium">العيادة المحجوزة: <span className="font-bold text-slate-800">{booking.clinic?.name}</span></p>
          </div>

          <div className="bg-white/80 backdrop-blur border border-teal-100/50 rounded-2xl p-3.5 text-right space-y-2.5 text-xs text-slate-700">
            <div className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500 mt-1.5 shrink-0" />
              <p className="leading-relaxed">
                يرجى <strong>انتظار اتصال هاتفي من العيادة قريباً</strong> لتأكيد الموعد نهائياً وتحديد الطبيب المعالج.
              </p>
            </div>
            {clinicPhone && (
              <div className="flex items-start gap-2 pt-1.5 border-t border-slate-100">
                <span className="w-2 h-2 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
                <div className="leading-relaxed flex-1">
                  يمكنك أيضاً <strong>الاتصال بالعيادة مباشرة</strong> للاستفسار أو التأكيد السريع:
                  <div className="mt-2 flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl p-2 font-mono text-sm text-slate-800">
                    <a href={`tel:${clinicPhone}`} className="flex items-center gap-1.5 text-teal-600 hover:text-teal-700 font-bold">
                      <Phone className="w-4 h-4" />
                      <span>{clinicPhone}</span>
                    </a>
                    <span className="text-[10px] text-slate-400 font-sans">رقم الهاتف</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => navigate('/')}
              className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-extrabold py-2.5 rounded-xl text-xs transition-all shadow-md shadow-teal-100"
            >
              العودة للرئيسية
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

  // handle scroll to hide/show large button and show floating button
  const [showFloatingVoice, setShowFloatingVoice] = useState(false);
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop > 150) {
      setShowFloatingVoice(true);
    } else {
      setShowFloatingVoice(false);
    }
  };

  // ============== UI ==============
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col sm:p-4 z-50">
      <div className="flex-1 w-full max-w-3xl mx-auto flex flex-col bg-white sm:rounded-3xl shadow-2xl overflow-hidden relative h-full">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-md border-b border-gray-100 p-3 sm:p-4 flex items-center gap-3 shrink-0 z-10">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100 transition-colors" aria-label="العودة للخلف">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <img 
                src="https://nhueyaeyutfmadbgghfe.supabase.co/storage/v1/object/public/platform-assets/branding/platform-logo-1769556926386.png" 
                alt="Logo" 
                className="w-10 h-10 object-contain rounded-xl shadow-md shrink-0 bg-white p-1"
              />
              <div>
                <div className="font-bold text-gray-900">المساعد الذكي</div>
                <div className="text-xs text-gray-500 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${voiceMode ? 'bg-red-500 animate-pulse' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'}`} />
                  {voiceMode ? (isPlayingRef.current ? 'يتحدث…' : 'يستمع…') : 'متصل وجاهز'}
                </div>
              </div>
            </div>
          </div>
          {voiceMode && (
            <button
              onClick={stopVoiceMode}
              className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-red-100"
            >
              <PhoneOff className="w-4 h-4" />إنهاء
            </button>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-gray-50/30">
          <div
            className="flex-1 overflow-y-auto p-4 space-y-5 scroll-smooth"
            onScroll={handleScroll}
          >
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {m.role === 'user' ? (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm bg-gradient-to-br from-gray-600 to-gray-500 text-white">
                    <User className="w-4 h-4" />
                  </div>
                ) : (
                  <img 
                    src="https://nhueyaeyutfmadbgghfe.supabase.co/storage/v1/object/public/platform-assets/branding/platform-logo-1769556926386.png" 
                    alt="Logo" 
                    className="w-8 h-8 object-contain rounded-lg shrink-0 mt-1 shadow-sm bg-white p-0.5 border border-gray-100"
                  />
                )}
                <div className="max-w-[85%] flex-1">
                  {m.image && (
                    <img src={m.image} alt="" className="rounded-lg mb-1 max-w-[200px] border border-gray-200" />
                  )}
                  {m.content && (
                    <div className={`p-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${m.role === 'user'
                        ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-none'
                        : 'bg-gray-50 text-gray-800 border border-gray-100 rounded-tl-none'
                      }`}>
                      {m.content}
                      {m.role === 'ai' && (
                        <button onClick={() => speakText(m.content)} className="block mt-1.5 text-[10px] text-blue-600 hover:text-blue-800">
                          <Volume2 className="w-3 h-3 inline ml-1" />استمع
                        </button>
                      )}
                    </div>
                  )}
                  {m.card && renderCard(m.card)}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2">
                <img 
                  src="https://nhueyaeyutfmadbgghfe.supabase.co/storage/v1/object/public/platform-assets/branding/platform-logo-1769556926386.png" 
                  alt="Logo" 
                  className="w-8 h-8 object-contain rounded-lg shrink-0 mt-1 shadow-sm bg-white p-0.5 border border-gray-100 animate-pulse"
                />
                <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-none p-3 flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}


            {/* Persistent spacer to prevent buttons from covering messages and layout shifts */}
            <div className="h-24 shrink-0" />
            <div ref={messagesEndRef} className="h-2" />
          </div>

          {/* Talk Buttons Container (Stable Layout) */}
          {!voiceMode && (
            <div className="relative h-0 z-40">
              {/* Floating Mini Button */}
              <div className={`absolute left-4 bottom-6 transition-all duration-500 ${showFloatingVoice ? 'scale-100 opacity-100 translate-y-0' : 'scale-0 opacity-0 translate-y-10 pointer-events-none'}`}>
                <button
                  onClick={startVoiceMode}
                  disabled={isConnectingVoice}
                  className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all disabled:opacity-70 border-4 border-white"
                >
                  {isConnectingVoice ? <Loader2 className="w-6 h-6 animate-spin" /> : <Mic className="w-6 h-6" />}
                </button>
              </div>

              {/* Large Entry Button */}
              <div className={`absolute bottom-0 left-0 right-0 px-5 pb-4 transition-all duration-500 ${!showFloatingVoice ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
                <div className="bg-white/80 backdrop-blur-xl p-1 rounded-[2.2rem] shadow-[0_-15px_30px_rgba(0,0,0,0.03)] border border-gray-100">
                  <button
                    onClick={startVoiceMode}
                    disabled={isConnectingVoice}
                    className="group relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white px-10 py-4 rounded-[2rem] font-black flex items-center gap-4 shadow-[0_15px_40px_rgba(37,99,235,0.3)] hover:shadow-[0_20px_50px_rgba(37,99,235,0.4)] hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-70 w-full justify-center border-b-4 border-blue-800"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md shadow-inner relative">
                      <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-20" />
                      <Mic className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <div className="text-lg leading-tight tracking-tight">تحدث مع المساعد الذكي</div>
                      <div className="text-[10px] text-blue-100 font-bold mt-0.5 opacity-80 uppercase">تجربة حجز فورية بالصوت</div>
                    </div>
                    <ChevronRight className="w-5 h-5 opacity-50 group-hover:translate-x-[-5px] transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Voice Bubble Area */}
          <div className="relative z-40">
            {voiceMode && (
              <div className="px-4 pb-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Enhanced Smart Bubble */}
                {lastVoiceMsg && (
                  <div className="mb-4 transform -translate-y-2">
                    <div className="bg-gradient-to-br from-indigo-600/90 to-blue-700/90 backdrop-blur-xl text-white border border-white/20 rounded-3xl p-4 shadow-[0_20px_50px_rgba(79,70,229,0.3)] flex items-start gap-4 max-w-[95%] mx-auto relative group overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
                        <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                        <Mic className="w-5 h-5 text-white absolute" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="text-[10px] text-white/60 font-black uppercase tracking-[0.2em]">رد المساعد الذكي</div>
                        <p className="text-sm font-medium leading-relaxed text-right">{lastVoiceMsg}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Controls & Input Area */}
          <div className="border-t border-gray-100 p-4 bg-white relative z-50">
            {voiceMode && (
              <div className="flex justify-center mb-4 mt-[-25px] relative z-50">
                <button 
                  onClick={stopVoiceMode}
                  className="bg-gradient-to-br from-red-500 to-rose-600 text-white w-16 h-16 rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(244,63,94,0.4)] hover:scale-110 active:scale-95 transition-all border-4 border-white group"
                >
                  <PhoneOff className="w-7 h-7 group-hover:rotate-12 transition-transform" />
                </button>
              </div>
            )}
            {imagePreview && (
              <div className="flex items-center gap-2 mb-2 p-2 bg-blue-50 rounded-lg w-fit border border-blue-100">
                <img src={imagePreview} alt="" className="w-10 h-10 object-cover rounded" />
                <button onClick={() => setImagePreview(null)} className="text-red-500 p-1 hover:bg-red-50 rounded-full">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className={`flex items-center gap-1.5 rounded-2xl p-1.5 focus-within:border-blue-400 focus-within:ring-4 transition-all ${voiceMode ? 'bg-indigo-50 border-indigo-200 focus-within:ring-indigo-100' : 'bg-gray-50 border-gray-200 focus-within:ring-blue-50'}`}>
              <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-white rounded-xl text-gray-500 hover:text-blue-600 transition-colors">
                <ImageIcon className="w-5 h-5" />
              </button>
              <button onClick={toggleListening} className={`p-2 rounded-xl transition-colors ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'hover:bg-white text-gray-500 hover:text-blue-600'}`}>
                <Mic className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder={voiceMode ? "اكتب ليتم إرساله للمساعد الصوتي…" : "اكتب أي سؤال أو استفسار…"}
                className="flex-1 bg-transparent outline-none text-sm px-2 text-right placeholder-gray-400"
              />
              <div className="flex items-center gap-1">
                {voiceMode && (
                  <button
                    onClick={stopVoiceMode}
                    className="bg-red-100 hover:bg-red-200 text-red-600 p-2 rounded-xl transition-all"
                  >
                    <PhoneOff className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={handleSendMessage}
                  disabled={(!input.trim() && !imagePreview) || isLoading}
                  className={`text-white p-2 rounded-xl disabled:opacity-40 transition-all ${voiceMode ? 'bg-gradient-to-r from-indigo-500 to-purple-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
};
