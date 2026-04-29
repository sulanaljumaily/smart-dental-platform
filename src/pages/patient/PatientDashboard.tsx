import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  User,
  Calendar,
  LogOut,
  ChevronDown,
  Building2,
  HeartPulse,
  Activity,
  DollarSign,
  TrendingUp,
  Clock,
  ArrowLeft,
  Settings,
  Bell,
  Stethoscope,
  Briefcase,
  CheckCircle2,
  Plus,
  Key,
  Shield,
  FileSearch,
  Search,
  ArrowRight,
  Send,
  Paperclip,
  Menu,
  MoreHorizontal,
  AlertCircle,
  MapPin
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useMessages } from '../../hooks/useMessages';
import { BottomNavigation } from '../../components/layout/BottomNavigation';
import { BentoStatCard } from '../../components/dashboard/BentoStatCard';
import { HorizontalCalendar } from '../../components/calendar/HorizontalCalendar';
import { Card } from '../../components/common/Card';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';
import { isSameDay, parseISO, isBefore, startOfDay, differenceInDays, isAfter, subDays } from 'date-fns';
import { PatientMessagesPage } from './PatientMessagesPage';

interface Appointment {
  id: string;
  clinic_id: string;
  doctor_name: string;
  appointment_date: string;
  appointment_time: string;
  type: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  clinic?: {
    name: string;
    image_url?: string;
  };
}

export const PatientDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<'overview' | 'messages' | 'profile'>('overview');
  const [activeSubTab, setActiveSubTab] = useState<'appointments' | 'medical'>('appointments');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDateFiltered, setIsDateFiltered] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch Appointments
      const { data: aptData, error: aptError } = await supabase
        .from('appointments')
        .select('*, clinic:clinics(name, image_url)')
        .or(`patient_user_id.eq.${user?.id},phone_number.eq.${user?.phone}`)
        .order('appointment_date', { ascending: true });

      if (aptError) throw aptError;
      setAppointments(aptData || []);

      // Fetch Medical Records (Across all clinics)
      const { data: recordsData } = await supabase
        .from('patients')
        .select('*, clinic:clinics(*)')
        .or(`patient_user_id.eq.${user?.id},user_id.eq.${user?.id}`);
      
      setMedicalRecords(recordsData || []);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const displayAppointments = useMemo(() => {
    let filtered = isDateFiltered 
      ? appointments.filter(apt => isSameDay(parseISO(apt.appointment_date), selectedDate))
      : appointments;

    const today = startOfDay(new Date());
    
    // Split into upcoming and past
    const upcoming = filtered.filter(apt => !isBefore(parseISO(apt.appointment_date), today))
      .sort((a, b) => parseISO(a.appointment_date).getTime() - parseISO(b.appointment_date).getTime());
    
    const past = filtered.filter(apt => isBefore(parseISO(apt.appointment_date), today))
      .sort((a, b) => parseISO(b.appointment_date).getTime() - parseISO(a.appointment_date).getTime());

    return [...upcoming, ...past];
  }, [appointments, selectedDate, isDateFiltered]);

  const nextAppointment = appointments.find(apt => 
    isAfter(parseISO(apt.appointment_date), subDays(new Date(), 1)) && apt.status !== 'cancelled'
  );

  const stats = [
    {
      title: 'الموعد القادم',
      value: nextAppointment ? formatDate(nextAppointment.appointment_date) : 'لا يوجد',
      icon: Calendar,
      color: 'teal' as const,
      delay: 100
    },
    {
      title: 'إجمالي المواعيد',
      value: appointments.length.toString(),
      icon: Activity,
      color: 'blue' as const,
      delay: 200
    }
  ];

  return (
    <div className={`flex flex-col min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/30 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      
      {/* Top Navigation Bar */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-50 pt-[calc(env(safe-area-inset-top)*0.75)]">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 sm:h-20">
            
            {/* Logo & Platform Name */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-200 transform hover:scale-105 transition-all">
                <HeartPulse className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-black text-xl text-gray-900 tracking-tight">مركز المراجعين</h1>
                <p className="text-[10px] text-teal-600 font-bold uppercase tracking-widest">Smart Dental Platform</p>
              </div>
            </div>

            {/* Navigation Buttons - Visible on all screens */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-teal-600 text-white shadow-lg shadow-teal-200' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                نظرة عامة
              </button>
              <button
                onClick={() => setActiveTab('messages')}
                className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-sm font-bold transition-all ${activeTab === 'messages' ? 'bg-teal-600 text-white shadow-lg shadow-teal-200' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                الرسائل
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-sm font-bold transition-all ${activeTab === 'profile' ? 'bg-teal-600 text-white shadow-lg shadow-teal-200' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                الملف الشخصي
              </button>
            </div>

            {/* User Profile Card */}
            <div className="relative shrink-0">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-1 p-1 rounded-xl bg-gray-50/50 hover:bg-white border border-gray-100 transition-all"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center text-white shadow-sm overflow-hidden">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </div>
                <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 text-gray-400 transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isUserMenuOpen && (
                <div className="absolute end-0 mt-3 w-64 bg-white rounded-3xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 origin-top-right">
                  <div className="p-4 bg-gradient-to-br from-teal-50 to-teal-100/50 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                        <User className="w-6 h-6 text-teal-600" />
                      </div>
                      <div>
                        <p className="font-black text-gray-900">{user?.name}</p>
                        <p className="text-xs text-gray-500">{user?.phone}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-2">
                    <button 
                      onClick={() => { navigate('/profile'); setIsUserMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-teal-50 hover:text-teal-700 rounded-2xl transition-all"
                    >
                      <Settings className="w-4 h-4" /> إعدادات الحساب
                    </button>
                    <button 
                      onClick={() => { logout(); setIsUserMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"
                    >
                      <LogOut className="w-4 h-4" /> تسجيل الخروج
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-6 sm:py-10 max-w-5xl space-y-8 pb-28">
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Welcome Header */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight mb-1 sm:mb-2">
                  أهلاً بك، <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-cyan-600">{user?.name?.split(' ')[0]}</span> 👋
                </h2>
                <p className="text-[11px] sm:text-base text-gray-500 font-bold leading-tight">نحن هنا لنهتم بصحة وجمال ابتسامتك اليوم.</p>
              </div>
              <button 
                onClick={() => navigate('/booking')}
                className="flex items-center justify-center gap-2 px-4 sm:px-8 py-3 sm:py-4 bg-teal-600 text-white font-black rounded-2xl sm:rounded-3xl shadow-xl shadow-teal-100 hover:bg-teal-700 hover:-translate-y-1 active:scale-95 transition-all group shrink-0"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-90 transition-transform duration-300" />
                <span className="text-[11px] sm:text-sm font-black whitespace-nowrap">حجز موعد</span>
              </button>
            </div>

            {/* Bento Stats Grid - Side by Side on Mobile */}
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              {stats.map((stat, index) => (
                <BentoStatCard
                  key={index}
                  title={stat.title}
                  value={stat.value}
                  icon={stat.icon}
                  color={stat.color}
                  delay={stat.delay}
                />
              ))}
            </div>

            {/* Horizontal Calendar - Now Global to Overview */}
            <HorizontalCalendar 
              selectedDate={selectedDate} 
              onDateSelect={(date) => {
                setSelectedDate(date);
                setIsDateFiltered(true);
              }}
              appointments={appointments}
            />

            {/* Sub-Tabs Selector */}
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2 p-1 bg-gray-100/50 rounded-[1.5rem] w-fit border border-gray-100">
                {[
                  { id: 'appointments', label: 'مواعيدي', icon: Calendar },
                  { id: 'medical', label: 'سجلاتي الطبية', icon: Stethoscope },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSubTab(tab.id as any)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black transition-all ${
                      activeSubTab === tab.id
                        ? 'bg-white text-teal-600 shadow-sm ring-1 ring-gray-100'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeSubTab === 'appointments' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="space-y-4">
                    {displayAppointments.length === 0 ? (
                      <div className="bg-white rounded-[2rem] border-2 border-dashed border-gray-100 p-12 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <Calendar className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-gray-400 font-bold">لا توجد مواعيد مجدولة في هذا اليوم</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {displayAppointments.map((apt) => (
                          <AppointmentCard key={apt.id} apt={apt} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeSubTab === 'medical' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className="bg-white rounded-[2rem] border border-gray-100 p-8">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center">
                        <Stethoscope className="w-6 h-6 text-teal-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-gray-900">سجلك الطبي الإلكتروني</h3>
                        <p className="text-sm text-gray-500">استعرض سجلاتك الطبية وتقاريرك في مختلف العيادات</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {medicalRecords.length === 0 ? (
                        <div className="col-span-full py-12 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                          <FileSearch className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-400 font-bold">لا توجد سجلات طبية مرتبطة بحسابك حالياً</p>
                        </div>
                      ) : (
                        medicalRecords.map((record) => (
                          <div 
                            key={record.id}
                            onClick={() => navigate(`/patient/record/${record.id}`)}
                            className="p-5 bg-white border border-gray-100 rounded-3xl hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center overflow-hidden border border-gray-100 group-hover:bg-teal-50 transition-colors">
                                {record.clinic?.image_url ? (
                                  <img src={record.clinic.image_url} alt={record.clinic.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Building2 className="w-6 h-6 text-gray-400 group-hover:text-teal-600" />
                                )}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-black text-gray-900 group-hover:text-teal-600 transition-colors">{record.clinic?.name || 'عيادة غير معروفة'}</h4>
                                <p className="text-xs text-gray-500 font-bold mt-1">تاريخ إنشاء ملف المريض: {formatDate(record.created_at)}</p>
                              </div>
                              <ArrowLeft className="w-5 h-5 text-gray-300 group-hover:text-teal-600 transition-all rtl:rotate-0 ltr:rotate-180" />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden min-h-[600px] animate-in fade-in slide-in-from-bottom-4">
            <PatientMessagesPage hideNavigation={true} />
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Side: Profile Info */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm">
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    {/* Profile Picture Side */}
                    <div className="text-center">
                      <div className="relative inline-block mb-4">
                        <div className="w-32 h-32 bg-gradient-to-br from-teal-400 to-teal-600 rounded-3xl flex items-center justify-center text-white text-4xl font-black shadow-xl overflow-hidden ring-4 ring-teal-50">
                          {user?.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            user?.name?.charAt(0) || 'P'
                          )}
                        </div>
                        <button className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-xl shadow-lg border border-gray-100 flex items-center justify-center text-teal-600 hover:bg-teal-50 transition-all">
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                      <h3 className="text-2xl font-black text-gray-900">{user?.name}</h3>
                      <div className="flex items-center justify-center gap-2 mt-1">
                        <div className="flex items-center gap-1.5 text-gray-500 font-bold">
                          <Shield className="w-4 h-4 text-teal-600" /> 
                          <span>مراجع</span>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full border border-emerald-100 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          نشط ومؤكد
                        </span>
                      </div>
                    </div>

                    {/* Info & Password Side */}
                    <div className="flex-1 w-full p-6 bg-gray-50 rounded-[2rem] border border-gray-100 text-right space-y-4">
                      <div>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">رقم الهاتف المرتبط</p>
                        <p className="text-sm font-black text-gray-800">{user?.phone || '07818641727'}</p>
                      </div>

                      <div className="pt-4 border-t border-gray-200">
                        <label className="block text-[10px] text-gray-400 font-black uppercase tracking-widest mb-2">تعيين كلمة مرور جديدة</label>
                        <input 
                          type="password" 
                          placeholder="••••••••" 
                          className="w-full bg-white border border-gray-100 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-teal-500 transition-all shadow-sm" 
                        />
                      </div>

                      <button className="w-full py-3 bg-teal-600 text-white rounded-xl font-black text-sm shadow-lg shadow-teal-100 hover:bg-teal-700 transition-all active:scale-[0.98]">
                        تحديث كلمة المرور
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Consolidated Medical Records */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm h-full flex flex-col">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                        <Stethoscope className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-gray-900">السجل الصحي الموحد</h3>
                        <p className="text-sm text-gray-500">ملخص ملفاتك المرضية في جميع العيادات</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    {medicalRecords.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center py-12">
                        <Activity className="w-16 h-16 text-gray-100 mb-4" />
                        <p className="text-gray-400 font-bold">لا توجد سجلات حالية لعرضها</p>
                      </div>
                    ) : (
                      medicalRecords.map((record) => (
                        <div key={record.id} className="p-6 bg-gray-50/50 rounded-3xl border border-gray-100 hover:bg-white hover:border-teal-200 transition-all group">
                          <div className="flex items-start justify-between">
                            <div className="flex gap-4">
                              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100 overflow-hidden">
                                {record.clinic?.image_url ? (
                                  <img src={record.clinic.image_url} alt={record.clinic.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Building2 className="w-6 h-6 text-gray-400 group-hover:text-teal-600" />
                                )}
                              </div>
                              <div>
                                <h4 className="font-black text-gray-900">{record.clinic?.name}</h4>
                                <div className="flex items-center gap-3 mt-1.5">
                                  <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-gray-200 text-gray-500 font-bold">حالة المريض: {record.status || 'نشط'}</span>
                                   <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-gray-200 text-teal-600 font-bold">رقم الملف: #{String(record.id || '').substring(0, 5)}</span>
                                </div>
                              </div>
                            </div>
                            <button 
                              onClick={() => navigate(`/patient/record/${record.id}`)}
                              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-black text-teal-600 hover:bg-teal-600 hover:text-white transition-all shadow-sm"
                            >
                              عرض التفاصيل
                            </button>
                          </div>
                          
                          {record.medical_history && (
                            <div className="mt-4 p-3 bg-amber-50/50 border border-amber-100 rounded-2xl flex gap-2 items-start">
                              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <div className="text-[11px] text-amber-700 font-bold">
                                <span className="block mb-0.5 opacity-60">تنبيهات طبية مسجلة:</span>
                                {record.medical_history}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNavigation />

      {/* Background Decorative Blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] right-[5%] w-[30rem] h-[30rem] bg-teal-100/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[10%] left-[5%] w-[25rem] h-[25rem] bg-cyan-100/20 rounded-full blur-[100px] animate-pulse duration-700"></div>
      </div>
    </div>
  );
};

const AppointmentCard = ({ apt }: { apt: Appointment }) => {
  const navigate = useNavigate();
  
  const statusConfig = {
    pending: { color: 'bg-amber-50 text-amber-600 border-amber-100', label: 'قيد الانتظار' },
    scheduled: { color: 'bg-blue-50 text-blue-600 border-blue-100', label: 'مجدول' },
    confirmed: { color: 'bg-teal-50 text-teal-600 border-teal-100', label: 'مؤكد' },
    completed: { color: 'bg-emerald-50 text-emerald-600 border-emerald-100', label: 'مكتمل' },
    cancelled: { color: 'bg-rose-50 text-rose-600 border-rose-100', label: 'ملغي' },
    noshow: { color: 'bg-orange-50 text-orange-600 border-orange-100', label: 'لم يحضر' },
    rescheduled: { color: 'bg-indigo-50 text-indigo-600 border-indigo-100', label: 'مؤجل' },
  };

  const config = statusConfig[apt.status] || statusConfig.pending;

  // Format 24h to 12h
  const formatTime12h = (time: string) => {
    if (!time) return { time: '--:--', period: '' };
    const [h, m] = time.split(':');
    let hours = parseInt(h);
    const period = hours >= 12 ? 'مساءً' : 'صباحاً';
    hours = hours % 12 || 12;
    return { 
      time: `${hours}:${m.substring(0, 2)}`, 
      period 
    };
  };

  const timeInfo = formatTime12h(apt.appointment_time || (apt as any).time);

  const getCardStyles = () => {
    const aptDate = parseISO(apt.appointment_date);
    const today = startOfDay(new Date());
    
    if (isBefore(aptDate, today)) {
      return 'bg-rose-50/50 border-rose-100 hover:border-rose-200';
    }
    
    const diff = differenceInDays(aptDate, today);
    if (diff <= 1) {
      return 'bg-amber-50/50 border-amber-100 hover:border-amber-200';
    }
    
    return 'bg-teal-50/30 border-teal-100 hover:border-teal-200';
  };

  return (
    <div 
      onClick={() => navigate(`/patient/record/${apt.patientId || (apt as any).patient_id}`)}
      className={`p-4 sm:p-5 rounded-[2.5rem] border shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all group cursor-pointer flex items-center gap-4 sm:gap-6 relative overflow-hidden ${getCardStyles()}`}
    >
      {/* Decorative Gradient Background */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 blur-[60px] group-hover:bg-teal-500/10 transition-colors pointer-events-none" />
      
      {/* 1. Clinic Image (Right/Start) */}
      <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0 group-hover:scale-105 transition-transform duration-500 shadow-inner">
        {apt.clinic?.image_url ? (
          <img src={apt.clinic.image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <Building2 className="w-8 h-8 text-gray-300" />
          </div>
        )}
      </div>

      {/* 2. Appointment Info (Center) */}
      <div className="flex-1 min-w-0 py-1">
        <h4 className="text-lg sm:text-xl font-black text-gray-900 truncate mb-1.5 group-hover:text-teal-600 transition-colors">
          {apt.clinic?.name || 'عيادة الأسنان'}
        </h4>
        
        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-[11px] text-gray-500 font-bold">
          <span className="flex items-center gap-1.5 px-2 py-1 bg-gray-50/50 rounded-lg border border-gray-50">
            <User className="w-3.5 h-3.5 text-teal-600" /> 
            {apt.doctor_name || 'طبيب العيادة'}
          </span>
        </div>
      </div>

      {/* 3. Status & Time Section (Left/End) */}
      <div className="flex items-center gap-3 sm:gap-6">
        {/* Status & Type Column */}
        <div className="flex flex-col items-end gap-1.5">
          <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border shadow-sm ${config.color}`}>
            {config.label}
          </span>
          <span className="text-[9px] text-gray-400 font-bold bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 whitespace-nowrap">
            {apt.type || 'كشف عام'}
          </span>
        </div>

        {/* Time Badge */}
        <div className="bg-gray-50 group-hover:bg-teal-50 p-3 rounded-[1.8rem] border border-gray-100 group-hover:border-teal-100 transition-all text-center min-w-[70px] sm:min-w-[90px] shadow-sm">
          <p className="text-[10px] font-black text-gray-400 group-hover:text-teal-600 mb-0.5 uppercase tracking-widest">{timeInfo.period}</p>
          <p className="text-xl sm:text-2xl font-black text-gray-900 group-hover:scale-110 transition-transform tabular-nums">{timeInfo.time}</p>
        </div>

        <div className="hidden sm:flex w-10 h-10 bg-gray-50 rounded-2xl items-center justify-center text-gray-300 group-hover:bg-teal-600 group-hover:text-white transition-all shadow-sm">
          <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
        </div>
      </div>
    </div>
  );
};