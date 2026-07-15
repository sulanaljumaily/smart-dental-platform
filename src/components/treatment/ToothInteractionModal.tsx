import React, { useState, useEffect } from 'react';
import { X, Save, FileText, Calendar, DollarSign, Activity, CheckCircle, AlertCircle, ChevronRight, ChevronDown, Stethoscope, Clock, Shield, Beaker } from 'lucide-react';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { Modal } from '../common/Modal';
import { TreatmentAsset } from '../../data/mock/assets';
import { getWorkflowForAsset, TreatmentWorkflow } from '../../lib/treatment-registry';
import { formatCurrency } from '../../lib/utils';
import { ToothCondition } from '../../types/treatment';
import { HEALTHY_TEETH_SVGS } from '../../constants/healthyTeeth';
import { useStaff } from '../../hooks/useStaff';


interface ToothInteractionModalProps {
    isOpen: boolean;
    onClose: () => void;
    // Multi-tooth support
    toothNumbers: number[];
    onSave: (data: any) => void;
    availableTreatments?: TreatmentAsset[];
    clinicId?: string;
    defaultDoctorName?: string;
}

export const ToothInteractionModal: React.FC<ToothInteractionModalProps> = ({
    isOpen,
    onClose,
    toothNumbers = [],
    onSave,
    availableTreatments = [],
    clinicId,
    defaultDoctorName
}) => {
    // Only two tabs now: treatment and confirm
    const [activeTab, setActiveTab] = useState<'treatment' | 'confirm'>('treatment');
    const { staff } = useStaff(clinicId);

    const doctors = staff.filter(s => 
        s.position === 'doctor' || 
        s.role_title?.toLowerCase().includes('doctor') || 
        s.role_title?.includes('طبيب') ||
        s.name.includes('د.')
    );

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setActiveTab('treatment');
            setFormData({
                notes: '',
                selectedAssetId: '',
                customCost: 0, // Cost PER TOOTH
                priority: 'medium',
                startDate: new Date().toISOString().split('T')[0],
                assignedDoctor: defaultDoctorName || (doctors[0]?.name || 'د. أحمد محمد')
            });
            setSelectedAsset(null);
            setSelectedWorkflow(null);
        }
    }, [isOpen, toothNumbers, defaultDoctorName, staff]);

    const [formData, setFormData] = useState({
        notes: '',
        selectedAssetId: '',
        customCost: 0,
        priority: 'medium',
        startDate: new Date().toISOString().split('T')[0],
        assignedDoctor: 'د. أحمد محمد'
    });

    const [selectedAsset, setSelectedAsset] = useState<TreatmentAsset | null>(null);
    const [selectedWorkflow, setSelectedWorkflow] = useState<TreatmentWorkflow | null>(null);

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

        // If toothNumbers includes 0, it means "General Treatment" (e.g. cleaning, whitening)
        const isGeneral = toothNumbers.length === 1 && toothNumbers[0] === 0;

        availableTreatments.filter(t => {
            const treatmentScope = t.scope || 'tooth';
            if (isGeneral) {
                return treatmentScope === 'general' || treatmentScope === 'both';
            } else {
                return treatmentScope === 'tooth' || treatmentScope === 'both';
            }
        }).forEach(t => {
            if (!groups[t.category]) groups[t.category] = [];
            groups[t.category].push(t);
        });
        return groups;
    }, [availableTreatments, toothNumbers]);

    const handleConfirmTreatment = () => {
        if (!selectedAsset || !selectedWorkflow) return;

        // Determine the "Resulting Condition" based on the Treatment Type
        let resultingCondition = 'healthy'; // Default fallback, but actually it will be merged with current condition in parent

        if (selectedWorkflow.type === 'endo' || selectedAsset.category === 'علاج جذور') {
            resultingCondition = 'endo';
        } else if (selectedWorkflow.type === 'implant' || (selectedAsset.category === 'جراحة' && selectedAsset.name.includes('Implant'))) {
            resultingCondition = 'implant';
        } else if (selectedWorkflow.type === 'prosthetic' || selectedAsset.category === 'تعويضات') {
            resultingCondition = 'crown';
        } else if (selectedAsset.name.toLowerCase().includes('extraction') || selectedAsset.name.includes('قلع')) {
            resultingCondition = 'missing';
        } else if (selectedAsset.category === 'ترميمي' || selectedAsset.category === 'Restorative') {
            resultingCondition = 'filled';
        }

        onSave({
            toothNumbers,
            condition: resultingCondition, // Applied predictive visual condition per tooth
            treatmentType: selectedWorkflow.type,
            notes: formData.notes,

            estimatedCostPerTooth: formData.customCost, // Note: per tooth
            startDate: formData.startDate,
            priority: formData.priority,
            assignedDoctor: formData.assignedDoctor,

            // Construct the Plan blueprint
            treatmentPlan: {
                assetId: selectedAsset.id,
                workflowType: selectedWorkflow.type,
                name: selectedAsset.name,
                sessions: selectedWorkflow.defaultSessions.map((s) => ({
                    title: s.title,
                    duration: s.duration,
                    schemaId: s.schemaId,
                    status: 'pending'
                })),
                requiresLab: selectedWorkflow.requiresLab || selectedAsset.isComplex
            }
        });
        onClose();
    };

    const isGeneral = toothNumbers.length === 1 && toothNumbers[0] === 0;
    const titleString = isGeneral ? 'اختيار علاج عام' : 'اختيار خطة العلاج';

    const teethListString = isGeneral ? 'عام' : toothNumbers.join(' , ');

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="2xl"
            contentClassName="p-0 !overflow-hidden flex flex-col flex-1"
        >
            <div className="flex flex-col h-full bg-gray-50/50">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-3 px-4 sm:px-5 flex justify-between items-center shadow-md z-10 sticky top-0">
                    <div>
                        <h2 className="text-base sm:text-lg font-bold flex items-center gap-3.5">
                            {isGeneral ? (
                                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                    <Activity className="w-5 h-5" />
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    {toothNumbers.map((num) => {
                                        const svgContent = HEALTHY_TEETH_SVGS[num];
                                        return (
                                            <div key={num} className="flex items-center gap-2 bg-white/10 rounded-lg pl-2.5 pr-1.5 py-1 border border-white/15 shadow-sm backdrop-blur-md">
                                                {/* Square Tooth Number Badge */}
                                                <span className="w-7 h-7 rounded bg-white text-blue-700 flex items-center justify-center text-xs font-extrabold font-mono shadow-sm">
                                                    {num}
                                                </span>
                                                {/* Healthy Tooth SVG shape */}
                                                {svgContent && (
                                                    <div 
                                                        className="w-6 h-8 flex items-center justify-center overflow-visible select-none"
                                                        dangerouslySetInnerHTML={{ 
                                                            __html: svgContent
                                                                .replace(/fill:rgb\([^)]+\)/gi, 'fill:#ffffff')
                                                                .replace(/style="[^"]*"/gi, 'style="fill:#ffffff; stroke:none;"')
                                                                .replace(/<svg/gi, '<svg style="width:100%; height:100%; overflow:visible;"')
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <span className="leading-tight">{titleString}</span>
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>



                {/* Content Area */}
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto max-h-[70vh]">
                    {activeTab === 'treatment' && (
                        <div className="space-y-4 animate-in slide-in-from-right-8 duration-300">
                            <div className="grid grid-cols-1 gap-6">
                                {Object.entries(groupedTreatments).map(([category, treatments]) => (
                                    <div key={category}>
                                        <h4 className="font-bold text-xs sm:text-sm text-gray-700 mb-2.5 px-2 border-r-4 border-blue-500 bg-gray-100 py-0.5 rounded-l-md inline-block">
                                            {category}
                                        </h4>
                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                                            {treatments.map(asset => (
                                                <div
                                                    key={asset.id}
                                                    onClick={() => setFormData(prev => ({ ...prev, selectedAssetId: asset.id }))}
                                                    className={`cursor-pointer group relative overflow-hidden rounded-lg border-2 p-3 sm:p-4 transition-all hover:shadow-md ${formData.selectedAssetId === asset.id
                                                        ? 'border-blue-500 bg-blue-50/50'
                                                        : 'border-transparent bg-white hover:border-blue-200'
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-start mb-1.5">
                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600`}>
                                                            {asset.category}
                                                        </span>
                                                        {asset.isComplex && (
                                                            <span className="flex items-center gap-0.5 text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-100">
                                                                <Clock className="w-2.5 h-2.5" /> جلسات
                                                            </span>
                                                        )}
                                                    </div>

                                                    <h4 className="font-bold text-xs sm:text-sm text-gray-900 mb-1 group-hover:text-blue-700 transition-colors line-clamp-2">{asset.name}</h4>

                                                    <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-gray-100">
                                                        <span className="font-bold text-sm sm:text-base text-blue-600">{formatCurrency(asset.basePrice)}</span>
                                                        <div className="text-[10px] text-gray-400">
                                                            {getWorkflowForAsset(asset.name, asset.category).defaultSessions.length} جلسات
                                                        </div>
                                                    </div>

                                                    {/* Selection Indicator */}
                                                    {formData.selectedAssetId === asset.id && (
                                                        <div className="absolute top-0 left-0 bg-blue-500 text-white p-1 rounded-br-md shadow-sm">
                                                            <CheckCircle className="w-3.5 h-3.5" />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {Object.keys(groupedTreatments).length === 0 && (
                                    <div className="text-center py-12 text-gray-500">لا توجد علاجات متاحة لهذه الفئة.</div>
                                )}
                            </div>

                        </div>
                    )}

                    {activeTab === 'confirm' && selectedAsset && selectedWorkflow && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Summary Card */}
                                <Card className="lg:col-span-2 p-0 overflow-hidden border-blue-200">
                                    <div className="bg-blue-50/50 py-3 px-4 border-b border-blue-100">
                                        <h3 className="text-sm sm:text-base font-bold flex items-center gap-2 text-blue-900">
                                            <FileText className="w-4 h-4 text-blue-600" />
                                            ملخص الخطة العلاجية ({toothNumbers.length} أسنان)
                                        </h3>
                                    </div>

                                    <div className="p-4 sm:p-5">
                                        <div className="flex flex-col gap-1.5 mb-5">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-sm text-gray-500 font-medium">نوع العلاج المختار</p>
                                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">{selectedAsset.category}</span>
                                                    {selectedWorkflow.requiresLab && (
                                                        <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-md flex items-center gap-1 border border-orange-100">
                                                            <Beaker className="w-3 h-3" /> يتطلب مختبر
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="font-bold text-base text-gray-900">{selectedAsset.name}</h4>
                                        </div>

                                        <div className="mt-4">
                                            <h5 className="text-xs sm:text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                                                <Clock className="w-3.5 h-3.5 text-gray-500" />
                                                سير العمل المقترح ({selectedWorkflow.defaultSessions.length} جلسات)
                                            </h5>
                                            <div className="space-y-2 relative before:absolute before:inset-y-0 before:right-3 before:w-0.5 before:bg-gray-200/80">
                                                {selectedWorkflow.defaultSessions.map((session, idx) => (
                                                    <div key={idx} className="relative flex items-center gap-3 py-1 pr-8">
                                                        {/* Numbered timeline node */}
                                                        <div className="absolute right-[2px] w-6 h-6 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[10px] font-bold text-blue-600 z-10 shadow-sm">
                                                            {idx + 1}
                                                        </div>
                                                        {/* Premium Floating Card */}
                                                        <div className="flex-1 bg-white rounded-lg py-1.5 px-3 border border-gray-100 flex items-center justify-between hover:border-blue-200 hover:shadow-sm transition-all group">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse flex-shrink-0"></div>
                                                                <span className="text-xs font-semibold text-gray-800 line-clamp-1 group-hover:text-blue-700 transition-colors">{session.title}</span>
                                                            </div>
                                                            <span className="text-[9px] font-bold text-blue-600 bg-blue-50/70 border border-blue-100/50 px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                                                                <Clock className="w-2.5 h-2.5" />
                                                                {session.duration}د
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
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 mb-1.5">الطبيب المعالج</label>
                                                <div className="relative">
                                                    <select
                                                        value={formData.assignedDoctor}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, assignedDoctor: e.target.value }))}
                                                        className="w-full p-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500"
                                                    >
                                                        <option value="">اختر الطبيب المعالج...</option>
                                                        {doctors.map(doc => (
                                                            <option key={doc.id} value={doc.name}>{doc.name}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="w-4 h-4 text-gray-400 absolute left-3 top-3.5 pointer-events-none" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">تعديل التكلفة (للسن)</label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            value={formData.customCost}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, customCost: parseFloat(e.target.value) }))}
                                                            className="w-full p-2.5 pl-8 bg-gray-50 border border-gray-200 rounded-lg font-bold text-green-700 outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-sm"
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

                                    {/* Actions moved to static bottom footer */}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Static Footer */}
                <div className="bg-gray-50 border-t border-gray-200 p-4 flex justify-between items-center flex-shrink-0 z-20">
                    {/* Stepper */}
                    <div className="flex items-center gap-2">
                        {['treatment', 'confirm'].map((step, idx) => {
                            const isCompleted = activeTab === 'confirm' && idx === 0;
                            const isActive = activeTab === step;
                            return (
                                <div key={step} className={`flex items-center ${idx < 1 ? 'after:content-[""] after:w-8 after:h-0.5 after:mx-2 after:bg-gray-300' : ''}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                                        isActive ? 'bg-blue-600 text-white shadow-sm scale-110' :
                                        isCompleted ? 'bg-green-500 text-white' :
                                        'bg-gray-200 text-gray-500'
                                    }`}>
                                        {isCompleted ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {activeTab === 'treatment' ? (
                        <Button
                            onClick={() => setActiveTab('confirm')}
                            disabled={!formData.selectedAssetId}
                            className={`px-8 transition-all ${!formData.selectedAssetId ? 'opacity-50 grayscale' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'}`}
                        >
                            التالي: تأكيد الخطة
                            <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
                        </Button>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Button 
                                variant="ghost" 
                                onClick={() => setActiveTab('treatment')} 
                                className="text-gray-500 hover:bg-gray-100 px-4 py-2 font-medium"
                            >
                                العودة للاختيار
                            </Button>
                            <Button
                                onClick={handleConfirmTreatment}
                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-100 hover:shadow-green-200 px-6 py-2.5 font-bold rounded-xl flex items-center gap-2 border-none transform transition-all active:scale-95"
                            >
                                <CheckCircle className="w-4 h-4 ml-1" />
                                اعتماد الخطة
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};
