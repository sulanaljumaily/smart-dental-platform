import React, { useState, useMemo } from 'react';
import { Card } from '../../../../../components/common/Card';
import { Button } from '../../../../../components/common/Button';
import { 
    Building2, 
    Plus, 
    Edit2, 
    Trash2, 
    Check, 
    X, 
    Sliders, 
    ShieldCheck, 
    Wallet, 
    Info, 
    CheckCircle2,
    AlertCircle,
    ArrowUpRight,
    ArrowDownRight,
    History,
    Calendar,
    DollarSign,
    RefreshCw,
    Receipt,
    Layers,
    FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';
import { useClinicDepartments, ClinicDepartment } from '../../../../../hooks/useClinicDepartments';
import { useFinance } from '../../../../../hooks/useFinance';
import { useInventory } from '../../../../../hooks/useInventory';
import { useInventoryMovements } from '../../../../../hooks/useInventoryMovements';
import { useAuth } from '../../../../../contexts/AuthContext';
import { formatCurrency } from '../../../../../lib/utils';

interface AssetsSettingsProps {
    clinicId?: string;
}

export const AssetsSettings: React.FC<AssetsSettingsProps> = ({ clinicId }) => {
    const { user } = useAuth();

    // Data Hooks
    const { 
        departments, 
        loading: deptLoading, 
        addDepartment, 
        updateDepartment, 
        deleteDepartment 
    } = useClinicDepartments(clinicId);

    const { transactions, loading: financeLoading, addTransaction } = useFinance(clinicId);
    const { inventory, loading: invLoading } = useInventory(clinicId);
    const { movements } = useInventoryMovements(clinicId);

    // Active Tab inside Settings & Treasury
    const [activeSection, setActiveSection] = useState<'treasury' | 'departments' | 'policies'>('treasury');

    // --- Modal State for Adding Funds to Warehouse Custody ---
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [depositAmount, setDepositAmount] = useState<string>('');
    const [depositDate, setDepositDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [depositNotes, setDepositNotes] = useState<string>('تغذية عهدة المخزن لشراء مواد ومستلزمات طبية');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank'>('cash');
    const [submittingDeposit, setSubmittingDeposit] = useState(false);

    // --- Department Management State ---
    const [isAddingDept, setIsAddingDept] = useState(false);
    const [newDeptName, setNewDeptName] = useState('');
    const [newDeptDesc, setNewDeptDesc] = useState('');

    const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
    const [editDeptName, setEditDeptName] = useState('');
    const [editDeptDesc, setEditDeptDesc] = useState('');

    // --- Financial Calculations for Warehouse Treasury ---
    const treasuryMetrics = useMemo(() => {
        // 1. All finance expenses dedicated for inventory purchases
        const inventoryExpenses = transactions.filter(t => 
            t.type === 'expense' && (t.category === 'inventory' || t.sourceType === 'inventory')
        );

        const totalInflows = inventoryExpenses.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        // 2. Total Current Stock Valuation (Total inventory value)
        const totalStockValue = inventory.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.unitPrice)), 0);

        // 3. Total Dispensed Value
        const totalDispensedValue = movements
            .filter(m => m.movementType === 'out')
            .reduce((sum, m) => sum + (Number(m.totalCost) || 0), 0);

        // 4. Warehouse Custody Balance: Inflows from Finance minus Stock Value
        const custodyBalance = totalInflows - totalStockValue;

        return {
            inventoryExpenses,
            totalInflows,
            totalStockValue,
            totalDispensedValue,
            custodyBalance,
            transfersCount: inventoryExpenses.length
        };
    }, [transactions, inventory, movements]);

    // Handle Adding New Deposit / Transfer from Finance
    const handleDepositSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(depositAmount);
        if (!amt || amt <= 0) {
            toast.error('يرجى إدخال مبلغ صحيح');
            return;
        }

        setSubmittingDeposit(true);
        try {
            await addTransaction({
                type: 'expense',
                category: 'inventory',
                amount: amt,
                description: depositNotes.trim() || 'تغذية عهدة المخزن النقدية',
                date: depositDate || new Date().toISOString().split('T')[0],
                paymentMethod: paymentMethod,
                recordedById: user?.id
            });

            toast.success(`تم تحويل ${formatCurrency(amt)} إلى صندوق المخزن المالي بنجاح`);
            setShowDepositModal(false);
            setDepositAmount('');
            setDepositNotes('تغذية عهدة المخزن لشراء مواد ومستلزمات طبية');
        } catch (err: any) {
            console.error('Error adding fund deposit:', err);
            toast.error(err.message || 'حدث خطأ أثناء تسجيل التحويل المالي');
        } finally {
            setSubmittingDeposit(false);
        }
    };

    // Quick Action to Settle Deficit
    const handleQuickSettleDeficit = () => {
        const deficit = Math.abs(treasuryMetrics.custodyBalance);
        setDepositAmount(deficit.toString());
        setDepositNotes(`تسوية ومطابقة عهدة المخزن لتصفير العجز (${formatCurrency(deficit)})`);
        setShowDepositModal(true);
    };

    // Department CRUD Handlers
    const handleStartEditDept = (dept: ClinicDepartment) => {
        setEditingDeptId(dept.id);
        setEditDeptName(dept.name);
        setEditDeptDesc(dept.description || '');
    };

    const handleSaveEditDept = async (id: string) => {
        if (!editDeptName.trim()) return;
        await updateDepartment(id, {
            name: editDeptName.trim(),
            description: editDeptDesc.trim()
        });
        setEditingDeptId(null);
        toast.success('تم تحديث اسم القسم بنجاح');
    };

    const handleCreateDept = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDeptName.trim()) return;

        await addDepartment(newDeptName.trim(), newDeptDesc.trim());
        setNewDeptName('');
        setNewDeptDesc('');
        setIsAddingDept(false);
        toast.success('تم إضافة القسم بنجاح');
    };

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-800 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                            <Wallet className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">إدارة وصندوق المخزن المالي</h2>
                            <p className="text-blue-100 text-xs sm:text-sm mt-0.5">
                                متابعة تحويلات قسم المالية، رصيد عهدة المخزن، وكشف حساب المشتريات والأقسام
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => setShowDepositModal(true)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-500/20"
                        >
                            <Plus className="w-4 h-4 ml-1.5" />
                            تحويل مالي جديد للمخزن
                        </Button>
                    </div>
                </div>

                {/* Sub Navigation Tabs */}
                <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/15 overflow-x-auto scrollbar-hide">
                    {[
                        { id: 'treasury', label: '🏦 الصندوق المالي للعهدة', count: treasuryMetrics.transfersCount },
                        { id: 'departments', label: '🏢 أقسام وعيادات المركز', count: departments.length },
                        { id: 'policies', label: '📋 سياسات العهدة والتنبيهات' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSection(tab.id as any)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                activeSection === tab.id
                                    ? 'bg-white text-blue-900 shadow-md font-extrabold'
                                    : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
                            }`}
                        >
                            <span>{tab.label}</span>
                            {tab.count !== undefined && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                    activeSection === tab.id ? 'bg-blue-100 text-blue-900' : 'bg-white/20 text-white'
                                }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* SECTION 1: WAREHOUSE TREASURY (الصندوق المالي لعهدة المخزن) */}
            {activeSection === 'treasury' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                    {/* Status Alert Banner (Deficit vs Surplus) */}
                    {treasuryMetrics.custodyBalance < 0 ? (
                        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 shadow-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-start gap-3.5">
                                    <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-red-500/20">
                                        <AlertCircle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-extrabold text-red-900 text-base">
                                                المخزن يطلب العيادة (عجز في العهدة النقدية)
                                            </h3>
                                            <span className="bg-red-200/80 text-red-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                                                مطلوب تسوية من المالية
                                            </span>
                                        </div>
                                        <p className="text-xs text-red-700 mt-1 leading-relaxed">
                                            تم شراء بضاعة ومستلزمات بقيمة إجمالية <span className="font-bold">{formatCurrency(treasuryMetrics.totalStockValue)}</span>، بينما إجمالي المبالغ المحولة من المالية هي <span className="font-bold">{formatCurrency(treasuryMetrics.totalInflows)}</span>. 
                                            المخزن يطلب العيادة مبلغ <span className="font-extrabold text-sm">{formatCurrency(Math.abs(treasuryMetrics.custodyBalance))}</span> لتغطية الفارق وتصفير العهدة.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Button
                                        onClick={handleQuickSettleDeficit}
                                        className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md px-4 py-2"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5 ml-1.5" />
                                        تسوية وتصفير العجز الآن
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-xs">
                            <div className="flex items-start gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-extrabold text-emerald-900 text-base">
                                            فائض سيولة نقدية في عهدة المخزن
                                        </h3>
                                        <span className="bg-emerald-200/80 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                                            رصيد متاح للشراء
                                        </span>
                                    </div>
                                    <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                                        المبالغ المحولة من المالية تفوق المشتريات المسجلة. يتوفر في عهدة المخزن رصيد فائض قدره <span className="font-bold">{formatCurrency(treasuryMetrics.custodyBalance)}</span> جاهز للاستخدام في مشتريات قادمة.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Treasury 4 Cards Breakdown */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        {/* Inflows */}
                        <Card className="p-4 bg-gradient-to-br from-blue-50 to-white border-blue-100">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-blue-700">المحـوّل من المالية (العهدة)</span>
                                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                                    <ArrowDownRight className="w-4 h-4" />
                                </div>
                            </div>
                            <h4 className="text-lg sm:text-xl font-extrabold text-blue-950">
                                {formatCurrency(treasuryMetrics.totalInflows)}
                            </h4>
                            <p className="text-[11px] text-gray-500 mt-1">
                                عدد سندات الصرف: {treasuryMetrics.transfersCount}
                            </p>
                        </Card>

                        {/* Inventory Value */}
                        <Card className="p-4 bg-gradient-to-br from-slate-50 to-white border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-gray-700">قيمة بضاعة المخزن</span>
                                <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center">
                                    <DollarSign className="w-4 h-4" />
                                </div>
                            </div>
                            <h4 className="text-lg sm:text-xl font-extrabold text-gray-900">
                                {formatCurrency(treasuryMetrics.totalStockValue)}
                            </h4>
                            <p className="text-[11px] text-gray-500 mt-1">
                                إجمالي العناصر: {inventory.length} مادة
                            </p>
                        </Card>

                        {/* Dispensed Materials Value */}
                        <Card className="p-4 bg-gradient-to-br from-purple-50 to-white border-purple-100">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-purple-700">المواد المصروفة للعيادات</span>
                                <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                                    <ArrowUpRight className="w-4 h-4" />
                                </div>
                            </div>
                            <h4 className="text-lg sm:text-xl font-extrabold text-purple-950">
                                {formatCurrency(treasuryMetrics.totalDispensedValue)}
                            </h4>
                            <p className="text-[11px] text-gray-500 mt-1">
                                استهلاك موثق بالعيادات
                            </p>
                        </Card>

                        {/* Net Balance */}
                        <Card className={`p-4 border ${
                            treasuryMetrics.custodyBalance >= 0 
                                ? 'bg-gradient-to-br from-emerald-50 to-white border-emerald-200' 
                                : 'bg-gradient-to-br from-red-50 to-white border-red-200'
                        }`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-xs font-semibold ${treasuryMetrics.custodyBalance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                    {treasuryMetrics.custodyBalance >= 0 ? 'فائض العهدة' : 'عجز العهدة (مطلوب)'}
                                </span>
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                    treasuryMetrics.custodyBalance >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                                }`}>
                                    <Wallet className="w-4 h-4" />
                                </div>
                            </div>
                            <h4 className={`text-lg sm:text-xl font-extrabold ${
                                treasuryMetrics.custodyBalance >= 0 ? 'text-emerald-950' : 'text-red-950'
                            }`}>
                                {formatCurrency(Math.abs(treasuryMetrics.custodyBalance))}
                            </h4>
                            <p className="text-[11px] text-gray-500 mt-1">
                                {treasuryMetrics.custodyBalance >= 0 ? 'متاح نقداً بالعهدة' : 'العيادة مطالبة بتسويته'}
                            </p>
                        </Card>
                    </div>

                    {/* Financial Ledger Table (كشف حساب المبالغ المحولة من المالية) */}
                    <Card>
                        <div className="p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-gray-100">
                                <div>
                                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                        <Receipt className="w-5 h-5 text-blue-600" />
                                        <span>كشف حساب تحويلات المالية لعهدة المخزن ({treasuryMetrics.inventoryExpenses.length})</span>
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        سجل كافة المبالغ المالية التي تم صرفها وتحويلها من قسم المالية إلى المخزن
                                    </p>
                                </div>

                                <Button
                                    onClick={() => setShowDepositModal(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                                >
                                    <Plus className="w-4 h-4 ml-1.5" />
                                    تسجيل تحويل مالي للعهدة
                                </Button>
                            </div>

                            {treasuryMetrics.inventoryExpenses.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <Receipt className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm font-semibold">لم يتم تسجيل أي سندات صرف لمشتريات المخزون في المالية بعد.</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        عند تسجيل مصروف في المالية بنوع "مشتريات مخزون" أو النقر على "تحويل مالي جديد"، سيظهر هنا فوراً.
                                    </p>
                                    <Button
                                        onClick={() => setShowDepositModal(true)}
                                        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                                    >
                                        <Plus className="w-4 h-4 ml-1" /> إضافة أول تحويل مالي
                                    </Button>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-right text-xs">
                                        <thead>
                                            <tr className="border-b border-gray-100 text-gray-500 font-semibold">
                                                <th className="pb-3 px-3">التاريخ</th>
                                                <th className="pb-3 px-3">رقم السند</th>
                                                <th className="pb-3 px-3">البيان / الوصف</th>
                                                <th className="pb-3 px-3">طريقة الدفع</th>
                                                <th className="pb-3 px-3">المسجل / المستلم</th>
                                                <th className="pb-3 px-3 font-bold text-gray-900">المبلغ المحول</th>
                                                <th className="pb-3 px-3">الحالة</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {treasuryMetrics.inventoryExpenses.map((tx) => (
                                                <tr key={tx.id} className="hover:bg-gray-50/60 transition-colors">
                                                    <td className="py-3.5 px-3 text-gray-600 font-medium whitespace-nowrap">
                                                        {tx.date ? new Date(tx.date).toLocaleDateString('ar-EG', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric'
                                                        }) : '-'}
                                                    </td>
                                                    <td className="py-3.5 px-3 font-mono text-[11px] text-gray-500">
                                                        #{tx.id.substring(0, 8)}
                                                    </td>
                                                    <td className="py-3.5 px-3 font-bold text-gray-900">
                                                        {tx.description || 'مشتريات مخزون ومواد طبية'}
                                                        {tx.relatedPerson && (
                                                            <span className="text-[10px] text-gray-500 block font-normal">
                                                                المورد: {tx.relatedPerson}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-3 text-gray-600">
                                                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                                                            {tx.paymentMethod === 'card' ? 'بطاقة' : tx.paymentMethod === 'bank' ? 'تحويل بنكي' : 'نقدي'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-3 text-gray-600">
                                                        {tx.recorderName || 'المحاسب'}
                                                    </td>
                                                    <td className="py-3.5 px-3 font-extrabold text-blue-700 text-sm">
                                                        {formatCurrency(tx.amount)}
                                                    </td>
                                                    <td className="py-3.5 px-3">
                                                        <span className="bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit">
                                                            <CheckCircle2 className="w-3 h-3" /> مكتمل
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            )}

            {/* SECTION 2: CLINIC DEPARTMENTS MANAGEMENT (إدارة أقسام وعيادات المركز) */}
            {activeSection === 'departments' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                    <Card>
                        <div className="p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-gray-100">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-5 h-5 text-blue-600" />
                                        <h3 className="text-lg font-bold text-gray-900">أقسام وعيادات المركز</h3>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        الأقسام المعرفة هنا تظهر تلقائياً في نافذة صرف المواد وتوزيع الاستهلاك اليومي
                                    </p>
                                </div>
                                {!isAddingDept && (
                                    <Button
                                        onClick={() => setIsAddingDept(true)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0"
                                    >
                                        <Plus className="w-4 h-4 ml-1.5" />
                                        إضافة قسم أو عيادة جديدة
                                    </Button>
                                )}
                            </div>

                            {/* Add Department Form */}
                            {isAddingDept && (
                                <form onSubmit={handleCreateDept} className="my-5 p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3 animate-in fade-in duration-200">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-blue-900">إضافة قسم أو عيادة جديدة:</span>
                                        <button
                                            type="button"
                                            onClick={() => setIsAddingDept(false)}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                اسم القسم / العيادة <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={newDeptName}
                                                onChange={(e) => setNewDeptName(e.target.value)}
                                                placeholder="مثال: عيادة التقويم، غرفة الجراحة..."
                                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                                autoFocus
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                                الوصف أو الملاحظات (اختياري)
                                            </label>
                                            <input
                                                type="text"
                                                value={newDeptDesc}
                                                onChange={(e) => setNewDeptDesc(e.target.value)}
                                                placeholder="مثال: العيادة رقم 2 في الطابق الأول"
                                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setIsAddingDept(false)}
                                            className="text-gray-500 hover:bg-gray-100 text-xs"
                                        >
                                            إلغاء
                                        </Button>
                                        <Button
                                            type="submit"
                                            size="sm"
                                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4"
                                        >
                                            حفظ القسم
                                        </Button>
                                    </div>
                                </form>
                            )}

                            {/* Departments List */}
                            <div className="mt-5">
                                {deptLoading ? (
                                    <div className="text-center py-8 text-sm text-gray-500">جاري تحميل الأقسام...</div>
                                ) : departments.length === 0 ? (
                                    <div className="text-center py-8 text-sm text-gray-400">
                                        لم يتم تسجيل أي أقسام بعد.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {departments.map((dept, idx) => (
                                            <div key={dept.id} className="py-3.5 flex items-center justify-between gap-4 group">
                                                {editingDeptId === dept.id ? (
                                                    <div className="flex-1 flex flex-col sm:flex-row items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={editDeptName}
                                                            onChange={(e) => setEditDeptName(e.target.value)}
                                                            className="flex-1 px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                                            autoFocus
                                                        />
                                                        <input
                                                            type="text"
                                                            value={editDeptDesc}
                                                            onChange={(e) => setEditDeptDesc(e.target.value)}
                                                            placeholder="الوصف..."
                                                            className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                                        />
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => handleSaveEditDept(dept.id)}
                                                                className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-xs"
                                                                title="حفظ التعديل"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingDeptId(null)}
                                                                className="p-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg"
                                                                title="إلغاء"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex items-center gap-3">
                                                            <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center border border-blue-100">
                                                                {idx + 1}
                                                            </span>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-sm text-gray-900">{dept.name}</span>
                                                                    {departments.length === 1 && (
                                                                        <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                                                                            القسم المعتمد افتراضياً
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {dept.description && (
                                                                    <p className="text-xs text-gray-500 mt-0.5">{dept.description}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => handleStartEditDept(dept)}
                                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                title="تعديل اسم القسم"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            {departments.length > 1 && (
                                                                <button
                                                                    onClick={() => {
                                                                        if (window.confirm(`هل أنت متأكد من حذف قسم "${dept.name}"؟`)) {
                                                                            deleteDepartment(dept.id);
                                                                            toast.success('تم حذف القسم بنجاح');
                                                                        }
                                                                    }}
                                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                    title="حذف القسم"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* SECTION 3: POLICIES & AUDIT */}
            {activeSection === 'policies' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
                    <Card>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-2.5 text-blue-700">
                                <Wallet className="w-5 h-5" />
                                <h4 className="font-bold text-sm">ضوابط وحسابات عهدة المخزن</h4>
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                صندوق عهدة المخزن المالي يمثل حلقة الوصل المحاسبية بين الإدارة المالية وأمين المخزن:
                            </p>
                            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 space-y-2 text-xs">
                                <div className="flex items-center gap-2 text-gray-800 font-semibold">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>المبالغ المحولة من المالية:</span>
                                </div>
                                <p className="text-gray-500 text-[11px] mr-6">
                                    كل مبلغ يصرف من قسم المالية بنوع "مشتريات مخزون" يقيد كسيولة واردة للصندوق.
                                </p>
                                <div className="flex items-center gap-2 text-gray-800 font-semibold pt-1">
                                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                    <span>العجز / المخزن يطلب العيادة:</span>
                                </div>
                                <p className="text-gray-500 text-[11px] mr-6">
                                    إذا تم شراء مواد بالآجل أو دفع مبالغ تزيد عن السيولة المحولة، يظهر الرصيد بالسالب مع إشعار لإجراء تسوية مالية.
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="p-6 space-y-3">
                            <div className="flex items-center gap-2 text-gray-800">
                                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                                <h4 className="font-bold text-sm">سياسة صرف واستهلاك المواد</h4>
                            </div>
                            <ul className="text-xs text-gray-600 space-y-2 list-disc list-inside">
                                <li>عند إنقاص كمية أي مادة تفتح نافذة توثيق الصرف تلقائياً.</li>
                                <li>يتم احتساب القيمة المالية للصرفية فورياً (<span className="font-semibold text-gray-800">الكمية × سعر الوحدة</span>).</li>
                                <li>تحديد المستلم والقسم اختياري لتسهيل الصرف السريع.</li>
                                <li>إذا كانت العيادة تحتوي على قسم واحد، يتم اختياره آلياً دون الحاجة للتدخل اليدوي.</li>
                            </ul>
                        </div>
                    </Card>
                </div>
            )}

            {/* Deposit Modal (تحويل مالي جديد لعهدة المخزن) */}
            {showDepositModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                                    <Wallet className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900">تحويل مالي لعهدة المخزن</h3>
                                    <p className="text-[11px] text-gray-500">تسجيل تغذية نقدية من المالية لعهدة المخزن</p>
                                </div>
                            </div>
                            <button onClick={() => setShowDepositModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleDepositSubmit} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    المبلغ المحول (د.ع) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="1000"
                                    step="1000"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    placeholder="مثال: 250000"
                                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-extrabold text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                    autoFocus
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">تاريخ التحويل</label>
                                    <input
                                        type="date"
                                        value={depositDate}
                                        onChange={(e) => setDepositDate(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">طريقة الدفع</label>
                                    <select
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="cash">نقدي (كاش)</option>
                                        <option value="bank">تحويل بنكي</option>
                                        <option value="card">بطاقة دفع</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">البيان / سبب التحويل</label>
                                <input
                                    type="text"
                                    value={depositNotes}
                                    onChange={(e) => setDepositNotes(e.target.value)}
                                    placeholder="ملاحظات التحويل المالي..."
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setShowDepositModal(false)}
                                    disabled={submittingDeposit}
                                    className="text-xs text-gray-500"
                                >
                                    إلغاء
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={submittingDeposit}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4"
                                >
                                    {submittingDeposit ? 'جاري تسجيل التحويل...' : 'تأكيد تسجيل التحويل'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
