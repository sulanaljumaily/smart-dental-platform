import React, { useState } from 'react';
import { AIResult } from '../../lib/aiMock';
import { CheckCircle, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react';

interface AnalysisResultCardProps {
    imageUrl: string;
    result: AIResult;
    date: string;
}

export const AnalysisResultCard: React.FC<AnalysisResultCardProps> = ({ imageUrl, result, date }) => {
    const [showImage, setShowImage] = useState(true);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center bg-gray-50/50">
                <div>
                    <h3 className="font-semibold text-gray-900">تقرير التحليل الذكي</h3>
                    <p className="text-xs text-gray-500">{new Date(date).toLocaleString('ar-IQ')}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1
                    ${result.issues.length > 0 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}
                `}>
                    {result.issues.length > 0 ? (
                        <><AlertTriangle className="w-3 h-3" /> تم اكتشاف ملاحظات</>
                    ) : (
                        <><CheckCircle className="w-3 h-3" /> سليم</>
                    )}
                </div>
            </div>

            <div className="p-4 grid md:grid-cols-2 gap-6">
                {/* Image Section */}
                <div className="relative group">
                    <div className="aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden border relative">
                        <img
                            src={imageUrl}
                            alt="X-Ray Analysis"
                            className="w-full h-full object-contain"
                        />
                        {/* Bounding Boxes Overlay */}
                        {showImage && result.issues.map((issue, idx) => (
                            issue.box && (
                                <div
                                    key={idx}
                                    className="absolute border-2 border-red-500/70 bg-red-500/10 hover:bg-red-500/20 transition-colors cursor-help"
                                    style={{
                                        left: `${issue.box[0] * 100}%`,
                                        top: `${issue.box[1] * 100}%`,
                                        width: `${issue.box[2] * 100}%`,
                                        height: `${issue.box[3] * 100}%`
                                    }}
                                    title={`${issue.label} (${(issue.confidence * 100).toFixed(0)}%)`}
                                >
                                    <span className="absolute -top-6 left-0 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm">
                                        {issue.label}
                                    </span>
                                </div>
                            )
                        ))}
                    </div>
                </div>

                {/* Info Section */}
                <div className="space-y-4">
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">الملخص</h4>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border leading-relaxed">
                            {result.summary}
                        </p>
                    </div>

                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">التوصيات</h4>
                        <div className="flex items-start gap-2 text-sm text-blue-700 bg-blue-50 p-3 rounded-lg border border-blue-100">
                            <Info className="w-4 h-4 mt-0.5" />
                            <p>{result.recommendation}</p>
                        </div>
                    </div>

                    {result.issues.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">التفاصيل ({result.issues.length})</h4>
                            <div className="space-y-2">
                                {result.issues.map((issue, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-2 rounded-lg border hover:bg-gray-50">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-red-500" />
                                            <span className="font-medium text-sm text-gray-800">{issue.label}</span>
                                        </div>
                                        <div className="text-xs text-gray-500 font-mono">
                                            {(issue.confidence * 100).toFixed(0)}% دقة
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
