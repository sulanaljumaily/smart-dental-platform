import React, { useState, useEffect } from 'react';
import { X, Save, Activity } from 'lucide-react';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { ToothCondition } from '../../types/treatment';

interface ToothConditionModalProps {
    isOpen: boolean;
    onClose: () => void;
    toothNumber: number;
    initialCondition?: ToothCondition['condition'];
    initialNotes?: string;
    onSave: (toothNumber: number, condition: ToothCondition['condition'], notes: string) => void;
}

export const ToothConditionModal: React.FC<ToothConditionModalProps> = ({
    isOpen,
    onClose,
    toothNumber,
    initialCondition = 'healthy',
    initialNotes = '',
    onSave
}) => {
    const [condition, setCondition] = useState<ToothCondition['condition']>(initialCondition);
    const [notes, setNotes] = useState(initialNotes);

    useEffect(() => {
        if (isOpen) {
            setCondition(initialCondition);
            setNotes(initialNotes);
        }
    }, [isOpen, initialCondition, initialNotes]);

    const conditions = [
        { id: 'healthy',  label: 'سليم',   color: 'bg-green-100 text-green-800',   dotColor: 'bg-green-400',  icon: '✓' },
        { id: 'decayed',  label: 'تسوس',   color: 'bg-red-100 text-red-800',       dotColor: 'bg-red-500',    icon: '●' },
        { id: 'broken',   label: 'مكسور',  color: 'bg-orange-100 text-orange-800', dotColor: 'bg-orange-500', icon: '✕' },
        { id: 'missing',  label: 'مفقود',  color: 'bg-gray-100 text-gray-800',     dotColor: 'bg-gray-400',   icon: '○' },
        { id: 'stained',  label: 'تصبغ',   color: 'bg-yellow-100 text-yellow-800', dotColor: 'bg-yellow-500', icon: '◐' },
        { id: 'abscess',  label: 'خراج',   color: 'bg-rose-100 text-rose-900',     dotColor: 'bg-rose-600',   icon: '⊕' },
        { id: 'impacted', label: 'مطمور',  color: 'bg-purple-100 text-purple-800', dotColor: 'bg-purple-500', icon: '↓' },
        { id: 'mobile',   label: 'حركة السن', color: 'bg-teal-100 text-teal-800', dotColor: 'bg-teal-500', icon: '⏵' },
    ];

    const handleSave = () => {
        onSave(toothNumber, condition, notes);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg" contentClassName="p-0">
            <div className="flex flex-col bg-gray-50/50">
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-600 to-emerald-700 text-white p-6 flex justify-between items-center shadow-md">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <Activity className="w-5 h-5" />
                            </div>
                            تعديل حالة السن رقم {toothNumber}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                        <div className="mb-8">
                        <label className="block text-sm font-bold text-gray-700 mb-4">اختر حالة السن التشخيصية</label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                            {conditions.map(cond => (
                                <button
                                    key={cond.id}
                                    onClick={() => setCondition(cond.id as any)}
                                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 hover:shadow-md ${condition === cond.id
                                        ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200 transform scale-105'
                                        : `border-transparent bg-white hover:border-gray-200`
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${cond.dotColor}`}>
                                        {cond.icon}
                                    </div>
                                    <span className={`text-xs font-bold ${condition === cond.id ? 'text-teal-700' : 'text-gray-600'}`}>
                                        {cond.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">ملاحظات إضافية (اختياري)</label>
                        <textarea
                            className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                            rows={3}
                            placeholder="اكتب أية ملاحظات تشخيصية هنا..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    <div className="mt-8 flex justify-end gap-3 pt-4 border-t">
                        <Button variant="ghost" onClick={onClose} className="text-gray-500 hover:bg-gray-100">
                            إلغاء
                        </Button>
                        <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700 text-white px-8">
                            <Save className="w-4 h-4 ml-2" />
                            حفظ الحالة
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
