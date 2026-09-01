import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Receipt,
  UserCheck,
  Search,
  Plus,
  RefreshCw,
  Eye,
  Trash2,
  Calendar,
  CheckCircle,
  FileText,
  DollarSign,
  Users,
  Printer,
  Activity,
  AlertCircle,
  ArrowDownRight
} from 'lucide-react';
import { Card } from '../../../../../components/common/Card';
import { Button } from '../../../../../components/common/Button';
import { BentoStatCard } from '../../../../../components/dashboard/BentoStatCard';
import { supabase } from '../../../../../lib/supabase';

interface IncomeSectionProps {
  clinicId: string;
  transactions: any[];
  staff: any[];
  refresh: () => void;
  onOpenNewIncomeModal: () => void;
  onOpenTransactionDetails: (transaction: any) => void;
  onDeleteTransaction: (id: string) => void;
  onOpenPatientAccount: (patientId: string) => void;
  onPayInstallment: (receivableItem: any) => void;
  onPrintTransaction?: (transaction: any) => void;
  onPrintTreatmentPlan?: (plan: any, patient: any) => void;
}

export const IncomeSection: React.FC<IncomeSectionProps> = ({
  clinicId,
  transactions,
  staff,
  refresh,
  onOpenNewIncomeModal,
  onOpenTransactionDetails,
  onDeleteTransaction,
  onOpenPatientAccount,
  onPayInstallment,
  onPrintTransaction,
  onPrintTreatmentPlan
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'ledger' | 'receivables' | 'patients'>('ledger');

  // --- SubTab 1: Ledger State ---
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerCategoryFilter, setLedgerCategoryFilter] = useState('');

  // --- SubTab 2: Receivables State ---
  const [receivables, setReceivables] = useState<any[]>([]);
  const [loadingReceivables, setLoadingReceivables] = useState(false);
  const [receivablesSearch, setReceivablesSearch] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');

  // --- SubTab 3: Patients Account State ---
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [patientsSearch, setPatientsSearch] = useState('');

  // Fetch Receivables
  useEffect(() => {
    if (!clinicId) return;
    setLoadingReceivables(true);
    supabase
      .from('tooth_treatment_plans')
      .select(`
        *,
        patients!inner(clinic_id, full_name, phone)
      `)
      .eq('patients.clinic_id', clinicId)
      .then(({ data, error }) => {
        if (!error && data) {
          const list = data.map(p => {
            const cost = Number(p.estimated_cost) || 0;
            const paid = Number(p.paid) || 0;
            const remaining = Math.max(0, cost - paid);
            return {
              ...p,
              patientName: p.patients?.full_name || 'مراجع غير معروف',
              patientPhone: p.patients?.phone || '',
              remaining
            };
          });
          setReceivables(list);
        } else {
          console.error('Error fetching receivables:', error);
          setReceivables([]);
        }
        setLoadingReceivables(false);
      });
  }, [clinicId]);

  // Fetch Patients Financial Summary
  useEffect(() => {
    if (!clinicId) return;
    setLoadingPatients(true);

    const loadPatientsFinancials = async () => {
      try {
        // Fetch Patients
        const { data: pts, error: ptsErr } = await supabase
          .from('patients')
          .select('id, full_name, phone, age, gender, created_at')
          .eq('clinic_id', clinicId)
          .order('created_at', { ascending: false });

        if (ptsErr) throw ptsErr;

        // Fetch All Treatment Plans for clinic
        const { data: plans } = await supabase
          .from('tooth_treatment_plans')
          .select('patient_id, estimated_cost, paid')
          .in('patient_id', (pts || []).map(p => p.id));

        // Fetch All Financial Transactions for clinic
        const { data: txs } = await supabase
          .from('financial_transactions')
          .select('patient_id, amount, type')
          .eq('clinic_id', clinicId);

        // Fetch Lab Orders (expenses)
        const { data: labs } = await supabase
          .from('lab_orders')
          .select('patient_id, cost, price')
          .eq('clinic_id', clinicId);

        const summaries = (pts || []).map(p => {
          const patientPlans = (plans || []).filter(pl => pl.patient_id === p.id);
          const totalCost = patientPlans.reduce((sum, pl) => sum + (Number(pl.estimated_cost) || 0), 0);
          
          const patientTxs = (txs || []).filter(t => t.patient_id === p.id);
          const totalPaid = patientTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
          const directExpenses = patientTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
          
          const patientLabs = (labs || []).filter(l => l.patient_id === p.id);
          const labExpenses = patientLabs.reduce((sum, l) => sum + (Number(l.cost || l.price || 0)), 0);

          const totalExpenses = directExpenses + labExpenses;
          const remainingDebt = Math.max(0, totalCost - totalPaid);

          return {
            ...p,
            totalCost,
            totalPaid,
            totalExpenses,
            remainingDebt,
            activePlansCount: patientPlans.length
          };
        });

        setPatientsList(summaries);
      } catch (e) {
        console.error('Error loading patients financial summary:', e);
      } finally {
        setLoadingPatients(false);
      }
    };

    loadPatientsFinancials();
  }, [clinicId, transactions]);

  // Doctor display name helper
  const getDoctorDisplayName = (doctorVal: string) => {
    if (!doctorVal) return 'غير محدد';
    const cleanVal = doctorVal.trim().toLowerCase();
    const doc = staff.find(s =>
      s.email?.toLowerCase() === cleanVal ||
      s.name?.toLowerCase() === cleanVal ||
      s.id?.toString() === cleanVal
    );
    if (doc) return `د. ${doc.name.replace(/^د\.\s*/, '')}`;
    return `د. ${doctorVal.replace(/^د\.\s*/, '')}`;
  };

  // --- Filtered Data ---
  const incomeTransactions = transactions.filter(t => t.type === 'income');
  const filteredLedger = incomeTransactions.filter(t => {
    const matchSearch =
      (t.description && t.description.toLowerCase().includes(ledgerSearch.toLowerCase())) ||
      (t.relatedPerson && t.relatedPerson.toLowerCase().includes(ledgerSearch.toLowerCase())) ||
      (t.id && t.id.toLowerCase().includes(ledgerSearch.toLowerCase()));
    const matchCat = ledgerCategoryFilter ? t.category === ledgerCategoryFilter : true;
    return matchSearch && matchCat;
  });

  const filteredReceivables = receivables.filter(r => {
    const matchSearch =
      r.patientName.toLowerCase().includes(receivablesSearch.toLowerCase()) ||
      (r.treatment_description && r.treatment_description.toLowerCase().includes(receivablesSearch.toLowerCase()));
    const matchDoctor = doctorFilter ? r.assigned_doctor === doctorFilter : true;
    return matchSearch && matchDoctor;
  });

  const filteredPatients = patientsList.filter(p => {
    return (
      p.full_name?.toLowerCase().includes(patientsSearch.toLowerCase()) ||
      p.phone?.includes(patientsSearch) ||
      p.id?.toString().includes(patientsSearch)
    );
  });

  const totalOutstanding = receivables.reduce((sum, r) => sum + r.remaining, 0);
  const totalSettled = receivables.reduce((sum, r) => sum + (r.paid || 0), 0);
  const activePlansCount = receivables.filter(r => r.remaining > 0).length;

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500" dir="rtl">
      {/* Top 3 Sub-Tabs Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-2 sm:p-3 rounded-2xl border border-gray-100 shadow-xs">
        <div className="flex bg-gray-100/80 p-1 rounded-xl w-full sm:w-auto gap-1">
          <button
            onClick={() => setActiveSubTab('ledger')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSubTab === 'ledger'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>سجل الإيرادات المتكامل</span>
          </button>

          <button
            onClick={() => setActiveSubTab('receivables')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSubTab === 'receivables'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Receipt className="w-4 h-4 text-blue-600" />
            <span>إيرادات العلاج والأقساط</span>
          </button>

          <button
            onClick={() => setActiveSubTab('patients')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSubTab === 'patients'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-4 h-4 text-indigo-600" />
            <span>كشف حسابات المراجعين</span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            className="p-2 sm:px-3 sm:py-2 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">تحديث</span>
          </Button>

          <Button
            size="sm"
            onClick={onOpenNewIncomeModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 sm:px-3 sm:py-2 flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-200"
          >
            <Plus className="w-4 h-4" />
            <span>إيراد يدوي جديد</span>
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: INTEGRATED REVENUE LEDGER */}
      {/* ========================================================================= */}
      {activeSubTab === 'ledger' && (
        <Card className="rounded-2xl border-gray-100/80 shadow-xs overflow-hidden">
          {/* Header Filters */}
          <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="بحث برقم الوصل، المراجع، أو البيان..."
                className="w-full pr-10 pl-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500/20 bg-white"
                value={ledgerSearch}
                onChange={e => setLedgerSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                className="w-full sm:w-auto border border-gray-200 rounded-xl px-3 py-2 text-right bg-white text-xs sm:text-sm font-medium text-gray-700"
                value={ledgerCategoryFilter}
                onChange={e => setLedgerCategoryFilter(e.target.value)}
              >
                <option value="">كل التصنيفات</option>
                <option value="treatment">علاج أسنان</option>
                <option value="consultation">كشفية / استشارة</option>
                <option value="other">أخرى</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                <tr>
                  <th className="px-5 py-4">رقم الوصل / التاريخ</th>
                  <th className="px-5 py-4">المراجع / المريض</th>
                  <th className="px-5 py-4">البيان والتصنيف</th>
                  <th className="px-5 py-4">المبلغ المستلم</th>
                  <th className="px-5 py-4">المستلم (الموظف)</th>
                  <th className="px-5 py-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <TrendingUp className="w-10 h-10 stroke-1 opacity-30 text-emerald-500" />
                        <p className="font-medium">لا توجد إيرادات مطابقة للبحث</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLedger.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50/70 transition-colors group">
                      <td className="px-5 py-4">
                        <span className="bg-gray-100 px-2 py-1 rounded-md text-xs font-bold text-gray-700 inline-block">
                          #{t.id.slice(-6)}
                        </span>
                        <div className="text-xs text-gray-400 mt-1">
                          <span>{t.date.split('T')[0]}</span>
                          <span className="mr-1.5">{t.date.split('T')[1]?.slice(0, 5)}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {t.relatedPerson ? (
                          <div>
                            <span className="block font-bold text-gray-900">{t.relatedPerson}</span>
                            {t.doctorName && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium inline-block mt-1">
                                {getDoctorDisplayName(t.doctorName)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500 italic">إيراد عام</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-medium text-gray-800">{t.description || '-'}</div>
                        <div className="mt-1">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold">
                            {t.category === 'treatment' ? 'علاج أسنان' : t.category === 'consultation' ? 'كشفية' : t.category}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 font-bold text-emerald-600 text-base sm:text-lg">
                        +{t.amount.toLocaleString()}
                        <span className="text-xs text-gray-400 mr-1 font-normal">د.ع</span>
                      </td>

                      <td className="px-5 py-4 text-xs text-gray-600">
                        {t.recorderName ? (
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                            <span>{t.recorderName}</span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {onPrintTransaction && (
                            <button
                              onClick={() => onPrintTransaction(t)}
                              className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="طباعة وصل الإيراد"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => onOpenTransactionDetails(t)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {!t.id.startsWith('apt-') && (
                            <button
                              onClick={() => onDeleteTransaction(t.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
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
        </Card>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: TREATMENT RECEIVABLES & INSTALLMENTS */}
      {/* ========================================================================= */}
      {activeSubTab === 'receivables' && (
        <div className="space-y-6">
          {/* Receivables Bento Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <BentoStatCard
              title="إجمالي الرصيد المستحق"
              value={`${totalOutstanding.toLocaleString()} د.ع`}
              icon={TrendingUp}
              color="red"
              trend="up"
              trendValue="من كافة الخطط"
              delay={100}
            />
            <BentoStatCard
              title="إجمالي السداد والتحصيل"
              value={`${totalSettled.toLocaleString()} د.ع`}
              icon={CheckCircle}
              color="emerald"
              trend="up"
              trendValue="المسدد فعلياً"
              delay={200}
            />
            <BentoStatCard
              title="الخطط النشطة المستحقة"
              value={activePlansCount}
              icon={FileText}
              color="blue"
              trend="neutral"
              trendValue="خطة علاجية"
              delay={300}
            />
            <BentoStatCard
              title="إجمالي الخطط"
              value={receivables.length}
              icon={Receipt}
              color="purple"
              trend="neutral"
              trendValue="خطة مسجلة"
              delay={400}
            />
          </div>

          <Card className="rounded-2xl border-gray-100/80 shadow-xs overflow-hidden">
            {/* Filters */}
            <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row gap-3 bg-gray-50/50">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="بحث باسم المراجع أو الإجراء..."
                  className="w-full pr-10 pl-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500/20 bg-white"
                  value={receivablesSearch}
                  onChange={e => setReceivablesSearch(e.target.value)}
                />
              </div>

              <div className="relative min-w-[200px]">
                <select
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-right bg-white text-sm"
                  value={doctorFilter}
                  onChange={e => setDoctorFilter(e.target.value)}
                >
                  <option value="">كل الأطباء المعالجين</option>
                  {Array.from(new Set(receivables.map(r => r.assigned_doctor).filter(Boolean))).map((docVal: any) => (
                    <option key={docVal} value={docVal}>
                      {getDoctorDisplayName(docVal)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs sm:text-sm">
                <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-4">المراجع / الطبيب</th>
                    <th className="px-5 py-4">السن</th>
                    <th className="px-5 py-4">العلاج</th>
                    <th className="px-5 py-4 w-1/4">حالة الدفع (الجلسات)</th>
                    <th className="px-5 py-4">الرصيد المستحق</th>
                    <th className="px-5 py-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingReceivables ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-400">
                        جاري تحميل إيرادات العلاج والأرصدة المستحقة...
                      </td>
                    </tr>
                  ) : filteredReceivables.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-400">
                        لا توجد أرصدة مستحقة مطابقة للبحث
                      </td>
                    </tr>
                  ) : (
                    filteredReceivables.map(r => {
                      const totalSessions = r.session_count || 1;
                      const paid = Number(r.paid) || 0;
                      const cost = Number(r.estimated_cost) || 0;
                      const paidRatio = cost > 0 ? Math.min(1, paid / cost) : 0;
                      const paidSegments = Math.floor(paidRatio * totalSessions);

                      return (
                        <tr key={r.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="px-5 py-4">
                            <div className="font-bold text-gray-900">{r.patientName}</div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              الطبيب: {getDoctorDisplayName(r.assigned_doctor)}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-bold">
                              {r.tooth_numbers?.join(', ') || r.tooth_number || 'عام'}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-gray-700 font-medium">
                            {r.treatment_description || 'خطة علاجية'}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex gap-1 h-3 w-full max-w-[160px]">
                              {Array.from({ length: totalSessions }).map((_, idx) => {
                                const isPaid = idx < paidSegments;
                                return (
                                  <div
                                    key={idx}
                                    className={`h-full flex-1 rounded-sm transition-all ${
                                      isPaid ? 'bg-green-500' : 'bg-red-200'
                                    }`}
                                    title={isPaid ? 'مدفوع' : 'غير مدفوع'}
                                  />
                                );
                              })}
                            </div>
                            <div className="text-[11px] text-gray-500 mt-1.5 flex justify-between w-full max-w-[160px]">
                              <span>{totalSessions === 1 ? 'جلسة واحدة' : `${totalSessions} دفعات`}</span>
                              <span className="font-semibold text-gray-700">{Math.round(paidRatio * 100)}%</span>
                            </div>
                          </td>

                          <td className="px-5 py-4 font-bold text-red-600 text-base">
                            {r.remaining.toLocaleString()} د.ع
                            <span className="text-[10px] text-gray-400 font-normal block">
                              من أصل {cost.toLocaleString()}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {onPrintTreatmentPlan && (
                                <button
                                  onClick={() => onPrintTreatmentPlan(r, { full_name: r.patientName, phone: r.patientPhone })}
                                  className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                  title="طباعة خطة العلاج والأقساط"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                              )}
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 py-1.5 px-3 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                disabled={r.remaining <= 0}
                                onClick={() => onPayInstallment(r)}
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>سداد دفعة</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: PATIENT ACCOUNTS STATEMENTS LIST */}
      {/* ========================================================================= */}
      {activeSubTab === 'patients' && (
        <Card className="rounded-2xl border-gray-100/80 shadow-xs overflow-hidden">
          {/* Header & Search */}
          <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="بحث باسم المراجع، رقم الهاتف، أو الملف..."
                className="w-full pr-10 pl-4 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500/20 bg-white"
                value={patientsSearch}
                onChange={e => setPatientsSearch(e.target.value)}
              />
            </div>
            <span className="text-xs text-gray-500 font-medium">
              إجمالي المراجعين: {patientsList.length}
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                <tr>
                  <th className="px-5 py-4">المراجع / رقم الملف</th>
                  <th className="px-5 py-4">رقم الهاتف</th>
                  <th className="px-5 py-4">إجمالي تكلفة العلاج</th>
                  <th className="px-5 py-4">إجمالي الإيرادات (المسدد)</th>
                  <th className="px-5 py-4">الصرفيات (المعمل)</th>
                  <th className="px-5 py-4">الرصيد المتبقي (الديون)</th>
                  <th className="px-5 py-4 text-center">كشف الحساب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingPatients ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-gray-400">
                      جاري تحميل كشوفات حسابات المراجعين...
                    </td>
                  </tr>
                ) : filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-gray-400">
                      لا يوجد مراجعين مطابقين للبحث
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map(p => (
                    <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="font-bold text-gray-900">{p.full_name}</div>
                        <span className="text-[11px] text-gray-400">ملف #{p.id}</span>
                      </td>

                      <td className="px-5 py-4 text-gray-600" dir="ltr">
                        {p.phone || '-'}
                      </td>

                      <td className="px-5 py-4 font-bold text-gray-800">
                        {p.totalCost.toLocaleString()} د.ع
                        <span className="block text-[10px] text-gray-400 font-normal">
                          {p.activePlansCount} خطة علاج
                        </span>
                      </td>

                      <td className="px-5 py-4 font-bold text-emerald-600">
                        {p.totalPaid.toLocaleString()} د.ع
                      </td>

                      <td className="px-5 py-4 font-bold text-purple-600">
                        {p.totalExpenses.toLocaleString()} د.ع
                      </td>

                      <td className="px-5 py-4">
                        <span className={`font-bold text-sm sm:text-base ${
                          p.remainingDebt > 0 ? 'text-red-600' : 'text-emerald-700'
                        }`}>
                          {p.remainingDebt.toLocaleString()} د.ع
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => onOpenPatientAccount(p.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white font-bold text-xs transition-all shadow-xs cursor-pointer group-hover:scale-105"
                          title="فتح كشف حساب المراجع الشامل"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>كشف الحساب</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
