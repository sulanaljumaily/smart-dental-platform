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
    FileSpreadsheet,
    ShoppingCart,
    Package
} from 'lucide-react';
import { toast } from 'sonner';
import { useClinicDepartments, ClinicDepartment } from '../../../../../hooks/useClinicDepartments';
import { useFinance } from '../../../../../hooks/useFinance';
import { useInventory } from '../../../../../hooks/useInventory';
import { useInventoryMovements } from '../../../../../hooks/useInventoryMovements';
import { useWarehousePurchases } from '../../../../../hooks/useWarehousePurchases';
import { useAssets } from '../../../../../hooks/useAssets';
import { useStaff } from '../../../../../hooks/useStaff';
import { useAuth } from '../../../../../contexts/AuthContext';
import { AddPurchaseModal } from '../../../../../components/inventory/AddPurchaseModal';
import { formatCurrency } from '../../../../../lib/utils';

interface AssetsSettingsProps {
    clinicId?: string;
}

export const AssetsSettings: React.FC<AssetsSettingsProps> = ({ clinicId }) => {
    const { user } = useAuth();
    const { staff } = useStaff(clinicId || '0');

    const currentStaff = staff.find(s => 
        s.userId === user?.id || 
        s.authUserId === user?.id || 
        (s.email && user?.email && s.email.toLowerCase() === user.email.toLowerCase()) ||
        (s.name && user?.name && s.name.toLowerCase().trim() === user.name.toLowerCase().trim())
    );

    // Data Hooks
    const { 
        departments, 
        loading: deptLoading, 
        addDepartment, 
        updateDepartment, 
        deleteDepartment 
    } = useClinicDepartments(clinicId);

    const { transactions, loading: financeLoading } = useFinance(clinicId);
    const { inventory, loading: invLoading } = useInventory(clinicId);
    const { movements } = useInventoryMovements(clinicId);
    const { assets } = useAssets(clinicId);
    const { 
        purchases, 
        totalPurchasesAmount, 
        pendingSettlementRequest, 
        createSettlementRequest, 
        cancelSettlementRequest, 
        deletePurchase 
    } = useWarehousePurchases(clinicId);

    // Active Tab inside Settings & Treasury
    const [activeSection, setActiveSection] = useState<'treasury' | 'departments' | 'policies'>('treasury');

    // Purchase Modal & Treasury Ledger Tab
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [treasuryLedgerTab, setTreasuryLedgerTab] = useState<'purchases' | 'transfers' | 'dispenses'>('purchases');

    // --- Department Management State ---
    const [isAddingDept, setIsAddingDept] = useState(false);
    const [newDeptName, setNewDeptName] = useState('');
    const [newDeptDesc, setNewDeptDesc] = useState('');

    const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
    const [editDeptName, setEditDeptName] = useState('');
    const [editDeptDesc, setEditDeptDesc] = useState('');

    // --- Financial Calculations for Warehouse Treasury ---
    const treasuryMetrics = useMemo(() => {
        // 1. All finance expenses dedicated for inventory purchases & asset purchases
        const inventoryExpenses = transactions.filter(t => 
            t.type === 'expense' && (t.category === 'inventory' || t.category === 'materials' || t.category === 'supplies' || t.category === 'asset_purchase' || t.sourceType === 'inventory')
        );

        const totalInflows = inventoryExpenses.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        // 2. Total Purchases (from warehouse purchases ledger or initial stock valuation)
        const totalStockValue = inventory.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.unitPrice)), 0);
        const totalPurchases = totalPurchasesAmount > 0 ? totalPurchasesAmount : totalStockValue;

        // 3. Fixed Assets Total Cost
        const totalFixedAssetsCost = assets.reduce((sum, a) => sum + (Number(a.purchaseCost) || 0), 0);

        // 4. Total Dispensed Value
        const totalDispensedValue = movements
            .filter(m => m.movementType === 'out')
            .reduce((sum, m) => sum + (Number(m.totalCost) || 0), 0);

        // 5. Warehouse Custody Balance: Inflows from Finance minus Total Purchases
        const custodyBalance = totalInflows - totalPurchases;

        return {
            inventoryExpenses,
            totalInflows,
            totalPurchases,
            totalStockValue,
            totalFixedAssetsCost,
            totalDispensedValue,
            custodyBalance,
            transfersCount: inventoryExpenses.length,
            purchasesCount: purchases.length
        };
    }, [transactions, inventory, movements, assets, totalPurchasesAmount, purchases]);

    // Handle Requesting Settlement from Finance
    const handleSendSettlementRequest = async () => {
        const deficit = Math.abs(treasuryMetrics.custodyBalance);
        if (deficit <= 0) {
            toast.info('لا يوجد عجز مالي في العهدة لطلب تسويته');
            return;
        }

        await createSettlementRequest(
            deficit,
            `طلب تسوية عهدة المخزن لتغطية مشتريات بمبلغ ${formatCurrency(deficit)}`,
            currentStaff?.name || user?.name || 'أمين المخزن'
        );
        toast.success(`تم إرسال طلب تسوية بمبلغ ${formatCurrency(deficit)} إلى قسم المالية بنجاح`);
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
                            onClick={() => setShowPurchaseModal(true)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-500/20"
                        >
                            <ShoppingCart className="w-4 h-4 ml-1.5" />
                            إضافة مشتريات جديدة
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
                    {/* Status Alert Banner (Deficit vs Surplus vs Pending Settlement) */}
                    {treasuryMetrics.custodyBalance < 0 ? (
                        pendingSettlementRequest && pendingSettlementRequest.status === 'pending' ? (
                            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 shadow-xs">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-start gap-3.5">
                                        <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                                            <History className="w-5 h-5 animate-spin" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-extrabold text-amber-950 text-base">
                                                    طلب تسوية العهدة مرسل إلى قسم المالية
                                                </h3>
                                                <span className="bg-amber-200 text-amber-900 text-xs px-2.5 py-0.5 rounded-full font-bold">
                                                    قيد انتظار اعتماد المحاسب
                                                </span>
                                            </div>
                                            <p className="text-xs text-amber-900/80 mt-1 leading-relaxed">
                                                تم إرسال طلب لتصفير وتسوية العجز بمبلغ <span className="font-extrabold text-amber-950">{formatCurrency(pendingSettlementRequest.requestedAmount)}</span> بتاريخ {new Date(pendingSettlementRequest.requestedAt).toLocaleDateString('ar-EG')}. سيتم تصفير العجز وتغذية العهدة فور اعتماد المحاسب لسند الصرف في شاشة المالية.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                if (window.confirm('هل أنت متأكد من إلغاء طلب التسوية المرسل للمالية؟')) {
                                                    cancelSettlementRequest(pendingSettlementRequest.id);
                                                    toast.info('تم إلغاء طلب التسوية');
                                                }
                                            }}
                                            className="border-amber-300 text-amber-900 hover:bg-amber-100 text-xs font-semibold"
                                        >
                                            إلغاء الطلب
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
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
                                                إجمالي المشتريات الفعلية المسجلة بلغت <span className="font-bold">{formatCurrency(treasuryMetrics.totalPurchases)}</span>، بينما المبالغ المحولة من المالية هي <span className="font-bold">{formatCurrency(treasuryMetrics.totalInflows)}</span>. 
                                                المخزن يطلب العيادة مبلغ <span className="font-extrabold text-sm">{formatCurrency(Math.abs(treasuryMetrics.custodyBalance))}</span> لتغطية الفارق وتصفير العهدة.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Button
                                            onClick={handleSendSettlementRequest}
                                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md px-4 py-2"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5 ml-1.5" />
                                            طلب تسوية عهدة من المالية
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )
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

                        {/* Actual Purchases (Inventory + Fixed Assets) */}
                        <Card className="p-4 bg-gradient-to-br from-slate-50 to-white border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-gray-700">إجمالي المشتريات الفعلية</span>
                                <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center">
                                    <ShoppingCart className="w-4 h-4" />
                                </div>
                            </div>
                            <h4 className="text-lg sm:text-xl font-extrabold text-gray-900">
                                {formatCurrency(treasuryMetrics.totalPurchases)}
                            </h4>
                            <p className="text-[11px] text-gray-500 mt-1">
                                {purchases.length > 0 ? `عدد الفواتير: ${purchases.length}` : `مخزون: ${inventory.length} مادة`}
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

                    {/* Financial Ledger Section (Multi-Tab) */}
                    <Card>
                        <div className="p-6">
                            {/* Ledger Tab Headers */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
                                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 sm:pb-0">
                                    <button
                                        onClick={() => setTreasuryLedgerTab('purchases')}
                                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                            treasuryLedgerTab === 'purchases'
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        <ShoppingCart className="w-3.5 h-3.5" />
                                        <span>سجل فواتير المشتريات</span>
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                            treasuryLedgerTab === 'purchases' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                                        }`}>
                                            {purchases.length}
                                        </span>
                                    </button>

                                    <button
                                        onClick={() => setTreasuryLedgerTab('transfers')}
                                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                            treasuryLedgerTab === 'transfers'
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        <Receipt className="w-3.5 h-3.5" />
                                        <span>تحويلات المالية للعهدة</span>
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                            treasuryLedgerTab === 'transfers' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                                        }`}>
                                            {treasuryMetrics.transfersCount}
                                        </span>
                                    </button>

                                    <button
                                        onClick={() => setTreasuryLedgerTab('dispenses')}
                                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                            treasuryLedgerTab === 'dispenses'
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                        <span>صرف واستهلاك الأقسام</span>
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                            treasuryLedgerTab === 'dispenses' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                                        }`}>
                                            {movements.filter(m => m.movementType === 'out').length}
                                        </span>
                                    </button>
                                </div>

                                {treasuryLedgerTab === 'purchases' && (
                                    <Button
                                        onClick={() => setShowPurchaseModal(true)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0 shadow-xs"
                                    >
                                        <Plus className="w-4 h-4 ml-1.5" />
                                        إضافة مشتريات
                                    </Button>
                                )}
                            </div>

                            {/* TAB 1: Purchases Ledger */}
                            {treasuryLedgerTab === 'purchases' && (
                                purchases.length === 0 ? (
                                    <div className="text-center py-12 text-gray-400">
                                        <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30 text-blue-600" />
                                        <p className="text-sm font-semibold text-gray-700">لم يتم تسجيل أي فواتير مشتريات للمخزن أو الأصول بعد.</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            يمكنك تسجيل فاتورة مشتريات جديدة وتحديد البنود أو السعر الإجمالي مباشرة.
                                        </p>
                                        <Button
                                            onClick={() => setShowPurchaseModal(true)}
                                            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                                        >
                                            <Plus className="w-4 h-4 ml-1" /> إضافة أول فاتورة مشتريات
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-right text-xs">
                                            <thead>
                                                <tr className="border-b border-gray-100 text-gray-500 font-semibold">
                                                    <th className="pb-3 px-3">التاريخ</th>
                                                    <th className="pb-3 px-3">رقم الفاتورة</th>
                                                    <th className="pb-3 px-3">نوع الأصل</th>
                                                    <th className="pb-3 px-3">تفاصيل المواد / المورد</th>
                                                    <th className="pb-3 px-3">طريقة الدفع</th>
                                                    <th className="pb-3 px-3">المسجل</th>
                                                    <th className="pb-3 px-3 font-bold text-gray-900">المبلغ الإجمالي</th>
                                                    <th className="pb-3 px-3 text-center">إجراءات</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {purchases.map((purchase) => (
                                                    <tr key={purchase.id} className="hover:bg-gray-50/60 transition-colors">
                                                        <td className="py-3.5 px-3 text-gray-600 font-medium whitespace-nowrap">
                                                            {purchase.purchaseDate ? new Date(purchase.purchaseDate).toLocaleDateString('ar-EG', {
                                                                year: 'numeric',
                                                                month: 'short',
                                                                day: 'numeric'
                                                            }) : '-'}
                                                        </td>
                                                        <td className="py-3.5 px-3 font-mono text-[11px] text-gray-500">
                                                            {purchase.invoiceNumber ? `#${purchase.invoiceNumber}` : `#${purchase.id.substring(0, 7)}`}
                                                        </td>
                                                        <td className="py-3.5 px-3">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                purchase.purchaseType === 'fixed_asset'
                                                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                                            }`}>
                                                                {purchase.purchaseType === 'fixed_asset' ? '🏢 أصول ثابتة' : '📦 مخزون مستهلك'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-3">
                                                            <div className="font-bold text-gray-900">
                                                                {purchase.items && purchase.items.length > 0 ? (
                                                                    <span>
                                                                        {purchase.items.map(i => i.name).join('، ')}
                                                                        <span className="text-gray-400 font-normal text-[11px] mr-1">
                                                                            ({purchase.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)} قطعة)
                                                                        </span>
                                                                    </span>
                                                                ) : (
                                                                    <span>مشتريات عامة</span>
                                                                )}
                                                            </div>
                                                            {(purchase.supplier || purchase.notes) && (
                                                                <div className="text-[10px] text-gray-500 mt-0.5">
                                                                    {purchase.supplier && <span>المورد: {purchase.supplier} </span>}
                                                                    {purchase.notes && <span className="text-gray-400 font-normal">- {purchase.notes}</span>}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-3.5 px-3 text-gray-600">
                                                            <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-[10px] font-medium">
                                                                {purchase.paymentMethod === 'card' ? 'بطاقة' : purchase.paymentMethod === 'bank' ? 'تحويل بنكي' : purchase.paymentMethod === 'credit' ? 'آجل' : 'نقدي'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-3 text-gray-600">
                                                            {purchase.recorderName || 'أمين المخزن'}
                                                        </td>
                                                        <td className="py-3.5 px-3 font-extrabold text-gray-900 text-sm">
                                                            {formatCurrency(purchase.totalAmount)}
                                                        </td>
                                                        <td className="py-3.5 px-3 text-center">
                                                            <button
                                                                onClick={async () => {
                                                                    if (window.confirm('هل أنت متأكد من حذف هذه الفاتورة من سجل المشتريات؟')) {
                                                                        await deletePurchase(purchase.id);
                                                                        toast.success('تم حذف فاتورة المشتريات بنجاح');
                                                                    }
                                                                }}
                                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="حذف الفاتورة"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )
                            )}

                            {/* TAB 2: Finance Inflows */}
                            {treasuryLedgerTab === 'transfers' && (
                                treasuryMetrics.inventoryExpenses.length === 0 ? (
                                    <div className="text-center py-12 text-gray-400">
                                        <Receipt className="w-12 h-12 mx-auto mb-2 opacity-30 text-blue-600" />
                                        <p className="text-sm font-semibold text-gray-700">لم يتم تسجيل أي سندات صرف لمشتريات المخزون في قسم المالية بعد.</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            عند تسجيل المحاسب لمصروف في المالية بفئة "مشتريات مخزون" أو اعتماد تسوية عهدة، سيظهر التحويل هنا تلقائياً.
                                        </p>
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
                                                    <th className="pb-3 px-3">المسجل بالمالية</th>
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
                                                                <CheckCircle2 className="w-3 h-3" /> معتمد
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )
                            )}

                            {/* TAB 3: Department Dispenses */}
                            {treasuryLedgerTab === 'dispenses' && (
                                movements.filter(m => m.movementType === 'out').length === 0 ? (
                                    <div className="text-center py-12 text-gray-400">
                                        <ArrowUpRight className="w-12 h-12 mx-auto mb-2 opacity-30 text-purple-600" />
                                        <p className="text-sm font-semibold text-gray-700">لم يتم تسجيل أي حركات صرف مواد للأقسام بعد.</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            عند صرف أو إنقاص كمية أي مادة من شاشة المخزون، يتم توثيق القسم والمستلم وقيمة الاستهلاك هنا.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-right text-xs">
                                            <thead>
                                                <tr className="border-b border-gray-100 text-gray-500 font-semibold">
                                                    <th className="pb-3 px-3">التاريخ</th>
                                                    <th className="pb-3 px-3">المادة</th>
                                                    <th className="pb-3 px-3">الكمية المصروفة</th>
                                                    <th className="pb-3 px-3">القسم / العيادة</th>
                                                    <th className="pb-3 px-3">المستلم</th>
                                                    <th className="pb-3 px-3 font-bold text-gray-900">القيمة التقديرية</th>
                                                    <th className="pb-3 px-3">ملاحظات الصرف</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {movements.filter(m => m.movementType === 'out').map((mv) => (
                                                    <tr key={mv.id} className="hover:bg-gray-50/60 transition-colors">
                                                        <td className="py-3.5 px-3 text-gray-600 font-medium whitespace-nowrap">
                                                            {mv.createdAt ? new Date(mv.createdAt).toLocaleDateString('ar-EG', {
                                                                year: 'numeric',
                                                                month: 'short',
                                                                day: 'numeric'
                                                            }) : '-'}
                                                        </td>
                                                        <td className="py-3.5 px-3 font-bold text-gray-900">
                                                            {mv.itemName}
                                                        </td>
                                                        <td className="py-3.5 px-3 font-bold text-purple-700">
                                                            {mv.quantity} قطعة
                                                        </td>
                                                        <td className="py-3.5 px-3">
                                                            <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                                                                {mv.departmentName || 'العيادة العامة'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-3 text-gray-600">
                                                            {mv.recipientName || mv.recorderName || '-'}
                                                        </td>
                                                        <td className="py-3.5 px-3 font-extrabold text-gray-900">
                                                            {formatCurrency(mv.totalCost || 0)}
                                                        </td>
                                                        <td className="py-3.5 px-3 text-gray-500 text-[11px]">
                                                            {mv.notes || 'استهلاك دوري'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )
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

            {/* Purchase Modal (إضافة مشتريات جديدة للمخزون أو الأصول الثابتة) */}
            <AddPurchaseModal
                isOpen={showPurchaseModal}
                onClose={() => setShowPurchaseModal(false)}
                clinicId={clinicId}
            />
        </div>
    );
};
