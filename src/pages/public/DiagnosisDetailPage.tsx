import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowRight, Brain, User, Send, Zap, MessageSquare,
    Stethoscope, Smile, Activity, AlertCircle, RefreshCw,
    Calendar as CalendarIcon, CheckCircle, Star, Clock
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';

// Extracted Mock Data
const commonConditions = [
    { id: 'tooth_pain', title: 'ألم في الأسنان', icon: Activity },
    { id: 'gum_bleeding', title: 'نزيف اللثة', icon: Activity },
    { id: 'bad_breath', title: 'رائحة الفم', icon: AlertCircle },
    { id: 'sensitivity', title: 'حساسية الأسنان', icon: Zap },
    { id: 'cosmetic', title: 'تجميل وابتسامة', icon: Smile },
    { id: 'checkup', title: 'فحص دوري', icon: Stethoscope },
];

const questionTree = {
    main_question: {
        question: "منذ متى تشعر بهذه الأعراض؟",
        options: [
            { id: 'today', text: 'بدأت اليوم' },
            { id: 'week', text: 'منذ أقل من أسبوع' },
            { id: 'month', text: 'منذ أكثر من أسبوع' },
            { id: 'long', text: 'منذ فترة طويلة' }
        ]
    },
    tooth_pain: {
        question: "كيف تصف شدة الألم؟",
        options: [
            { id: 'mild', text: 'ألم خفيف يمكن تحمله' },
            { id: 'moderate', text: 'ألم متوسط يزداد مع الأكل' },
            { id: 'severe', text: 'ألم شديد يمنع النوم' },
            { id: 'variant', text: 'ألم متقطع (يأتي ويذهب)' }
        ]
    },
    gum_bleeding: {
        question: "متى يحدث النزيف عادة؟",
        options: [
            { id: 'brushing', text: 'عند تنظيف الأسنان فقط' },
            { id: 'eating', text: 'عند الأكل' },
            { id: 'spontaneous', text: 'بدون سبب واضح' },
            { id: 'morning', text: 'عند الاستيقاظ من النوم' }
        ]
    }
};

export const DiagnosisDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>(); // 'ai' or 'smart'
    const navigate = useNavigate();

    // State Management
    const [step, setStep] = useState(1); // 1: Input/Selection, 2: Questionnaire (Smart only), 3: Results
    const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'ai', content: string }>>([
        { role: 'ai', content: 'مرحباً، أنا مساعدك الذكي. صف لي ما تشعر به وسأقوم بتحليل الأعراض.' }
    ]);
    const [currentMessage, setCurrentMessage] = useState('');

    // Smart Diagnosis State
    const [selectedCondition, setSelectedCondition] = useState('');
    const [currentQuestionId, setCurrentQuestionId] = useState(0); // 0: Main, 1: Specific
    const [userResponses, setUserResponses] = useState<Record<number, string>>({});

    // Handlers for AI
    const handleSendMessage = () => {
        if (!currentMessage.trim()) return;

        setChatMessages(prev => [...prev, { role: 'user', content: currentMessage }]);
        const userMsg = currentMessage;
        setCurrentMessage('');

        // Mock AI Response
        setTimeout(() => {
            setChatMessages(prev => [...prev, {
                role: 'ai',
                content: `بناءً على وصفك "${userMsg}"، يبدو أنك تعاني من أعراض أولية. هل يزداد الألم مع المشروبات الباردة؟`
            }]);
        }, 1000);
    };

    // Handlers for Smart Diagnosis
    const handleConditionSelect = (conditionId: string) => {
        setSelectedCondition(conditionId);
        setStep(2);
    };

    const handleAnswerSelect = (optionId: string) => {
        setUserResponses(prev => ({ ...prev, [currentQuestionId]: optionId }));

        setTimeout(() => {
            if (currentQuestionId < 1) { // Simple demo logic: just 2 questions
                setCurrentQuestionId(prev => prev + 1);
            } else {
                setStep(3); // Show Results
            }
        }, 300);
    };

    const resetDiagnosis = () => {
        setStep(1);
        setChatMessages([{ role: 'ai', content: 'مرحباً، أنا مساعدك الذكي. صف لي ما تشعر به وسأقوم بتحليل الأعراض.' }]);
        setCurrentMessage('');
        setSelectedCondition('');
        setCurrentQuestionId(0);
        setUserResponses({});
    };

    if (!id || (id !== 'ai' && id !== 'smart')) {
        return <div className="p-8 text-center text-red-500 font-bold">طريقة غير صحيحة</div>;
    }

    const isAI = id === 'ai';

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-30">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/services#tab-diagnosis')}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <ArrowRight className="w-5 h-5" />
                        <span className="font-medium">عودة للخدمات</span>
                    </button>
                    <h1 className="text-lg font-bold text-gray-900">
                        {isAI ? 'المساعد الذكي (AI)' : 'التشخيص الطبي الذكي'}
                    </h1>
                    <div className="w-8"></div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-3xl">

                {/* AI Interface */}
                {isAI && (
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 flex flex-col h-[80vh]">
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white text-center flex-shrink-0">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/20">
                                <Brain className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-xl font-bold mb-1">المحادثة مع الوكيل الذكي</h2>
                            <p className="text-purple-100 text-sm">أخبرني بأعراضك وسأقوم بتحليلها فوراً</p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 custom-scrollbar">
                            {chatMessages.map((message, index) => (
                                <div key={index} className={`mb-4 flex ${message.role === 'ai' ? 'justify-start' : 'justify-end'}`}>
                                    <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${message.role === 'ai'
                                        ? 'bg-white text-gray-800 rounded-tr-none border border-gray-100'
                                        : 'bg-purple-600 text-white rounded-tl-none'
                                        }`}>
                                        <div className="flex items-center gap-2 mb-1 opacity-70 text-xs font-bold uppercase tracking-wider">
                                            {message.role === 'ai' ? <Brain className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                            {message.role === 'ai' ? 'المساعد الذكي' : 'أنت'}
                                        </div>
                                        <p className="leading-relaxed text-sm md:text-base">{message.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={currentMessage}
                                    onChange={(e) => setCurrentMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="اكتب ما تشعر به هنا..."
                                    className="flex-1 px-4 py-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 transition-all text-right shadow-sm"
                                />
                                <Button
                                    onClick={handleSendMessage}
                                    disabled={!currentMessage.trim()}
                                    className="px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200"
                                >
                                    <Send className="w-5 h-5 transform rotate-180" />
                                </Button>
                            </div>
                            <div className="text-center mt-3">
                                <Button variant="ghost" size="sm" onClick={() => setStep(3)} className="text-xs text-gray-400 hover:text-red-500">
                                    إنهاء التشخيص وعرض النتائج
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Smart Diagnosis Interface */}
                {!isAI && step === 1 && (
                    <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 animate-in fade-in zoom-in-95 duration-300">
                        <div className="text-center mb-10">
                            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4 transform rotate-3">
                                <Stethoscope className="w-8 h-8 text-purple-600" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-2">ما هي شكواك الرئيسية؟</h2>
                            <p className="text-gray-600">اختر العرض الأكثر تطابقاً مع حالتك</p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {commonConditions.map((condition) => (
                                <button
                                    key={condition.id}
                                    className="group p-4 rounded-2xl border-2 border-gray-100 bg-white hover:border-purple-200 hover:bg-purple-50 hover:shadow-lg transition-all duration-300 flex flex-col items-center gap-3"
                                    onClick={() => handleConditionSelect(condition.id)}
                                >
                                    <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-500 group-hover:bg-purple-200 group-hover:text-purple-800 flex items-center justify-center transition-colors">
                                        <condition.icon className="w-6 h-6" />
                                    </div>
                                    <span className="font-bold text-sm text-gray-700 group-hover:text-purple-900">
                                        {condition.title}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {!isAI && step === 2 && (
                    <div className="bg-white rounded-3xl shadow-2xl p-8 border border-t-4 border-t-purple-600 relative overflow-hidden animate-in slide-in-from-right duration-300">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                سؤال {currentQuestionId === 0 ? 'رئيسي' : currentQuestionId + 1}
                            </span>
                            <div className="flex gap-1">
                                {[0, 1].map((s) => (
                                    <div
                                        key={s}
                                        className={`h-1.5 rounded-full transition-all duration-500 ${s <= currentQuestionId ? 'w-8 bg-purple-600' : 'w-4 bg-gray-200'}`}
                                    />
                                ))}
                            </div>
                        </div>

                        {(() => {
                            const currentQuestion = currentQuestionId === 0
                                ? questionTree.main_question
                                : questionTree[selectedCondition as keyof typeof questionTree];

                            if (!currentQuestion) return <div className="text-center py-10">جاري تحليل البيانات...</div>;

                            return (
                                <div className="text-center">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-8 leading-normal">
                                        {currentQuestion.question}
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        {currentQuestion.options?.map((option) => (
                                            <button
                                                key={option.id}
                                                className="w-full p-4 rounded-xl border-2 border-gray-100 hover:border-purple-300 hover:bg-purple-50 text-right transition-all duration-200 flex items-center justify-between group"
                                                onClick={() => handleAnswerSelect(option.id)}
                                            >
                                                <span className="font-semibold text-gray-700 group-hover:text-purple-900">
                                                    {option.text}
                                                </span>
                                                <div className="w-6 h-6 rounded-full border-2 border-gray-300 group-hover:border-purple-400 flex items-center justify-center">
                                                    {userResponses[currentQuestionId] === option.id && <CheckCircle className="w-4 h-4 text-purple-600" />}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* Results Page (Shared) */}
                {step === 3 && (
                    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
                        <div className="bg-green-500 p-8 text-center text-white relative">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl border border-white/20">
                                <CheckCircle className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-2xl font-black mb-1">تم اكتمال التشخيص</h2>
                            <p className="text-green-100">إليك التقرير الطبي المبدئي</p>
                        </div>

                        <div className="p-8">
                            <div className="space-y-6 mb-8">
                                <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                                    <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                                        <div className="w-1.5 h-5 bg-blue-500 rounded-full"></div>
                                        ملخص الحالة
                                    </h3>
                                    <p className="text-gray-700 text-sm leading-relaxed">
                                        بناءً على الإجابات، يبدو أن هناك اشتباه في {selectedCondition === 'tooth_pain' ? 'التهاب عصب' : 'مشكلة باللثة'}، ينصح بزيارة الطبيب للتأكد.
                                    </p>
                                </div>

                                <div className="bg-orange-50/50 p-5 rounded-2xl border border-orange-100">
                                    <h3 className="font-bold text-orange-900 mb-3 flex items-center gap-2">
                                        <div className="w-1.5 h-5 bg-orange-500 rounded-full"></div>
                                        توصيات
                                    </h3>
                                    <ul className="space-y-2">
                                        <li className="flex items-start gap-2 text-sm text-gray-700">
                                            <CheckCircle className="w-4 h-4 text-orange-500 mt-0.5" />
                                            زيارة الطبيب في أقرب وقت.
                                        </li>
                                        <li className="flex items-start gap-2 text-sm text-gray-700">
                                            <CheckCircle className="w-4 h-4 text-orange-500 mt-0.5" />
                                            استخدام مسكن عند الضرورة القصوى.
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <Button
                                    size="lg"
                                    className="w-full bg-gray-900 hover:bg-black text-white rounded-xl py-4 shadow-lg"
                                    onClick={() => navigate('/booking')}
                                >
                                    <CalendarIcon className="w-5 h-5 ml-2" />
                                    حجز موعد مع طبيب
                                </Button>
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="w-full rounded-xl py-4"
                                    onClick={resetDiagnosis}
                                >
                                    <RefreshCw className="w-5 h-5 ml-2" />
                                    إجراء فحص جديد
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
