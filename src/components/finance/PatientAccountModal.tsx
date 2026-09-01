import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  User,
  Phone,
  FileText,
  Eye,
  Printer,
  Plus,
  Receipt,
  Clock,
  Sparkles,
  ChevronLeft,
  X,
  Activity,
  Layers,
  FlaskConical,
  AlertCircle
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { BentoStatCard } from '../dashboard/BentoStatCard';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { formatCategoryName } from '../../lib/utils';

interface PatientAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
  clinicId: string;
  staffList?: any[];
  onOpenTransactionDetails?: (tx: any) => void;
  onPayInstallment?: (plan: any) => void;
  onPrintTransaction?: (tx: any) => void;
  onPrintTreatmentPlan?: (plan: any, patient: any) => void;
  onPrintFullStatement?: (data: { patient: any; plans: any[]; transactions: any[]; labOrders: any[] }) => void;
}

export const PatientAccountModal: React.FC<PatientAccountModalProps> = ({
  isOpen,
  onClose,
  patientId,
  clinicId,
  staffList = [],
  onOpenTransactionDetails,
  onPayInstallment,
  onPrintTransaction,
  onPrintTreatmentPlan,
  onPrintFullStatement
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'treatments' | 'expenses'>('overview');
  const [loading, setLoading] = useState(false);
  const [patient, setPatient] = useState<any>(null);
  const [treatmentPlans, setTreatmentPlans] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [labOrders, setLabOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen || !patientId || !clinicId) return;

    const fetchPatientFinancialData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Patient Basic Info
        const { data: pData, error: pError } = await supabase
          .from('patients')
          .select('*')
          .eq('id', patientId)
          .maybeSingle();

        if (pError) throw pError;
        setPatient(pData);

        // 2. Fetch Treatment Plans
        const { data: plansData, error: plansError } = await supabase
          .from('tooth_treatment_plans')
          .select('*')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false });

        if (plansError) console.error('Error fetching plans:', plansError);
        setTreatmentPlans(plansData || []);

        // 3. Fetch Financial Transactions (Income + Expenses related to patient)
        const { data: txData, error: txError } = await supabase
          .from('financial_transactions')
          .select(`
            *,
            staff_record:staff!fk_fin_staff_record(full_name),
            recorder_staff:staff!fk_fin_recorded_by_staff(full_name)
          `)
          .eq('patient_id', patientId)
          .order('transaction_date', { ascending: false });

        if (txError) console.error('Error fetching transactions:', txError);
        setTransactions(txData || []);

        // 4. Fetch Lab Orders related to patient (Expenses)
        const { data: labData, error: labError } = await supabase
          .from('lab_orders')
          .select('*')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false });

        if (labError) console.error('Error fetching lab orders:', labError);
        setLabOrders(labData || []);

      } catch (err: any) {
        console.error('Error loading patient finance modal:', err);
        toast.error('حدث خطأ أثناء تحميل بيانات كشف الحساب');
      } finally {
        setLoading(false);
      }
    };

    fetchPatientFinancialData();
  }, [isOpen, patientId, clinicId]);

  if (!isOpen) return null;

  // Financial calculations
  const totalTreatmentCost = treatmentPlans.reduce((sum, p) => sum + (Number(p.estimated_cost) || 0), 0);
  const totalPaidRevenue = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalPatientExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0) +
    labOrders.reduce((sum, l) => sum + (Number(l.cost || l.price || 0)), 0);

  const totalRemainingDue = Math.max(0, totalTreatmentCost - totalPaidRevenue);

  const handlePrintStatement = () => {
    if (onPrintFullStatement) {
      onPrintFullStatement({
        patient,
        plans: treatmentPlans,
        transactions,
        labOrders
      });
    } else {
      window.print();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="xl">
      <div className="space-y-6 text-right -mt-4" dir="rtl">
        {/* Header with Patient Profile Summary */}
        <div className="bg-gradient-to-l from-blue-700 via-indigo-700 to-indigo-900 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 text-white shadow-inner">
                <User className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold">{patient?.full_name || 'كشف حساب مراجع'}</h2>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 border border-white/20 font-bold">
                    #{patient?.id || patientId}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-blue-100 mt-1">
                  {patient?.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      <span dir="ltr">{patient.phone}</span>
                    </span>
                  )}
                  {patient?.age && <span>{patient.age} سنة</span>}
                  {patient?.gender && <span>{patient.gender === 'male' ? 'ذكر' : 'أنثى'}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintStatement}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة كشف الحساب</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Top 4 Bento Financial Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <BentoStatCard
            title="إجمالي تكلفة العلاج"
            value={`${totalTreatmentCost.toLocaleString()} د.ع`}
            icon={TrendingUp}
            color="blue"
            trend="neutral"
            trendValue={`${treatmentPlans.length} خطة علاج`}
            delay={100}
            compact={true}
          />
          <BentoStatCard
            title="إجمالي المسدد (الإيرادات)"
            value={`${totalPaidRevenue.toLocaleString()} د.ع`}
            icon={DollarSign}
            color="emerald"
            trend="up"
            trendValue="مدفوع فعلياً"
            delay={200}
            compact={true}
          />
          <BentoStatCard
            title="المتبقي المستحق (الديون)"
            value={`${totalRemainingDue.toLocaleString()} د.ع`}
            icon={TrendingDown}
            color="red"
            trend={totalRemainingDue > 0 ? 'down' : 'neutral'}
            trendValue={totalRemainingDue > 0 ? 'مستحق السداد' : 'خالص الذمة'}
            delay={300}
            compact={true}
          />
          <BentoStatCard
            title="المصروفات والتكاليف"
            value={`${totalPatientExpenses.toLocaleString()} د.ع`}
            icon={Activity}
            color="purple"
            trend="neutral"
            trendValue={`${labOrders.length} طلبات معمل`}
            delay={400}
            compact={true}
          />
        </div>

        {/* Modal Internal Sub-Tabs Navigation */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div className="flex bg-gray-100/80 p-1 rounded-xl gap-1">
            <button
              onClick={() => setActiveSubTab('overview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeSubTab === 'overview'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Receipt className={`w-4 h-4 ${activeSubTab === 'overview' ? 'text-indigo-600' : 'text-gray-400'}`} />
              <span>نظرة عامة والمعاملات</span>
            </button>
            <button
              onClick={() => setActiveSubTab('treatments')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeSubTab === 'treatments'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Activity className={`w-4 h-4 ${activeSubTab === 'treatments' ? 'text-indigo-600' : 'text-gray-400'}`} />
              <span>إيرادات وخطط العلاج ({treatmentPlans.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('expenses')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeSubTab === 'expenses'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FlaskConical className={`w-4 h-4 ${activeSubTab === 'expenses' ? 'text-indigo-600' : 'text-gray-400'}`} />
              <span>الصرفيات والمعمل ({labOrders.length})</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Overview & Transaction History */}
        {activeSubTab === 'overview' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="p-4 bg-gray-50/60 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-indigo-600" />
                  سجل الحركات المالية للمراجع
                </h3>
                <span className="text-xs text-gray-500 font-medium">
                  {transactions.length} معاملة مسجلة
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs sm:text-sm">
                  <thead className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3">رقم الوصل / التاريخ</th>
                      <th className="px-4 py-3">نوع الحركة</th>
                      <th className="px-4 py-3">التفاصيل والبيان</th>
                      <th className="px-4 py-3">المبلغ</th>
                      <th className="px-4 py-3">المستلم</th>
                      <th className="px-4 py-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-gray-400">
                          جاري تحميل الحركات المالية...
                        </td>
                      </tr>
                    ) : transactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-gray-400">
                          لا توجد معاملات مسجلة لهذا المراجع حتى الآن
                        </td>
                      </tr>
                    ) : (
                      transactions.map(t => (
                        <tr key={t.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                              #{t.id.slice(-6)}
                            </span>
                            <div className="text-[11px] text-gray-400 mt-0.5">
                              {t.transaction_date || t.created_at?.split('T')[0]}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${
                              t.type === 'income'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : 'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}>
                              {t.type === 'income' ? 'إيراد / دفعة' : 'صرف / تكلفة'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{t.description || '-'}</div>
                            <div className="text-[11px] text-gray-400 mt-0.5">
                              التصنيف: {formatCategoryName(t.category, t.type)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-bold text-sm sm:text-base ${
                              t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              {t.type === 'income' ? '+' : '-'}{Number(t.amount).toLocaleString()} د.ع
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {t.recorder_staff?.full_name || t.recorded_by_name || '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center">
                              {onPrintTransaction && (
                                <button
                                  onClick={() => onPrintTransaction({
                                    ...t,
                                    date: t.transaction_date || t.date || t.created_at,
                                    patientId: patient?.id || patientId,
                                    patientName: patient?.full_name,
                                    patientPhone: patient?.phone,
                                    clinicId: clinicId,
                                    doctorName: t.staff_record?.full_name || t.doctor_name,
                                    recorderName: t.recorder_staff?.full_name || t.recorded_by_name
                                  })}
                                  className="px-2.5 py-1 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-indigo-200/60"
                                  title="طباعة وصل المعاملة"
                                >
                                  <Printer className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>طباعة الوصل</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Treatment Plans & Receivables */}
        {activeSubTab === 'treatments' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="p-4 bg-gray-50/60 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  الخطط العلاجية وتفاصيل الأقساط والجلسات
                </h3>
              </div>

              <div className="divide-y divide-gray-100">
                {treatmentPlans.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    لا توجد خطط علاجية مسجلة لهذا المراجع
                  </div>
                ) : (
                  treatmentPlans.map(plan => {
                    const totalSessions = plan.session_count || 1;
                    const paid = Number(plan.paid) || 0;
                    const cost = Number(plan.estimated_cost) || 0;
                    const remaining = Math.max(0, cost - paid);
                    const paidRatio = cost > 0 ? Math.min(1, paid / cost) : 0;
                    const paidSegments = Math.floor(paidRatio * totalSessions);

                    return (
                      <div key={plan.id} className="p-4 sm:p-5 hover:bg-gray-50/50 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold">
                                سن: {plan.tooth_numbers?.join(', ') || plan.tooth_number || 'عام'}
                              </span>
                              <h4 className="font-bold text-gray-900 text-sm sm:text-base">
                                {plan.treatment_description || plan.treatment_name || 'خطة علاجية'}
                              </h4>
                            </div>
                            <p className="text-xs text-gray-500">
                              تاريخ الإنشاء: {plan.created_at?.split('T')[0]} | الطبيب: {plan.assigned_doctor || 'العيادة'}
                            </p>

                            {/* Progress bar segmented for sessions */}
                            <div className="pt-2 max-w-md">
                              <div className="flex gap-1 h-3.5 w-full">
                                {Array.from({ length: totalSessions }).map((_, idx) => {
                                  const isPaid = idx < paidSegments;
                                  return (
                                    <div
                                      key={idx}
                                      className={`h-full flex-1 rounded-sm transition-all ${
                                        isPaid ? 'bg-green-500' : 'bg-red-200'
                                      }`}
                                      title={isPaid ? 'دفعة مسددة' : 'دفعة متبقية'}
                                    />
                                  );
                                })}
                              </div>
                              <div className="flex justify-between items-center text-[11px] text-gray-500 mt-1.5 font-medium">
                                <span>{totalSessions === 1 ? 'جلسة واحدة' : `${totalSessions} جلسات/دفعات`}</span>
                                <span className="font-semibold text-gray-700">نسبة السداد: {Math.round(paidRatio * 100)}%</span>
                              </div>
                            </div>
                          </div>

                          {/* Financial numbers & action */}
                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100">
                            <div className="text-right">
                              <div className="text-xs text-gray-400">التكلفة: {cost.toLocaleString()} د.ع</div>
                              <div className="text-xs text-emerald-600 font-medium">المدفوع: {paid.toLocaleString()} د.ع</div>
                              <div className="text-sm font-bold text-red-600">
                                المتبقي: {remaining.toLocaleString()} د.ع
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {onPrintTreatmentPlan && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onPrintTreatmentPlan(plan, patient)}
                                  className="text-xs px-2.5 py-1.5 border-gray-200 text-gray-700 hover:bg-gray-100 flex items-center gap-1 cursor-pointer"
                                  title="طباعة خطة العلاج والأقساط"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>طباعة الخطة</span>
                                </Button>
                              )}
                              {onPayInstallment && remaining > 0 && (
                                <Button
                                  size="sm"
                                  onClick={() => onPayInstallment(plan)}
                                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 flex items-center gap-1 cursor-pointer shadow-xs"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>سداد دفعة</span>
                                </Button>
                              )}
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
        )}

        {/* Tab 3: Patient Specific Expenses (Lab Orders & Materials) */}
        {activeSubTab === 'expenses' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="p-4 bg-gray-50/60 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600" />
                  الصرفيات المرتبطة بالمراجع (أعمال معمل الأسنان)
                </h3>
                <span className="text-xs text-purple-700 font-bold bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
                  إجمالي التكاليف: {totalPatientExpenses.toLocaleString()} د.ع
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs sm:text-sm">
                  <thead className="bg-gray-50/80 text-gray-500 font-semibold border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3">رقم الطلب / التاريخ</th>
                      <th className="px-4 py-3">المعمل / المختبر</th>
                      <th className="px-4 py-3">نوع العمل والتفاصيل</th>
                      <th className="px-4 py-3">التكلفة</th>
                      <th className="px-4 py-3">حالة الطلب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {labOrders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-gray-400">
                          لا توجد طلبات معمل أو صرفيات مخصصة لهذا المراجع
                        </td>
                      </tr>
                    ) : (
                      labOrders.map(l => (
                        <tr key={l.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3 text-xs text-gray-600">
                            #{l.id?.slice(-6) || l.order_number || '-'}
                            <div className="text-[11px] text-gray-400">
                              {l.created_at?.split('T')[0]}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-900">
                            {l.lab_name || l.laboratory_name || 'معمل الأسنان'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-800">{l.work_type || l.service_name || 'تركيبات / زرعات'}</div>
                            {l.teeth_numbers && (
                              <div className="text-[11px] text-gray-400">الأسنان: {l.teeth_numbers}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 font-bold text-purple-700">
                            {(Number(l.cost || l.price || 0)).toLocaleString()} د.ع
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                              l.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700'
                                : l.status === 'in_progress'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {l.status === 'completed' ? 'مكتمل' : l.status === 'in_progress' ? 'قيد العمل' : l.status || 'مسجل'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="px-5 cursor-pointer">
            إغلاق
          </Button>
        </div>
      </div>
    </Modal>
  );
};
