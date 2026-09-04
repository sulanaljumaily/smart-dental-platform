import React from 'react';
import { Card } from '../../../../../components/common/Card';
import { BentoStatCard } from '../../../../../components/dashboard/BentoStatCard';
import { Briefcase, ShoppingCart, Wallet, ArrowDownRight, AlertCircle, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../../../../../lib/utils';
import { useAssets } from '../../../../../hooks/useAssets';
import { useFinance } from '../../../../../hooks/useFinance';
import { useInventory } from '../../../../../hooks/useInventory';
import { useTreatments } from '../../../../../hooks/useTreatments';
import { useWarehousePurchases } from '../../../../../hooks/useWarehousePurchases';

export interface AssetsOverviewProps {
    clinicId?: string;
}

export const AssetsOverview: React.FC<AssetsOverviewProps> = ({ clinicId }) => {
    const { assets, loading: loadingAssets } = useAssets(clinicId);
    const { transactions, loading: loadingFinance } = useFinance(clinicId);
    const { inventory, loading: loadingInventory } = useInventory(clinicId);
    const { treatments, loading: loadingTreatments } = useTreatments(clinicId);
    const { purchases, totalPurchasesAmount } = useWarehousePurchases(clinicId);

    const isLoading = loadingAssets || loadingFinance || loadingInventory || loadingTreatments;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin"></div>
                <p className="text-gray-500 font-medium text-sm animate-pulse">جاري تحميل بيانات لوحة معلومات الأصول...</p>
            </div>
        );
    }

    // 1. Fixed Assets Value (قيمة الأصول الثابتة)
    const deviceCategories = ['equipment', 'furniture', 'electronics', 'other'];
    const fixedAssets = assets.filter(a => deviceCategories.includes(a.category) && (a.status === 'active' || a.status === 'maintenance'));
    const totalFixedAssetsCost = fixedAssets.reduce((sum, a) => sum + (a.purchaseCost || 0), 0);

    // 2. Inventory Stock Value (قيمة بضاعة المخزون)
    const stockValue = inventory.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.unitPrice)), 0);
    const totalAssetsValuation = totalFixedAssetsCost + stockValue;

    // 3. Finance Funding Inflows (المحول من قسم المالية لعهدة المخزن)
    const financeInflows = transactions
        .filter(t => t.type === 'expense' && (t.category === 'inventory' || t.category === 'materials' || t.category === 'supplies' || t.category === 'asset_purchase' || t.sourceType === 'inventory'))
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // 4. Actual Purchases (إجمالي المشتريات الفعلية للمخزون والأصول)
    const actualPurchases = totalPurchasesAmount > 0 ? totalPurchasesAmount : stockValue;

    // 5. Net Custody Balance (صافي رصيد العهدة)
    const custodyBalance = financeInflows - actualPurchases;

    // 6. Top Revenue Services (أعلى الخدمات إيراداً)
    const sortedTreatments = [...treatments].sort((a, b) => {
        if (b.totalRevenue !== a.totalRevenue) {
            return b.totalRevenue - a.totalRevenue;
        }
        return (b.popularity || 0) - (a.popularity || 0);
    });
    const topTreatments = sortedTreatments.slice(0, 3);
    const fallbackTreatments = [
        { id: 'fb-1', name: 'زراعة سنية (كاملة)', totalRevenue: 30000000 },
        { id: 'fb-2', name: 'تركيب تاج زركون', totalRevenue: 17500000 },
        { id: 'fb-3', name: 'حشوة ضوئية', totalRevenue: 12000000 }
    ];
    const treatmentsToDisplay = topTreatments.length > 0 ? topTreatments : fallbackTreatments;

    // 7. Inventory Alerts (تنبيهات المخزون)
    const lowStockItems = inventory.filter(item => item.quantity <= item.minStock);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                <BentoStatCard
                    title="إجمالي قيمة الأصول"
                    value={formatCurrency(totalAssetsValuation)}
                    icon={Briefcase}
                    color="blue"
                    trend="neutral"
                    trendValue={`مخزون + ${fixedAssets.length} أصل`}
                    delay={100}
                />
                <BentoStatCard
                    title="المحول من المالية (العهدة)"
                    value={formatCurrency(financeInflows)}
                    icon={ArrowDownRight}
                    color="emerald"
                    trend="up"
                    trendValue="تمويل المخزن"
                    delay={200}
                />
                <BentoStatCard
                    title="قيمة المشتريات"
                    value={formatCurrency(actualPurchases)}
                    icon={ShoppingCart}
                    color="purple"
                    trend="neutral"
                    trendValue={purchases.length > 0 ? `${purchases.length} فاتورة مسجلة` : `${inventory.length} صنف مسجل`}
                    delay={300}
                />
                <BentoStatCard
                    title={custodyBalance >= 0 ? 'فائض عهدة المخزن' : 'عجز العهدة (مطلوب)'}
                    value={formatCurrency(Math.abs(custodyBalance))}
                    icon={Wallet}
                    color={custodyBalance >= 0 ? 'blue' : 'red'}
                    trend={custodyBalance >= 0 ? 'up' : 'down'}
                    trendValue={custodyBalance >= 0 ? 'رصيد متاح للشراء' : 'طلب تسوية من المالية'}
                    delay={400}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <div className="p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">أعلى الخدمات إيراداً</h3>
                        <div className="space-y-4">
                            {treatmentsToDisplay.map((treatment, idx) => (
                                <div key={treatment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center">
                                            {idx + 1}
                                        </span>
                                        <span className="font-medium text-gray-800">{treatment.name}</span>
                                    </div>
                                    <span className="font-bold text-blue-600">
                                        {formatCurrency(treatment.totalRevenue)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">تنبيهات المخزون</h3>
                        {inventory.length === 0 ? (
                            <div className="flex items-center gap-3 p-4 bg-gray-50 text-gray-500 rounded-xl border border-gray-200">
                                <AlertCircle className="w-5 h-5 text-gray-400" />
                                <span>لم يتم تسجيل أي مواد في المخزون بعد. يمكنك إضافتها من تبويبة "المخزون".</span>
                            </div>
                        ) : lowStockItems.length === 0 ? (
                            <div className="flex items-center gap-3 p-4 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
                                <CheckCircle className="w-5 h-5 text-blue-500" />
                                <span>حالة المخزون ممتازة، لا توجد مواد تحت حد الأمان حالياً.</span>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {lowStockItems.map(item => (
                                    <div key={item.id} className={`flex items-center gap-3 p-3 rounded-lg border ${
                                        item.quantity === 0 
                                            ? 'bg-red-50 text-red-700 border-red-100' 
                                            : 'bg-yellow-50 text-yellow-700 border-yellow-100'
                                    }`}>
                                        <AlertCircle className={`w-5 h-5 ${item.quantity === 0 ? 'text-red-500' : 'text-yellow-500'}`} />
                                        <span>
                                            {item.name} - {item.quantity === 0 ? 'نفدت الكمية تماماً' : `كمية منخفضة (${item.quantity} ${item.unit || 'أمبولة'} متبقية)`}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};
