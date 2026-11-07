import React, { useState } from 'react';
import { ArrowRight, Heart, CheckCircle, ChevronDown, ChevronUp, AlertTriangle, Zap, Shield, Stethoscope, Phone, Award, Info } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useEmergencyHotline } from '../../hooks/useEmergencyHotline';

interface FirstAidStep {
  id: number;
  text: string;
  completed: boolean;
}

interface FirstAidCardProps {
  title: string;
  icon: React.ReactNode;
  description: string;
  severity: 'critical' | 'urgent' | 'normal';
  steps: FirstAidStep[];
  onStepsChange: (steps: FirstAidStep[]) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

const FirstAidCard: React.FC<FirstAidCardProps> = ({
  title,
  icon,
  description,
  severity,
  steps,
  onStepsChange,
  isExpanded,
  onToggle
}) => {
  const handleStepToggle = (stepId: number) => {
    const updatedSteps = steps.map(step =>
      step.id === stepId
        ? { ...step, completed: !step.completed }
        : step
    );
    onStepsChange(updatedSteps);
  };

  const completionPercentage = Math.round((steps.filter(step => step.completed).length / steps.length) * 100);

  const severityStyles = {
    critical: {
      border: 'border-red-100',
      bg: 'bg-red-50',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      progress: 'bg-red-500'
    },
    urgent: {
      border: 'border-orange-100',
      bg: 'bg-orange-50',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      progress: 'bg-orange-500'
    },
    normal: {
      border: 'border-blue-100',
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      progress: 'bg-blue-500'
    }
  };

  const currentStyle = severityStyles[severity];

  return (
    <div className={`group relative bg-white rounded-2xl border ${isExpanded ? 'border-blue-200 ring-2 ring-blue-50' : 'border-gray-200'} transition-all duration-300 hover:shadow-md overflow-hidden`}>
      <div
        className="p-3.5 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${currentStyle.iconBg} ${currentStyle.iconColor} transition-transform duration-300 group-hover:scale-105`}>
              {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-0.5 group-hover:text-blue-600 transition-colors">{title}</h3>
              <p className="text-gray-500 text-xs mb-1.5 font-medium">{description}</p>

              {/* Progress Status */}
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${currentStyle.progress}`}
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
                <span className="text-[11px] font-bold text-gray-500">{completionPercentage}% مكتمل</span>
              </div>
            </div>
          </div>

          <button className={`w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors ${isExpanded ? 'rotate-180 bg-gray-50' : ''}`}>
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      <div className={`grid transition-all duration-300 ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="px-3.5 pb-3.5 pt-0">
            <div className="h-px w-full bg-gray-100 mb-3"></div>

            <h4 className="flex items-center gap-1.5 text-xs font-bold text-gray-900 uppercase tracking-wider mb-2.5">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              خطوات التعامل
            </h4>

            <div className="space-y-2">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  onClick={() => handleStepToggle(step.id)}
                  className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all duration-200 cursor-pointer ${step.completed
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white border-gray-100 hover:border-blue-200 hover:bg-blue-50/30'
                    }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors ${step.completed
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'bg-transparent border-gray-300 text-gray-400'
                    }`}>
                    {step.completed ? <CheckCircle className="w-3 h-3" /> : <span className="text-[10px] font-bold">{index + 1}</span>}
                  </div>
                  <p className={`text-xs font-medium transition-colors ${step.completed ? 'text-green-800 line-through opacity-75' : 'text-gray-700'}`}>
                    {step.text}
                  </p>
                </div>
              ))}
            </div>

            <div className={`mt-3 p-2.5 rounded-lg flex items-start gap-2.5 ${currentStyle.bg} border ${currentStyle.border}`}>
              <Info className={`w-4 h-4 flex-shrink-0 mt-0.5 ${currentStyle.iconColor}`} />
              <div>
                <p className={`text-xs font-bold ${currentStyle.iconColor} mb-0.5`}>نصيحة طبية</p>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  هذه الخطوات للإسعاف الأولي فقط. يجب زيارة الطبيب في أقرب وقت لتقييم الحالة بشكل كامل وتلقي العلاج المناسب.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FirstAidGuidePage: React.FC = () => {
  const navigate = useNavigate();
  const { hotline } = useEmergencyHotline();
  const [expandedCard, setExpandedCard] = useState<string | null>('toothache'); // Default expand first one
  const [stepsData, setStepsData] = useState<{ [key: string]: FirstAidStep[] }>({
    toothache: [
      { id: 1, text: 'اشطف فمك بماء دافئ مالح لتطهير المنطقة.', completed: false },
      { id: 2, text: 'تناول مسكن للألم (مثل الإيبوبروفين) حسب التعليمات.', completed: false },
      { id: 3, text: 'استخدم خيط الأسنان بلطف لإزالة أي طعام عالق.', completed: false },
      { id: 4, text: 'ضع كمادة باردة على الوجه من الخارج لتقليل التورم.', completed: false },
    ],
    brokenTooth: [
      { id: 1, text: 'اجمع أي أجزاء مكسورة من السن واحفظها.', completed: false },
      { id: 2, text: 'اشطف فمك وأجزاء السن بماء دافئ.', completed: false },
      { id: 3, text: 'إذا كان هناك نزيف، اضغط بقطعة شاش نظيفة.', completed: false },
      { id: 4, text: 'توجه لطبيب الأسنان فوراً.', completed: false },
    ],
    bleeding: [
      { id: 1, text: 'اغسل يديك جيداً قبل لمس الفم.', completed: false },
      { id: 2, text: 'اشطف فمك بماء بارد لإبطاء تدفق الدم.', completed: false },
      { id: 3, text: 'عض على قطعة شاش نظيفة أو كيس شاي مبلل لمدة 15-20 دقيقة.', completed: false },
      { id: 4, text: 'تجنب المضمضة العنيفة أو البصق.', completed: false },
    ],
    swelling: [
      { id: 1, text: 'اجلس مع إبقاء رأسك مرفوعاً.', completed: false },
      { id: 2, text: 'ضع كمادة باردة على منطقة التورم (20 دقيقة وضع، 20 دقيقة راحة).', completed: false },
      { id: 3, text: 'اشطف فمك بماء دافئ وملح بحري.', completed: false },
      { id: 4, text: 'لا تضع الحرارة المباشرة على الوجه.', completed: false },
    ],
    knockedOutTooth: [
      { id: 1, text: 'أمسك السن من التاج (الجزء العلوي) ولا تلمس الجذر.', completed: false },
      { id: 2, text: 'إذا كان متسخاً، اشطفه بماء فاتر فقط (لا تفركه).', completed: false },
      { id: 3, text: 'حاول إعادة السن إلى مكانه في اللثة بلطف وعض على شاش.', completed: false },
      { id: 4, text: 'إذا لم تستطع، احفظ السن في كوب من الحليب البارد.', completed: false },
      { id: 5, text: 'هذه حالة طارئة جداً! اذهب للطبيب خلال 30 دقيقة.', completed: false },
    ],
    abscess: [
      { id: 1, text: 'مضمض بمحلول ملحي دافئ عدة مرات يومياً.', completed: false },
      { id: 2, text: 'لا تحاول فتح الخراج بنفسك.', completed: false },
      { id: 3, text: 'تناول مسكنات الألم عند الضرورة.', completed: false },
      { id: 4, text: 'حدد موعداً مع الطبيب فوراً لعلاج العدوى.', completed: false },
    ]
  });

  const firstAidCases = [
    {
      id: 'toothache',
      title: 'ألم الأسنان الحاد',
      icon: <Zap />,
      description: 'ألم مستمر أو نابض في الأسنان أو الفك.',
      severity: 'normal' as const,
      category: 'الألم والانزعاج'
    },
    {
      id: 'brokenTooth',
      title: 'كسر الأسنان',
      icon: <AlertTriangle />,
      description: 'تكسر أو تشقق جزء من السن.',
      severity: 'urgent' as const,
      category: 'الإصابات'
    },
    {
      id: 'bleeding',
      title: 'نزيف اللثة أو الفم',
      icon: <Heart />,
      description: 'نزيف مستمر بعد خلع أو إصابة.',
      severity: 'urgent' as const,
      category: 'النزيف'
    },
    {
      id: 'swelling',
      title: 'تورم الوجه',
      icon: <Shield />,
      description: 'انتفاخ في الخد أو اللثة قد يشير لالتهاب.',
      severity: 'urgent' as const,
      category: 'الألم والانزعاج'
    },
    {
      id: 'knockedOutTooth',
      title: 'سقوط السن (Avulsion)',
      icon: <Award />, // Using Award for "Golden Hour" importance? Or maybe Clock. Staying with generic for now.
      description: 'خروج السن الدائم بالكامل من مكانه.',
      severity: 'critical' as const,
      category: 'الإصابات'
    },
    {
      id: 'abscess',
      title: 'خراج الأسنان',
      icon: <Stethoscope />,
      description: 'تجمع صديدي مؤلم ناتج عن عدوى بكتيرية.',
      severity: 'critical' as const,
      category: 'العدوى'
    }
  ];

  const categories = [...new Set(firstAidCases.map(item => item.category))];

  const handleStepsChange = (caseId: string, newSteps: FirstAidStep[]) => {
    setStepsData(prev => ({
      ...prev,
      [caseId]: newSteps
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans" dir="rtl">
      <Helmet>
        <title>دليل الإسعافات الأولية لطوارئ الأسنان | Dental Platform</title>
        <meta name="description" content="إرشادات وخطوات عملية للتعامل الفوري مع آلام الأسنان الحادة، الكسور، والنزيف المفاجئ." />
        <link rel="canonical" href="https://dental-platform.com/emergency/first-aid" />
        <meta property="og:title" content="دليل الإسعافات الأولية لطوارئ الأسنان | Dental Platform" />
        <meta property="og:description" content="إرشادات وخطوات عملية للتعامل الفوري مع آلام الأسنان الحادة، الكسور، والنزيف المفاجئ." />
        <meta property="og:url" content="https://dental-platform.com/emergency/first-aid" />
      </Helmet>

      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 md:py-5">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/services#tab-emergency')} className="text-gray-500 hover:text-gray-900 h-7 px-2 text-xs">
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
                عودة
              </Button>
              <div className="h-3.5 w-px bg-gray-200"></div>
              <span className="text-xs font-medium text-blue-600">مركز الطوارئ</span>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex-1">
                <h1 className="text-xl md:text-2xl font-black text-gray-900 mb-1 leading-tight">
                  دليل <span className="text-transparent bg-clip-text bg-gradient-to-l from-blue-600 to-cyan-500">الإسعافات الأولية</span>
                </h1>
                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                  دليل تفاعلي وسريع لمساعدتك في التعامل مع حالات طوارئ الأسنان الشائعة خطوة بخطوة حتى وصولك للطبيب.
                </p>

                <div className="flex gap-2">
                  <Button onClick={() => window.scrollTo({ top: 300, behavior: 'smooth' })} className="rounded-lg px-4 py-1.5 text-xs h-8">
                    بدء الدليل
                  </Button>
                  <Button variant="outline" className="rounded-lg px-4 py-1.5 text-xs h-8" onClick={() => navigate('/emergency/centers')}>
                    أقرب مركز طوارئ
                  </Button>
                </div>
              </div>

              {/* Quick Stats/Tip */}
              <div className="w-full md:w-56 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-3 border border-blue-100 flex items-center justify-between md:block">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-xs">طوارئ 24/7</h3>
                  </div>
                  <p className="text-[11px] text-gray-600 md:mb-2">
                    في الحالات الحرجة اتصل بالإسعاف فوراً
                  </p>
                </div>
                <a href={`tel:${hotline}`} className="block">
                  <div className="text-lg font-black text-blue-600 hover:text-blue-700 transition-colors">{hotline}</div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4">
        <div className="max-w-4xl mx-auto space-y-5">
          {categories.map((category) => (
            <section key={category}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1 h-5 bg-blue-500 rounded-full"></span>
                <h2 className="text-lg font-bold text-gray-900">{category}</h2>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {firstAidCases.filter(item => item.category === category).map((caseItem) => (
                  <FirstAidCard
                    key={caseItem.id}
                    title={caseItem.title}
                    icon={caseItem.icon}
                    description={caseItem.description}
                    severity={caseItem.severity}
                    steps={stepsData[caseItem.id] || []}
                    onStepsChange={(newSteps) => handleStepsChange(caseItem.id, newSteps)}
                    isExpanded={expandedCard === caseItem.id}
                    onToggle={() => setExpandedCard(expandedCard === caseItem.id ? null : caseItem.id)}
                  />
                ))}
              </div>
            </section>
          ))}

          {/* Disclaimer Card */}
          <div className="bg-gray-900 rounded-2xl p-5 md:p-6 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500 rounded-full blur-[80px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10">
              <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <h3 className="text-base font-bold mb-1.5">إخلاء مسؤولية</h3>
              <p className="text-gray-300 text-xs max-w-2xl mx-auto mb-4 leading-relaxed">
                المعلومات الواردة في هذا الدليل هي للإرشاد الأولي فقط ولا تغني بأي حال من الأحوال عن استشارة طبيب الأسنان المختص. نحن لسنا مسؤولين عن أي مضاعفات قد تنتج عن اتباع هذه النصائح.
              </p>
              <Button
                onClick={() => navigate('/emergency/centers')}
                className="bg-white text-gray-900 hover:bg-gray-100 border-none font-bold px-5 py-2 text-xs h-8 rounded-lg"
              >
                البحث عن طبيب الآن
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
