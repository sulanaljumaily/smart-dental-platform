import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Building2,
  Calendar,
  Users,
  TrendingUp,
  MessageCircle,
  FileText,
  BarChart,
  ArrowRight,
  Shield,
  Clock,
  CheckCircle,
  MoveRight,
  Stethoscope,
  ListTodo,
  Activity,
  Map,
  Link as LinkIcon,
  Briefcase,
  ShoppingBag
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { usePlatform } from '../../contexts/PlatformContext';

export const DoctorWelcomePage: React.FC = () => {
  const { settings } = usePlatform();
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  // Hero Carousel Data
  const heroSlides = [
    {
      title: "برنامج إدارة العيادة من منصة طب الأسنان",
      subtitle: "الحل الذكي الشامل لإدارة عيادتك الطبية وتنظيم المواعيد وسجلات المرضى | Dental Clinic Management App",
      gradient: "from-blue-900 to-indigo-900",
      image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=2068"
    },
    {
      title: "تطبيق ونظام إدارة العيادة الذكي",
      subtitle: "نظم مواعيدك وسجلات مرضاك بدقة متناهية، مع منع التعارض وتقليل وقت الانتظار",
      gradient: "from-purple-900 to-blue-900",
      image: "https://images.unsplash.com/photo-1579684385180-8c6f1a8afb2d?auto=format&fit=crop&q=80&w=2070"
    }
  ];

  // Auto-slide
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 pb-24" dir="rtl">
      <Helmet>
        <title>برنامج ونظام إدارة العيادة | تطبيق إدارة العيادات من منصة طب الأسنان - Dental Clinic Management App</title>
        <meta
          name="description"
          content="أقوى برنامج ونظام إدارة العيادة وتطبيق شامل لإدارة عيادات ومراكز طب الأسنان (Dental Clinic Management App from Dental Platform). تنظيم المواعيد، السجلات الإلكترونية، الفواتير، ومختبرات الأسنان."
        />
        <meta
          name="keywords"
          content="نظام ادارة العيادة, تطبيق ادارة العيادة, برنامج ادارة العيادة, برنامج ادارة العيادة من منصة طب الاسنان, dental clinic management app, dental clinic management app from dental platform, برنامج عيادات الاسنان, تطبيق ادارة عيادات الاسنان"
        />
        <link rel="canonical" href="https://dental-platform.com/doctor-welcome" />
        <meta property="og:title" content="برنامج ونظام إدارة العيادة | تطبيق إدارة العيادات من منصة طب الأسنان" />
        <meta
          property="og:description"
          content="برنامج وتطبيق إدارة العيادة المتكامل من منصة طب الأسنان — تنظيم المواعيد، السجلات، والفواتير بذكاء واحترافية."
        />
        <meta property="og:url" content="https://dental-platform.com/doctor-welcome" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "برنامج ونظام إدارة العيادة من منصة طب الأسنان",
            "alternateName": "Dental Clinic Management App from Dental Platform",
            "applicationCategory": "HealthApplication",
            "operatingSystem": "Web, Android, Windows, iOS",
            "url": "https://dental-platform.com/doctor-welcome",
            "description": "برنامج ونظام إدارة العيادة وتطبيق شامل لإدارة عيادات ومراكز طب الأسنان يشمل تنظيم المواعيد، السجلات الطبية الإلكترونية، الحسابات، والمعامل.",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "IQD"
            }
          })}
        </script>
      </Helmet>
      <div className="container mx-auto px-4 py-8 max-w-7xl">

        {/* Bento Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-auto">

          {/* 1. Hero Section (Span 4) */}
          <div className="col-span-1 md:col-span-4 row-span-2 relative h-[400px] md:h-[500px] rounded-[2.5rem] overflow-hidden shadow-2xl group">
            {heroSlides.map((slide, idx) => (
              <div
                key={idx}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentHeroIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
              >
                <img src={slide.image} alt={slide.title} className="w-full h-full object-cover transform scale-105 group-hover:scale-110 transition-transform [transition-duration:2000ms]" />
                <div className={`absolute inset-0 bg-gradient-to-r ${slide.gradient} opacity-80 mix-blend-multiply`}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

                <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-10 md:px-16 text-white z-20">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/10 backdrop-blur-md rounded-full w-fit mb-4 border border-white/10">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                    <span className="text-xs sm:text-sm font-medium text-blue-100">نظام وتطبيق إدارة العيادة #1 | Dental Clinic Management App</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl md:text-5xl font-black mb-3 md:mb-5 leading-tight max-w-3xl tracking-tight">
                    {slide.title}
                  </h1>
                  <p className="text-sm sm:text-base md:text-lg text-gray-200 mb-6 md:mb-8 max-w-2xl font-normal leading-relaxed">
                    {slide.subtitle}
                  </p>
                  <div className="flex flex-wrap gap-3 sm:gap-4">
                    <Link to="/register?type=doctor">
                      <Button className="bg-white text-blue-900 hover:bg-gray-100 px-6 py-3 md:px-7 md:py-3.5 rounded-xl md:rounded-2xl text-base md:text-lg font-bold shadow-lg shadow-blue-900/20 transition-all hover:-translate-y-1">
                        ابـدأ الآن مجـانـاً
                      </Button>
                    </Link>
                    <Button variant="outline" className="text-white border-white/30 hover:bg-white/10 px-6 py-3 md:px-7 md:py-3.5 rounded-xl md:rounded-2xl text-base md:text-lg font-medium backdrop-blur-sm">
                      شاهد العرض التوضيحي
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* Slide Indicators */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-2">
              {heroSlides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentHeroIndex(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${currentHeroIndex === idx ? 'w-8 bg-white' : 'w-2 bg-white/30 hover:bg-white/50'}`}
                />
              ))}
            </div>
          </div>

          {/* 2. Key Features Grid */}

          {/* Feature 1: Clinic Management (Large Vertical) */}
          <div className="col-span-1 md:col-span-1 md:row-span-2 bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 group border border-gray-100 hover:border-blue-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[4rem] z-0 transition-transform group-hover:scale-110"></div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:rotate-6 transition-transform">
                <Building2 className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">نظام إدارة العيادات المتكامل</h3>
              <p className="text-gray-500 leading-relaxed mb-6 flex-grow">
                تحكم كامل عبر نظام إدارة العيادة: المواعيد، سجلات المرضى، الطاقم الطبي، الأصول، ومعامل الأسنان من لوحة تحكم واحدة متكاملة.
              </p>
              <div className="space-y-3">
                {['تعدد العيادات: لوحة تحكم خاصة لكل عيادة ومركز', 'إدارة أنواع العلاج، المخزون، الأجهزة، الإيرادات والمصروفات', 'إدارة صلاحيات وسجل نشاط الطاقم الطبي في كل عيادة'].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-2 rounded-xl">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feature 2: Appointments (Wide Horizontal) */}
          <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl group">
            <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 h-full">
              <div className="flex-1">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2">تطبيق ونظام حجوزات ذكي</h3>
                <p className="text-indigo-100 leading-relaxed">
                  تطبيق إدارة العيادة ينظم مواعيد المراجعين ويربط كل موعد مع الطبيب المعالج، مع تنبيهات تلقائية لمنع التعارض وضمان انسيابية العمل.
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 w-full md:w-auto min-w-[200px]">
                <div className="flex items-center gap-3 mb-3 border-b border-white/10 pb-3">
                  <Clock className="w-5 h-5 text-indigo-200" />
                  <span className="font-bold">المواعيد القادمة</span>
                </div>
                <div className="space-y-2">
                  <div className="h-2 bg-white/20 rounded-full w-3/4"></div>
                  <div className="h-2 bg-white/10 rounded-full w-1/2"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 3: Smart Diagnosis (Square) */}
          <div className="col-span-1 bg-white rounded-3xl p-6 shadow-lg border border-gray-100 hover:border-purple-200 transition-all group">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition-transform">
              <Stethoscope className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">التشخيص الذكي</h3>
            <p className="text-gray-500 text-sm mb-4">مساعد ذكي لتحليل الصور واقتراح التشخيصات بناءً على الأعراض، مع ميزة تصميم الابتسامة (DSD) لاستعراض النتائج المتوقعة بدقة.</p>
            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 w-3/4"></div>
            </div>
            <span className="text-xs text-purple-600 font-bold mt-2 block">دقة تصل إلى 95%</span>
          </div>

          {/* Feature 4: Financial Reports (Square) */}
          <div className="col-span-1 bg-white rounded-3xl p-6 shadow-lg border border-gray-100 hover:border-green-200 transition-all group">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600 mb-4 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">تقارير مالية</h3>
            <p className="text-gray-500 text-sm mb-4">تتبع دقيق للإيرادات والمصروفات مع إحصائيات مالية شاملة للأطباء والمراجعين والمعامل، ومتابعة الأجور المستحقة لضمان استدامة عيادتك.</p>
            <div className="flex items-end gap-1 h-8 mt-2">
              {[40, 70, 50, 90, 60].map((h, i) => (
                <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-green-100 rounded-t-sm group-hover:bg-green-500 transition-colors"></div>
              ))}
            </div>
          </div>

          {/* Feature 5: Patients (Span 2) */}
          <div className="col-span-1 md:col-span-2 bg-gray-900 rounded-3xl p-8 text-white relative overflow-hidden group">
            <div className="flex items-start justify-between relative z-10">
              <div>
                <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mb-4 border border-gray-700">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold mb-2">سجلات مرضى إلكترونية</h3>
                <p className="text-gray-400 max-w-sm">سجل إلكتروني متكامل لكل مريض يشمل التاريخ المرضي، الخطط العلاجية، الأرشيف، والمالية، مع تتبع دقيق للجلسات والأجور المستحقة في الخطط الجارية.</p>
              </div>
              <div className="hidden md:block">
                <Shield className="w-24 h-24 text-gray-800" />
              </div>
            </div>
            <div className="mt-8 flex gap-3">
              <span className="px-3 py-1 bg-gray-800 rounded-lg text-xs text-gray-300 border border-gray-700">تشفير تام</span>
              <span className="px-3 py-1 bg-gray-800 rounded-lg text-xs text-gray-300 border border-gray-700">ملف المريض</span>
              <span className="px-3 py-1 bg-gray-800 rounded-lg text-xs text-gray-300 border border-gray-700">خطط العلاج</span>
              <span className="px-3 py-1 bg-gray-800 rounded-lg text-xs text-gray-300 border border-gray-700">الخدمات الذكية</span>
              <span className="px-3 py-1 bg-gray-800 rounded-lg text-xs text-gray-300 border border-gray-700">الارشيف</span>
              <span className="px-3 py-1 bg-gray-800 rounded-lg text-xs text-gray-300 border border-gray-700">المالية</span>
            </div>
          </div>

          {/* Feature 10: Special Clinic Link */}
          <div className="col-span-1 bg-white rounded-3xl p-6 shadow-lg border border-gray-100 hover:border-indigo-200 transition-all group">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
              <LinkIcon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">رابط خاص للعيادة</h3>
            <p className="text-gray-500 text-sm">احصل على رابط مباشر خاص لعيادتك لمشاركته مع المراجعين وتسهيل الحجز الرقمي، مع إمكانية إدارة بروفايل العيادة بالكامل (الشعار، الغلاف، المواعيد، والموقع).</p>
          </div>

          {/* Feature 7: Tasks & Reminders */}
          <div className="col-span-1 bg-white rounded-3xl p-6 shadow-lg border border-gray-100 hover:border-yellow-200 transition-all group">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center text-yellow-600 mb-4 group-hover:scale-110 transition-transform">
              <ListTodo className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">المهام والتذكيرات</h3>
            <p className="text-gray-500 text-sm">نظام ذكي لإدارة و توكيل مهام العيادة وتذكير بالمواعيد الهامة بين طاقم العيادة </p>
          </div>

          {/* Feature 8: Lab Tracking */}
          <div className="col-span-1 bg-white rounded-3xl p-6 shadow-lg border border-gray-100 hover:border-teal-200 transition-all group">
            <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center text-teal-600 mb-4 group-hover:scale-110 transition-transform">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">مختبرات و معامل الأسنان</h3>
            <p className="text-gray-500 text-sm">نظام متكامل لتتبع حالات المختبر خطوة بخطوة؛ تواصل مع أفضل معامل الأسنان الموثوقة، وتابع الإحصائيات المالية والحالات (المنجزة، المتأخرة، والمرجعة) بكل سلاسة.</p>
          </div>

          {/* Feature 9: Map Visibility */}
          <div className="col-span-1 bg-white rounded-3xl p-6 shadow-lg border border-gray-100 hover:border-blue-200 transition-all group">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
              <Map className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">خريطة العيادات القريبة</h3>
            <p className="text-gray-500 text-sm">عزز تواجدك برؤية عيادتك على الخريطة التفاعلية والخدمات الطبية، مع ظهور ذكي أسفل المقالات التعليمية لسهولة الوصول إليك.</p>
          </div>

          {/* Feature 6: Medical Community */}
          <div className="col-span-1 bg-gradient-to-br from-orange-400 to-red-500 rounded-3xl p-6 text-white text-center flex flex-col items-center justify-center shadow-lg hover:shadow-orange-200/50 transition-shadow">
            <MessageCircle className="w-10 h-10 mb-3 text-white/90" />
            <h3 className="font-bold text-lg mb-1">المجتمع الطبي والتعليم</h3>
            <p className="text-white/80 text-sm leading-relaxed">تواصل مع زملائك، شارك الخبرات، وتصفح أبرز الندوات والدورات والمصادر العلمية والنماذج التعليمية ثلاثية الأبعاد.</p>
          </div>

          {/* Feature 11: Jobs & Vacancies */}
          <div className="col-span-1 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white text-center flex flex-col items-center justify-center shadow-lg hover:shadow-emerald-200/50 transition-shadow">
            <Briefcase className="w-10 h-10 mb-3 text-white/90" />
            <h3 className="font-bold text-lg mb-1">الوظائف والتوظيف</h3>
            <p className="text-white/80 text-sm leading-relaxed">نظام متكامل وآمن للتوظيف؛ أعلن عن شواغر في عيادتك أو ابحث عن فرص عمل، مع إدارة كاملة لطلبات التوظيف والسير الذاتية.</p>
          </div>

          {/* Feature 12: Medical Store */}
          <div className="col-span-1 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-6 text-white text-center flex flex-col items-center justify-center shadow-lg hover:shadow-blue-200/50 transition-shadow">
            <ShoppingBag className="w-10 h-10 mb-3 text-white/90" />
            <h3 className="font-bold text-lg mb-1">المتجر الطبي</h3>
            <p className="text-white/80 text-sm leading-relaxed">تسوق من أرقى الموردين الموثوقين بخصومات حصرية، مع نظام تنبيهات ذكي لنقص المخزون وسهولة تامة في طلب المستلزمات الطبية.</p>
          </div>

          {/* CTA Banner (Full Width) */}
          <div className="col-span-1 md:col-span-4 mt-6">
            <div className="bg-blue-600 rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden shadow-xl shadow-blue-200/50">
              <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12"></div>

              <div className="relative z-10 max-w-2xl mx-auto">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">جاهز لتشغيل أفضل برنامج وتطبيق لإدارة العيادة؟</h2>
                <p className="text-blue-100 text-sm sm:text-base mb-6">احصل على نظام وبرنامج إدارة العيادات من منصة طب الأسنان (Dental Clinic Management App) وابدأ تنظيم عيادتك ومواعيدك وسجلات مرضاك مجاناً الآن.</p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link to="/register?type=doctor" className="w-full sm:w-auto">
                    <Button className="w-full sm:w-auto bg-white text-blue-600 hover:bg-blue-50 px-6 py-2.5 rounded-xl text-sm sm:text-base font-bold shadow-md transition-transform hover:scale-105">
                      سجل حساب جديد
                      <ArrowRight className="w-4 h-4 mr-2" />
                    </Button>
                  </Link>
                  <span className="text-blue-200 text-xs sm:text-sm">أو</span>
                  <Link to="/" className="text-white text-sm font-medium hover:underline flex items-center gap-1.5">
                    تصفح النظام أولاً <MoveRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-12 border-t border-gray-200 pt-6 text-center">
          <p className="text-gray-500 font-medium text-xs sm:text-sm">{settings.footer_text || '© 2026 Dental Platform - منصة طب الأسنان. جميع الحقوق محفوظة.'}</p>
        </div>

      </div>
    </div>
  );
};
