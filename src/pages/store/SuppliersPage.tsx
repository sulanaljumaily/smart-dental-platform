import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Store, Package, ArrowRight, Star, MapPin, Phone, CheckCircle2, Factory, Filter, ArrowDownAZ, ArrowUpAZ, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
// import { mockSuppliers } from '../../data/mock/store';
import { Button } from '../../components/common/Button';
import { BottomNavigation } from '../../components/layout/BottomNavigation';
import { formatLocation } from '../../utils/location';

export default function SuppliersPage() {
    const navigate = useNavigate();

    // Filter States
    const [selectedCity, setSelectedCity] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'rating' | 'alpha-asc' | 'alpha-desc'>('rating');
    const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');

    const cities = [
        'بغداد', 'البصرة', 'نينوى', 'أربيل', 'النجف', 'كربلاء',
        'كركوك', 'ديالى', 'الأنبار', 'بابل', 'واسط',
        'صلاح الدين', 'المثنى', 'القادسية', 'ذي قار',
        'ميسان', 'السليمانية', 'دهوك'
    ];

    const specialties = [
        { id: 'ortho', label: 'تقويم الأسنان (Orthodontics)' },
        { id: 'implant', label: 'زراعة الأسنان (Implants)' },
        { id: 'equipment', label: 'أجهزة ومعدات (Equipment)' },
        { id: 'lab', label: 'مختبرات (Lab)' },
        { id: 'consumables', label: 'مستهلكات (Consumables)' }
    ];

    // State for Real Data
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSuppliersData = async () => {
            try {
                const { data, error } = await supabase
                    .from('suppliers')
                    .select('*')
                    .in('store_type', ['professional', 'both']);

                if (error) throw error;
                setSuppliers(data || []);
            } catch (err) {
                console.error('Error loading suppliers:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSuppliersData();
    }, []);

    // Filter Logic
    const filteredSuppliers = useMemo(() => {
        let result = [...suppliers];

        // 1. City Filter
        if (selectedCity !== 'all') {
            result = result.filter(s => s.governorate === selectedCity);
        }

        // 2. Sorting
        result.sort((a, b) => {
            const ratingA = a.rating || 0;
            const ratingB = b.rating || 0;
            const nameA = a.name || '';
            const nameB = b.name || '';

            if (sortBy === 'rating') return ratingB - ratingA;
            if (sortBy === 'alpha-asc') return nameA.localeCompare(nameB, 'ar');
            if (sortBy === 'alpha-desc') return nameB.localeCompare(nameA, 'ar');
            return 0;
        });

        return result;
    }, [suppliers, selectedCity, sortBy, selectedSpecialty]);

    return (
        <div className="min-h-screen bg-slate-50 pb-20" dir="rtl">


            <div className="max-w-7xl mx-auto px-4 py-6 text-right">

                {/* Filters Section (Bento Style) */}
                <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6">

                    {/* City Select */}
                    <div className="bg-white p-2.5 md:p-4 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm relative group flex flex-col justify-between">
                        <label className="text-[10px] md:text-xs font-bold text-slate-400 mb-1.5 block flex items-center gap-1 md:gap-2">
                            <MapPin className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-indigo-500 shrink-0" />
                            <span className="truncate">المحافظة</span>
                        </label>
                        <div className="relative">
                            <select
                                value={selectedCity}
                                onChange={(e) => setSelectedCity(e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-lg md:rounded-xl text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none py-1.5 px-2 pl-6 md:py-2.5 md:px-4 md:pl-10 text-[10px] md:text-sm"
                            >
                                <option value="all">كل العراق</option>
                                {cities.map(city => <option key={city} value={city}>{city}</option>)}
                            </select>
                            <ChevronDown className="absolute left-1.5 md:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Sort Select */}
                    <div className="bg-white p-2.5 md:p-4 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm relative flex flex-col justify-between">
                        <label className="text-[10px] md:text-xs font-bold text-slate-400 mb-1.5 block flex items-center gap-1 md:gap-2">
                            <Filter className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-indigo-500 shrink-0" />
                            <span className="truncate">الترتيب</span>
                        </label>
                        <div className="flex items-center gap-0.5 md:gap-1 bg-slate-50 rounded-lg md:rounded-xl p-0.5 md:p-1 h-[28px] md:h-[40px]">
                            <button onClick={() => setSortBy('rating')} className={`flex-1 py-0.5 md:py-1.5 rounded-md md:rounded-lg text-[9px] md:text-xs font-bold transition-all ${sortBy === 'rating' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>التقييم</button>
                            <button onClick={() => setSortBy('alpha-asc')} className={`flex-1 py-0.5 md:py-1.5 rounded-md md:rounded-lg text-[9px] md:text-xs font-bold transition-all flex justify-center items-center gap-0.5 md:gap-1 ${sortBy === 'alpha-asc' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>
                                <ArrowDownAZ className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 shrink-0" /> <span className="hidden xs:inline">أ-ي</span><span className="xs:hidden">أ</span>
                            </button>
                            <button onClick={() => setSortBy('alpha-desc')} className={`flex-1 py-0.5 md:py-1.5 rounded-md md:rounded-lg text-[9px] md:text-xs font-bold transition-all flex justify-center items-center gap-0.5 md:gap-1 ${sortBy === 'alpha-desc' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>
                                <ArrowUpAZ className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 shrink-0" /> <span className="hidden xs:inline">ي-أ</span><span className="xs:hidden">ي</span>
                            </button>
                        </div>
                    </div>

                    {/* Specialty Select */}
                    <div className="bg-white p-2.5 md:p-4 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm relative flex flex-col justify-between">
                        <label className="text-[10px] md:text-xs font-bold text-slate-400 mb-1.5 block flex items-center gap-1 md:gap-2">
                            <Factory className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-indigo-500 shrink-0" />
                            <span className="truncate">التصنيف</span>
                        </label>
                        <div className="relative">
                            <select
                                value={selectedSpecialty}
                                onChange={(e) => setSelectedSpecialty(e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-lg md:rounded-xl text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none py-1.5 px-2 pl-6 md:py-2.5 md:px-4 md:pl-10 text-[10px] md:text-sm"
                            >
                                <option value="all">جميع التخصصات</option>
                                {specialties.map(spec => <option key={spec.id} value={spec.id}>{spec.label}</option>)}
                            </select>
                            <ChevronDown className="absolute left-1.5 md:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[280px]">

                    {/* Suppliers Cards */}
                    {filteredSuppliers.map((supplier, idx) => {
                        return (
                            <div
                                key={supplier.id}
                                onClick={() => navigate(`/store/supplier/${supplier.id}`)}
                                className="group relative bg-white rounded-3xl p-5 border border-slate-100 hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden group-hover:scale-110 transition-transform duration-300">
                                        {supplier.logo_url ? (
                                            <img src={supplier.logo_url} alt={supplier.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <Store className="w-8 h-8 text-indigo-600" />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                        <span className="text-xs font-bold text-amber-700">{supplier.rating}</span>
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-1">{supplier.name}</h3>
                                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                                        {supplier.description || 'مورد معتمد يوفر أفضل المنتجات الطبية الأصلية بأسعار تنافسية.'}
                                    </p>

                                    <div className="space-y-2 mt-auto">
                                        <div className="flex items-center gap-2 text-xs text-slate-400">
                                            <MapPin className="w-3.5 h-3.5" />
                                            <span className="line-clamp-1">{formatLocation(supplier.governorate, supplier.address) || 'العراق'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Hover Action */}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white via-white to-transparent p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex justify-end">
                                    <span className="bg-indigo-600 text-white p-2 rounded-full shadow-lg">
                                        <ArrowRight className="w-5 h-5 rotate-180" />
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <BottomNavigation />
        </div>
    );
}
