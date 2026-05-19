import React, { useState } from 'react';
import { HeartPulse, Layout, Sparkles, Tag, FileCheck, Gift } from 'lucide-react';
import { PromoCardsManager } from '../../../components/admin/campaigns/PromoCardsManager';
import { FeaturedManager } from '../../../components/admin/campaigns/FeaturedManager';
import { DealsManager } from '../../../components/admin/campaigns/DealsManager';
import { DealRequestsTable } from '../../../components/admin/campaigns/DealRequestsTable';
import { CouponsManager } from '../../../components/admin/campaigns/CouponsManager';

export const PatientStoreDealRequestsSection: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState('promo');

  const subTabs = [
    { id: 'promo', label: 'البطاقات الترويجية', icon: Layout, desc: 'إدارة سلايدر الإعلانات وبانرات الترويج في متجر المرضى' },
    { id: 'featured', label: 'المنتجات المميزة', icon: Sparkles, desc: 'إدارة وتخصيص المنتجات المعروضة في قسم "مميز" للمرضى' },
    { id: 'deals', label: 'منتجات العروض', icon: Tag, desc: 'إدارة صفقات المرضى النشطة، والخصومات المحددة بوقت' },
    { id: 'requests', label: 'طلبات العروض', icon: FileCheck, desc: 'معالجة واعتماد طلبات الحملات الترويجية وشارات المنتجات من الموردين لمتجر المرضى' },
    { id: 'coupons', label: 'قسائم التخفيض', icon: Gift, desc: 'إدارة وإنشاء قسائم وكوبونات الخصم المخصصة للمرضى والمراجعين' }
  ];

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header section with Premium design */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-l from-white to-teal-50/50 p-6 rounded-[2rem] border border-teal-100/50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20 transform hover:scale-105 transition-all duration-300">
            <HeartPulse className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">إدارة عروض وحملات متجر المرضى</h2>
            <p className="text-gray-500 text-sm mt-1">تحكم كامل ومحترف في السلايدر الإعلاني، المنتجات المميزة، كوبونات الخصم وطلبات الموردين الخاصة بمتجر المرضى</p>
          </div>
        </div>
      </div>

      {/* Modern Tabs */}
      <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm space-y-6">
        <div className="flex gap-2 border-b border-gray-100 pb-1 overflow-x-auto scrollbar-none">
          {subTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm transition-all duration-300 rounded-xl relative whitespace-nowrap active:scale-95 ${
                  isActive 
                    ? 'text-teal-600 bg-teal-50/80 shadow-sm border border-teal-100/30' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-4 h-4 transition-transform duration-300 ${isActive ? 'scale-110 text-teal-600' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
                {isActive && (
                  <div className="absolute bottom-[-5px] left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full shadow-sm" />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Container */}
        <div className="min-h-[450px] p-2 transition-all duration-300">
          <div className="mb-6 bg-teal-50/30 border border-teal-100/50 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-2 h-2 bg-teal-500 rounded-full animate-ping" />
            <span className="text-xs font-medium text-teal-800">
              {subTabs.find(t => t.id === activeSubTab)?.desc}
            </span>
          </div>

          <div className="animate-fadeIn">
            {activeSubTab === 'promo' && <PromoCardsManager storeType="patient" />}
            {activeSubTab === 'featured' && <FeaturedManager storeType="patient" />}
            {activeSubTab === 'deals' && <DealsManager storeType="patient" />}
            {activeSubTab === 'requests' && <DealRequestsTable storeType="patient" />}
            {activeSubTab === 'coupons' && <CouponsManager storeType="patient" />}
          </div>
        </div>
      </div>
    </div>
  );
};
