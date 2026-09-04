import React, { useState, useEffect } from 'react';
import { 
    X, 
    ShoppingCart, 
    Plus, 
    Trash2, 
    Package, 
    Monitor, 
    Calendar, 
    DollarSign, 
    Building2, 
    FileText, 
    Check, 
    Layers, 
    CreditCard,
    AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../common/Button';
import { useInventory, InventoryItem } from '../../hooks/useInventory';
import { useAssets } from '../../hooks/useAssets';
import { useInventoryMovements } from '../../hooks/useInventoryMovements';
import { useWarehousePurchases, PurchaseItem } from '../../hooks/useWarehousePurchases';
import { useStaff } from '../../hooks/useStaff';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../lib/utils';

interface AddPurchaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    clinicId?: string;
    onSuccess?: () => void;
}

export const AddPurchaseModal: React.FC<AddPurchaseModalProps> = ({
    isOpen,
    onClose,
    clinicId,
    onSuccess
}) => {
    const { user } = useAuth();
    const { staff } = useStaff(clinicId || '0');
    const { inventory, updateItem, addItem } = useInventory(clinicId || '19');
    const { addAsset } = useAssets(clinicId || '19');
    const { logMovement } = useInventoryMovements(clinicId || '19');
    const { addPurchase } = useWarehousePurchases(clinicId || '19');

    const currentStaff = staff.find(s => 
        s.userId === user?.id || 
        s.authUserId === user?.id || 
        (s.email && user?.email && s.email.toLowerCase() === user.email.toLowerCase()) ||
        (s.name && user?.name && s.name.toLowerCase().trim() === user.name.toLowerCase().trim())
    );

    // Form State
    const [purchaseType, setPurchaseType] = useState<'inventory' | 'fixed_asset'>('inventory');
    const [supplier, setSupplier] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank' | 'credit'>('cash');
    const [enteredTotal, setEnteredTotal] = useState<string>('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Items rows state
    const [items, setItems] = useState<PurchaseItem[]>([
        { id: '', name: '', quantity: 1, unitPrice: 0, totalPrice: 0, unit: 'قطعة', isNewItem: false, specialty: 'General', type: 'Consumables', category: 'equipment' }
    ]);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setPurchaseType('inventory');
            setSupplier('');
            setInvoiceNumber('');
            setPurchaseDate(new Date().toISOString().split('T')[0]);
            setPaymentMethod('cash');
            setEnteredTotal('');
            setNotes('');
            setItems([
                { id: '', name: '', quantity: 1, unitPrice: 0, totalPrice: 0, unit: 'قطعة', isNewItem: false, specialty: 'General', type: 'Consumables', category: 'equipment' }
            ]);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // Calculate totals and pricing mode automatically
    const itemizedTotal = items.reduce((sum, item) => sum + (Number(item.totalPrice) || (Number(item.quantity) * Number(item.unitPrice || 0))), 0);
    const finalTotalAmount = itemizedTotal > 0 ? itemizedTotal : (parseFloat(enteredTotal) || 0);
    const pricingMode: 'itemized' | 'lump_sum' = itemizedTotal > 0 ? 'itemized' : 'lump_sum';

    // Row management
    const handleAddItemRow = () => {
        setItems(prev => [
            ...prev,
            { id: '', name: '', quantity: 1, unitPrice: 0, totalPrice: 0, unit: 'قطعة', isNewItem: false, specialty: 'General', type: 'Consumables', category: 'equipment' }
        ]);
    };

    const handleRemoveItemRow = (index: number) => {
        if (items.length <= 1) {
            setItems([{ id: '', name: '', quantity: 1, unitPrice: 0, totalPrice: 0, unit: 'قطعة', isNewItem: false, specialty: 'General', type: 'Consumables', category: 'equipment' }]);
            return;
        }
        setItems(prev => prev.filter((_, idx) => idx !== index));
    };

    const handleItemChange = (index: number, field: keyof PurchaseItem, value: any) => {
        setItems(prev => {
            const copy = [...prev];
            const item = { ...copy[index], [field]: value };

            // When an existing inventory item is selected
            if (field === 'id') {
                if (value === '__new__') {
                    item.id = '';
                    item.isNewItem = true;
                    item.name = '';
                } else if (value) {
                    const existing = inventory.find(i => i.id === value);
                    if (existing) {
                        item.id = existing.id;
                        item.name = existing.name;
                        item.unit = existing.unit || 'قطعة';
                        item.specialty = existing.category;
                        item.unitPrice = existing.unitPrice || 0;
                        item.isNewItem = false;
                    }
                } else {
                    item.id = '';
                    item.name = '';
                    item.isNewItem = false;
                }
            }

            // Recalculate row total
            if (field === 'quantity' || field === 'unitPrice') {
                const q = field === 'quantity' ? Number(value) || 0 : Number(item.quantity) || 0;
                const p = field === 'unitPrice' ? Number(value) || 0 : Number(item.unitPrice) || 0;
                item.totalPrice = q * p;
            }

            copy[index] = item;
            return copy;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (finalTotalAmount <= 0) {
            toast.error('يرجى إدخال المبلغ الإجمالي للفاتورة أو تسعير المواد');
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Process items and update stocks
            const validItems: PurchaseItem[] = [];

            for (const item of items) {
                const itemName = item.name.trim();
                const qty = Number(item.quantity) || 0;
                const unitCost = Number(item.unitPrice) || (qty > 0 && items.length > 0 ? (finalTotalAmount / items.length / qty) : 0);
                const rowTotal = item.totalPrice || (qty * unitCost);

                if (!itemName && items.length > 1) continue; // Skip empty rows if multiple
                if (!itemName && items.length === 1) {
                    // Bulk purchase without specific items
                    break;
                }

                if (purchaseType === 'inventory' && itemName) {
                    if (item.id && !item.isNewItem) {
                        // Increase existing item quantity
                        const existing = inventory.find(i => i.id === item.id);
                        if (existing) {
                            const newQty = (existing.quantity || 0) + qty;
                            await updateItem(existing.id, { 
                                quantity: newQty,
                                unitPrice: unitCost > 0 ? unitCost : existing.unitPrice
                            });

                            // Log movement 'in'
                            await logMovement({
                                clinicId: clinicId || '19',
                                itemId: existing.id,
                                itemName: existing.name,
                                movementType: 'in',
                                quantity: qty,
                                unitCost: unitCost,
                                totalCost: rowTotal,
                                recordedById: currentStaff?.id ? currentStaff.id.toString() : user?.id,
                                recorderName: currentStaff?.name || user?.name || 'أمين المخزن',
                                reason: 'توريد شراء',
                                notes: supplier ? `شراء من ${supplier} - فاتورة #${invoiceNumber || 'بدون رقم'}` : 'فاتورة مشتريات'
                            });
                        }
                    } else {
                        // Add as new catalog item
                        await addItem({
                            clinicId: clinicId || '19',
                            name: itemName,
                            category: item.specialty || 'General',
                            brand: item.type || 'Consumables',
                            quantity: qty,
                            minStock: 10,
                            unitPrice: unitCost,
                            unit: item.unit || 'قطعة',
                            supplier: supplier || 'مورد محلي',
                            expiryDate: ''
                        });
                    }
                } else if (purchaseType === 'fixed_asset' && itemName) {
                    // Add to fixed assets table
                    await addAsset({
                        clinicId: clinicId || '19',
                        name: itemName,
                        category: (item.category as any) || 'equipment',
                        purchaseDate: purchaseDate,
                        purchaseCost: rowTotal > 0 ? rowTotal : finalTotalAmount,
                        currency: 'IQD',
                        usefulLifeYears: 5,
                        salvageValue: 0,
                        status: 'active',
                        supplier: supplier,
                        description: notes || `أصل ثابت مضاف عبر فاتورة #${invoiceNumber || 'مشتريات'}`
                    });
                }

                validItems.push({
                    ...item,
                    name: itemName || (purchaseType === 'inventory' ? 'مشتريات مخزون متنوعة' : 'أصل ثابت'),
                    quantity: qty,
                    unitPrice: unitCost,
                    totalPrice: rowTotal
                });
            }

            // If no individual items were specified, create a single general purchase item entry
            if (validItems.length === 0) {
                validItems.push({
                    name: purchaseType === 'inventory' ? 'مشتريات مخزون عامة' : 'مشتريات أصول عامة',
                    quantity: 1,
                    unitPrice: finalTotalAmount,
                    totalPrice: finalTotalAmount,
                    unit: 'دفعة'
                });
            }

            // 2. Record the Purchase in Warehouse Purchases Ledger
            await addPurchase({
                clinicId: clinicId || '19',
                purchaseType,
                invoiceNumber: invoiceNumber.trim() || undefined,
                supplier: supplier.trim() || undefined,
                purchaseDate,
                totalAmount: finalTotalAmount,
                pricingMode,
                paymentMethod,
                items: validItems,
                notes: notes.trim() || undefined,
                recordedById: currentStaff?.id ? currentStaff.id.toString() : user?.id,
                recorderName: currentStaff?.name || user?.name || 'أمين المخزن'
            });

            toast.success(`تم تسجيل فاتورة المشتريات بقيمة ${formatCurrency(finalTotalAmount)} وتحديث الأرصدة بنجاح`);
            onSuccess?.();
            onClose();
        } catch (err: any) {
            console.error('Failed to add purchase:', err);
            toast.error(err.message || 'حدث خطأ أثناء حفظ فاتورة المشتريات');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-gray-100 max-h-[92vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 bg-gradient-to-r from-emerald-600 via-teal-600 to-slate-800 text-white shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                            <ShoppingCart className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">تسجيل فاتورة مشتريات جديدة</h3>
                            <p className="text-xs text-emerald-100">إضافة بضاعة للمخزن أو أصول ثابتة مع تحديث سجل المشتريات</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
                    {/* 1. Purchase Type Selector */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-2">نوع الأصل المشتـرى <span className="text-red-500">*</span></label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setPurchaseType('inventory')}
                                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border-2 transition-all cursor-pointer ${
                                    purchaseType === 'inventory'
                                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 font-bold shadow-xs'
                                        : 'border-gray-200 hover:border-gray-300 text-gray-600 bg-white'
                                }`}
                            >
                                <Package className={`w-4 h-4 ${purchaseType === 'inventory' ? 'text-emerald-600' : 'text-gray-400'}`} />
                                <span className="text-xs font-bold">مواد ومستلزمات مخزون</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setPurchaseType('fixed_asset')}
                                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border-2 transition-all cursor-pointer ${
                                    purchaseType === 'fixed_asset'
                                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold shadow-xs'
                                        : 'border-gray-200 hover:border-gray-300 text-gray-600 bg-white'
                                }`}
                            >
                                <Monitor className={`w-4 h-4 ${purchaseType === 'fixed_asset' ? 'text-blue-600' : 'text-gray-400'}`} />
                                <span className="text-xs font-bold">أصول ثابتة (أجهزة ومعدات)</span>
                            </button>
                        </div>
                    </div>

                    {/* 2. Invoice General Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-gray-50/70 p-3.5 rounded-xl border border-gray-100">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">المورد / المجهز</label>
                            <input
                                type="text"
                                value={supplier}
                                onChange={e => setSupplier(e.target.value)}
                                placeholder="مثال: مذخر الفرات، شركة الماسة"
                                className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">تاريخ الشراء</label>
                            <input
                                type="date"
                                value={purchaseDate}
                                onChange={e => setPurchaseDate(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 mb-1">طريقة السداد</label>
                            <select
                                value={paymentMethod}
                                onChange={e => setPaymentMethod(e.target.value as any)}
                                className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                                <option value="cash">نقدي (كاش العهدة)</option>
                                <option value="bank">تحويل بنكي</option>
                                <option value="card">بطاقة دفع</option>
                                <option value="credit">آجل (ذمم دائنة)</option>
                            </select>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-[11px] font-bold text-gray-700">
                                    المبلغ الإجمالي (د.ع) <span className="text-red-500">*</span>
                                </label>
                                {itemizedTotal > 0 && (
                                    <span className="text-[9px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
                                        محسوب من المواد
                                    </span>
                                )}
                            </div>
                            {itemizedTotal > 0 ? (
                                <div className="w-full px-2.5 py-1.5 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-black text-emerald-800 flex items-center justify-between">
                                    <span>{itemizedTotal.toLocaleString()} د.ع</span>
                                    <span className="text-[10px] font-medium text-emerald-600">تلقائي</span>
                                </div>
                            ) : (
                                <input
                                    type="number"
                                    min="1"
                                    step="500"
                                    value={enteredTotal}
                                    onChange={e => setEnteredTotal(e.target.value)}
                                    placeholder="أدخل الإجمالي د.ع"
                                    className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-extrabold text-emerald-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            )}
                        </div>
                    </div>

                    {/* 3. Items List Rows */}
                    <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                    <Layers className="w-4 h-4 text-emerald-600" />
                                    <span>قائمة المواد / الأصول في الفاتورة ({items.length})</span>
                                </h4>
                                <span className="text-[11px] text-gray-400 font-normal">
                                    (اختياري - يمكنك حفظ فاتورة إجمالية مباشرة دون تحديد مواد)
                                </span>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={handleAddItemRow}
                                className="text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 cursor-pointer py-1 px-2.5"
                            >
                                <Plus className="w-3.5 h-3.5 ml-1" />
                                إضافة مادة أخرى للفاتورة
                            </Button>
                        </div>

                        <div className="space-y-2.5">
                            {items.map((item, idx) => (
                                <div key={idx} className="p-3 bg-gray-50/80 rounded-xl border border-gray-200/80 space-y-2.5 transition-all">
                                    <div className="flex items-center justify-between text-xs font-bold text-gray-500">
                                        <span className="flex items-center gap-1 text-emerald-800">
                                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px]">
                                                {idx + 1}
                                            </span>
                                            {purchaseType === 'inventory' ? 'مادة مخزون' : 'أصل ثابت'}
                                        </span>
                                        {items.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItemRow(idx)}
                                                className="text-red-400 hover:text-red-600 p-1 cursor-pointer"
                                                title="حذف هذا السطر"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                                        {/* Name / Selection */}
                                        <div className="sm:col-span-5">
                                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                                {item.isNewItem ? 'اسم المادة الجديدة' : 'المادة أو العنصر'}
                                            </label>
                                            {purchaseType === 'inventory' ? (
                                                item.isNewItem ? (
                                                    <div className="flex gap-1.5">
                                                        <input
                                                            type="text"
                                                            value={item.name}
                                                            onChange={e => handleItemChange(idx, 'name', e.target.value)}
                                                            placeholder="اكتب اسم المادة الجديدة..."
                                                            className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleItemChange(idx, 'isNewItem', false)}
                                                            className="px-2 py-1 text-[10px] bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg cursor-pointer whitespace-nowrap"
                                                        >
                                                            اختيار من المخزن
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <select
                                                        value={item.id || ''}
                                                        onChange={e => handleItemChange(idx, 'id', e.target.value)}
                                                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                                                    >
                                                        <option value="">-- اختر مادة من المخزون (اختياري) --</option>
                                                        {inventory.map(inv => (
                                                            <option key={inv.id} value={inv.id}>
                                                                {inv.name} (الرصيد الحالي: {inv.quantity} {inv.unit})
                                                            </option>
                                                        ))}
                                                        <option value="__new__">➕ كتابة مادة جديدة غير مسجلة...</option>
                                                    </select>
                                                )
                                            ) : (
                                                <input
                                                    type="text"
                                                    value={item.name}
                                                    onChange={e => handleItemChange(idx, 'name', e.target.value)}
                                                    placeholder="مثال: جهاز أوتوكلاف، كرسي أسنان..."
                                                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                                />
                                            )}
                                        </div>

                                        {/* Quantity */}
                                        <div className="sm:col-span-2">
                                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">الكمية</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={e => handleItemChange(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                                                className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 text-center outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>

                                        {/* Unit */}
                                        <div className="sm:col-span-2">
                                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">الوحدة</label>
                                            <input
                                                type="text"
                                                value={item.unit || 'قطعة'}
                                                onChange={e => handleItemChange(idx, 'unit', e.target.value)}
                                                placeholder="علبة / قطعة"
                                                className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 text-center outline-none"
                                            />
                                        </div>

                                        {/* Unit Price */}
                                        <div className="sm:col-span-3">
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="block text-[11px] font-semibold text-gray-700">سعر المفرد (د.ع)</label>
                                                <span className="text-[10px] text-gray-400 font-normal">اختياري</span>
                                            </div>
                                            <input
                                                type="number"
                                                min="0"
                                                step="500"
                                                value={item.unitPrice || ''}
                                                onChange={e => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                placeholder="0 (اختياري)"
                                                className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-800 text-left outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 4. Notes */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">ملاحظات الفاتورة (اختياري)</label>
                        <input
                            type="text"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="أي ملاحظات حول الفاتورة أو المستلزمات..."
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                    </div>
                </form>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">إجمالي قيمة الفاتورة:</span>
                        <span className="text-base sm:text-lg font-extrabold text-emerald-700 bg-emerald-100/70 px-3 py-0.5 rounded-lg">
                            {formatCurrency(finalTotalAmount)}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="text-xs text-gray-500"
                        >
                            إلغاء
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting || finalTotalAmount <= 0}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2 cursor-pointer shadow-md shadow-emerald-600/20"
                        >
                            {isSubmitting ? 'جاري الحفظ والتحديث...' : 'تأكيد وحفظ الفاتورة'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
