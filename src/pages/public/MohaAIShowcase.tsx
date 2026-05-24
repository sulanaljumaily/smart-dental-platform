import React, { useState, useEffect, useRef } from 'react';
import { 
  Brain, Activity, Mic, Volume2, Play, Square, ArrowRight, ArrowLeft, 
  Award, Sparkles, Database, MessageSquare, Check, Layers, Sliders, User, MessageCircle
} from 'lucide-react';
import { Button } from '../../components/common/Button';

interface Slide {
  id: number;
  title: string;
  subtitle: string;
  category: string;
}

export const MohaAIShowcase: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [voiceStep, setVoiceStep] = useState(0);
  
  // Interactive States for Slide 3 (Clinical Patient Services)
  const [activeXrayFilter, setActiveXrayFilter] = useState<'none' | 'caries' | 'bone' | 'nerves'>('none');
  const [smileAfter, setSmileAfter] = useState(false);

  const slides: Slide[] = [
    { id: 0, title: "حلول الذكاء الاصطناعي التطبيقية", subtitle: "استعراض عملي للميزات الذكية المتوفرة في منصة طب الأسنان الذكية", category: "مقدمة العرض" },
    { id: 1, title: "المساعد الذكي للتشخيص والحجز تلقائياً", subtitle: "تنظيم مواعيد المراجعين وحجزها تلقائياً والإجابة على الاستفسارات صوتياً وكتابياً", category: "مساعد الحجز والتشخيص" },
    { id: 2, title: "مساعد المراجعين ومحادثات العيادة الذكية", subtitle: "بوابة تفاعلية آمنة تتيح للمريض الدردشة كتابة وصوتاً مع ربط ذكي بقنوات الواتساب", category: "مساعد المراجعين" },
    { id: 3, title: "الخدمات الطبية الذكية في ملف المريض", subtitle: "أدوات التشخيص الرقمي للأطباء: قراءة الأشعة، الإملاء الصوتي السريري، وتصميم الابتسامة", category: "ملف المريض الذكي" }
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        handlePrev(); // RTL: Right arrow goes back
      } else if (e.key === 'ArrowLeft') {
        handleNext(); // RTL: Left arrow goes forward
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide]);

  // Vocal Assistant Demo Player
  const startVoiceDemo = () => {
    if (!('speechSynthesis' in window)) {
      alert("متصفحك لا يدعم نطق النصوص");
      return;
    }
    
    setIsPlayingVoice(true);
    setVoiceStep(1);
    window.speechSynthesis.cancel();

    setTimeout(() => {
      setVoiceStep(2);
      const speakIraqi = new SpeechSynthesisUtterance("أهلاً عيني. موعدك القادم تم حِجزه بنجاح يوم الخميس القادم الساعة 9:30 صباحاً بقسم الأسنان. دزيتلك مسج تفاصيل الحجز وتذكير على الواتساب. تدلل!");
      speakIraqi.lang = 'ar-IQ';
      speakIraqi.rate = 0.95;
      speakIraqi.onend = () => {
        setIsPlayingVoice(false);
        setVoiceStep(3);
      };
      window.speechSynthesis.speak(speakIraqi);
    }, 2000);
  };

  const stopVoiceDemo = () => {
    window.speechSynthesis.cancel();
    setIsPlayingVoice(false);
    setVoiceStep(0);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500 selection:text-white relative overflow-hidden flex flex-col justify-between" dir="rtl">
      
      {/* Glow Backdrops */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30 pointer-events-none" />

      {/* Slide Header */}
      <header className="relative z-10 px-6 py-4 bg-slate-900/60 backdrop-blur-md border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
            <Brain className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">DentalAI Core</h1>
            <span className="text-[10px] text-gray-400 font-bold block leading-none">حلول الذكاء الاصطناعي المتوفرة بالتطبيق</span>
          </div>
        </div>

        {/* Slides Navigation Badges */}
        <div className="hidden lg:flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-full border border-slate-800">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentSlide(idx)}
              className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all duration-300 ${
                currentSlide === idx 
                  ? 'bg-indigo-600 text-white shadow' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {s.category}
            </button>
          ))}
        </div>

        <span className="px-3 py-1 rounded-full bg-slate-800 text-[10px] text-gray-300 border border-slate-700 font-black">
          الشريحة {currentSlide + 1} من {slides.length}
        </span>
      </header>

      {/* Slides Workspace */}
      <main className="flex-1 relative z-10 flex items-center justify-center p-6 md:p-12 overflow-y-auto max-w-7xl mx-auto w-full">
        
        {/* Slide 0: Cover */}
        {currentSlide === 0 && (
          <div className="w-full text-center space-y-8 max-w-4xl py-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner">
              <Award className="w-5 h-5 animate-bounce" />
              <span className="text-xs sm:text-sm font-black">العرض التطبيقي لميزات الذكاء الاصطناعي المتوفرة في المنصة</span>
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl sm:text-5xl md:text-6xl font-black leading-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
                حلول الذكاء الاصطناعي المتكاملة
              </h2>
              <p className="text-base sm:text-xl md:text-2xl text-slate-300 font-medium">
                استعراض حي ومباشر للمساعد الذكي، تشخيص المراجعين، وقسم المساعد الطبي بملف المريض
              </p>
            </div>

            <div className="bg-slate-900/50 backdrop-blur border border-slate-800 p-6 rounded-3xl max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 shadow-2xl">
              <div className="text-center space-y-2">
                <Brain className="w-8 h-8 text-indigo-400 mx-auto" />
                <h4 className="font-bold text-xs text-gray-400">1. مساعد التشخيص والحجز</h4>
                <p className="text-xs text-slate-300">فرز ذكي للمرضى وجدولة المواعيد</p>
              </div>
              <div className="text-center space-y-2 border-y md:border-y-0 md:border-x border-slate-800 py-4 md:py-0">
                <MessageSquare className="w-8 h-8 text-purple-400 mx-auto" />
                <h4 className="font-bold text-xs text-gray-400">2. مساعد المراجعين والدردشة</h4>
                <p className="text-xs text-slate-300">محادثات كتابية وصوتية باللهجة العراقية</p>
              </div>
              <div className="text-center space-y-2">
                <Activity className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-xs text-gray-400">3. الخدمات الطبية في ملف المريض</h4>
                <p className="text-xs text-slate-300">تحليل الأشعة، الإملاء الصوتي، والابتسامة</p>
              </div>
            </div>

            <div className="text-xs text-gray-500 font-bold tracking-widest pt-4">
              انقر فوق زر "الشريحة التالية" في الأسفل لبدء الاستعراض
            </div>
          </div>
        )}

        {/* Slide 1: Smart Diagnosis & Booking Assistant */}
        {currentSlide === 1 && (
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-center py-6 animate-in fade-in slide-in-from-left-8 duration-500">
            <div className="lg:col-span-6 space-y-6">
              <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold uppercase">1. مساعد التشخيص والحجز الذكي</span>
              <h2 className="text-2xl sm:text-4xl font-black text-white">فرز أوتوماتيكي وجدولة المواعيد السحابية</h2>
              
              <ul className="space-y-4">
                <li className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5"><Check className="w-4 h-4" /></div>
                  <div>
                    <h4 className="font-bold text-sm text-white">الفرز والتقييم الآلي المسبق للحالات (AI Triage)</h4>
                    <p className="text-xs text-gray-400 mt-0.5">يقوم الـ AI باستجواب المريض عند طلب الحجز، لمعرفة مكان الألم وشدته وفهم الشكوى الطبية لتصنيف خطورتها وتوجيهها للقسم المختص.</p>
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5"><Check className="w-4 h-4" /></div>
                  <div>
                    <h4 className="font-bold text-sm text-white">جدولة المواعيد الذكية (Automated Booking)</h4>
                    <p className="text-xs text-gray-400 mt-0.5">اقتراح المواعيد الشاغرة التي تتناسب مع جدول أطباء العيادة دون أي تعارض، مع إرسال تذكيرات آلية لتقليل نسب التغيب.</p>
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5"><Check className="w-4 h-4" /></div>
                  <div>
                    <h4 className="font-bold text-sm text-white">استجابة ذكية باللهجة العراقية</h4>
                    <p className="text-xs text-gray-400 mt-0.5">فهم تام للمصطلحات العراقية وتوجيه الحجز مباشرة وربطه بسلاسة وبثوانٍ معدودة.</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Interactive Voice Player Simulator */}
            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-2xl text-center">
              <div className="space-y-4 py-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center mx-auto shadow-lg relative group">
                  {isPlayingVoice && (
                    <div className="absolute inset-0 rounded-full border border-indigo-400 animate-ping opacity-75" />
                  )}
                  <Mic className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">مساعد الحجوزات والفرز التفاعلي</h4>
                  <p className="text-xs text-gray-400">انقر للتشغيل والاستماع للرد الصوتي للمساعد الذكي</p>
                </div>
              </div>

              {/* Simulated Chat Screen */}
              <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 min-h-[120px] text-right flex flex-col justify-center">
                {voiceStep === 0 && (
                  <p className="text-center text-xs text-slate-600">اضغط على زر التشغيل في الأسفل للاستماع</p>
                )}

                {voiceStep >= 1 && (
                  <div className="flex gap-2 items-start text-right animate-in slide-in-from-bottom-2">
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] shrink-0 font-bold">مريض</div>
                    <div className="bg-blue-600/10 border border-blue-500/20 p-2 rounded-xl text-xs text-blue-200">
                      "أريد أحجز موعد يم الدكتور علي لزراعة سني يوجعني كلش."
                    </div>
                  </div>
                )}

                {voiceStep >= 2 && (
                  <div className="flex gap-2 items-start text-right animate-in slide-in-from-bottom-3 mt-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] shrink-0 font-bold">AI</div>
                    <div className="bg-emerald-600/10 border border-emerald-500/20 p-2.5 rounded-xl text-xs text-emerald-200 leading-relaxed">
                      "أهلاً عيني. موعدك القادم تم حِجزه بنجاح يوم الخميس القادم الساعة 9:30 صباحاً بقسم الأسنان. دزيتلك مسج تفاصيل الحجز وتذكير على الواتساب. تدلل!"
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2.5">
                <Button 
                  onClick={startVoiceDemo} 
                  disabled={isPlayingVoice}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white border-0 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 ml-1" />
                  تشغيل التجربة الصوتية
                </Button>
                {isPlayingVoice && (
                  <Button 
                    onClick={stopVoiceDemo} 
                    className="bg-red-600 hover:bg-red-700 text-white border-0 font-bold px-3 rounded-xl flex items-center justify-center"
                  >
                    <Square className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Slide 2: Smart Assistant for Clinic Patients (portal chat/voice) */}
        {currentSlide === 2 && (
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-center py-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="lg:col-span-6 space-y-6">
              <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-bold uppercase">2. مساعد المراجعين والدردشة التفاعلية</span>
              <h2 className="text-2xl sm:text-4xl font-black text-white">بوابة مرضى متكاملة وصندوق وارد ذكي</h2>
              
              <ul className="space-y-4">
                <li className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5"><Check className="w-4 h-4" /></div>
                  <div>
                    <h4 className="font-bold text-sm text-white">الدردشة بالصوت والكتابة (Voice & Text Chat)</h4>
                    <p className="text-xs text-gray-400 mt-0.5">يمكن للمريض تسجيل رسالته بصوته أو كتابتها؛ المساعد الذكي يفهم سياق الحديث، ويجيب على الاستشارات الوقائية ويرتب ملفه.</p>
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5"><Check className="w-4 h-4" /></div>
                  <div>
                    <h4 className="font-bold text-sm text-white">الربط الذكي مع قنوات الواتساب (WhatsApp Web Integration)</h4>
                    <p className="text-xs text-gray-400 mt-0.5">دعم كامل لفتح قنوات الواتساب وإرسال الرسائل والتنبيهات المباشرة من رقم العيادة إلى هاتف المريض مجاناً وبأعلى موثوقية.</p>
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5"><Check className="w-4 h-4" /></div>
                  <div>
                    <h4 className="font-bold text-sm text-white">مؤشرات الحساب النشط (WhatsApp Badge)</h4>
                    <p className="text-xs text-gray-400 mt-0.5">عرض أيقونات واتساب خضراء تفاعلية بجانب أسماء المرضى النشطين، لتسهيل وصول المراسلات وإشعار الأطباء بوجود حساب فعال.</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Interactive Mock Chat Screen */}
            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-6 shadow-2xl relative">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <span className="font-bold text-xs text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-500" />
                  محادثة المريض: <b className="text-purple-400">سلطان سليمان</b>
                </span>
                <span className="flex items-center gap-1 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded-full text-[9px] text-emerald-400 font-bold shrink-0">
                  <MessageCircle className="w-3.5 h-3.5" /> واتساب نشط
                </span>
              </div>

              {/* Chat Thread */}
              <div className="space-y-3 min-h-[160px] flex flex-col justify-end text-right">
                <div className="flex gap-2 items-start justify-end">
                  <div className="bg-purple-600/10 border border-purple-500/20 p-2.5 rounded-xl rounded-tr-none text-xs text-purple-200 max-w-[80%]">
                    "مرحباً سلطان، نود تذكيرك بموعدك القادم لزراعة الأسنان غداً الساعة 9:30 ص."
                  </div>
                  <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-[9px] shrink-0 font-bold">AI</div>
                </div>

                <div className="flex gap-2 items-start">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] shrink-0 font-bold">مريض</div>
                  <div className="bg-blue-600/10 border border-blue-500/20 p-2.5 rounded-xl rounded-tl-none text-xs text-blue-200 max-w-[80%]">
                    "تمام عيني، راح أكون متواجد بالموعد بالضبط. شكراً جزيلاً للتذكير!"
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[10px] text-slate-400 font-bold leading-normal">
                💬 **الربط الفعلي**: محادثات بوابة المرضى والواتساب متزامنة بالكامل وتتيح للطبيب التواصل وإرسال التذكيرات من العيادة وتلقي الردود بمرونة مطلقة.
              </div>
            </div>
          </div>
        )}

        {/* Slide 3: Smart Medical Services in Patient File */}
        {currentSlide === 3 && (
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-center py-6 animate-in fade-in slide-in-from-left-8 duration-500">
            <div className="lg:col-span-6 space-y-6">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase">3. الخدمات الطبية بملف المريض</span>
              <h2 className="text-2xl sm:text-4xl font-black text-white">الذكاء الاصطناعي السريري المساند للأطباء</h2>
              
              <ul className="space-y-4">
                <li className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5"><Check className="w-4 h-4" /></div>
                  <div>
                    <h4 className="font-bold text-sm text-white">تحليل صور الأشعة بالذكاء الاصطناعي (AI Diagnosis)</h4>
                    <p className="text-xs text-gray-400 mt-0.5">رفع صور الأشعة للكشف التلقائي عن التسوسات والالتهابات وتراجع العظم اللثوي وخطوط العصب بدقة متناهية.</p>
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5"><Check className="w-4 h-4" /></div>
                  <div>
                    <h4 className="font-bold text-sm text-white">الفحص الإملائي الصوتي الفوري (Voice Charting)</h4>
                    <p className="text-xs text-gray-400 mt-0.5">يتحدث الطبيب بالصوت ليسجل الفحص (مثال: "السن 14 حشوة تجميلية")؛ فيقوم الـ AI باستخراج الملاحظات وتحديث سجل المريض آلياً.</p>
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5"><Check className="w-4 h-4" /></div>
                  <div>
                    <h4 className="font-bold text-sm text-white">محاكاة تصميم الابتسامة (DSD Preview)</h4>
                    <p className="text-xs text-gray-400 mt-0.5">تطبيق محاكاة لتصميم الابتسامة واستعراض النتيجة المتوقعة (Before / After) مباشرة أمام المريض مع التحكم في درجة البياض وانتظام الأسنان.</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Interactive Image & Smile Design simulators */}
            <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-6 shadow-2xl">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <span className="font-bold text-xs text-gray-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
                  أدوات الأطباء: محاكي الابتسامة والأشعة الرقمية
                </span>
                <button
                  onClick={() => setSmileAfter(!smileAfter)}
                  className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
                    smileAfter ? 'bg-emerald-600 text-white shadow' : 'bg-slate-800 text-gray-300'
                  }`}
                >
                  {smileAfter ? 'إظهار الابتسامة المقترحة بالـ AI' : 'إظهار الابتسامة الأصلية'}
                </button>
              </div>

              {/* Before/After Smile Simulator View */}
              <div className="bg-black rounded-2xl aspect-[16/10] overflow-hidden relative border border-slate-800 shadow-inner flex items-center justify-center">
                <img 
                  src={
                    smileAfter 
                      ? "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=600" 
                      : "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600"
                  } 
                  alt="Interactive Simulator" 
                  className="w-full h-full object-cover transition-all duration-700" 
                />

                <div className="absolute bottom-3 left-3 right-3 bg-slate-950/80 backdrop-blur border border-slate-800 p-2 rounded-xl text-center text-[10px] font-bold text-gray-300">
                  {smileAfter 
                    ? "✨ نتيحة الـ AI المقترحة: تصميم ابتسامة هوليوود المتناسقة VITA A1" 
                    : "⚠️ الحالة قبل العلاج: تراجع نسبي واصفرار في الأسنان"
                  }
                </div>
              </div>

              {/* Quick X-Ray interactive demo tags */}
              <div className="flex gap-2">
                {['none', 'caries', 'bone'].map(f => (
                  <button
                    key={f}
                    onClick={() => setActiveXrayFilter(f as any)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-black border transition-all ${
                      activeXrayFilter === f 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-slate-950 hover:bg-slate-800 text-gray-400 border-slate-800'
                    }`}
                  >
                    {f === 'none' ? 'أشعة عادية' : f === 'caries' ? 'رسم تسوس الـ AI' : 'تراجع العظم الـ AI'}
                  </button>
                ))}
              </div>

              {/* Mini simulated X-ray scan block */}
              {activeXrayFilter !== 'none' && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-right animate-in slide-in-from-top-2 text-xs">
                  {activeXrayFilter === 'caries' ? (
                    <span className="text-red-400 font-bold">🔴 تم كشف تسوس نشط في الضاحك الأول بنسبة ثقة 92%</span>
                  ) : (
                    <span className="text-yellow-400 font-bold">🟡 تم تحديد فقدان عظمي متوسط بمقدار 2.3mm في الفك السفلي</span>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

      </main>

      {/* Footer Navigation */}
      <footer className="relative z-10 px-6 py-5 bg-slate-900/60 backdrop-blur-md border-t border-slate-800 flex justify-between items-center">
        <Button
          onClick={handlePrev}
          disabled={currentSlide === 0}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs ${
            currentSlide === 0 
              ? 'bg-slate-800 text-gray-500 cursor-not-allowed border border-slate-800' 
              : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
          }`}
        >
          <ArrowRight className="w-4 h-4 ml-1" />
          السابق
        </Button>

        {/* Slide Indicator Dots */}
        <div className="flex items-center gap-2">
          {slides.map((_, idx) => (
            <div 
              key={idx} 
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                currentSlide === idx 
                  ? 'bg-indigo-600 w-6' 
                  : 'bg-slate-700'
              }`}
            />
          ))}
        </div>

        <Button
          onClick={handleNext}
          disabled={currentSlide === slides.length - 1}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs ${
            currentSlide === slides.length - 1 
              ? 'bg-slate-800 text-gray-500 cursor-not-allowed border border-slate-800' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-lg'
          }`}
        >
          التالي
          <ArrowLeft className="w-4 h-4 mr-1" />
        </Button>
      </footer>

    </div>
  );
};
