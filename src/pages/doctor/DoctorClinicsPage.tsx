import React, { useState } from 'react';
import { Building2, MapPin, Plus, Settings, Users, Shield, LayoutDashboard, Star, Phone, Clock, Activity, Trash2, AlertTriangle, Lock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { useClinics } from '@/hooks/useClinics';
import { useAppointments } from '../../hooks/useAppointments';
import { usePatients } from '../../hooks/usePatients';
import { useStaff } from '../../hooks/useStaff';
// Re-trigger

import { useSubscriptionLimits } from '../../hooks/useSubscriptionLimits'; // Added import
import { useAuth } from '../../contexts/AuthContext';
import { useDoctorContext } from '../../contexts/DoctorContext';
import { ClinicLocationPicker } from '../../components/common/ClinicLocationPicker';
import { useStorage } from '../../hooks/useStorage';
import { UpgradeModal } from '../../components/subscription/UpgradeModal';

export const DoctorClinicsPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth(); // Added user hook
  // Removed duplicate hook call from here, moving it down to use selectedClinic state
  const isStaff = user?.role === 'staff'; // Added staff check
  const { selectedClinicId } = useDoctorContext(); // Get global filter

  const [selectedClinic, setSelectedClinic] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const { checkLimit, hasFeature } = useSubscriptionLimits(selectedClinic || undefined); // Use limits hook with context
  const [showAddClinic, setShowAddClinic] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<{ title: string; description: string } | undefined>(undefined);
  const [clinicToDelete, setClinicToDelete] = useState<string | null>(null);

  /* 
   * Updated Tab Logic:
   * - Exclusive conditional rendering for each tab to prevent merging.
   * - Renamed 'permissions' to 'staff_settings'.
   * - Added Credential Management.
   */
  const [isSaved, setIsSaved] = useState(false);

  const [generatedCredentials, setGeneratedCredentials] = useState<{ [key: string]: { username?: string, password?: string, saved?: boolean } }>({});
  const [activeTab, setActiveTab] = useState<'settings' | 'profile' | 'staff_settings'>('settings');

  // Real Data
  const { clinics, loading, addClinic, updateClinic, deleteClinic } = useClinics();
  const { appointments } = useAppointments();
  const { patients } = usePatients(undefined); // Fetch all patients
  const { staff, updateStaff } = useStaff(); // Fetch all staff (filtered by RLS)

  // New Clinic Form State
  const [newClinic, setNewClinic] = useState({
    name: '', address: '', phone: '', city: 'Baghdad'
  });

  // File Input Refs
  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const coverInputRef = React.useRef<HTMLInputElement>(null);

  // File Upload Logic
  const { uploadFile, loading: uploading } = useStorage();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Optional: Local preview while uploading (to feel snappy)
    const previewUrl = URL.createObjectURL(file);
    setTempSettings(prev => ({
      ...prev,
      [type === 'logo' ? 'logo' : 'coverImage']: previewUrl
    }));

    try {
      toast.info('جاري رفع الصورة...');
      // Upload to 'clinics' bucket, under a folder for the specific clinic if possible, or just root/random
      const result = await uploadFile(file, 'clinics', `clinic_${selectedClinic}/${type}`);

      if (result) {
        setTempSettings(prev => ({
          ...prev,
          [type === 'logo' ? 'logo' : 'coverImage']: result.url
        }));
        toast.success('تم رفع الصورة بنجاح');
      }
    } catch (err) {
      console.error('Upload failed', err);
      toast.error('فشل رفع الصورة');
    }
  };

  // Temp Settings State for Editing
  const [tempSettings, setTempSettings] = useState<{
    specialties: string[];
    services: string[];
    workingHours: string;
    logo: string;
    coverImage: string;
    phone: string;
    description: string;
    latitude?: number;
    longitude?: number;
    isFeatured: boolean;
    isDigitalBookingEnabled: boolean;
    settings: any;
  }>({ specialties: [], services: [], workingHours: '', logo: '', coverImage: '', phone: '', description: '', isFeatured: false, isDigitalBookingEnabled: false, settings: {} });

  // Initialize/Update temp settings when modal opens or clinic changes
  React.useEffect(() => {
    if (selectedClinic) {
      const clinic = clinics.find(c => c.id === selectedClinic);
      if (clinic) {
        setTempSettings({
          specialties: clinic.specialties || [],
          services: clinic.services || [],
          workingHours: clinic.workingHours || '',
          logo: clinic.image || '',
          coverImage: clinic.coverImage || '',
          phone: clinic.phone || '',
          description: clinic.description || '',

          latitude: clinic.location?.lat,
          longitude: clinic.location?.lng,
          isFeatured: clinic.isFeatured || false,
          isDigitalBookingEnabled: clinic.isDigitalBookingEnabled || false,
          settings: clinic.settings || {}
        });
      }
    }
  }, [selectedClinic, showSettings]);



  const handleSaveSettings = async () => {
    if (!selectedClinic) return;

    try {
      // Capture working hours from input if needed, or stick to controlled state if we fully refactored
      // Since I used an ID selector in the view, let's grab it or rely on synced state if I added onChange
      // I added onChange to input but it didn't update state directly in the previous snippet.
      // Let's rely on reading the input value directly or better, update the snippet to be controlled.
      // Actually, in the previous snippet I didn't fully hook up `workingHours` to `tempSettings`.
      // I will fix this in THIS replace block by ensuring `tempSettings` is used.

      const workingHoursInput = document.getElementById('working-hours-input') as HTMLInputElement;
      const updatedWorkingHours = workingHoursInput ? workingHoursInput.value : tempSettings.workingHours;

      await updateClinic(selectedClinic, {
        specialties: tempSettings.specialties,
        services: tempSettings.services,
        workingHours: updatedWorkingHours,
        image: tempSettings.logo,
        coverImage: tempSettings.coverImage,
        phone: tempSettings.phone,
        description: tempSettings.description,
        location: (tempSettings.latitude && tempSettings.longitude) ? { lat: tempSettings.latitude, lng: tempSettings.longitude } : undefined,
        isFeatured: tempSettings.isFeatured,
        isDigitalBookingEnabled: tempSettings.isDigitalBookingEnabled,
        settings: tempSettings.settings
      });
      // Show success state
      setIsSaved(true);
      toast.success('تم حفظ إعدادات العيادة بنجاح');

      // Reset after 3 seconds
      setTimeout(() => {
        setIsSaved(false);
      }, 3000);

    } catch (err) {
      toast.error('فشل حفظ الإعدادات');
      console.error(err);
    }
  };

  const renderFeatureToggle = (
    id: string,
    label: string,
    description: string,
    featureKey: 'map' | 'booking' | 'featured' | 'articles',
    currentValue: boolean,
    onChange: (val: boolean) => void
  ) => {
    const isLocked = !hasFeature(featureKey);

    return (
      <div className={`flex items-center justify-between p-4 rounded-lg border ${isLocked ? 'bg-gray-50 border-gray-200 opacity-75' : 'bg-white border-gray-200 hover:border-blue-200'} transition-all`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${isLocked ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-600'}`}>
            {isLocked ? <Lock className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className={`font-medium ${isLocked ? 'text-gray-500' : 'text-gray-900'}`}>{label}</h4>
              {isLocked && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded-full">متاح في الباقة المتقدمة</span>}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          </div>
        </div>

        <div onClick={(e) => {
          if (isLocked) {
            e.preventDefault();
            setUpgradeFeature({
              title: `فتح ميزة ${label}`,
              description: `هذه الميزة متاحة فقط في الباقات المتقدمة. قم بترقية باقتك للوصول إلى ${label} والعديد من المميزات الأخرى.`
            });
            setShowUpgradeModal(true);
            return;
          }
        }}>
          <label className={`relative inline-flex items-center ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
            <input
              type="checkbox"
              className="sr-only peer"
              checked={currentValue}
              onChange={(e) => !isLocked && onChange(e.target.checked)}
              disabled={isLocked}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
    );
  };

  const handleAddClinic = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newClinic.name) {
      toast.error('يرجى إدخال اسم العيادة');
      return;
    }

    try {
      await addClinic({
        name: newClinic.name,
        address: newClinic.address,
        city: newClinic.city,
        phone: newClinic.phone
      });
      toast.success('تم إضافة العيادة بنجاح');
      setShowAddClinic(false);
      // Reset form
      setNewClinic({ name: '', address: '', phone: '', city: 'Baghdad' });
    } catch (err: any) {
      console.error('Failed to add clinic:', err);
      toast.error('فشل إضافة العيادة: ' + (err.message || 'خطأ غير معروف'));
    }
  };

  const handleDeleteClinic = async () => {
    if (!clinicToDelete) return;
    try {
      await deleteClinic(clinicToDelete);
      toast.success('تم حذف العيادة بنجاح');
      setShowDeleteModal(false);
      setClinicToDelete(null);
    } catch (err) {
      toast.error('فشل حذف العيادة');
    }
  };

  const currentClinic = clinics.find(c => c.id === selectedClinic);

  if (loading && clinics.length === 0) return <div className="p-8 text-center">جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">عياداتي</h1>
          <p className="text-gray-600 mt-1">إدارة جميع عياداتك في مكان واحد ({clinics.length} عيادة نشطة)</p>
        </div>
        {!isStaff && (
          <Button
            variant="primary"
            className="flex items-center gap-2"
            onClick={() => {
              const limitCheck = checkLimit('clinics');
              if (!limitCheck.allowed) {
                setUpgradeFeature({
                  title: 'وصلت الحد الأقصى للعيادات',
                  description: 'ترقية باقتك لإضافة عدد غير محدود من العيادات وإدارة فروع متعددة.'
                });
                setShowUpgradeModal(true);
                return;
              }
              setShowAddClinic(true);
            }}
          >
            <Plus className="w-5 h-5" />
            إضافة عيادة جديدة
          </Button>
        )}
      </div>

      {/* Clinics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clinics
          .filter(c => {
            // Staff: Show only their assumed primary clinic
            if (isStaff) return clinics.length > 0 && c.id === clinics[0].id;
            // Owner: Show all if 'all' selected, otherwise specific
            if (selectedClinicId === 'all') return true;
            return c.id === selectedClinicId;
          })
          .map((clinic) => (
            <Card key={clinic.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={(e) => {
              if ((e.target as HTMLElement).closest('button')) return;
              navigate(`/doctor/clinic/${clinic.id}`);
            }}>
              {/* Clinic Image */}
              <div className="h-32 relative overflow-hidden group-hover:scale-105 transition-transform duration-500">
                <img
                  src={clinic.coverImage || clinic.image}
                  alt={clinic.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                <div className="absolute bottom-0 right-0 p-4">
                  {/* Logo Overlay */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-2 border-white/50 overflow-hidden bg-white/10 backdrop-blur-sm">
                      <img src={clinic.image} alt="" className="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Clinic Info */}
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{clinic.name}</h3>
                  <div className="flex items-start gap-2 mt-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{clinic.address}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{clinic.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{clinic.workingHours}</span>
                  </div>
                </div>

                {/* Rating and Specialties */}
                <div className="flex items-center justify-between pt-4 border-t">
                  {/* Rating removed */}
                  <div className="text-xs text-gray-600">
                    {clinic.specialties[0]}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {patients.filter(p => String(p.clinicId) === String(clinic.id)).length}
                    </p>
                    <p className="text-xs text-gray-600">المرضى</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-600">
                      {staff.filter(s => String(s.clinicId) === String(clinic.id)).length || 0}
                    </p>
                    <p className="text-xs text-gray-600">الموظفون</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">
                      {appointments.filter(a => String(a.clinicId) === String(clinic.id) && a.date === new Date().toISOString().split('T')[0]).length}
                    </p>
                    <p className="text-xs text-gray-600">مواعيد</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 pt-4 border-t">
                  <button
                    onClick={() => navigate(`/doctor/clinic/${clinic.id}`)}
                    className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all flex flex-col items-center gap-1"
                  >
                    <LayoutDashboard className="w-5 h-5" />
                    <span className="text-xs font-medium">لوحة التحكم</span>
                  </button>

                  {/* Settings Button: Owner OR Staff with 'settings' permission */}
                  {(!isStaff || staff.find(s => s.email === user?.email)?.permissions?.settings) && (
                    <button
                      onClick={() => {
                        setSelectedClinic(clinic.id);
                        setActiveTab('settings');
                        setShowSettings(true);
                      }}
                      className="p-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all flex flex-col items-center gap-1"
                    >
                      <Settings className="w-5 h-5" />
                      <span className="text-xs font-medium">الإعدادات</span>
                    </button>
                  )}
                </div>

                {/* Owner Only Actions */}
                {!isStaff && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setClinicToDelete(clinic.id);
                      setShowDeleteModal(true);
                    }}
                    className="w-full mt-2 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-xs font-medium">حذف العيادة</span>
                  </button>
                )}

                {/* Activity Log: Owner OR Staff with 'activityLog' permission */}
                {(!isStaff || staff.find(s => s.email === user?.email)?.permissions?.activityLog) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/doctor/clinic/${clinic.id}/activity`);
                    }}
                    className="w-full mt-2 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Activity className="w-4 h-4" />
                    <span className="text-xs font-medium">سجل النشاطات</span>
                  </button>
                )}
              </div>
            </Card>
          ))}
      </div>

      {/* Add Clinic Modal - Owner Only */}
      {!isStaff && (
        <Modal
          isOpen={showAddClinic}
          onClose={() => setShowAddClinic(false)}
          title="إضافة عيادة جديدة"
          size="lg"
        >
          <form onSubmit={handleAddClinic} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم العيادة</label>
              <input
                type="text"
                value={newClinic.name}
                onChange={e => setNewClinic({ ...newClinic, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
                placeholder="مثال: عيادة النور لطب الأسنان"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
              <input
                type="text"
                value={newClinic.address}
                onChange={e => setNewClinic({ ...newClinic, address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
                placeholder="الشارع / المنطقة"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المدينة</label>
              <input
                type="text"
                value={newClinic.city}
                onChange={e => setNewClinic({ ...newClinic, city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الهاتف</label>
              <input
                type="text"
                value={newClinic.phone}
                onChange={e => setNewClinic({ ...newClinic, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setShowAddClinic(false)}>إلغاء</Button>
              <Button type="submit" variant="primary">إضافة العيادة</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Settings Modal */}
      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="إعدادات العيادة"
        size="lg"
      >
        <div className="flex flex-col h-[600px]">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              className={`pb-3 px-6 font-medium text-sm transition-colors relative ${activeTab === 'settings' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('settings')}
            >
              الإعدادات العامة
              {activeTab === 'settings' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
            </button>
            <button
              className={`pb-3 px-6 font-medium text-sm transition-colors relative ${activeTab === 'profile' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('profile')}
            >
              ملف العيادة
              {activeTab === 'profile' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
            </button>
            <button
              className={`pb-3 px-6 font-medium text-sm transition-colors relative ${activeTab === 'staff_settings' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('staff_settings')}
            >
              إعدادات الطاقم
              {activeTab === 'staff_settings' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-1">
            {activeTab === 'settings' && (
              <div className="space-y-6">

                {/* Feature Toggles */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900">مميزات العيادة</h3>

                  {renderFeatureToggle(
                    'digital-booking',
                    'الحجز الإلكتروني',
                    'تمكين المرضى من حجز المواعيد عبر الإنترنت من خلال رابط العيادة الخاص.',
                    'booking',
                    tempSettings.isDigitalBookingEnabled,
                    (val) => setTempSettings(prev => ({ ...prev, isDigitalBookingEnabled: val }))
                  )}

                  {renderFeatureToggle(
                    'map-visibility',
                    'الظهور على الخريطة',
                    'إظهار موقع عيادتك على خريطة البحث للمرضى القريبين.',
                    'map',
                    tempSettings.settings?.showOnMap || false,
                    (val) => setTempSettings(prev => ({ ...prev, settings: { ...prev.settings, showOnMap: val } }))
                  )}

                  {renderFeatureToggle(
                    'featured-clinic',
                    'عيادة مميزة',
                    'إظهار عيادتك في قائمة العيادات المميزة وفي أعلى نتائج البحث.',
                    'featured',
                    tempSettings.isFeatured,
                    (val) => setTempSettings(prev => ({ ...prev, isFeatured: val }))
                  )}

                  {renderFeatureToggle(
                    'article-suggestions',
                    'الظهور في مقترحات المقالات',
                    'إظهار عيادتك كعيادة مقترحة أسفل المقالات الطبية لزيادة الوصول.',
                    'articles',
                    tempSettings.settings?.articleSuggestions || false,
                    (val) => setTempSettings(prev => ({ ...prev, settings: { ...prev.settings, articleSuggestions: val } }))
                  )}
                </div>

                {/* Booking Link (Only if enabled) */}
                {tempSettings.isDigitalBookingEnabled && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 animate-in fade-in">
                    <label className="block text-xs font-medium text-blue-800 mb-1">رابط الحجز الخارجي</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        readOnly
                        value={`${window.location.origin}/booking?clinic=${currentClinic?.id || '...'}`}
                        className="w-full px-4 py-2 bg-white border border-blue-200 rounded-lg text-gray-600 font-mono text-sm dir-ltr"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const url = `${window.location.origin}/booking?clinic=${currentClinic?.id}`;
                          navigator.clipboard.writeText(url);
                          toast.success('تم نسخ الرابط بنجاح');
                        }}
                      >
                        نسخ
                      </Button>
                    </div>
                  </div>
                )}

                {/* Booking Configuration */}
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-bold text-gray-900 pb-2">خيارات الحجز المتقدمة</h4>

                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-sm text-gray-900">السماح باختيار الطبيب</p>
                      <p className="text-xs text-gray-500">تمكين المريض من اختيار طبيب معين عند الحجز</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={tempSettings.settings?.allowDoctorSelection !== false} // Default true
                        onChange={(e) => setTempSettings(prev => ({ ...prev, settings: { ...prev.settings, allowDoctorSelection: e.target.checked } }))}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-sm text-gray-900">إظهار أوقات الانتظار المتوقعة</p>
                      <p className="text-xs text-gray-500">عرض وقت تقريبي للانتظار بناءً على المواعيد</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={tempSettings.settings?.showWaitTimes || false}
                        onChange={(e) => setTempSettings(prev => ({ ...prev, settings: { ...prev.settings, showWaitTimes: e.target.checked } }))}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>


              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-6">
                {/* Clinic Profile Header (Cover & Logo) */}
                <div className="relative mb-8 group">
                  {/* Hidden File Inputs */}
                  <input
                    type="file"
                    ref={coverInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'cover')}
                  />
                  <input
                    type="file"
                    ref={logoInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'logo')}
                  />

                  {/* Cover Image */}
                  <div
                    className="h-48 w-full bg-gray-100 rounded-xl overflow-hidden relative cursor-pointer group/cover border-2 border-dashed border-gray-200 hover:border-blue-400 transition-all"
                    onClick={() => coverInputRef.current?.click()}
                  >
                    {tempSettings.coverImage ? (
                      <img src={tempSettings.coverImage} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 flex-col gap-2">
                        <div className="w-12 h-12 bg-gray-200 md:bg-white/50 rounded-full flex items-center justify-center">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <span className="text-xs">اضغط لرفع صورة غلاف</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover/cover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover/cover:opacity-100">
                      <span className="bg-white/90 text-gray-900 text-xs px-3 py-1.5 rounded-full font-medium shadow-sm">تغيير الغلاف</span>
                    </div>
                  </div>

                  {/* Logo - Overlapping */}
                  <div className="absolute -bottom-6 right-6">
                    <div
                      className="w-24 h-24 bg-white rounded-xl shadow-lg border-4 border-white overflow-hidden cursor-pointer relative group/logo"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      {tempSettings.logo ? (
                        <img src={tempSettings.logo} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400">
                          <Building2 className="w-8 h-8" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover/logo:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover/logo:opacity-100">
                        <Settings className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 pt-2">
                  {/* Basic Details */}
                  <div className="flex flex-col gap-4">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">اسم العيادة</label>
                        <input type="text" defaultValue={currentClinic?.name} className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50" disabled />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">وصف العيادة (يظهر للمرضى)</label>
                        <textarea
                          value={tempSettings.description}
                          onChange={(e) => setTempSettings({ ...tempSettings, description: e.target.value })}
                          placeholder="اكتب وصفاً مختصراً للعيادة، الخدمات المقدمة، والخبرات..."
                          className="w-full px-3 py-2 border rounded-lg text-sm min-h-[80px]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">رقم الهاتف</label>
                        <input
                          type="text"
                          value={tempSettings.phone}
                          onChange={(e) => setTempSettings({ ...tempSettings, phone: e.target.value })}
                          placeholder="07XX XXXXXXX"
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">ساعات العمل</label>
                        <input
                          type="text"
                          defaultValue={currentClinic?.workingHours}
                          onChange={() => { }}
                          id="working-hours-input"
                          placeholder="مثال: 09:00 - 21:00"
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                    </div>

                    {/* Map Section - Full Width at Bottom */}
                    {/* Map Section - Only if Enabled */}
                    {tempSettings.settings?.showOnMap && (
                      <div className="animate-in fade-in slide-in-from-top-4">
                        <label className="block text-xs font-medium text-gray-700 mb-2">الموقع على الخريطة (اضغط على الخريطة لتحديد موقع العيادة بدقة)</label>
                        <div className="w-full border rounded-xl overflow-hidden shadow-sm">
                          <ClinicLocationPicker
                            initialLat={tempSettings.latitude}
                            initialLng={tempSettings.longitude}
                            onLocationSelect={(lat, lng) => {
                              setTempSettings(prev => ({ ...prev, latitude: lat, longitude: lng }));
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {!tempSettings.settings?.showOnMap && (
                      <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center">
                        <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">تم تعطيل الخريطة لهذه العيادة</p>
                        <button
                          onClick={() => {
                            setActiveTab('settings');
                            toast.info('يرجى تفعيل خيار "الظهور على الخريطة" من الإعدادات العامة');
                          }}
                          className="text-xs text-blue-600 font-medium hover:underline mt-1"
                        >
                          تفعيل الخريطة
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Services & Specialties Configuration */}
                  <div className="space-y-6">
                    {/* Specialties */}
                    <div>
                      <h4 className="font-bold text-gray-900 border-b pb-2 mb-3">الاختصاصات</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {['جراحة وجه وفكين', 'تقويم الأسنان', 'طب أسنان أطفال', 'علاج الجذور', 'لثة وأنسجة داعمة', 'زراعة الأسنان', 'طب أسنان عام', 'تجميل الأسنان'].map((spec) => (
                          <label key={spec} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-100 cursor-pointer hover:bg-gray-100">
                            <span className="text-sm text-gray-900">{spec}</span>
                            <div className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={tempSettings.specialties.includes(spec)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setTempSettings(prev => ({ ...prev, specialties: [...prev.specialties, spec] }));
                                  } else {
                                    setTempSettings(prev => ({ ...prev, specialties: prev.specialties.filter(s => s !== spec) }));
                                  }
                                }}
                              />
                              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Services */}
                    <div>
                      <h4 className="font-bold text-gray-900 border-b pb-2 mb-3">الخدمات</h4>
                      <div className="bg-yellow-50 p-3 rounded-lg text-xs text-yellow-800 flex items-start gap-2 mb-3">
                        <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        يمكنك إضافة خدمات إضافية تظهر للمرضى عند الحجز.
                      </div>

                      <div className="space-y-2">
                        {tempSettings.services.map((service, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                            <span className="text-sm text-gray-900">{service}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:bg-red-50 h-auto py-1 px-2"
                              onClick={() => {
                                setTempSettings(prev => ({ ...prev, services: prev.services.filter(s => s !== service) }));
                              }}
                            >
                              حذف
                            </Button>
                          </div>
                        ))}

                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="اسم الخدمة الجديدة"
                            className="flex-1 px-3 py-2 border rounded-lg text-sm"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const val = (e.target as HTMLInputElement).value.trim();
                                if (val) {
                                  setTempSettings(prev => ({ ...prev, services: [...prev.services, val] }));
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }
                            }}
                            id="new-service-input"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const input = document.getElementById('new-service-input') as HTMLInputElement;
                              if (input && input.value.trim()) {
                                setTempSettings(prev => ({ ...prev, services: [...prev.services, input.value.trim()] }));
                                input.value = '';
                              }
                            }}
                          >
                            إضافة
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'staff_settings' && (
              <div className="space-y-6">
                {/* Settings Header */}
                <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3 border border-blue-100">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">إدارة حسابات وصلاحيات الطاقم</h4>
                    <p className="text-sm text-blue-700">إنشاء حسابات دخول للموظفين والتحكم في صلاحيات الوصول.</p>
                  </div>
                </div>

                {/* Staff List */}
                <div className="space-y-6">
                  {/* Global Staff Permissions */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
                    <h5 className="font-semibold text-gray-900 mb-2">الصلاحيات العامة للطاقم</h5>

                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tempSettings.settings?.staffSeeFullSchedule ?? true}
                        onChange={(e) => setTempSettings(prev => ({ ...prev, settings: { ...prev.settings, staffSeeFullSchedule: e.target.checked } }))}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                      <div>
                        <span className="block font-medium text-gray-900 text-sm">السماح للموظفين برؤية سجل المواعيد الكامل</span>
                        <span className="text-xs text-gray-500">يستطيع الموظف رؤية جميع المواعيد وليس فقط مواعيده</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tempSettings.settings?.staffEditPatients ?? false}
                        onChange={(e) => setTempSettings(prev => ({ ...prev, settings: { ...prev.settings, staffEditPatients: e.target.checked } }))}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                      <div>
                        <span className="block font-medium text-gray-900 text-sm">السماح للموظفين بتعديل بيانات المرضى</span>
                        <span className="text-xs text-gray-500">منح صلاحية التعديل (وليس فقط القراءة) لملفات المرضى</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tempSettings.settings?.staffHideFinancials ?? false}
                        onChange={(e) => setTempSettings(prev => ({ ...prev, settings: { ...prev.settings, staffHideFinancials: e.target.checked } }))}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                      <div>
                        <span className="block font-medium text-gray-900 text-sm">إخفاء الأرقام المالية</span>
                        <span className="text-xs text-gray-500">عدم إظهار الإيرادات والأسعار للموظفين غير المصرح لهم</span>
                      </div>
                    </label>
                  </div>

                  <div className="border-t border-gray-200"></div>
                  {staff.filter(s => String(s.clinicId) === String(currentClinic?.id)).length > 0 ? (
                    staff.filter(s => String(s.clinicId) === String(currentClinic?.id)).map((employee) => (
                      <div key={employee.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                              <Users className="w-5 h-5 text-gray-500" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{employee.name}</p>
                              <p className="text-xs text-gray-500">{employee.position}</p>
                            </div>
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${employee.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {employee.status === 'active' ? 'نشط' : 'غير نشط'}
                          </div>
                        </div>

                        {/* Credentials Section */}
                        <div className="bg-white p-3 rounded border border-gray-200 mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-xs font-semibold text-gray-700">بيانات الدخول</h5>
                            {generatedCredentials[employee.id]?.saved && (
                              <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">محفوظ</span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-1">اسم المستخدم</label>
                              <input
                                type="text"
                                className="w-full px-2 py-1.5 text-sm border rounded bg-gray-50 focus:bg-white focus:border-blue-500 transition-colors"
                                placeholder="username"
                                value={generatedCredentials[employee.id]?.username || employee.username || ''}
                                onChange={(e) => setGeneratedCredentials(prev => ({
                                  ...prev,
                                  [employee.id]: { ...prev[employee.id], username: e.target.value, saved: false }
                                }))}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-1">كلمة المرور</label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  className="w-full px-2 py-1.5 text-sm border rounded bg-gray-50 focus:bg-white focus:border-blue-500 transition-colors"
                                  placeholder="password"
                                  value={generatedCredentials[employee.id]?.password || employee.password || ''}
                                  onChange={(e) => setGeneratedCredentials(prev => ({
                                    ...prev,
                                    [employee.id]: { ...prev[employee.id], password: e.target.value, saved: false }
                                  }))}
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="px-2"
                                  title="توليد تلقائي"
                                  onClick={() => {
                                    const randomPass = Math.random().toString(36).slice(-8);
                                    setGeneratedCredentials(prev => ({
                                      ...prev,
                                      [employee.id]: { ...prev[employee.id], password: randomPass, saved: false }
                                    }));
                                  }}
                                >
                                  <Settings className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-end mt-3 gap-2">
                            <Button
                              size="sm"
                              disabled={generatedCredentials[employee.id]?.saved || (!generatedCredentials[employee.id]?.username && !employee.username)}
                              className={`h-8 text-xs ${generatedCredentials[employee.id]?.saved ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                              onClick={async () => {
                                const creds = generatedCredentials[employee.id];
                                if (!creds?.username) return toast.error('يرجى إدخال اسم مستخدم');

                                try {
                                  await updateStaff(employee.id, { username: creds.username, password: creds.password });
                                  setGeneratedCredentials(prev => ({
                                    ...prev,
                                    [employee.id]: { ...prev[employee.id], saved: true }
                                  }));
                                  toast.success('تم حفظ بيانات الدخول بنجاح');
                                } catch (err) {
                                  toast.error('حدث خطأ أثناء الحفظ');
                                }
                              }}
                            >
                              {generatedCredentials[employee.id]?.saved ? 'تم الحفظ' : 'حفظ البيانات'}
                            </Button>
                          </div>
                        </div>

                        {/* Permissions Toggles */}
                        <div className="pt-3 border-t border-gray-100">
                          <p className="text-xs font-semibold text-gray-700 mb-2">صلاحيات الوصول:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { key: 'appointments', label: 'المواعيد' },
                              { key: 'patients', label: 'المرضى' },
                              { key: 'financials', label: 'المالية' },
                              { key: 'reports', label: 'التقارير' },
                              { key: 'settings', label: 'الإعدادات' },
                              { key: 'activityLog', label: 'سجل النشاطات' },
                              { key: 'assets', label: 'الأصول' },
                              { key: 'staff', label: 'إدارة الطاقم' },
                              { key: 'lab', label: 'المختبر' },
                            ].map((perm) => (
                              <label key={perm.key} className="flex items-center gap-2 cursor-pointer group">
                                <div className="relative inline-flex items-center">
                                  <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={employee.permissions?.[perm.key as keyof typeof employee.permissions] || false}
                                    onChange={(e) => {
                                      const newPermissions = {
                                        ...employee.permissions,
                                        [perm.key]: e.target.checked
                                      };
                                      updateStaff(employee.id, { permissions: newPermissions });
                                    }}
                                  />
                                  <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                                </div>
                                <span className="text-xs text-gray-600 group-hover:text-gray-900 transition-colors">{perm.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      لا يوجد موظفين في هذه العيادة
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="pt-6 mt-2 border-t border-gray-100">
            <Button
              variant={isSaved ? "secondary" : "primary"}
              className={`w-full transition-all duration-300 ${isSaved ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' : ''}`}
              onClick={handleSaveSettings}
              disabled={isSaved}
            >
              {isSaved ? (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>تم الحفظ بنجاح</span>
                </div>
              ) : 'حفظ التغييرات'}
            </Button>
          </div>
        </div>
      </Modal>


      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="تأكيد حذف العيادة"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-red-50 p-4 rounded-lg flex gap-3 text-red-800">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">
              هل أنت متأكد من حذف هذه العيادة؟ سيتم حذف جميع البيانات المرتبطة بها (مرضى، مواعيد، تقارير) بشكل نهائي ولا يمكن التراجع عن هذا الإجراء.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>إلغاء</Button>
            <Button variant="danger" onClick={handleDeleteClinic} className="bg-red-600 hover:bg-red-700 text-white">
              نعم، حذف العيادة
            </Button>
          </div>
        </div>
      </Modal>
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title={upgradeFeature?.title || "ترقية الباقة"}
        description={upgradeFeature?.description || "قم بترقية باقتك للوصول إلى هذه الميزة."}
      />
    </div >
  );
};
