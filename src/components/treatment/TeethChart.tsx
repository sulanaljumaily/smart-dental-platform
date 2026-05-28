import React, { useState, useEffect } from 'react';
import { ToothCondition } from '../../types/treatment';
import { Check, MousePointerClick, Sparkles } from 'lucide-react';
import { Button } from '../common/Button';
import { supabase } from '../../lib/supabase';
import { HEALTHY_TEETH_SVGS } from '../../constants/healthyTeeth';

interface TeethChartProps {
    teeth: ToothCondition[];
    onToothClick: (tooth: ToothCondition) => void;
    isSelectionMode?: boolean;
    selectedTeethNumbers?: number[];
    onSelectionChange?: (toothNumbers: number[]) => void;
    onSelectionComplete?: () => void;
    onCancelSelection?: () => void;
    onEnableSelection?: () => void;
    onGeneralTreatmentClick?: () => void;
}

export const TeethChart: React.FC<TeethChartProps> = ({
    teeth,
    onToothClick,
    isSelectionMode = false,
    selectedTeethNumbers = [],
    onSelectionChange,
    onSelectionComplete,
    onCancelSelection,
    onEnableSelection,
    onGeneralTreatmentClick
}) => {
    const [templates, setTemplates] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {};
        Object.entries(HEALTHY_TEETH_SVGS).forEach(([toothNum, svg]) => {
            initial[`${toothNum}_healthy`] = svg;
        });
        return initial;
    });
    const [loading, setLoading] = useState(true);

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
                setLoading(false);
            }
        };
        fetchTemplates();
    }, []);

    const toggleToothSelection = (toothNumber: number) => {
        if (!onSelectionChange) return;
        if (selectedTeethNumbers.includes(toothNumber)) {
            onSelectionChange(selectedTeethNumbers.filter(n => n !== toothNumber));
        } else {
            onSelectionChange([...selectedTeethNumbers, toothNumber]);
        }
    };

    const handleToothInteraction = (tooth: ToothCondition) => {
        if (isSelectionMode) {
            toggleToothSelection(tooth.number);
        } else {
            onToothClick(tooth);
        }
    };

    const RootShape = () => (
        <path d="M5,25 L5,45 C5,48 8,50 10,50 C12,50 15,48 15,45 L15,25" fill="none" stroke="#e5e7eb" strokeWidth="1.5" />
    );

    const renderToothSvg = (toothNum: number, condition: string) => {
        // Handle abscess tooth with red drop shadow shape glow
        if (condition === 'abscess') {
            const isLeft = (toothNum >= 21 && toothNum <= 28) || (toothNum >= 31 && toothNum <= 38);
            let abscessSvg = templates[`${toothNum}_abscess`] || templates[`${toothNum}_healthy`];
            
            if (abscessSvg) {
                // Strip static width/height attributes
                let baseSvg = abscessSvg;
                const svgStart = baseSvg.toLowerCase().indexOf('<svg');
                if (svgStart !== -1) {
                    baseSvg = baseSvg.slice(svgStart);
                }
                baseSvg = baseSvg.replace(/<svg([^>]*?)(width|height)="[^"]*"/gi, '<svg$1');

                // Extract width dynamically from viewBox for exact horizontal mirroring
                let viewBoxWidth = 40; // Default
                const viewBoxMatch = baseSvg.match(/viewBox=["']\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*["']/i);
                if (viewBoxMatch) {
                    const parsedWidth = parseFloat(viewBoxMatch[3]);
                    if (!isNaN(parsedWidth) && parsedWidth > 0) {
                        viewBoxWidth = parsedWidth;
                    }
                }

                if (!baseSvg.includes('viewBox')) {
                    baseSvg = baseSvg.replace('<svg', `<svg viewBox="0 0 ${viewBoxWidth} 80"`);
                }

                // Inject abscess class
                let processedAbscess = baseSvg.replace('<svg ', '<svg class="abscess-tooth-svg" ');
                const svgOpenIndex = processedAbscess.indexOf('>');
                if (svgOpenIndex !== -1) {
                    const openTag = processedAbscess.slice(0, svgOpenIndex + 1);
                    const contents = processedAbscess.slice(svgOpenIndex + 1, processedAbscess.lastIndexOf('</svg>'));
                    if (isLeft) {
                        processedAbscess = `${openTag}<g transform="scale(-1,1) translate(-${viewBoxWidth},0)">${contents}</g></svg>`;
                    } else {
                        processedAbscess = `${openTag}${contents}</svg>`;
                    }
                }

                return (
                    <div 
                        className="w-full h-full flex items-center justify-center p-0 sm:p-0.5"
                        dangerouslySetInnerHTML={{ __html: processedAbscess }}
                    />
                );
            }
        }

        // Handle mobile tooth (mobility) with stacked static stroke and moving foreground
        if (condition === 'mobile') {
            const isLeft = (toothNum >= 21 && toothNum <= 28) || (toothNum >= 31 && toothNum <= 38);
            const healthySvg = templates[`${toothNum}_healthy`];
            
            if (healthySvg) {
                // Strip static width/height attributes
                let baseSvg = healthySvg;
                const svgStart = baseSvg.toLowerCase().indexOf('<svg');
                if (svgStart !== -1) {
                    baseSvg = baseSvg.slice(svgStart);
                }
                baseSvg = baseSvg.replace(/<svg([^>]*?)(width|height)="[^"]*"/gi, '<svg$1');

                // Extract width dynamically from viewBox for exact horizontal mirroring
                let viewBoxWidth = 40; // Default
                const viewBoxMatch = baseSvg.match(/viewBox=["']\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*["']/i);
                if (viewBoxMatch) {
                    const parsedWidth = parseFloat(viewBoxMatch[3]);
                    if (!isNaN(parsedWidth) && parsedWidth > 0) {
                        viewBoxWidth = parsedWidth;
                    }
                }

                if (!baseSvg.includes('viewBox')) {
                    baseSvg = baseSvg.replace('<svg', `<svg viewBox="0 0 ${viewBoxWidth} 80"`);
                }

                // Create static background outline SVG
                let staticOutlineSvg = baseSvg.replace('<svg ', '<svg class="mobile-tooth-static-stroke" ');
                const svgOpenIndex1 = staticOutlineSvg.indexOf('>');
                if (svgOpenIndex1 !== -1) {
                    const openTag = staticOutlineSvg.slice(0, svgOpenIndex1 + 1);
                    const contents = staticOutlineSvg.slice(svgOpenIndex1 + 1, staticOutlineSvg.lastIndexOf('</svg>'));
                    if (isLeft) {
                        staticOutlineSvg = `${openTag}<g transform="scale(-1,1) translate(-${viewBoxWidth},0)">${contents}</g></svg>`;
                    } else {
                        staticOutlineSvg = `${openTag}${contents}</svg>`;
                    }
                }

                // Create moving foreground SVG
                let movingSvg = baseSvg.replace('<svg ', '<svg class="mobile-tooth-svg" ');
                const svgOpenIndex2 = movingSvg.indexOf('>');
                if (svgOpenIndex2 !== -1) {
                    const openTag = movingSvg.slice(0, svgOpenIndex2 + 1);
                    const contents = movingSvg.slice(svgOpenIndex2 + 1, movingSvg.lastIndexOf('</svg>'));
                    if (isLeft) {
                        movingSvg = `${openTag}<g transform="scale(-1,1) translate(-${viewBoxWidth},0)">${contents}</g></svg>`;
                    } else {
                        movingSvg = `${openTag}${contents}</svg>`;
                    }
                }

                return (
                    <div className="w-full h-full relative flex items-center justify-center p-0">
                        <div 
                            className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none p-0 sm:p-0.5"
                            dangerouslySetInnerHTML={{ __html: staticOutlineSvg }}
                        />
                        <div 
                            className="relative w-full h-full flex items-center justify-center z-10 p-0 sm:p-0.5"
                            dangerouslySetInnerHTML={{ __html: movingSvg }}
                        />
                    </div>
                );
            }

            // Fallback basic tooth for mobile state (stacked)
            return (
                <div className="w-full h-full relative flex items-center justify-center p-0">
                    <div className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none p-0 sm:p-0.5">
                        <svg viewBox="0 0 20 52" className="w-full h-full overflow-visible drop-shadow-sm mobile-tooth-static-stroke">
                            <g transform={isLeft ? "scale(-1,1) translate(-20,0)" : ""}>
                                <RootShape />
                                <path 
                                    d="M10,2 C5,2 2,5 2,10 L2,25 C2,35 8,40 10,40 C12,40 18,35 18,25 L18,10 C18,5 15,2 10,2 Z" 
                                    fill="none" 
                                    stroke="#14b8a6" 
                                    strokeWidth="1.2" 
                                    style={{ strokeDasharray: '2,2', opacity: 0.6 }}
                                />
                            </g>
                        </svg>
                    </div>
                    <div className="relative w-full h-full flex items-center justify-center z-10 p-0 sm:p-0.5">
                        <svg viewBox="0 0 20 52" className="w-full h-full overflow-visible drop-shadow-sm mobile-tooth-svg">
                            <g transform={isLeft ? "scale(-1,1) translate(-20,0)" : ""}>
                                <RootShape />
                                <path 
                                    d="M10,2 C5,2 2,5 2,10 L2,25 C2,35 8,40 10,40 C12,40 18,35 18,25 L18,10 C18,5 15,2 10,2 Z" 
                                    fill="white" 
                                    stroke="#e5e7eb" 
                                    strokeWidth="1.5" 
                                />
                            </g>
                        </svg>
                    </div>
                </div>
            );
        }

        // 1. Try to get template for this specific tooth and condition
        let svg = templates[`${toothNum}_${condition}`];
        let isCustom = !!svg;

        // 2. If missing, try healthy template
        if (!svg && condition === 'missing') {
            svg = templates[`${toothNum}_healthy`];
            if (svg) {
                // Remove XML declaration and comments before modifying
                const svgStart = svg.toLowerCase().indexOf('<svg');
                if (svgStart !== -1) {
                    svg = svg.slice(svgStart);
                }
                // Apply missing class to remove fills and apply dashed stroke
                svg = svg.replace('<svg ', '<svg class="missing-tooth-svg" ');
                isCustom = true;
            }
        }

        // If stained and no custom stained SVG is uploaded, automatically fallback to healthy template with a yellow tint filter!
        if (!svg && condition === 'stained') {
            svg = templates[`${toothNum}_healthy`];
            if (svg) {
                const svgStart = svg.toLowerCase().indexOf('<svg');
                if (svgStart !== -1) {
                    svg = svg.slice(svgStart);
                }
                // Apply sepia/yellowish filter to the custom healthy SVG
                svg = svg.replace('<svg ', '<svg style="filter: sepia(0.6) saturate(1.8) hue-rotate(10deg) brightness(0.95)" ');
                isCustom = true;
            }
        }

        // If impacted and no custom template is uploaded, automatically use healthy template with rotation/opacity effect!
        if (!svg && condition === 'impacted') {
            svg = templates[`${toothNum}_healthy`];
            if (svg) {
                const svgStart = svg.toLowerCase().indexOf('<svg');
                if (svgStart !== -1) {
                    svg = svg.slice(svgStart);
                }
                // Rotate 25deg, translate down, and set semi-transparent opacity to represent impacted tooth under the gumline
                svg = svg.replace('<svg ', '<svg style="transform: rotate(25deg) translateY(6px); opacity: 0.8; transform-origin: center;" ');
                isCustom = true;
            }
        }

        // 3. Fallback to basic tooth if no custom template exists
        if (!isCustom) {
            const isLeft = (toothNum >= 21 && toothNum <= 28) || (toothNum >= 31 && toothNum <= 38);
            const healthySvg = templates[`${toothNum}_healthy`];

            if (healthySvg) {
                // Strip static width/height attributes
                let baseSvg = healthySvg;
                const svgStart = baseSvg.toLowerCase().indexOf('<svg');
                if (svgStart !== -1) {
                    baseSvg = baseSvg.slice(svgStart);
                }
                baseSvg = baseSvg.replace(/<svg([^>]*?)(width|height)="[^"]*"/gi, '<svg$1');

                // Extract width dynamically from viewBox for exact horizontal mirroring
                let viewBoxWidth = 40; // Default
                const viewBoxMatch = baseSvg.match(/viewBox=["']\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*["']/i);
                if (viewBoxMatch) {
                    const parsedWidth = parseFloat(viewBoxMatch[3]);
                    if (!isNaN(parsedWidth) && parsedWidth > 0) {
                        viewBoxWidth = parsedWidth;
                    }
                }

                if (!baseSvg.includes('viewBox')) {
                    baseSvg = baseSvg.replace('<svg', `<svg viewBox="0 0 ${viewBoxWidth} 80"`);
                }

                // Target opening tag of SVG to wrap contents inside a mirroring <g> group
                let processedHealthy = baseSvg;
                const svgOpenIndex = processedHealthy.indexOf('>');
                if (svgOpenIndex !== -1) {
                    const openTag = processedHealthy.slice(0, svgOpenIndex + 1);
                    const contents = processedHealthy.slice(svgOpenIndex + 1, processedHealthy.lastIndexOf('</svg>'));
                    
                    if (isLeft) {
                        processedHealthy = `${openTag}<g transform="scale(-1,1) translate(-${viewBoxWidth},0)">${contents}</g></svg>`;
                    } else {
                        processedHealthy = `${openTag}${contents}</svg>`;
                    }
                }

                return (
                    <div className="w-full h-full relative flex items-center justify-center p-0">
                        {/* Background: High-fidelity healthy SVG */}
                        <div 
                            className="absolute inset-0 w-full h-full flex items-center justify-center p-0 sm:p-0.5"
                            dangerouslySetInnerHTML={{ __html: processedHealthy }}
                        />
                        {/* Foreground Overlay: Transparent SVG with the clinical markings (e.g. decayed dot, crown, implant screw, bridge, endo line, etc.) */}
                        <div className="absolute inset-0 w-full h-full flex items-center justify-center z-10 pointer-events-none p-0 sm:p-0.5">
                            <svg viewBox="0 0 20 52" className="w-full h-full overflow-visible drop-shadow-sm">
                                <g transform={isLeft ? "scale(-1,1) translate(-20,0)" : ""}>
                                    {/* Decay overlay */}
                                    {condition === 'decayed' && (
                                        <circle cx="10" cy="12" r="3.2" fill="#ef4444" opacity="0.95" stroke="white" strokeWidth="0.8" />
                                    )}

                                    {/* Filled overlay */}
                                    {condition === 'filled' && (
                                        <path d="M6,8 Q10,12 14,8 L14,14 Q10,18 6,14 Z" fill="#3b82f6" opacity="0.85" stroke="white" strokeWidth="0.8" />
                                    )}

                                    {/* Endo overlay */}
                                    {condition === 'endo' && (
                                        <g stroke="#9333ea" strokeWidth="1.6" strokeLinecap="round">
                                            <line x1="10" y1="10" x2="10" y2="45" strokeDasharray="1 1" />
                                            <circle cx="10" cy="8" r="1.8" fill="#9333ea" stroke="white" strokeWidth="0.6" />
                                        </g>
                                    )}

                                    {/* Implant overlay */}
                                    {condition === 'implant' && (
                                        <g>
                                            <path d="M7,28 L13,30 M7,32 L13,34 M7,36 L13,38 M7,40 L13,42" stroke="#4b5563" strokeWidth="1.5" />
                                            <rect x="8.5" y="25" width="3" height="22" rx="1" fill="#6b7280" stroke="white" strokeWidth="0.6" />
                                            <rect x="7" y="20" width="6" height="4" fill="#4b5563" />
                                        </g>
                                    )}

                                    {/* Crown overlay */}
                                    {condition === 'crown' && (
                                        <path d="M2,10 L2,2 Q10,-2 18,2 L18,10 Q10,14 2,10 Z" fill="rgba(202, 138, 4, 0.15)" stroke="#ca8a04" strokeWidth="2.2" />
                                    )}

                                    {/* Broken overlay */}
                                    {condition === 'broken' && (
                                        <path d="M2,10 L8,10 L4,16 L2,10" fill="#f97316" stroke="#ea580c" strokeWidth="1.2" />
                                    )}

                                    {/* Stained overlay */}
                                    {condition === 'stained' && (
                                        <ellipse cx="10" cy="12" rx="4" ry="2.5" fill="#eab308" opacity="0.65" stroke="white" strokeWidth="0.6" />
                                    )}

                                    {/* Abscess overlay */}
                                    {condition === 'abscess' && (
                                        <circle cx="10" cy="46" r="3.8" fill="#dc2626" opacity="0.9" className="animate-pulse" stroke="white" strokeWidth="0.8" />
                                    )}

                                    {/* Ortho overlay */}
                                    {condition === 'ortho' && (
                                        <g stroke="#0891b2" strokeWidth="1.4">
                                            <line x1="1" y1="12" x2="19" y2="12" />
                                            <rect x="8" y="10" width="4" height="4" fill="#0891b2" stroke="white" strokeWidth="0.5" />
                                            <rect x="3" y="10" width="3" height="4" fill="#0891b2" stroke="white" strokeWidth="0.5" />
                                            <rect x="14" y="10" width="3" height="4" fill="#0891b2" stroke="white" strokeWidth="0.5" />
                                        </g>
                                    )}

                                    {/* Bridge overlay */}
                                    {condition === 'bridge' && (
                                        <rect x="0" y="8" width="20" height="4.5" fill="#06b6d4" opacity="0.75" rx="1.2" stroke="white" strokeWidth="0.6" />
                                    )}
                                </g>
                            </svg>
                        </div>
                    </div>
                );
            }

            // Absolute basic fallback outline only if healthySvg is somehow missing (impossible since preloaded)
            return (
                <svg viewBox="0 0 20 52" className={`w-full h-full overflow-visible drop-shadow-sm 
                    ${condition === 'missing' ? 'missing-tooth-svg' : ''} 
                    ${condition === 'mobile' ? 'mobile-tooth-svg' : ''}
                    ${condition === 'abscess' ? 'abscess-tooth-svg' : ''}`}>
                    <g transform={isLeft ? "scale(-1,1) translate(-20,0)" : ""}>
                        <RootShape />
                        <path 
                            d="M10,2 C5,2 2,5 2,10 L2,25 C2,35 8,40 10,40 C12,40 18,35 18,25 L18,10 C18,5 15,2 10,2 Z" 
                            fill="white" 
                            stroke="#e5e7eb" 
                            strokeWidth="1.5" 
                            style={condition === 'missing' ? { opacity: 0.15, strokeDasharray: '3,3' } : undefined}
                        />

                        {condition === 'decayed' && (
                            <circle cx="10" cy="12" r="3" fill="#ef4444" opacity="0.8" />
                        )}

                        {condition === 'filled' && (
                            <path d="M6,8 Q10,12 14,8 L14,14 Q10,18 6,14 Z" fill="#3b82f6" opacity="0.7" />
                        )}

                        {condition === 'endo' && (
                            <g stroke="#9333ea" strokeWidth="1.5" strokeLinecap="round">
                                <line x1="10" y1="10" x2="10" y2="45" strokeDasharray="1 1" />
                                <circle cx="10" cy="8" r="1.5" fill="#9333ea" />
                            </g>
                        )}

                        {condition === 'implant' && (
                            <g>
                                <path d="M7,28 L13,30 M7,32 L13,34 M7,36 L13,38 M7,40 L13,42" stroke="#6b7280" strokeWidth="1.5" />
                                <rect x="8.5" y="25" width="3" height="22" rx="1" fill="#9ca3af" />
                                <rect x="7" y="20" width="6" height="4" fill="#6b7280" />
                            </g>
                        )}

                        {condition === 'crown' && (
                            <path d="M2,10 L2,2 Q10,-2 18,2 L18,10 Q10,14 2,10 Z" fill="none" stroke="#ca8a04" strokeWidth="2" />
                        )}

                        {condition === 'broken' && (
                            <path d="M2,10 L8,10 L4,16 L2,10" fill="#f97316" stroke="#ea580c" strokeWidth="1" />
                        )}

                        {condition === 'stained' && (
                            <ellipse cx="10" cy="12" rx="4" ry="2.5" fill="#eab308" opacity="0.5" />
                        )}

                        {condition === 'abscess' && (
                            <circle cx="10" cy="46" r="3.5" fill="#dc2626" opacity="0.8" className="animate-pulse" />
                        )}

                        {condition === 'impacted' && (
                            <g transform="rotate(35 10 20)">
                                <path d="M10,2 C5,2 2,5 2,10 L2,25 C2,35 8,40 10,40 C12,40 18,35 18,25 L18,10 C18,5 15,2 10,2 Z" fill="#f5f5f4" stroke="#a8a29e" strokeWidth="1.5" opacity="0.8" />
                            </g>
                        )}

                        {condition === 'ortho' && (
                            <g stroke="#0891b2" strokeWidth="1.2">
                                <line x1="1" y1="12" x2="19" y2="12" />
                                <rect x="8" y="10" width="4" height="4" fill="#0891b2" />
                                <rect x="3" y="10" width="3" height="4" fill="#0891b2" />
                                <rect x="14" y="10" width="3" height="4" fill="#0891b2" />
                            </g>
                        )}

                        {condition === 'bridge' && (
                            <rect x="0" y="8" width="20" height="4" fill="#06b6d4" opacity="0.6" rx="1" />
                        )}
                    </g>
                </svg>
            );
        }

        // Custom template SVG
        const isLeft = (toothNum >= 21 && toothNum <= 28) || (toothNum >= 31 && toothNum <= 38);
        let processedSvg = svg;

        // Strip any leading XML declarations/comments so it starts strictly with <svg
        const svgStart = processedSvg.toLowerCase().indexOf('<svg');
        if (svgStart !== -1) {
            processedSvg = processedSvg.slice(svgStart);
        }

        // Strip static width/height attributes
        processedSvg = processedSvg.replace(/<svg([^>]*?)(width|height)="[^"]*"/gi, '<svg$1');

        // Extract width dynamically from viewBox for exact horizontal mirroring
        let viewBoxWidth = 40; // Default
        const viewBoxMatch = processedSvg.match(/viewBox=["']\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*["']/i);
        if (viewBoxMatch) {
            const parsedWidth = parseFloat(viewBoxMatch[3]);
            if (!isNaN(parsedWidth) && parsedWidth > 0) {
                viewBoxWidth = parsedWidth;
            }
        }

        if (!processedSvg.includes('viewBox')) {
            processedSvg = processedSvg.replace('<svg', `<svg viewBox="0 0 ${viewBoxWidth} 80"`);
        }

        // Target opening tag of SVG to wrap contents inside a mirroring <g> group
        const svgOpenIndex = processedSvg.indexOf('>');
        if (svgOpenIndex !== -1) {
            const openTag = processedSvg.slice(0, svgOpenIndex + 1);
            const contents = processedSvg.slice(svgOpenIndex + 1, processedSvg.lastIndexOf('</svg>'));
            
            if (isLeft) {
                processedSvg = `${openTag}<g transform="scale(-1,1) translate(-${viewBoxWidth},0)">${contents}</g></svg>`;
            } else {
                processedSvg = `${openTag}${contents}</svg>`;
            }
        }

        return (
            <div 
                className="w-full h-full flex items-center justify-center p-0 sm:p-0.5"
                dangerouslySetInnerHTML={{ __html: processedSvg }}
            />
        );
    };

    const renderToothInfo = (tooth: ToothCondition) => {
        const isSelected = selectedTeethNumbers.includes(tooth.number);
        const condition = tooth.condition;
        const isHealthy = condition === 'healthy';

        const getConditionBadgeClass = (cond: string) => {
            switch (cond) {
                case 'decayed': return 'border-red-500 text-red-600 bg-red-500/5';
                case 'missing': return 'border-gray-400 text-gray-500 bg-gray-500/5';
                case 'filled': return 'border-blue-500 text-blue-600 bg-blue-500/5';
                case 'endo': return 'border-purple-500 text-purple-600 bg-purple-500/5';
                case 'implant': return 'border-gray-600 text-gray-700 bg-gray-600/5';
                case 'crown': return 'border-amber-500 text-amber-600 bg-amber-500/5';
                case 'broken': return 'border-orange-500 text-orange-600 bg-orange-500/5';
                case 'stained': return 'border-yellow-600 text-yellow-600 bg-yellow-500/5';
                case 'abscess': return 'border-rose-600 text-rose-700 bg-rose-500/5';
                case 'impacted': return 'border-purple-600 text-purple-700 bg-purple-600/5';
                case 'mobile': return 'border-teal-500 text-teal-600 bg-teal-500/5';
                case 'bridge': return 'border-cyan-500 text-cyan-600 bg-cyan-500/5';
                case 'ortho': return 'border-teal-500 text-teal-600 bg-teal-500/5';
                default: return 'border-gray-300 text-gray-500 bg-transparent';
            }
        };

        return (
            <button
                key={tooth.number}
                onClick={() => handleToothInteraction(tooth)}
                className={`relative group flex flex-col items-center p-0 transition-all duration-200 outline-none
                    ${condition === 'missing' ? 'opacity-40 grayscale' : 'hover:-translate-y-1 hover:drop-shadow-md'}
                    ${isSelectionMode && isSelected ? 'scale-110 drop-shadow-xl z-10' : ''}`}
            >
                <div className={`relative w-[21px] h-10 sm:w-8 sm:h-12 flex items-center justify-center rounded-xl transition-all ${isSelectionMode && isSelected ? 'bg-indigo-50 ring-2 ring-indigo-400' : ''}`}>
                    {renderToothSvg(tooth.number, condition)}

                    {isSelectionMode && isSelected && (
                        <div className="absolute -top-2 -right-2 bg-indigo-600 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-sm z-20">
                            <Check className="w-3 h-3 text-white font-bold" />
                        </div>
                    )}
                </div>

                {isHealthy ? (
                    <span className={`text-[9px] font-bold mt-1 font-mono transition-colors group-hover:text-blue-600 ${isSelected ? 'text-indigo-700' : 'text-gray-500'}`}>
                        {tooth.number}
                    </span>
                ) : (
                    <span className={`mt-1 w-[17px] h-[14px] flex items-center justify-center rounded-[4px] border text-[8px] font-bold font-mono transition-all ${getConditionBadgeClass(condition)}`}>
                        {tooth.number}
                    </span>
                )}
            </button>
        );
    };

    const upperRight = teeth.filter(t => t.number >= 11 && t.number <= 18).sort((a, b) => b.number - a.number);
    const upperLeft = teeth.filter(t => t.number >= 21 && t.number <= 28).sort((a, b) => a.number - b.number);
    const lowerRight = teeth.filter(t => t.number >= 41 && t.number <= 48).sort((a, b) => b.number - a.number);
    const lowerLeft = teeth.filter(t => t.number >= 31 && t.number <= 38).sort((a, b) => a.number - b.number);

    return (
        <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm border border-gray-200 transition-all duration-300 relative">
            <style>{`
                .missing-tooth-svg * {
                    fill: none !important;
                    stroke: #a8a29e !important;
                    stroke-dasharray: 3 3 !important;
                    stroke-width: 1.5px !important;
                }
                .mobile-tooth-static-stroke * {
                    fill: none !important;
                    stroke: #14b8a6 !important;
                    stroke-dasharray: 2 2 !important;
                    stroke-width: 1.2px !important;
                    opacity: 0.6 !important;
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
                @keyframes abscess-tooth-svg-glow {
                    0%, 100% { filter: drop-shadow(0 0 1px rgba(220, 38, 38, 0.35)); }
                    50% { filter: drop-shadow(0 0 5px rgba(220, 38, 38, 0.95)); }
                }
                .abscess-tooth-svg {
                    animation: abscess-tooth-svg-glow 2s ease-in-out infinite;
                }
            `}</style>
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                {onGeneralTreatmentClick ? (
                    <Button variant="outline" size="sm" onClick={onGeneralTreatmentClick} className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-sm border-0 flex items-center gap-2 text-xs font-bold py-2 px-3 h-8">
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                        إضافة علاج عام (كل الأسنان)
                    </Button>
                ) : <div />}

                <div className="flex items-center gap-3">
                    {isSelectionMode ? (
                        <div className="flex items-center gap-2 bg-indigo-50 py-1.5 px-3 rounded-lg border border-indigo-100 animate-in fade-in">
                            <span className="text-sm font-bold text-indigo-700">{selectedTeethNumbers.length} محدد</span>
                            <div className="w-px h-5 bg-indigo-200 mx-1"></div>
                            <Button size="sm" variant="ghost" className="text-gray-500 hover:text-gray-700 h-8 px-3" onClick={onCancelSelection}>إلغاء</Button>
                            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm h-8 px-4" onClick={onSelectionComplete} disabled={selectedTeethNumbers.length === 0}>إكمال</Button>
                        </div>
                    ) : (
                        <Button variant="outline" size="sm" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 flex items-center gap-2" onClick={onEnableSelection}>
                            <MousePointerClick className="w-4 h-4" /> تحديد
                        </Button>
                    )}
                </div>
            </div>

             <div className={`flex flex-col items-center gap-4 transition-opacity duration-300 ${isSelectionMode ? 'bg-slate-50/50 p-1 sm:p-2 rounded-xl ring-1 ring-slate-100 ring-inset' : ''}`}>
                <div className="flex justify-center gap-0 pb-4 border-b border-dashed border-gray-200 w-full overflow-x-auto">
                    <div className="flex gap-0 sm:gap-[1px]">{upperRight.map(renderToothInfo)}</div>
                    <div className="w-px bg-gray-300 h-9 self-center mx-0.5 sm:mx-1 opacity-30"></div>
                    <div className="flex gap-0 sm:gap-[1px]">{upperLeft.map(renderToothInfo)}</div>
                </div>
                <div className="flex justify-center gap-0 w-full overflow-x-auto">
                    <div className="flex gap-0 sm:gap-[1px]">{lowerRight.map(renderToothInfo)}</div>
                    <div className="w-px bg-gray-300 h-9 self-center mx-0.5 sm:mx-1 opacity-30"></div>
                    <div className="flex gap-0 sm:gap-[1px]">{lowerLeft.map(renderToothInfo)}</div>
                </div>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-100 grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2 text-[10px] text-gray-600">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-100 border border-red-400 rounded-sm"></div> تسوس</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-orange-100 border border-orange-400 rounded-sm"></div> مكسور</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-yellow-100 border border-yellow-400 rounded-sm"></div> تصبغ</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-rose-100 border border-rose-400 rounded-sm"></div> خراج</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-purple-100 border border-purple-400 rounded-sm"></div> مطمور</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-teal-100 border border-teal-400 rounded-sm"></div> حركة</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-gray-100 border border-dashed border-gray-300 rounded-sm opacity-50"></div> مفقود</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-100 border border-blue-400 rounded-sm"></div> حشوة</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-violet-100 border border-violet-400 rounded-sm"></div> عصب</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-amber-100 border border-amber-400 rounded-sm"></div> تلبيس</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-cyan-100 border border-cyan-400 rounded-sm"></div> جسر</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-gray-300 border border-gray-500 rounded-sm"></div> زرعة</div>
            </div>
        </div>
    );
};
