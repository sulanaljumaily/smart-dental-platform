import React, { useEffect, useRef, useState } from 'react';
import { AIAnalysisResult } from '../../types/ai';
import {
    CheckCircle, AlertTriangle, Info, ZoomIn, X, Server, Activity,
    ShieldCheck, CloudOff, FileText, Sparkles, Target, Crosshair,
    Sliders, Edit2, Save, Plus, Trash2, Eye, EyeOff, RotateCcw
} from 'lucide-react';
import { Button } from '../common/Button';

interface AnalysisResultCardProps {
    imageUrl: string;
    result: AIAnalysisResult | null;
    date: string;
    status?: 'processing' | 'completed' | 'failed';
    onChange?: (updatedResult: AIAnalysisResult) => void;
    onRetry?: (serviceType?: 'xray' | 'clinical') => void;
    isRetrying?: boolean;
}

const SEVERITY_CONFIG = {
    high: { color: 'red', label: 'عالية', icon: '🔴', bgClass: 'bg-red-50', borderClass: 'border-red-200', textClass: 'text-red-700' },
    medium: { color: 'amber', label: 'متوسطة', icon: '🟡', bgClass: 'bg-amber-50', borderClass: 'border-amber-200', textClass: 'text-amber-700' },
    low: { color: 'green', label: 'منخفضة', icon: '🟢', bgClass: 'bg-green-50', borderClass: 'border-green-200', textClass: 'text-green-700' },
};

const CATEGORY_LABELS: Record<string, string> = {
    caries: 'تسوس',
    bone_loss: 'فقدان عظمي',
    periapical: 'آفة حول ذروية',
    fracture: 'كسر',
    impaction: 'انحشار',
    calculus: 'تكلسات',
    resorption: 'ارتشاف',
    filling: 'حشوة سليمة',
    other: 'أخرى',
};

const BOX_COLORS = [
    { border: 'border-red-500', bg: 'bg-red-500/10', hover: 'hover:bg-red-500/20', text: 'text-red-500', shadow: 'shadow-red-500/30' },
    { border: 'border-blue-500', bg: 'bg-blue-500/10', hover: 'hover:bg-blue-500/20', text: 'text-blue-500', shadow: 'shadow-blue-500/30' },
    { border: 'border-amber-500', bg: 'bg-amber-500/10', hover: 'hover:bg-amber-500/20', text: 'text-amber-500', shadow: 'shadow-amber-500/30' },
    { border: 'border-purple-500', bg: 'bg-purple-500/10', hover: 'hover:bg-purple-500/20', text: 'text-purple-500', shadow: 'shadow-purple-500/30' },
    { border: 'border-teal-500', bg: 'bg-teal-500/10', hover: 'hover:bg-teal-500/20', text: 'text-teal-500', shadow: 'shadow-teal-500/30' },
    { border: 'border-pink-500', bg: 'bg-pink-500/10', hover: 'hover:bg-pink-500/20', text: 'text-pink-500', shadow: 'shadow-pink-500/30' },
];

const IMAGE_TYPE_LABELS: Record<string, string> = {
    panoramic_xray: 'أشعة بانورامية',
    periapical_xray: 'أشعة حول ذروية',
    bitewing_xray: 'Bitewing',
    cbct_slice: 'مقطع CBCT',
    intraoral_phone_photo: 'صورة هاتف داخل الفم',
    extraoral_face_photo: 'صورة خارجية',
    unknown: 'نوع غير محدد',
};

const QUALITY_LABELS: Record<string, string> = {
    excellent: 'ممتازة',
    good: 'جيدة',
    fair: 'متوسطة',
    poor: 'ضعيفة',
};

const AccurateImageOverlay: React.FC<{
    imageUrl: string;
    alt: string;
    className?: string;
    onClick?: () => void;
    children: React.ReactNode;
    filterStyle?: React.CSSProperties;
}> = ({ imageUrl, alt, className = 'w-full h-full object-contain', onClick, children, filterStyle }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const node = containerRef.current;
        if (!node) return;
        const update = () => setContainerSize({ width: node.clientWidth, height: node.clientHeight });
        update();
        const observer = new ResizeObserver(update);
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    const imageAspect = naturalSize.width && naturalSize.height ? naturalSize.width / naturalSize.height : 1;
    const containerAspect = containerSize.width && containerSize.height ? containerSize.width / containerSize.height : imageAspect;
    const renderedWidth = containerAspect > imageAspect ? containerSize.height * imageAspect : containerSize.width;
    const renderedHeight = containerAspect > imageAspect ? containerSize.height : containerSize.width / imageAspect;
    const overlayStyle = {
        width: `${renderedWidth || containerSize.width}px`,
        height: `${renderedHeight || containerSize.height}px`,
        left: `${Math.max(0, (containerSize.width - renderedWidth) / 2)}px`,
        top: `${Math.max(0, (containerSize.height - renderedHeight) / 2)}px`,
    };

    return (
        <div ref={containerRef} className="relative w-full h-full" onClick={onClick}>
            <img
                src={imageUrl}
                alt={alt}
                className={className}
                style={filterStyle}
                onLoad={(event) => {
                    const img = event.currentTarget;
                    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
                }}
            />
            <div className="absolute pointer-events-none" style={overlayStyle}>
                <div className="relative w-full h-full pointer-events-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

export const AnalysisResultCard: React.FC<AnalysisResultCardProps> = ({ 
    imageUrl, 
    result, 
    date, 
    status, 
    onChange, 
    onRetry, 
    isRetrying 
}) => {
    // Read the saved service_type placeholder if present inside the failed result JSON
    const savedServiceType = result ? (result as any).service_type : null;

    // Detect if we can guess the service type from completed fields or image_type
    const guessedServiceType = result?.image_type && 
        !result.image_type.includes('xray') && 
        !result.image_type.includes('cbct') && 
        !result.image_type.includes('bitewing')
            ? 'clinical'
            : 'xray';

    const [selectedService, setSelectedService] = useState<'clinical' | 'xray'>(
        savedServiceType || guessedServiceType || 'xray'
    );

    // Check if image processing is stuck or failed
    // It's stuck if it is in 'processing' status and more than 15 seconds have passed
    const isStuck = status === 'processing' && date && (new Date().getTime() - new Date(date).getTime() > 15000);
    const hasFailed = status === 'failed' || isStuck || (!result && status !== 'processing');

    if (hasFailed) {
        return (
            <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
                {/* Red warning header */}
                <div className="bg-red-50/70 border-b border-red-100 p-4 flex items-center gap-3 text-red-800">
                    <AlertTriangle className="w-5 h-5 text-red-500 animate-bounce" />
                    <div>
                        <h4 className="font-bold text-sm">خطأ في معالجة أو تحليل الصورة</h4>
                        <p className="text-[11px] text-red-600">انتهت مهلة معالجة الطلب السابق أو فشل الاتصال بخادم التشخيص.</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-12 gap-0 divide-x divide-x-reverse divide-gray-100">
                    {/* Left Column: Image Preview */}
                    <div className="md:col-span-5 bg-gray-50 p-4 flex flex-col justify-center items-center border-l border-gray-100">
                        <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-black aspect-[4/3] w-full max-w-[280px]">
                            <img src={imageUrl} alt="Stuck image" className="w-full h-full object-contain opacity-75" />
                            <div className="absolute inset-0 bg-red-950/20 flex items-center justify-center">
                                <span className="bg-red-600/90 text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-md">خطأ في التشخيص</span>
                            </div>
                        </div>
                        <span className="block text-[10px] text-gray-400 mt-2">تاريخ الرفع: {new Date(date).toLocaleString('ar-EG')}</span>
                    </div>

                    {/* Right Column: Smart Service Panel Simulator & Action */}
                    <div className="md:col-span-7 p-6 flex flex-col justify-between space-y-4">
                        <div className="space-y-3.5">
                            {/* Service Type Segment Control */}
                            <div className="space-y-2 bg-gray-50/80 p-3 rounded-xl border border-gray-100 shadow-inner">
                                <label className="block text-[10px] font-bold text-gray-500">نوع التشخيص المطلوب التوليد به:</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedService('clinical')}
                                        className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                                            selectedService === 'clinical'
                                                ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-400 text-emerald-800 shadow-sm'
                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        <span>📸 صورة سريرية</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedService('xray')}
                                        className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                                            selectedService === 'xray'
                                                ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-400 text-indigo-800 shadow-sm'
                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        <span>🩻 صورة أشعة</span>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-indigo-900 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/50">
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                    <span className="text-[11px] font-bold">
                                        {selectedService === 'clinical' ? 'خدمة التشخيص السريري بالفم بالـ AI' : 'خدمة تشخيص الأشعة السنية بالـ AI'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    {selectedService === 'clinical'
                                        ? 'سيقوم محرك التشخيص السريري المطور (OpenAI GPT-4o) بفحص الأنسجة اللثوية وتراكمات الجير وتصبغات الأسنان، مع التفرقة الدقيقة لآفة كانديدا الفم/سقف الحلق والليوكوبلاكيا بدقة تشريحية كاملة.'
                                        : 'سيقوم محرك تشخيص الأشعة المطور (OpenAI GPT-4o) بفحص صورة الأشعة السينية بدقة بالغة للكشف عن التسوسات العميقة، وفقدان العظم الداعم، والآفات حول الذروية بأسعار علاجات عيادتك الحالية.'}
                                </p>
                            </div>
                        </div>

                        <Button
                            onClick={() => onRetry?.(selectedService)}
                            disabled={isRetrying}
                            className="w-full h-11 text-sm font-bold bg-gradient-to-r from-red-500 to-indigo-600 hover:from-red-600 hover:to-indigo-700 text-white shadow-lg shadow-indigo-500/20 border-0 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {isRetrying ? (
                                <>
                                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                                    <span>جاري إعادة المعالجة بالخدمة المختارة...</span>
                                </>
                            ) : (
                                <>
                                    <RotateCcw className="w-4 h-4" />
                                    <span>إعادة معالجة الصورة وتشخيصها بالـ AI</span>
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (!result) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-gray-100 shadow-sm min-h-[300px] text-center space-y-4">
                <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
                <div className="space-y-1">
                    <h4 className="font-bold text-gray-900 text-sm">جاري تحليل ومعالجة الصورة...</h4>
                    <p className="text-xs text-gray-500 max-w-xs leading-normal">يرجى الانتظار بضع ثوانٍ بينما يكمل الذكاء الاصطناعي فحص الصورة واستخراج التقرير السريري.</p>
                </div>
            </div>
        );
    }

    const [isZoomOpen, setIsZoomOpen] = useState(false);
    const [showBoxes, setShowBoxes] = useState(true);
    const [hoveredIssue, setHoveredIssue] = useState<number | null>(null);

    // CSS X-ray Filters State
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [isInverted, setIsInverted] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Human-in-the-Loop Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [editedDiagnosis, setEditedDiagnosis] = useState(result.diagnosis || '');
    const [editedSummary, setEditedSummary] = useState(result.summary || '');
    const [editedIssues, setEditedIssues] = useState<any[]>(result.issues || []);

    useEffect(() => {
        if (result) {
            setEditedDiagnosis(result.diagnosis || '');
            setEditedSummary(result.summary || '');
            setEditedIssues(result.issues || []);
        }
    }, [result]);

    const isMock = result.metadata?.isMock ?? true;
    const provider = result.metadata?.provider || 'Unknown';
    const model = result.metadata?.model || 'Demo';
    const overallSeverity = result.severity || 'low';
    const severityConfig = SEVERITY_CONFIG[overallSeverity];
    const imageQuality = typeof result.image_quality === 'string'
        ? { rating: result.image_quality, problems: [], retake_recommended: false }
        : result.image_quality;

    const isClinical = result.image_type === 'intraoral_phone_photo' 
        || result.image_type === 'extraoral_face_photo' 
        || result.image_type?.includes('clinical')
        || (result.image_type && !result.image_type.includes('xray') && !result.image_type.includes('cbct') && !result.image_type.includes('bitewing'));

    const getBoxColor = (issue: any) => {
        const label = issue.label?.toLowerCase() || '';
        const cat = issue.category?.toLowerCase() || '';
        if (cat === 'filling' || label.includes('حشوة') || label.includes('filling') || label.includes('سليمة')) {
            return {
                border: 'border-green-500',
                bg: 'bg-green-500/10',
                hover: 'hover:bg-green-500/20',
                text: 'text-green-500',
                shadow: 'shadow-green-500/30',
                badgeBg: 'bg-green-500'
            };
        }
        return {
            border: 'border-red-500',
            bg: 'bg-red-500/10',
            hover: 'hover:bg-red-500/20',
            text: 'text-red-500',
            shadow: 'shadow-red-500/30',
            badgeBg: 'bg-red-500'
        };
    };
    const isReliableBox = (issue: AIAnalysisResult['issues'][number]) => {
        if (!issue.box || issue.box.length !== 4) return false;
        const [x, y, width, height] = issue.box;
        return [x, y, width, height].every(Number.isFinite)
            && x >= 0 && y >= 0 && width > 0 && height > 0
            && x + width <= 1 && y + height <= 1
            && issue.confidence >= 0.7;
    };

    const handleSaveChanges = () => {
        const updatedResult = {
            ...result,
            diagnosis: editedDiagnosis,
            summary: editedSummary,
            issues: editedIssues,
        };
        setIsEditing(false);
        onChange?.(updatedResult);
    };

    const handleCancelChanges = () => {
        setEditedDiagnosis(result.diagnosis || '');
        setEditedSummary(result.summary || '');
        setEditedIssues(result.issues || []);
        setIsEditing(false);
    };

    const handleAddIssue = () => {
        setEditedIssues(prev => [
            ...prev,
            {
                label: 'تسوس جديد',
                tooth_number: '',
                category: 'caries',
                severity: 'low',
                confidence: 0.95,
                description: 'تمت إضافته يدوياً بواسطة الطبيب',
                box: [0.3, 0.3, 0.15, 0.15]
            }
        ]);
    };

    const handleDeleteIssue = (idx: number) => {
        setEditedIssues(prev => prev.filter((_, i) => i !== idx));
    };

    const filterStyle: React.CSSProperties = {
        filter: `brightness(${brightness}%) contrast(${contrast}%) ${isInverted ? 'invert(100%) grayscale(100%)' : ''}`
    };

    const renderBoundingBoxes = (isZoom = false) => {
        if (isClinical) return null;
        const issuesToRender = isEditing ? editedIssues : result.issues;
        return (
            showBoxes && issuesToRender.map((issue, idx) => {
                if (!isReliableBox(issue)) return null;
                const color = getBoxColor(issue);
                const isHovered = hoveredIssue === idx;
                const baseOpacity = isHovered ? 'opacity-100' : 'opacity-70';

                return (
                    <div
                        key={idx}
                        className={`absolute border-2 ${color.border} ${color.bg} ${color.hover} transition-all duration-200 cursor-pointer group ${baseOpacity} ${isHovered ? 'z-20 scale-105' : 'z-10'}`}
                        style={{
                            left: `${issue.box[0] * 100}%`,
                            top: `${issue.box[1] * 100}%`,
                            width: `${issue.box[2] * 100}%`,
                            height: `${issue.box[3] * 100}%`,
                            boxShadow: isHovered ? `0 0 20px rgba(0,0,0,0.3)` : 'none',
                        }}
                        onMouseEnter={() => setHoveredIssue(idx)}
                        onMouseLeave={() => setHoveredIssue(null)}
                    >
                        {/* Issue number badge */}
                        <div className={`absolute -top-5 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${color.badgeBg || 'bg-red-500'} shadow-md`}>
                            {idx + 1}
                        </div>

                        {/* Tooltip */}
                        <div className={`absolute ${isZoom ? '-top-16' : '-top-12'} right-0 ${isHovered ? 'block' : 'hidden'} bg-gray-900/95 text-white text-xs px-3 py-2 rounded-lg shadow-xl whitespace-nowrap z-50 backdrop-blur-sm`}>
                            <div className="font-bold text-sm">{issue.label}</div>
                            {issue.description && <div className="text-gray-300 mt-0.5 text-[10px] max-w-[200px] whitespace-normal">{issue.description}</div>}
                            <div className="flex items-center gap-2 mt-1 text-[10px]">
                                <span className={`${SEVERITY_CONFIG[issue.severity || 'low']?.textClass || 'text-gray-400'}`}>
                                    {SEVERITY_CONFIG[issue.severity || 'low']?.icon} {SEVERITY_CONFIG[issue.severity || 'low']?.label}
                                </span>
                                <span className="text-gray-400">•</span>
                                <span className="text-blue-300">{(issue.confidence * 100).toFixed(0)}%</span>
                            </div>
                            <div className="absolute bottom-0 right-3 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900/95" />
                        </div>
                    </div>
                );
            })
        );
    };

    const activeIssues = isEditing ? editedIssues : result.issues;

    return (
        <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-md">
                {/* Header */}
                <div className="px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${isMock ? 'bg-orange-500' : 'bg-green-500'}`} />
                        <div>
                            <h3 className="font-bold text-gray-900 text-sm">تقرير التشخيص بالذكاء الاصطناعي</h3>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                                <span>{new Date(date).toLocaleString('ar-IQ')}</span>
                                <span>•</span>
                                <span className={`uppercase font-bold ${isMock ? 'text-orange-600' : 'text-green-700'}`}>
                                    {isMock ? 'DEMO' : 'LIVE'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Edit Mode Buttons */}
                        {isEditing ? (
                            <div className="flex gap-1">
                                <Button
                                    size="sm"
                                    onClick={handleSaveChanges}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 text-xs px-2.5 py-1.5 flex items-center gap-1 rounded-lg"
                                >
                                    <Save className="w-3.5 h-3.5" />
                                    <span>حفظ التعديلات</span>
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleCancelChanges}
                                    className="text-gray-500 hover:bg-gray-100 text-xs px-2.5 py-1.5 flex items-center gap-1 rounded-lg"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    <span>إلغاء</span>
                                </Button>
                            </div>
                        ) : (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIsEditing(true)}
                                className="text-indigo-600 border-indigo-150 hover:bg-indigo-50 text-xs px-2.5 py-1.5 flex items-center gap-1 rounded-lg"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>تعديل التقرير</span>
                            </Button>
                        )}

                        {/* Overall severity badge */}
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 ${severityConfig.bgClass} ${severityConfig.textClass} rounded-full text-xs font-bold ${severityConfig.borderClass} border`}>
                            {severityConfig.icon} {severityConfig.label}
                        </div>
                    </div>
                </div>

                <div className="p-0 grid md:grid-cols-12 gap-0 divide-x divide-x-reverse divide-gray-100">
                    {/* Image Column */}
                    <div className="md:col-span-5 bg-gray-50 p-4 flex flex-col justify-center">
                        <div
                            className="relative group rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-black cursor-zoom-in"
                            onClick={() => setIsZoomOpen(true)}
                        >
                            <div className="aspect-[4/3] relative">
                                <AccurateImageOverlay
                                    imageUrl={imageUrl}
                                    alt="صورة الأشعة"
                                    filterStyle={filterStyle}
                                    onClick={() => setIsZoomOpen(true)}
                                >
                                    {renderBoundingBoxes(false)}
                                </AccurateImageOverlay>
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <span className="bg-white/90 text-gray-800 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 backdrop-blur-sm">
                                        <ZoomIn className="w-4 h-4" />
                                        تكبير وعرض التفاصيل
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* CSS X-ray Filters Control Bar (Phase 2a) */}
                        {!isClinical && (
                            <div className="mt-3 bg-white p-3 rounded-xl border border-gray-100 space-y-2.5 shadow-sm">
                                <div className="flex justify-between items-center">
                                    <button
                                        onClick={() => setShowFilters(!showFilters)}
                                        className="flex items-center gap-1.5 text-[11px] font-bold text-gray-700 hover:text-indigo-600 transition-colors focus:outline-none"
                                    >
                                        <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                                        مرشحات الأشعة الرقمية
                                    </button>
                                    {(brightness !== 100 || contrast !== 100 || isInverted) && (
                                        <button
                                            onClick={() => { setBrightness(100); setContrast(100); setIsInverted(false); }}
                                            className="text-[9px] text-red-500 hover:underline flex items-center gap-0.5 focus:outline-none"
                                        >
                                            <RotateCcw className="w-2.5 h-2.5" /> إعادة تعيين
                                        </button>
                                    )}
                                </div>

                                {showFilters && (
                                    <div className="space-y-2.5 pt-2 border-t border-gray-50 text-[10px] text-gray-500 animate-in slide-in-from-top-1">
                                        <div className="space-y-1">
                                            <div className="flex justify-between">
                                                <span>السطوع (Brightness)</span>
                                                <span className="font-bold text-gray-700">{brightness}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="50"
                                                max="200"
                                                value={brightness}
                                                onChange={(e) => setBrightness(Number(e.target.value))}
                                                className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between">
                                                <span>التباين (Contrast)</span>
                                                <span className="font-bold text-gray-700">{contrast}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="50"
                                                max="200"
                                                value={contrast}
                                                onChange={(e) => setContrast(Number(e.target.value))}
                                                className="w-full h-1 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            />
                                        </div>
                                        <div className="flex justify-between items-center pt-1">
                                            <span>عكس الألوان (Negative Grayscale)</span>
                                            <button
                                                onClick={() => setIsInverted(!isInverted)}
                                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isInverted ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                            >
                                                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isInverted ? 'translate-x-4' : 'translate-x-0'}`} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="bg-white p-2 rounded-lg border border-gray-100 text-center">
                                <span className="block text-[10px] text-gray-400">نوع الصورة</span>
                                <span className="block font-bold text-gray-800 text-xs">{IMAGE_TYPE_LABELS[result.image_type || 'unknown'] || 'غير محدد'}</span>
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-gray-100 text-center">
                                <span className="block text-[10px] text-gray-400">جودة الصورة</span>
                                <span className="block font-bold text-gray-800 text-xs">
                                    {QUALITY_LABELS[imageQuality?.rating || ''] || imageQuality?.rating || 'غير محددة'}
                                    {imageQuality?.retake_recommended ? ' • يفضّل الإعادة' : ''}
                                </span>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-3 gap-2 mt-3">
                            <div className="bg-white p-2 rounded-lg border border-gray-100 text-center">
                                <span className="block text-[10px] text-gray-400">الدقة</span>
                                <span className="block font-bold text-indigo-600 text-sm">{((result.confidence || 0.92) * 100).toFixed(0)}%</span>
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-gray-100 text-center">
                                <span className="block text-[10px] text-gray-400">المشاكل</span>
                                <span className="block font-bold text-red-500 text-sm">{activeIssues.length}</span>
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-gray-100 text-center">
                                <span className="block text-[10px] text-gray-400">{isClinical ? "المواقع" : "الأسنان"}</span>
                                <span className="block font-bold text-blue-600 text-sm">
                                    {activeIssues.filter(i => i.tooth_number).length || '-'}
                                </span>
                            </div>
                        </div>

                        {/* Legend: Issue colors */}
                        {!isClinical && activeIssues.length > 0 && (
                            <div className="mt-3 bg-white rounded-lg border border-gray-100 p-2 space-y-1">
                                <div className="text-[10px] font-bold text-gray-500 mb-1 flex items-center gap-1">
                                    <Target className="w-3 h-3" /> دليل الألوان
                                </div>
                                {activeIssues.filter(isReliableBox).map((issue, idx) => {
                                    const color = getBoxColor(issue);
                                    return (
                                        <div
                                            key={idx}
                                            className={`flex items-center gap-2 text-[10px] py-0.5 px-1 rounded cursor-pointer transition-colors ${hoveredIssue === idx ? 'bg-gray-100' : ''}`}
                                            onMouseEnter={() => setHoveredIssue(idx)}
                                            onMouseLeave={() => setHoveredIssue(null)}
                                        >
                                            <div className={`w-3 h-3 rounded-sm border-2 ${color.border} ${color.bg} flex items-center justify-center text-[7px] font-bold`}>
                                                {idx + 1}
                                            </div>
                                            <span className="text-gray-700 truncate">{issue.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Content Column */}
                    <div className="md:col-span-7 p-5 space-y-5 overflow-y-auto max-h-[600px]">
                        {/* Diagnosis */}
                        <div className="space-y-2">
                            <h4 className="flex items-center gap-2 font-bold text-gray-900 text-sm border-b pb-2">
                                <Activity className="w-4 h-4 text-blue-600" />
                                التشخيص
                            </h4>
                            {isEditing ? (
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        value={editedDiagnosis}
                                        onChange={(e) => setEditedDiagnosis(e.target.value)}
                                        className="w-full p-2.5 border border-indigo-150 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-semibold text-indigo-900 bg-indigo-50/30"
                                        placeholder="عنوان التشخيص العام..."
                                    />
                                    <textarea
                                        value={editedSummary}
                                        onChange={(e) => setEditedSummary(e.target.value)}
                                        className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none leading-relaxed text-xs text-gray-700"
                                        rows={4}
                                        placeholder="اكتب التقرير والملخص السريري هنا بالتفصيل..."
                                    />
                                </div>
                            ) : (
                                <>
                                    {result.diagnosis && (
                                        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-blue-900 text-sm font-semibold">
                                            {result.diagnosis}
                                        </div>
                                    )}
                                    <p className="text-gray-600 text-xs leading-6 bg-gray-50 p-3 rounded-xl border border-gray-100 whitespace-pre-line">
                                        {result.summary}
                                    </p>

                                    {/* Differential Diagnoses & Confirmation Methods */}
                                    {((result.differential_diagnoses && result.differential_diagnoses.length > 0) || 
                                      (result.confirmation_methods && result.confirmation_methods.length > 0)) && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 animate-in fade-in duration-300">
                                            {result.differential_diagnoses && result.differential_diagnoses.length > 0 && (
                                                <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-3.5 space-y-2">
                                                    <h5 className="font-bold text-xs text-purple-900 flex items-center gap-1.5">
                                                        <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                                                        الاحتمالات البديلة (التشخيص التفريقي)
                                                    </h5>
                                                    <ul className="space-y-1.5 text-[11px] text-purple-800">
                                                        {result.differential_diagnoses.map((diag, i) => (
                                                            <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                                                                <span className="text-purple-400 mt-0.5">•</span>
                                                                <span>{diag}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {result.confirmation_methods && result.confirmation_methods.length > 0 && (
                                                <div className="bg-teal-50/50 border border-teal-100 rounded-xl p-3.5 space-y-2">
                                                    <h5 className="font-bold text-xs text-teal-900 flex items-center gap-1.5">
                                                        <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                                                        التحقق السريري (لتأكيد التشخيص)
                                                    </h5>
                                                    <ul className="space-y-1.5 text-[11px] text-teal-800">
                                                        {result.confirmation_methods.map((method, i) => (
                                                            <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                                                                <span className="text-teal-500 mt-0.5">✓</span>
                                                                <span>{method}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Issues List with interactive highlighting */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center border-b pb-2">
                                <h4 className="flex items-center gap-2 font-bold text-gray-900 text-sm">
                                    <AlertTriangle className="w-4 h-4 text-red-500" />
                                    المشاكل المكتشفة ({activeIssues.length})
                                </h4>
                                {isEditing && (
                                    <Button
                                        size="sm"
                                        onClick={handleAddIssue}
                                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-0 rounded-lg text-xs flex items-center gap-1 py-1"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>إضافة مشكلة</span>
                                    </Button>
                                )}
                            </div>

                            {activeIssues.length > 0 ? (
                                <ul className="space-y-2.5">
                                    {activeIssues.map((issue, idx) => {
                                        const color = getBoxColor(issue);
                                        const issueSeverity = SEVERITY_CONFIG[issue.severity || 'low'];

                                        return (
                                            <li
                                                key={idx}
                                                className={`bg-white p-3 rounded-xl border transition-all ${hoveredIssue === idx ? `${color.border} shadow-md` : 'border-gray-100 hover:border-gray-200'}`}
                                                onMouseEnter={() => setHoveredIssue(idx)}
                                                onMouseLeave={() => setHoveredIssue(null)}
                                            >
                                                {isEditing ? (
                                                    <div className="space-y-2.5">
                                                        <div className="flex justify-between items-center border-b border-gray-50 pb-1.5">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${color.badgeBg || 'bg-red-500'}`}>
                                                                    {idx + 1}
                                                                </span>
                                                                <span className="font-bold text-xs text-gray-500">تعديل تفاصيل المشكلة</span>
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleDeleteIssue(idx)}
                                                                className="text-red-500 hover:bg-red-50 h-7 w-7 p-0 rounded-full"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                                            <div className="space-y-0.5">
                                                                <label className="text-[10px] text-gray-400">اسم العَرَض</label>
                                                                <input
                                                                    type="text"
                                                                    value={issue.label}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setEditedIssues(prev => prev.map((item, i) => i === idx ? { ...item, label: val } : item));
                                                                    }}
                                                                    className="w-full px-2.5 py-1.5 border rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                                                                />
                                                            </div>
                                                            <div className="space-y-0.5">
                                                                <label className="text-[10px] text-gray-400">رقم السن (FDI)</label>
                                                                <input
                                                                    type="text"
                                                                    value={issue.tooth_number || ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setEditedIssues(prev => prev.map((item, i) => i === idx ? { ...item, tooth_number: val } : item));
                                                                    }}
                                                                    className="w-full px-2.5 py-1.5 border rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none font-mono text-center"
                                                                />
                                                            </div>
                                                            <div className="space-y-0.5">
                                                                <label className="text-[10px] text-gray-400">التصنيف</label>
                                                                <select
                                                                    value={issue.category || 'other'}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setEditedIssues(prev => prev.map((item, i) => i === idx ? { ...item, category: val } : item));
                                                                    }}
                                                                    className="w-full px-2.5 py-1.5 border rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
                                                                >
                                                                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                                                                        <option key={k} value={k}>{v}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div className="space-y-0.5">
                                                                <label className="text-[10px] text-gray-400">الخطورة</label>
                                                                <select
                                                                    value={issue.severity || 'low'}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setEditedIssues(prev => prev.map((item, i) => i === idx ? { ...item, severity: val } : item));
                                                                    }}
                                                                    className="w-full px-2.5 py-1.5 border rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
                                                                >
                                                                    <option value="low">منخفضة 🟢</option>
                                                                    <option value="medium">متوسطة 🟡</option>
                                                                    <option value="high">عالية 🔴</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-0.5">
                                                            <label className="text-[10px] text-gray-400 font-bold block">الوصف</label>
                                                            <input
                                                                type="text"
                                                                value={issue.description || ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setEditedIssues(prev => prev.map((item, i) => i === idx ? { ...item, description: val } : item));
                                                                }}
                                                                className="w-full px-2.5 py-1.5 border rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-xs"
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex items-start gap-2">
                                                                <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${color.badgeBg || 'bg-red-500'}`}>
                                                                    {idx + 1}
                                                                </div>
                                                                <div>
                                                                    <span className="font-bold text-gray-800 text-sm block">{issue.label}</span>
                                                                    {issue.tooth_number && (
                                                                        <span className="text-[10px] text-gray-400 font-medium">
                                                                            {isNaN(Number(issue.tooth_number)) ? `الموقع: ${issue.tooth_number}` : `سن #${issue.tooth_number}`}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                {issue.category && (
                                                                    <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                                                        {CATEGORY_LABELS[issue.category] || issue.category}
                                                                    </span>
                                                                )}
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${issueSeverity.bgClass} ${issueSeverity.textClass}`}>
                                                                    {issueSeverity.icon} {issueSeverity.label}
                                                                </span>
                                                                <span className="text-[10px] font-mono bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                                                                    {((issue.confidence || 0.9) * 100).toFixed(0)}%
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {issue.description && (
                                                            <p className="text-xs text-gray-500 mt-1.5 pr-7 leading-5">{issue.description}</p>
                                                        )}
                                                        {((issue as any).clinical_description || (issue as any).evidence_visible || (issue as any).risk_if_untreated) && (
                                                            <div className="mt-2 pr-7 grid gap-1.5 text-[11px] leading-5">
                                                                {(issue as any).clinical_description && <p className="bg-gray-50 rounded-md px-2 py-1 text-gray-700"><b>الوصف السريري:</b> {(issue as any).clinical_description}</p>}
                                                                {(issue as any).evidence_visible && <p className="bg-blue-50 rounded-md px-2 py-1 text-blue-800"><b>الدليل المرئي:</b> {(issue as any).evidence_visible}</p>}
                                                                {(issue as any).risk_if_untreated && <p className="bg-red-50 rounded-md px-2 py-1 text-red-800"><b>الخطر عند الإهمال:</b> {(issue as any).risk_if_untreated}</p>}
                                                            </div>
                                                        )}
                                                        {((issue as any).differential_diagnoses?.length > 0 || (issue as any).confirmation_methods?.length > 0) && (
                                                            <div className="mt-2 pr-7 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] leading-5 animate-in fade-in duration-200">
                                                                {(issue as any).differential_diagnoses?.length > 0 && (
                                                                    <div className="bg-purple-50/30 rounded-lg p-2.5 border border-purple-100/50">
                                                                        <span className="font-bold text-purple-900 block mb-1 flex items-center gap-1">
                                                                            <Sparkles className="w-3 h-3 text-purple-600" />
                                                                            الاحتمالات البديلة:
                                                                        </span>
                                                                        <ul className="list-disc list-inside space-y-0.5 text-purple-800">
                                                                            {(issue as any).differential_diagnoses.map((d: string, i: number) => (
                                                                                <li key={i}>{d}</li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                                {(issue as any).confirmation_methods?.length > 0 && (
                                                                    <div className="bg-teal-50/30 rounded-lg p-2.5 border border-teal-100/50">
                                                                        <span className="font-bold text-teal-900 block mb-1 flex items-center gap-1">
                                                                            <ShieldCheck className="w-3 h-3 text-teal-600" />
                                                                            طريقة التأكيد السريري:
                                                                        </span>
                                                                        <ul className="list-disc list-inside space-y-0.5 text-teal-800">
                                                                            {(issue as any).confirmation_methods.map((m: string, i: number) => (
                                                                                <li key={i}>{m}</li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        {issue.treatment_suggestion && (
                                                            <p className="text-xs text-purple-600 mt-1 pr-7 leading-5 flex items-start gap-1">
                                                                <Sparkles className="w-3 h-3 mt-0.5 shrink-0" />
                                                                {issue.treatment_suggestion}
                                                            </p>
                                                        )}
                                                    </>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-center gap-3 text-green-700">
                                    <ShieldCheck className="w-6 h-6" />
                                    <div>
                                        <p className="font-bold">تحليل سليم</p>
                                        <p className="text-xs opacity-80">لم يتم تحديد مشاكل في هذا التقرير حالياً</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Treatment Plan */}
                        {result.treatment_plan?.phases && result.treatment_plan.phases.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="flex items-center gap-2 font-bold text-gray-900 text-sm border-b pb-2">
                                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                                    الخطة العلاجية المرحلية
                                </h4>
                                <div className="grid gap-2">
                                    {result.treatment_plan.phases.map((phase, idx) => (
                                        <div key={idx} className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <span className="font-bold text-sm text-emerald-900">{phase.title}</span>
                                                <span className="text-[10px] bg-white text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">{phase.sessions} جلسة</span>
                                            </div>
                                            <p className="text-xs text-emerald-800 leading-5">{phase.description}</p>
                                            {phase.items?.length > 0 && <p className="text-[11px] text-emerald-700 mt-1">{phase.items.join('، ')}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Patient Summary */}
                        {(result.patient_friendly_summary || result.follow_up_schedule || (result.doctor_notes?.length || 0) > 0) && (
                            <div className="space-y-2">
                                <h4 className="flex items-center gap-2 font-bold text-gray-900 text-sm border-b pb-2">
                                    <Info className="w-4 h-4 text-blue-600" />
                                    ملخص وملاحظات المتابعة
                                </h4>
                                {result.patient_friendly_summary && <p className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-blue-900 text-xs leading-6">{result.patient_friendly_summary}</p>}
                                {result.follow_up_schedule && <p className="bg-gray-50 p-2 rounded-lg text-xs text-gray-700"><b>المتابعة:</b> {result.follow_up_schedule}</p>}
                                {result.doctor_notes?.map((note, i) => <p key={i} className="bg-amber-50 p-2 rounded-lg text-xs text-amber-800">{note}</p>)}
                            </div>
                        )}

                        {/* Findings */}
                        {result.findings && result.findings.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="flex items-center gap-2 font-bold text-gray-900 text-sm border-b pb-2">
                                    <FileText className="w-4 h-4 text-gray-600" />
                                    الملاحظات السريرية
                                </h4>
                                <ul className="space-y-1 text-xs text-gray-600">
                                    {result.findings.map((f, i) => (
                                        <li key={i} className="flex items-start gap-2 bg-gray-50 p-2 rounded-lg">
                                            <span className="text-gray-400 mt-0.5">•</span>
                                            <span className="leading-5">{f}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Recommendation */}
                        {result.recommendation && (
                            <div className="space-y-2">
                                <h4 className="flex items-center gap-2 font-bold text-gray-900 text-sm border-b pb-2">
                                    <Sparkles className="w-4 h-4 text-purple-600" />
                                    التوصيات العلاجية
                                </h4>
                                <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 text-purple-900 text-xs flex items-start gap-2 leading-6">
                                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-purple-600" />
                                    <p>{result.recommendation}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 border-t border-gray-100 px-5 py-2 text-[10px] text-gray-400 flex justify-between items-center font-mono">
                    <span>Model: {model}</span>
                    <span>Tokens: {(result as any).metadata?.tokensUsed || 'N/A'}</span>
                </div>
            </div>

            {/* Zoom Modal */}
            {isZoomOpen && (
                <div
                    className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setIsZoomOpen(false)}
                >
                    <div
                        className="bg-transparent w-full max-w-7xl max-h-[95vh] relative flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Toolbar */}
                        <div className="absolute top-4 right-4 z-50 flex gap-2">
                            {!isClinical && (
                                <Button
                                    onClick={() => setShowBoxes(!showBoxes)}
                                    className={`${showBoxes ? 'bg-green-600/80 hover:bg-green-600' : 'bg-black/50 hover:bg-black/70'} text-white border-white/20 backdrop-blur-md`}
                                    size="sm"
                                >
                                    <Crosshair className="w-4 h-4 ml-1" />
                                    {showBoxes ? 'إخفاء العلامات' : 'عرض العلامات'}
                                </Button>
                            )}
                            <button
                                onClick={() => setIsZoomOpen(false)}
                                className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full backdrop-blur-md transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 flex items-center justify-center overflow-auto relative rounded-lg">
                            <div className="relative inline-block w-full h-[85vh] max-w-full max-h-full">
                                <AccurateImageOverlay
                                    imageUrl={imageUrl}
                                    alt="تحليل الصورة الكامل"
                                    filterStyle={filterStyle} // Pass filter here too!
                                    className="w-full h-full object-contain rounded-md shadow-2xl"
                                >
                                    {renderBoundingBoxes(true)}
                                </AccurateImageOverlay>
                            </div>
                        </div>

                        {/* Bottom issue bar */}
                        {!isClinical && activeIssues.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2 justify-center">
                                {activeIssues.map((issue, idx) => {
                                    const color = getBoxColor(issue);
                                    const issueSeverity = SEVERITY_CONFIG[issue.severity || 'low'];
                                    return (
                                        <div
                                            key={idx}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${color.border} bg-black/60 backdrop-blur-md text-white text-xs cursor-pointer transition-all ${hoveredIssue === idx ? 'scale-110 shadow-lg' : ''}`}
                                            onMouseEnter={() => setHoveredIssue(idx)}
                                            onMouseLeave={() => setHoveredIssue(null)}
                                        >
                                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${color.badgeBg || 'bg-red-500'}`}>
                                                {idx + 1}
                                            </span>
                                            <span>{issue.label}</span>
                                            <span className="text-gray-400">{issueSeverity.icon}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="text-center mt-3 text-white/40 text-xs">
                            {isClinical 
                                ? 'اضغط خارج الصورة للإغلاق' 
                                : 'مرر الماوس فوق العلامات لعرض التفاصيل • اضغط خارج الصورة للإغلاق'}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
