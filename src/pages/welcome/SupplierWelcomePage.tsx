import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Store,
  Briefcase,
  TrendingUp,
  MessageCircle,
  BarChart,
  ShoppingCart,
  ArrowRight,
  Globe,
  PieChart,
  MoveRight,
  DollarSign
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { usePlatform } from '../../contexts/PlatformContext';

export const SupplierWelcomePage: React.FC = () => {
  const { settings } = usePlatform();
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  const heroSlides = [
    {
      title: "مركز الموردين الطبيين #1",
      subtitle: "أكبر منصة لربط شركات التجهيز الطبي مع آلاف العيادات في العراق",
      gradient: "from-orange-900 to-red-900",
      image: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&q=80&w=2069"
    },
    {
      title: "وسع نطاق مبيعاتك",
      subtitle: "افتح متجرك الإلكتروني اليوم وابدأ البيع لآلاف الأطباء مباشرة",
      gradient: "from-slate-900 to-orange-900",
      image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=2070"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 pb-24" dir="rtl">
      <div className="container mx-auto px-4 py-8 max-w-7xl">

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-auto">

          {/* 1. Hero Section (Span 4) */}
          <div className="col-span-1 md:col-span-4 row-span-2 relative h-[400px] md:h-[500px] rounded-[2.5rem] overflow-hidden shadow-2xl group">
            {heroSlides.map((slide, idx) => (
              <div
                key={idx}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentHeroIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
              >
                <img src={slide.image} alt={slide.title} className="w-full h-full object-cover transform scale-105 group-hover:scale-110 transition-transform duration-[2s]" />
                <div className={`absolute inset-0 bg-gradient-to-r ${slide.gradient} opacity-80 mix-blend-multiply`}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

                <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-20 text-white z-20">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full w-fit mb-6 border border-white/10">
                    <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
                    <span className="text-sm font-medium text-orange-100">شريك النجاح الأول للقطاع الطبي</span>
                  </div>
                  <h1 className="text-4xl md:text-7xl font-black mb-6 leading-tight max-w-4xl tracking-tight">
                    {slide.title}
                  </h1>
                  <p className="text-xl md:text-2xl text-gray-200 mb-10 max-w-2xl font-light leading-relaxed">
                    {slide.subtitle}
                  </p>
                  <div className="flex gap-4">
                    <Link to="/register?type=supplier">
                      <Button className="bg-white text-orange-900 hover:bg-gray-100 px-8 py-4 rounded-2xl text-lg font-bold shadow-lg shadow-orange-900/20 transition-all hover:-translate-y-1">
                        انضم كمورد الآن
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 2. Store Management (Large Feature) */}
          <div className="col-span-1 md:col-span-1 md:row-span-2 bg-white rounded-3xl p-8 shadow-xl border border-gray-100 hover:border-orange-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-bl-[4rem] z-0 transition-transform group-hover:scale-110"></div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 mb-6 group-hover:rotate-6 transition-transform">
                <Store className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">متجر إلكتروني متكامل</h3>
              <p className="text-gray-500 leading-relaxed mb-6 flex-grow">
                واجهة احترافية لعرض منتجاتك، إدارة مخزونك، وتلقي الطلبات أوتوماتيكياً.
              </p>
              <div className="mt-auto">
                <div className="flex -space-x-2 space-x-reverse overflow-hidden mb-4">
                  {[1, 2, 3, 4].map((i) => (
                    <img key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-white" src={`https://i.pravatar.cc/150?u=${i}`} alt="" />
                  ))}
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500 ring-2 ring-white">+2k</div>
                </div>
                <p className="text-xs text-gray-400 font-medium">طبيب يثقون بمنصتنا</p>
              </div>
            </div>
          </div>

          {/* 3. Global Reach (Span 2) */}
          <div className="col-span-1 md:col-span-2 bg-gray-900 rounded-3xl p-8 text-white relative overflow-hidden group">
            {/* Map Background Illustration (Abstract) */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
              <div className="absolute top-1/2 right-1/3 w-2 h-2 bg-orange-500 rounded-full animate-ping delay-75"></div>
              <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-green-500 rounded-full animate-ping delay-150"></div>
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between h-full">
              <div className="max-w-md">
                <Globe className="w-12 h-12 text-blue-400 mb-4" />
                <h3 className="text-2xl font-bold mb-2">وصول أوسع للعملاء</h3>
                <p className="text-gray-400 leading-relaxed">
                  تجاوز الحدود الجغرافية. اعرض منتجاتك أمام آلاف العيادات والمراكز الطبية في جميع محافظات العراق بضغطة زر.
                </p>
              </div>
              <div className="mt-6 md:mt-0 bg-gray-800 p-4 rounded-2xl border border-gray-700">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">مبيعات اليوم</div>
                    <div className="font-bold text-lg text-white">+ 4,500,000 د.ع</div>
                  </div>
                </div>
                <div className="text-xs text-green-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>ارتفاع بنسبة 25%</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Order Management (Small) */}
          <div className="col-span-1 bg-white rounded-3xl p-6 shadow-lg border border-gray-100 hover:border-blue-200 transition-all group">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">إدارة الطلبات</h3>
            <p className="text-gray-500 text-sm">تتبع حالات الشحن والتوصيل لحظياً.</p>
          </div>

          {/* 5. Sales Reports (Span 1) */}
          <div className="col-span-1 bg-gradient-to-br from-slate-800 to-black rounded-3xl p-6 text-white shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
            <div className="relative z-10">
              <PieChart className="w-10 h-10 mb-4 text-orange-400" />
              <h3 className="text-xl font-bold mb-2">تقارير المبيعات</h3>
              <p className="text-gray-400 text-sm mb-4">حلل أداء منتجاتك الأكثر مبيعاً.</p>
              <div className="flex gap-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div className="w-1/3 bg-orange-500"></div>
                <div className="w-1/4 bg-blue-500"></div>
                <div className="w-full bg-gray-600"></div>
              </div>
            </div>
          </div>

          {/* 6. Jobs & Hiring (Span 2) */}
          <div className="col-span-1 md:col-span-2 bg-white rounded-3xl p-8 shadow-xl border border-gray-100 flex flex-col md:flex-row items-center gap-8 group">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">جديد</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">نشر الوظائف</h3>
              <p className="text-gray-500">هل تبحث عن مندوبين أو موظفين؟ أعلن عن شواغرك واستقبل السير الذاتية مباشرة عبر المنصة.</p>
            </div>
            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform shadow-sm">
              <Briefcase className="w-8 h-8" />
            </div>
          </div>

          {/* 7. Community (Small) */}
          <div className="col-span-1 bg-orange-50 rounded-3xl p-6 border border-orange-100 flex flex-col items-center justify-center text-center hover:bg-orange-100 transition-colors cursor-pointer">
            <MessageCircle className="w-10 h-10 text-orange-500 mb-3" />
            <h3 className="font-bold text-gray-900 mb-1">تواصل مباشر</h3>
            <p className="text-gray-500 text-xs">دردشة فورية مع العملاء</p>
          </div>


          {/* CTA Banner */}
          <div className="col-span-1 md:col-span-4 mt-8">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-[2.5rem] p-12 text-center relative overflow-hidden shadow-2xl shadow-orange-200">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>

              <div className="relative z-10 max-w-3xl mx-auto text-white">
                <h2 className="text-4xl md:text-5xl font-black mb-6">جاهز لمضاعفة أرباحك؟</h2>
                <p className="text-orange-100 text-xl mb-10">لا تفوت الفرصة. سجل الآن وابدأ بعرض منتجاتك لأكبر شبكة طبية في العراق.</p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link to="/register?type=supplier" className="w-full sm:w-auto">
                    <Button className="w-full sm:w-auto bg-white text-orange-600 hover:bg-gray-50 px-10 py-5 rounded-2xl text-xl font-bold shadow-xl transition-transform hover:scale-105">
                      ابدأ البيع الآن
                      <ArrowRight className="w-5 h-5 mr-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-20 border-t border-gray-200 pt-8 text-center">
          <p className="text-gray-500 font-medium">{settings.footer_text || '© 2025 SMART system. جميع الحقوق محفوظة.'}</p>
        </div>

      </div>
    </div>
  );
};
