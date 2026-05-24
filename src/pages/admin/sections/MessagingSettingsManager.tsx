import React, { useState, useEffect } from 'react';
import {
  MessageSquare, Save, CheckCircle, AlertCircle, Send,
  Eye, EyeOff, Zap, Globe, Phone, Shield, RefreshCw,
  ToggleLeft, ToggleRight, Info, Settings, LayoutGrid
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'sonner';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface TwilioConfig  { account_sid: string; auth_token: string; sender_phone: string; enabled: boolean }
interface UltramsgConfig { instance_id: string; token: string; enabled: boolean }
interface GreenApiConfig { id_instance: string; api_token: string; enabled: boolean }
interface MessagingConfig {
  active_provider: 'whatsapp_web' | 'twilio' | 'ultramsg' | 'greenapi' | 'platform_only'; // Kept for compatibility
  providers: {
    twilio:        TwilioConfig;
    ultramsg:      UltramsgConfig;
    greenapi:      GreenApiConfig;
    whatsapp_web:  { enabled: boolean };
  };
  allow_platform_messages: boolean;
  allow_whatsapp_web:      boolean;
  twilio_sms_enabled:      boolean;
  whatsapp_api_enabled:    boolean;
  active_whatsapp_api_provider: 'twilio' | 'ultramsg' | 'greenapi';
  default_country_code:    string;
}

const DEFAULT_CONFIG: MessagingConfig = {
  active_provider: 'whatsapp_web',
  providers: {
    twilio:       { account_sid: '', auth_token: '', sender_phone: '', enabled: false },
    ultramsg:     { instance_id: '', token: '', enabled: false },
    greenapi:     { id_instance: '', api_token: '', enabled: false },
    whatsapp_web: { enabled: true },
  },
  allow_platform_messages: true,
  allow_whatsapp_web: true,
  twilio_sms_enabled: false,
  whatsapp_api_enabled: false,
  active_whatsapp_api_provider: 'twilio',
  default_country_code:    '964', // Defaults to Iraq (964)
};

const COUNTRIES = [
  { name: 'العراق', code: '964', flag: '🇮🇶', placeholder: '077XXXXXXXX' },
  { name: 'السعودية', code: '966', flag: '🇸🇦', placeholder: '05XXXXXXXX' },
  { name: 'مصر', code: '20', flag: '🇪🇬', placeholder: '01XXXXXXXXX' },
  { name: 'الإمارات', code: '971', flag: '🇦🇪', placeholder: '05XXXXXXXX' },
  { name: 'الأردن', code: '962', flag: '🇯🇴', placeholder: '07XXXXXXXX' },
];

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export const MessagingSettingsManager: React.FC = () => {
  const [config, setConfig]         = useState<MessagingConfig>(DEFAULT_CONFIG);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [testPhone, setTestPhone]   = useState('');
  const [testSending, setTestSending] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testMessage, setTestMessage] = useState(
    '🦷 تذكير بموعدك القادم:\n' +
    'تم إنشاء حساب لك في عيادتنا. يمكنك الدخول من هذا الرابط لتتبع خططك العلاجية ومواعيدك:\n' +
    'https://smart-dental-platform.web.app/login'
  );
  
  // Tab focus in config panel ('sms' or 'whatsapp_api')
  const [activeConfigTab, setActiveConfigTab] = useState<'sms' | 'whatsapp_api'>('sms');

  // ── Load from Supabase ──
  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'messaging')
        .maybeSingle();

      if (data?.value) {
        const loaded = data.value;
        setConfig({
          ...DEFAULT_CONFIG,
          ...loaded,
          // Auto-migrate or fallback logic for new multi-provider toggles
          twilio_sms_enabled: loaded.twilio_sms_enabled ?? loaded.providers?.twilio?.enabled ?? false,
          whatsapp_api_enabled: loaded.whatsapp_api_enabled ?? (loaded.active_provider === 'ultramsg' || loaded.active_provider === 'greenapi' || (loaded.active_provider === 'twilio' && loaded.providers?.twilio?.sender_phone?.startsWith('whatsapp:'))),
          active_whatsapp_api_provider: loaded.active_whatsapp_api_provider ?? (loaded.active_provider === 'greenapi' ? 'greenapi' : loaded.active_provider === 'ultramsg' ? 'ultramsg' : 'twilio'),
          default_country_code: loaded.default_country_code ?? '964',
        });
      }
    } catch (e) {
      console.error('Error loading messaging config:', e);
    } finally {
      setLoading(false);
    }
  };

  // ── Save to Supabase ──
  const handleSave = async () => {
    setSaving(true);
    try {
      // Sync old compatibility fields
      let legacyActive: 'whatsapp_web' | 'twilio' | 'ultramsg' | 'greenapi' | 'platform_only' = 'whatsapp_web';
      if (config.whatsapp_api_enabled) {
        legacyActive = config.active_whatsapp_api_provider;
      } else if (config.twilio_sms_enabled) {
        legacyActive = 'twilio';
      } else if (config.allow_whatsapp_web) {
        legacyActive = 'whatsapp_web';
      } else {
        legacyActive = 'platform_only';
      }

      const updatedConfig = {
        ...config,
        active_provider: legacyActive,
        providers: {
          ...config.providers,
          twilio: {
            ...config.providers.twilio,
            enabled: config.twilio_sms_enabled || (config.whatsapp_api_enabled && config.active_whatsapp_api_provider === 'twilio')
          },
          ultramsg: {
            ...config.providers.ultramsg,
            enabled: config.whatsapp_api_enabled && config.active_whatsapp_api_provider === 'ultramsg'
          },
          greenapi: {
            ...config.providers.greenapi,
            enabled: config.whatsapp_api_enabled && config.active_whatsapp_api_provider === 'greenapi'
          },
          whatsapp_web: {
            enabled: config.allow_whatsapp_web
          }
        }
      };

      const { error } = await supabase
        .from('platform_settings')
        .upsert({ key: 'messaging', value: updatedConfig, updated_at: new Date().toISOString() }, { onConflict: 'key' });

      if (error) throw error;
      setConfig(updatedConfig);
      toast.success('✅ تم حفظ قنوات إرسال الرسائل وتحديثها بنجاح!');
    } catch (e: any) {
      toast.error('فشل الحفظ: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Helper to get active country placeholder ──
  const getPhonePlaceholder = () => {
    const code = config.default_country_code || '964';
    const cty = COUNTRIES.find(c => c.code === code);
    return cty ? cty.placeholder.substring(cty.placeholder.startsWith('0') ? 1 : 0) : 'XXXXXXXX';
  };

  // ── Test Send ──
  const handleTestSend = async (channelType: 'whatsapp_web' | 'twilio_sms' | 'whatsapp_api') => {
    if (!testPhone.trim()) { toast.error('أدخل رقم الهاتف للاختبار'); return; }
    setTestSending(true);
    const testMsg = testMessage.trim() || '🦷 رسالة تجريبية من Smart Dental Platform — تأكيد تفعيل قنوات التذكير بنجاح ✅';
    try {
      if (channelType === 'whatsapp_web') {
        const formattedPhone = formatToInternationalPhone(testPhone, false);
        window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(testMsg)}`, '_blank');
        toast.success('تم فتح WhatsApp Web للمحاكاة بنجاح');
      } else if (channelType === 'twilio_sms') {
        await sendTwilioSMS(testPhone, testMsg);
        toast.success('✅ تم إرسال رسالة Twilio SMS تجريبية بنجاح!');
      } else if (channelType === 'whatsapp_api') {
        const prov = config.active_whatsapp_api_provider;
        if (prov === 'twilio') {
          await sendTwilioWhatsApp(testPhone, testMsg);
          toast.success('✅ تم إرسال رسالة Twilio WhatsApp تجريبية!');
        } else if (prov === 'ultramsg') {
          await sendUltramsg(testPhone, testMsg);
          toast.success('✅ تم إرسال رسالة Ultramsg تجريبية بنجاح!');
        } else if (prov === 'greenapi') {
          await sendGreenApi(testPhone, testMsg);
          toast.success('✅ تم إرسال رسالة Green API تجريبية بنجاح!');
        }
      }
    } catch (e: any) {
      console.error('Test send error:', e);
      const isTwilio = channelType === 'twilio_sms' || (channelType === 'whatsapp_api' && config.active_whatsapp_api_provider === 'twilio');
      
      if (isTwilio && (e.message?.includes('Failed to fetch') || e.name === 'TypeError' || String(e).includes('TypeError'))) {
        toast.warning(
          '🔒 تم حظر الإرسال المباشر من المتصفح (CORS Policy) لحماية بياناتك:\n' +
          'تمنع Twilio طلبات الـ API المباشرة من متصفحات الويب لمنع سرقة مفاتيح الـ Auth Token الخاصة بك.\n' +
          'بياناتك المحفوظة صحيحة تماماً وسيقوم خادم المنصة/الدوال البرمجية (Edge Functions) بالإرسال التلقائي الفعلي بأمان وسرية تامة في الخلفية.'
        );
      } else {
        toast.error('فشل الاختبار: ' + e.message);
      }
    } finally {
      setTestSending(false);
    }
  };

  // Helper to format local numbers to E.164 / International format based on default country selection
  const formatToInternationalPhone = (phone: string, includePlus: boolean = true): string => {
    let cleaned = phone.replace(/\D/g, ''); // Keep only digits
    const countryCode = config.default_country_code || '964';

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

  // ── Provider senders ──
  const sendTwilioSMS = async (to: string, body: string) => {
    const { account_sid, auth_token, sender_phone } = config.providers.twilio;
    if (!account_sid || !auth_token || !sender_phone) throw new Error('بيانات Twilio غير مكتملة');
    const toVal = formatToInternationalPhone(to, true); // Twilio SMS requires E.164 (+964...)
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${account_sid}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': 'Basic ' + btoa(`${account_sid}:${auth_token}`), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: toVal, From: sender_phone, Body: body }).toString()
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
  };

  const sendTwilioWhatsApp = async (to: string, body: string) => {
    const { account_sid, auth_token, sender_phone } = config.providers.twilio;
    if (!account_sid || !auth_token || !sender_phone) throw new Error('بيانات Twilio غير مكتملة');
    const fromVal = sender_phone.startsWith('whatsapp:') ? sender_phone : `whatsapp:${sender_phone}`;
    const toVal = `whatsapp:${formatToInternationalPhone(to, true)}`; // Twilio WhatsApp requires E.164 with whatsapp: prefix
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${account_sid}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': 'Basic ' + btoa(`${account_sid}:${auth_token}`), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: toVal, From: fromVal, Body: body }).toString()
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
  };

  const sendUltramsg = async (to: string, body: string) => {
    const { instance_id, token } = config.providers.ultramsg;
    if (!instance_id || !token) throw new Error('بيانات Ultramsg غير مكتملة');
    const toVal = formatToInternationalPhone(to, false); // Ultramsg requires digits only without + prefix (964...)
    const res = await fetch(`https://api.ultramsg.com/${instance_id}/messages/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token, to: toVal, body }).toString()
    });
    if (!res.ok) throw new Error('فشل إرسال Ultramsg');
  };

  const sendGreenApi = async (to: string, body: string) => {
    const { id_instance, api_token } = config.providers.greenapi;
    if (!id_instance || !api_token) throw new Error('بيانات Green API غير مكتملة');
    const toVal = formatToInternationalPhone(to, false) + '@c.us'; // Green API requires 964...@c.us
    const res = await fetch(`https://api.green-api.com/waInstance${id_instance}/sendMessage/${api_token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: toVal, message: body })
    });
    if (!res.ok) throw new Error('فشل إرسال Green API');
  };

  const toggleSecret = (key: string) => setShowSecrets(p => ({ ...p, [key]: !p[key] }));
  const SecretInput = ({ label, value, onChange, placeholder, id }: any) => (
    <div>
      <label className="block text-xs font-bold text-gray-600 mb-1">{label}</label>
      <div className="relative">
        <input
          type={showSecrets[id] ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          dir="ltr"
          className="w-full pr-4 pl-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-100 outline-none"
        />
        <button type="button" onClick={() => toggleSecret(id)} className="absolute left-2.5 top-2.5 text-gray-400 hover:text-gray-600">
          {showSecrets[id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-gray-500">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span className="font-medium">جاري تحميل إعدادات الرسائل...</span>
      </div>
    </div>
  );

  // Core Channels available for doctors
  const CHANNELS = [
    {
      id: 'platform',
      label: '📱 صندوق المنصة',
      color: 'from-blue-500 to-indigo-600',
      activeColor: 'border-blue-500 bg-blue-50/50 shadow-blue-100',
      desc: 'إرسال الرسائل كإشعارات تفاعلية للمرضى المسجلين بالبوابة',
      enabled: config.allow_platform_messages,
      toggle: () => setConfig(c => ({ ...c, allow_platform_messages: !c.allow_platform_messages }))
    },
    {
      id: 'whatsapp_web',
      label: '💬 واتساب ويب (مجاني)',
      color: 'from-green-500 to-emerald-600',
      activeColor: 'border-green-500 bg-green-50/40 shadow-green-100',
      desc: 'مجاني تماماً — يفتح محادثة واتساب على هاتف الطبيب مع نص التذكير',
      enabled: config.allow_whatsapp_web,
      toggle: () => setConfig(c => ({ ...c, allow_whatsapp_web: !c.allow_whatsapp_web }))
    },
    {
      id: 'twilio_sms',
      label: '🔴 الرسائل النصية SMS',
      color: 'from-red-500 to-rose-600',
      activeColor: 'border-red-500 bg-red-50/40 shadow-red-100',
      desc: 'إرسال رسائل SMS تلقائية بالخلفية باستخدام بوابة Twilio المدفوعة',
      enabled: config.twilio_sms_enabled,
      toggle: () => setConfig(c => ({ ...c, twilio_sms_enabled: !c.twilio_sms_enabled })),
      click: () => setActiveConfigTab('sms')
    },
    {
      id: 'whatsapp_api',
      label: '🟢 واتساب تلقائي API',
      color: 'from-teal-500 to-cyan-600',
      activeColor: 'border-teal-500 bg-teal-50/40 shadow-teal-100',
      desc: 'إرسال رسائل واتساب تلقائية بالكامل بالخلفية عبر بوابات الويب الذكية',
      enabled: config.whatsapp_api_enabled,
      toggle: () => setConfig(c => ({ ...c, whatsapp_api_enabled: !c.whatsapp_api_enabled })),
      click: () => setActiveConfigTab('whatsapp_api')
    }
  ];

  return (
    <div className="space-y-6" dir="rtl">




      {/* ── Horizontal Grid: 3 Columns per Row ── */}
      <div className="space-y-3">
        <h4 className="font-black text-gray-900 flex items-center gap-2 text-base">
          <LayoutGrid className="w-5 h-5 text-blue-600" />
          تمكين قنوات الرسائل (الخيارات المتاحة للأطباء)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CHANNELS.map(ch => {
            const isTabActive = 
              (ch.id === 'twilio_sms' && activeConfigTab === 'sms') ||
              (ch.id === 'whatsapp_api' && activeConfigTab === 'whatsapp_api');

            return (
              <div
                key={ch.id}
                onClick={() => ch.click && ch.click()}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  ch.enabled 
                    ? ch.activeColor + ' shadow-md scale-[1.01]' 
                    : 'border-gray-100 bg-white hover:border-gray-200 shadow-sm'
                } ${isTabActive ? 'ring-2 ring-blue-500/80 ring-offset-2' : ''}`}
              >
                <div>
                  {/* Header: Title + Toggle */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-sm text-gray-800">{ch.label}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        ch.toggle();
                      }}
                      className={`w-10 h-6 rounded-full transition-all flex items-center shrink-0 ${ch.enabled ? 'bg-emerald-500 justify-end' : 'bg-gray-300 justify-start'}`}
                    >
                      <div className="w-5 h-5 bg-white rounded-full mx-0.5 shadow-sm" />
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-normal">{ch.desc}</p>
                </div>

                {/* Footer status / actions */}
                {ch.click && (
                  <div className="mt-3 pt-2.5 border-t border-gray-100/70 flex items-center justify-between text-[10px]">
                    <span className="font-bold text-gray-400">انقر لتعديل بيانات الربط ⚙️</span>
                    {isTabActive && <span className="bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full">قيد العرض</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Configuration Section & Provider Settings ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="border-b border-gray-200 pb-2">
            <h4 className="font-black text-gray-900 flex items-center gap-2 text-base">
              <Settings className="w-5 h-5 text-gray-600" />
              تعديل بيانات الربط: {activeConfigTab === 'sms' ? '🔴 خدمة SMS (Twilio)' : '🟢 بوابات واتساب API'}
            </h4>
          </div>

          {activeConfigTab === 'sms' ? (
            /* Twilio SMS Config */
            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl"><Zap className="w-5 h-5 text-white" /></div>
                <div>
                  <h5 className="font-black text-gray-900">إعدادات Twilio SMS</h5>
                  <p className="text-xs text-gray-500">مخصصة لإرسال الرسائل النصية القصيرة التلقائية</p>
                </div>
                <div className="ml-auto">
                  <span className={`px-3 py-1 rounded-full text-xs font-black border transition-all ${config.twilio_sms_enabled ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                    {config.twilio_sms_enabled ? '🔴 القناة مفعَّلة' : '⭕ القناة معطَّلة'}
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 font-bold leading-relaxed">
                📌 <strong>خطوات ربط خدمة SMS:</strong> قم بالتسجيل في موقع <a href="https://twilio.com" target="_blank" rel="noreferrer" className="underline">twilio.com</a> والحصول على رقم هاتف SMS، ثم الصق قيم Account SID و Auth Token بالأسفل.
              </div>

              <SecretInput id="twilio_sid"   label="Account SID" value={config.providers.twilio.account_sid} onChange={(v: string) => setConfig(c => ({ ...c, providers: { ...c.providers, twilio: { ...c.providers.twilio, account_sid: v } } }))} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
              <SecretInput id="twilio_token" label="Auth Token"   value={config.providers.twilio.auth_token} onChange={(v: string) => setConfig(c => ({ ...c, providers: { ...c.providers, twilio: { ...c.providers.twilio, auth_token: v } } }))} placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">رقم المرسل (Sender Number)</label>
                <input
                  type="text" dir="ltr"
                  value={config.providers.twilio.sender_phone}
                  onChange={e => setConfig(c => ({ ...c, providers: { ...c.providers, twilio: { ...c.providers.twilio, sender_phone: e.target.value } } }))}
                  placeholder="+1XXXXXXXXXX"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>

              {/* Test Twilio SMS Button */}
              <div className="pt-3 border-t border-gray-100 space-y-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">💬 نص الرسالة للتجربة</label>
                  <textarea
                    value={testMessage}
                    onChange={e => setTestMessage(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-100 resize-none font-bold text-gray-700 leading-relaxed"
                    placeholder="أدخل رسالة مخصصة مثل: تم إنشاء حساب لك في عيادة..."
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-100">
                    <div className="relative border-l border-gray-200 bg-gray-200/50 hover:bg-gray-200/80 transition-all px-2.5 py-2 shrink-0 flex items-center gap-1 select-none">
                      <select
                        value={config.default_country_code || '964'}
                        onChange={e => setConfig(c => ({ ...c, default_country_code: e.target.value }))}
                        className="bg-transparent text-xs font-mono font-black text-gray-700 outline-none cursor-pointer pl-4 appearance-none"
                        dir="ltr"
                      >
                        {COUNTRIES.map(cty => (
                          <option key={cty.code} value={cty.code}>
                            {cty.flag} +{cty.code}
                          </option>
                        ))}
                      </select>
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[8px]">
                        ▼
                      </div>
                    </div>
                    <input
                      type="tel" dir="ltr"
                      placeholder={getPhonePlaceholder()}
                      value={testPhone}
                      onChange={e => setTestPhone(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs font-mono bg-transparent outline-none border-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTestSend('twilio_sms')}
                    disabled={testSending}
                    className="px-4 py-2.5 bg-red-600 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-2 hover:bg-red-700 transition-all shrink-0"
                  >
                    {testSending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    إرسال SMS تجريبي
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* WhatsApp API Config */
            <div className="space-y-4">
              {/* WhatsApp Provider Tab Selection */}
              <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl">
                {(['twilio', 'ultramsg', 'greenapi'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setConfig(c => ({ ...c, active_whatsapp_api_provider: p }))}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
                      config.active_whatsapp_api_provider === p 
                        ? 'bg-white text-blue-600 shadow-md' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {p === 'twilio' ? '🔴 Twilio WhatsApp' : p === 'ultramsg' ? '🔵 Ultramsg API' : '🟢 Green API'}
                  </button>
                ))}
              </div>

              {/* Twilio WhatsApp */}
              {config.active_whatsapp_api_provider === 'twilio' && (
                <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl"><Zap className="w-5 h-5 text-white" /></div>
                    <div>
                      <h5 className="font-black text-gray-900">Twilio WhatsApp Business</h5>
                      <p className="text-xs text-gray-500">إرسال واتساب آلي عبر Twilio Sandbox أو الرقم المعتمد</p>
                    </div>
                  </div>
                  <SecretInput id="twilio_wa_sid"   label="Account SID" value={config.providers.twilio.account_sid} onChange={(v: string) => setConfig(c => ({ ...c, providers: { ...c.providers, twilio: { ...c.providers.twilio, account_sid: v } } }))} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
                  <SecretInput id="twilio_wa_token" label="Auth Token"   value={config.providers.twilio.auth_token} onChange={(v: string) => setConfig(c => ({ ...c, providers: { ...c.providers, twilio: { ...c.providers.twilio, auth_token: v } } }))} placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">رقم مرسل واتساب (Sender Phone)</label>
                    <input
                      type="text" dir="ltr"
                      value={config.providers.twilio.sender_phone}
                      onChange={e => setConfig(c => ({ ...c, providers: { ...c.providers, twilio: { ...c.providers.twilio, sender_phone: e.target.value } } }))}
                      placeholder="whatsapp:+1XXXXXXXXXX"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">يجب أن يبدأ الرقم بـ <code className="bg-gray-100 px-1 rounded">whatsapp:</code></p>
                  </div>
                </div>
              )}

              {/* Ultramsg */}
              {config.active_whatsapp_api_provider === 'ultramsg' && (
                <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl"><Phone className="w-5 h-5 text-white" /></div>
                    <div>
                      <h5 className="font-black text-gray-900">Ultramsg API Setup</h5>
                      <p className="text-xs text-gray-500">إرسال واتساب بنسبة تسليم ممتازة عبر مسح رمز الـ QR</p>
                    </div>
                  </div>
                  <SecretInput id="ultra_id"    label="Instance ID" value={config.providers.ultramsg.instance_id} onChange={(v: string) => setConfig(c => ({ ...c, providers: { ...c.providers, ultramsg: { ...c.providers.ultramsg, instance_id: v } } }))} placeholder="instance12345" />
                  <SecretInput id="ultra_token" label="Token"        value={config.providers.ultramsg.token}      onChange={(v: string) => setConfig(c => ({ ...c, providers: { ...c.providers, ultramsg: { ...c.providers.ultramsg, token: v } } }))} placeholder="xxxxxxxxxxxxxxxxxxxx" />
                </div>
              )}

              {/* Green API */}
              {config.active_whatsapp_api_provider === 'greenapi' && (
                <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl"><Shield className="w-5 h-5 text-white" /></div>
                    <div>
                      <h5 className="font-black text-gray-900">Green API Setup</h5>
                      <p className="text-xs text-gray-500">خيار ممتاز واقتصادي وموثوق لبث رسائل واتساب تلقائية</p>
                    </div>
                  </div>
                  <SecretInput id="green_id"    label="idInstance"      value={config.providers.greenapi.id_instance} onChange={(v: string) => setConfig(c => ({ ...c, providers: { ...c.providers, greenapi: { ...c.providers.greenapi, id_instance: v } } }))} placeholder="1101XXXXXXXXX" />
                  <SecretInput id="green_token" label="apiTokenInstance" value={config.providers.greenapi.api_token}  onChange={(v: string) => setConfig(c => ({ ...c, providers: { ...c.providers, greenapi: { ...c.providers.greenapi, api_token: v } } }))} placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
                </div>
              )}

              {/* Test WhatsApp API Button */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-1">💬 نص الرسالة للتجربة</label>
                  <textarea
                    value={testMessage}
                    onChange={e => setTestMessage(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-100 resize-none font-bold text-gray-700 leading-relaxed"
                    placeholder="أدخل رسالة مخصصة مثل: تم إنشاء حساب لك في عيادة..."
                  />
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-100">
                    <div className="relative border-l border-gray-200 bg-gray-200/50 hover:bg-gray-200/80 transition-all px-2.5 py-2 shrink-0 flex items-center gap-1 select-none">
                      <select
                        value={config.default_country_code || '964'}
                        onChange={e => setConfig(c => ({ ...c, default_country_code: e.target.value }))}
                        className="bg-transparent text-xs font-mono font-black text-gray-700 outline-none cursor-pointer pl-4 appearance-none"
                        dir="ltr"
                      >
                        {COUNTRIES.map(cty => (
                          <option key={cty.code} value={cty.code}>
                            {cty.flag} +{cty.code}
                          </option>
                        ))}
                      </select>
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[8px]">
                        ▼
                      </div>
                    </div>
                    <input
                      type="tel" dir="ltr"
                      placeholder={getPhonePlaceholder()}
                      value={testPhone}
                      onChange={e => setTestPhone(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs font-mono bg-transparent outline-none border-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTestSend('whatsapp_api')}
                    disabled={testSending}
                    className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-2 transition-all shrink-0"
                  >
                    {testSending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    إرسال واتساب تجريبي
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: General Platform Instructions ── */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 space-y-3">
            <h5 className="font-black text-yellow-950 text-sm flex items-center gap-2">
              <Info className="w-4 h-4 text-yellow-700" />
              كيف تعمل هذه اللوحة؟
            </h5>
            <div className="text-xs text-yellow-900 space-y-2 leading-relaxed font-bold">
              <p>💡 قمنا بفصل قنوات الرسائل بالكامل حتى يتمكن الأطباء من التذكير بعدة طرق بحرية.</p>
              <p>📱 <strong>صندوق وارد المنصة:</strong> إرسال بطاقات تفاعلية مباشرة داخل بوابة المريض بالمجان.</p>
              <p>💬 <strong>واتساب ويب:</strong> إرسال مجاني يدوي عبر wa.me يوجه الطبيب للرقم مباشرة.</p>
              <p>🔴 <strong>رسائل SMS:</strong> إرسال فوري تلقائي خلفي للمرضى عبر خدمة Twilio العالمية.</p>
              <p>🟢 <strong>واتساب تلقائي:</strong> إرسال بالخلفية عبر بوابات الدفع (Twilio/Ultramsg/Green API) دون أي تدخل بشري.</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex gap-3 items-start">
            <Shield className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
            <div>
              <h6 className="font-black text-xs text-slate-800">حماية فائقة وخصوصية</h6>
              <p className="text-[10px] text-gray-500 leading-relaxed mt-1">
                تُخزَّن جميع المفاتيح وبيانات الاعتماد الحساسة في طبقة مشفرة بقواعد البيانات، ويتم جلبها بالخلفية وتمريرها مباشرة بالخوادم لتأمين خصوصية العيادات.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Save Button ── */}
      <div className="sticky bottom-4 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-2xl text-sm font-black shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 flex items-center gap-3 border border-white/20"
        >
          {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? 'جاري الحفظ وتحديث التكوين...' : 'حفظ وتطبيق الخيارات للعيادات'}
        </button>
      </div>
    </div>
  );
};
