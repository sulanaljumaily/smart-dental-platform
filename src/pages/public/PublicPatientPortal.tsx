import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  HeartPulse,
  Calendar,
  Activity,
  DollarSign,
  User,
  Phone,
  Clock,
  CheckCircle2,
  Receipt,
  TrendingUp,
  TrendingDown,
  Building2,
  ShieldCheck,
  MapPin,
  Smile,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/common/Card';
import { BentoStatCard } from '../../components/dashboard/BentoStatCard';

export const PublicPatientPortal: React.FC = () => {
  const { clinicId, patientId } = useParams<{ clinicId: string; patientId: string }>();

  const [patient, setPatient] = useState<any>(null);
  const [clinic, setClinic] = useState<any>(null);
  const [treatmentPlans, setTreatmentPlans] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'treatments' | 'finance'>('overview');

  useEffect(() => {
    if (!clinicId || !patientId) return;

    const fetchPortalData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Patient Info
        const { data: pData } = await supabase
          .from('patients')
          .select('*')
          .eq('id', patientId)
          .maybeSingle();

        setPatient(pData);

        // 2. Fetch Clinic Info
        const { data: cData } = await supabase
          .from('clinics')
          .select('*')
          .eq('id', clinicId)
          .maybeSingle();

        setClinic(cData);

        // 3. Fetch Treatment Plans
        const { data: plansData } = await supabase
          .from('tooth_treatment_plans')
          .select('*')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false });

        setTreatmentPlans(plansData || []);

        // 4. Fetch Financial Transactions (Income)
        const { data: txData } = await supabase
          .from('financial_transactions')
          .select('*')
          .eq('patient_id', patientId)
          .eq('type', 'income')
          .order('transaction_date', { ascending: false });

        setTransactions(txData || []);

        // 5. Fetch Appointments
        const { data: aptData } = await supabase
          .from('appointments')
          .select('*')
          .eq('patient_id', patientId)
          .order('appointment_date', { ascending: false });

        setAppointments(aptData || []);

      } catch (err) {
        console.error('Error fetching public patient portal:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPortalData();
  }, [clinicId, patientId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50" dir="rtl">
        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-gray-500 mt-4 font-bold text-sm">جاري تحميل بوابتك الطبية...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-8 text-center min-h-screen flex flex-col items-center justify-center bg-slate-50" dir="rtl">
        <div className="w-16 h-16 rounded-3xl bg-red-50 text-red-500 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">الملف غير متاح</h2>
        <p className="text-gray-500 max-w-sm mx-auto mt-2 text-sm leading-relaxed">
          تعذر العثور على سجل المراجع المطلوب. يرجى التأكد من مسح الرمز المباشر من الوصل الصادر عن العيادة.
        </p>
      </div>
    );
  }

  const totalCost = treatmentPlans.reduce((sum, p) => sum + (Number(p.estimated_cost) || 0), 0);
  const totalPaid = transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const remaining = Math.max(0, totalCost - totalPaid);

  return (
    <div className="min-h-screen bg-slate-50 pb-16 font-sans text-slate-800" dir="rtl">
      {/* Top Clinic Branding Bar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shadow-blue-200">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm sm:text-base text-gray-900">{clinic?.name || 'العيادة التخصصية'}</h1>
              <p className="text-[11px] text-gray-400">بوابة المراجع الإلكترونية الذكية</p>
            </div>
          </div>

          {clinic?.phone && (
            <a
              href={`tel:${clinic.phone}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">اتصال بالعيادة</span>
            </a>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* Patient Profile Card */}
        <div className="bg-gradient-to-l from-blue-700 via-indigo-700 to-indigo-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 text-white shadow-inner">
                <Smile className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black">{patient.full_name}</h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/20 border border-white/20 font-mono">
                    #{patient.id}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-blue-100 mt-1">
                  {patient.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      <span dir="ltr">{patient.phone}</span>
                    </span>
                  )}
                  {patient.age && <span>{patient.age} سنة</span>}
                  {patient.gender && <span>{patient.gender === 'male' ? 'ذكر' : 'أنثى'}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold backdrop-blur-sm self-end sm:self-center">
              <ShieldCheck className="w-4 h-4" />
              <span>ملف موثق ومحدث</span>
            </div>
          </div>
        </div>

        {/* 3 Top Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <BentoStatCard
            title="إجمالي تكلفة العلاج"
            value={`${totalCost.toLocaleString()} د.ع`}
            icon={TrendingUp}
            color="blue"
            trend="neutral"
            trendValue={`${treatmentPlans.length} خطة علاج`}
            delay={100}
          />
          <BentoStatCard
            title="إجمالي المسدد"
            value={`${totalPaid.toLocaleString()} د.ع`}
            icon={DollarSign}
            color="emerald"
            trend="up"
            trendValue="المدفوع للعيادة"
            delay={200}
          />
          <BentoStatCard
            title="الرصيد المتبقي المستحق"
            value={`${remaining.toLocaleString()} د.ع`}
            icon={TrendingDown}
            color="red"
            trend={remaining > 0 ? 'down' : 'neutral'}
            trendValue={remaining > 0 ? 'مستحق السداد' : 'خالص الذمة'}
            delay={300}
          />
        </div>

        {/* Portal Tabs Bar */}
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>نظرة عامة</span>
          </button>

          <button
            onClick={() => setActiveTab('treatments')}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'treatments'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            <span>الخطط العلاجية ({treatmentPlans.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('finance')}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'finance'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>السجل المالي ({transactions.length})</span>
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Appointments Card */}
            <Card className="p-5 rounded-2xl border-slate-200/80">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <span>المواعيد والزيارات</span>
                </h3>
                <span className="text-xs text-gray-400">{appointments.length} زيارة مسجلة</span>
              </div>

              {appointments.length === 0 ? (
                <p className="text-center py-6 text-xs text-gray-400">لا توجد مواعيد سابقة مسجلة</p>
              ) : (
                <div className="space-y-2.5">
                  {appointments.slice(0, 3).map(apt => (
                    <div key={apt.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-xs sm:text-sm text-gray-900">{apt.reason || 'جلسة علاج أسنان'}</p>
                          <p className="text-[11px] text-gray-400">{apt.appointment_date} {apt.appointment_time ? `• ${apt.appointment_time}` : ''}</p>
                        </div>
                      </div>
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                        apt.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {apt.status === 'completed' ? 'مكتملة' : 'مؤكد'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Tab 2: Treatments */}
        {activeTab === 'treatments' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="space-y-3">
              {treatmentPlans.length === 0 ? (
                <Card className="p-8 text-center text-gray-400">
                  لا توجد خطط علاجية مسجلة حالياً
                </Card>
              ) : (
                treatmentPlans.map(plan => {
                  const totalSessions = plan.session_count || 1;
                  const paid = Number(plan.paid) || 0;
                  const cost = Number(plan.estimated_cost) || 0;
                  const remainingPlan = Math.max(0, cost - paid);
                  const paidRatio = cost > 0 ? Math.min(1, paid / cost) : 0;
                  const paidSegments = Math.floor(paidRatio * totalSessions);

                  return (
                    <Card key={plan.id} className="p-5 rounded-2xl border-slate-200/80">
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold">
                          سن: {plan.tooth_numbers?.join(', ') || plan.tooth_number || 'عام'}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">
                          {plan.created_at?.split('T')[0]}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-base text-gray-900 mb-2">
                        {plan.treatment_description || plan.treatment_name || 'خطة علاجية'}
                      </h4>

                      {/* Progress Bar */}
                      <div className="pt-2">
                        <div className="flex gap-1 h-3 w-full">
                          {Array.from({ length: totalSessions }).map((_, idx) => {
                            const isPaid = idx < paidSegments;
                            return (
                              <div
                                key={idx}
                                className={`h-full flex-1 rounded-sm transition-all ${
                                  isPaid ? 'bg-green-500' : 'bg-red-200'
                                }`}
                              />
                            );
                          })}
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-500 mt-2 font-medium">
                          <span>{totalSessions === 1 ? 'جلسة واحدة' : `${totalSessions} جلسات/دفعات`}</span>
                          <span>نسبة السداد: {Math.round(paidRatio * 100)}%</span>
                        </div>
                      </div>

                      {/* Amounts */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                        <span className="text-gray-500">التكلفة: {cost.toLocaleString()} د.ع</span>
                        <span className="font-bold text-emerald-600">المسدد: {paid.toLocaleString()} د.ع</span>
                        <span className="font-bold text-red-600">المتبقي: {remainingPlan.toLocaleString()} د.ع</span>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Financial History */}
        {activeTab === 'finance' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <Card className="rounded-2xl border-slate-200/80 overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>سجل الإيصالات والمدفوعات</span>
                </h3>
                <span className="text-xs text-gray-500 font-mono">{transactions.length} وصل مالي</span>
              </div>

              <div className="divide-y divide-slate-100">
                {transactions.length === 0 ? (
                  <p className="text-center py-10 text-xs text-gray-400">لا توجد دفعات مسجلة حتى الآن</p>
                ) : (
                  transactions.map(t => (
                    <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div>
                        <span className="font-mono text-xs font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                          #{t.id.slice(-6)}
                        </span>
                        <p className="font-bold text-sm text-gray-900 mt-1">{t.description || 'دفعة علاج'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{t.transaction_date || t.created_at?.split('T')[0]}</p>
                      </div>

                      <div className="text-left">
                        <span className="font-extrabold text-base text-emerald-600 font-mono block">
                          +{Number(t.amount).toLocaleString()} د.ع
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full inline-block mt-0.5">
                          وصل مقبوض
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};
