import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  ShoppingCart,
  Search,
  Plus,
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Filter,
  Box,
  Wrench,
  Pill,
  Scissors,
  Calendar,
  Star,
  Minus,
  Edit,
  Trash2,
  Wallet,
  Layers,
  History,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  User,
  PackageMinus
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import { Card } from '../../../components/common/Card';
import { BentoStatCard } from '../../../components/dashboard/BentoStatCard';
import { useInventory, InventoryItem } from '../../../hooks/useInventory';
import { useFinance } from '../../../hooks/useFinance';
import { useInventoryMovements } from '../../../hooks/useInventoryMovements';
import { DispenseItemModal } from '../../../components/inventory/DispenseItemModal';
import { formatCurrency } from '../../../lib/utils';

interface ClinicInventoryPageProps {
  clinicId: string;
  onNavigateToTreasury?: () => void;
}

export const ClinicInventoryPage: React.FC<ClinicInventoryPageProps> = ({ clinicId: propClinicId, onNavigateToTreasury }) => {
  const { clinicId: routeClinicId } = useParams<{ clinicId: string }>();
  const clinicId = propClinicId || routeClinicId || '19';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeSubTab, setActiveSubTab] = useState<'items' | 'movements'>('items');
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'year' | 'all'>('all');

  // Supabase Integration
  const { inventory, loading, addItem, updateItem, deleteItem } = useInventory(clinicId);
  const { transactions } = useFinance(clinicId);
  const { movements, loading: movementsLoading, logMovement } = useInventoryMovements(clinicId);

  // --- Modal State ---
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Dispense Modal State
  const [dispenseItem, setDispenseItem] = useState<InventoryItem | null>(null);
  const [showDispenseModal, setShowDispenseModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    specialty: 'General', // Was category (Orthodontics, Cosmetic...)
    type: 'Consumables', // Was supplier purpose (Equipment, Consumables...)
    quantity: '0',
    minStock: '10',
    unitPrice: '0',
    unit: 'pcs'
  });

  const openAddModal = () => {
    setFormData({ name: '', specialty: 'General', type: 'Consumables', quantity: '0', minStock: '10', unitPrice: '0', unit: 'pcs' });
    setIsEditing(false);
    setEditingId(null);
    setShowModal(true);
  };

  const openEditModal = (item: any) => {
    setFormData({
      name: item.name,
      specialty: item.category, // We are mapping Specialty -> Category field
      type: item.brand || 'Consumables', // We are mapping Type -> Brand field (Hack to avoid DB schema change for now)
      quantity: item.quantity.toString(),
      minStock: item.minStock.toString(),
      unitPrice: item.unitPrice.toString(),
      unit: item.unit
    });
    setIsEditing(true);
    setEditingId(item.id);
    setShowModal(true);
  };

  const calculateCondition = (qty: number, min: number) => {
    if (qty <= 0) return 'out_of_stock';
    if (qty <= min) return 'low_stock';
    return 'available';
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('يرجى إدخال اسم العنصر');
      return;
    }

    const payload = {
      name: formData.name,
      category: formData.specialty, // Specialty -> Category
      brand: formData.type,         // Type -> Brand
      quantity: parseInt(formData.quantity),
      minStock: parseInt(formData.minStock),
      unitPrice: parseFloat(formData.unitPrice),
      unit: formData.unit,
      supplier: '', // Cleared as requested to be replaced
      status: calculateCondition(parseInt(formData.quantity), parseInt(formData.minStock)) as any
    };

    try {
      if (isEditing && editingId) {
        await updateItem(editingId, payload);
        toast.success('تم تحديث العنصر بنجاح');
      } else {
        await addItem(payload);
        toast.success('تم إضافة العنصر بنجاح');
      }
      setShowModal(false);
    } catch (e) {
      toast.error('حدث خطأ');
    }
  };

  // Helper for Specialty Labels
  const getSpecialtyLabel = (spec: string) => {
    const map: Record<string, string> = {
      'Orthodontics': 'تقويم الأسنان',
      'Cosmetic': 'تجميل',
      'Restorative': 'حشوات وتجميل',
      'Anesthetic': 'تخدير',
      'Consumables': 'مستهلكات عامة',
      'General': 'عام',
      'Endodontics': 'علاج عصب',
      'Surgery': 'جراحة'
    };
    return map[spec] || spec;
  };

  const getSpecialtyIcon = (spec: string) => {
    return <Package className="w-5 h-5 text-blue-600" />;
  };

  // Period Filtering Logic & Financial Custody Calculation
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthStr = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const periodStats = useMemo(() => {
    // 1. Finance expenses for inventory
    const inventoryExpenses = transactions.filter(t => {
      if (t.type !== 'expense') return false;
      const isInv = t.category === 'inventory' || t.sourceType === 'inventory';
      if (!isInv) return false;

      if (selectedPeriod === 'month') {
        return t.date && t.date.startsWith(currentMonthStr);
      } else if (selectedPeriod === 'year') {
        return t.date && t.date.startsWith(String(currentYear));
      }
      return true; // 'all'
    });

    const totalFinanceExpenses = inventoryExpenses.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // All-time inventory expenses from finance for custody calculation
    const allTimeFinanceExpenses = transactions
      .filter(t => t.type === 'expense' && (t.category === 'inventory' || t.sourceType === 'inventory'))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // 2. Dispensed movements
    const periodMovements = movements.filter(m => {
      if (m.movementType !== 'out') return false;
      if (selectedPeriod === 'month') {
        return m.createdAt && m.createdAt.startsWith(currentMonthStr);
      } else if (selectedPeriod === 'year') {
        return m.createdAt && m.createdAt.startsWith(String(currentYear));
      }
      return true;
    });

    const totalDispensedValue = periodMovements.reduce((sum, m) => sum + (Number(m.totalCost) || 0), 0);
    const totalDispensedQty = periodMovements.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);

    // 3. Current Stock Valuation
    const totalStockValue = inventory.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.unitPrice)), 0);

    // 4. Custody Balance:
    // Funds from Finance into Warehouse Custody minus Total Stock Valuation
    const custodyBalance = allTimeFinanceExpenses - totalStockValue;

    return {
      periodFinanceExpenses: totalFinanceExpenses,
      totalDispensedValue,
      totalDispensedQty,
      totalStockValue,
      custodyBalance,
      allTimeFinanceExpenses
    };
  }, [transactions, movements, inventory, selectedPeriod, currentMonthStr, currentYear]);

  // Derived State (replaces mock helpers)
  const lowStockItems = inventory.filter(i => i.quantity <= i.minStock);

  const stats = {
    totalItems: inventory.length,
    totalValue: periodStats.totalStockValue,
    available: inventory.filter(i => (i.status === 'available' || i.quantity > 0)).length,
    lowStock: lowStockItems.length,
    outOfStock: inventory.filter(i => i.quantity === 0).length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-600 bg-green-100';
      case 'low_stock': return 'text-yellow-600 bg-yellow-100';
      case 'out_of_stock': return 'text-red-600 bg-red-100';
      case 'expired': return 'text-red-600 bg-red-100';
      case 'damaged': return 'text-gray-600 bg-gray-100';
      case 'maintenance': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return 'متاح';
      case 'low_stock': return 'مخزون منخفض';
      case 'out_of_stock': return 'نفد المخزون';
      case 'expired': return 'منتهي الصلاحية';
      case 'damaged': return 'تالف';
      case 'maintenance': return 'صيانة';
      default: return 'غير محدد';
    }
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = searchTerm === '' ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const filteredMovements = movements.filter(m => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      m.itemName?.toLowerCase().includes(term) ||
      m.recipientName?.toLowerCase().includes(term) ||
      m.departmentName?.toLowerCase().includes(term) ||
      m.reason?.toLowerCase().includes(term)
    );
  });

  const periodLabel = selectedPeriod === 'month' ? 'هذا الشهر' : selectedPeriod === 'year' ? 'السنة الحالية' : 'كافة الفترات';

  return (
    <div className="space-y-6">

      {/* Period Filter Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:px-5 rounded-2xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-blue-600" />
          <span className="font-bold text-sm text-gray-900">المؤشرات المالية للمخزن:</span>
          <span className="text-xs text-gray-500">({periodLabel})</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl">
            {[
              { id: 'all', label: '🌐 الكل (شامل)' },
              { id: 'month', label: '📅 الشهر الحالي' },
              { id: 'year', label: '📆 السنة الحالية' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPeriod(p.id as any)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  selectedPeriod === p.id
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {onNavigateToTreasury && (
            <button
              onClick={onNavigateToTreasury}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              title="الانتقال إلى الصندوق المالي لعهدة المخزن"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>الصندوق المالي للمخزن</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards (Financial Custody & Stock Overview) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Finance Inflow to Inventory */}
        <div onClick={onNavigateToTreasury} className="cursor-pointer">
          <BentoStatCard
            title="المبالغ المحولة من المالية"
            value={formatCurrency(selectedPeriod === 'all' ? periodStats.allTimeFinanceExpenses : periodStats.periodFinanceExpenses)}
            icon={Wallet}
            color="blue"
            trend="up"
            trendValue={selectedPeriod === 'all' ? `${periodStats.allTimeFinanceExpenses > 0 ? 'كافة التحويلات' : 'لا توجد تحويلات'}` : `المحول: ${periodLabel}`}
            delay={100}
            compact={true}
          />
        </div>

        {/* 2. Warehouse Custody Balance (Surplus or Deficit / Negative) */}
        <div onClick={onNavigateToTreasury} className="cursor-pointer">
          <BentoStatCard
            title={periodStats.custodyBalance >= 0 ? "فائض عهدة المخزن" : "المخزن يطلب العيادة"}
            value={formatCurrency(Math.abs(periodStats.custodyBalance))}
            icon={periodStats.custodyBalance >= 0 ? ArrowUpRight : ArrowDownRight}
            color={periodStats.custodyBalance >= 0 ? "green" : "red"}
            trend={periodStats.custodyBalance >= 0 ? "up" : "down"}
            trendValue={periodStats.custodyBalance >= 0 ? "فائض سيولة (+)" : "عجز مطلوب تسويته (-)"}
            delay={200}
            compact={true}
          />
        </div>

        {/* 3. Dispensed Materials Value */}
        <BentoStatCard
          title="قيمة المواد المصروفة"
          value={formatCurrency(periodStats.totalDispensedValue)}
          icon={PackageMinus}
          color="purple"
          trend="neutral"
          trendValue={`صُرف ${periodStats.totalDispensedQty} وحدة`}
          delay={300}
          compact={true}
        />

        {/* 4. Stock Items & Valuation */}
        <BentoStatCard
          title="إجمالي مواد المخزون"
          value={stats.totalItems.toString()}
          icon={Package}
          color="blue"
          trend={stats.lowStock > 0 ? "down" : "neutral"}
          trendValue={`قيمة: ${(stats.totalValue / 1000000).toFixed(1)}م`}
          delay={400}
          compact={true}
        />
      </div>

      {/* Sub-Tabs: Items vs Movements Log */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveSubTab('items')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeSubTab === 'items'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <Box className="w-4 h-4" />
          <span>المواد والأرصدة الحالية ({inventory.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('movements')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeSubTab === 'movements'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>سجل حركات وصرفيات المواد ({movements.length})</span>
        </button>
      </div>

      {activeSubTab === 'items' ? (
        <>
          {/* Controls Bar - Mobile & Desktop Optimized */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-2.5 sm:px-3.5 sm:py-2.5 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-2.5">
            {/* Row 1 on Mobile: Search + Add Button */}
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="البحث في المواد..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-gray-50/70 hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                />
              </div>

              {/* Add Button for Mobile */}
              <button
                onClick={openAddModal}
                className="sm:hidden flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>عنصر جديد</span>
              </button>
            </div>

            {/* Row 2 on Mobile / Inlined on Desktop */}
            <div className="grid grid-cols-2 sm:flex items-center gap-2">
              {/* Specialty Filter */}
              <div className="relative w-full sm:w-36">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold bg-gray-50/70 hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none cursor-pointer transition-all truncate"
                >
                  <option value="all">🏷️ جميع التخصصات</option>
                  <option value="Orthodontics">تقويم الأسنان</option>
                  <option value="Cosmetic">تجميل</option>
                  <option value="Restorative">حشوات</option>
                  <option value="Anesthetic">تخدير</option>
                  <option value="Endodontics">علاج عصب</option>
                  <option value="Surgery">جراحة</option>
                  <option value="Consumables">مستهلكات عامة</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="relative w-full sm:w-32">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold bg-gray-50/70 hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none cursor-pointer transition-all truncate"
                >
                  <option value="all">📌 جميع الحالات</option>
                  <option value="available">🟢 متاح</option>
                  <option value="low_stock">🟡 مخزون منخفض</option>
                  <option value="out_of_stock">🔴 نفد المخزون</option>
                </select>
              </div>
            </div>

            {/* Add Button for Desktop */}
            <button
              onClick={openAddModal}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>عنصر جديد</span>
            </button>
          </div>

          {/* Inventory Grid */}
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">المخزون ({filteredInventory.length})</h2>
              </div>

              {loading ? (
                <div className="text-center py-12 text-sm text-gray-500">جاري تحميل بيانات المخزون...</div>
              ) : filteredInventory.length === 0 ? (
                <div className="text-center py-12"><p className="text-gray-500">لا توجد عناصر مطابقة</p></div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredInventory.map((item) => (
                    <div key={item.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-4 flex flex-col gap-4 group">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                            {getSpecialtyIcon(item.category)}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 line-clamp-1">{item.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium">{getSpecialtyLabel(item.category)}</span>
                              <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{item.brand || 'عام'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Stock Bar & Quantity Controls */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-semibold text-gray-700">الكمية: {item.quantity} {item.unit}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${getStatusColor(item.status)}`}>{getStatusLabel(item.status)}</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden mb-3">
                          <div className={`h-full rounded-full transition-all duration-300 ${item.quantity <= item.minStock ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, (item.quantity / (item.minStock * 3 || 1)) * 100)}%` }} />
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          {/* Minus button opens the Dispense Modal */}
                          <button
                            type="button"
                            onClick={() => {
                              setDispenseItem(item);
                              setShowDispenseModal(true);
                            }}
                            disabled={item.quantity <= 0}
                            title="صرف مادة وتوثيق المستلم والقسم"
                            className="flex-1 py-1.5 flex items-center justify-center gap-1 rounded-md bg-white border border-gray-200 hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition-colors text-xs font-bold"
                          >
                            <PackageMinus className="w-3.5 h-3.5 text-blue-600" />
                            <span>صرف مادة (-)</span>
                          </button>

                          <span className="font-extrabold text-gray-900 px-2">{item.quantity}</span>

                          {/* Quick Add button */}
                          <button
                            type="button"
                            onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })}
                            title="زيادة الكمية (+1)"
                            className="w-8 h-8 flex items-center justify-center rounded-md bg-white border border-gray-200 hover:bg-green-50 text-gray-600 hover:text-green-600 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-auto pt-2 border-t">
                        <button
                          onClick={() => openEditModal(item)}
                          className="flex-1 py-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center gap-1 font-semibold"
                        >
                          <Edit className="w-3 h-3" /> تعديل التفاصيل
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm(`هل أنت متأكد من حذف المادة "${item.name}"؟`)) {
                              await deleteItem(item.id);
                              toast.success('تم حذف المادة بنجاح');
                            }
                          }}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="حذف المادة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // List View
                <div className="space-y-2">
                  {filteredInventory.map(item => (
                    <div key={item.id} className="p-4 border rounded-lg flex justify-between items-center">
                      <div>
                        <div className="font-bold">{item.name}</div>
                        <div className="text-xs text-gray-500">{getSpecialtyLabel(item.category)} - {item.brand}</div>
                        <div className="text-xs text-blue-600 font-semibold mt-1">
                          الرصيد: {item.quantity} {item.unit} | السعر: {formatCurrency(item.unitPrice)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setDispenseItem(item);
                            setShowDispenseModal(true);
                          }}
                          className="px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg flex items-center gap-1"
                        >
                          <PackageMinus className="w-3.5 h-3.5" /> صرف
                        </button>
                        <button onClick={() => openEditModal(item)} className="text-blue-600 text-xs font-bold px-2 py-1">تعديل</button>
                        <button
                          onClick={async () => {
                            if (window.confirm(`هل أنت متأكد من حذف المادة "${item.name}"؟`)) {
                              await deleteItem(item.id);
                              toast.success('تم حذف المادة بنجاح');
                            }
                          }}
                          className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </>
      ) : (
        /* Movements & Disbursements Log Tab */
        <Card>
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-600" />
                  <span>سجل حركات وصرفيات المخزون ({filteredMovements.length})</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  توثيق عمليات الصرف، المستلم، القسم، وقيمة كل حركة استهلاك
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="بحث في سجل الصرفيات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-gray-50/70 hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                />
              </div>
            </div>

            {movementsLoading ? (
              <div className="text-center py-12 text-sm text-gray-500">جاري تحميل سجل الحركات...</div>
            ) : filteredMovements.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">لم يتم تسجيل أي حركات صرف بعد.</p>
                <p className="text-xs text-gray-400 mt-1">عند صرف مادة من قائمة المخزون سيتم توثيقها هنا فوراً.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-500 font-semibold">
                      <th className="pb-3 px-3">التاريخ والوقت</th>
                      <th className="pb-3 px-3">المادة</th>
                      <th className="pb-3 px-3">النوع</th>
                      <th className="pb-3 px-3">الكمية</th>
                      <th className="pb-3 px-3">تكلفة الوحدة</th>
                      <th className="pb-3 px-3">القيمة الإجمالية</th>
                      <th className="pb-3 px-3">القسم / العيادة</th>
                      <th className="pb-3 px-3">المستلم</th>
                      <th className="pb-3 px-3">مسؤول الصرف</th>
                      <th className="pb-3 px-3">السبب / الملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredMovements.map((mov) => (
                      <tr key={mov.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 px-3 text-gray-600 font-medium whitespace-nowrap">
                          {mov.createdAt ? new Date(mov.createdAt).toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </td>
                        <td className="py-3 px-3 font-bold text-gray-900">{mov.itemName}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            mov.movementType === 'out'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-green-50 text-green-700 border border-green-200'
                          }`}>
                            {mov.movementType === 'out' ? 'صرف استهلاك' : 'توريد شراء'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-extrabold text-blue-700">{mov.quantity}</td>
                        <td className="py-3 px-3 text-gray-600">{formatCurrency(mov.unitCost)}</td>
                        <td className="py-3 px-3 font-bold text-gray-900">{formatCurrency(mov.totalCost)}</td>
                        <td className="py-3 px-3">
                          {mov.departmentName ? (
                            <span className="flex items-center gap-1 text-gray-800 font-medium">
                              <Building2 className="w-3 h-3 text-gray-400" />
                              {mov.departmentName}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {mov.recipientName ? (
                            <span className="flex items-center gap-1 text-gray-800 font-medium">
                              <User className="w-3 h-3 text-gray-400" />
                              {mov.recipientName}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-gray-500">{mov.recorderName || 'المسؤول'}</td>
                        <td className="py-3 px-3 text-gray-500 max-w-xs truncate">
                          {mov.reason ? (
                            <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[10px] ml-1">
                              {mov.reason}
                            </span>
                          ) : null}
                          {mov.notes || ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Dispense Modal */}
      <DispenseItemModal
        isOpen={showDispenseModal}
        onClose={() => {
          setShowDispenseModal(false);
          setDispenseItem(null);
        }}
        item={dispenseItem}
        clinicId={clinicId}
        onConfirm={async (data) => {
          if (!dispenseItem) return;
          const newQty = Math.max(0, dispenseItem.quantity - data.quantity);
          await updateItem(dispenseItem.id, { quantity: newQty });
          await logMovement({
            clinicId,
            itemId: dispenseItem.id,
            itemName: dispenseItem.name,
            movementType: 'out',
            quantity: data.quantity,
            unitCost: data.unitCost,
            totalCost: data.totalCost,
            departmentId: data.departmentId,
            departmentName: data.departmentName,
            recipientId: data.recipientId,
            recipientName: data.recipientName,
            recordedById: data.recordedById,
            recorderName: data.recorderName,
            reason: data.reason,
            notes: data.notes
          });
          toast.success(`تم صرف ${data.quantity} من "${dispenseItem.name}" بنجاح وتوثيق الحركة`);
        }}
      />

      {/* Unified Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg">{isEditing ? 'تعديل عنصر' : 'إضافة عنصر جديد'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500"><Minus className="w-6 h-6" /></button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم العنصر</label>
                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border rounded-lg p-2.5" placeholder="اسم المادة أو الأداة" />
              </div>

              {/* REPLACED SUPPLIER WITH SPECIALTY */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاختصاص (القسم)</label>
                <select value={formData.specialty} onChange={e => setFormData({ ...formData, specialty: e.target.value })} className="w-full border rounded-lg p-2.5 bg-white">
                  <option value="Orthodontics">تقويم الأسنان (Orthodontics)</option>
                  <option value="Cosmetic">تجميل (Cosmetic)</option>
                  <option value="Restorative">حشوات وتجميل (Restorative)</option>
                  <option value="Anesthetic">تخدير (Anesthetic)</option>
                  <option value="Endodontics">علاج عصب (Endodontics)</option>
                  <option value="Surgery">جراحة (Surgery)</option>
                  <option value="Consumables">مستهلكات عامة (Consumables)</option>
                  <option value="General">عام (General)</option>
                </select>
              </div>

              {/* REPLACED CATEGORY WITH TYPE */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نوع العنصر</label>
                <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full border rounded-lg p-2.5 bg-white">
                  <option value="Consumables">مستهلكات (Materials)</option>
                  <option value="Instruments">أدوات (Instruments)</option>
                  <option value="Equipment">معدات (Equipment)</option>
                  <option value="Medicines">أدوية (Medicines)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الكمية</label>
                <input type="number" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} className="w-full border rounded-lg p-2.5 text-right" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأدنى</label>
                <input type="number" value={formData.minStock} onChange={e => setFormData({ ...formData, minStock: e.target.value })} className="w-full border rounded-lg p-2.5 text-right" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">السعر (د.ع)</label>
                <input type="number" value={formData.unitPrice} onChange={e => setFormData({ ...formData, unitPrice: e.target.value })} className="w-full border rounded-lg p-2.5 text-right" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوحدة</label>
                <input type="text" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} className="w-full border rounded-lg p-2.5" placeholder="علبة / قطعة" />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-5 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">إلغاء</button>
              <button onClick={handleSave} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">{isEditing ? 'حفظ التغييرات' : 'إضافة العنصر'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};