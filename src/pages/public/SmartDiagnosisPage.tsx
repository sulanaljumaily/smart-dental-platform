import React, { useState } from 'react';
import {
  Brain,
  Stethoscope,
  Camera,
  AlertTriangle,
  FileText,
  Zap,
  ChevronRight,
  CheckCircle,
  Clock,
  Star,
  MessageCircle,
  User,
  MapPin,
  Calendar,
  Heart,
  Shield,
  Phone,
  Navigation,
  Filter,
  TrendingUp,
  Award,
  Users
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Link } from 'react-router-dom';
// import { ClinicRecommendationsContainer } from '../../components/clinic/ClinicRecommendationsContainer';
// import { getRecommendedClinics } from '../../utils/clinicRecommendation';

export const SmartDiagnosisPage: React.FC = () => {
  const [selectedMethod, setSelectedMethod] = useState<'ai' | 'smart'>('ai');
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [diagnosisComplete, setDiagnosisComplete] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('');
  const [userResponses, setUserResponses] = useState<{ [key: number]: string }>({});
  const [showClinics, setShowClinics] = useState(false);
  const [currentQuestionId, setCurrentQuestionId] = useState(0);

  // شجرة الأسئلة الحقيقية للتشخيص الذكي
  const questionTree = {
    main_question: {
      id: 0,
      question: "ماذا تعاني حالياً؟",
      type: "single_choice",
      options: [
        { id: "tooth_pain", text: "ألم في الأسنان", next: "pain" },
        { id: "gum_bleeding", text: "نزيف اللثة", next: "gum" },
        { id: "cavities", text: "تسوس في الأسنان", next: "decay" },
        { id: "sensitivity", text: "حساسية الأسنان", next: "sensitivity" },
        { id: "bad_breath", text: "رائحة الفم", next: "breath" },
        { id: "cracks", text: "تشققات الأسنان", next: "cracks" }
      ]
    },
    pain: {
      id: 1,
      question: "ما نوع الألم الذي تشعر به؟",
      type: "single_choice",
      options: [
        { id: "sharp_pain", text: "ألم حاد ومفاجئ", next: "pain_severity" },
        { id: "dull_pain", text: "ألم مستمر وباهت", next: "pain_severity" },
        { id: "throbbing", text: "ألم نابض", next: "pain_severity" },
        { id: "aching", text: "ألم خفيف", next: "pain_severity" }
      ]
    },
    gum: {
      id: 1,
      question: "متى يحدث نزيف اللثة؟",
      type: "single_choice",
      options: [
        { id: "brushing", text: "عند تنظيف الأسنان", next: "gum_severity" },
        { id: "spontaneous", text: "بشكل تلقائي", next: "gum_severity" },
        { id: "eating", text: "عند تناول الطعام", next: "gum_severity" },
        { id: "rarely", text: "نادراً", next: "gum_severity" }
      ]
    },
    decay: {
      id: 1,
      question: "هل تشعر بألم عند تناول الحلويات أو المشروبات الباردة؟",
      type: "single_choice",
      options: [
        { id: "yes", text: "نعم، أشعر بألم شديد", next: "decay_severity" },
        { id: "sometimes", text: "أحياناً", next: "decay_severity" },
        { id: "no", text: "لا، لا أشعر بألم", next: "decay_severity" },
        { id: "hot_cold", text: "ألم مع الساخن والبارد", next: "decay_severity" }
      ]
    },
    sensitivity: {
      id: 1,
      question: "ما الأطعمة التي تسبب الحساسية؟",
      type: "multiple_choice",
      options: [
        { id: "cold", text: "الأطعمة والمشروبات الباردة", next: "sensitivity_severity" },
        { id: "hot", text: "الأطعمة والمشروبات الساخنة", next: "sensitivity_severity" },
        { id: "sweet", text: "الأطعمة الحلوة", next: "sensitivity_severity" },
        { id: "acidic", text: "الأطعمة الحمضية", next: "sensitivity_severity" }
      ]
    },
    breath: {
      id: 1,
      question: "كم من الوقت تستمر رائحة الفم؟",
      type: "single_choice",
      options: [
        { id: "morning", text: "فقط في الصباح", next: "breath_severity" },
        { id: "all_day", text: "طوال اليوم", next: "breath_severity" },
        { id: "after_food", text: "بعد تناول الطعام", next: "breath_severity" },
        { id: "occasional", text: "من وقت لآخر", next: "breath_severity" }
      ]
    },
    cracks: {
      id: 1,
      question: "أين توجد التشققات؟",
      type: "single_choice",
      options: [
        { id: "front_teeth", text: "الأسنان الأمامية", next: "cracks_severity" },
        { id: "back_teeth", text: "الأسنان الخلفية", next: "cracks_severity" },
        { id: "multiple", text: "عدة أسنان", next: "cracks_severity" },
        { id: "unknown", text: "لست متأكد", next: "cracks_severity" }
      ]
    },
    // أسئلة تحديد شدة الحالة
    pain_severity: {
      id: 2,
      question: "ماذا عن شدة الألم؟",
      type: "single_choice",
      options: [
        { id: "severe", text: "شديد جداً - لا أستطيع النوم", next: "duration" },
        { id: "moderate", text: "متوسط - يمكنني التحمل", next: "duration" },
        { id: "mild", text: "خفيف - مسموح", next: "duration" }
      ]
    },
    gum_severity: {
      id: 2,
      question: "هل توجد أعراض أخرى؟",
      type: "single_choice",
      options: [
        { id: "swollen", text: "تورم اللثة", next: "duration" },
        { id: "red", text: "احمرار اللثة", next: "duration" },
        { id: "pain", text: "ألم في اللثة", next: "duration" },
        { id: "none", text: "لا توجد أعراض أخرى", next: "duration" }
      ]
    },
    decay_severity: {
      id: 2,
      question: "هل يمكنك رؤية أي تشققات أو ثقوب في الأسنان؟",
      type: "single_choice",
      options: [
        { id: "visible", text: "نعم، يمكنني رؤية تشققات واضحة", next: "duration" },
        { id: "black_spot", text: "نقطة سوداء صغيرة", next: "duration" },
        { id: "rough", text: "سن خشن", next: "duration" },
        { id: "no_visual", text: "لا أرى شيئاً", next: "duration" }
      ]
    },
    sensitivity_severity: {
      id: 2,
      question: "متى بدأ هذا الشعور؟",
      type: "single_choice",
      options: [
        { id: "recent", text: "مؤخراً (أقل من شهر)", next: "duration" },
        { id: "weeks", text: "منذ أسابيع", next: "duration" },
        { id: "months", text: "منذ شهور", next: "duration" },
        { id: "gradual", text: "تدريجياً على المدى الطويل", next: "duration" }
      ]
    },
    breath_severity: {
      id: 2,
      question: "هل جربت طرق للتنظيف ولم تنجح؟",
      type: "single_choice",
      options: [
        { id: "brushes", text: "نعم، أستخدم فرشاة ومعجون", next: "duration" },
        { id: "mouthwash", text: "نعم، غسول الفم", next: "duration" },
        { id: "dental_floss", text: "نعم، خيط الأسنان", next: "duration" },
        { id: "nothing", text: "لم أجرب أي شيء", next: "duration" }
      ]
    },
    cracks_severity: {
      id: 2,
      question: "هل تشعر بألم مع التشققات؟",
      type: "single_choice",
      options: [
        { id: "yes_painful", text: "نعم، مؤلمة جداً", next: "duration" },
        { id: "sensitive", text: "حساسة فقط", next: "duration" },
        { id: "rough_feel", text: "خشونة في اللسان", next: "duration" },
        { id: "no_feeling", text: "لا أشعر بأي شيء", next: "duration" }
      ]
    },
    // أسئلة المدة
    duration: {
      id: 3,
      question: "منذ متى وأنت تعاني من هذه المشكلة؟",
      type: "single_choice",
      options: [
        { id: "days", text: "أيام قليلة", next: "treatment_plan" },
        { id: "weeks", text: "أسبوع إلى أسبوعين", next: "treatment_plan" },
        { id: "months", text: "شهر إلى 3 أشهر", next: "treatment_plan" },
        { id: "over_months", text: "أكثر من 3 أشهر", next: "treatment_plan" }
      ]
    }
  };

  // خريطة الربط للأسئلة المتعددة
  const getNextQuestion = (currentId: string, selectedOptionId: string) => {
    const currentQuestion = questionTree[currentId as keyof typeof questionTree];
    if (currentQuestion && currentQuestion.options) {
      const selectedOption = currentQuestion.options.find(opt => opt.id === selectedOptionId);
      return selectedOption?.next || null;
    }
    return null;
  };
  const [recommendedClinics] = useState([
    {
      id: 1,
      name: 'مركز الأسنان المتقدم',
      rating: 4.8,
      distance: '2.3 كم',
      location: 'الرياض - العليا',
      specialties: ['علاج الجذور', 'تقويم الأسنان', 'زراعة الأسنان'],
      isActive: true,
      hasAppointment: true,
      waitTime: '30 دقيقة'
    },
    {
      id: 2,
      name: 'عيادة الاسنان الذكية',
      rating: 4.6,
      distance: '3.1 كم',
      location: 'الرياض - الملقا',
      specialties: ['علاج تسوس الأسنان', 'تنظيف الأسنان', 'تيجان وجسور'],
      isActive: true,
      hasAppointment: true,
      waitTime: '15 دقيقة'
    },
    {
      id: 3,
      name: 'مجمع الرعاية السنية',
      rating: 4.7,
      distance: '4.2 كم',
      location: 'الرياض - الملز',
      specialties: ['جراحة الفم', 'علاج اللثة', 'طب الأطفال'],
      isActive: true,
      hasAppointment: false,
      waitTime: '45 دقيقة'
    }
  ]);

  const diagnosticMethods = [
    {
      id: 'ai',
      title: 'التشخيص بالمحادثة مع الوكيل',
      icon: MessageCircle,
      description: 'محادثة تفاعلية مع الوكيل الذكي للحصول على تشخيص شامل',
      features: [
        'محادثة طبيعية مع الوكيل',
        'أسئلة ذكية ومتسلسلة',
        'تحليل فوري للمشكلة',
        'توصيات مخصصة'
      ],
      duration: '3-5 دقائق',
      accuracy: '90%'
    },
    {
      id: 'smart',
      title: 'التشخيص الذكي (أسئلة متتالية)',
      icon: Stethoscope,
      description: 'تشخيص منظم عبر أسئلة متسلسلة تبدأ بـ "ماذا تعاني"',
      features: [
        'أسئلة منظمة ومتتالية',
        'بداية بـ "ماذا تعاني"',
        'تحديد دقيق للمشكلة',
        'اقتراح علاج أو زيارة عيادة'
      ],
      duration: '5-8 دقائق',
      accuracy: '85%'
    }
  ];

  const commonConditions = [
    { id: 'pain', title: 'ألم في الأسنان', icon: AlertTriangle },
    { id: 'decay', title: 'تسوس الأسنان', icon: Shield },
    { id: 'gums', title: 'مشاكل اللثة', icon: Heart },
    { id: 'sensitivity', title: 'حساسية الأسنان', icon: TrendingUp },
    { id: 'bad_breath', title: 'رائحة الفم الكريهة', icon: Filter },
    { id: 'stains', title: 'تصبغات وبقع', icon: Star },
    { id: 'crowding', title: 'ازدحام الأسنان', icon: Users },
    { id: 'orthodontic', title: 'احتياج تقويم', icon: Award }
  ];

  const handleMethodSelect = (methodId: 'ai' | 'smart') => {
    setSelectedMethod(methodId);
    if (methodId === 'ai') {
      // بدء المحادثة مع الوكيل
      setChatMessages([{
        role: 'ai',
        content: 'مرحباً! أنا مساعدك الذكي للتشخيص. يرجى إخباري بما تشعر به في أسنانك.'
      }]);
    }
    setCurrentStep(2);
  };

  const handleSendMessage = () => {
    if (currentMessage.trim()) {
      setChatMessages(prev => [...prev, {
        role: 'user',
        content: currentMessage
      }]);

      // محاكاة رد الذكاء الاصطناعي
      setTimeout(() => {
        const aiResponse = generateAIResponse(currentMessage);
        setChatMessages(prev => [...prev, {
          role: 'ai',
          content: aiResponse
        }]);
      }, 1000);

      setCurrentMessage('');
    }
  };

  const generateAIResponse = (userMessage: string) => {
    const responses = {
      'ألم': 'يبدو أنك تشعر بألم في أسنانك. هل يمكن أن تصف لي طبيعة الألم؟ هل هو حاد أم مستمر؟ ومتى تشعر به أكثر؟',
      'تسوس': 'التسوس مشكلة شائعة. هل تشعر بألم عند تناول الحلويات أو المشروبات الباردة؟',
      'لثة': 'مشاكل اللثة تتطلب عناية. هل تنزف اللثة عند تنظيف الأسنان؟',
      'حساسية': 'حساسية الأسنان يمكن أن تكون مؤلمة. هل تشعر بالألم عند تناول الأطعمة الساخنة أو الباردة؟'
    };

    const keys = Object.keys(responses);
    for (const key of keys) {
      if (userMessage.includes(key)) {
        return responses[key as keyof typeof responses];
      }
    }

    return 'شكراً لك على المعلومات. هل يمكنك إخباري بمزيد من التفاصيل حول المشكلة التي تواجهها؟';
  };

  const handleConditionSelect = (conditionId: string) => {
    setSelectedCondition(conditionId);

    // بدء نظام الأسئلة المتتالية
    if (selectedMethod === 'smart') {
      setCurrentStep(3);
      setCurrentQuestionId(0); // السؤال الرئيسي

      // حفظ إجابة السؤال الرئيسي
      setUserResponses({ 0: conditionId });
    } else {
      setCurrentStep(3);
    }
  };

  const handleResponseSelect = (questionId: number, response: string) => {
    // حفظ الإجابة
    setUserResponses(prev => ({
      ...prev,
      [questionId]: response
    }));

    // تحديد السؤال التالي
    if (selectedMethod === 'smart' && selectedCondition) {
      const currentQuestion = questionTree[selectedCondition as keyof typeof questionTree];
      if (currentQuestion && questionId < 3) {
        const selectedOption = currentQuestion.options?.find(opt => opt.id === response);
        const nextQuestionId = selectedOption?.next;

        if (nextQuestionId && nextQuestionId !== 'treatment_plan') {
          setCurrentQuestionId(currentQuestionId + 1);
        } else {
          // انتهت الأسئلة، قارن التشخيص
          const diagnosis = generateSmartDiagnosis();

          setCurrentStep(4); // الانتقال لنتائج التشخيص
        }
      }
    }
  };

  // دالة توليد التشخيص الذكي بناءً على الإجابات
  const generateSmartDiagnosis = () => {
    const diagnosis = {
      condition: selectedCondition,
      severity: 'مجهول',
      recommendations: [] as string[],
      urgency: 'عادي',
      treatment_plan: '',
      clinic_type: ''
    };

    // تحليل الإجابات لتحديد الشدة
    if (userResponses[1]) {
      const severity = userResponses[1];
      if (severity.includes('شديد') || severity.includes('severe')) {
        diagnosis.severity = 'عالي';
        diagnosis.urgency = 'عاجل';
      } else if (severity.includes('متوسط') || severity.includes('moderate')) {
        diagnosis.severity = 'متوسط';
        diagnosis.urgency = 'معتدل';
      } else {
        diagnosis.severity = 'منخفض';
        diagnosis.urgency = 'عادي';
      }
    }

    // تحديد خطة العلاج بناءً على الحالة
    switch (selectedCondition) {
      case 'tooth_pain':
        diagnosis.treatment_plan = 'فحص شامل للسن المؤلم + أبيضات إذا لزم الأمر';
        diagnosis.clinic_type = 'علاج وإصلاح الأسنان';
        diagnosis.recommendations.push('زيارة عيادة خلال 24-48 ساعة');
        diagnosis.recommendations.push('تجنب الأطعمة الباردة والساخنة');
        break;
      case 'gum_bleeding':
        diagnosis.treatment_plan = 'تنظيف اللثة + فحص إضافي';
        diagnosis.clinic_type = 'علاج أمراض اللثة';
        diagnosis.recommendations.push('تنظيف مهني خلال أسبوع');
        diagnosis.recommendations.push('استخدام خيط الأسنان يومياً');
        break;
      case 'cavities':
        diagnosis.treatment_plan = 'حشوة السن المتضرر';
        diagnosis.clinic_type = 'علاج التسوس';
        diagnosis.recommendations.push('حشو السن خلال أسبوع');
        diagnosis.recommendations.push('تجنب الحلويات');
        break;
      case 'sensitivity':
        diagnosis.treatment_plan = 'استخدام معجون أسنان للحساسية + فلورايد';
        diagnosis.clinic_type = 'علاج حساسية الأسنان';
        diagnosis.recommendations.push('تجنب الأطعمة الحمضية والحلوة');
        diagnosis.recommendations.push('استخدام فرشاة ناعمة');
        break;
      case 'bad_breath':
        diagnosis.treatment_plan = 'تنظيف عميق + فحص أسباب الجيوب الأنفية';
        diagnosis.clinic_type = 'طب الفم والوجه والفكين';
        diagnosis.recommendations.push('فحص شامل خلال أسبوع');
        diagnosis.recommendations.push('غسول فم مضاد للبكتيريا');
        break;
      case 'cracks':
        diagnosis.treatment_plan = 'تيجان أو قشور إذا لزم الأمر';
        diagnosis.clinic_type = 'تجميل الأسنان';
        diagnosis.recommendations.push('فحص شامل لتحديد العلاج');
        diagnosis.recommendations.push('تجنب مضغ الأبواق الصلبة');
        break;
    }

    return diagnosis;
  };

  const showQuickTreatment = () => {
    setShowClinics(true);
  };

  const getClinicRecommendation = () => {
    if (selectedCondition && userResponses[1]) {
      const severity = userResponses[1] === 'نعم' ? 'عالي' : userResponses[1] === 'أحياناً' ? 'متوسط' : 'منخفض';

      if (severity === 'عالي' || selectedCondition === 'pain') {
        return 'يوصى بزيارة عيادة الأسنان خلال 24-48 ساعة';
      } else if (severity === 'متوسط') {
        return 'يمكن جدولة موعد خلال أسبوع واحد';
      } else {
        return 'يمكن انتظار موعد عادي خلال أسبوعين';
      }
    }
    return 'يرجى إكمال الأسئلة للحصول على توصية دقيقة';
  };

  const handleDiagnosisStart = async () => {
    setIsProcessing(true);

    // محاكاة معالجة التشخيص بناءً على الطريقة المختارة
    const processingSteps = selectedMethod === 'ai'
      ? ['تحليل المحادثة...', 'فهم المشكلة...', 'مقارنة الأعراض...', 'إنشاء التوصيات...']
      : ['معالجة الإجابات...', 'تحليل الأعراض...', 'مطابقة الحالات...', 'إنشاء التقرير...'];

    for (let i = 0; i < processingSteps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    setIsProcessing(false);
    setDiagnosisComplete(true);
  };

  const saveDiagnosis = () => {
    // حفظ التشخيص في التخزين المحلي للمتصفح
    const diagnosisResult = {
      id: Date.now().toString(),
      method: selectedMethod,
      date: new Date().toISOString(),
      condition: selectedCondition,
      responses: userResponses,
      results: {
        healthyTeeth: 28,
        needingTreatment: 2,
        missingTeeth: 2,
        gumHealth: 'جيد',
        painLevel: selectedMethod === 'ai' ? 'خفيف' : 'متوسط',
        recommendations: [
          'حجز موعد للفحص الدوري',
          'علاج السن 16 (تسوس طفيف)',
          'تنظيف مهني للأسنان'
        ]
      }
    };

    // حفظ في localStorage
    const existingDiagnoses = JSON.parse(localStorage.getItem('smartDiagnoses') || '[]');
    existingDiagnoses.unshift(diagnosisResult);
    localStorage.setItem('smartDiagnoses', JSON.stringify(existingDiagnoses.slice(0, 10))); // الاحتفاظ بآخر 10 تشخيصات فقط


    alert('تم حفظ نتائج التشخيص في متصفحك بنجاح! يمكنك الرجوع إليها لاحقاً.');
  };

  if (diagnosisComplete) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="p-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">تم الانتهاء من التشخيص</h2>
              <p className="text-gray-600 mb-8">تم تحليل معلوماتك بنجاح، إليك النتائج والتوصيات</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-blue-50 p-6 rounded-lg text-right">
                  <h3 className="font-bold text-blue-900 mb-2">نتائج التشخيص</h3>
                  <ul className="text-sm text-blue-800 space-y-2">
                    <li>• الحالة المختارة: {selectedCondition || 'لم يتم التحديد'}</li>
                    <li>• مستوى الخطورة: {selectedCondition === 'pain' ? 'عالي' : 'متوسط'}</li>
                    <li>• عدد الإجابات: {Object.keys(userResponses).length}</li>
                    <li>• نوع التشخيص: {selectedMethod === 'ai' ? 'محادثة ذكية' : 'أسئلة متتالية'}</li>
                  </ul>
                </div>
                <div className="bg-purple-50 p-6 rounded-lg text-right">
                  <h3 className="font-bold text-purple-900 mb-2">تفاصيل التشخيص</h3>
                  <ul className="text-sm text-purple-800 space-y-2">
                    <li>• دقة التشخيص: {selectedMethod === 'ai' ? '90%' : '85%'}</li>
                    <li>• مستوى الألم: {userResponses[3] || 'لم يحدد'}</li>
                    <li>• التوصية: {getClinicRecommendation()}</li>
                    <li>• التاريخ: {new Date().toLocaleDateString('ar')}</li>
                  </ul>
                </div>
                <div className="bg-orange-50 p-6 rounded-lg text-right">
                  <h3 className="font-bold text-orange-900 mb-2">التوصيات</h3>
                  <ul className="text-sm text-orange-800 space-y-2">
                    <li>• حجز موعد للفحص الدوري</li>
                    <li>• زيارة عيادة قريبة</li>
                    <li>• تنظيف مهني للأسنان</li>
                    <li>• تجنب الأطعمة السكرية</li>
                  </ul>
                </div>
              </div>

              {/* عيادات مقترحة - تعطيل مؤقت
              <div className="mt-8">
                عيادات مقترحة قادمة قريباً...
              </div>
              */}

              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
                <Link to="/booking">
                  <Button size="lg" className="w-full sm:w-auto">
                    <Calendar className="w-5 h-5 ml-2" />
                    حجز موعد للعلاج
                  </Button>
                </Link>
                <Button variant="secondary" size="lg" onClick={saveDiagnosis} className="w-full sm:w-auto">
                  حفظ التشخيص محلياً
                </Button>
                <Button variant="secondary" size="lg" onClick={() => {
                  setDiagnosisComplete(false);
                  setCurrentStep(1);
                }} className="w-full sm:w-auto">
                  إعادة التشخيص
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <Card className="p-12">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Brain className="w-10 h-10 text-purple-600 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">جاري التشخيص...</h2>
              <p className="text-gray-600 mb-8">يرجى الانتظار بينما نحلل معلوماتك</p>

              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full animate-pulse" style={{ width: '75%' }}></div>
              </div>
              <p className="text-sm text-gray-500">75% مكتمل</p>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">التشخيص الذكي المتقدم</h1>
            <p className="text-xl text-gray-600">
              احصل على تشخيص شامل لمشكلة أسنانك باستخدام طرق تشخيص متقدمة
            </p>
          </div>

          {currentStep === 1 && (
            <>
              {/* Method Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {diagnosticMethods.map((method) => (
                  <Card
                    key={method.id}
                    hover
                    className={`p-6 cursor-pointer transition-all ${selectedMethod === method.id
                        ? 'ring-2 ring-purple-500 bg-purple-50'
                        : 'hover:shadow-lg'
                      }`}
                    onClick={() => setSelectedMethod(method.id as 'ai' | 'smart')}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <method.icon className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="flex-1 text-right">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{method.title}</h3>
                        <p className="text-gray-600 mb-4">{method.description}</p>

                        <div className="space-y-3">
                          <div className="flex items-center gap-3 text-sm">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">مدة التشخيص: {method.duration}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <span className="text-gray-600">دقة التشخيص: {method.accuracy}</span>
                          </div>
                        </div>

                        <div className="mt-4">
                          <h4 className="font-semibold text-gray-900 mb-2">المميزات:</h4>
                          <ul className="space-y-1">
                            {method.features.map((feature, index) => (
                              <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-green-500" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Action Button */}
              <div className="text-center">
                <Button
                  size="lg"
                  onClick={() => handleMethodSelect(selectedMethod)}
                  className="px-12"
                >
                  ابدأ التشخيص
                  <ChevronRight className="w-5 h-5 mr-2" />
                </Button>
              </div>
            </>
          )}

          {currentStep === 2 && selectedMethod === 'ai' && (
            <div className="max-w-3xl mx-auto">
              <Card className="p-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-8 h-8 text-purple-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    المحادثة مع الوكيل الذكي
                  </h2>
                  <p className="text-gray-600">
                    تحدث مع الوكيل للحصول على تشخيص دقيق ومفصل
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 h-80 overflow-y-auto mb-6">
                  {chatMessages.map((message, index) => (
                    <div key={index} className={`mb-4 ${message.role === 'ai' ? 'text-right' : 'text-left'}`}>
                      <div className={`inline-block p-3 rounded-lg ${message.role === 'ai'
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-purple-100 text-purple-900'
                        }`}>
                        {message.role === 'ai' && <Brain className="w-4 h-4 inline ml-2" />}
                        <User className="w-4 h-4 inline ml-2" />
                        <span className="mr-2">{message.content}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSendMessage}
                    disabled={!currentMessage.trim()}
                    className="px-4"
                  >
                    إرسال
                  </Button>
                  <input
                    type="text"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="اكتب رسالتك هنا..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-right"
                  />
                </div>

                <div className="text-center mt-6">
                  <Button
                    size="lg"
                    onClick={handleDiagnosisStart}
                    className="px-12"
                  >
                    <Zap className="w-5 h-5 ml-2" />
                    إنهاء التشخيص
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {currentStep === 2 && selectedMethod === 'smart' && (
            <div className="max-w-3xl mx-auto">
              <Card className="p-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Stethoscope className="w-8 h-8 text-purple-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    التشخيص الذكي - ماذا تعاني؟
                  </h2>
                  <p className="text-gray-600">
                    اختر الحالة التي تشعر بها لبدء التشخيص المتتالي
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  {commonConditions.map((condition) => (
                    <Button
                      key={condition.id}
                      variant={selectedCondition === condition.id ? 'primary' : 'secondary'}
                      className="h-24 flex flex-col items-center gap-2"
                      onClick={() => handleConditionSelect(condition.id)}
                    >
                      <condition.icon className="w-6 h-6" />
                      <span className="text-xs text-center">{condition.title}</span>
                    </Button>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {currentStep === 3 && selectedMethod === 'smart' && (
            <div className="max-w-3xl mx-auto">
              <Card className="p-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {currentQuestionId === 0 ? 'السؤال الرئيسي' : `السؤال ${currentQuestionId + 1}`}
                  </h2>
                  <p className="text-gray-600">
                    إجاباتك على هذه الأسئلة ستساعد في وضع تشخيص دقيق
                  </p>
                </div>

                {/* عرض السؤال الحالي */}
                <div className="space-y-8">
                  {(() => {
                    const currentQuestion = currentQuestionId === 0
                      ? questionTree.main_question
                      : questionTree[selectedCondition as keyof typeof questionTree];

                    if (!currentQuestion) return null;

                    return (
                      <div className="text-right">
                        <div className="mb-6">
                          <div className="flex items-center justify-center mb-4">
                            <div className="flex space-x-1">
                              {[0, 1, 2, 3].map((step) => (
                                <div
                                  key={step}
                                  className={`w-3 h-3 rounded-full ${step <= currentQuestionId ? 'bg-green-500' : 'bg-gray-200'
                                    }`}
                                />
                              ))}
                            </div>
                          </div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-6">
                            {currentQuestion.question}
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {currentQuestion.options?.map((option) => (
                            <Button
                              key={option.id}
                              variant={userResponses[currentQuestionId] === option.id ? 'primary' : 'secondary'}
                              className="p-4 h-auto text-right"
                              onClick={() => handleResponseSelect(currentQuestionId, option.id)}
                            >
                              <div className="flex items-center gap-3">
                                <span className="flex-1">{option.text}</span>
                                <ChevronRight className="w-4 h-4" />
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* عرض التقدم */}
                {Object.keys(userResponses).length > 0 && (
                  <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-3 text-right">إجاباتك السابقة:</h4>
                    <div className="space-y-2 text-right text-sm text-blue-800">
                      {Object.entries(userResponses).map(([questionId, answer]) => {
                        if (parseInt(questionId) === 0) {
                          const condition = questionTree.main_question.options?.find(opt => opt.id === answer);
                          return <div key={questionId}>• {condition?.text}</div>;
                        }
                        const question = questionTree[selectedCondition as keyof typeof questionTree];
                        if (question && question.options) {
                          const option = question.options.find(opt => opt.id === answer);
                          return <div key={questionId}>• {option?.text}</div>;
                        }
                        return null;
                      })}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};