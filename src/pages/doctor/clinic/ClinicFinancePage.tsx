import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Settings as SettingsIcon,
  Plus,
  PieChart as PieIcon,
  BarChart2,
  Eye,
  Trash2,
  Edit,
  RefreshCw,
  Search,
  Filter,
  CreditCard,
  UserCheck,
  Box,
  Calculator,
  Calendar,
  Receipt,
  FileText,
  CheckCircle,
  Printer
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { useFinance } from '../../../hooks/useFinance';
import { useInventory } from '../../../hooks/useInventory';
import { useLabOrders } from '../../../hooks/useLabOrders';
import { BentoStatCard } from '../../../components/dashboard/BentoStatCard';
import { ComprehensiveTransactionModal } from '../../../components/finance/ComprehensiveTransactionModal';
import { MonthSelector } from '../../../components/finance/MonthSelector';
import { PatientAccountModal } from '../../../components/finance/PatientAccountModal';
import { IncomeSection } from './sections/finance/IncomeSection';
import { useAssets, Asset } from '../../../hooks/useAssets';
import { useStaff } from '../../../hooks/useStaff';
import { useCurrentClinic } from '../../../hooks/useCurrentClinic';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Modal } from '../../../components/common/Modal';
import { toast } from 'sonner';
import { formatCategoryName } from '../../../lib/utils';
import {
  printIncomeReceipt,
  printExpenseVoucher,
  printTreatmentPlanReport,
  printPatientFullStatement
} from '../../../lib/printReceipt';

interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any;
  staff: any[];
  canEdit: boolean;
  onEdit: () => void;
  clinicId: string;
  onPrint?: (transaction: any) => void;
  onOpenPatientAccount?: (patientId: string) => void;
}

export const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({
  isOpen,
  onClose,
  transaction,
  staff,
  canEdit,
  onEdit,
  clinicId,
  onPrint,
  onOpenPatientAccount
}) => {
  const navigate = useNavigate();
  if (!transaction) return null;

  const recorder = staff.find(s => s.id?.toString() === transaction.recordedByStaffId?.toString());
  const doctor = staff.find(s => s.id?.toString() === transaction.doctorId?.toString() || s.name === transaction.doctorName);
  const staffMember = staff.find(s => s.id?.toString() === transaction.staffId?.toString() || s.name === transaction.staffName);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تفاصيل المعاملة المالية" size="md">
      <div className="space-y-4 text-right" dir="rtl">
        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
          <div>
            <span className="block text-xs text-gray-400">رقم المعاملة</span>
            <span className="text-sm font-bold text-gray-900">#{transaction.id.slice(-6)}</span>
          </div>
          <div>
            <span className="block text-xs text-gray-400">النوع</span>
            <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded ${
              transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {transaction.type === 'income' ? 'إيراد' : 'مصروف'}
            </span>
          </div>
          <div>
            <span className="block text-xs text-gray-400">التاريخ والوقت</span>
            <span className="text-sm text-gray-900 font-medium">
              {transaction.date ? transaction.date.split('T')[0] : ''} {transaction.date?.split('T')[1]?.slice(0, 5)}
            </span>
          </div>
          <div>
            <span className="block text-xs text-gray-400">المبلغ</span>
            <span className={`text-base font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
              {transaction.amount?.toLocaleString()} د.ع
            </span>
          </div>
        </div>

        {/* Categories / Description */}
        <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-100">
          <div>
            <span className="block text-xs text-gray-400">التصنيف</span>
            <span className="text-sm font-bold text-gray-900">
              {formatCategoryName(transaction.category, transaction.type)}
            </span>
          </div>
          {transaction.description && (
            <div>
              <span className="block text-xs text-gray-400">التفاصيل / الوصف</span>
              <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">{transaction.description}</p>
            </div>
          )}
        </div>

        {/* Parties / Related Persons */}
        <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-100">
          {transaction.type === 'income' ? (
            <>
              {/* Income: Patient */}
              {(transaction.relatedPerson || transaction.patientName) && (
                <div className="flex items-center justify-between border-b pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                  <div>
                    <span className="block text-xs text-gray-400">المراجع (المريض)</span>
                    <span className="text-sm font-bold text-gray-900">{transaction.relatedPerson || transaction.patientName}</span>
                  </div>
                  {transaction.patientId && (
                    <div className="flex flex-col gap-1.5 items-end">
                      <button
                        onClick={() => {
                          onClose();
                          if (onOpenPatientAccount) onOpenPatientAccount(transaction.patientId);
                        }}
                        className="flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-bold transition-all w-full text-center cursor-pointer shadow-xs"
                      >
                        <Receipt className="w-3.5 h-3.5 text-blue-600" />
                        <span>كشف حساب المراجع</span>
                      </button>
                      <button
                        onClick={() => {
                          onClose();
                          navigate(`/doctor/clinic/${clinicId}/patient/${transaction.patientId}`);
                        }}
                        className="flex items-center justify-center gap-1 text-[10px] text-gray-500 hover:text-blue-600 hover:underline cursor-pointer"
                      >
                        <Eye className="w-3 h-3 text-gray-400" />
                        <span>دخول ملف المريض</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Income: Treating Doctor */}
              {(transaction.doctorName || transaction.assigned_doctor) && (
                <div className="flex items-center justify-between border-b pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                  <div>
                    <span className="block text-xs text-gray-400">الطبيب المعالج</span>
                    <span className="text-sm font-bold text-gray-900">
                      {getDoctorDisplayName(transaction.doctorName || transaction.assigned_doctor, staff)}
                    </span>
                  </div>
                  {(doctor?.id || transaction.doctorId) && (
                    <button
                      onClick={() => {
                        onClose();
                        navigate(`/doctor/clinic/${clinicId}?tab=staff`);
                      }}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg font-bold transition-all cursor-pointer shadow-xs"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                      <span>ملف الطبيب</span>
                    </button>
                  )}
                </div>
              )}

              {/* Income: Cashier / Recorder */}
              {transaction.recorderName && (
                <div>
                  <span className="block text-xs text-gray-400">المسؤول عن التسجيل (المحاسب)</span>
                  <span className="text-sm text-gray-700 font-medium">{transaction.recorderName}</span>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Expense: Beneficiary / Employee / Lab / Vendor */}
              <div className="flex items-center justify-between border-b pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                <div>
                  <span className="block text-xs text-gray-400">
                    {transaction.category === 'salary'
                      ? 'المستفيد (الموظف / المستلم للراتب)'
                      : transaction.category === 'lab'
                      ? 'مختبر / معمل الأسنان المستفيد'
                      : 'الجهة المستفيدة / المستلم'}
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {transaction.category === 'salary'
                      ? (transaction.doctorName || transaction.relatedPerson || 'الموظف المستحق')
                      : (transaction.relatedPerson || transaction.beneficiary || transaction.doctorName || 'الجهة المستفيدة')}
                  </span>
                </div>
                {(transaction.category === 'salary' || transaction.doctorId || transaction.staffId) && (
                  <button
                    onClick={() => {
                      onClose();
                      navigate(`/doctor/clinic/${clinicId}?tab=staff`);
                    }}
                    className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg font-bold transition-all cursor-pointer"
                  >
                    💼 ملف الموظف / الكادر
                  </button>
                )}
              </div>

              {/* Expense: Recorder / Admin who entered the voucher into the system */}
              {transaction.recorderName && (
                <div>
                  <span className="block text-xs text-gray-400">المسؤول عن تسجيل السند في النظام</span>
                  <span className="text-sm text-gray-700 font-medium">{transaction.recorderName}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions Footer */}
        <div className="pt-4 border-t flex justify-end gap-2.5">
          <Button variant="outline" onClick={onClose} size="sm" className="cursor-pointer">إغلاق</Button>
          {onPrint && (
            <Button
              variant="outline"
              onClick={() => onPrint(transaction)}
              size="sm"
              className="flex items-center gap-1 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة</span>
            </Button>
          )}
          {canEdit && !transaction.id?.startsWith('apt-') && (
            <Button
              variant="primary"
              onClick={() => {
                onClose();
                onEdit();
              }}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            >
              📝 تعديل المعاملة
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

const getDoctorDisplayName = (doctorVal: string, staffList: any[]) => {
  if (!doctorVal) return 'غير محدد';
  const cleanVal = doctorVal.trim().toLowerCase();
  const doc = staffList.find(s => 
    s.email?.toLowerCase() === cleanVal || 
    s.name?.toLowerCase() === cleanVal || 
    s.id?.toString() === cleanVal ||
    s.userId?.toLowerCase() === cleanVal ||
    s.authUserId?.toLowerCase() === cleanVal
  );
  if (doc) {
    const nameWithoutDr = doc.name.replace(/^د\.\s*/, '');
    return `د. ${nameWithoutDr}`;
  }
  if (doctorVal.includes('@')) {
    const part = doctorVal.split('@')[0];
    const cleanName = part.split(/[\._]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    return `د. ${cleanName}`;
  }
  const cleanDr = doctorVal.replace(/^د\.\s*/, '');
  return `د. ${cleanDr}`;
};

interface DoctorFinancePageProps {
  clinicId?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export const ClinicFinancePage: React.FC<DoctorFinancePageProps> = ({ clinicId }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'income' | 'expenses' | 'settings'>('overview');
  const navigate = useNavigate();
  const { user } = useAuth();

  // Period filter state: default to current month YYYY-MM
  const currentDate = new Date();
  const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const [selectedPeriod, setSelectedPeriod] = useState<string>(currentMonthStr);

  // Overview transactions filter: 'all' | 'income' | 'expense'
  const [overviewTxFilter, setOverviewTxFilter] = useState<'all' | 'income' | 'expense'>('all');

  const getPeriodLabel = (period: string) => {
    if (period === 'all') return '(الكل)';
    if (period.startsWith('year-')) {
      const yearVal = period.replace('year-', '');
      return `(سنة ${yearVal})`;
    }
    if (period === currentMonthStr) {
      return '(الشهر الحالي)';
    }
    const parts = period.split('-');
    if (parts.length === 2) {
      const y = parts[0];
      const m = parseInt(parts[1], 10) - 1;
      const monthName = MONTH_NAMES[m] || parts[1];
      return `(شهر ${monthName} ${y})`;
    }
    return `(${period})`;
  };

  const [isOwner, setIsOwner] = useState(false);
  const [clinicInfo, setClinicInfo] = useState<any>(null);

  useEffect(() => {
    const checkOwnerAndClinic = async () => {
      if (!clinicId) return;
      const { data } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', clinicId)
        .maybeSingle();

      if (data) {
        setClinicInfo(data);
        if (user?.id && data.owner_id === user.id) {
          setIsOwner(true);
        }
      }
    };
    checkOwnerAndClinic();
  }, [clinicId, user?.id]);

  // Data Contexts
  const { clinic: currentClinic } = useCurrentClinic();
  const effectiveClinic = {
    ...currentClinic,
    ...clinicInfo,
    logo_url: clinicInfo?.logo_url || clinicInfo?.image_url || clinicInfo?.image || clinicInfo?.logo || currentClinic?.logo_url || currentClinic?.image_url || currentClinic?.image || currentClinic?.logo,
    name: clinicInfo?.name || currentClinic?.name || 'العيادة',
    phone: clinicInfo?.phone || currentClinic?.phone || '',
    address: clinicInfo?.address || currentClinic?.address || ''
  };

  const { transactions, stats, addTransaction, updateTransaction, deleteTransaction, refresh } = useFinance(clinicId || '0');
  const { inventory, updateItem, addItem } = useInventory(clinicId || '0');
  const { updateOrderStatus } = useLabOrders({ clinicId: clinicId || '0' });
  const { assets, addAsset } = useAssets(clinicId || '0');
  const { staff } = useStaff(clinicId || '0');

  // URL Params for linking from Patient File
  const location = useLocation();

  // --- Modal State ---
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'income' | 'expense'>('income');
  const [preselectedPatientId, setPreselectedPatientId] = useState<string | undefined>(undefined);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDetailsTransaction, setSelectedDetailsTransaction] = useState<any>(null);

  // Patient Account Statement Modal State
  const [showPatientAccountModal, setShowPatientAccountModal] = useState(false);
  const [selectedPatientAccountId, setSelectedPatientAccountId] = useState<string | null>(null);

  const currentStaff = staff.find(s => 
    s.userId === user?.id || 
    s.authUserId === user?.id || 
    (s.email && user?.email && s.email.toLowerCase() === user.email.toLowerCase()) ||
    (s.name && user?.name && s.name.toLowerCase().trim() === user.name.toLowerCase().trim()) ||
    (s.name && user?.name && s.name.toLowerCase().replace(/^د\.\s*/, '').trim() === user.name.toLowerCase().replace(/^د\.\s*/, '').trim())
  );
  
  const canEditFinancials = isOwner || currentStaff?.permissions?.editFinancials || currentStaff?.permissions?.assistantManager;

  const handleEdit = (transaction: any) => {
    const editData = {
      ...transaction,
      patientId: transaction.patientId,
      doctorId: transaction.doctorId,
      labRequestId: transaction.labRequestId,
      recordedById: transaction.recordedById || transaction.recorderId
    };
    setSelectedTransaction(editData);
    setModalType(transaction.type);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه المعاملة؟')) {
      await deleteTransaction(id);
    }
  };

  const handleOpenPatientAccount = (patientId: string) => {
    setSelectedPatientAccountId(patientId);
    setShowPatientAccountModal(true);
  };

  const handlePayInstallment = (receivableItem: any) => {
    setPreselectedPatientId(receivableItem.patient_id || receivableItem.patientId);
    setModalType('income');
    setSelectedTransaction({
      amount: receivableItem.remaining,
      category: 'treatment',
      patientId: receivableItem.patient_id || receivableItem.patientId,
      treatmentId: receivableItem.id,
      description: `قسط: ${receivableItem.treatment_description || receivableItem.treatment_name || 'خطة علاجية'}`
    });
    setShowModal(true);
  };

  const handlePrintTransaction = (tx: any) => {
    if (!tx) return;
    if (tx.type === 'expense') {
      printExpenseVoucher({
        transaction: tx,
        clinic: effectiveClinic,
        recorderName: tx.recorderName || tx.recorder_staff?.full_name || currentStaff?.name
      });
    } else {
      printIncomeReceipt({
        transaction: tx,
        clinic: effectiveClinic,
        patient: {
          full_name: tx.patientName || tx.relatedPerson,
          phone: tx.patientPhone,
          id: tx.patientId || tx.patient_id
        },
        doctorName: getDoctorDisplayName(tx.doctorName || tx.assigned_doctor || tx.staff_record?.full_name, staff),
        recorderName: tx.recorderName || tx.recorder_staff?.full_name || currentStaff?.name
      });
    }
  };

  const handlePrintTreatmentPlan = (plan: any, patient: any) => {
    printTreatmentPlanReport({
      plan,
      patient,
      clinic: effectiveClinic
    });
  };

  const handlePrintFullStatement = (data: any) => {
    printPatientFullStatement({
      ...data,
      clinic: effectiveClinic
    });
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const patientIdParam = params.get('patientId');
    const modalParam = params.get('modal');

    if (patientIdParam && modalParam) {
      setModalType(modalParam as 'income' | 'expense');
      setPreselectedPatientId(patientIdParam);
      setShowModal(true);
    }
  }, [location.search]);

  // --- Dynamic Filtering for Selected Period ---
  const filteredPeriodTransactions = transactions.filter(t => {
    if (!t.date) return false;
    if (selectedPeriod === 'all') return true;
    if (selectedPeriod.startsWith('year-')) {
      const yearVal = selectedPeriod.replace('year-', '');
      return t.date.startsWith(yearVal);
    }
    return t.date.startsWith(selectedPeriod);
  });

  const periodIncomeTransactions = filteredPeriodTransactions.filter(t => t.type === 'income');
  const periodExpenseTransactions = filteredPeriodTransactions.filter(t => t.type === 'expense');
  const allClinicExpenses = transactions.filter(t => t.type === 'expense');

  let displayedTransactions = filteredPeriodTransactions;
  if (overviewTxFilter === 'income') {
    displayedTransactions = periodIncomeTransactions;
  } else if (overviewTxFilter === 'expense') {
    displayedTransactions = periodExpenseTransactions;
  }

  const periodIncome = periodIncomeTransactions
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const periodExpenses = periodExpenseTransactions
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const periodNet = periodIncome - periodExpenses;
  const periodCount = filteredPeriodTransactions.length;

  // --- Chart Data: 6-Month Trend (Historical - Unaffected by single month filter) ---
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return {
      label: d.toLocaleString('default', { month: 'short' }),
      key: d.toISOString().slice(0, 7) // YYYY-MM
    };
  }).reverse();

  const barData = last6Months.map(month => {
    const monthTransactions = transactions.filter(t => t.date && t.date.startsWith(month.key));
    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      name: month.label,
      income,
      expenses
    };
  });

  // Calculate Category Distribution for Pie Chart based on filtered period
  const expenseDistribution = filteredPeriodTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const pieData = Object.keys(expenseDistribution).map(cat => ({
    name: formatCategoryName(cat, 'expense'),
    value: expenseDistribution[cat]
  }));

  const SafePieData = pieData.length > 0 ? pieData : [
    { name: 'لا توجد مصروفات', value: 1 }
  ];

  // --- Category Management (State) ---
  const [categories, setCategories] = useState([
    { id: 'cat-1', name: 'رواتب', type: 'locked', description: 'رواتب الموظفين والكادر الطبي' },
    { id: 'cat-2', name: 'مختبر', type: 'locked', description: 'تكاليف طلبات معمل الأسنان' },
    { id: 'cat-3', name: 'مخزون', type: 'locked', description: 'شراء مواد ومستلزمات طبية' },
    { id: 'cat-4', name: 'إيجار', type: 'editable', description: 'إيجار العيادة الشهري' },
    { id: 'cat-5', name: 'كهرباء', type: 'editable', description: 'فواتير الطاقة والمولد' },
  ]);
  const [newCategoryName, setNewCategoryName] = useState('');

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      setCategories([...categories, {
        id: `cat-${Date.now()}`,
        name: newCategoryName,
        type: 'editable',
        description: 'تصنيف مخصص'
      }]);
      setNewCategoryName('');
    }
  };

  // --- Render Functions ---

  const renderOverview = () => (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* 1. Bento KPI Section - Driven by Selected Period */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <BentoStatCard
          title="الإيرادات"
          value={`${periodIncome.toLocaleString()} د.ع`}
          icon={TrendingUp}
          color="emerald"
          trend="up"
          trendValue="المحصل"
          delay={100}
        />
        <BentoStatCard
          title="المصروفات"
          value={`${periodExpenses.toLocaleString()} د.ع`}
          icon={TrendingDown}
          color="red"
          trend="down"
          trendValue="المنفق"
          delay={200}
        />
        <BentoStatCard
          title="الأرباح الصافية"
          value={`${periodNet.toLocaleString()} د.ع`}
          icon={DollarSign}
          color={periodNet >= 0 ? "blue" : "red"}
          trend={periodNet >= 0 ? "up" : "down"}
          trendValue="الصافي"
          delay={300}
        />
        <BentoStatCard
          title="إجمالي المعاملات"
          value={periodCount}
          icon={Wallet}
          color="purple"
          trend="neutral"
          trendValue="عملية"
          delay={400}
        />
      </div>

      {/* 2. Month and Period Filter Bar right below the cards */}
      <MonthSelector
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      {/* 3. Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Historical 6-Month Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-gray-400" />
                التحليل المالي التراكمي
              </h3>
              <p className="text-sm text-gray-500">مقارنة الإيرادات والمصروفات للأشهر الستة الماضية</p>
            </div>
          </div>
          <div className="h-[350px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  dx={-10}
                />
                <Tooltip
                  cursor={{ fill: '#F3F4F6' }}
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontFamily: 'inherit'
                  }}
                  formatter={(value: number) => [`${value.toLocaleString()} د.ع`, '']}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="income" name="إيرادات" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={50} />
                <Bar dataKey="expenses" name="مصروفات" fill="#F43F5E" radius={[6, 6, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Distribution Chart (Period-aware) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-gray-400" />
                توزيع المصروفات
              </h3>
              <p className="text-sm text-gray-500">تحليل فئات الإنفاق للفترة المحددة</p>
            </div>
          </div>
          <div className="h-[350px] flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={SafePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  cornerRadius={6}
                >
                  {SafePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(value: number) => `${value.toLocaleString()} د.ع`}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold text-gray-700">
                {filteredPeriodTransactions.filter(t => t.type === 'expense').length}
              </span>
              <span className="text-xs text-gray-400 font-medium">عملية صرف</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Recent Transactions List (Clickable Rows) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
              <span>أحدث المعاملات للفترة</span>
              <span className="text-blue-600 font-semibold text-sm bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full">
                {getPeriodLabel(selectedPeriod)}
              </span>
            </h3>

            {/* Quick Type Filter: All / Income / Expenses */}
            <div className="flex items-center gap-1 bg-gray-100/90 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setOverviewTxFilter('all')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  overviewTxFilter === 'all'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                الكل ({filteredPeriodTransactions.length})
              </button>
              <button
                type="button"
                onClick={() => setOverviewTxFilter('income')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  overviewTxFilter === 'income'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <span>إيرادات</span>
                <span className="text-[10px] opacity-90">({periodIncomeTransactions.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setOverviewTxFilter('expense')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  overviewTxFilter === 'expense'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                <span>مصروفات</span>
                <span className="text-[10px] opacity-90">({periodExpenseTransactions.length})</span>
              </button>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (overviewTxFilter === 'expense') {
                setActiveTab('expenses');
              } else {
                setActiveTab('income');
              }
            }}
            className="text-gray-600 hover:text-blue-600 border-gray-200 cursor-pointer self-start sm:self-auto"
          >
            {overviewTxFilter === 'expense' ? 'سجل المصروفات الكامل' : 'عرض السجل الكامل'}
          </Button>
        </div>

        <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto custom-scrollbar">
          {displayedTransactions.length === 0 ? (
            overviewTxFilter === 'expense' ? (
              <div className="text-center py-10 px-4 bg-rose-50/20 rounded-xl my-4 mx-4 border border-dashed border-rose-200/60">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-3">
                  <TrendingDown className="w-6 h-6" />
                </div>
                <p className="font-bold text-gray-800 mb-1">
                  لا توجد مصروفات مسجلة في {getPeriodLabel(selectedPeriod)}
                </p>
                {allClinicExpenses.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-3">
                      توجد ({allClinicExpenses.length}) عملية صرف مسجلة بالعيادة في فترات وأشهر أخرى.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedPeriod('all');
                          setOverviewTxFilter('expense');
                        }}
                        className="text-xs border-blue-200 text-blue-700 hover:bg-blue-50 cursor-pointer"
                      >
                        عرض كافة مصروفات العيادة ({allClinicExpenses.length})
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setActiveTab('expenses')}
                        className="text-xs bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                      >
                        فتح سجل المصروفات المتكامل
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">لم يتم تسجيل أي مصروفات حتى الآن في العيادة</p>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                لا توجد معاملات مسجلة في هذه الفترة {getPeriodLabel(selectedPeriod)}
              </div>
            )
          ) : (
            displayedTransactions.slice(0, 20).map(t => (
              <div
                key={t.id}
                onClick={() => {
                  setSelectedDetailsTransaction(t);
                  setShowDetailsModal(true);
                }}
                className="p-4 flex justify-between items-center hover:bg-indigo-50/40 transition-all cursor-pointer group"
                title="انقر لعرض تفاصيل المعاملة"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl transition-colors ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100' : 'bg-rose-50 text-rose-600 group-hover:bg-rose-100'}`}>
                    {t.type === 'income' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 mb-0.5 group-hover:text-indigo-600 transition-colors">
                      {t.description || (t.type === 'income' ? 'إيراد مالي' : 'مصروف مالي')}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{formatCategoryName(t.category, t.type)}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                      <span>{t.date ? t.date.split('T')[0] : ''}</span>
                      {t.relatedPerson && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                          <span className="text-blue-600 font-medium">{t.relatedPerson}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-left flex items-center gap-3">
                  <div>
                    <span className={`font-bold text-lg block mb-0.5 ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}
                      <span className="text-xs text-gray-400 font-normal mr-1">د.ع</span>
                    </span>
                    <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2 py-1 rounded-lg inline-block">
                      {t.paymentMethod === 'cash' ? 'نقدي' : 'آجل'}
                    </span>
                  </div>
                  <Eye className="w-4 h-4 text-gray-300 group-hover:text-indigo-600 transition-colors" />
                </div>
              </div>
            ))
          )}
        </div>
        {displayedTransactions.length > 20 && (
          <div className="p-3 bg-gray-50 text-center border-t border-gray-100 text-xs text-gray-500">
            يتم عرض أحدث 20 معاملة من أصل {displayedTransactions.length}.{' '}
            <button
              type="button"
              onClick={() => setActiveTab(overviewTxFilter === 'expense' ? 'expenses' : 'income')}
              className="text-blue-600 hover:underline font-bold mr-1 cursor-pointer"
            >
              عرض السجل الكامل
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderExpensesTab = () => (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <Card>
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg md:text-xl font-bold flex items-center gap-1.5 sm:gap-2 text-gray-900 truncate">
              <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 shrink-0" />
              سجل المصروفات المتكامل
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 hidden xs:block truncate">تتبع الرواتب، المشتريات، والمصاريف التشغيلية</p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => refresh()} className="p-2 sm:px-3 sm:py-1.5 flex items-center gap-1 cursor-pointer">
              <RefreshCw className="w-4 h-4 sm:ml-1" />
              <span className="hidden sm:inline">تحديث</span>
            </Button>
            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 p-2 sm:px-3 sm:py-1.5 flex items-center gap-1 cursor-pointer" onClick={() => {
              setModalType('expense');
              setPreselectedPatientId(undefined);
              setSelectedTransaction(null);
              setShowModal(true);
            }}>
              <Plus className="w-4 h-4 sm:ml-1" />
              <span className="hidden sm:inline">مصروف يدوي</span>
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b">
              <tr>
                <th className="px-6 py-4 rounded-tr-lg">المعرف</th>
                <th className="px-6 py-4">التاريخ</th>
                <th className="px-6 py-4">البيان / الجهة</th>
                <th className="px-6 py-4">التصنيف</th>
                <th className="px-6 py-4">المبلغ</th>
                <th className="px-6 py-4">المسؤول (المسجل)</th>
                <th className="px-6 py-4 rounded-tl-lg text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.filter(t => t.type === 'expense').length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <Wallet className="w-12 h-12 stroke-1 opacity-20" />
                      <p>لا توجد مصروفات مسجلة</p>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.filter(t => t.type === 'expense').map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 text-xs text-gray-400">
                      <span className="bg-gray-100 px-2 py-1 rounded font-bold">#{t.id.slice(-6)}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="font-bold text-gray-900">{t.date ? t.date.split('T')[0] : ''}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{t.description || '-'}</span>
                        {t.relatedPerson && (
                          <span className="text-xs text-gray-500 mt-0.5">المستفيد: {t.relatedPerson}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                        {formatCategoryName(t.category, 'expense')}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-red-600 text-lg">
                      -{t.amount.toLocaleString()}
                      <span className="text-xs text-gray-400 mr-1 font-normal">د.ع</span>
                    </td>
                    <td className="px-6 py-4">
                      {t.recorderName ? (
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-sm text-gray-700">{t.recorderName}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedDetailsTransaction(t);
                            setShowDetailsModal(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="عرض التفاصيل"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <Card>
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-gray-600" />
            إعدادات المالية
          </h2>
        </div>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-gray-800">تصنيفات المصروفات</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="اسم تصنيف جديد..."
                className="px-4 py-2 border rounded-lg text-right"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()} className="cursor-pointer">
                <Plus className="w-4 h-4 ml-2" /> إضافة
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => (
              <div key={cat.id} className={`p-4 rounded-xl border ${cat.type === 'locked' ? 'bg-gray-50 border-gray-200' : 'bg-white border-blue-100 shadow-sm'}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${cat.type === 'locked' ? 'bg-gray-200 text-gray-600' : 'bg-blue-100 text-blue-700'}`}>
                    {cat.type === 'locked' ? 'نظام' : 'مخصص'}
                  </span>
                  {cat.type === 'editable' && (
                    <button className="text-red-500 hover:text-red-700 text-xs cursor-pointer">حذف</button>
                  )}
                </div>
                <h4 className="font-bold text-gray-900 mb-1">{cat.name}</h4>
                <p className="text-sm text-gray-500">{cat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top Header Tabs */}
      <div className="flex justify-end">
        <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            نظرة عامة
          </button>
          <button
            onClick={() => setActiveTab('income')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'income'
                ? 'bg-white text-emerald-600 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            الإيرادات
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'expenses'
                ? 'bg-white text-red-600 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            المصروفات
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-white text-gray-800 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            الإعدادات
          </button>
        </div>
      </div>

      {/* Main Tab Views */}
      {activeTab === 'overview' && renderOverview()}

      {activeTab === 'income' && (
        <IncomeSection
          clinicId={clinicId || '0'}
          transactions={transactions}
          staff={staff}
          refresh={refresh}
          onOpenNewIncomeModal={() => {
            setModalType('income');
            setPreselectedPatientId(undefined);
            setSelectedTransaction(null);
            setShowModal(true);
          }}
          onOpenTransactionDetails={(t) => {
            setSelectedDetailsTransaction(t);
            setShowDetailsModal(true);
          }}
          onDeleteTransaction={handleDelete}
          onOpenPatientAccount={handleOpenPatientAccount}
          onPayInstallment={handlePayInstallment}
          onPrintTransaction={handlePrintTransaction}
          onPrintTreatmentPlan={handlePrintTreatmentPlan}
        />
      )}

      {activeTab === 'expenses' && renderExpensesTab()}
      {activeTab === 'settings' && renderSettingsTab()}

      {/* Transaction Add/Edit Modal */}
      <ComprehensiveTransactionModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedTransaction(null);
        }}
        type={modalType}
        clinicId={clinicId}
        preselectedPatientId={preselectedPatientId}
        initialData={selectedTransaction}
        onSave={async (data: any) => {
          try {
            if (selectedTransaction?.id) {
              await updateTransaction(selectedTransaction.id, data);
              toast.success('تم تعديل المعاملة بنجاح');
            } else {
              await addTransaction(data);

              // Inventory Sync Logic
              if (data.category === 'inventory' && data.quantity && data.quantity > 0) {
                if (data.inventoryItemId) {
                  const item = inventory.find(i => i.id === data.inventoryItemId);
                  if (item) {
                    await updateItem(item.id, { quantity: Number(item.quantity) + Number(data.quantity) });
                  }
                } else if (data.itemName) {
                  await addItem({
                    name: data.itemName,
                    category: 'materials',
                    quantity: Number(data.quantity),
                    unitPrice: data.amount / data.quantity,
                    minStock: 5,
                    unit: 'pcs',
                    supplier: 'شراء مباشر',
                    expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()
                  });
                  toast.success('تمت إضافة المادة إلى المخزون بنجاح');
                }
              }

              // Lab Order Auto-Update
              if (data.category === 'lab' && data.labRequestId) {
                await updateOrderStatus(data.labRequestId, 'completed', { paymentStatus: 'paid' });
                toast.success('تم تحديث حالة طلب المختبر إلى مكتمل ومدفوع');
              }

              // Asset Creation
              if (data.category === 'asset_purchase' && data.itemName) {
                await addAsset({
                  name: data.itemName,
                  category: 'equipment',
                  purchaseDate: data.date || new Date().toISOString(),
                  purchaseCost: Number(data.amount),
                  usefulLifeYears: Number(data.assetLifeYears) || 5,
                  salvageValue: Number(data.assetSalvageValue) || 0,
                  status: 'active',
                  currency: 'IQD',
                  description: data.description || 'Added via Expenses',
                  clinicId: clinicId || '0'
                });
                toast.success('تم إضافة الأصل الثابت إلى سجل الأصول بنجاح');
              }

              toast.success('تم حفظ المعاملة بنجاح');
            }
            setShowModal(false);
            setPreselectedPatientId(undefined);
            setSelectedTransaction(null);
          } catch (e) {
            console.error(e);
            toast.error('حدث خطأ أثناء الحفظ');
          }
        }}
      />

      {/* Transaction Details Modal */}
      <TransactionDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedDetailsTransaction(null);
        }}
        transaction={selectedDetailsTransaction}
        staff={staff}
        canEdit={canEditFinancials}
        onEdit={() => handleEdit(selectedDetailsTransaction)}
        clinicId={clinicId || '0'}
        onPrint={handlePrintTransaction}
        onOpenPatientAccount={handleOpenPatientAccount}
      />

      {/* Patient Account Statement Modal */}
      <PatientAccountModal
        isOpen={showPatientAccountModal}
        onClose={() => {
          setShowPatientAccountModal(false);
          setSelectedPatientAccountId(null);
        }}
        patientId={selectedPatientAccountId || undefined}
        clinicId={clinicId || '0'}
        staffList={staff}
        onOpenTransactionDetails={(tx) => {
          setSelectedDetailsTransaction(tx);
          setShowDetailsModal(true);
        }}
        onPayInstallment={handlePayInstallment}
        onPrintTransaction={handlePrintTransaction}
        onPrintTreatmentPlan={handlePrintTreatmentPlan}
        onPrintFullStatement={handlePrintFullStatement}
      />
    </div>
  );
};

const formatDate = (date: string) => new Date(date).toLocaleDateString('ar-IQ');