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
import { BentoStatCard } from '../../../../../components/dashboard/BentoStatCard';
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
    const [activeSection, setActiveSection] = useState<'treasury' | 'departments'>('treasury');

    // Purchase Modal & Treasury Ledger Tab
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [treasuryLedgerTab, setTreasuryLedgerTab] = useState<'all' | 'purchases' | 'transfers' | 'dispenses'>('all');

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

    // Unified Ledger combining All Records (Purchases, Finance Inflows, Department Dispenses)
    const allLedgerRecords = useMemo(() => {
        const list: Array<{
            id: string;
            rawDate: string;
            date?: string;
            type: 'purchase' | 'transfer' | 'dispense';
            typeName: string;
            typeBadgeColor: string;
            refNumber: string;
            title: string;
            subtitle?: string;
            partyOrDept: string;
            recorder: string;
            amount: number;
            direction: 'in' | 'out' | 'dispense';
            paymentMethod?: string;
            original: any;
        }> = [];

        // 1. Purchases (فواتير المشتريات)
        purchases.forEach(p => {
            const dateStr = p.purchaseDate || p.createdAt || '';
            list.push({
                id: `purchase_${p.id}`,
                rawDate: dateStr,
                date: p.purchaseDate,
                type: 'purchase',
                typeName: p.purchaseType === 'fixed_asset' ? 'أصول ثابتة' : 'مشتريات مخزون',
                typeBadgeColor: p.purchaseType === 'fixed_asset' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
                refNumber: p.invoiceNumber ? `#${p.invoiceNumber}` : `#${p.id.substring(0, 7)}`,
                title: p.items && p.items.length > 0 ? p.items.map(i => i.name).join('، ') : 'مشتريات عامة',
                subtitle: p.supplier ? `المورد: ${p.supplier}${p.notes ? ` - ${p.notes}` : ''}` : p.notes,
                partyOrDept: p.supplier || 'مورد محلي',
                recorder: p.recorderName || 'أمين المخزن',
                amount: Number(p.totalAmount) || 0,
                direction: 'out',
                paymentMethod: p.paymentMethod,
                original: p
            });
        });

        // 2. Transfers from Finance (تحويلات المالية للعهدة)
        treasuryMetrics.inventoryExpenses.forEach(tx => {
            const dateStr = tx.date || '';
            list.push({
                id: `tx_${tx.id}`,
                rawDate: dateStr,
                date: tx.date,
                type: 'transfer',
                typeName: 'تمويل من المالية',
                typeBadgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
                refNumber: `#${tx.id.substring(0, 8)}`,
                title: tx.description || 'تمويل مشتريات مخزون وتغذية عهدة',
                subtitle: tx.relatedPerson ? `المورد / المستلم: ${tx.relatedPerson}` : undefined,
                partyOrDept: 'الإدارة المالية',
                recorder: tx.recorderName || 'المحاسب',
                amount: Number(tx.amount) || 0,
                direction: 'in',
                paymentMethod: tx.paymentMethod,
                original: tx
            });
        });

        // 3. Dispenses / Movements out to Clinic Departments (صرف واستهلاك الأقسام)
        movements.filter(m => m.movementType === 'out').forEach(mv => {
            const dateStr = mv.createdAt || '';
            list.push({
                id: `mv_${mv.id}`,
                rawDate: dateStr,
                date: mv.createdAt,
                type: 'dispense',
                typeName: 'صرف واستهلاك قسم',
                typeBadgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
                refNumber: `#${mv.id.substring(0, 7)}`,
                title: `${mv.itemName} (${mv.quantity} قطعة)`,
                subtitle: mv.notes || 'استهلاك دوري للعيادة',
                partyOrDept: mv.departmentName || 'العيادة العامة',
                recorder: mv.recipientName || mv.recorderName || '-',
                amount: Number(mv.totalCost) || 0,
                direction: 'dispense',
                paymentMethod: undefined,
                original: mv
            });
        });

        return list.sort((a, b) => {
            const timeA = a.rawDate ? new Date(a.rawDate).getTime() : 0;
            const timeB = b.rawDate ? new Date(b.rawDate).getTime() : 0;
            return timeB - timeA;
        });
    }, [purchases, treasuryMetrics.inventoryExpenses, movements]);

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
            {/* Top Summary Stat Cards in BentoStatCard style */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                {/* 1. Warehouse Balance (رصيد المخزن) */}
                <BentoStatCard
                    title="رصيد المخزن"
                    value={formatCurrency(Math.abs(treasuryMetrics.custodyBalance))}
                    icon={Wallet}
                    color={treasuryMetrics.custodyBalance >= 0 ? 'emerald' : 'red'}
                    trend={treasuryMetrics.custodyBalance >= 0 ? 'up' : 'down'}
                    trendValue={treasuryMetrics.custodyBalance >= 0 ? 'رصيد متاح للشراء' : 'عجز مطلوب تسويته'}
                    delay={100}
                />

                {/* 2. Inflows from Finance (المحول من المالية) */}
                <BentoStatCard
                    title="المحـوّل من المالية (العهدة)"
                    value={formatCurrency(treasuryMetrics.totalInflows)}
                    icon={ArrowDownRight}
                    color="blue"
                    trend="up"
                    trendValue={treasuryMetrics.transfersCount > 0 ? `${treasuryMetrics.transfersCount} سند صرف` : "تمويل المخزن"}
                    delay={200}
                />

                {/* 3. Actual Purchases (إجمالي المشتريات) */}
                <BentoStatCard
                    title="إجمالي المشتريات"
                    value={formatCurrency(treasuryMetrics.totalPurchases)}
                    icon={ShoppingCart}
                    color="purple"
                    trend="neutral"
                    trendValue={purchases.length > 0 ? `${purchases.length} فاتورة مسجلة` : `${inventory.length} صنف مسجل`}
                    delay={300}
                />

                {/* 4. Dispensed Materials (المواد المصروفة للعيادات) */}
                <BentoStatCard
                    title="المواد المصروفة للعيادات"
                    value={formatCurrency(treasuryMetrics.totalDispensedValue)}
                    icon={ArrowUpRight}
                    color="cyan"
                    trend="neutral"
                    trendValue="استهلاك موثق بالعيادات"
                    delay={400}
                />
            </div>

            {/* Section Tabs Bar (Compact matching appointments design) */}
            <div className="flex bg-gray-50 rounded-xl p-1.5 border border-gray-100 w-fit">
                <button
                    onClick={() => setActiveSection('treasury')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                        activeSection === 'treasury'
                            ? 'bg-white text-blue-600 shadow-sm font-bold'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Wallet className="w-4 h-4" />
                    <span>الصندوق المالي</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        activeSection === 'treasury' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-600'
                    }`}>
                        {treasuryMetrics.transfersCount}
                    </span>
                </button>

                <button
                    onClick={() => setActiveSection('departments')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                        activeSection === 'departments'
                            ? 'bg-white text-blue-600 shadow-sm font-bold'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Building2 className="w-4 h-4" />
                    <span>أقسام المركز</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        activeSection === 'departments' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-600'
                    }`}>
                        {departments.length}
                    </span>
                </button>
            </div>

            {/* SECTION 1: WAREHOUSE TREASURY (الصندوق المالي لعهدة المخزن) */}
            {activeSection === 'treasury' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                    {/* Status Alert Banner (Deficit / Pending Settlement only - hidden on surplus or zero) */}
                    {treasuryMetrics.custodyBalance < 0 && (
                        pendingSettlementRequest && pendingSettlementRequest.status === 'pending' ? (
                            <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 shadow-xs">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                                            <History className="w-4 h-4 animate-spin" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-amber-950 text-sm">
                                                    طلب تسوية العهدة مرسل إلى قسم المالية
                                                </h3>
                                                <span className="bg-amber-200 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                                    قيد اعتماد المحاسب
                                                </span>
                                            </div>
                                            <p className="text-xs text-amber-900/80 mt-0.5 leading-normal">
                                                بانتظار اعتماد سند صرف بمبلغ <span className="font-bold text-amber-950">{formatCurrency(pendingSettlementRequest.requestedAmount)}</span> لتصفير العجز وتغذية العهدة.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                if (window.confirm('هل أنت متأكد من إلغاء طلب التسوية المرسل للمالية؟')) {
                                                    cancelSettlementRequest(pendingSettlementRequest.id);
                                                    toast.info('تم إلغاء طلب التسوية');
                                                }
                                            }}
                                            className="border-amber-300 text-amber-900 hover:bg-amber-100 text-xs font-semibold py-1 px-3 h-auto"
                                        >
                                            إلغاء الطلب
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 shadow-xs">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                            <AlertCircle className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-red-900 text-sm">
                                                    المخزن يطلب العيادة (عجز)
                                                </h3>
                                                <span className="bg-red-200/80 text-red-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                                    مطلوب تسوية من المالية
                                                </span>
                                            </div>
                                            <p className="text-xs text-red-700 mt-0.5 leading-normal">
                                                المشتريات الفعلية (<span className="font-bold">{formatCurrency(treasuryMetrics.totalPurchases)}</span>) تفوق المحول (<span className="font-bold">{formatCurrency(treasuryMetrics.totalInflows)}</span>). مطلوب تسوية مبلغ <span className="font-extrabold text-red-950">{formatCurrency(Math.abs(treasuryMetrics.custodyBalance))}</span> لتصفير العهدة.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                        <Button
                                            onClick={handleSendSettlementRequest}
                                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs px-3.5 py-1.5 h-auto rounded-lg"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5 ml-1.5" />
                                            طلب تسوية
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )
                    )}

                    {/* Financial Ledger Section (Multi-Tab) */}
                    <Card>
                        <div className="p-6">
                            {/* Ledger Tab Headers */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
                                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 sm:pb-0">
                                    <button
                                        onClick={() => setTreasuryLedgerTab('all')}
                                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                                            treasuryLedgerTab === 'all'
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        <Layers className="w-3.5 h-3.5" />
                                        <span>الكل</span>
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                            treasuryLedgerTab === 'all' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                                        }`}>
                                            {allLedgerRecords.length}
                                        </span>
                                    </button>

                                    <button
                                        onClick={() => setTreasuryLedgerTab('purchases')}
                                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
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
                                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
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
                                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
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

                                {(treasuryLedgerTab === 'all' || treasuryLedgerTab === 'purchases') && (
                                    <Button
                                        onClick={() => setShowPurchaseModal(true)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0 shadow-xs cursor-pointer"
                                    >
                                        <Plus className="w-4 h-4 ml-1.5" />
                                        إضافة مشتريات
                                    </Button>
                                )}
                            </div>

                            {/* TAB 0: All Records (الكل - سجل الصندوق الشامل) */}
                            {treasuryLedgerTab === 'all' && (
                                allLedgerRecords.length === 0 ? (
                                    <div className="text-center py-12 text-gray-400">
                                        <Layers className="w-12 h-12 mx-auto mb-2 opacity-30 text-blue-600" />
                                        <p className="text-sm font-semibold text-gray-700">لا توجد أي حركات أو سجلات في صندوق المخزن بعد.</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            ستظهر هنا كافة فواتير المشتريات، تحويلات المالية، وصرفيات الأقسام مجتمعة بتسلسل زمني موحد.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-right text-xs">
                                            <thead>
                                                <tr className="border-b border-gray-100 text-gray-500 font-semibold bg-gray-50/50">
                                                    <th className="py-3 px-3">التاريخ</th>
                                                    <th className="py-3 px-3">نوع الحركة</th>
                                                    <th className="py-3 px-3">رقم السند</th>
                                                    <th className="py-3 px-3">البيان والتفاصيل</th>
                                                    <th className="py-3 px-3">الجهة / القسم</th>
                                                    <th className="py-3 px-3">القائم بالعملية</th>
                                                    <th className="py-3 px-3 font-bold text-gray-900">المبلغ / القيمة</th>
                                                    <th className="py-3 px-3 text-center">إجراءات</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {allLedgerRecords.map((item) => (
                                                    <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                                                        <td className="py-3.5 px-3 text-gray-600 font-medium whitespace-nowrap">
                                                            {item.date ? new Date(item.date).toLocaleDateString('ar-EG', {
                                                                year: 'numeric',
                                                                month: 'short',
                                                                day: 'numeric'
                                                            }) : '-'}
                                                        </td>
                                                        <td className="py-3.5 px-3 whitespace-nowrap">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.typeBadgeColor}`}>
                                                                {item.typeName}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-3 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                                                            {item.refNumber}
                                                        </td>
                                                        <td className="py-3.5 px-3 max-w-xs">
                                                            <div className="font-bold text-gray-900 truncate" title={item.title}>
                                                                {item.title}
                                                            </div>
                                                            {item.subtitle && (
                                                                <div className="text-[10px] text-gray-400 truncate mt-0.5" title={item.subtitle}>
                                                                    {item.subtitle}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-3.5 px-3 text-gray-700 whitespace-nowrap">
                                                            <span className="bg-gray-100 px-2 py-0.5 rounded-md text-[11px]">
                                                                {item.partyOrDept}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-3 text-gray-600 whitespace-nowrap">
                                                            {item.recorder}
                                                        </td>
                                                        <td className="py-3.5 px-3 whitespace-nowrap">
                                                            {item.direction === 'in' ? (
                                                                <span className="font-extrabold text-blue-700 text-sm flex items-center gap-1">
                                                                    <span>+{formatCurrency(item.amount)}</span>
                                                                    <span className="text-[9px] font-normal text-blue-500">(وارد عهدة)</span>
                                                                </span>
                                                            ) : item.direction === 'out' ? (
                                                                <span className="font-extrabold text-emerald-700 text-sm flex items-center gap-1">
                                                                    <span>-{formatCurrency(item.amount)}</span>
                                                                    <span className="text-[9px] font-normal text-emerald-500">(شراء)</span>
                                                                </span>
                                                            ) : (
                                                                <span className="font-extrabold text-gray-700 text-sm flex items-center gap-1">
                                                                    <span>{formatCurrency(item.amount)}</span>
                                                                    <span className="text-[9px] font-normal text-amber-600">(استهلاك)</span>
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                                            {item.type === 'purchase' ? (
                                                                <button
                                                                    onClick={async () => {
                                                                        if (window.confirm('هل أنت متأكد من حذف هذه الفاتورة من سجل المشتريات؟')) {
                                                                            await deletePurchase(item.original.id);
                                                                            toast.success('تم حذف فاتورة المشتريات بنجاح');
                                                                        }
                                                                    }}
                                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                                    title="حذف الفاتورة"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            ) : item.type === 'transfer' ? (
                                                                <span className="text-green-600 text-[10px] font-bold bg-green-50 px-2 py-0.5 rounded-full">
                                                                    معتمد بالمالية
                                                                </span>
                                                            ) : (
                                                                <span className="text-purple-600 text-[10px] font-bold bg-purple-50 px-2 py-0.5 rounded-full">
                                                                    حركة استهلاك
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )
                            )}

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

            {/* SECTION 2: CLINIC DEPARTMENTS MANAGEMENT (إدارة أقسام المركز) */}
            {activeSection === 'departments' && (
                <div className="space-y-6 animate-in fade-in duration-200">
                    <Card>
                        <div className="p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-gray-100">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-5 h-5 text-blue-600" />
                                        <h3 className="text-lg font-bold text-gray-900">أقسام المركز</h3>
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

            {/* Purchase Modal (إضافة مشتريات جديدة للمخزون أو الأصول الثابتة) */}
            <AddPurchaseModal
                isOpen={showPurchaseModal}
                onClose={() => setShowPurchaseModal(false)}
                clinicId={clinicId}
            />
        </div>
    );
};
