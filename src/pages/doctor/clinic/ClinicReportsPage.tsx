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
  Percent
} from 'lucide-react';
import { Card } from '../../../components/common/Card';
import { BentoStatCard } from '../../../components/dashboard/BentoStatCard';
import { useClinicReports } from '../../../hooks/useClinicReports';
import { useCurrentClinic } from '../../../hooks/useCurrentClinic';
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

  const handleExportCSV = () => {
    try {
      const headers = ['المؤشر / البيان', 'القيمة', 'الفترة'];
      const rows = [
        ['اسم العيادة', currentClinic?.name || 'عيادة الأسنان', getPeriodLabel()],
        ['إجمالي المرضى الفعليين', stats.totalPatients.toString(), 'حتى الآن'],
        ['إجمالي الإيرادات', `${stats.monthlyRevenue.toLocaleString()} د.ع`, getPeriodLabel()],
        ['إجمالي الصرفيات', `${stats.monthlyExpenses.toLocaleString()} د.ع`, getPeriodLabel()],
        ['صافي الأرباح', `${(stats.monthlyRevenue - stats.monthlyExpenses).toLocaleString()} د.ع`, getPeriodLabel()],
        ['هامش الربح', `${stats.profitMargin}%`, getPeriodLabel()],
        ['معدل رضا المرضى', `${stats.patientSatisfaction}%`, 'عام'],
        ['كفاءة الفريق الطبي', `${stats.staffEfficiency}%`, 'عام'],
        ['متوسط قيمة المراجع', `${stats.avgPatientValue.toLocaleString()} د.ع`, getPeriodLabel()]
      ];

      const csvContent = '\uFEFF' + [
        headers.join(','),
        ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `تقرير_${currentClinic?.name || 'العيادة'}_${selectedPeriod}_${new Date().toISOString().split('T')[0]}.csv`);
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
        <p className="text-sm font-medium text-gray-500">جاري إعداد التقارير والإحصائيات...</p>
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

      {/* 1. Key Performance Indicators (Top Bento Stat Cards) */}
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

      {/* 2. Compact Slim Filter & Action Bar (Placed BELOW KPI Cards with Reduced Height) */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs px-4 py-2.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>تصفية:</span>
          </div>

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

          <div className="relative min-w-[130px]">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="appearance-none w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold bg-gray-50/80 hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none cursor-pointer transition-all"
            >
              <option value="all">📊 جميع المؤشرات</option>
              <option value="financial">💰 تقارير مالية</option>
              <option value="operational">⚙️ تشغيلية ومواعيد</option>
              <option value="performance">⭐ الأداء والإنتاجية</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer active:scale-95"
          title="تصدير تقرير شامل بتنسيق CSV"
        >
          <Download className="w-3.5 h-3.5" />
          <span>تصدير البيانات</span>
        </button>
      </div>


      {/* 4. Visual Analytics & Charts */}
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

        {/* Monthly Revenue Trend (Last 6 Months) */}
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
  );
};