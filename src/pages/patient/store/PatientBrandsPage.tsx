import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Package, ChevronLeft, Search, ShieldCheck, Globe } from 'lucide-react';
import { useBrands } from '../../../hooks/useBrands';
import { Button } from '../../../components/common/Button';
import { PatientStoreHeader } from '../../../components/patient/store/PatientStoreHeader';
import { BottomNavigation } from '../../../components/layout/BottomNavigation';

export const PatientBrandsPage: React.FC = () => {
  const navigate = useNavigate();
  const { brands, loading } = useBrands();
  const [searchQuery, setSearchQuery] = useState('');

  const patientBrands = brands.filter(brand => !brand.target_audience || brand.target_audience.includes('patient'));

  const filteredBrands = patientBrands.filter(brand =>
    brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    brand.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center">جاري التحميل...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-24" dir="rtl">
      <PatientStoreHeader />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Search Bar */}
        <div className="mb-8 relative max-w-2xl mx-auto">
          <input
            type="text"
            placeholder="ابحث عن علامة تجارية..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl py-4 pr-12 pl-4 shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all text-slate-800 font-medium outline-none"
          />
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        </div>

        {/* Bento Grid layout */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 auto-rows-max">

          {/* Brand Cards */}
          {filteredBrands.map((brand) => (
            <div
              key={brand.id}
              onClick={() => navigate(`/patient/store/brand/${brand.id}`)}
              className="col-span-1 bg-white rounded-3xl p-4 border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col items-center justify-between group h-[180px]"
            >
              <div className="w-full flex justify-between items-start">
                <div className="bg-slate-50 rounded-full px-2 py-1 text-[10px] font-bold text-slate-500 border border-slate-100 flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  {brand.country}
                </div>
                {brand.verified && <ShieldCheck className="w-4 h-4 text-teal-500" />}
              </div>

              <div className="flex-1 flex flex-col items-center justify-center py-2 text-center w-full">
                <div className="h-12 w-full flex items-center justify-center mb-3 grayscale group-hover:grayscale-0 transition-all duration-500 transform group-hover:scale-110">
                  {brand.logo ? (
                    <img src={brand.logo} alt={brand.name} className="h-full w-auto object-contain" />
                  ) : (
                    <span className="text-2xl font-bold text-gray-300">{brand.name.charAt(0)}</span>
                  )}
                </div>
                <h3 className="font-bold text-slate-800 text-sm md:text-base group-hover:text-teal-600 transition-colors line-clamp-1">
                  {brand.name}
                </h3>
                <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 px-2 hidden md:block">
                  {brand.description}
                </p>
              </div>

              <div className="w-full pt-3 border-t border-slate-50 flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">منتجات</span>
                <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-teal-500 group-hover:text-white transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};
