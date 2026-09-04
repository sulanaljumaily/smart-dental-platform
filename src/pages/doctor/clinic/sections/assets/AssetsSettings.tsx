import React, { useState } from 'react';
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
    AlertCircle
} from 'lucide-react';
import { useClinicDepartments, ClinicDepartment } from '../../../../../hooks/useClinicDepartments';

interface AssetsSettingsProps {
    clinicId?: string;
}

export const AssetsSettings: React.FC<AssetsSettingsProps> = ({ clinicId }) => {
    const { 
        departments, 
        loading, 
        addDepartment, 
        updateDepartment, 
        deleteDepartment 
    } = useClinicDepartments(clinicId);

    const [isAdding, setIsAdding] = useState(false);
    const [newDeptName, setNewDeptName] = useState('');
    const [newDeptDesc, setNewDeptDesc] = useState('');

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');

    const handleStartEdit = (dept: ClinicDepartment) => {
        setEditingId(dept.id);
        setEditName(dept.name);
        setEditDesc(dept.description || '');
    };

    const handleSaveEdit = async (id: string) => {
        if (!editName.trim()) return;
        await updateDepartment(id, {
            name: editName.trim(),
            description: editDesc.trim()
        });
        setEditingId(null);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditName('');
        setEditDesc('');
    };

    const handleCreateDept = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDeptName.trim()) return;

        await addDepartment(newDeptName.trim(), newDeptDesc.trim());
        setNewDeptName('');
        setNewDeptDesc('');
        setIsAdding(false);
    };

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                            <Sliders className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">إعدادات الأصول والمخزن</h2>
                            <p className="text-blue-100 text-xs sm:text-sm mt-0.5">
                                إدارة الأقسام والعيادات الداخلية وسياسات عهدة وصرفيات المخزن
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main: Departments Management (2 cols) */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <div className="p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-gray-100">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-5 h-5 text-blue-600" />
                                        <h3 className="text-lg font-bold text-gray-900">أقسام وعيادات المركز</h3>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        تُستخدم لتوجيه وتوثيق استهلاك مواد المخزون وتحديد العيادة المستفيدة
                                    </p>
                                </div>
                                {!isAdding && (
                                    <Button
                                        onClick={() => setIsAdding(true)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0"
                                    >
                                        <Plus className="w-4 h-4 ml-1.5" />
                                        إضافة قسم أو عيادة
                                    </Button>
                                )}
                            </div>

                            {/* Add Department Form */}
                            {isAdding && (
                                <form onSubmit={handleCreateDept} className="my-5 p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-3 animate-in fade-in duration-200">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-blue-900">إضافة قسم أو عيادة جديدة:</span>
                                        <button
                                            type="button"
                                            onClick={() => setIsAdding(false)}
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
                                            onClick={() => setIsAdding(false)}
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
                                {loading ? (
                                    <div className="text-center py-8 text-sm text-gray-500">جاري تحميل الأقسام...</div>
                                ) : departments.length === 0 ? (
                                    <div className="text-center py-8 text-sm text-gray-400">
                                        لم يتم تسجيل أي أقسام بعد. سيتم اعتماد قسم باسم العيادة تلقائياً.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {departments.map((dept, idx) => (
                                            <div key={dept.id} className="py-3.5 flex items-center justify-between gap-4 group">
                                                {editingId === dept.id ? (
                                                    <div className="flex-1 flex flex-col sm:flex-row items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={editName}
                                                            onChange={(e) => setEditName(e.target.value)}
                                                            className="flex-1 px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                                            autoFocus
                                                        />
                                                        <input
                                                            type="text"
                                                            value={editDesc}
                                                            onChange={(e) => setEditDesc(e.target.value)}
                                                            placeholder="الوصف..."
                                                            className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                                        />
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => handleSaveEdit(dept.id)}
                                                                className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-xs"
                                                                title="حفظ التعديل"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={handleCancelEdit}
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
                                                                            القسم التلقائي المعتمد
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
                                                                onClick={() => handleStartEdit(dept)}
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

                {/* Sidebar Guide: Policies & Information (1 col) */}
                <div className="space-y-6">
                    {/* Custody Info Card */}
                    <Card>
                        <div className="p-5 space-y-4">
                            <div className="flex items-center gap-2.5 text-blue-700">
                                <Wallet className="w-5 h-5" />
                                <h4 className="font-bold text-sm">نظام عهدة المخزن المباشرة</h4>
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                ترتبط عهدة المخزن آلياً بقسم المالية. عند تسجيل أي مصروف في المالية بنوع 
                                <span className="font-bold text-gray-800"> "مشتريات مخزون"</span> يتم قيد المبلغ كعهدة نقدية للمخزن.
                            </p>
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2 text-xs">
                                <div className="flex items-center gap-2 text-gray-800 font-semibold">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>رصيد الفائض (+):</span>
                                </div>
                                <p className="text-gray-500 text-[11px] mr-6">
                                    المبالغ المحولة للمخزن تزيد عن فواتير الشراء المسجلة (سيولة متاحة بالمخزن).
                                </p>
                                <div className="flex items-center gap-2 text-gray-800 font-semibold pt-1">
                                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                    <span>المخزن يطلب العيادة (-):</span>
                                </div>
                                <p className="text-gray-500 text-[11px] mr-6">
                                    قيمة المشتريات تجاوزت المبالغ المحولة (شراء آجل أو دفع من الجيب يتطلب تعويض من المالية).
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Dispense Policy Card */}
                    <Card>
                        <div className="p-5 space-y-3">
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
            </div>
        </div>
    );
};
