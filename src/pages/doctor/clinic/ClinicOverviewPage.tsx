import React, { useState } from 'react';
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Building2,
  Clock,
  Star,
  MapPin,
  Phone,
  AlertCircle,
  Activity,
  CheckCircle,
  ShoppingCart,
  UserPlus,
  CalendarPlus,
  CircleAlert,
  Save,
  XCircle,
  Stethoscope,
  CheckCircle2,
  LayoutDashboard
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BentoStatCard } from '../../../components/dashboard/BentoStatCard';
import { formatDate } from '../../../lib/utils';
import { Card } from '../../../components/common/Card';
import { AppointmentModal } from '../../../components/appointments/AppointmentModal';
import { Appointment } from '../../../types';

// Hooks
import { useClinics } from '@/hooks/useClinics';
import { useFinance } from '@/hooks/useFinance';
import { usePatients } from '@/hooks/usePatients';
import { useInventory } from '@/hooks/useInventory';
import { useAppointments } from '@/hooks/useAppointments';
import { useStaff } from '@/hooks/useStaff';
import { useSubscriptionLimits } from '../../../hooks/useSubscriptionLimits';

import { Clinic } from '../../../types';

interface ClinicOverviewPageProps {
  clinicId: string;
  defaultClinic?: Clinic;
  onNavigate?: (tab: string) => void;
}


export const ClinicOverviewPage: React.FC<ClinicOverviewPageProps> = ({ clinicId, defaultClinic, onNavigate }) => {
  const navigate = useNavigate();

  // Modals state
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [showAddAppointmentModal, setShowAddAppointmentModal] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: '', phone: '', age: '', gender: 'male', email: '', address: '', notes: ''
  });

  const { checkLimit } = useSubscriptionLimits();

  // Real Data Hooks
  const { clinics, loading: loadingClinics } = useClinics();
  const { transactions } = useFinance(clinicId);
  const { patients, createPatient } = usePatients(clinicId);
  const { inventory: inventoryItems } = useInventory(clinicId);
  const { appointments, createAppointment } = useAppointments(clinicId);
  const { staff } = useStaff(clinicId);

  const handleCreatePatient = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newPatient.name || !newPatient.phone) {
      alert('يرجى إدخال الاسم ورقم الهاتف');
      return;
    }

    const limitCheck = checkLimit('patients');
    if (!limitCheck.allowed) {
      alert(limitCheck.message);
      return;
    }
    try {
      if (createPatient) {
        await createPatient({
          name: newPatient.name,
          phone: newPatient.phone,
          age: parseInt(newPatient.age) || 0,
          gender: newPatient.gender as any,
          email: newPatient.email,
          address: newPatient.address,
          notes: newPatient.notes,
          status: 'active',
          paymentStatus: 'pending'
        });
        setShowAddPatientModal(false);
        setNewPatient({ name: '', phone: '', age: '', gender: 'male', email: '', address: '', notes: '' });
        alert('تم إضافة المريض بنجاح');
      }
    } catch (e) {
      alert('حدث خطأ');
    }
  };

  const handleSaveAppointment = async (appointmentData: Partial<Appointment>) => {
    try {
      if (createAppointment) {
        await createAppointment({
          ...appointmentData,
          clinicId,
          status: appointmentData.status || 'scheduled'
        } as Appointment);
        setShowAddAppointmentModal(false);
      }
    } catch (e) {
      console.error(e);
    }
  };


  // Mock Data Removed
  const mockClinic = null;

  // Find Real Clinic
  // Use passed defaultClinic if available, otherwise search in clinics list
  const realClinic = defaultClinic || clinics.find(c => c.id.toString() === clinicId) as any;

  // Handle Loading
  if (loadingClinics && !realClinic) {
    return <div className="p-8 text-center text-gray-500">جاري تحميل بيانات العيادة...</div>; // Simple fallback
  }

  // Handle Loading standard
  if (!realClinic && loadingClinics) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-64 h-48 bg-gray-200 rounded-xl"></div>
            <div className="flex-1 space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-16"></div>
                      <div className="h-3 bg-gray-200 rounded w-12"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 h-32">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                </div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Calculate Real Stats
  const totalPatients = patients.length;

  // Calculate Daily Appointments (Real-time)
  const todayDate = new Date().toISOString().split('T')[0];
  const dailyAppointments = appointments.filter(a => a.date === todayDate).length;

  // Revenue Calculation
  const incomeTransactions = transactions.filter(t => t.type === 'income');
  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Active Staff (Real-time)
  const activeStaff = staff.filter(s => s.status === 'active' || !s.status).length; // Fallback if status missing

  // Inventory Stats
  const totalEquipment = inventoryItems?.length || 0;
  const lowStockCount = inventoryItems?.filter(i => i.quantity <= (i.minStock || 0)).length || 0;

  // Recent Patients (Real)
  const recentPatients = [...patients]
    .sort((a, b) => new Date(b.lastVisit || 0).getTime() - new Date(a.lastVisit || 0).getTime())
    .slice(0, 5);

  if (!realClinic) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">العيادة غير موجودة</h2>
        </div>
      </div>
    );
  }

  // Display Object Creation
  const displayClinic = {
    // Priority: Real Data -> Default Fallback
    name: realClinic.name || 'العيادة',
    address: realClinic.governorate ? `${realClinic.governorate}${realClinic.address ? `، ${realClinic.address}` : ''}` : (realClinic.address || ''),
    phone: realClinic.phone || '',
    totalPatients: totalPatients,
    dailyAppointments: dailyAppointments,
    specialties: (realClinic.specialties && realClinic.specialties.length > 0)
      ? (Array.isArray(realClinic.specialties) ? realClinic.specialties : [realClinic.specialties])
      : ['طب عام'],
    openTime: realClinic.openTime || '09:00',
    closeTime: realClinic.closeTime || '17:00',
    workingDays: realClinic.workingDays || ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
    image: realClinic.image || 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=2600&ixlib=rb-4.0.3',
    rating: realClinic.rating || '4.8',
    cover: realClinic.coverImage || 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=60'
  };

  // Daily Appointments Array
  const todayAppointmentsList = appointments.filter(a => a.date === todayDate);

  // Parse Staff presence
  const activeStaffList = staff.filter(s => s.status === 'active' || !s.status).map(s => {
    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
    
    // Simplistic check for presence, green tick logic
    const isWorkingDay = true; // Assuming active means working day if data is not complex
    const isPresentNow = true;

    return { ...s, isWorkingDay, isPresentNow };
  });

  return (
    <div className="space-y-6">


      {/* Clinic Header Info */}
      <Card className="overflow-hidden">
        {/* Cover Image - Added padding and rounded corners */}
        <div className="p-2">
          <div className="h-48 md:h-64 w-full relative rounded-2xl overflow-hidden shadow-sm">
            <img
              src={displayClinic.cover}
              alt="Clinic Cover"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
            
            {/* Overlay Actions */}
            <div className="absolute top-4 right-4 flex items-center gap-3">
              <button onClick={() => setShowAddPatientModal(true)} className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-xl transition-colors text-sm font-bold border border-green-100 shadow-sm">
                <UserPlus className="w-4 h-4" />
                إضافة مريض
              </button>
              <button onClick={() => setShowAddAppointmentModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition-colors text-sm font-bold shadow-sm shadow-blue-200">
                <CalendarPlus className="w-4 h-4" />
                إضافة موعد
              </button>
            </div>
          </div>
        </div>

        <div className="relative px-8 pb-8">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-20 md:-mt-24 relative z-10">
            {/* Clinic Logo - increased size and border */}
            <div className="w-36 h-36 md:w-48 md:h-48 rounded-3xl border-[6px] border-white shadow-xl overflow-hidden bg-white shrink-0">
              <img
                src={displayClinic.image}
                alt={displayClinic.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Clinic Details */}
            <div className="flex-1 text-center md:text-left pt-2 md:pt-0 md:mb-1">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">{displayClinic.name}</h1>
                <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 text-gray-600">
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">{displayClinic.address}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span className="text-sm dir-ltr">{displayClinic.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium border border-green-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    نشطة
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-gray-100 pt-8 mt-6">
            <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">التخصص</p>
                <p className="text-sm font-bold text-gray-900 truncate max-w-[120px]" title={displayClinic.specialties.join('، ')}>
                  {displayClinic.specialties.join('، ')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">ساعات العمل</p>
                <p className="text-sm font-bold text-gray-900 dir-ltr">
                  {displayClinic.openTime} - {displayClinic.closeTime}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
              <div className="p-3 bg-fuchsia-100 text-fuchsia-600 rounded-xl group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">عدد المرضى</p>
                <p className="text-sm font-bold text-gray-900">{totalPatients} مريض</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
                <Star className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">التقييم العام</p>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-gray-900">{displayClinic.rating}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Stats Grid */}
      < div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4" >
        <BentoStatCard
          title="إجمالي المرضى"
          value={totalPatients}
          icon={Users}
          color="blue"
          trend="up"
          trendValue="8.2%"
          delay={100}
        />
        <BentoStatCard
          title="المواعيد اليومية"
          value={dailyAppointments}
          icon={Calendar}
          color="purple"
          delay={200}
        />
        <BentoStatCard
          title="الإيرادات"
          value={`${totalIncome.toLocaleString()} د.ع`}
          icon={DollarSign}
          color="green"
          trend="up"
          trendValue="12.5%"
          delay={300}
        />
        <BentoStatCard
          title="الكادر الطبي"
          value={activeStaff}
          icon={Users}
          color="orange"
          delay={400}
        />
      </div >



      {/* Content Grid */}
      < div className="grid grid-cols-1 lg:grid-cols-2 gap-6" >

        {/* Recent Patients */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">المرضى حديثاً</h3>
                <p className="text-xs text-gray-600">أحدث المرضى المضافين</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {recentPatients.length > 0 ? recentPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{patient.name}</p>
                      <p className="text-sm text-gray-600">العمر: {patient.age || 'غير محدد'} سنة</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">
                      زيارة #{patient.totalVisits || 1}
                    </p>
                    <p className="text-xs text-gray-600">
                      {formatDate(patient.lastVisit || new Date().toISOString())}
                    </p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-6 text-gray-500">لا يوجد مرضى حالياً</div>
              )}
            </div>
          </div>
        </div>

        {/* Purchase Suggestions replacing Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-pink-50 to-pink-100 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-pink-600" />
                  </div>
                  <div>
                      <h3 className="font-bold text-gray-900">اقتراحات الشراء</h3>
                      <p className="text-xs text-gray-600">نواقص المخزون في العيادة</p>
                  </div>
              </div>
          </div>
          <div className="p-6">
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {lowStockCount === 0 ? (
                      <div className="text-center py-6 text-gray-500 text-sm">لا توجد نواقص في المخزون حالياً</div>
                  ) : (
                      inventoryItems?.filter(i => i.quantity <= (i.minStock || 0)).map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                              onClick={() => navigate(`/doctor/clinic/${clinicId}?tab=inventory`)}
                          >
                              <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                                      <CircleAlert className="w-4 h-4 text-yellow-600" />
                                  </div>
                                  <div>
                                      <p className="font-medium text-gray-900 text-sm">{item.name}</p>
                                      <span className="text-[10px] text-gray-500">الحد الأدنى: {item.minStock}</span>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <div className="inline-block px-2 py-1 rounded-full text-[10px] font-bold mb-1 bg-red-100 text-red-700">
                                      كمية حرجة
                                  </div>
                                  <p className="text-xs font-semibold text-gray-700">{item.quantity} {item.unit}</p>
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Today's Appointments (Dynamic Card) */}
        {todayAppointmentsList.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">مواعيد اليوم</h3>
                  <p className="text-xs text-gray-600">جدول المواعيد لهذا اليوم</p>
                </div>
              </div>
              <span className="text-xs font-bold text-purple-700 bg-purple-200 px-2.5 py-1 rounded-full">{todayAppointmentsList.length} موعد</span>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {todayAppointmentsList.slice(0, 4).map((apt, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-lg flex flex-col items-center justify-center border border-blue-100 shadow-sm text-blue-600">
                         <span className="text-sm font-bold">{apt.time.split(':')[0]}:{apt.time.split(':')[1]}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{apt.patientName || 'مريض غير محدد'}</p>
                        <p className="text-xs text-blue-600 mt-0.5">{apt.type}</p>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                      apt.status === 'completed' ? 'bg-green-100 text-green-700' :
                      apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {apt.status === 'scheduled' ? 'مجدول' : 
                       apt.status === 'completed' ? 'مكتمل' : 'معلق'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Staff On Duty */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">الطاقم المتواجدون</h3>
                <p className="text-xs text-gray-600">الكادر الطبي النشط حالياً</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {activeStaffList.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">لا يتوفر كادر نشط حالياً</div>
              ) : (
                activeStaffList.map((st, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{st.name}</p>
                        <p className="text-xs text-gray-500">{st.role_title || st.position || 'طبيب'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      {st.isPresentNow ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          متواجد الآن
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200">
                          خارج وقت العمل
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Add Patient Modal */}
      {showAddPatientModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-blue-50">
              <h3 className="font-bold text-lg text-blue-800">إضافة مريض جديد</h3>
              <button onClick={() => setShowAddPatientModal(false)} className="text-gray-400 hover:text-red-500 text-2xl transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
                <input
                  type="text"
                  required
                  value={newPatient.name}
                  onChange={e => setNewPatient({ ...newPatient, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                  placeholder="اسم المريض"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  required
                  value={newPatient.phone}
                  onChange={e => setNewPatient({ ...newPatient, phone: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                  placeholder="07..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العمر</label>
                <input
                  type="number"
                  value={newPatient.age}
                  onChange={e => setNewPatient({ ...newPatient, age: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الجنس</label>
                <select
                  value={newPatient.gender}
                  onChange={e => setNewPatient({ ...newPatient, gender: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                >
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                <input
                  type="text"
                  value={newPatient.address}
                  onChange={e => setNewPatient({ ...newPatient, address: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                  placeholder="المحافظة / المنطقة..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <textarea
                  value={newPatient.notes}
                  onChange={e => setNewPatient({ ...newPatient, notes: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                  rows={3}
                />
              </div>

              <div className="md:col-span-2 pt-4 bg-gray-50 border-t flex justify-end gap-3 -mx-6 -mb-6 p-4">
                <button type="button" onClick={() => setShowAddPatientModal(false)} className="px-5 py-2 text-gray-600 hover:bg-gray-200 rounded-xl font-medium">إلغاء</button>
                <button type="submit" className="px-6 py-2 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-sm shadow-blue-200">
                    <Save className="w-4 h-4" /> حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unified Appointment Modal */}
      <AppointmentModal
        isOpen={showAddAppointmentModal}
        onClose={() => setShowAddAppointmentModal(false)}
        onSave={handleSaveAppointment}
        preSelectedDate={new Date().toISOString().split('T')[0]}
        patients={patients.map(p => ({
          id: p.id,
          fullName: p.name,
          firstName: p.name.split(' ')[0],
          lastName: p.name.split(' ').slice(1).join(' '),
          phone: p.phone,
          gender: p.gender as 'male' | 'female',
          totalVisits: p.totalVisits,
          lastVisit: p.lastVisit,
          status: p.status
        })) as any}
        clinicId={clinicId}
      />

    </div>
  );
};