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
  CheckCircle
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
import { useAssets, Asset } from '../../../hooks/useAssets';
import { useStaff } from '../../../hooks/useStaff';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Modal } from '../../../components/common/Modal';
import { toast } from 'sonner';

interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any;
  staff: any[];
  canEdit: boolean;
  onEdit: () => void;
  clinicId: string;
}

export const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({
  isOpen,
  onClose,
  transaction,
  staff,
  canEdit,
  onEdit,
  clinicId
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
            <span className="font-mono text-sm font-bold text-gray-900">#{transaction.id.slice(-6)}</span>
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
              {transaction.date.split('T')[0]} {transaction.date.split('T')[1]?.slice(0, 5)}
            </span>
          </div>
          <div>
            <span className="block text-xs text-gray-400">المبلغ</span>
            <span className={`text-base font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
              {transaction.amount.toLocaleString()} د.ع
            </span>
          </div>
        </div>

        {/* Categories / Description */}
        <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-100">
          <div>
            <span className="block text-xs text-gray-400">التصنيف</span>
            <span className="text-sm font-bold text-gray-900">
              {transaction.category === 'treatment' ? 'علاج أسنان' :
               transaction.category === 'consultation' ? 'كشفية / استشارة' :
               transaction.category === 'salary' ? 'رواتب طاقم' :
               transaction.category === 'rent' ? 'إيجار' :
               transaction.category === 'materials' ? 'مواد طبية' :
               transaction.category === 'bills' ? 'فواتير وخدمات' :
               transaction.category === 'lab' ? 'مختبر أسنان' : 'أخرى'}
            </span>
          </div>
          {transaction.description && (
            <div>
              <span className="block text-xs text-gray-400">التفاصيل / الوصف</span>
              <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">{transaction.description}</p>
            </div>
          )}
        </div>

        {/* Related Persons */}
        <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-100">
          {transaction.relatedPerson && (
            <div className="flex items-center justify-between border-b pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
              <div>
                <span className="block text-xs text-gray-400">المراجع (المريض)</span>
                <span className="text-sm font-bold text-gray-900">{transaction.relatedPerson}</span>
              </div>
              {transaction.patientId && (
                <button
                  onClick={() => {
                    onClose();
                    navigate(`/doctor/clinic/${clinicId}/patient/${transaction.patientId}`);
                  }}
                  className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-bold transition-all"
                >
                  👁️ دخول ملف المريض
                </button>
              )}
            </div>
          )}

          {/* Doctor Info */}
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
                  className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg font-bold transition-all"
                >
                  💼 ملف الطبيب
                </button>
              )}
            </div>
          )}

          {/* Staff Member Info (For expense salaries) */}
          {(transaction.staffName || staffMember) && (
            <div className="flex items-center justify-between border-b pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
              <div>
                <span className="block text-xs text-gray-400">الموظف المعني (المصروف له)</span>
                <span className="text-sm font-bold text-gray-900">{transaction.staffName || staffMember?.name}</span>
              </div>
              {(staffMember?.id || transaction.staffId) && (
                <button
                  onClick={() => {
                    onClose();
                    navigate(`/doctor/clinic/${clinicId}?tab=staff`);
                  }}
                  className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg font-bold transition-all"
                >
                  💼 ملف الموظف
                </button>
              )}
            </div>
          )}

          {/* Recorder Info */}
          {transaction.recorderName && (
            <div>
              <span className="block text-xs text-gray-400">المستلم / الموظف المسجل</span>
              <span className="text-sm text-gray-700 font-medium">{transaction.recorderName}</span>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="pt-4 border-t flex justify-end gap-2.5">
          <Button variant="outline" onClick={onClose} size="sm">إغلاق</Button>
          {canEdit && (
            <Button
              variant="primary"
              onClick={() => {
                onClose();
                onEdit();
              }}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
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

export const ClinicFinancePage: React.FC<DoctorFinancePageProps> = ({ clinicId }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'income' | 'expenses' | 'receivables' | 'settings'>('overview');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isOwner, setIsOwner] = useState(false);
  useEffect(() => {
    const checkOwner = async () => {
      if (!clinicId || !user?.id) return;
      const { data } = await supabase
        .from('clinics')
        .select('owner_id')
        .eq('id', clinicId)
        .maybeSingle();
      if (data && data.owner_id === user.id) {
        setIsOwner(true);
      }
    };
    checkOwner();
  }, [clinicId, user?.id]);

  // Data Contexts
  const { transactions, stats, addTransaction, updateTransaction, deleteTransaction, refresh } = useFinance(clinicId || '0');
  const { inventory, updateItem, addItem } = useInventory(clinicId || '0');
  const { updateOrderStatus } = useLabOrders({ clinicId: clinicId || '0' });
  const { assets, addAsset } = useAssets(clinicId || '0');
  const { staff } = useStaff(clinicId || '0');

  // Receivables State
  const [receivables, setReceivables] = useState<any[]>([]);
  const [loadingReceivables, setLoadingReceivables] = useState(false);
  const [receivablesSearch, setReceivablesSearch] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');

  useEffect(() => {
    if (activeTab === 'receivables' && clinicId) {
      setLoadingReceivables(true);
      supabase
        .from('tooth_treatment_plans')
        .select(`
          *,
          patients!inner(clinic_id, full_name)
        `)
        .eq('patients.clinic_id', clinicId)
        .then(({ data, error }) => {
          if (!error && data) {
            const list = data.map(p => {
              const remaining = (p.estimated_cost || 0) - (p.paid || 0);
              return {
                ...p,
                patientName: p.patients?.full_name || 'مراجع غير معروف',
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
    }
  }, [activeTab, clinicId]);

  // URL Params for linking from Patient File
  const location = useLocation();

  // --- Modal State ---
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'income' | 'expense'>('income');
  const [preselectedPatientId, setPreselectedPatientId] = useState<string | undefined>(undefined);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDetailsTransaction, setSelectedDetailsTransaction] = useState<any>(null);

  const currentStaff = staff.find(s => 
    s.userId === user?.id || 
    s.authUserId === user?.id || 
    (s.email && user?.email && s.email.toLowerCase() === user.email.toLowerCase())
  );
  
  const canEditFinancials = isOwner || currentStaff?.permissions?.editFinancials || currentStaff?.permissions?.assistantManager;

  const handleEdit = (transaction: any) => {
    // Format data to match what modal expects
    const editData = {
      ...transaction,
      // Ensure IDs are strings if needed
      patientId: transaction.patientId,
      doctorId: transaction.doctorId,
      labRequestId: transaction.labRequestId,
      recordedById: transaction.recordedById || transaction.recorderId // handle potential naming diffs
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const patientIdParam = params.get('patientId');
    const modalParam = params.get('modal'); // 'income' or 'expense'

    if (patientIdParam && modalParam) {
      setModalType(modalParam as 'income' | 'expense');
      setPreselectedPatientId(patientIdParam);
      setShowModal(true);
    }
  }, [location.search]);

  // --- Chart Data Preparation ---
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

  // Calculate Category Distribution for Pie Chart
  const expenseDistribution = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const pieData = Object.keys(expenseDistribution).map(cat => ({
    name: cat === 'lab' ? 'مختبر' : cat === 'salary' ? 'رواتب' : cat === 'inventory' ? 'مخزون' : cat === 'rent' ? 'إيجار' : cat === 'bills' ? 'فواتير' : cat,
    value: expenseDistribution[cat]
  }));

  const SafePieData = pieData.length > 0 ? pieData : [
    { name: 'رواتب', value: 400 },
    { name: 'مختبر', value: 300 },
    { name: 'مخزون', value: 200 },
    { name: 'أخرى', value: 100 }
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
      {/* KPI Section */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <BentoStatCard
          title="الإيرادات"
          value={`${stats.income.toLocaleString()} د.ع`}
          icon={TrendingUp}
          color="emerald"
          trend={stats.growth >= 0 ? "up" : "down"}
          trendValue={`${Math.abs(stats.growth).toFixed(1)}%`}
          delay={100}
        />
        <BentoStatCard
          title="المصروفات"
          value={`${stats.expenses.toLocaleString()} د.ع`}
          icon={TrendingDown}
          color="red"
          trend="down"
          trendValue="إجمالي"
          delay={200}
        />
        <BentoStatCard
          title="الأرباح الصافية"
          value={`${stats.net.toLocaleString()} د.ع`}
          icon={DollarSign}
          color="blue"
          trend="up"
          trendValue="الصافي"
          delay={300}
        />
        <BentoStatCard
          title="إجمالي المعاملات"
          value={transactions.length}
          icon={Wallet}
          color="purple"
          trend="neutral"
          trendValue="عملية"
          delay={400}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-gray-400" />
                التحليل المالي
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

        {/* Distribution Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-gray-400" />
                توزيع المصروفات
              </h3>
              <p className="text-sm text-gray-500">تحليل فئات الإنفاق</p>
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
              <span className="text-3xl font-bold text-gray-700">{transactions.filter(t => t.type === 'expense').length}</span>
              <span className="text-xs text-gray-400 font-medium">عملية صرف</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-lg text-gray-900">أحدث المعاملات</h3>
            <p className="text-sm text-gray-500">آخر النشاطات المالية المسجلة</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setActiveTab('income')} className="text-gray-600 hover:text-blue-600 border-gray-200">
            عرض السجل الكامل
          </Button>
        </div>
        <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto custom-scrollbar">
          {transactions.slice(0, 10).map(t => (
            <div key={t.id} className="p-4 flex justify-between items-center hover:bg-gray-50/50 transition-colors group">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl transition-colors ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100' : 'bg-rose-50 text-rose-600 group-hover:bg-rose-100'}`}>
                  {t.type === 'income' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-bold text-gray-900 mb-0.5">{t.description}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{t.category}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <span>{t.date.split('T')[0]}</span>
                    {t.relatedPerson && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        <span className="text-blue-600 font-medium">{t.relatedPerson}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="text-left">
                <span className={`font-bold text-lg block mb-0.5 ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}
                  <span className="text-xs text-gray-400 font-normal mr-1">د.ع</span>
                </span>
                <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2 py-1 rounded-lg inline-block">{t.paymentMethod === 'cash' ? 'نقدي' : 'آجل'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderIncomeTab = () => (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <Card>
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg md:text-xl font-bold flex items-center gap-1.5 sm:gap-2 text-gray-900 truncate">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 shrink-0" />
              سجل الإيرادات المتكامل
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 hidden xs:block truncate">تتبع جميع الإيرادات اليدوية والآلية</p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => refresh()} className="p-2 sm:px-3 sm:py-1.5 flex items-center gap-1">
              <RefreshCw className="w-4 h-4 sm:ml-1" />
              <span className="hidden sm:inline">تحديث</span>
            </Button>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20 p-2 sm:px-3 sm:py-1.5 flex items-center gap-1" onClick={() => {
              setModalType('income');
              setPreselectedPatientId(undefined);
              setSelectedTransaction(null);
              setShowModal(true);
            }}>
              <Plus className="w-4 h-4 sm:ml-1" />
              <span className="hidden sm:inline">إيراد يدوي</span>
            </Button>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-b border-gray-100 flex gap-4 overflow-x-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="بحث في السجلات..." className="w-full pr-10 pl-4 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-green-500/20" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 text-gray-500 text-sm font-medium border-b">
              <tr>
                <th className="px-6 py-4 rounded-tr-lg">المعرف / التاريخ</th>
                <th className="px-6 py-4">المريض</th>
                <th className="px-6 py-4">التفاصيل</th>
                <th className="px-6 py-4">المبلغ</th>
                <th className="px-6 py-4">المستلم (الموظف)</th>
                <th className="px-6 py-4 rounded-tl-lg">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.filter(t => t.type === 'income').length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <Wallet className="w-12 h-12 stroke-1 opacity-20" />
                      <p>لا توجد إيرادات مسجلة حتى الآن</p>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.filter(t => t.type === 'income').map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="bg-gray-100 px-2 py-1 rounded font-mono text-xs text-gray-600 inline-block">
                        #{t.id.slice(-6)}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">
                        <span>{t.date.split('T')[0]}</span>
                        <span className="text-gray-400 mr-1.5">{t.date.split('T')[1]?.slice(0, 5)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {t.relatedPerson ? (
                        <>
                          <span className="block font-semibold text-sm text-gray-900">{t.relatedPerson}</span>
                          {t.doctorName && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 block w-fit mt-1">
                              د. {t.doctorName.replace(/^د\.\s*/, '')}
                            </span>
                          )}
                        </>
                      ) : (
                        t.category === 'other' ? (
                          <span className="text-gray-900 font-medium">{t.description || 'إيراد متنوع'}</span>
                        ) : (
                          <span className="text-gray-500 italic">عام</span>
                        )
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{t.description || '-'}</span>
                        <div className="flex gap-1 mt-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
                            {t.category === 'treatment' ? 'علاج' : t.category === 'consultation' ? 'كشفية' : t.category}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-green-600 text-lg">
                      +{t.amount.toLocaleString()}
                      <span className="text-xs text-gray-400 mr-1 font-normal">د.ع</span>
                    </td>
                    {/* Removed Payment Method column */}
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
                    <td className="px-6 py-4">
                      {t.id.startsWith('apt-') ? (
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-gray-400 italic bg-gray-50 px-2 py-0.5 rounded border border-gray-100">نظام (آلي)</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setSelectedDetailsTransaction(t);
                              setShowDetailsModal(true);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
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
            <Button variant="outline" size="sm" onClick={() => refresh()} className="p-2 sm:px-3 sm:py-1.5 flex items-center gap-1">
              <RefreshCw className="w-4 h-4 sm:ml-1" />
              <span className="hidden sm:inline">تحديث</span>
            </Button>
            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 p-2 sm:px-3 sm:py-1.5 flex items-center gap-1" onClick={() => {
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

        <div className="p-4 bg-gray-50 border-b border-gray-100 flex gap-4 overflow-x-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="بحث في المصروفات..." className="w-full pr-10 pl-4 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-red-500/20" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 text-gray-500 text-sm font-medium border-b">
              <tr>
                <th className="px-6 py-4 rounded-tr-lg">المعرف</th>
                <th className="px-6 py-4">التاريخ</th>
                <th className="px-6 py-4">البيان / الجهة</th>
                <th className="px-6 py-4">التصنيف</th>
                <th className="px-6 py-4">المبلغ</th>
                <th className="px-6 py-4">المسؤول (المسجل)</th>
                <th className="px-6 py-4 rounded-tl-lg">إجراءات</th>
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
                    <td className="px-6 py-4 font-mono text-xs text-gray-400">
                      <span className="bg-gray-100 px-2 py-1 rounded">#{t.id.slice(-6)}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="font-bold text-gray-900">{t.date.split('T')[0]}</div>
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
                        {t.category === 'salary' ? 'رواتب' : t.category === 'inventory' ? 'مخزون' : t.category === 'rent' ? 'إيجار' : t.category}
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
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setSelectedDetailsTransaction(t);
                            setShowDetailsModal(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="عرض التفاصيل"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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



  const filteredReceivables = receivables.filter(r => {
    const matchSearch = r.patientName.toLowerCase().includes(receivablesSearch.toLowerCase()) || 
                        (r.treatment_description && r.treatment_description.toLowerCase().includes(receivablesSearch.toLowerCase()));
    const matchDoctor = doctorFilter ? r.assigned_doctor === doctorFilter : true;
    return matchSearch && matchDoctor;
  });

  const uniqueDoctors = Array.from(new Set(receivables.map(r => r.assigned_doctor).filter(Boolean)));

  const totalOutstanding = receivables.reduce((sum, r) => sum + r.remaining, 0);
  
  const currentMonthStart = new Date();
  currentMonthStart.setDate(1);
  currentMonthStart.setHours(0,0,0,0);
  
  const outstandingThisMonth = receivables
    .filter(r => new Date(r.created_at) >= currentMonthStart)
    .reduce((sum, r) => sum + r.remaining, 0);

  const totalSettled = receivables.reduce((sum, r) => sum + (r.paid || 0), 0);
  const activePlansCount = receivables.filter(r => r.remaining > 0).length;

  const renderReceivablesTab = () => (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500" dir="rtl">
      {/* Bento Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
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
          title="المستحق هذا الشهر"
          value={`${outstandingThisMonth.toLocaleString()} د.ع`}
          icon={Calendar}
          color="amber"
          trend="neutral"
          trendValue="الشهر الحالي"
          delay={200}
        />
        <BentoStatCard
          title="إجمالي السداد"
          value={`${totalSettled.toLocaleString()} د.ع`}
          icon={CheckCircle}
          color="emerald"
          trend="up"
          trendValue="المسدد جزئياً"
          delay={300}
        />
        <BentoStatCard
          title="الخطط المستحقة"
          value={activePlansCount}
          icon={FileText}
          color="blue"
          trend="neutral"
          trendValue="خطة نشطة"
          delay={400}
        />
      </div>

      <Card>
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg md:text-xl font-bold flex items-center gap-1.5 sm:gap-2 text-gray-900 truncate">
              <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 shrink-0" />
              إيرادات العلاج (الأرصدة المستحقة)
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 hidden xs:block truncate">تتبع الرصيد المستحق وسداد أقساط الخطط العلاجية للعيادة مباشرة</p>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="بحث باسم المراجع أو العلاج..." 
              className="w-full pr-10 pl-4 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500/20"
              value={receivablesSearch}
              onChange={e => setReceivablesSearch(e.target.value)}
            />
          </div>
          <div className="relative min-w-[200px]">
            <select
              className="w-full border rounded-lg p-2.5 text-right bg-white text-sm"
              value={doctorFilter}
              onChange={e => setDoctorFilter(e.target.value)}
            >
              <option value="">كل الأطباء المعالجين</option>
              {uniqueDoctors.map((docVal: any) => (
                <option key={docVal} value={docVal}>
                  {getDoctorDisplayName(docVal, staff)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">اسم المراجع / الطبيب</th>
                <th className="px-6 py-4">السن</th>
                <th className="px-6 py-4">العلاج</th>
                <th className="px-6 py-4 w-1/3">حالة الدفع (الدفعات)</th>
                <th className="px-6 py-4">الرصيد المستحق</th>
                <th className="px-6 py-4">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loadingReceivables ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 italic">
                    جاري تحميل الأرصدة المستحقة...
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
                  const paid = r.paid || 0;
                  const cost = r.estimated_cost || 0;
                  const paidRatio = cost > 0 ? Math.min(1, paid / cost) : 0;
                  const paidSegments = Math.floor(paidRatio * totalSessions);

                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{r.patientName}</div>
                        <div className="text-xs text-gray-400 mt-0.5">الطبيب: {getDoctorDisplayName(r.assigned_doctor, staff)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-semibold">
                          {r.tooth_numbers && r.tooth_numbers.length > 0 ? r.tooth_numbers.join(', ') : (r.tooth_number || 'عام')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{r.treatment_description || 'خطة علاجية'}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1 h-3 w-full max-w-[150px]">
                          {Array.from({ length: totalSessions }).map((_, idx) => {
                            const isPaid = idx < paidSegments;
                            return (
                              <div
                                key={idx}
                                className={`h-full flex-1 rounded-sm transition-all ${isPaid ? 'bg-green-500' : 'bg-red-200'}`}
                                title={isPaid ? 'مدفوع' : 'غير مدفوع'}
                              />
                            );
                          })}
                        </div>
                        <div className="text-xs text-gray-500 mt-1.5 flex justify-between w-full max-w-[150px]">
                          <span>{totalSessions === 1 ? 'جلسة واحدة' : `${totalSessions} دفعات`}</span>
                          <span>{Math.round(paidRatio * 100)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-red-600 text-base">
                        {r.remaining.toLocaleString()} د.ع
                        <span className="text-[10px] text-gray-400 font-normal block">من أصل {cost.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 py-1.5 px-3 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                          disabled={r.remaining <= 0}
                          onClick={() => {
                            setPreselectedPatientId(r.patient_id);
                            setModalType('income');
                            // Prefill data for ComprehensiveTransactionModal
                            setSelectedTransaction({
                              amount: r.remaining,
                              category: 'treatment',
                              patientId: r.patient_id,
                              treatmentId: r.id,
                              description: `قسط: ${r.treatment_description || 'خطة علاجية'}`
                            });
                            setShowModal(true);
                          }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          سداد دفعة
                        </Button>
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
              <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
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
                    <button className="text-red-500 hover:text-red-700 text-xs">حذف</button>
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
      <div className="flex justify-end">
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>نظرة عامة</button>
          <button onClick={() => setActiveTab('income')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'income' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>الإيرادات</button>
          <button onClick={() => setActiveTab('receivables')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'receivables' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>إيرادات العلاج</button>
          <button onClick={() => setActiveTab('expenses')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'expenses' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>المصروفات</button>
          <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'settings' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>الإعدادات</button>
        </div>
      </div>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'income' && renderIncomeTab()}
      {activeTab === 'receivables' && renderReceivablesTab()}
      {activeTab === 'expenses' && renderExpensesTab()}

      {activeTab === 'settings' && renderSettingsTab()}

      {/* Extracted Transaction Modal */}
      <ComprehensiveTransactionModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedTransaction(null); // Reset
        }}
        type={modalType}
        clinicId={clinicId}
        preselectedPatientId={preselectedPatientId}
        initialData={selectedTransaction}
        onSave={async (data: any) => {
          try {
            if (selectedTransaction) {
              await updateTransaction(selectedTransaction.id, data);
              alert('تم تعديل المعاملة بنجاح');
            } else {
              await addTransaction(data);

              // Inventory Sync Logic
              if (data.category === 'inventory' && data.quantity && data.quantity > 0) {
                if (data.inventoryItemId) {
                  // Update existing item
                  const item = inventory.find(i => i.id === data.inventoryItemId);
                  if (item) {
                    await updateItem(item.id, { quantity: Number(item.quantity) + Number(data.quantity) });
                  }
                } else if (data.itemName) {
                  // Add new item (Simplified)
                  await addItem({
                    name: data.itemName,
                    category: 'materials', // default
                    quantity: Number(data.quantity),
                    unitPrice: data.amount / data.quantity, // derived unit price
                    minStock: 5,
                    unit: 'pcs',
                    supplier: 'راء مباشر',
                    expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString() // Default 1 year expiry
                  });
                  toast.success('تمت إضافة المادة إلى المخزون بنجاح');
                }
              }

              // Lab Order Auto-Update
              if (data.category === 'lab' && data.labRequestId) {
                await updateOrderStatus(data.labRequestId, 'completed', { paymentStatus: 'paid' });
                toast.success('تم تحديث حالة طلب المختبر إلى مكتمل ومدفوع');
              }

              // 3. Asset Creation (New)
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
      />
    </div>
  );
};

const formatDate = (date: string) => new Date(date).toLocaleDateString('ar-IQ');