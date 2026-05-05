import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ArrowRight, List, Activity, Stethoscope, Smile, Sparkles, Scissors, Layers, Box, Star, ShieldCheck, Grid } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { PatientStoreHeader } from '../../../components/patient/store/PatientStoreHeader';
import { BottomNavigation } from '../../../components/layout/BottomNavigation';

// icon fallback map for categories without icons
const ICON_MAP: Record<number, React.ComponentType<any>> = {
  0: Stethoscope,
  1: Box,
  2: Layers,
  3: Smile,
  4: Scissors,
  5: Activity,
  6: Sparkles,
  7: Star,
  8: ShieldCheck,
};

const BG_MAP: Record<number, string> = {
  0: 'bg-teal-100 text-teal-600',
  1: 'bg-emerald-100 text-emerald-600',
  2: 'bg-purple-100 text-purple-600',
  3: 'bg-amber-100 text-amber-600',
  4: 'bg-rose-100 text-rose-600',
  5: 'bg-cyan-100 text-cyan-600',
  6: 'bg-indigo-100 text-indigo-600',
  7: 'bg-orange-100 text-orange-600',
  8: 'bg-blue-100 text-blue-600',
};

interface PatientCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  is_active: boolean;
}

export const PatientCategoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<PatientCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('patient_store_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        if (data) setCategories(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 pb-24" dir="rtl">
      <PatientStoreHeader />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">أقسام المتجر</h1>
            <p className="text-gray-600">تسوق حسب الفئة التي تريدها</p>
          </div>
          <button
            onClick={() => navigate('/patient/store/products')}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-teal-600 rounded-2xl font-bold hover:bg-teal-50 transition-colors shadow-sm"
          >
            <List className="w-5 h-5" />
            كل المنتجات
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-teal-100 border-t-teal-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[160px] md:auto-rows-[200px]">
            {categories.map((category, idx) => {
              const styles = [
                { bg: 'bg-teal-50', color: 'text-teal-600', icon: Sparkles },
                { bg: 'bg-blue-50', color: 'text-blue-600', icon: Activity },
                { bg: 'bg-purple-50', color: 'text-purple-600', icon: Star },
                { bg: 'bg-amber-50', color: 'text-amber-600', icon: ShieldCheck },
                { bg: 'bg-emerald-50', color: 'text-emerald-600', icon: Smile },
                { bg: 'bg-rose-50', color: 'text-rose-600', icon: Grid },
                { bg: 'bg-cyan-50', color: 'text-cyan-600', icon: Layers },
                { bg: 'bg-indigo-50', color: 'text-indigo-600', icon: Box },
              ];
              const style = styles[idx % styles.length];
              const Icon = style.icon;
              
              // Professional Bento Spans
              let spanClass = "col-span-1 row-span-1";
              if (idx === 0) spanClass = "col-span-2 md:col-span-2 md:row-span-2"; // Featured
              if (idx === 3) spanClass = "col-span-2 md:col-span-2 md:row-span-1"; // Wide
              if (idx === 4) spanClass = "col-span-1 md:row-span-2"; // Tall

              return (
                <div
                  key={category.id}
                  onClick={() => navigate(`/patient/store/products?category=${encodeURIComponent(category.name)}`)}
                  className={`
                    ${spanClass}
                    relative overflow-hidden rounded-[2.5rem] p-6 cursor-pointer
                    transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 group
                    ${style.bg} border border-white/50 flex flex-col justify-between
                  `}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/40 transition-colors duration-500"></div>

                  <div className="flex justify-between items-start z-10">
                    <div className={`w-12 h-12 rounded-2xl bg-white/80 backdrop-blur-md flex items-center justify-center shadow-sm border border-white/50 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ${style.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/40 backdrop-blur-sm flex items-center justify-center group-hover:bg-white transition-all duration-300 shadow-sm border border-white/20">
                      <ChevronLeft className={`w-5 h-5 ${style.color} group-hover:-translate-x-1 transition-all`} />
                    </div>
                  </div>

                  <div className="z-10">
                    <h3 className={`font-bold text-gray-800 mb-1 leading-tight transition-colors ${idx === 0 ? 'text-2xl md:text-3xl' : 'text-lg md:text-xl'}`}>
                      {category.name}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-500 font-medium opacity-80 group-hover:opacity-100 transition-opacity">تصفح أفضل المنتجات الصحية</p>
                  </div>

                  {/* Decorative Background Icon */}
                  <Icon className={`absolute -bottom-6 -left-6 w-32 h-32 md:w-48 md:h-48 opacity-[0.05] rotate-12 transition-all duration-700 group-hover:scale-125 group-hover:rotate-[20deg] ${style.color}`} />
                </div>
              );
            })}

            {/* View All Products Card */}
            <div
              onClick={() => navigate('/patient/store/products')}
              className="relative overflow-hidden rounded-[2.5rem] p-6 cursor-pointer transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 group bg-slate-900 border border-slate-800 flex flex-col justify-between text-white col-span-2"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="flex justify-between items-start z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/10 text-white backdrop-blur-md border border-white/10 shadow-lg group-hover:scale-110 transition-transform">
                  <List className="w-6 h-6" />
                </div>
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white transition-all duration-300 border border-white/5">
                  <ArrowRight className="w-5 h-5 text-white/70 group-hover:text-white transition-colors rotate-180" />
                </div>
              </div>

              <div className="z-10">
                <h3 className="text-xl md:text-2xl font-bold text-white mb-1 leading-tight group-hover:text-teal-300 transition-colors">جميع المنتجات</h3>
                <p className="text-xs md:text-sm text-slate-400 group-hover:text-slate-300 transition-colors">استكشف المجموعة الكاملة بلمسة واحدة</p>
              </div>

              <List className="absolute -bottom-6 -left-6 w-32 h-32 md:w-48 md:h-48 opacity-[0.1] rotate-12 transition-all duration-700 group-hover:scale-125 group-hover:rotate-[20deg] text-white" />
            </div>

            {categories.length === 0 && (
              <div className="col-span-full py-16 text-center text-gray-400">
                <p className="font-bold text-lg">لا توجد فئات متاحة حالياً</p>
                <p className="text-sm mt-1">يمكن إضافة الفئات من قسم إدارة متجر المرضى</p>
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};
