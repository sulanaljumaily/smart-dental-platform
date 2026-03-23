import React from 'react';
import { ToothCondition } from '../../types/treatment';

interface TeethChartProps {
    teeth: ToothCondition[];
    onToothClick: (tooth: ToothCondition) => void;
}

export const TeethChart: React.FC<TeethChartProps> = ({ teeth, onToothClick }) => {

    // SVG Paths for reusable shapes
    const ToothShape = () => (
        <path d="M10,2 C5,2 2,5 2,10 L2,25 C2,35 8,40 10,40 C12,40 18,35 18,25 L18,10 C18,5 15,2 10,2 Z" fill="white" stroke="#e5e7eb" strokeWidth="1.5" />
    );

    const RootShape = () => (
        <path d="M5,25 L5,45 C5,48 8,50 10,50 C12,50 15,48 15,45 L15,25" fill="none" stroke="#e5e7eb" strokeWidth="1.5" />
    );

    const renderToothInfo = (tooth: ToothCondition) => {
        const isSelected = false;
        // Logic: Check if there's an active/planned treatment for this tooth which overrides the base condition
        // e.g., if plan.overallStatus === 'planned' and type === 'endo', show endo visual

        let condition = tooth.condition;
        // In a real app, we'd join with the plan data. For now, we assume `tooth.condition` is updated by the Modal save.
        // However, we can also look at `tooth.treatmentPlan` if we want to show 'planned' state differently (e.g., ghosted or dashed)

        const isPlanned = tooth.treatmentPlan?.overallStatus === 'planned';
        // If planned, we could optionally change opacity or stroke style. Keeping it simple for now as requested.

        return (
            <button
                key={tooth.number}
                onClick={() => onToothClick(tooth)}
                className={`relative group flex flex-col items-center p-1 transition-all duration-200 
                    ${tooth.condition === 'missing' ? 'opacity-40 grayscale' : 'hover:-translate-y-1 hover:drop-shadow-md'}`}
            >
                <div className="relative w-12 h-16 flex items-center justify-center">

                    <svg viewBox="0 0 20 52" className="w-full h-full overflow-visible drop-shadow-sm">
                        {/* Roots (simplified) */}
                        <RootShape />

                        {/* Crown Body */}
                        <ToothShape />

                        {/* Condition Overlays */}
                        {tooth.condition === 'decayed' && (
                            <circle cx="10" cy="12" r="3" fill="#ef4444" opacity="0.8" />
                        )}

                        {tooth.condition === 'filled' && (
                            <path d="M6,8 Q10,12 14,8 L14,14 Q10,18 6,14 Z" fill="#3b82f6" opacity="0.7" />
                        )}

                        {tooth.condition === 'endo' && (
                            <g stroke="#9333ea" strokeWidth="1.5" strokeLinecap="round">
                                <line x1="10" y1="10" x2="10" y2="45" strokeDasharray="1 1" />
                                <circle cx="10" cy="8" r="1.5" fill="#9333ea" />
                            </g>
                        )}

                        {tooth.condition === 'implant' && (
                            <g>
                                {/* Screw Thread Visual */}
                                <path d="M7,28 L13,30 M7,32 L13,34 M7,36 L13,38 M7,40 L13,42" stroke="#6b7280" strokeWidth="1.5" />
                                <rect x="8.5" y="25" width="3" height="22" rx="1" fill="#9ca3af" />
                                {/* Abutment */}
                                <rect x="7" y="20" width="6" height="4" fill="#6b7280" />
                            </g>
                        )}

                        {tooth.condition === 'crown' && (
                            <path d="M2,10 L2,2 Q10,-2 18,2 L18,10 Q10,14 2,10 Z" fill="none" stroke="#ca8a04" strokeWidth="2" /> // Gold border
                        )}
                        {/* Selection/Hover Ring - Optional, simplified for now */}
                    </svg>

                    {/* Badge for Condition */}
                    {tooth.condition !== 'healthy' && (
                        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border border-white ${tooth.condition === 'decayed' ? 'bg-red-500' :
                            tooth.condition === 'missing' ? 'bg-gray-400' :
                                tooth.condition === 'filled' ? 'bg-blue-500' :
                                    tooth.condition === 'endo' ? 'bg-purple-500' :
                                        tooth.condition === 'implant' ? 'bg-gray-600' :
                                            tooth.condition === 'crown' ? 'bg-yellow-500' : 'bg-gray-200'
                            }`}></div>
                    )}
                </div>
                <span className="text-xs font-bold text-gray-500 mt-1 font-mono group-hover:text-blue-600">{tooth.number}</span>
            </button>
        );
    };

    // Helper to get status color (for non-SVG usage if needed)
    const getStatusColor = (condition: string) => {
        switch (condition) {
            case 'decayed': return 'text-red-500';
            case 'filled': return 'text-blue-500';
            case 'missing': return 'text-gray-400';
            case 'crown': return 'text-yellow-600';
            case 'endo': return 'text-purple-600';
            case 'implant': return 'text-gray-600';
            default: return 'text-gray-700';
        }
    };

    // Upper Jaw: 18-11 (Right), 21-28 (Left)
    const upperRight = teeth.filter(t => t.number >= 11 && t.number <= 18).sort((a, b) => b.number - a.number);
    const upperLeft = teeth.filter(t => t.number >= 21 && t.number <= 28).sort((a, b) => a.number - b.number);

    // Lower Jaw: 48-41 (Right), 31-38 (Left)
    const lowerRight = teeth.filter(t => t.number >= 41 && t.number <= 48).sort((a, b) => b.number - a.number);
    const lowerLeft = teeth.filter(t => t.number >= 31 && t.number <= 38).sort((a, b) => a.number - b.number);

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h3 className="text-lg font-bold text-gray-900">مخطط الأسنان التفاعلي</h3>
                <div className="flex gap-2 text-xs">
                    <span className="px-2 py-1 bg-gray-100 rounded text-gray-600">FDI System</span>
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded font-medium">Permanent</span>
                </div>
            </div>

            <div className="flex flex-col items-center gap-8">
                {/* Upper Jaw */}
                <div className="flex justify-center gap-1 md:gap-4 pb-6 border-b border-dashed border-gray-200 w-full overflow-x-auto">
                    <div className="flex gap-1 md:gap-2">{upperRight.map(renderToothInfo)}</div>
                    <div className="w-px bg-gray-300 h-12 self-center mx-2 md:mx-6 opacity-30"></div>
                    <div className="flex gap-1 md:gap-2">{upperLeft.map(renderToothInfo)}</div>
                </div>

                {/* Lower Jaw */}
                <div className="flex justify-center gap-1 md:gap-4 w-full overflow-x-auto">
                    <div className="flex gap-1 md:gap-2">{lowerRight.map(renderToothInfo)}</div>
                    <div className="w-px bg-gray-300 h-12 self-center mx-2 md:mx-6 opacity-30"></div>
                    <div className="flex gap-1 md:gap-2">{lowerLeft.map(renderToothInfo)}</div>
                </div>
            </div>

            {/* Legend */}
            <div className="mt-8 pt-4 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-xs text-gray-600">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-white border border-gray-300 rounded-sm"></div> سليم</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-100 border border-red-400 rounded-sm relative"><div className="absolute inset-0 bg-red-500 rounded-full scale-50"></div></div> تسوس</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-100 border border-blue-400 rounded-sm"></div> حشوة</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-purple-100 border border-purple-400 rounded-sm"></div> عصب</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-50 border border-yellow-400 rounded-sm"></div> تلبيس</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-gray-200 border border-gray-400 rounded-sm"></div> زرعة</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-gray-50 border border-dashed border-gray-300 rounded-sm opacity-50"></div> مفقود</div>
            </div>
        </div>
    );
};
