import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  DollarSign,
  FileText,
  Download,
  Activity,
  Filter,
  Sparkles,
  Award,
  Clock,
  HeartPulse,
  Percent,
  Printer,
  UserCheck,
  Stethoscope,
  CreditCard,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Phone,
  ArrowUpRight,
  ShieldAlert,
  Wallet
} from 'lucide-react';
import { Card } from '../../../components/common/Card';
import { BentoStatCard } from '../../../components/dashboard/BentoStatCard';
import { useClinicReports } from '../../../hooks/useClinicReports';
import { useCurrentClinic } from '../../../hooks/useCurrentClinic';
import { printExecutiveReport } from '../../../lib/printReceipt';
import { toast } from 'sonner';

interface ClinicReportsPageProps {
  clinicId: string;
}

export const ClinicReportsPage: React.FC<ClinicReportsPageProps> = ({ clinicId }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('month');
  const [selectedType, setSelectedType] = useState<string>('all');

  const { clinic: currentClinic } = useCurrentClinic();

  // Dynamic Period-Aware Data Hook
  const { stats, loading } = useClinicReports(clinicId, selectedPeriod);

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'week': return 'الأسبوع الحالي';
      case 'quarter': return 'الربع الحالي';
      case 'year': return 'العام الحالي';
      default: return 'الشهر الحالي';
    }
  };

  const getReportTypeLabel = () => {
    switch (selectedType) {
      case 'staff': return 'تقرير إنتاجية الأطباء والكادر';
      case 'procedures': return 'تقرير العلاجات والإجراءات الأكثر طلباً';
      case 'debts': return 'تقرير أعمار الديون والمستحقات المالية';
      case 'appointments': return 'تقرير كفاءة المواعيد ونسبة الحضور';
      default: return 'التقرير التنفيذي والإداري الشامل';
    }
  };

  const handlePrintPDF = () => {
    try {
      printExecutiveReport({
        clinic: currentClinic,
        stats,
        periodLabel: getPeriodLabel(),
        reportType: selectedType,
        reportTypeLabel: getReportTypeLabel()
      });
      toast.success('تم تجهيز التقرير التنفيذي للطباعة / الحفظ كـ PDF');
    } catch (err) {
      console.error('Print PDF failed:', err);
      toast.error('حدث خطأ أثناء إعداد التقرير للطباعة');
    }
  };

  const handleExportCSV = () => {
    try {
      const headers = ['المؤشر / البيان', 'القيمة', 'الفترة'];
      const rows: Array<[string, string, string]> = [
        ['اسم العيادة', currentClinic?.name || 'عيادة الأسنان', getPeriodLabel()],
        ['نوع التقرير', getReportTypeLabel(), getPeriodLabel()],
        ['إجمالي المرضى الفعليين', stats.totalPatients.toString(), 'حتى الآن'],
        ['إجمالي الإيرادات', `${stats.monthlyRevenue.toLocaleString()} د.ع`, getPeriodLabel()],
        ['إجمالي الصرفيات', `${stats.monthlyExpenses.toLocaleString()} د.ع`, getPeriodLabel()],
        ['صافي الأرباح', `${(stats.monthlyRevenue - stats.monthlyExpenses).toLocaleString()} د.ع`, getPeriodLabel()],
        ['هامش الربح', `${stats.profitMargin}%`, getPeriodLabel()],
        ['متوسط قيمة المراجع', `${stats.avgPatientValue.toLocaleString()} د.ع`, getPeriodLabel()],
        ['إجمالي الديون المعلقة', `${stats.debtStats.totalOutstanding.toLocaleString()} د.ع`, 'إجمالي'],
        ['معدل تحصيل الديون', `${stats.debtStats.collectionRate}%`, 'إجمالي'],
        ['نسبة حضور المواعيد', `${stats.appointmentStats.attendanceRate}%`, getPeriodLabel()]
      ];

      // Add doctor breakdown rows
      if (stats.staffStats && stats.staffStats.length > 0) {
        rows.push(['--- بيانات الأطباء ---', '---', '---']);
        stats.staffStats.forEach(doc => {
          rows.push([`طبيب: ${doc.name}`, `إيراد: ${doc.revenueGenerated.toLocaleString()} د.ع | مواعيد: ${doc.completedCount}`, getPeriodLabel()]);
        });
      }

      const csvContent = '\uFEFF' + [
        headers.join(','),
        ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `تقرير_${currentClinic?.name || 'العيادة'}_${selectedType}_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('تم تصدير ملف التقرير بنجاح (CSV)');
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('حدث خطأ أثناء تصدير التقرير');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-gray-500">جاري إعداد وتحليل التقارير التنفيذية...</p>
      </div>
    );
  }

  const revenueCardTitle = selectedPeriod === 'week' ? 'الإيرادات الأسبوعية'
    : selectedPeriod === 'quarter' ? 'إيرادات الربع'
    : selectedPeriod === 'year' ? 'الإيرادات السنوية'
    : 'الإيرادات الشهرية';

  const expensesCardTitle = selectedPeriod === 'week' ? 'المصروفات الأسبوعية'
    : selectedPeriod === 'quarter' ? 'مصروفات الربع'
    : selectedPeriod === 'year' ? 'المصروفات السنوية'
    : 'المصروفات الشهرية';

  return (
    <div className="space-y-5" dir="rtl">

      {/* 1. Header Control & Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-3 sm:px-4 sm:py-3 flex flex-wrap lg:flex-nowrap items-center justify-between gap-3">
        
        {/* Filters Group */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 flex-1 w-full lg:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold shrink-0">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>عرض التقرير:</span>
          </div>

          {/* Report Type Selector */}
          <div className="relative min-w-[170px] flex-1 sm:flex-initial">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="appearance-none w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold bg-gray-50/80 hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none cursor-pointer transition-all truncate"
            >
              <option value="all">📊 التقرير التنفيذي الشامل</option>
              <option value="staff">👨‍⚕️ إنتاجية الأطباء والكادر</option>
              <option value="procedures">🦷 العلاجات الأكثر طلباً وربحية</option>
              <option value="debts">💳 الديون المتأخرة والتحصيل</option>
              <option value="appointments">📅 كفاءة المواعيد ونسبة الحضور</option>
            </select>
          </div>

          {/* Period Selector */}
          <div className="relative min-w-[130px]">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="appearance-none w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold bg-gray-50/80 hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none cursor-pointer transition-all"
            >
              <option value="week">📅 هذا الأسبوع</option>
              <option value="month">📅 هذا الشهر</option>
              <option value="quarter">📅 هذا الربع (3 أشهر)</option>
              <option value="year">📅 هذا العام</option>
            </select>
          </div>
        </div>

        {/* Actions Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handlePrintPDF}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer active:scale-95 whitespace-nowrap"
            title="طباعة التقرير أو حفظه كـ PDF رسمي"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة PDF رسمي</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition-all border border-blue-200 shadow-xs cursor-pointer active:scale-95 whitespace-nowrap"
            title="تصدير جدول البيانات بتنسيق CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير CSV</span>
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: التقرير التنفيذي الشامل (ALL) */}
      {/* ========================================================================= */}
      {selectedType === 'all' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Top Bento Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <BentoStatCard
              title={revenueCardTitle}
              value={`${(stats.monthlyRevenue || 0).toLocaleString()} د.ع`}
              icon={DollarSign}
              color="green"
              trend="up"
              trendValue={getPeriodLabel()}
              delay={100}
              compact={true}
            />
            <BentoStatCard
              title="إجمالي المرضى"
              value={stats.totalPatients}
              icon={Users}
              color="blue"
              trend="neutral"
              trendValue="سجل نشط"
              delay={200}
              compact={true}
            />
            <BentoStatCard
              title="متوسط قيمة المراجع"
              value={`${(stats.avgPatientValue || 0).toLocaleString()} د.ع`}
              icon={DollarSign}
              color="purple"
              trend="neutral"
              trendValue={getPeriodLabel()}
              delay={300}
              compact={true}
            />
            <BentoStatCard
              title={expensesCardTitle}
              value={`${(stats.monthlyExpenses || 0).toLocaleString()} د.ع`}
              icon={TrendingDown}
              color="red"
              delay={400}
              compact={true}
            />
          </div>

          {/* Quick Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-xs flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-gray-400 block font-medium">صافي الأرباح</span>
                <span className={`text-xs font-bold ${stats.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {stats.netProfit.toLocaleString()} د.ع ({stats.profitMargin}%)
                </span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-xs flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-gray-400 block font-medium">كادر العيادة</span>
                <span className="text-xs font-bold text-gray-900">{stats.staffStats.length} أطباء وموظفين</span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-xs flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-gray-400 block font-medium">معدل التحصيل المالي</span>
                <span className="text-xs font-bold text-gray-900">{stats.debtStats.collectionRate}% من المستحقات</span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-xs flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-gray-400 block font-medium">نسبة حضور المواعيد</span>
                <span className="text-xs font-bold text-gray-900">{stats.appointmentStats.attendanceRate}% مكتمل</span>
              </div>
            </div>
          </div>

          {/* Visual Analytics & Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Appointment Types Distribution */}
            <Card className="rounded-2xl border-gray-100/80 shadow-xs">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                  <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    توزيع أنواع المواعيد والخدمات
                  </h2>
                  <span className="text-xs text-gray-400">{getPeriodLabel()}</span>
                </div>

                <div className="space-y-3.5">
                  {stats.appointmentTypes.length > 0 ? stats.appointmentTypes.map((type, index) => (
                    <div key={index} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-700">{type.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">{type.count} موعد</span>
                          <span className="font-bold text-gray-900">{type.percentage}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${type.color}`}
                          style={{ width: `${type.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center text-gray-400 py-10 text-xs">لا توجد مواعيد مسجلة لهذه الفترة</div>
                  )}
                </div>
              </div>
            </Card>

            {/* Monthly Revenue Trend */}
            <Card className="rounded-2xl border-gray-100/80 shadow-xs">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                  <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    مسار الإيرادات الشهرية (آخر 6 أشهر)
                  </h2>
                  <span className="text-xs text-gray-400">نمو تدريجي</span>
                </div>

                <div className="space-y-3.5">
                  {stats.monthlyTrend.map((data: any, index: number) => {
                    const maxRevenue = Math.max(...stats.monthlyTrend.map((d: any) => d.revenue || 0), 1);
                    const rawPercent = (data.revenue / maxRevenue) * 100;
                    const widthPercent = Math.min(100, Math.max(0, isNaN(rawPercent) ? 0 : rawPercent));
                    return (
                      <div key={index} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-gray-700">{data.month}</span>
                          <span className="font-bold text-emerald-700">
                            {data.revenue > 0 ? `${data.revenue.toLocaleString()} د.ع` : '0 د.ع'}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(widthPercent, data.revenue > 0 ? 4 : 0)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: تقرير إنتاجية الأطباء والكادر (STAFF) */}
      {/* ========================================================================= */}
      {selectedType === 'staff' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <BentoStatCard
              title="إجمالي إنتاجية الكادر"
              value={`${stats.staffStats.reduce((sum, s) => sum + s.revenueGenerated, 0).toLocaleString()} د.ع`}
              icon={DollarSign}
              color="green"
              delay={100}
              compact={true}
            />
            <BentoStatCard
              title="الكادر الطبي النشط"
              value={stats.staffStats.length}
              icon={Stethoscope}
              color="blue"
              delay={200}
              compact={true}
            />
            <BentoStatCard
              title="الجلسات المنجزة"
              value={stats.staffStats.reduce((sum, s) => sum + s.completedCount, 0)}
              icon={CheckCircle2}
              color="purple"
              delay={300}
              compact={true}
            />
            <BentoStatCard
              title="العمولات المستحقة"
              value={`${stats.staffStats.reduce((sum, s) => sum + s.commissionAmount, 0).toLocaleString()} د.ع`}
              icon={Wallet}
              color="orange"
              delay={400}
              compact={true}
            />
          </div>

          <Card className="rounded-2xl border-gray-100/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  جدول أداء وإنتاجية الأطباء والكادر الطبي
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">تتبع الإيرادات المحققة ونسب الإنجاز والعمولات ({getPeriodLabel()})</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-gray-50/80 text-gray-600 border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 font-semibold">الطبيب / الموظف</th>
                    <th className="px-5 py-3 font-semibold">الدور والتخصص</th>
                    <th className="px-5 py-3 font-semibold text-center">المواعيد والجلسات</th>
                    <th className="px-5 py-3 font-semibold text-center">نسبة الإنجاز</th>
                    <th className="px-5 py-3 font-semibold text-left">الإيراد المحقق</th>
                    <th className="px-5 py-3 font-semibold text-left">نسبة العمولة</th>
                    <th className="px-5 py-3 font-semibold text-left">العمولة المستحقة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.staffStats.map((staffMember) => (
                    <tr key={staffMember.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-gray-900 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                          {staffMember.name.slice(0, 1)}
                        </div>
                        <span>{staffMember.name}</span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">{staffMember.role}</td>
                      <td className="px-5 py-3.5 text-center font-medium">
                        <span className="text-emerald-700 font-bold">{staffMember.completedCount}</span>
                        <span className="text-gray-400"> / {staffMember.appointmentsCount}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-bold text-[11px]">
                          {staffMember.completionRate}%
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-left font-bold text-emerald-700">
                        {staffMember.revenueGenerated.toLocaleString()} د.ع
                      </td>
                      <td className="px-5 py-3.5 text-left font-medium text-gray-600">
                        {staffMember.commissionRate}%
                      </td>
                      <td className="px-5 py-3.5 text-left font-bold text-blue-700">
                        {staffMember.commissionAmount.toLocaleString()} د.ع
                      </td>
                    </tr>
                  ))}
                  {stats.staffStats.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-gray-400">
                        لا يوجد كادر مسجل حالياً
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: تقرير العلاجات والإجراءات الأكثر طلباً وربحية (PROCEDURES) */}
      {/* ========================================================================= */}
      {selectedType === 'procedures' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <BentoStatCard
              title="إجمالي الإجراءات"
              value={stats.procedureStats.reduce((sum, p) => sum + p.count, 0)}
              icon={Stethoscope}
              color="blue"
              delay={100}
              compact={true}
            />
            <BentoStatCard
              title="الإجراء الأكثر طلباً"
              value={stats.procedureStats[0]?.name?.slice(0, 14) || 'حشوات'}
              icon={Sparkles}
              color="purple"
              delay={200}
              compact={true}
            />
            <BentoStatCard
              title="إجمالي إيراد الإجراءات"
              value={`${stats.procedureStats.reduce((sum, p) => sum + p.totalRevenue, 0).toLocaleString()} د.ع`}
              icon={DollarSign}
              color="green"
              delay={300}
              compact={true}
            />
            <BentoStatCard
              title="متوسط سعر الجلسة"
              value={`${(stats.procedureStats.length > 0 
                ? Math.round(stats.procedureStats.reduce((sum, p) => sum + p.totalRevenue, 0) / Math.max(1, stats.procedureStats.reduce((sum, p) => sum + p.count, 0))) 
                : 0).toLocaleString()} د.ع`}
              icon={Award}
              color="orange"
              delay={400}
              compact={true}
            />
          </div>

          <Card className="rounded-2xl border-gray-100/80 shadow-xs p-5">
            <div className="flex items-center justify-between mb-5 border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  تصنيف الإجراءات الطبية والعلاجية حسب الطلب والإيراد
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">تحليل الجدوى وتوزيع الخدمات الأكثر طلباً</p>
              </div>
            </div>

            <div className="space-y-4">
              {stats.procedureStats.map((proc, idx) => (
                <div key={proc.id} className="p-3.5 rounded-xl border border-gray-100 hover:border-blue-100 bg-gray-50/50 hover:bg-blue-50/20 transition-all">
                  <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-gray-900 text-xs">{proc.name}</span>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-semibold">
                      <span className="text-gray-500">{proc.count} حالة ({proc.percentage}%)</span>
                      <span className="text-gray-400">|</span>
                      <span className="text-gray-600">متوسط: {proc.avgCost.toLocaleString()} د.ع</span>
                      <span className="text-gray-400">|</span>
                      <span className="font-bold text-emerald-700">{proc.totalRevenue.toLocaleString()} د.ع</span>
                    </div>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${proc.color}`}
                      style={{ width: `${Math.max(4, proc.percentage)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
              {stats.procedureStats.length === 0 && (
                <div className="text-center py-10 text-gray-400 text-xs">لا توجد سجلات إجراءات متاحة</div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 4: تقرير الديون المتأخرة والتحصيل (DEBTS) */}
      {/* ========================================================================= */}
      {selectedType === 'debts' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <BentoStatCard
              title="إجمالي الديون المعلقة"
              value={`${stats.debtStats.totalOutstanding.toLocaleString()} د.ع`}
              icon={CreditCard}
              color="red"
              delay={100}
              compact={true}
            />
            <BentoStatCard
              title="إجمالي المبالغ المحصلة"
              value={`${stats.debtStats.totalCollected.toLocaleString()} د.ع`}
              icon={DollarSign}
              color="green"
              delay={200}
              compact={true}
            />
            <BentoStatCard
              title="معدل التحصيل المالي"
              value={`${stats.debtStats.collectionRate}%`}
              icon={TrendingUp}
              color="purple"
              delay={300}
              compact={true}
            />
            <BentoStatCard
              title="المراجعين المدينين"
              value={`${stats.debtStats.totalDebtorsCount} مراجع`}
              icon={Users}
              color="orange"
              delay={400}
              compact={true}
            />
          </div>

          {/* Aging Receivables 3-Tier Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-emerald-800">🟢 ديون حديثة (0 - 30 يوماً)</span>
                <span className="text-[11px] font-semibold text-emerald-600">{stats.debtStats.aging0to30.count} مراجع</span>
              </div>
              <p className="text-base font-extrabold text-emerald-700 mt-2">
                {stats.debtStats.aging0to30.amount.toLocaleString()} د.ع
              </p>
              <span className="text-[10px] text-gray-500 mt-0.5 block">ضمن فترة السداد المعتادة والجلسات النشطة</span>
            </div>

            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-blue-800">🔵 ديون متوسطة (31 - 60 يوماً)</span>
                <span className="text-[11px] font-semibold text-blue-600">{stats.debtStats.aging31to60.count} مراجع</span>
              </div>
              <p className="text-base font-extrabold text-blue-700 mt-2">
                {stats.debtStats.aging31to60.amount.toLocaleString()} د.ع
              </p>
              <span className="text-[10px] text-gray-500 mt-0.5 block">تحتاج تذكيراً ودياً عبر رسائل الواتساب</span>
            </div>

            <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-rose-800">🔴 ديون متأخرة (+60 يوماً)</span>
                <span className="text-[11px] font-semibold text-rose-600">{stats.debtStats.aging60plus.count} مراجع</span>
              </div>
              <p className="text-base font-extrabold text-rose-700 mt-2">
                {stats.debtStats.aging60plus.amount.toLocaleString()} د.ع
              </p>
              <span className="text-[10px] text-gray-500 mt-0.5 block">مستحقات متأخرة تتطلب متابعة الإدارة المباشرة</span>
            </div>
          </div>

          {/* Debtors List Table */}
          <Card className="rounded-2xl border-gray-100/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-rose-600" />
                  قائمة المراجعين المستحق عليهم مبالغ مالية للمتابعة
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">تفاصيل المتبقي، مدة التأخير، ورابط التواصل الفوري</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-gray-50/80 text-gray-600 border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 font-semibold">المراجع</th>
                    <th className="px-5 py-3 font-semibold">العلاج / الخطة</th>
                    <th className="px-5 py-3 font-semibold text-left">التكلفة</th>
                    <th className="px-5 py-3 font-semibold text-left">المدفوع</th>
                    <th className="px-5 py-3 font-semibold text-left">المتبقي المطلوب</th>
                    <th className="px-5 py-3 font-semibold text-center">أيام التأخير</th>
                    <th className="px-5 py-3 font-semibold text-center">التصنيف</th>
                    <th className="px-5 py-3 font-semibold text-center">إجراء المتابعة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.debtStats.debtorsList.slice(0, 15).map((debtor) => (
                    <tr key={debtor.id} className="hover:bg-rose-50/20 transition-colors">
                      <td className="px-5 py-3 font-bold text-gray-900">
                        {debtor.patientName}
                      </td>
                      <td className="px-5 py-3 text-gray-600">{debtor.treatmentDescription}</td>
                      <td className="px-5 py-3 text-left font-medium text-gray-500">{debtor.totalCost.toLocaleString()} د.ع</td>
                      <td className="px-5 py-3 text-left font-bold text-emerald-600">{debtor.paid.toLocaleString()} د.ع</td>
                      <td className="px-5 py-3 text-left font-extrabold text-rose-600">{debtor.remaining.toLocaleString()} د.ع</td>
                      <td className="px-5 py-3 text-center font-bold text-gray-700">{debtor.daysOld} يوم</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          debtor.ageCategory === '0-30' ? 'bg-emerald-100 text-emerald-700' :
                          debtor.ageCategory === '31-60' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {debtor.ageCategory === '0-30' ? '0 - 30 يوم' : debtor.ageCategory === '31-60' ? '31 - 60 يوم' : '+60 يوم'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        {debtor.patientPhone ? (
                          <a
                            href={`https://wa.me/${debtor.patientPhone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-bold transition-colors"
                          >
                            <Phone className="w-3 h-3" />
                            <span>تواصل</span>
                          </a>
                        ) : (
                          <span className="text-gray-400 text-[10px]">لا يوجد هاتف</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {stats.debtStats.debtorsList.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-gray-400">
                        🎉 لا توجد أي ديون معلقة أو مستحقات متأخرة
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 5: تقرير كفاءة المواعيد ونسبة الحضور (APPOINTMENTS) */}
      {/* ========================================================================= */}
      {selectedType === 'appointments' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <BentoStatCard
              title="إجمالي المواعيد"
              value={stats.appointmentStats.total}
              icon={Calendar}
              color="blue"
              delay={100}
              compact={true}
            />
            <BentoStatCard
              title="نسبة الحضور المكتملة"
              value={`${stats.appointmentStats.attendanceRate}%`}
              icon={CheckCircle2}
              color="green"
              trend={stats.appointmentStats.attendanceRate >= 70 ? 'up' : 'down'}
              trendValue={`${stats.appointmentStats.completed} موعد مكتمل`}
              delay={200}
              compact={true}
            />
            <BentoStatCard
              title="نسبة الغياب (No-Show)"
              value={`${stats.appointmentStats.noShowRate}%`}
              icon={AlertCircle}
              color="red"
              trend={stats.appointmentStats.noShowRate > 15 ? 'down' : 'neutral'}
              trendValue={`${stats.appointmentStats.noShow} غياب`}
              delay={300}
              compact={true}
            />
            <BentoStatCard
              title="نسبة الإلغاء"
              value={`${stats.appointmentStats.cancellationRate}%`}
              icon={XCircle}
              color="orange"
              delay={400}
              compact={true}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Appointment Status Breakdown */}
            <Card className="rounded-2xl border-gray-100/80 shadow-xs p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-4 border-b border-gray-100 pb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                تحليل التزام المراجعين بالمواعيد ({getPeriodLabel()})
              </h2>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-gray-900">المواعيد المكتملة (تم الحضور)</span>
                  </div>
                  <span className="font-bold text-emerald-700">{stats.appointmentStats.completed} موعد ({stats.appointmentStats.attendanceRate}%)</span>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-gray-900">المواعيد القادمة والمؤكدة</span>
                  </div>
                  <span className="font-bold text-blue-700">{stats.appointmentStats.confirmed} موعد</span>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-amber-600" />
                    <span className="font-bold text-gray-900">المواعيد الملغاة مسبقاً</span>
                  </div>
                  <span className="font-bold text-amber-700">{stats.appointmentStats.cancelled} موعد ({stats.appointmentStats.cancellationRate}%)</span>
                </div>

                <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span className="font-bold text-gray-900">الغياب بدون إشعار (No-Show)</span>
                  </div>
                  <span className="font-bold text-rose-700">{stats.appointmentStats.noShow} موعد ({stats.appointmentStats.noShowRate}%)</span>
                </div>
              </div>
            </Card>

            {/* Appointment Types Breakdown */}
            <Card className="rounded-2xl border-gray-100/80 shadow-xs p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-4 border-b border-gray-100 pb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                توزيع أنواع وتخصصات المواعيد
              </h2>

              <div className="space-y-3.5">
                {stats.appointmentTypes.map((type, index) => (
                  <div key={index} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-700">{type.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">{type.count} موعد</span>
                        <span className="font-bold text-gray-900">{type.percentage}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${type.color}`}
                        style={{ width: `${type.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

    </div>
  );
};