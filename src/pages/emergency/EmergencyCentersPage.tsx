import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, MapPin, Phone, Clock, Star, Building2, Filter, Search, Heart, Stethoscope, Shield, Award } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { formatLocation } from '../../utils/location';
import { useClinics } from '../../hooks/useClinics';
import { supabase } from '../../lib/supabase';
import { useEmergencyHotline } from '../../hooks/useEmergencyHotline';

interface EmergencyCenter {
  id: string;
  name: string;
  type: 'government' | 'private';
  phone: string;
  address: string;
  governorate: string;
  workingHours: string;
  rating: number;
  services: string[];
  is24Hours: boolean;
  specialties: string[];
  location: {
    lat: number;
    lng: number;
  };
}

const governorates = [
  'بغداد', 'البصرة', 'كربلاء', 'النجف', 'أربيل', 'السليمانية',
  'الموصل', 'كركوك', 'ديالي', 'بابل', 'ذي قار', 'القادسية',
  'الأنبار', 'ديالى', 'كربلاء', 'كوفة', 'ميسان', 'المثنى'
];

export const EmergencyCentersPage: React.FC = () => {
  const { hotline } = useEmergencyHotline();
  const [emergencyCenters, setEmergencyCenters] = useState<EmergencyCenter[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedGovernorate, setSelectedGovernorate] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'government' | 'private'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const { clinics, loading: clinicsLoading } = useClinics();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEmergencyData = async () => {
      setLoading(true);
      try {
        // Fetch Centers
        const { data: centersData, error: centersError } = await supabase
          .from('emergency_centers')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (centersData) {
          const mappedCenters: EmergencyCenter[] = centersData.map(c => ({
            id: c.id,
            name: c.name,
            type: c.type as 'government' | 'private',
            phone: c.phone,
            address: c.address,
            governorate: c.governorate,
            workingHours: c.working_hours,
            rating: 5.0, // Default
            services: c.services || [],
            is24Hours: c.is_24h,
            specialties: [], // Default
            location: c.location
          }));
          setEmergencyCenters(mappedCenters);
        }
      } catch (error) {
        console.error('Error fetching emergency data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmergencyData();
  }, []);

  const filteredCenters = useMemo(() => {
    let filtered = emergencyCenters;

    // Filter by governorate
    if (selectedGovernorate) {
      filtered = filtered.filter(center => center.governorate === selectedGovernorate);
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(center => center.type === selectedType);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(center =>
        center.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        center.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        center.services.some(service => service.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Only 24 hours centers for government, or show all for private
    if (selectedType === 'government') {
      filtered = filtered.filter(center => center.is24Hours);
    } else if (selectedType === 'private') {
      // For private, we'll show all private clinics with dental surgery specialty
      // We can integrate with the actual clinics data here
    }

    // If no specific governorate selected, show all emergency centers
    return filtered;
    // If no specific governorate selected, show all emergency centers
    return filtered;
  }, [emergencyCenters, selectedGovernorate, selectedType, searchTerm]);

  // Get surgical clinics for private filter
  const surgicalClinics = useMemo(() => {
    if (selectedType === 'private') {
      return clinics.filter(clinic =>
        clinic.specialties?.some(specialty =>
          specialty.includes('جراحة') ||
          specialty.includes('فك') ||
          specialty.includes('جراحة الفم')
        )
      );
    }
    return [];
  }, [selectedType, clinics]);

  const resetFilters = () => {
    setSelectedGovernorate('');
    setSelectedType('all');
    setSearchTerm('');
  };

  const getTypeIcon = (type: 'government' | 'private') => {
    return type === 'government'
      ? <Building2 className="w-5 h-5" />
      : <Heart className="w-5 h-5" />;
  };

  const getTypeColor = (type: 'government' | 'private') => {
    return type === 'government'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-green-100 text-green-800';
  };

  const getTypeLabel = (type: 'government' | 'private') => {
    return type === 'government' ? 'حكومي' : 'خاص';
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Helmet>
        <title>مراكز طوارئ الأسنان والمستشفيات في العراق | Dental Platform</title>
        <meta name="description" content="دليل مراكز طوارئ الأسنان والمستشفيات الحكومية والخاصة المتاحة على مدار الساعة في المحافظات العراقية." />
        <link rel="canonical" href="https://dental-platform.com/emergency/centers" />
        <meta property="og:title" content="مراكز طوارئ الأسنان والمستشفيات في العراق | Dental Platform" />
        <meta property="og:description" content="دليل مراكز طوارئ الأسنان والمستشفيات الحكومية والخاصة المتاحة على مدار الساعة في المحافظات العراقية." />
        <meta property="og:url" content="https://dental-platform.com/emergency/centers" />
      </Helmet>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 py-4 px-4 relative overflow-hidden">
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/services#tab-emergency')}
              className="border-gray-200 text-gray-600 hover:bg-gray-50 h-8 px-3 text-xs"
            >
              <ArrowRight className="w-3 h-3 ml-1" />
              العودة
            </Button>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-600 border border-green-100">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              شبكة الطوارئ
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-black text-gray-900 leading-tight">مراكز الطوارئ</h1>
              <p className="text-sm text-gray-500 mt-1">
                أقرب مراكز طوارئ الأسنان والمستشفيات في العراق مع معلومات التواصل المباشر.
              </p>
            </div>
            <div className="hidden md:flex items-center gap-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 shadow-sm -ml-2">H+</div>
              ))}
              <div className="w-8 h-8 rounded-full border-2 border-white bg-green-100 flex items-center justify-center text-[10px] font-bold text-green-600 -ml-2">+50</div>
              <span className="text-xs text-gray-500 mr-3">مركز متاح</span>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Contact Banner */}
      <div className="container mx-auto max-w-6xl px-4 py-3 relative z-20">
        <div className="bg-white rounded-xl shadow-md border border-green-100 p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center border border-green-100">
              <Phone className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">خدمة طوارئ 24 ساعة</h3>
              <p className="text-xs text-gray-500">للحالات العاجلة المتخصصة - فريق جاهز</p>
            </div>
          </div>
          <a href={`tel:${hotline}`}>
            <Button className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 h-auto text-sm font-bold">
              <Phone className="w-4 h-4 ml-1.5" />
              {hotline}
            </Button>
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-6xl px-4 pb-8">
        {/* Filters Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 mb-4 flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="flex-1 min-w-[180px]">
            <div className="relative group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-green-500 transition-colors" />
              <input
                type="text"
                placeholder="البحث عن مركز أو خدمة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border-transparent focus:bg-white border focus:border-green-500 rounded-lg focus:ring-2 focus:ring-green-50 transition-all text-right outline-none"
              />
            </div>
          </div>

          {/* Governorate Filter */}
          <div className="min-w-[150px] flex-1 lg:flex-none lg:w-44">
            <select
              value={selectedGovernorate}
              onChange={(e) => setSelectedGovernorate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-50 border-transparent focus:bg-white border focus:border-green-500 rounded-lg focus:ring-2 focus:ring-green-50 transition-all text-right outline-none cursor-pointer"
            >
              <option value="">جميع المحافظات</option>
              {governorates.map(governorate => (
                <option key={governorate} value={governorate}>{governorate}</option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="min-w-[140px] flex-1 lg:flex-none lg:w-40">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as 'all' | 'government' | 'private')}
              className="w-full px-3 py-2 text-sm bg-gray-50 border-transparent focus:bg-white border focus:border-green-500 rounded-lg focus:ring-2 focus:ring-green-50 transition-all text-right outline-none cursor-pointer"
            >
              <option value="all">جميع الأنواع</option>
              <option value="government">حكومي (24 ساعة)</option>
              <option value="private">خاص (عيادات)</option>
            </select>
          </div>

          {/* View Mode */}
          <div className="flex gap-0.5 bg-gray-100/50 p-1 rounded-lg border border-gray-100">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Filter className="w-3.5 h-3.5" />
              قائمة
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'map' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <MapPin className="w-3.5 h-3.5" />
              خريطة
            </button>
          </div>

          {/* Reset Filters */}
          {(searchTerm || selectedGovernorate || selectedType !== 'all') && (
            <Button variant="ghost" onClick={resetFilters} size="sm" className="text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg text-xs px-2 py-1.5 h-auto">
              × مسح
            </Button>
          )}
        </div>

        {/* Results Summary */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              نتائج البحث
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{filteredCenters.length}</span>
            </h2>
            {selectedType !== 'all' && (
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedType === 'government' ? 'مراكز حكومية (24 ساعة)' : 'عيادات خاصة'}
                {selectedGovernorate && ` • ${selectedGovernorate}`}
              </p>
            )}
          </div>
        </div>

        {/* Centers List */}
        {viewMode === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCenters.map((center) => (
              <div key={center.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-green-100 transition-all group flex flex-col">
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${getTypeColor(center.type)}`}>
                          {getTypeIcon(center.type)}
                          <span className="mr-0.5">{getTypeLabel(center.type)}</span>
                        </span>
                        {center.is24Hours && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600 flex items-center gap-1 border border-red-100">
                            <Clock className="w-3 h-3" />
                            24 ساعة
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-gray-900 mb-1 group-hover:text-green-600 transition-colors">{center.name}</h3>
                      <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-3">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span>{center.address}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-yellow-50 text-yellow-600 border border-yellow-100 flex-shrink-0">
                      <span className="font-bold text-sm">{center.rating}</span>
                      <Star className="w-2.5 h-2.5 fill-current" />
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">الخدمات المتوفرة</p>
                    <div className="flex flex-wrap gap-1">
                      {center.services.slice(0, 3).map((service, index) => (
                        <span key={index} className="px-2 py-0.5 bg-gray-50 text-gray-600 text-[11px] font-medium rounded-md border border-gray-100">
                          {service}
                        </span>
                      ))}
                      {center.services.length > 3 && (
                        <span className="px-2 py-0.5 bg-gray-50 text-gray-400 text-[11px] font-medium rounded-md border border-gray-100">
                          +{center.services.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-auto pt-3 border-t border-gray-50">
                  <a href={`tel:${center.phone}`} className="col-span-1">
                    <Button className="w-full bg-green-50 text-green-700 hover:bg-green-100 border-green-100 shadow-none font-bold text-xs h-8" variant="secondary">
                      <Phone className="w-3.5 h-3.5 ml-1.5" />
                      اتصال
                    </Button>
                  </a>
                  <Button
                    variant="outline"
                    className="col-span-1 border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-bold text-xs h-8"
                    onClick={() => window.open(`https://maps.google.com/?q=${center.location.lat},${center.location.lng}`, '_blank')}
                  >
                    <MapPin className="w-3.5 h-3.5 ml-1.5" />
                    الخريطة
                  </Button>
                </div>
              </div>
            ))}

            {/* Show surgical clinics for private type */}
            {selectedType === 'private' && surgicalClinics.length > 0 && (
              <>
                {surgicalClinics.map((clinic) => (
                  <div key={clinic.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-green-100 transition-all group flex flex-col">
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 flex items-center gap-1 border border-green-100">
                              <Heart className="w-3 h-3" />
                              عيادة خاصة
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-gray-900 mb-1 group-hover:text-green-600 transition-colors">{clinic.name}</h4>
                          <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-3">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span>{formatLocation(clinic.governorate, clinic.address)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mb-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">الاختصاصات</p>
                        <div className="flex flex-wrap gap-1">
                          {clinic.specialties?.slice(0, 3).map((specialty, index) => (
                            <span key={index} className="px-2 py-0.5 bg-gray-50 text-gray-600 text-[11px] font-medium rounded-md border border-gray-100">
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-auto pt-3 border-t border-gray-50">
                      <Button variant="primary" className="col-span-1 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-xs h-8" onClick={() => navigate(`/booking?clinic=${clinic.id}`)}>
                        حجز
                      </Button>
                      <Button variant="outline" className="col-span-1 border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-bold rounded-lg text-xs h-8">
                        <MapPin className="w-3.5 h-3.5 ml-1.5" />
                        موقع
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {filteredCenters.length === 0 && selectedType !== 'private' && (
              <div className="col-span-full text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200">
                <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-7 h-7 text-gray-300" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">لا توجد نتائج مطابقة</h3>
                <p className="text-sm text-gray-500">جرب تغيير الفلاتر أو البحث عن منطقة أخرى</p>
                <Button variant="outline" onClick={resetFilters} className="mt-4 border-gray-200 text-sm h-8">
                  إعادة تعيين الفلاتر
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Map View */}
        {viewMode === 'map' && (
          <Card className="p-0 overflow-hidden">
            <div className="p-3 bg-green-50 border-b border-green-200">
              <h3 className="text-base font-bold text-gray-900">خريطة المراكز</h3>
            </div>
            <div className="h-80 bg-gray-200 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 text-sm">خريطة تفاعلية</p>
                <p className="text-xs text-gray-500">تظهر مواقع المراكز على الخريطة</p>
              </div>
            </div>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Card className="p-4 text-center hover:shadow-md transition-shadow">
            <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Phone className="w-4 h-4 text-red-600" />
            </div>
            <h3 className="font-bold text-gray-900 text-sm mb-1">اتصال طوارئ</h3>
            <p className="text-gray-600 text-xs mb-3">للحالات العاجلة</p>
            <a href={`tel:${hotline}`}>
              <Button className="w-full bg-red-500 hover:bg-red-600 text-white text-xs h-8">
                {hotline}
              </Button>
            </a>
          </Card>

          <Card className="p-4 text-center hover:shadow-md transition-shadow">
            <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Stethoscope className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-900 text-sm mb-1">طوارئ الأسنان</h3>
            <p className="text-gray-600 text-xs mb-3">إسعافات أولية وتوجيهات</p>
            <a href="/emergency/dental">
              <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white text-xs h-8">
                استكشاف
              </Button>
            </a>
          </Card>

          <Card className="p-4 text-center hover:shadow-md transition-shadow">
            <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Heart className="w-4 h-4 text-green-600" />
            </div>
            <h3 className="font-bold text-gray-900 text-sm mb-1">الإسعافات الأولية</h3>
            <p className="text-gray-600 text-xs mb-3">دليل تفاعلي شامل</p>
            <a href="/emergency/first-aid">
              <Button className="w-full bg-green-500 hover:bg-green-600 text-white text-xs h-8">
                قراءة الدليل
              </Button>
            </a>
          </Card>
        </div>
      </div>
    </div>
  );
};
