import React, { useState, useEffect } from 'react';
import { X, PackageMinus, User, Building2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../common/Button';
import { formatCurrency } from '../../lib/utils';
import { InventoryItem } from '../../hooks/useInventory';
import { useClinicDepartments } from '../../hooks/useClinicDepartments';
import { useStaff } from '../../hooks/useStaff';
import { useAuth } from '../../contexts/AuthContext';

interface DispenseItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: InventoryItem | null;
    clinicId?: string;
    onConfirm: (data: {
        quantity: number;
        unitCost: number;
        totalCost: number;
        departmentId?: string;
        departmentName?: string;
        recipientId?: string;
        recipientName?: string;
        recordedById?: string;
        recorderName?: string;
        reason?: string;
        notes?: string;
    }) => Promise<void>;
}

export const DispenseItemModal: React.FC<DispenseItemModalProps> = ({
    isOpen,
    onClose,
    item,
    clinicId,
    onConfirm
}) => {
    const { user } = useAuth();
    const { departments } = useClinicDepartments(clinicId);
    const { staff } = useStaff(clinicId);

    const [quantity, setQuantity] = useState<number>(1);
    const [departmentId, setDepartmentId] = useState<string>('');
    const [recipientId, setRecipientId] = useState<string>('');
    const [reason, setReason] = useState<string>('استهلاك عيادة');
    const [notes, setNotes] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Auto-select department if there is only one department
    useEffect(() => {
        if (isOpen && departments.length === 1) {
            setDepartmentId(departments[0].id);
        } else if (isOpen && !departmentId && departments.length > 0) {
            // If only one active department exists
            const activeDepts = departments.filter(d => d.isActive);
            if (activeDepts.length === 1) {
                setDepartmentId(activeDepts[0].id);
            }
        }
    }, [isOpen, departments, departmentId]);

    // Reset form when modal opens with a new item
    useEffect(() => {
        if (isOpen && item) {
            setQuantity(1);
            setNotes('');
            setReason('استهلاك عيادة');
            setError(null);
        }
    }, [isOpen, item]);

    if (!isOpen || !item) return null;

    const unitCost = Number(item.unitPrice) || 0;
    const totalCost = quantity * unitCost;
    const maxQuantity = Number(item.quantity) || 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (quantity <= 0) {
            setError('يرجى إدخال كمية صحيحة أكبر من صفر');
            return;
        }

        if (quantity > maxQuantity) {
            setError(`الكمية المطلوبة (${quantity}) تتجاوز الرصيد المتوفر في المخزن (${maxQuantity})`);
            return;
        }

        setSubmitting(true);
        try {
            const selectedDept = departments.find(d => d.id === departmentId);
            const selectedStaff = staff.find(s => s.id === recipientId);

            await onConfirm({
                quantity,
                unitCost,
                totalCost,
                departmentId: departmentId || undefined,
                departmentName: selectedDept?.name || undefined,
                recipientId: recipientId || undefined,
                recipientName: selectedStaff?.name || undefined,
                recordedById: user?.id,
                recorderName: user?.name || 'مسؤول المخزن',
                reason: reason || 'صرف مادة',
                notes: notes.trim() || undefined
            });

            onClose();
        } catch (err: any) {
            console.error('Error dispensing item:', err);
            setError(err.message || 'حدث خطأ أثناء تسجيل صرفية المادة');
        } finally {
            setSubmitting(false);
        }
    };

    const quickReasons = [
        'استهلاك عيادة',
        'جلسة علاج مراجع',
        'نقل للتعقيم',
        'تالف أو منتهي الصلاحية'
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden my-8 transform transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                            <PackageMinus className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-900">صرف مادة من المخزون</h3>
                            <p className="text-xs text-gray-500">تسجيل وتوثيق خروج المواد إلى العيادات والكادر</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Item Summary Box */}
                    <div className="bg-gray-50/90 rounded-xl p-3.5 border border-gray-100 flex items-center justify-between">
                        <div>
                            <span className="text-xs font-medium text-gray-500 block">المادة المحددة:</span>
                            <span className="font-bold text-gray-900 text-sm">{item.name}</span>
                            {item.brand && (
                                <span className="text-xs text-gray-400 block">{item.brand}</span>
                            )}
                        </div>
                        <div className="text-left">
                            <span className="text-xs text-gray-500 block">الرصيد المتوفر:</span>
                            <span className={`font-bold text-sm ${maxQuantity <= (item.minStock || 0) ? 'text-orange-600' : 'text-blue-600'}`}>
                                {maxQuantity} {item.unit || 'قطعة'}
                            </span>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-medium">
                            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Quantity & Calculated Cost Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                الكمية المراد صرفها <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="1"
                                    max={maxQuantity}
                                    value={quantity}
                                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    required
                                />
                                <span className="absolute left-3 top-2.5 text-xs text-gray-400 pointer-events-none">
                                    {item.unit || 'وحدة'}
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                قيمة الصرفية المحسوبة
                            </label>
                            <div className="px-3.5 py-2.5 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between">
                                <span className="text-xs text-blue-700 font-medium">الإجمالي:</span>
                                <span className="font-extrabold text-blue-900 text-sm">
                                    {formatCurrency(totalCost)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Department / Clinic Selector (Auto-selects if 1 clinic) */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-gray-500" />
                                <span>القسم أو العيادة المستفيدة</span>
                                <span className="text-[10px] text-gray-400 font-normal">(اختياري)</span>
                            </label>
                            {departments.length === 1 && (
                                <span className="text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> تم التحديد تلقائياً
                                </span>
                            )}
                        </div>
                        <select
                            value={departmentId}
                            onChange={(e) => setDepartmentId(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        >
                            <option value="">-- غير محدد (صرف عام) --</option>
                            {departments.map((dept) => (
                                <option key={dept.id} value={dept.id}>
                                    {dept.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Recipient Selector (Optional) */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-gray-500" />
                            <span>المستلم (طبيب / كادر)</span>
                            <span className="text-[10px] text-gray-400 font-normal">(اختياري)</span>
                        </label>
                        <select
                            value={recipientId}
                            onChange={(e) => setRecipientId(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        >
                            <option value="">-- اختياري (غير محدد) --</option>
                            {staff.map((member) => (
                                <option key={member.id} value={member.id}>
                                    {member.name} {member.role_title ? `(${member.role_title})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Reason / Quick Tags */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                            سبب أو غرض الصرف
                        </label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {quickReasons.map((qr) => (
                                <button
                                    key={qr}
                                    type="button"
                                    onClick={() => setReason(qr)}
                                    className={`px-2.5 py-1 text-xs rounded-lg transition-colors border font-medium ${
                                        reason === qr
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                    }`}
                                >
                                    {qr}
                                </button>
                            ))}
                        </div>
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="ملاحظات إضافية أو تفاصيل الاستخدام (اختياري)..."
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            disabled={submitting}
                            className="text-gray-600 hover:bg-gray-100"
                        >
                            إلغاء
                        </Button>
                        <Button
                            type="submit"
                            disabled={submitting || maxQuantity <= 0}
                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 px-5"
                        >
                            {submitting ? 'جاري الصرف والتسجيل...' : 'تأكيد صرف المادة'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
