import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Calendar,
  List,
  Plus,
  Search,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
  MapPin,
  Edit2,
  FileText,
  Trash2,
  UserPlus,
  Save,
  ChevronDown,
  History, // Added
  Globe
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/common/Card';
import { formatDate } from '../../../lib/utils';
import { BentoStatCard } from '../../../components/dashboard/BentoStatCard';
import { HorizontalCalendar } from '../../../components/calendar/HorizontalCalendar';
import { Appointment } from '../../../types';
import { useAppointments } from '../../../hooks/useAppointments';
import { supabase } from '../../../lib/supabase';
import { usePatients } from '../../../hooks/usePatients';
import { useOnlineRequests, OnlineRequest } from '../../../hooks/useOnlineRequests';
import { getStaffByClinic } from '../../../data/mock/clinicStaff';

interface ClinicAppointmentsPageProps {
  clinicId: string;
}

export const ClinicAppointmentsPage: React.FC<ClinicAppointmentsPageProps> = ({ clinicId }) => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'calendar' | 'list'>('calendar');
  const [sectionTab, setSectionTab] = useState<'upcoming' | 'past'>('upcoming'); // New Tab State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedRequestForFile, setSelectedRequestForFile] = useState<OnlineRequest | null>(null); // New State
  const [doctors, setDoctors] = useState<{ id: string, name: string }[]>([]);

  const { patients, createPatient } = usePatients(clinicId);
  const {
    appointments,
    loading,
    createAppointment,
    updateAppointment,
    deleteAppointment
  } = useAppointments(clinicId);

  // Fetch Doctors
  useEffect(() => {
    if (!clinicId) return;
    const fetchDoctors = async () => {
      // Fetch staff with role relevant to being a doctor
      const { data, error } = await supabase
        .from('staff')
        .select('id, full_name, role_title')
        .eq('clinic_id', parseInt(clinicId))
        .eq('is_active', true);

      if (data && data.length > 0) {
        setDoctors(data.map(d => ({ id: d.id.toString(), name: d.full_name })));
      } else {
        // Fallback to Mock Data
        const mockStaff = getStaffByClinic(clinicId).filter(s => s.position === 'doctor');
        if (mockStaff.length > 0) {
          setDoctors(mockStaff.map(s => ({ id: s.id, name: s.name })));
        } else {
          // Absolute fallback if no mock data exists
          setDoctors([{ id: '1', name: 'د. أحمد محمد (افتراضي)' }]);
        }
      }
    };
    fetchDoctors();
  }, [clinicId]);

  // Load Online Requests (Real Data)
  const { requests: onlineRequests, refresh: refreshRequests, confirmRequest, cancelRequest, linkPatientToRequest } = useOnlineRequests(clinicId);

  // Removed old mock useEffects

  // New state for pre-filling the Add Modal
  const [initialAppointmentData, setInitialAppointmentData] = useState<Partial<Appointment> | null>(null);

  const handleConfirmRequest = async (request: OnlineRequest) => {
    // Direct confirm as requested (reverting modal logic)
    if (!request.patientId) {
      alert('يجب إنشاء ملف للمريض أولاً!');
      return;
    }
    const success = await confirmRequest(request.id);
    if (success) {
      alert(`تم تأكيد الحجز للمريض ${request.patientName} بنجاح!`);
      // refreshRequests(); // Handled by hook usually, or add if needed
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) {
      await cancelRequest(requestId);
      refreshRequests();
    }
  };

  const handleDeleteAppointment = (aptId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الموعد؟')) {
      deleteAppointment(aptId);
    }
  };

  // Helper to get patient name
  const getPatientName = (patientId: string, savedName?: string) => {
    if (savedName) return savedName; // Use saved name if available (e.g. from Online Request)
    if (!patientId) return 'مريض غير محدد';
    if (patientId.toString().startsWith('temp')) return "مريض زائر (جديد)";
    const patient = patients.find(p => p.id === patientId);
    return patient ? patient.name : 'مريض غير معروف';
  };

  const handleEditClick = (apt: Appointment) => {
    setEditingAppointment(apt);
  };

  const handleUpdateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAppointment) return;

    updateAppointment(editingAppointment);
    setEditingAppointment(null);
    alert('تم تحديث الموعد بنجاح');
  };

  const handleCreatePatientFile = (request: OnlineRequest) => {
    // Open the modal for confirmation/editing
    setSelectedRequestForFile(request);
  };

  // Statistics
  const today = new Date().toLocaleDateString('en-CA');
  const todayAppointments = appointments.filter(apt => apt.date === today);
  const completed = appointments.filter(apt => apt.status === 'completed').length;
  const cancelled = appointments.filter(apt => apt.status === 'cancelled').length;
  const pending = appointments.filter(apt => apt.status === 'pending' || apt.status === 'confirmed').length;
  const completionRate = appointments.length > 0 ? Math.round((completed / appointments.length) * 100) : 0;

  // Filter Logic
  const filteredAppointments = appointments.filter(apt => {
    // Reliable Local YYYY-MM-DD
    const toLocalDateStr = (d: Date | string) => {
      // Start with a Date object
      const dateObj = typeof d === 'string' ? new Date(d) : d;
      // Use en-CA for YYYY-MM-DD format
      return dateObj.toLocaleDateString('en-CA');
    };

    const aptDateStr = apt.date; // Assuming apt.date is already YYYY-MM-DD string from DB. If not, sanitize.
    // If apt.date comes as full timestamp, normalize it:
    const normalizedAptDate = apt.date.includes('T') ? apt.date.split('T')[0] : apt.date;

    // For "Today" comparison
    const todayStr = toLocalDateStr(new Date()); // Local Today

    // Tab Filter
    if (sectionTab === 'past') {
      // Show only dates BEFORE today
      if (normalizedAptDate >= todayStr) return false;
    } else {
      // UPCOMING Tab
      // If View is Calendar, match selected date
      if (activeView === 'calendar') {
        const filterDate = toLocalDateStr(selectedDate);
        if (normalizedAptDate !== filterDate) return false;
      }
      // Note: We are ignoring "future only" filter here to allow Calendar to explore future AND today. 
      // But logic for "Past" explicitly HIDES past items.
    }

    // Filter by status
    if (selectedStatus !== 'all' && apt.status !== selectedStatus) return false;

    // Filter by Search
    if (searchTerm) {
      const pName = getPatientName(apt.patientId, apt.patientName);
      return pName.includes(searchTerm) || apt.notes?.includes(searchTerm);
    }

    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'confirmed': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'مكتمل';
      case 'cancelled': return 'ملغي';
      case 'pending': return 'معلق';
      case 'confirmed': return 'مؤكد';
      default: return 'غير محدد';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Bento Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <BentoStatCard
          title="مواعيد اليوم"
          value={todayAppointments.length}
          icon={Calendar}
          color="blue"
          trend="neutral"
          trendValue="مواعيد مجدولة"
          delay={100}
        />
        <BentoStatCard
          title="معدل الإكمال"
          value={`${completionRate}%`}
          icon={CheckCircle}
          color="green"
          trend="up"
          trendValue="إنجاز المواعيد"
          delay={200}
        />
        <BentoStatCard
          title="قيد الانتظار"
          value={pending}
          icon={Clock}
          color="orange"
          trend="neutral"
          trendValue="بانتظار الدخول"
          delay={300}
        />
        <BentoStatCard
          title="تم الإلغاء"
          value={cancelled}
          icon={XCircle}
          color="red"
          trend="down"
          trendValue="مواعيد ملغية"
          delay={400}
        />
      </div>

      {/* Main Control Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">

          {/* Section Tabs (New) */}
          <div className="flex bg-gray-50 rounded-xl p-1.5 border border-gray-100">
            <button
              onClick={() => { setSectionTab('upcoming'); setActiveView('calendar'); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${sectionTab === 'upcoming' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Clock className="w-4 h-4" /> المواعيد القادمة
            </button>
            <button
              onClick={() => { setSectionTab('past'); setActiveView('list'); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${sectionTab === 'past' ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <History className="w-4 h-4" /> المواعيد الفائتة
            </button>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 w-full lg:w-auto justify-end">
            <div className="relative group">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors w-4 h-4" />
              <input
                type="text"
                placeholder="بحث عن مريض..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl text-sm w-full sm:w-64 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none"
              />
            </div>

            <div className="relative">
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="appearance-none px-4 pl-8 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none cursor-pointer"
              >
                <option value="all">كل الحالات</option>
                <option value="confirmed">حجوزات مؤكدة</option>
                <option value="pending">طلبات معلقة</option>
                <option value="completed">مكتملة</option>
                <option value="cancelled">ملغي</option>
              </select>
              <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 transition-all cursor-pointer font-medium"
            >
              <Plus className="w-5 h-5" />
              <span>موعد جديد</span>
            </button>
          </div>
        </div>
      </div>

      {/* Calendar View (Only for Upcoming) */}
      {sectionTab === 'upcoming' && (
        <div className="space-y-6">
          <HorizontalCalendar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            appointments={appointments.filter(a => new Date(a.date).toISOString().split('T')[0] >= new Date().toISOString().split('T')[0])}
          />

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">
              مواعيد {selectedDate.toLocaleDateString('ar-IQ', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {filteredAppointments.length} موعد
            </span>
          </div>
          {/* List for Calendar Day */}
          {filteredAppointments.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredAppointments.map((apt) => (
                <div key={apt.id} className="group bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">

                  {/* Status Indicator Strip */}
                  <div className={`absolute right-0 top-0 bottom-0 w-1.5 ${getStatusColor(apt.status).replace('text-', 'bg-').split(' ')[0]}`} />

                  <div className="flex items-center gap-5 w-full md:w-auto pr-4">
                    <div className="flex flex-col items-center justify-center min-w-[70px] h-18 bg-blue-50/50 rounded-2xl text-blue-700 border border-blue-100">
                      <span className="text-xl font-bold font-mono">{apt.time}</span>
                      <span className="text-[10px] font-medium opacity-70">صباحاً</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                        {getPatientName(apt.patientId, apt.patientName)}
                        {apt.patientId && apt.patientId.toString().startsWith('temp') && <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">زائر</span>}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1.5">
                        <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-0.5 rounded-lg"><Users className="w-3.5 h-3.5" /> كشف عام</span>
                        <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-0.5 rounded-lg"><Clock className="w-3.5 h-3.5" /> 30 دقيقة</span>
                        {apt.type && apt.type.includes('أونلاين') && (
                          <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg border border-blue-100 animate-pulse">
                            <Globe className="w-3.5 h-3.5" /> أونلاين
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto justify-end pl-2">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${getStatusColor(apt.status)}`}>
                      {getStatusLabel(apt.status)}
                    </span>

                    <div className="h-8 w-px bg-gray-100 mx-2 hidden md:block"></div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        title="عرض الملف"
                        onClick={() => navigate(`/doctor/clinic/${clinicId}/patient/${apt.patientId}`)}
                      >
                        <FileText className="w-5 h-5" />
                      </button>
                      <button
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"
                        title="تعديل الموعد"
                        onClick={() => handleEditClick(apt)}
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAppointment(apt.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="إلغاء الموعد">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
              <Calendar className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">لا يوجد مواعيد في هذا اليوم</h3>
              <p className="text-gray-500 mb-6">يمكنك إضافة موعد جديد أو استعراض الأيام الأخرى</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                إضافة موعد الآن
              </button>
            </div>
          )}
        </div>
      )}

      {/* Past View (List Only) */}
      {sectionTab === 'past' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-gray-500" />
            سجل المواعيد الفائتة
            <span className="text-sm font-normal text-gray-500">({filteredAppointments.length})</span>
          </h3>
          {filteredAppointments.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredAppointments.map((apt) => (
                <div key={apt.id} className="bg-gray-50 hover:bg-white p-4 rounded-xl border border-gray-200/60 hover:border-gray-300 transition-all flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="flex flex-col items-center justify-center min-w-[60px] h-14 bg-white rounded-lg border border-gray-200 text-gray-600">
                      <span className="text-sm font-bold">{new Date(apt.date).getDate()}</span>
                      <span className="text-[10px]">{new Date(apt.date).toLocaleDateString('ar-IQ', { month: 'short' })}</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800">{getPatientName(apt.patientId, apt.patientName)}</h4>
                      <div className="text-xs text-gray-500 flex gap-2 mt-1">
                        <span>{apt.time}</span>
                        <span>•</span>
                        <span>{apt.type}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusColor(apt.status)}`}>
                      {getStatusLabel(apt.status)}
                    </span>
                    <button
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      onClick={() => navigate(`/doctor/clinic/${clinicId}/patient/${apt.patientId}`)}
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              لا توجد مواعيد فائتة
            </div>
          )}
        </div>
      )}

      {/* Online Requests Logic (Only visible in Upcoming) */}
      {sectionTab === 'upcoming' && (
        <div className="mt-8 border-t pt-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            طلبات الحجز الإلكتروني
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{onlineRequests.length}</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {onlineRequests.map(req => (
              <div key={req.id} className="bg-white p-5 rounded-xl border border-orange-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-gray-900">{req.patientName}</h4>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> عبر {req.source === 'map' ? 'الخريطة' : 'التطبيق'}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900">{req.time}</p>
                    <p className="text-xs text-gray-500">{req.date}</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => {
                      if (!req.hasFile) {
                        // If no file, require creation first
                        alert('يجب إنشاء ملف للمريض أولاً قبل تأكيد الحجز.');
                        handleCreatePatientFile(req);
                      } else {
                        handleConfirmRequest(req);
                      }
                    }}
                    className={`flex-1 text-white py-2 rounded-lg text-sm font-medium transition-colors ${!req.hasFile ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                    disabled={!req.hasFile && false} // Just visual, we handle click to show alert
                  >
                    تأكيد الحجز
                  </button>

                  <button
                    onClick={() => handleCancelRequest(req.id)}
                    className="px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
                {!req.hasFile ? (
                  <button
                    onClick={() => handleCreatePatientFile(req)}
                    className="w-full mt-2 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg flex items-center justify-center gap-1 font-bold"
                  >
                    <UserPlus className="w-3 h-3" /> إنشاء ملف للمريض
                  </button>
                ) : (
                  <div className="w-full mt-2 py-1.5 text-xs text-green-600 bg-green-50 rounded-lg flex items-center justify-center gap-1 font-bold cursor-default">
                    <CheckCircle className="w-3 h-3" /> الملف جاهز
                  </div>
                )}
              </div>
            ))}
            {onlineRequests.length === 0 && (
              <div className="col-span-full text-center py-6 text-gray-400 bg-gray-50 rounded-xl border border-dashed">
                لا توجد طلبات جديدة
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg">إضافة موعد جديد</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-red-500">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المريض</label>
                <select className="w-full border rounded-lg p-2.5 bg-white text-right" id="new-apt-patient">
                  <option value="">اختر مريض...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الطبيب المعالج</label>
                <select className="w-full border rounded-lg p-2.5 bg-white text-right" id="new-apt-doctor">
                  <option value="">اختر الطبيب...</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Date & Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
                  <input
                    type="date"
                    id="new-apt-date"
                    defaultValue={selectedDate.toISOString().split('T')[0]}
                    className="w-full border rounded-lg p-2.5 text-right"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الوقت</label>
                  <input
                    type="time"
                    id="new-apt-time"
                    className="w-full border rounded-lg p-2.5 text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">حالة الحجز</label>
                <select id="new-apt-status" className="w-full border rounded-lg p-2.5 text-right bg-white">
                  <option value="confirmed">حجز مؤكد (مباشر)</option>
                  <option value="pending">طلب حجز (معلق/أونلاين)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <textarea
                  id="new-apt-notes"
                  className="w-full border rounded-lg p-2.5 min-h-[80px]"
                  placeholder="سبب الزيارة..."
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-5 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  const pId = (document.getElementById('new-apt-patient') as HTMLSelectElement).value;
                  const dId = (document.getElementById('new-apt-doctor') as HTMLSelectElement).value;
                  const date = (document.getElementById('new-apt-date') as HTMLInputElement).value;
                  const time = (document.getElementById('new-apt-time') as HTMLInputElement).value;
                  const statusElement = document.getElementById('new-apt-status') as HTMLSelectElement;
                  const status = statusElement ? statusElement.value : 'confirmed';
                  const notes = (document.getElementById('new-apt-notes') as HTMLTextAreaElement).value;

                  if (!pId || !dId || !date || !time) {
                    alert('يرجى ملء البيانات الأساسية (المريض، الطبيب، الوقت)');
                    return;
                  }

                  const selectedPatient = patients.find(p => p.id === pId);
                  const selectedDoctor = doctors.find(d => d.id === dId);


                  const newApt: Appointment = {
                    id: `apt-${Date.now()}`,
                    clinicId,
                    patientId: pId,
                    patientName: selectedPatient?.name,
                    doctorId: dId,
                    doctorName: selectedDoctor?.name,
                    date,
                    time,
                    type: 'كشف',
                    status: status as any,
                    notes
                  };

                  createAppointment(newApt);
                  setShowAddModal(false);
                  alert('تم إضافة الموعد بنجاح');
                }}
                className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium shadow-sm"
              >
                حفظ الموعد
              </button>
            </div>
          </div>
        </div>
      )
      }

      {/* Create Patient File Modal */}
      {
        selectedRequestForFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
              <div className="px-6 py-4 border-b flex justify-between items-center bg-blue-50">
                <h3 className="font-bold text-lg text-blue-800">إنشاء ملف مريض جديد</h3>
                <button onClick={() => setSelectedRequestForFile(null)} className="text-gray-400 hover:text-red-500">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const newName = formData.get('name') as string;

                // Duplicate Check
                const isDuplicate = patients.some(p => p.name.trim() === newName.trim());
                if (isDuplicate) {
                  const proceed = confirm(`تنبيه: يوجد بالفعل مريض باسم "${newName}". هل تريد المتابعة وإنشاء ملف مكرر؟\n\nاضغط "موافق" للمتابعة أو "إلغاء| لتغيير الاسم.`);
                  if (!proceed) return;
                }

                try {
                  // 1. Create Patient
                  const newPatient = await createPatient({
                    name: newName,
                    phone: formData.get('phone') as string,
                    gender: formData.get('gender') as 'male' | 'female',
                    age: parseInt(formData.get('age') as string) || 30,
                    status: 'active',
                    paymentStatus: 'pending',
                    address: formData.get('address') as string,
                    notes: `تم إنشاء الملف من حجز إلكتروني - ${formData.get('notes')}`
                  });

                  // 2. Link Appointment to New Patient (if request exists)
                  if (newPatient && selectedRequestForFile.id) {
                    // Use the new helper to link locally!
                    const success = await linkPatientToRequest(
                      selectedRequestForFile.id,
                      newPatient.id
                    );

                    if (!success) console.error('Error linking appointment locally');
                  }

                  toast.success("تم إنشاء الملف وربطه بالحجز بنجاح");
                  setSelectedRequestForFile(null);

                  // Update request state
                  refreshRequests();
                } catch (error) {
                  console.error(error);
                  alert("حدث خطأ أثناء إنشاء الملف");
                }
              }} className="p-6 space-y-4">

                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4 text-sm text-blue-700">
                  يتم إنشاء الملف بناءً على طلب الحجز من: <span className="font-bold">{selectedRequestForFile.patientName}</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم المريض</label>
                  <input name="name" defaultValue={selectedRequestForFile.patientName} required className="w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                    <input
                      name="phone"
                      defaultValue={selectedRequestForFile.phone || ''}
                      required
                      className="w-full border rounded-lg p-2.5 bg-gray-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">العمر</label>
                    <input name="age" type="number" defaultValue="30" className="w-full border rounded-lg p-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الجنس</label>
                  <select name="gender" className="w-full border rounded-lg p-2.5">
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                  <input name="address" placeholder="المنطقة / المدينة" className="w-full border rounded-lg p-2.5" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات طبية (من الحجز)</label>
                  <textarea
                    name="notes"
                    rows={3}
                    className="w-full border rounded-lg p-2.5"
                    placeholder="أي ملاحظات إضافية..."
                    defaultValue={selectedRequestForFile.notes ? `ملاحظات الحجز: ${selectedRequestForFile.notes}` : `سبب الزيارة: كشف عام (أونلاين)`}
                  ></textarea>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t">
                  <button
                    type="button"
                    onClick={() => setSelectedRequestForFile(null)}
                    className="px-5 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium shadow-sm flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    إنشاء الملف وحفظ
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Edit Modal */}
      {
        editingAppointment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
              <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg">تعديل الموعد</h3>
                <button onClick={() => setEditingAppointment(null)} className="text-gray-400 hover:text-red-500">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleUpdateAppointment} className="p-6 space-y-4">
                {/* Note: Patient selection is typically read-only in edit, but can be changeable */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">المريض</label>
                  <div className="w-full border rounded-lg p-2.5 bg-gray-50 text-right text-gray-600">
                    {getPatientName(editingAppointment.patientId, editingAppointment.patientName)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
                    <input
                      type="date"
                      value={editingAppointment.date}
                      onChange={e => setEditingAppointment({ ...editingAppointment, date: e.target.value })}
                      className="w-full border rounded-lg p-2.5 text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الوقت</label>
                    <input
                      type="time"
                      value={editingAppointment.time}
                      onChange={e => setEditingAppointment({ ...editingAppointment, time: e.target.value })}
                      className="w-full border rounded-lg p-2.5 text-right"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                  <select
                    value={editingAppointment.status}
                    onChange={e => setEditingAppointment({ ...editingAppointment, status: e.target.value as any })}
                    className="w-full border rounded-lg p-2.5 text-right"
                  >
                    <option value="pending">معلق</option>
                    <option value="confirmed">مؤكد</option>
                    <option value="completed">مكتمل</option>
                    <option value="cancelled">ملغي</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                  <textarea
                    value={editingAppointment.notes || ''}
                    onChange={e => setEditingAppointment({ ...editingAppointment, notes: e.target.value })}
                    className="w-full border rounded-lg p-2.5 min-h-[80px]"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t">
                  <button
                    type="button"
                    onClick={() => setEditingAppointment(null)}
                    className="px-5 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium shadow-sm flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    حفظ التغييرات
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

    </div >
  );
};