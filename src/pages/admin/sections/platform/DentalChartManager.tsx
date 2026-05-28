import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Upload, X, Eye, RotateCcw, ChevronLeft, ChevronRight,
  CheckCircle2, AlertCircle, Loader2, Tooth, Layers, Zap,
  ArrowLeftRight, Info
} from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { HEALTHY_TEETH_SVGS } from '../../../../constants/healthyTeeth';

// ─── Types ────────────────────────────────────────────────────────────────────
type ToothState =
  | 'healthy' | 'decayed' | 'broken' | 'stained' | 'abscess' | 'impacted' | 'mobile'
  | 'filled' | 'endo' | 'crown' | 'bridge' | 'implant' | 'ortho';

interface OdontogramTemplate {
  tooth_number: number;
  state: ToothState;
  svg_content: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const RIGHT_TEETH = {
  upper: [18, 17, 16, 15, 14, 13, 12, 11],
  lower: [48, 47, 46, 45, 44, 43, 42, 41],
};

// FDI mirror map: right → left
const MIRROR_MAP: Record<number, number> = {
  11: 21, 12: 22, 13: 23, 14: 24, 15: 25, 16: 26, 17: 27, 18: 28,
  41: 31, 42: 32, 43: 33, 44: 34, 45: 35, 46: 36, 47: 37, 48: 38,
};

const DIAGNOSTIC_STATES: { id: ToothState; label: string; color: string; dot: string }[] = [
  { id: 'healthy',  label: 'سليم',   color: 'bg-green-50 border-green-300 text-green-800',  dot: 'bg-green-400' },
  { id: 'decayed',  label: 'تسوس',   color: 'bg-red-50 border-red-300 text-red-800',        dot: 'bg-red-500' },
  { id: 'broken',   label: 'مكسور',  color: 'bg-orange-50 border-orange-300 text-orange-800', dot: 'bg-orange-500' },
  { id: 'stained',  label: 'تصبغ',   color: 'bg-yellow-50 border-yellow-300 text-yellow-800', dot: 'bg-yellow-500' },
  { id: 'abscess',  label: 'خراج',   color: 'bg-rose-50 border-rose-300 text-rose-800',     dot: 'bg-rose-600' },
];

const TREATMENT_STATES: { id: ToothState; label: string; color: string; dot: string }[] = [
  { id: 'filled',  label: 'حشوة',       color: 'bg-blue-50 border-blue-300 text-blue-800',     dot: 'bg-blue-500' },
  { id: 'endo',    label: 'علاج عصب',   color: 'bg-violet-50 border-violet-300 text-violet-800', dot: 'bg-violet-500' },
  { id: 'crown',   label: 'تلبيس/تاج',  color: 'bg-amber-50 border-amber-300 text-amber-800',  dot: 'bg-amber-500' },
  { id: 'bridge',  label: 'جسر',        color: 'bg-cyan-50 border-cyan-300 text-cyan-800',      dot: 'bg-cyan-500' },
  { id: 'implant', label: 'زرعة',       color: 'bg-gray-50 border-gray-400 text-gray-800',     dot: 'bg-gray-500' },
  { id: 'ortho',   label: 'تقويم',      color: 'bg-teal-50 border-teal-300 text-teal-800',     dot: 'bg-teal-500' },
];

const ALL_UPLOADABLE_STATES = [...DIAGNOSTIC_STATES, ...TREATMENT_STATES];

// ─── SVG Upload Card ──────────────────────────────────────────────────────────
const SvgUploadCard: React.FC<{
  stateInfo: { id: ToothState; label: string; color: string; dot: string };
  toothNumber: number;
  existing?: string;
  onUploaded: (state: ToothState, svg: string) => void;
  onReset: (state: ToothState) => void;
  isMissingAuto?: boolean;
  isStainedAuto?: boolean;
  isImpactedAuto?: boolean;
  isMobileAuto?: boolean;
  healthySvg?: string;
}> = ({ stateInfo, toothNumber, existing, onUploaded, onReset, isMissingAuto, isStainedAuto, isImpactedAuto, isMobileAuto, healthySvg }) => {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(existing || null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync state if it changed from outside (like database load)
  useEffect(() => {
    setPreview(existing || null);
  }, [existing]);

  const processSvgFile = async (file: File) => {
    if (!file.name.endsWith('.svg') && file.type !== 'image/svg+xml') {
      alert('يرجى اختيار ملف SVG فقط');
      return;
    }
    setLoading(true);
    try {
      const text = await file.text();
      // Basic SVG validation
      if (!text.includes('<svg') && !text.includes('<SVG')) {
        alert('الملف المختار ليس SVG صالحاً');
        return;
      }
      // Sanitize: remove scripts
      const sanitized = text.replace(/<script[\s\S]*?<\/script>/gi, '');
      setPreview(sanitized);
      onUploaded(stateInfo.id, sanitized);
    } catch (e) {
      console.error(e);
      alert('فشل قراءة الملف');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processSvgFile(file);
  }, [stateInfo.id]);

  // Auto-generate missing state preview from healthy SVG
  const getMissingPreview = () => {
    if (!healthySvg) return null;
    return healthySvg.replace('<svg ', '<svg class="missing-tooth-svg" ');
  };

  // Auto-generate stained state preview from healthy SVG with yellow sepia filter
  const getStainedPreview = () => {
    if (!healthySvg) return null;
    return healthySvg.replace('<svg ', '<svg style="filter: sepia(0.6) saturate(1.8) hue-rotate(10deg) brightness(0.95)" ');
  };

  // Auto-generate impacted state preview from healthy SVG with rotation and opacity effect
  const getImpactedPreview = () => {
    if (!healthySvg) return null;
    return healthySvg.replace('<svg ', '<svg style="transform: rotate(25deg) translateY(6px); opacity: 0.8; transform-origin: center;" ');
  };

  // Auto-generate mobile state preview from healthy SVG with class for shake animation
  const getMobilePreview = () => {
    if (!healthySvg) return null;
    return healthySvg.replace('<svg ', '<svg class="mobile-tooth-svg" ');
  };

  // Add red drop-shadow glow to abscess preview if uploaded
  const getAbscessPreview = () => {
    if (!preview) return null;
    return preview.replace('<svg ', '<svg class="abscess-tooth-svg" ');
  };

  const isShowingAuto = isMissingAuto || isImpactedAuto || isMobileAuto || (isStainedAuto && !preview && !!healthySvg);
  const displayPreview = isMissingAuto 
    ? getMissingPreview() 
    : isImpactedAuto
      ? getImpactedPreview()
      : isMobileAuto
        ? getMobilePreview()
        : (isStainedAuto && !preview)
          ? getStainedPreview()
          : (stateInfo.id === 'abscess' && preview)
            ? getAbscessPreview()
            : preview;

  return (
    <div className={`relative rounded-xl border-2 p-3 transition-all ${stateInfo.color} ${dragging ? 'scale-105 shadow-lg' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className={`w-2.5 h-2.5 rounded-full ${stateInfo.dot}`} />
          <span className="text-xs font-bold">{stateInfo.label}</span>
        </div>
        <div className="flex gap-1">
          {!isMissingAuto && !isImpactedAuto && !isMobileAuto && preview && (
            <button
              onClick={() => { setPreview(null); onReset(stateInfo.id); }}
              className="p-1 rounded-full hover:bg-white/60 transition-colors"
              title="مسح"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          {isShowingAuto && (
            <span className="text-[10px] bg-white/70 rounded-full px-2 py-0.5 font-medium">تلقائي 🤖</span>
          )}
        </div>
      </div>

      {/* Preview / Upload Zone */}
      <div
        className={`relative h-20 rounded-lg flex items-center justify-center cursor-pointer transition-all
          ${(isMissingAuto || isImpactedAuto || isMobileAuto) ? 'cursor-default bg-white/30' : 'hover:bg-white/50 bg-white/30'}
          ${dragging ? 'bg-white/60' : ''}`}
        onDragOver={e => { if (!isMissingAuto && !isImpactedAuto && !isMobileAuto) { e.preventDefault(); setDragging(true); } }}
        onDragLeave={() => setDragging(false)}
        onDrop={isMissingAuto || isImpactedAuto || isMobileAuto ? undefined : handleDrop}
        onClick={isMissingAuto || isImpactedAuto || isMobileAuto ? undefined : () => fileRef.current?.click()}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        ) : displayPreview ? (
          <div
            className="w-full h-full flex items-center justify-center"
            dangerouslySetInnerHTML={{ __html: displayPreview.replace(/<svg/, '<svg width="36" height="72" preserveAspectRatio="xMidYMid meet"') }}
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-current opacity-50">
            <Upload className="w-4 h-4" />
            <span className="text-[10px]">رفع SVG</span>
          </div>
        )}

        {!isMissingAuto && !isImpactedAuto && !isMobileAuto && (
          <input
            ref={fileRef}
            type="file"
            accept=".svg,image/svg+xml"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) processSvgFile(f); }}
          />
        )}
      </div>

      {/* Status indicator */}
      <div className="mt-1.5 flex justify-end">
        {isShowingAuto ? (
          <Zap className="w-3 h-3 opacity-60" />
        ) : displayPreview ? (
          <CheckCircle2 className="w-3 h-3 text-green-600" />
        ) : (
          <AlertCircle className="w-3 h-3 opacity-40" />
        )}
      </div>

    </div>
  );
};

// ─── Tooth Mini Display ───────────────────────────────────────────────────────
const ToothMini: React.FC<{
  number: number;
  uploadCount: number;
  totalStates: number;
  isSelected: boolean;
  onClick: () => void;
}> = ({ number, uploadCount, totalStates, isSelected, onClick }) => {
  const pct = Math.round((uploadCount / totalStates) * 100);
  const isComplete = uploadCount >= totalStates;

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all hover:shadow-md
        ${isSelected
          ? 'border-teal-500 bg-teal-50 shadow-md shadow-teal-100 scale-105'
          : isComplete
            ? 'border-green-300 bg-green-50'
            : uploadCount > 0
              ? 'border-blue-200 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
    >
      {/* Simple tooth SVG placeholder */}
      <div className="w-8 h-12 flex items-center justify-center relative">
        <svg viewBox="0 0 20 32" className="w-full h-full">
          <path d="M4,28 C4,30 6,32 10,32 C14,32 16,30 16,28 L16,10 C16,5 13,2 10,2 C7,2 4,5 4,10 Z"
            fill={isComplete ? '#d1fae5' : uploadCount > 0 ? '#dbeafe' : '#f9fafb'}
            stroke={isSelected ? '#14b8a6' : isComplete ? '#6ee7b7' : '#e5e7eb'}
            strokeWidth="1.5" />
          <path d="M7,28 L7,32 M13,28 L13,32" stroke={isSelected ? '#14b8a6' : '#d1d5db'} strokeWidth="1" />
        </svg>
        {isComplete && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
      <span className="text-[11px] font-bold text-gray-600">{number}</span>
      <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isComplete ? 'bg-green-400' : 'bg-blue-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[9px] text-gray-400">{uploadCount}/{totalStates}</span>
    </button>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
export const DentalChartManager: React.FC = () => {
  const [templates, setTemplates] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    Object.entries(HEALTHY_TEETH_SVGS).forEach(([toothNum, svg]) => {
      initial[`${toothNum}_healthy`] = svg;
    });
    return initial;
  });
  const [selectedTooth, setSelectedTooth] = useState<number | null>(11);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saveSuccess, setSaveSuccess] = useState<Record<string, boolean>>({});
  const [activeSection, setActiveSection] = useState<'diagnosis' | 'treatment'>('diagnosis');
  const [loadingDb, setLoadingDb] = useState(true);

  const makeKey = (tooth: number, state: ToothState) => `${tooth}_${state}`;

  // Fetch all templates on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const { data, error } = await supabase
          .from('odontogram_templates')
          .select('tooth_number, state, svg_content');
        
        if (error) throw error;

        if (data) {
          const loaded: Record<string, string> = {};
          data.forEach((row: any) => {
            loaded[`${row.tooth_number}_${row.state}`] = row.svg_content;
          });
          setTemplates(prev => ({ ...prev, ...loaded }));
        }
      } catch (e) {
        console.error('Error fetching odontogram templates:', e);
      } finally {
        setLoadingDb(false);
      }
    };
    fetchTemplates();
  }, []);

  const handleUploaded = (toothNum: number, state: ToothState, svg: string) => {
    setTemplates(prev => ({ ...prev, [makeKey(toothNum, state)]: svg }));
  };

  const handleReset = (toothNum: number, state: ToothState) => {
    setTemplates(prev => {
      const next = { ...prev };
      delete next[makeKey(toothNum, state)];
      return next;
    });
  };

  const handleSaveToothState = async (toothNum: number, state: ToothState) => {
    const key = makeKey(toothNum, state);
    const svg = templates[key];
    if (!svg) return;

    setSaving(prev => ({ ...prev, [key]: true }));
    try {
      const { error } = await supabase
        .from('odontogram_templates')
        .upsert({ tooth_number: toothNum, state, svg_content: svg }, { onConflict: 'tooth_number,state' });
      if (error) throw error;

      // Also save mirrored tooth if exists
      const mirroredNum = MIRROR_MAP[toothNum];
      if (mirroredNum) {
        await supabase.from('odontogram_templates').upsert(
          { tooth_number: mirroredNum, state, svg_content: svg },
          { onConflict: 'tooth_number,state' }
        );
      }

      setSaveSuccess(prev => ({ ...prev, [key]: true }));
      setTimeout(() => setSaveSuccess(prev => ({ ...prev, [key]: false })), 2000);
    } catch (e) {
      console.error('Save error:', e);
      alert('فشل حفظ القالب');
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleSaveAllForTooth = async (toothNum: number) => {
    const allStates = ALL_UPLOADABLE_STATES.map(s => s.id);
    for (const state of allStates) {
      const key = makeKey(toothNum, state);
      if (templates[key]) {
        await handleSaveToothState(toothNum, state);
      }
    }
  };

  const getUploadCount = (toothNum: number) => {
    return ALL_UPLOADABLE_STATES.filter(s => templates[makeKey(toothNum, s.id)]).length;
  };

  const healthySvg = selectedTooth ? templates[makeKey(selectedTooth, 'healthy')] : undefined;

  const currentStates = activeSection === 'diagnosis' ? DIAGNOSTIC_STATES : TREATMENT_STATES;
  const selectedToothUploadCount = selectedTooth ? getUploadCount(selectedTooth) : 0;
  const totalStates = ALL_UPLOADABLE_STATES.length;

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full" dir="rtl">
      <style>{`
        .missing-tooth-svg * {
            fill: none !important;
            stroke: #a8a29e !important;
            stroke-dasharray: 3 3 !important;
            stroke-width: 1.5px !important;
        }
        @keyframes mobile-tooth-shake {
            0%, 100% { transform: rotate(0deg) translateX(0px); }
            50% { transform: rotate(1.5deg) translateX(0.5px); }
        }
        @keyframes mobile-tooth-svg-glow {
            0%, 100% { filter: drop-shadow(0 0 1px rgba(20, 184, 166, 0.35)); }
            50% { filter: drop-shadow(0 0 5px rgba(20, 184, 166, 0.95)); }
        }
        .mobile-tooth-svg {
            animation: mobile-tooth-shake 2.5s ease-in-out infinite, mobile-tooth-svg-glow 2s ease-in-out infinite;
            transform-origin: bottom center;
        }
        .mobile-tooth-static-stroke * {
            fill: none !important;
            stroke: #14b8a6 !important;
            stroke-dasharray: 2 2 !important;
            stroke-width: 1.2px !important;
            opacity: 0.6 !important;
        }
        @keyframes abscess-tooth-svg-glow {
            0%, 100% { filter: drop-shadow(0 0 1px rgba(220, 38, 38, 0.35)); }
            50% { filter: drop-shadow(0 0 5px rgba(220, 38, 38, 0.95)); }
        }
        .abscess-tooth-svg {
            animation: abscess-tooth-svg-glow 2s ease-in-out infinite;
        }
      `}</style>

      {/* ── Left Panel: Tooth Selector ── */}
      <div className="lg:w-80 flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
          <div className="p-2 bg-teal-50 rounded-xl">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2C8.5 2 6 5 6 8c0 4 2 6 3 10h6c1-4 3-6 3-10 0-3-2.5-6-6-6z"/>
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">اختر السن</h3>
            <p className="text-xs text-gray-500">الجهة اليمنى فقط (16 سن)</p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex gap-2">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            ترفع <strong>16 سناً فقط</strong> (اليمين)، ويُعكس النظام للجهة اليسرى تلقائياً.
            الحالة <strong>مفقود</strong> تُولَّد من شكل السليم بدون رفع.
          </p>
        </div>

        {/* Upper Right Teeth */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase">الفك العلوي الأيمن</span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {RIGHT_TEETH.upper.map(n => (
              <ToothMini
                key={n}
                number={n}
                uploadCount={getUploadCount(n)}
                totalStates={totalStates}
                isSelected={selectedTooth === n}
                onClick={() => setSelectedTooth(n)}
              />
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-2 my-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-[10px] text-gray-400 font-medium">خط الإطباق</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        {/* Lower Right Teeth */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase">الفك السفلي الأيمن</span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {RIGHT_TEETH.lower.map(n => (
              <ToothMini
                key={n}
                number={n}
                uploadCount={getUploadCount(n)}
                totalStates={totalStates}
                isSelected={selectedTooth === n}
                onClick={() => setSelectedTooth(n)}
              />
            ))}
          </div>
        </div>

        {/* Mirror Info */}
        {selectedTooth && MIRROR_MAP[selectedTooth] && (
          <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-purple-500 shrink-0" />
            <p className="text-xs text-purple-700">
              السن <strong>{selectedTooth}</strong> سيُنسخ تلقائياً وينعكس للسن <strong>{MIRROR_MAP[selectedTooth]}</strong>
            </p>
          </div>
        )}
      </div>

      {/* ── Right Panel: SVG Upload ── */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {selectedTooth ? (
          <>
            {/* Panel Header */}
            <div className="p-5 border-b border-gray-100 bg-gradient-to-l from-teal-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">السن رقم {selectedTooth}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {selectedToothUploadCount} / {totalStates} حالات مرفوعة
                  </p>
                  <div className="mt-2 h-2 w-48 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full transition-all"
                      style={{ width: `${(selectedToothUploadCount / totalStates) * 100}%` }}
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleSaveAllForTooth(selectedTooth)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium text-sm transition-all shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  حفظ الكل للسن {selectedTooth}
                </button>
              </div>

              {/* Section Toggle */}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setActiveSection('diagnosis')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                    activeSection === 'diagnosis'
                      ? 'bg-red-50 border-red-400 text-red-800'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <AlertCircle className="w-4 h-4" />
                  حالات التشخيص (5)
                </button>
                <button
                  onClick={() => setActiveSection('treatment')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                    activeSection === 'treatment'
                      ? 'bg-blue-50 border-blue-400 text-blue-800'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  أشكال العلاج (6)
                </button>
              </div>
            </div>

            {/* Grid of state cards */}
            <div className="p-5">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {currentStates.map(stateInfo => (
                  <div key={stateInfo.id} className="flex flex-col gap-2">
                    <SvgUploadCard
                      stateInfo={stateInfo}
                      toothNumber={selectedTooth}
                      existing={templates[makeKey(selectedTooth, stateInfo.id)]}
                      onUploaded={(state, svg) => handleUploaded(selectedTooth, state, svg)}
                      onReset={(state) => handleReset(selectedTooth, state)}
                      healthySvg={healthySvg}
                      isStainedAuto={stateInfo.id === 'stained'}
                    />
                    {templates[makeKey(selectedTooth, stateInfo.id)] && (
                      <button
                        onClick={() => handleSaveToothState(selectedTooth, stateInfo.id)}
                        disabled={saving[makeKey(selectedTooth, stateInfo.id)]}
                        className={`w-full py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1
                          ${saveSuccess[makeKey(selectedTooth, stateInfo.id)]
                            ? 'bg-green-100 text-green-700'
                            : 'bg-teal-600 hover:bg-teal-700 text-white'
                          }`}
                      >
                        {saving[makeKey(selectedTooth, stateInfo.id)] ? (
                          <><Loader2 className="w-3 h-3 animate-spin" /> جاري الحفظ</>
                        ) : saveSuccess[makeKey(selectedTooth, stateInfo.id)] ? (
                          <><CheckCircle2 className="w-3 h-3" /> تم الحفظ!</>
                        ) : (
                          'حفظ'
                        )}
                      </button>
                    )}
                  </div>
                ))}

                {/* Auto-missing, Auto-impacted, and Auto-mobile cards (only in diagnosis section) */}
                {activeSection === 'diagnosis' && (
                  <>
                    <div className="flex flex-col gap-2">
                      <SvgUploadCard
                        stateInfo={{ id: 'missing', label: 'مفقود', color: 'bg-gray-50 border-gray-300 text-gray-600', dot: 'bg-gray-400' }}
                        toothNumber={selectedTooth}
                        onUploaded={() => {}}
                        onReset={() => {}}
                        isMissingAuto={true}
                        healthySvg={healthySvg}
                      />
                      <div className="text-center text-[10px] text-gray-400 font-medium">يُولَّد تلقائياً</div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <SvgUploadCard
                        stateInfo={{ id: 'impacted', label: 'مطمور', color: 'bg-purple-50 border-purple-300 text-purple-800', dot: 'bg-purple-500' }}
                        toothNumber={selectedTooth}
                        onUploaded={() => {}}
                        onReset={() => {}}
                        isImpactedAuto={true}
                        healthySvg={healthySvg}
                      />
                      <div className="text-center text-[10px] text-gray-400 font-medium">يُولَّد تلقائياً</div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <SvgUploadCard
                        stateInfo={{ id: 'mobile', label: 'حركة (Mobile)', color: 'bg-teal-50 border-teal-300 text-teal-800', dot: 'bg-teal-500' }}
                        toothNumber={selectedTooth}
                        onUploaded={() => {}}
                        onReset={() => {}}
                        isMobileAuto={true}
                        healthySvg={healthySvg}
                      />
                      <div className="text-center text-[10px] text-gray-400 font-medium">يُولَّد تلقائياً</div>
                    </div>
                  </>
                )}
              </div>

              {/* Design Instructions */}
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <h4 className="text-sm font-bold text-amber-800 mb-2">📐 تعليمات التصميم</h4>
                <ul className="text-xs text-amber-700 space-y-1">
                  <li>• <strong>ViewBox المعتمد:</strong> <code className="bg-amber-100 px-1 rounded">0 0 40 80</code> (عرض 40px × ارتفاع 80px)</li>
                  <li>• السن في منتصف الإطار تماماً في جميع الحالات للمحاذاة المثالية</li>
                  <li>• الألوان مدمجة مباشرة في الـ SVG (لا CSS خارجي)</li>
                  <li>• الجهة اليسرى تُعكس تلقائياً عند الرفع</li>
                </ul>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center h-full min-h-64">
            <div className="text-center text-gray-400">
              <svg viewBox="0 0 24 24" className="w-16 h-16 mx-auto mb-3 opacity-20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2C8.5 2 6 5 6 8c0 4 2 6 3 10h6c1-4 3-6 3-10 0-3-2.5-6-6-6z"/>
              </svg>
              <p className="font-medium">اختر سناً من اليسار للبدء</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
