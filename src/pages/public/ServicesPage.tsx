
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Brain, FileText, AlertCircle, MessageSquare, Upload, Phone, CheckCircle, Calendar as CalendarIcon, Navigation, User, Star, Stethoscope, Camera, Zap, ChevronRight, Clock, Heart, Shield, Filter, TrendingUp, Award, Users, Send, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { ClinicCard } from '../../components/cards/ClinicCard';
import { ArticleCard } from '../../components/cards/ArticleCard';
import { InteractiveMap } from '../../components/common/InteractiveMap';
import { usePublicClinics } from '../../hooks/usePublicClinics';
import { useArticles } from '../../hooks/useArticles';
import { useGeolocation } from '../../hooks/useGeolocation';
import { Clinic } from '../../types';

export const ServicesPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'clinics' | 'diagnosis' | 'articles' | 'emergency'>('clinics');
  const [clinicsSubTab, setClinicsSubTab] = useState<'map' | 'featured'>('map');
  const { clinics, loading: clinicsLoading } = usePublicClinics();
  const [filteredClinics, setFilteredClinics] = useState(clinics);
  const { articles, loading: articlesLoading } = useArticles();

  // Filters State
  const [selectedGovernorate, setSelectedGovernorate] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');

  // Geolocation & Map State
  const { location, calculateDistance, loading: geoLoading, error: geoError } = useGeolocation();
  const [mapCenter, setMapCenter] = useState({ lat: 33.3152, lng: 44.3661 }); // Iraq Center
  const [mapZoom, setMapZoom] = useState(6); // Iraq Level Zoom



  // Filter logic
  useEffect(() => {
    let result = clinics.filter(c => c.settings?.showOnMap !== false);

    // Apply Governorate filter
    if (selectedGovernorate) {
      result = result.filter(c => c.governorate === selectedGovernorate);
    }

    // Apply Specialty filter
    if (selectedSpecialty) {
      result = result.filter(c => 
        c.specialties?.some((s: string) => s.includes(selectedSpecialty)) ||
        c.specialties?.includes(selectedSpecialty)
      );
    }

    // Apply Featured filter if in featured tab
    if (clinicsSubTab === 'featured') {
      result = result.filter(c => c.isFeatured === true);
    }

    setFilteredClinics(result);
  }, [clinics, selectedGovernorate, selectedSpecialty, location, clinicsSubTab]);

  // Handle hash navigation on page load
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const tabId = hash.replace('#', '');
      const validTabs = ['tab-clinics', 'tab-diagnosis', 'tab-articles', 'tab-emergency'];
      if (validTabs.includes(tabId)) {
        const tabName = tabId.replace('tab-', '') as 'clinics' | 'diagnosis' | 'articles' | 'emergency';
        setActiveTab(tabName);
      }
    }
  }, []);



  // Filter options
  const governorates = [
    'بغداد', 'البصرة', 'كربلاء', 'النجف', 'أربيل', 'السليمانية',
    'الموصل', 'كركوك', 'ديالي', 'بابل', 'القادسية'
  ];

  const specialties = [
    'جراحة وجه وفكين', 'تقويم الأسنان', 'طب أسنان أطفال', 'علاج الجذور',
    'لثة وأنسجة داعمة', 'زراعة الأسنان', 'طب أسنان عام', 'تجميل الأسنان'
  ];

  // Smart Diagnosis Data
  const diagnosticMethods = [
    {
      id: 'ai',
      title: 'التشخيص بالمحادثة',
      icon: MessageSquare,
      description: 'محادثة ذكية شاملة مع الوكيل',
      features: [
        'محادثة طبيعية مع الوكيل',
        'أسئلة ذكية ومتسلسلة',
        'تحليل فوري للمشكلة',
        'توصيات مخصصة'
      ],
      duration: '3-5 دقائق',
      accuracy: '90%'
    },
    {
      id: 'smart',
      title: 'التشخيص الذكي',
      icon: Stethoscope,
      description: 'تشخيص عبر أسئلة متسلسلة',
      features: [
        'أسئلة منظمة ومتتالية',
        'بداية بـ "ماذا تعاني"',
        'تحديد دقيق للمشكلة',
        'اقتراح علاج أو زيارة عيادة'
      ],
      duration: '5-8 دقائق',
      accuracy: '85%'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-b from-white via-blue-50/50 to-white pt-6 pb-12 px-4 relative overflow-hidden border-b border-blue-100/50">
        {/* Abstract Background Pattern */}
        <div className="absolute inset-0 max-w-6xl mx-auto">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-[100px] -mr-32 -mt-32 mix-blend-multiply"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-100/40 rounded-full blur-[100px] -ml-32 -mb-32 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
        </div>

        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-4 text-center md:text-right">
            <div>
              <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                <span className="px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-bold border border-blue-100 shadow-sm">خدمات طبية</span>
                <span className="px-4 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm font-bold border border-purple-100 shadow-sm">شاملة</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight leading-tight">
                الخدمات <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">الطبية</span>
              </h1>
              <p className="text-xl text-slate-600 max-w-2xl leading-relaxed">منصة طبية متكاملة لخدمتك.. من التشخيص الذكي وحتى حجز الموعد.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Service Tabs */}
      <div className="container mx-auto px-4 -mt-8 max-w-6xl mb-3 relative z-20 flex justify-center">
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-1.5 border border-gray-100 grid grid-cols-2 md:flex md:flex-row items-center justify-center gap-1 w-full md:w-auto">
            {[
              { id: 'clinics', label: 'العيادات', icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-50' },
              { id: 'diagnosis', label: 'تشخيص ذكي', icon: Brain, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { id: 'articles', label: 'مقالات طبية', icon: FileText, color: 'text-green-600', bg: 'bg-green-50' },
              { id: 'emergency', label: 'طوارئ', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                }}
                id={`tab-${tab.id}`}
                className={`flex items-center justify-center md:justify-start gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 whitespace-nowrap w-full md:w-auto ${activeTab === tab.id
                  ? `${tab.bg} ${tab.color} shadow-sm ring-1 ring-inset ring-black/5 scale-105 z-10`
                  : 'hover:bg-gray-50 text-gray-500 hover:text-gray-900'
                  }`}
              >
                <div className={`p-1.5 rounded-lg ${activeTab === tab.id ? 'bg-white/80' : 'bg-gray-100'} transition-colors`}>
                  <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? tab.color : 'text-gray-500'}`} />
                </div>
                <span className={`font-bold text-xs ${activeTab === tab.id ? 'text-gray-900' : ''}`}>{tab.label}</span>
              </button>
            ))}
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 pt-2 pb-8 max-w-6xl">
        {activeTab === 'clinics' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Sub-Tabs: Map vs Featured */}
            <div className="flex justify-center md:justify-center gap-2 mb-2">
              <button
                onClick={() => setClinicsSubTab('map')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${clinicsSubTab === 'map'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
                  }`}
              >
                <Navigation className="w-4 h-4" />
                خريطة العيادات
              </button>
              <button
                onClick={() => setClinicsSubTab('featured')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${clinicsSubTab === 'featured'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-200 scale-105'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
                  }`}
              >
                <Award className="w-4 h-4" />
                العيادات المميزة
              </button>
            </div>

            {/* Horizontal Filters Section */}
            <div className="bg-white rounded-2xl p-2 px-3 shadow-sm border border-gray-100 overflow-x-auto no-scrollbar">
              <div className="flex flex-row items-end gap-3 min-w-max md:min-w-0">
                <div className="w-32 md:flex-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">المحافظة</label>
                  <select
                    value={selectedGovernorate}
                    onChange={(e) => setSelectedGovernorate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border-transparent rounded-lg focus:bg-white focus:ring-2 focus:ring-purple-500 transition-all text-sm font-medium text-gray-700"
                  >
                    <option value="">الكل</option>
                    {governorates.map(gov => <option key={gov} value={gov}>{gov}</option>)}
                  </select>
                </div>
                <div className="w-32 md:flex-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">الاختصاص</label>
                  <select
                    value={selectedSpecialty}
                    onChange={(e) => setSelectedSpecialty(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border-transparent rounded-lg focus:bg-white focus:ring-2 focus:ring-purple-500 transition-all text-sm font-medium text-gray-700"
                  >
                    <option value="">الكل</option>
                    {specialties.map(spec => <option key={spec} value={spec}>{spec}</option>)}
                  </select>
                </div>
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    onClick={() => { setSelectedGovernorate(''); setSelectedSpecialty(''); }}
                    className="px-4 h-[38px] rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 text-xs font-bold"
                  >
                    مسح الفلاتر
                  </Button>
                </div>
              </div>
            </div>

            {clinicsSubTab === 'map' ? (
              <>
                <Card className="overflow-hidden p-0 border-0 shadow-lg rounded-3xl ring-1 ring-black/5">
                  <InteractiveMap
                    clinics={filteredClinics}
                    center={mapCenter}
                    zoom={mapZoom}
                    height="500px"
                  />
                </Card>
              </>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClinics.map(clinic => (
                  <ClinicCard
                    key={clinic.id}
                    clinic={clinic}
                    expandable={true}
                    featured={clinic.isFeatured}
                  />
                ))}
              </div>
            )}

            {/* Clinics List (Only in Map View) */}
            {clinicsSubTab === 'map' && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  {selectedGovernorate || selectedSpecialty ? 'نتائج البحث' : 'استكشف العيادات'}
                  <span className="text-sm font-normal text-gray-400 mr-2">({filteredClinics.length}) عيادة</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredClinics.map(clinic => (
                    <ClinicCard key={clinic.id} clinic={clinic} expandable />
                  ))}
                </div>
              </div>
            )}

            {filteredClinics.length === 0 && !clinicsLoading && (
              <div className="py-20 text-center bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Filter className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">لا توجد نتائج تطابق بحثك</h3>
                <p className="text-gray-500">حاول تغيير الفلاتر أو مسحها لعرض جميع العيادات</p>
                <Button 
                  variant="outline" 
                  onClick={() => { setSelectedGovernorate(''); setSelectedSpecialty(''); }}
                  className="mt-4 rounded-xl"
                >
                  مسح جميع الفلاتر
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'diagnosis' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Diagnosis Header */}
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center p-2 bg-purple-100 rounded-xl mb-2">
                <Brain className="w-6 h-6 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1 tracking-tight">التشخيص الذكي</h2>
              <p className="text-sm text-gray-500 max-w-lg mx-auto">
                احصل على تشخيص فوري لحالتك باستخدام تقنيات الذكاء الاصطناعي
              </p>
            </div>

            {/* Diagnosis Content - Now Simplified to Links */}
            <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-6 mb-8">
              {diagnosticMethods.map((method) => (
                <div
                  key={method.id}
                  className="relative group cursor-pointer overflow-hidden rounded-2xl md:rounded-3xl border-2 border-transparent bg-white hover:border-purple-200 shadow-xl shadow-gray-200/50 transition-all duration-300 hover:scale-[1.02]"
                  onClick={() => navigate(method.id === 'ai' ? '/diagnosis/ai' : '/smart')}
                >
                  <div className="p-3 md:p-8">
                    <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-6 bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                      <method.icon className="w-5 h-5 md:w-7 md:h-7" />
                    </div>

                    <h3 className="text-sm md:text-2xl font-bold text-gray-900 mb-1 md:mb-3">{method.title}</h3>
                    <p className="text-[10px] md:text-base text-gray-600 mb-3 md:mb-6 leading-relaxed">{method.description}</p>

                    <div className="mt-3 md:mt-6 pt-3 md:pt-6 border-t border-purple-100/50">
                      <h4 className="font-bold text-gray-900 mb-2 md:mb-3 text-[10px] md:text-sm uppercase tracking-wider">المميزات:</h4>
                      <ul className="space-y-1 md:space-y-2">
                        {method.features.map((feature, index) => (
                          <li key={index} className="text-[9px] md:text-sm text-gray-600 flex items-center gap-1 md:gap-2">
                            <div className="w-3 h-3 md:w-5 md:h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                              <CheckCircle className="w-2 h-2 md:w-3 md:h-3 text-green-600" />
                            </div>
                            <span className="truncate md:whitespace-normal">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Hover Indicator - Hidden on Mobile */}
                  <div className="hidden md:flex absolute top-4 right-4 w-10 h-10 bg-gray-50 rounded-full items-center justify-center group-hover:bg-purple-600 transition-colors">
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transform rotate-180" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'articles' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">المقالات الطبية</h2>
                <p className="text-gray-500">ثقف نفسك بأحدث المعلومات الطبية الموثوقة</p>
              </div>
              <div className="hidden md:flex gap-2">
                <Button variant="outline" size="sm" className="rounded-xl">الأحدث</Button>
                <Button variant="ghost" size="sm" className="rounded-xl">الأكثر قراءة</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {articles.map(article => (
                <div key={article.id} className="transform transition-all duration-300 hover:-translate-y-1">
                  <ArticleCard article={article} />
                </div>
              ))}
              {articles.length === 0 && articlesLoading && (
                <div className="col-span-full py-20 text-center">
                  <div className="w-16 h-16 border-4 border-green-100 border-t-green-500 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-400 font-medium">جاري جلب أحدث المقالات...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'emergency' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Emergency Services Header */}
            <div className="text-center relative">
              <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-100 -z-10"></div>
              <span className="bg-gray-50 px-4 text-red-500 font-bold tracking-widest text-sm uppercase">منطقة الطوارئ</span>
              <h2 className="text-4xl font-black text-gray-900 mt-4 mb-2">خدمات الطوارئ العاجلة</h2>
              <p className="text-xl text-gray-600">استجابة سريعة للحالات الحرجة على مدار 24 ساعة</p>
            </div>

            {/* Emergency Service Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-8">
              {/* Dental Emergency Card */}
              <div
                className="group relative cursor-pointer overflow-hidden rounded-2xl md:rounded-[2rem] bg-white transition-all duration-300 hover:shadow-2xl hover:shadow-red-200/50 border border-gray-100"
                onClick={() => window.location.href = '/emergency/dental'}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="p-4 md:p-8 text-center relative z-10">
                  <div className="w-14 h-14 md:w-24 md:h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-6 group-hover:scale-110 transition-transform duration-500">
                    <div className="w-10 h-10 md:w-16 md:h-16 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-red-200">
                      <Zap className="w-5 h-5 md:w-8 md:h-8" />
                    </div>
                  </div>
                  <h3 className="text-sm md:text-2xl font-bold text-gray-900 mb-1 md:mb-3">طوارئ الأسنان</h3>
                  <p className="text-[10px] md:text-base text-gray-600 mb-3 md:mb-6 leading-relaxed">إدارة فورية للألم والحوادث الطارئة للأسنان</p>

                  <div className="flex flex-wrap gap-1 md:gap-2 justify-center mb-4 md:mb-8">
                    <span className="px-2 py-0.5 md:px-3 md:py-1 bg-red-50 text-red-600 text-[9px] md:text-xs font-bold rounded-lg border border-red-100">ألم شديد</span>
                    <span className="px-2 py-0.5 md:px-3 md:py-1 bg-red-50 text-red-600 text-[9px] md:text-xs font-bold rounded-lg border border-red-100">نزيف</span>
                  </div>

                  <div className="hidden md:flex w-12 h-12 rounded-full bg-gray-50 items-center justify-center mx-auto group-hover:bg-red-500 group-hover:text-white transition-all">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* First Aid Guide Card */}
              <div
                className="group relative cursor-pointer overflow-hidden rounded-2xl md:rounded-[2rem] bg-white transition-all duration-300 hover:shadow-2xl hover:shadow-blue-200/50 border border-gray-100"
                onClick={() => window.location.href = '/emergency/first-aid'}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="p-4 md:p-8 text-center relative z-10">
                  <div className="w-14 h-14 md:w-24 md:h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-6 group-hover:scale-110 transition-transform duration-500">
                    <div className="w-10 h-10 md:w-16 md:h-16 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-200">
                      <Heart className="w-5 h-5 md:w-8 md:h-8" />
                    </div>
                  </div>
                  <h3 className="text-sm md:text-2xl font-bold text-gray-900 mb-1 md:mb-3">دليل الإسعافات</h3>
                  <p className="text-[10px] md:text-base text-gray-600 mb-3 md:mb-6 leading-relaxed">تعامل مع الحالات الطارئة خطوة بخطوة</p>

                  <div className="flex flex-wrap gap-1 md:gap-2 justify-center mb-4 md:mb-8">
                    <span className="px-2 py-0.5 md:px-3 md:py-1 bg-blue-50 text-blue-600 text-[9px] md:text-xs font-bold rounded-lg border border-blue-100">إرشادات</span>
                  </div>

                  <div className="hidden md:flex w-12 h-12 rounded-full bg-gray-50 items-center justify-center mx-auto group-hover:bg-blue-500 group-hover:text-white transition-all">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Emergency Centers Card */}
              <div
                className="group relative cursor-pointer overflow-hidden rounded-2xl md:rounded-[2rem] bg-white transition-all duration-300 hover:shadow-2xl hover:shadow-green-200/50 border border-gray-100 col-span-2 md:col-span-1 mx-auto w-[calc(50%-0.75rem)] md:w-full"
                onClick={() => window.location.href = '/emergency/centers'}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="p-4 md:p-8 text-center relative z-10">
                  <div className="w-14 h-14 md:w-24 md:h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-6 group-hover:scale-110 transition-transform duration-500">
                    <div className="w-10 h-10 md:w-16 md:h-16 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-200">
                      <MapPin className="w-5 h-5 md:w-8 md:h-8" />
                    </div>
                  </div>
                  <h3 className="text-sm md:text-2xl font-bold text-gray-900 mb-1 md:mb-3">مراكز الطوارئ</h3>
                  <p className="text-[10px] md:text-base text-gray-600 mb-3 md:mb-6 leading-relaxed">أقرب العيادات والمستشفيات المناوبة</p>

                  <div className="flex flex-wrap gap-1 md:gap-2 justify-center mb-4 md:mb-8">
                    <span className="px-2 py-0.5 md:px-3 md:py-1 bg-green-50 text-green-600 text-[9px] md:text-xs font-bold rounded-lg border border-green-100">24/7</span>
                  </div>

                  <div className="hidden md:flex w-12 h-12 rounded-full bg-gray-50 items-center justify-center mx-auto group-hover:bg-green-500 group-hover:text-white transition-all">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Emergency Actions */}
            <div className="bg-slate-900 rounded-2xl md:rounded-3xl p-3 md:p-8 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>

              <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-6 relative z-10">
                <a href="tel:+9647700000000" className="block group">
                  <div className="h-full bg-red-600 hover:bg-red-700 p-2 md:p-6 rounded-xl md:rounded-2xl transition-all flex flex-col items-center justify-center text-center gap-1 md:gap-3 border border-red-500 shadow-lg shadow-red-900/20">
                    <div className="w-8 h-8 md:w-12 md:h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Phone className="w-4 h-4 md:w-6 md:h-6 text-white" />
                    </div>
                    <span className="text-[10px] md:text-lg font-bold">اتصال</span>
                  </div>
                </a>

                <button
                  onClick={() => window.location.href = '/emergency/centers'}
                  className="group h-full bg-white/10 hover:bg-white/20 p-2 md:p-6 rounded-xl md:rounded-2xl transition-all flex flex-col items-center justify-center text-center gap-1 md:gap-3 backdrop-blur-sm border border-white/10"
                >
                  <MapPin className="w-6 h-6 md:w-8 md:h-8 text-blue-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] md:text-lg font-medium">أقرب مركز</span>
                </button>

                <button
                  onClick={() => window.location.href = '/emergency/first-aid'}
                  className="group h-full bg-white/10 hover:bg-white/20 p-2 md:p-6 rounded-xl md:rounded-2xl transition-all flex flex-col items-center justify-center text-center gap-1 md:gap-3 backdrop-blur-sm border border-white/10"
                >
                  <CheckCircle className="w-6 h-6 md:w-8 md:h-8 text-yellow-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] md:text-lg font-medium">خطوات</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
