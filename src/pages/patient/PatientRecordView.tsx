import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  HeartPulse, ChevronRight, FileText, Calendar, Activity, 
  Pill, AlertCircle, DollarSign, Briefcase, User, Clock,
  CheckCircle2, Timer, CreditCard, Receipt, TrendingUp, TrendingDown,
  Stethoscope, ShieldCheck, Info, MessageSquare, Building2,
  MessageCircle, Send, Paperclip
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/common/Card';
import { BentoStatCard } from '../../components/dashboard/BentoStatCard';
import { formatDate } from '../../lib/utils';
import { usePatientTreatments } from '../../hooks/usePatientTreatments';
import { useFinance } from '../../hooks/useFinance';
import { useMessages } from '../../hooks/useMessages';

export const PatientRecordView: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // clinic-specific patient record id
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [patient, setPatient] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'treatments' | 'finance'>('overview');

  // Hooks
  const { treatmentPlans, loading: treatmentsLoading } = usePatientTreatments(id);
  const { stats, transactions, loading: financeLoading } = useFinance(patient?.clinic_id, id);

  useEffect(() => {
    if (user && id) fetchPatientRecord();
  }, [user, id]);

  const fetchPatientRecord = async () => {
    setLoading(true);
    try {
      // Fetch by ID and ensure it belongs to the logged-in user
      const { data, error } = await supabase
        .from('patients')
        .select(`
          *,
          clinic:clinics(*)
        `)
        .eq('id', id)
        .or(`patient_user_id.eq.${user!.id},user_id.eq.${user!.id}`)
        .maybeSingle();

      if (error) {
        console.error('PatientRecordView: error fetching record:', error);
        throw error;
      }
      
      if (!data) {
        setPatient(null);
        return;
      }
      setPatient(data);

      // Fetch visits (appointments)
      const { data: aptData } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', id)
        .order('appointment_date', { ascending: false });
      
      if (aptData) setAppointments(aptData);

    } catch (err) {
      console.error('Error fetching patient record:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="w-12 h-12 border-4 border-teal-100 border-t-teal-500 rounded-full animate-spin"></div>
        <p className="text-gray-400 mt-4 font-medium">جاري تحميل ملفك الطبي...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-8 text-center min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800">الملف الطبي غير متاح</h2>
        <p className="text-gray-500 max-w-xs mx-auto mt-2">لا تملك صلاحية للوصول إلى هذا الملف، أو أنه قد تم نقله.</p>
        <button 
          onClick={() => navigate('/patient')} 
          className="mt-6 px-8 py-3 bg-teal-600 text-white rounded-2xl font-bold shadow-lg shadow-teal-100 hover:bg-teal-700 transition-all"
        >
          العودة للمركز
        </button>
      </div>
    );
  }

  const medicalData = patient.medical_history_data || {};
  const vitals = medicalData.vitals || {};
  const allergies = medicalData.allergies || [];
  const conditions = medicalData.conditions || [];

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/20 pb-24" dir="rtl">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm pt-[calc(env(safe-area-inset-top)*0.75)]">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 h-16">
            <button 
              onClick={() => navigate('/patient')} 
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ChevronRight className="w-6 h-6 text-gray-400" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-100">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-black text-gray-900 leading-tight">ملفي الطبي</h1>
              </div>
            </div>
          </div>

          {/* Professional Tab Navigation */}
          <div className="flex gap-2 pb-0 mt-2">
            {[
              { id: 'overview', label: 'نظرة عامة', icon: Activity },
              { id: 'treatments', label: 'الخطط العلاجية', icon: Briefcase },
              { id: 'finance', label: 'المالية', icon: DollarSign },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-bold transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'border-teal-600 text-teal-600 bg-teal-50/50 rounded-t-xl'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* ── Tab Content: Overview ── */}
        {activeTab === 'overview' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Clinic Mini Profile Card */}
            <div className="bg-white rounded-3xl border border-gray-100 p-4 shadow-xl shadow-gray-200/20 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl overflow-hidden shadow-inner border border-teal-50 flex items-center justify-center shrink-0">
                  {patient.clinic?.logo_url ? (
                    <img src={patient.clinic.logo_url} alt={patient.clinic.name} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-7 h-7 text-teal-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-lg leading-tight">{patient.clinic?.name}</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-teal-500" /> عيادة معتمدة في المنصة
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => navigate(`/messages?clinic=${patient.clinic_id}`)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 text-gray-700 text-xs font-bold rounded-2xl hover:bg-gray-100 transition-colors border border-gray-100"
                >
                  <MessageSquare className="w-4 h-4 text-teal-600" /> مراسلة
                </button>
                <button 
                  onClick={() => navigate(`/booking?clinic=${patient.clinic_id}`)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white text-xs font-bold rounded-2xl hover:bg-teal-700 transition-all shadow-lg shadow-teal-100"
                >
                  <Calendar className="w-4 h-4" /> حجز موعد
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Vitals & Alerts */}
              <div className="lg:col-span-4 space-y-6">
                {/* Vitals Bento Card */}
                <Card className="p-0 overflow-hidden border-orange-100 shadow-xl shadow-orange-50/50">
                  <div className="bg-gradient-to-r from-orange-50 to-orange-100/50 p-4 border-b border-orange-100 flex justify-between items-center">
                    <h3 className="font-bold text-orange-900 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-orange-600" /> العلامات الحيوية
                    </h3>
                  </div>
                  <div className="p-4 grid grid-cols-4 gap-3">
                    {[
                      { label: 'الضغط', value: vitals.bp || '-', icon: Timer, color: 'text-rose-500' },
                      { label: 'السكر', value: vitals.sugar || '-', icon: Activity, color: 'text-blue-500' },
                      { label: 'النبض', value: vitals.pulse || '-', icon: HeartPulse, color: 'text-amber-500' },
                      { label: 'الوزن', value: vitals.weight || '-', icon: Activity, color: 'text-emerald-500' },
                    ].map((vital, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-2xl border border-orange-50 text-center shadow-sm">
                        <span className="text-[10px] text-gray-400 block mb-1 font-bold uppercase">{vital.label}</span>
                        <p className="text-lg font-black text-gray-800">{vital.value}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Medical Alerts Card - Only show if there is data */}
                {allergies.length > 0 && (
                  <Card className="p-6 border-r-4 border-r-rose-500 bg-white shadow-xl shadow-rose-50/30">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 border-b pb-3">
                      <AlertCircle className="w-5 h-5 text-rose-500" /> تنبيهات طبية
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">الحساسية</p>
                        <div className="flex flex-wrap gap-2">
                          {allergies.map((a: string) => (
                            <span key={a} className="px-3 py-1 bg-rose-50 text-rose-700 text-[11px] font-bold rounded-lg border border-rose-100 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                              {a}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                )}
              </div>

              {/* Right Column: Chronic Diseases & History */}
              <div className="lg:col-span-8 space-y-6">
                {/* Chronic Diseases Card */}
                <Card className="p-6 bg-white shadow-xl shadow-gray-100/50">
                  <h3 className="font-bold text-lg text-gray-800 mb-6 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" /> السجل الطبي
                  </h3>
                  <div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'السكري', checked: conditions.includes('السكري') || conditions.includes('Diabetes') },
                        { label: 'ضغط الدم', checked: conditions.includes('ضغط الدم') || conditions.includes('Hypertension') },
                        { label: 'مريض قلب', checked: conditions.includes('مريض قلب') || conditions.includes('Heart Disease') },
                        { label: 'الربو', checked: conditions.includes('الربو') || conditions.includes('Asthma') },
                        { label: 'التهاب الكبد', checked: conditions.includes('التهاب الكبد') || conditions.includes('Hepatitis') },
                        { label: 'سيولة الدم', checked: conditions.includes('سيولة الدم') || conditions.includes('Blood Thinner') },
                      ].map((item, idx) => (
                        <div 
                          key={idx} 
                          className={`flex items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                            item.checked ? 'border-teal-500 bg-teal-50/30' : 'border-gray-50 bg-gray-50/20 opacity-60'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                            item.checked ? 'bg-teal-500 border-teal-500' : 'bg-white border-gray-200'
                          }`}>
                            {item.checked && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                          <span className={`text-xs font-bold ${item.checked ? 'text-teal-700' : 'text-gray-400'}`}>
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>

                {/* Visit History Timeline */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">سجل الزيارات الأخيرة</h4>
                  </div>
                  
                  <div className="space-y-4 relative before:absolute before:inset-y-0 before:right-2.5 before:w-0.5 before:bg-gray-100 before:top-2 before:bottom-2">
                    {appointments.length === 0 ? (
                      <div className="bg-white p-6 rounded-3xl border border-dashed border-gray-200 text-center text-gray-400 text-xs">
                        لا يوجد سجل زيارات حتى الآن
                      </div>
                    ) : (
                      appointments.slice(0, 5).map((apt, idx) => {
                        const date = new Date(apt.appointment_date);
                        const day = date.getDate();
                        const month = date.toLocaleString('en-US', { month: 'short' });
                        
                        return (
                          <div key={apt.id} className="relative flex gap-4">
                            <div className={`w-5 h-5 rounded-full shrink-0 z-10 border-2 border-white shadow-sm mt-1.5 ${
                              apt.status === 'completed' ? 'bg-teal-500' : 'bg-blue-400'
                            }`} />
                            <div className="relative group bg-white rounded-3xl border border-gray-50 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-1 transform hover:-translate-y-0.5">
                              <div className="w-16 shrink-0 flex flex-col items-center justify-center p-2 bg-gray-50/50 text-gray-500 border-l border-gray-50">
                                <span className="text-xl font-black">{day}</span>
                                <span className="text-[10px] uppercase font-bold">{month}</span>
                              </div>
                              <div className="flex-1 p-4">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="font-bold text-gray-900 text-sm">{apt.type || 'كشف عام'}</h4>
                                    <p className="text-[10px] text-gray-400 mt-0.5">{apt.doctor_name || 'طبيب العيادة'}</p>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border ${
                                    apt.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                                  }`}>
                                    {apt.status === 'completed' ? 'مكتملة' : 'مجدول'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Doctor evaluation simplified */}
            <Card className="p-8 bg-white border-gray-100 shadow-xl shadow-gray-100/30">
              <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-3">
                <Stethoscope className="w-6 h-6 text-teal-600" /> ملاحظات الطبيب
              </h3>
              <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-50 text-sm text-gray-600 leading-relaxed italic">
                {medicalData.notes || patient.medical_history || 'لا توجد ملاحظات سريرية مضافة حالياً.'}
              </div>
            </Card>
          </div>
        )}

        {/* ── Tab Content: Treatments ── */}
        {activeTab === 'treatments' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-teal-600" /> سجل الخطط العلاجية
              </h3>
              <span className="px-4 py-1 bg-teal-50 text-teal-600 text-xs font-bold rounded-full">
                {treatmentPlans.length} خطة
              </span>
            </div>

            {treatmentsLoading ? (
              <div className="py-20 text-center text-gray-400">جاري التحميل...</div>
            ) : treatmentPlans.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                <p className="font-bold text-lg text-gray-400">لا توجد خطط علاجية حالياً</p>
                <p className="text-xs text-gray-400 mt-1">سيقوم الطبيب بإضافة خططك العلاجية هنا</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {treatmentPlans.map(plan => (
                  <Card key={plan.id} className="p-6 bg-white hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-2 h-full bg-teal-500 opacity-20" />
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                            plan.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                            plan.status === 'in_progress' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                            'bg-amber-50 text-amber-600 border border-amber-100'
                          }`}>
                            {plan.status === 'completed' ? 'مكتملة' : plan.status === 'in_progress' ? 'قيد التنفيذ' : 'مخطط لها'}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold">#{plan.id.slice(-4).toUpperCase()}</span>
                        </div>
                        <h4 className="text-lg font-black text-gray-900 group-hover:text-teal-600 transition-colors">{plan.notes || 'إجراء علاجي'}</h4>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> بدأت في: {plan.startDate}
                        </p>
                      </div>

                      <div className="flex md:flex-col items-end justify-between md:justify-center border-t md:border-t-0 md:border-r border-gray-100 pt-4 md:pt-0 md:pr-6 gap-4">
                        <div className="text-right">
                          <p className="text-[10px] text-gray-400 font-bold uppercase">التكلفة الإجمالية</p>
                          <p className="text-lg font-black text-gray-900">{(plan.cost || 0).toLocaleString()} <span className="text-[10px] font-normal">د.ع</span></p>
                        </div>
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-teal-500 rounded-full transition-all duration-1000" 
                            style={{ width: `${plan.progress}%` }}
                          />
                        </div>
                        <p className="text-[10px] font-black text-teal-600">{plan.progress}% مكتمل</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab Content: Finance ── */}
        {activeTab === 'finance' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-teal-600" /> ملخص مالي
              </h3>
            </div>

            {/* Financial Bento Grid */}
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              <BentoStatCard
                title="إجمالي التكلفة"
                value={`${stats.income + (treatmentPlans.reduce((sum, p) => sum + (p.cost - p.paid), 0))} د.ع`}
                icon={Receipt}
                color="blue"
                delay={100}
              />
              <BentoStatCard
                title="إجمالي المدفوع"
                value={`${stats.income} د.ع`}
                icon={TrendingUp}
                color="green"
                delay={200}
              />
              <BentoStatCard
                title="المتبقي المستحق"
                value={`${treatmentPlans.reduce((sum, p) => sum + (p.cost - p.paid), 0)} د.ع`}
                icon={TrendingDown}
                color="orange"
                delay={300}
              />
            </div>

            <Card className="p-6 bg-white border-gray-100">
              <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-teal-600" /> سجل الدفعات الأخيرة
              </h3>
              
              {financeLoading ? (
                <div className="py-10 text-center text-gray-400">جاري تحميل المعاملات...</div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-10">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                  <p className="text-gray-400 text-sm font-medium">لا توجد دفعات مسجلة حالياً</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.slice(0, 10).map((t, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white hover:shadow-md transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {t.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{t.description || 'دفعة علاج'}</p>
                          <p className="text-[10px] text-gray-500 font-medium">{formatDate(t.date)}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className={`font-black ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()} د.ع
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{t.paymentMethod === 'cash' ? 'نقدي' : 'دفع إلكتروني'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <div className="bg-amber-50 border border-amber-100 rounded-[2rem] p-6 flex gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
                <Info className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h4 className="font-bold text-amber-900 mb-1">توضيح مالي</h4>
                <p className="text-xs text-amber-700 leading-relaxed">
                  يتم احتساب إجمالي التكلفة بناءً على الخطط العلاجية المتفق عليها مع الطبيب. في حال وجود فروقات في المبالغ، يرجى مراجعة إدارة العيادة لتسوية السجلات.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Quick Action Button for Appointment */}
      <div className="fixed bottom-6 left-6 right-6 z-50 lg:hidden">
        <button 
          onClick={() => navigate(`/booking?clinic=${patient?.clinic_id}`)}
          className="w-full max-w-sm mx-auto flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-black rounded-3xl shadow-2xl shadow-teal-500/40 transform active:scale-95 transition-all"
        >
          <Calendar className="w-5 h-5" />
          حجز موعد متابعة
        </button>
      </div>
    </div>
  );
};
