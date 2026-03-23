import React, { useState, useEffect } from 'react';
import { X, Save, FileText, Calendar, DollarSign, Activity, CheckCircle, AlertCircle, ChevronRight, ChevronDown, Stethoscope, Clock, Shield, Beaker } from 'lucide-react';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { Modal } from '../common/Modal'; // Import Modal
import { TreatmentAsset } from '../../data/mock/assets';
import { getWorkflowForAsset, TreatmentWorkflow } from '../../lib/treatment-registry';
import { formatCurrency } from '../../lib/utils';
import { ToothCondition } from '../../types/treatment';

interface ToothInteractionModalProps {
    isOpen: boolean;
    onClose: () => void;
    toothNumber: number;
    initialData?: Partial<ToothCondition>;
    onSave: (data: any) => void;
    availableTreatments?: TreatmentAsset[];
    initialTab?: 'general' | 'treatment';
}

export const ToothInteractionModal: React.FC<ToothInteractionModalProps> = ({
    isOpen,
    onClose,
    toothNumber,
    initialData,
    onSave,
    availableTreatments = [],
    initialTab = 'general'
}) => {
    const [activeTab, setActiveTab] = useState<'general' | 'treatment' | 'confirm'>(initialTab);

    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
        }
    }, [isOpen, initialTab]);
    const [formData, setFormData] = useState<{
        toothCondition: any; // Relaxing type to avoid strict union issues with dynamic data
        diagnosis: string;
        notes: string;
        selectedAssetId: string;
        customCost: number;
        priority: string;
        startDate: string;
        assignedDoctor: string;
    }>({
        toothCondition: initialData?.condition || 'healthy',
        diagnosis: initialData?.notes || '',
        notes: '',
        selectedAssetId: '',
        customCost: 0,
        priority: 'medium',
        startDate: new Date().toISOString().split('T')[0],
        assignedDoctor: 'د. أحمد محمد'
    });

    const [selectedAsset, setSelectedAsset] = useState<TreatmentAsset | null>(null);
    const [selectedWorkflow, setSelectedWorkflow] = useState<TreatmentWorkflow | null>(null);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen && initialData) {
            setFormData({
                toothCondition: initialData.condition || 'healthy',
                diagnosis: initialData.notes || '',
                notes: '',
                selectedAssetId: '',
                customCost: 0,
                priority: 'medium',
                startDate: new Date().toISOString().split('T')[0],
                assignedDoctor: 'د. أحمد محمد'
            });
            setSelectedAsset(null);
            setSelectedWorkflow(null);
        }
    }, [isOpen, initialData, toothNumber]);

    // Handle Initial Tab
    useEffect(() => {
        if (isOpen) {
            // If explicit prop or logic needed, handle here. 
            // For now, we will expose a prop in the next step or parent controls it.
            // But we can reset to 'general' default if not controlled.
        }
    }, [isOpen]);

    // Handle Asset Selection
    useEffect(() => {
        if (formData.selectedAssetId && availableTreatments.length > 0) {
            const asset = availableTreatments.find(t => t.id === formData.selectedAssetId);
            if (asset) {
                setSelectedAsset(asset);
                setFormData(prev => ({ ...prev, customCost: asset.basePrice }));

                // Determine Clinical Workflow from Registry
                const workflow = getWorkflowForAsset(asset.name, asset.category);
                setSelectedWorkflow(workflow);
            }
        } else {
            setSelectedAsset(null);
            setSelectedWorkflow(null);
        }
    }, [formData.selectedAssetId, availableTreatments]);

    // Group treatments by category for better UI
    const groupedTreatments = React.useMemo(() => {
        const groups: Record<string, TreatmentAsset[]> = {};
        availableTreatments.forEach(t => {
            if (!groups[t.category]) groups[t.category] = [];
            groups[t.category].push(t);
        });
        return groups;
    }, [availableTreatments]);

    const handleSaveCondition = () => {
        onSave({
            toothNumber,
            condition: formData.toothCondition,
            notes: formData.diagnosis // Save diagnosis as main note
        });
        onClose();
    };

    const handleConfirmTreatment = () => {
        if (!selectedAsset || !selectedWorkflow) return;

        // Calculate total duration
        const totalDuration = selectedWorkflow.defaultSessions.reduce((acc, s) => acc + s.duration, 0);


        // Determine the "Resulting Condition" based on the Treatment Type
        // This satisfies the user requirement: "Shape changes after selecting treatment"
        let resultingCondition = formData.toothCondition;

        if (selectedWorkflow.type === 'endo' || selectedAsset.category === 'علاج جذور') {
            resultingCondition = 'endo';
        } else if (selectedWorkflow.type === 'implant' || (selectedAsset.category === 'جراحة' && selectedAsset.name.includes('Implant'))) {
            resultingCondition = 'implant';
        } else if (selectedWorkflow.type === 'prosthetic' || selectedAsset.category === 'تعويضات') {
            if (selectedAsset.name.toLowerCase().includes('crown') || selectedAsset.name.includes('تاج')) {
                resultingCondition = 'crown';
            } else {
                resultingCondition = 'crown'; // Default prosthetic visual
            }
        } else if (selectedAsset.name.toLowerCase().includes('extraction') || selectedAsset.name.includes('قلع')) {
            resultingCondition = 'missing';
        } else if (selectedAsset.category === 'ترميمي' || selectedAsset.category === 'Restorative') {
            resultingCondition = 'filled';
        }

        onSave({
            toothNumber,
            condition: resultingCondition, // Apply predictive visual condition
            treatmentType: selectedWorkflow.type,
            notes: formData.notes || formData.diagnosis, // Combine notes

            // Plan Meta Data
            estimatedCost: formData.customCost,
            startDate: formData.startDate,

            // Construct the Plan
            treatmentPlan: {
                assetId: selectedAsset.id,
                workflowType: selectedWorkflow.type,
                name: selectedAsset.name,

                // Session Generation based on Registry
                sessions: selectedWorkflow.defaultSessions.map((s, idx) => ({
                    title: s.title,
                    duration: s.duration,
                    schemaId: s.schemaId, // Important: This links to the Dynamic Forms
                    status: 'pending'
                })),

                requiresLab: selectedWorkflow.requiresLab || selectedAsset.isComplex
            }
        });
        onClose();
    };

    const conditions = [
        { id: 'healthy', label: 'سليم', color: 'bg-green-100 text-green-800' },
        { id: 'cavity', label: 'تسوس', color: 'bg-red-100 text-red-800' },
        { id: 'broken', label: 'مكسور', color: 'bg-orange-100 text-orange-800' },
        { id: 'missing', label: 'مفقود', color: 'bg-gray-100 text-gray-800' },
        { id: 'stained', label: 'تصبغ', color: 'bg-yellow-100 text-yellow-800' },
        { id: 'abscess', label: 'خراج', color: 'bg-red-200 text-red-900' }
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="2xl"
            contentClassName="p-0"
        >
            <div className="flex flex-col h-full bg-gray-50/50">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 flex justify-between items-center shadow-md z-10 sticky top-0">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <Activity className="w-6 h-6" />
                            </div>
                            تفاعل السن رقم {toothNumber}
                        </h2>
                        <p className="text-blue-100 opacity-90 mt-1 mr-14">تشخيص الحالة واختيار خطة العلاج المناسبة</p>
                    </div>
                    {/* Close button is handled by Modal typically, but we suppressed the header. 
                        Actually standard Modal normally has a close button in its header. 
                        Since we passed no title, we might miss the close button if Modal logic hides header when title is missing.
                        Checking Modal.tsx logic: {title && ( ... )} -> yes, it hides the entire header bar if no title.
                        So we need to add our own close button here if we want the custom header look.
                    */}
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Stepper / Status Bar */}
                <div className="bg-gray-50 border-b p-4 flex justify-between items-center text-sm shadow-sm z-10">
                    <div className="flex items-center gap-3">
                        <span className="text-gray-500 font-medium">الحالة الحالية:</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ring-1 ring-inset ${conditions.find(c => c.id === formData.toothCondition)?.color || 'bg-gray-100'
                            }`}>
                            {conditions.find(c => c.id === formData.toothCondition)?.label || formData.toothCondition}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {['general', 'treatment', 'confirm'].map((step, idx) => (
                            <div key={step} className={`flex items-center ${idx < 2 ? 'after:content-[""] after:w-8 after:h-0.5 after:mx-2 after:bg-gray-200' : ''}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${activeTab === step ? 'bg-blue-600 text-white shadow-md scale-110' :
                                    (idx < ['general', 'treatment', 'confirm'].indexOf(activeTab)) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                                    }`}>
                                    {idx + 1}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-6">
                    {activeTab === 'general' && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                            <Card className="p-8 border-blue-100 shadow-sm bg-white">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-gray-800 border-b pb-4">
                                    <Stethoscope className="w-5 h-5 text-blue-600" />
                                    التشخيص الأولي للحالة
                                </h3>

                                <div className="mb-8">
                                    <label className="block text-sm font-bold text-gray-700 mb-4">اختر حالة السن الظاهرية</label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                        {conditions.map(cond => (
                                            <button
                                                key={cond.id}
                                                onClick={() => setFormData(prev => ({ ...prev, toothCondition: cond.id }))}
                                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 hover:shadow-md ${formData.toothCondition === cond.id
                                                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200 transform scale-105'
                                                    : 'border-transparent bg-white hover:border-gray-200'
                                                    }`}
                                            >
                                                <div className={`w-3 h-3 rounded-full ${cond.color.split(' ')[0].replace('bg-', 'bg-')}`}></div>
                                                <span className={`text-sm font-bold ${formData.toothCondition === cond.id ? 'text-blue-700' : 'text-gray-600'}`}>
                                                    {cond.label}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">ملاحظات التشخيص السريري</label>
                                    <textarea
                                        className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none shadow-sm transition-shadow focus:shadow-md"
                                        rows={4}
                                        placeholder="اكتب تفاصيل التشخيص هنا... (مثلاً: تسوس عميق واصل للعصب، ألم عند الطرق، حركة درجة 1)"
                                        value={formData.diagnosis}
                                        onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                                    />
                                </div>
                            </Card>

                            <div className="flex justify-end gap-4 pt-4">
                                <Button variant="outline" onClick={handleSaveCondition} className="hover:bg-gray-50">
                                    حفظ الحالة فقط (بدون خطة)
                                </Button>
                                <Button onClick={() => setActiveTab('treatment')} className="bg-blue-600 hover:bg-blue-700 text-white px-8">
                                    التالي: اختيار العلاج
                                    <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'treatment' && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                            {/* Categories Filter could go here */}

                            <div className="grid grid-cols-1 gap-8">
                                {Object.entries(groupedTreatments).map(([category, treatments]) => (
                                    <div key={category}>
                                        <h4 className="font-bold text-gray-700 mb-4 px-2 border-r-4 border-blue-500 bg-gray-100 py-1 rounded-l-md inline-block">
                                            {category}
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {treatments.map(asset => (
                                                <div
                                                    key={asset.id}
                                                    onClick={() => setFormData(prev => ({ ...prev, selectedAssetId: asset.id }))}
                                                    className={`cursor-pointer group relative overflow-hidden rounded-xl border-2 p-5 transition-all hover:shadow-lg ${formData.selectedAssetId === asset.id
                                                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                                        : 'border-white bg-white hover:border-blue-200'
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className={`px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-600`}>
                                                            {asset.category}
                                                        </span>
                                                        {asset.isComplex && (
                                                            <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full border border-orange-100">
                                                                <Clock className="w-3 h-3" /> جلسات متعددة
                                                            </span>
                                                        )}
                                                    </div>

                                                    <h4 className="font-bold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors">{asset.name}</h4>

                                                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                                                        <span className="font-bold text-lg text-blue-600">{formatCurrency(asset.basePrice)}</span>
                                                        <div className="text-xs text-gray-400">
                                                            {/* Placeholder for matched registry info */}
                                                            {getWorkflowForAsset(asset.name, asset.category).defaultSessions.length} جلسات مقدرة
                                                        </div>
                                                    </div>

                                                    {/* Selection Indicator */}
                                                    {formData.selectedAssetId === asset.id && (
                                                        <div className="absolute top-0 left-0 bg-blue-500 text-white p-1 rounded-br-lg shadow-sm">
                                                            <CheckCircle className="w-4 h-4" />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between items-center pt-6 border-t mt-4 sticky bottom-0 bg-gray-50/95 backdrop-blur-sm p-4 border-t-gray-200 -mx-6 -mb-6">
                                <Button variant="ghost" onClick={() => setActiveTab('general')}>
                                    السابق
                                </Button>
                                <Button
                                    onClick={() => setActiveTab('confirm')}
                                    disabled={!formData.selectedAssetId}
                                    className={`px-8 transition-all ${!formData.selectedAssetId ? 'opacity-50 grayscale' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'}`}
                                >
                                    التالي: تأكيد الخطة
                                    <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'confirm' && selectedAsset && selectedWorkflow && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Summary Card */}
                                <Card className="lg:col-span-2 p-0 overflow-hidden border-blue-200">
                                    <div className="bg-blue-50/50 p-6 border-b border-blue-100">
                                        <h3 className="text-lg font-bold flex items-center gap-2 text-blue-900">
                                            <FileText className="w-5 h-5 text-blue-600" />
                                            ملخص الخطة العلاجية
                                        </h3>
                                    </div>

                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-8">
                                            <div>
                                                <p className="text-sm text-gray-500 mb-1 font-medium">نوع العلاج المختار</p>
                                                <h4 className="font-bold text-xl text-gray-900">{selectedAsset.name}</h4>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md">{selectedAsset.category}</span>
                                                    {selectedWorkflow.requiresLab && (
                                                        <span className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-md flex items-center gap-1 border border-orange-100">
                                                            <Beaker className="w-3 h-3" /> يتطلب مختبر
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm text-gray-500 mb-1 font-medium">التكلفة التقديرية</p>
                                                <p className="font-bold text-xl text-blue-600 font-mono">{formatCurrency(formData.customCost)}</p>
                                            </div>
                                        </div>

                                        <div className="mt-6">
                                            <h5 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-gray-500" />
                                                سير العمل المقترح ({selectedWorkflow.defaultSessions.length} جلسات)
                                            </h5>
                                            <div className="space-y-0 relative before:absolute before:inset-y-0 before:right-3.5 before:w-0.5 before:bg-gray-200">
                                                {selectedWorkflow.defaultSessions.map((session, idx) => (
                                                    <div key={idx} className="relative flex items-center gap-4 py-3 pr-8">
                                                        <div className="absolute right-1.5 w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-500 z-10"></div>
                                                        <div className="flex-1 bg-gray-50 rounded-lg p-3 border border-gray-100 flex justify-between items-center hover:bg-white hover:shadow-sm transition-all">
                                                            <div>
                                                                <span className="text-xs font-bold text-blue-600 block mb-0.5">جلسة {idx + 1}</span>
                                                                <span className="text-sm font-medium text-gray-800">{session.title}</span>
                                                            </div>
                                                            <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border shadow-sm">
                                                                {session.duration} دقيقة
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                {/* Settings Sidebar */}
                                <div className="space-y-6">
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                                        <h4 className="font-bold text-gray-800 mb-4 pb-2 border-b">إعدادات الخطة</h4>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1.5">تعديل التكلفة</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={formData.customCost}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, customCost: parseFloat(e.target.value) }))}
                                                        className="w-full p-2.5 pl-8 bg-gray-50 border border-gray-200 rounded-lg font-bold text-green-700 outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                                                    />
                                                    <DollarSign className="w-4 h-4 text-green-600 absolute left-2.5 top-3" />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1.5">الأولوية</label>
                                                <div className="relative">
                                                    <select
                                                        value={formData.priority}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                                                        className="w-full p-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500"
                                                    >
                                                        <option value="low">منخفضة</option>
                                                        <option value="medium">متوسطة</option>
                                                        <option value="high">عالية</option>
                                                        <option value="urgent">طوارئ</option>
                                                    </select>
                                                    <ChevronDown className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1.5">تاريخ البدء</label>
                                                <input
                                                    type="date"
                                                    value={formData.startDate}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                                    className="w-full p-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1.5">ملاحظات إضافية</label>
                                                <textarea
                                                    rows={2}
                                                    value={formData.notes}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                                    className="w-full p-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                    placeholder="أية ملاحظات خاصة..."
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleConfirmTreatment}
                                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-100 py-3 text-lg font-bold rounded-xl transform transition-all hover:-translate-y-1"
                                    >
                                        <CheckCircle className="w-5 h-5 ml-2" />
                                        اعتماد الخطة العلاجية
                                    </Button>

                                    <Button variant="ghost" onClick={() => setActiveTab('treatment')} className="w-full text-gray-500">
                                        العودة للاختيار
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};
