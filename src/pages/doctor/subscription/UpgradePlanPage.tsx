import React, { useState, useRef } from 'react';
import { useAdminSubscriptions } from '../../../hooks/useAdminSubscriptions';
import { useAdminData } from '../../../hooks/useAdminData';
import { useAuth } from '../../../contexts/AuthContext';
import { useStorage } from '../../../hooks/useStorage';
import { supabase } from '../../../lib/supabase';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import {
    CheckCircle, Shield, CreditCard, Upload,
    Phone, User, QrCode, Info, Search, ArrowRight, ArrowLeft, Ticket, Sparkles, X
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useDoctorSubscription } from '../../../hooks/useDoctorSubscription';
import { sendRoleNotification } from '../../../lib/notifications';

export const UpgradePlanPage: React.FC = () => {
    const navigate = useNavigate();
    const { plans: fetchedPlans, coupons } = useAdminSubscriptions();
    const { subscription } = useDoctorSubscription();
    const { paymentMethods, agents } = useAdminData();
    const { uploadFile } = useStorage();
    const { user } = useAuth();

    const plans = fetchedPlans;

    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [activeComparePlanId, setActiveComparePlanId] = useState<string | null>(null);
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'semi_annual' | 'yearly'>('monthly');
    const [step, setStep] = useState(1); // 1: Select Plan, 2: Payment
    const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
    const [selectedAgentId, setSelectedAgentId] = useState<string>('');
    const [couponCode, setCouponCode] = useState('');
    const [appliedCouponCode, setAppliedCouponCode] = useState('');
    const [discount, setDiscount] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // Refs for horizontal plan scrolling
    const plansScrollContainerRef = useRef<HTMLDivElement | null>(null);
    const planCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Payment State
    const [senderName, setSenderName] = useState('');
    const [senderPhone, setSenderPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [receiptImage, setReceiptImage] = useState<File | null>(null);

    // Auto-fill profile data
    React.useEffect(() => {
        const fetchProfile = async () => {
            if (user) {
                const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                if (data) {
                    setSenderName(data.full_name || user.name || '');
                    setSenderPhone(data.phone || user.phone || '');
                } else {
                    setSenderName(user.name || '');
                    setSenderPhone(user.phone || '');
                }
            }
        };
        fetchProfile();
    }, [user]);

    // Default activeComparePlanId when plans load
    React.useEffect(() => {
        if (plans.length > 0 && !activeComparePlanId) {
            const popularOrFirst = plans.find(p => p.isPopular || p.name.includes('ميز')) || plans[0];
            setActiveComparePlanId(popularOrFirst.id);
        }
    }, [plans, activeComparePlanId]);

    const handleGoBack = () => {
        if (step === 2) {
            setStep(1);
            return;
        }
        if (window.history.length > 2) {
            navigate(-1);
        } else {
            navigate('/doctor/profile');
        }
    };

    const selectedPlan = plans.find(p => p.id === selectedPlanId);

    // Compute price based on selected billing period
    const getPlanPrice = (plan: any) => {
        if (!plan) return 0;
        if (billingPeriod === 'yearly') return plan.price.yearly || Math.round(plan.price.monthly * 12 * 0.85);
        if (billingPeriod === 'semi_annual') return plan.price.semiAnnual || Math.round(plan.price.monthly * 6 * 0.9);
        return plan.price.monthly;
    };

    const selectedPlanPrice = getPlanPrice(selectedPlan);
    const monthlyPrice = selectedPlanPrice; // used for coupon calc

    const billingOptions: { key: 'monthly' | 'semi_annual' | 'yearly'; label: string; badge?: string }[] = [
        { key: 'monthly',     label: 'شهري' },
        { key: 'semi_annual', label: '6 أشهر', badge: 'وفر 10%' },
        { key: 'yearly',      label: 'سنوي',   badge: 'وفر 15%' },
    ];

    const billingPeriodLabel =
        billingPeriod === 'yearly' ? 'سنوياً' : billingPeriod === 'semi_annual' ? 'لـ 6 أشهر' : 'شهرياً';

    const scrollToPlanCard = (planId: string) => {
        setActiveComparePlanId(planId);
        const cardEl = planCardRefs.current[planId];
        if (cardEl) {
            cardEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    };

    const handlePlansScroll = () => {
        const container = plansScrollContainerRef.current;
        if (!container) return;
        const containerCenter = container.getBoundingClientRect().left + container.clientWidth / 2;
        let closestId: string | null = null;
        let minDistance = Infinity;

        plans.forEach(p => {
            const el = planCardRefs.current[p.id];
            if (el) {
                const rect = el.getBoundingClientRect();
                const cardCenter = rect.left + rect.width / 2;
                const dist = Math.abs(containerCenter - cardCenter);
                if (dist < minDistance) {
                    minDistance = dist;
                    closestId = p.id;
                }
            }
        });

        if (closestId && closestId !== activeComparePlanId) {
            setActiveComparePlanId(closestId);
        }
    };

    const handleApplyCoupon = () => {
        if (!couponCode.trim()) {
            toast.error('يرجى إدخال كود الخصم أولاً');
            return;
        }
        const coupon = coupons.find(c => c.code.toUpperCase() === couponCode.trim().toUpperCase()) as any;

        if (!coupon) { toast.error('كود الخصم غير صالح'); return; }
        if (!coupon.isActive) { toast.error('كود الخصم هذا غير مفعل حالياً'); return; }
        if (coupon.endDate && new Date(coupon.endDate) < new Date()) { toast.error('عذراً، انتهت صلاحية كود الخصم'); return; }
        if (coupon.startDate && new Date(coupon.startDate) > new Date()) { toast.error('كود الخصم هذا غير فعال بعد'); return; }
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) { toast.error('عذراً، نفد العدد المسموح لهذا الكوبون'); return; }

        const rawDiscount = coupon.type === 'percentage'
            ? Math.round(monthlyPrice * (coupon.value / 100))
            : Number(coupon.value);

        const discountValue = Math.min(monthlyPrice, Math.max(0, rawDiscount));

        setDiscount(discountValue);
        setAppliedCouponCode(coupon.code.toUpperCase());

        if (discountValue >= monthlyPrice && monthlyPrice > 0) {
            setSelectedPayment(null);
            toast.success('🎉 تم تطبيق خصم 100%! يمكنك الآن تأكيد الاشتراك مجاناً بدون اختيار طريقة دفع.');
        } else {
            toast.success(`✅ تم تطبيق خصم بقيمة ${discountValue.toLocaleString()} د.ع بنجاح!`);
        }
    };

    const handleRemoveCoupon = () => {
        setDiscount(0);
        setAppliedCouponCode('');
        setCouponCode('');
        toast.info('تم إلغاء كود الخصم');
    };

    if (showSuccess) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
                <Card className="max-w-md w-full p-6 sm:p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-9 h-9 text-green-600" />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">تم استلام طلبك بنجاح!</h1>
                    <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                        طلب الاشتراك قيد المراجعة حالياً. سيصلك إشعار فور تأكيد وتفعيل الباقة من قبل الإدارة.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2.5">
                        <Link to="/doctor/profile" className="flex-1">
                            <Button variant="outline" className="w-full">الملف الشخصي والاشتراكات</Button>
                        </Link>
                        <Link to="/doctor" className="flex-1">
                            <Button className="w-full">العودة لمركز الأطباء</Button>
                        </Link>
                    </div>
                </Card>
            </div>
        );
    }

    // --- Step 1: Select Plan ---
    if (step === 1) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-100/80 py-4 sm:py-6 px-3 sm:px-6" dir="rtl">
                <div className="max-w-6xl mx-auto">
                    {/* Top Bar with Back Button + Compact Title */}
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <button
                            type="button"
                            onClick={handleGoBack}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-blue-600 text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer shrink-0"
                        >
                            <ArrowRight className="w-4 h-4" />
                            <span>رجوع</span>
                        </button>

                        <div className="text-center flex-1 min-w-0">
                            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">اختر خطة الاشتراك المناسبة</h1>
                            <p className="text-[11px] sm:text-xs text-gray-500 hidden sm:block mt-0.5">
                                ارتقِ بعيادتك للمستوى التالي مع باقات Smart Dental المتقدمة
                            </p>
                        </div>

                        <div className="w-16 sm:w-20 shrink-0" />
                    </div>

                    {/* Duration Selector (Clean, compact without subtext) */}
                    <div className="flex justify-center mb-3">
                        <div className="inline-flex bg-white border border-gray-200 rounded-2xl p-1 shadow-xs gap-1">
                            {billingOptions.map(opt => (
                                <button
                                    key={opt.key}
                                    type="button"
                                    onClick={() => { setBillingPeriod(opt.key); setDiscount(0); setAppliedCouponCode(''); }}
                                    className={`relative flex items-center justify-center px-4 sm:px-6 py-2 rounded-xl transition-all text-xs sm:text-sm font-bold cursor-pointer ${
                                        billingPeriod === opt.key
                                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                                            : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    {opt.badge && (
                                        <span className={` -top-2 -left-1 absolute text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                            billingPeriod === opt.key ? 'bg-amber-400 text-amber-950' : 'bg-emerald-100 text-emerald-700'
                                        }`}>{opt.badge}</span>
                                    )}
                                    <span>{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quick Horizontal Plan Switcher Bar (for instant side-by-side comparison & horizontal auto-scroll) */}
                    {plans.length > 0 && (
                        <div className="flex justify-center mb-3">
                            <div className="inline-flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl max-w-full overflow-x-auto no-scrollbar">
                                {plans.map(plan => {
                                    const isFocused = activeComparePlanId === plan.id || selectedPlanId === plan.id;
                                    return (
                                        <button
                                            key={plan.id}
                                            type="button"
                                            onClick={() => {
                                                scrollToPlanCard(plan.id);
                                                const isFree = plan.price.monthly === 0;
                                                const isCurrent = subscription ? subscription.plan.id === plan.id : isFree;
                                                if (!isCurrent) {
                                                    setSelectedPlanId(plan.id);
                                                }
                                            }}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                                                isFocused
                                                    ? 'bg-white text-blue-700 shadow-xs ring-1 ring-blue-200'
                                                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                                            }`}
                                        >
                                            <span>{plan.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Plans Horizontal Snap Carousel (Mobile/Tablet) & Grid (Desktop) */}
                    <div
                        ref={plansScrollContainerRef}
                        onScroll={handlePlansScroll}
                        className="flex md:grid md:grid-cols-3 overflow-x-auto md:overflow-visible snap-x snap-mandatory gap-4 sm:gap-5 pb-4 pt-1 px-1 no-scrollbar"
                    >
                        {plans.length === 0 && (
                            <div className="col-span-3 w-full text-center py-10 text-gray-500 text-sm">
                                لا توجد باقات متاحة حالياً. يرجى مراجعة الإدارة.
                            </div>
                        )}

                        {plans.map(plan => {
                            const isFree = plan.price.monthly === 0;
                            const isSelected = selectedPlanId === plan.id;
                            const isFocused = activeComparePlanId === plan.id;
                            const isCurrent = subscription ? subscription.plan.id === plan.id : isFree;
                            const displayPrice = getPlanPrice(plan);

                            return (
                                <div
                                    key={plan.id}
                                    ref={el => { planCardRefs.current[plan.id] = el; }}
                                    className="w-[85vw] max-w-[340px] sm:w-[320px] md:w-auto md:max-w-none shrink-0 snap-center flex"
                                >
                                    <Card
                                        onClick={() => {
                                            scrollToPlanCard(plan.id);
                                            setActiveComparePlanId(plan.id);
                                            if (!isCurrent) setSelectedPlanId(plan.id);
                                        }}
                                        className={`p-4 sm:p-5 w-full relative transition-all duration-200 border-2 flex flex-col justify-between cursor-pointer ${
                                            isCurrent ? 'opacity-90 border-gray-200 bg-white/95' : 'hover:shadow-lg bg-white'
                                        } ${
                                            isSelected
                                                ? 'border-blue-600 ring-4 ring-blue-100/80 shadow-md'
                                                : isFocused
                                                ? 'border-blue-300'
                                                : 'border-gray-100'
                                        }`}
                                    >
                                        <div>
                                            {(plan.isPopular || plan.name.includes('ميز')) && !isFree ? (
                                                <div className="absolute top-0 left-0 bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-br-xl rounded-tl-xl shadow-xs">
                                                    الأكثر طلباً
                                                </div>
                                            ) : null}

                                            {/* Plan Header & Price */}
                                            <div className="flex items-baseline justify-between gap-2 mb-1">
                                                <h3 className="text-base sm:text-lg font-bold text-gray-900">{plan.name}</h3>
                                                {billingPeriod !== 'monthly' && !isFree && (
                                                    <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md font-bold">
                                                        بدلاً من {(plan.price.monthly * (billingPeriod === 'semi_annual' ? 6 : 12)).toLocaleString()}
                                                    </span>
                                                )}
                                            </div>

                                            <div className={`mb-3 flex items-baseline gap-1 ${isFree ? 'text-gray-500' : 'text-blue-600'}`}>
                                                <span className="text-2xl sm:text-3xl font-extrabold">{displayPrice.toLocaleString()}</span>
                                                <span className="text-xs font-medium text-gray-500">
                                                    {plan.price.currency || 'د.ع'} / {billingPeriodLabel}
                                                </span>
                                            </div>

                                            {/* Compact 4-Column Limits Strip */}
                                            <div className="grid grid-cols-4 gap-1.5 mb-3 bg-slate-50 p-1.5 rounded-xl border border-slate-100 text-center">
                                                <div className="bg-white py-1.5 px-1 rounded-lg border border-gray-100">
                                                    <span className="block text-[10px] text-gray-500">العيادات</span>
                                                    <span className="font-bold text-xs sm:text-sm text-gray-900">
                                                        {plan.maxClinics >= 999 ? '∞' : plan.maxClinics}
                                                    </span>
                                                </div>
                                                <div className="bg-white py-1.5 px-1 rounded-lg border border-gray-100">
                                                    <span className="block text-[10px] text-gray-500">المرضى</span>
                                                    <span className="font-bold text-xs sm:text-sm text-gray-900">
                                                        {plan.maxPatients >= 999999 ? '∞' : plan.maxPatients}
                                                    </span>
                                                </div>
                                                <div className="bg-white py-1.5 px-1 rounded-lg border border-gray-100">
                                                    <span className="block text-[10px] text-gray-500">الخدمات</span>
                                                    <span className="font-bold text-xs sm:text-sm text-gray-900">
                                                        {plan.maxServices >= 999 ? '∞' : plan.maxServices}
                                                    </span>
                                                </div>
                                                <div className="bg-white py-1.5 px-1 rounded-lg border border-gray-100">
                                                    <span className="block text-[10px] text-gray-500">AI يومي</span>
                                                    <span className={`font-bold text-xs sm:text-sm ${plan.aiRequestLimit === -1 ? 'text-purple-600' : 'text-gray-900'}`}>
                                                        {plan.aiRequestLimit === -1 ? '∞' : (plan.aiRequestLimit || 0)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Compact Features List */}
                                            <ul className="space-y-1.5 mb-4">
                                                {plan.features.map((feature, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-gray-700 text-xs sm:text-[13px] leading-snug">
                                                        <CheckCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isFree ? 'text-gray-400' : 'text-emerald-500'}`} />
                                                        <span>{feature}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Direct Action Button inside the Card */}
                                        <div className="pt-2 border-t border-gray-100" onClick={e => e.stopPropagation()}>
                                            {isCurrent ? (
                                                <Button
                                                    className="w-full py-2 text-xs sm:text-sm bg-emerald-600 text-white cursor-default opacity-100 hover:bg-emerald-600"
                                                    disabled
                                                >
                                                    <span className="flex items-center justify-center gap-1.5">
                                                        <CheckCircle className="w-4 h-4" />
                                                        باقتك الحالية
                                                    </span>
                                                </Button>
                                            ) : isSelected ? (
                                                <Button
                                                    className="w-full py-2.5 text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-200 flex items-center justify-center gap-2 animate-in fade-in duration-150"
                                                    onClick={() => setStep(2)}
                                                >
                                                    <span>متابعة للدفع</span>
                                                    <ArrowLeft className="w-4 h-4" />
                                                </Button>
                                            ) : (
                                                <Button
                                                    className="w-full py-2 text-xs sm:text-sm bg-gray-900 hover:bg-blue-600 text-white transition-colors"
                                                    onClick={() => {
                                                        setSelectedPlanId(plan.id);
                                                        setActiveComparePlanId(plan.id);
                                                        scrollToPlanCard(plan.id);
                                                    }}
                                                >
                                                    ترقية لهذه الباقة
                                                </Button>
                                            )}
                                        </div>
                                    </Card>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // --- Step 2: Payment & Order Details ---
    const finalPrice = Math.max(0, monthlyPrice - discount);
    const isFullDiscount = finalPrice === 0 && discount > 0;

    // Map payment methods from Admin Data + Agent
    const allMethods = [
        ...paymentMethods.map(pm => ({ ...pm, type: pm.name.toLowerCase().includes('zain') ? 'zain' : 'rafidain' })),
        { id: 'agent-method', name: 'الدفع نقداً (وكيل)', type: 'agent', isActive: true, number: '', recipientName: '', qrCodeUrl: '' }
    ];

    const handleSubmitPayment = async () => {
        if (!selectedPlan) return;

        if (!senderName.trim() || !senderPhone.trim()) {
            toast.error('يرجى التأكد من إدخال الاسم ورقم الهاتف');
            return;
        }

        // Only require a payment method & receipt if finalPrice > 0
        if (!isFullDiscount) {
            if (!selectedPayment) {
                toast.error('يرجى اختيار طريقة الدفع');
                return;
            }
            const currentMethod = allMethods.find(m => m.id === selectedPayment);
            if (!currentMethod) {
                toast.error('يرجى اختيار طريقة دفع صالحة');
                return;
            }
            if (currentMethod.type === 'agent' && !selectedAgentId) {
                toast.error('يرجى اختيار الوكيل المعتمد');
                return;
            }
            if (currentMethod.type !== 'agent' && !receiptImage) {
                toast.error('يرجى إرفاق صورة وصل التحويل');
                return;
            }
        }

        setIsSubmitting(true);
        try {
            let receiptUrl = '';

            // 1. Upload Receipt if exists and not full discount
            if (!isFullDiscount && receiptImage) {
                const result = await uploadFile(
                    receiptImage,
                    'documents',
                    'receipts'
                );
                if (!result) throw new Error('فشل رفع صورة الوصل');
                receiptUrl = result.url;
            }

            const chosenMethodObj = allMethods.find(m => m.id === selectedPayment);
            const paymentMethodValue = isFullDiscount
                ? 'free_coupon'
                : (chosenMethodObj?.type === 'agent' ? 'cash_agent' : (selectedPayment || 'zain'));

            // 2. Prepare Payment Details (with full discount & price breakdown for Admin)
            const paymentDetails = {
                method: isFullDiscount ? 'free_coupon' : selectedPayment,
                is_full_discount: isFullDiscount,
                original_price: selectedPlanPrice,
                discount_applied: discount,
                final_amount: finalPrice,
                agentId: isFullDiscount ? null : (selectedAgentId || null),
                senderName: senderName.trim(),
                senderPhone: senderPhone.trim(),
                notes: notes.trim(),
                receiptUrl,
                billing_period: billingPeriod,
                coupon_code: appliedCouponCode || null
            };

            // Update Profile with Phone Number
            if (user?.id && senderPhone) {
                await supabase.from('profiles').update({ phone: senderPhone.trim() }).eq('id', user.id);
            }

            const { error: insertError } = await supabase
                .from('subscription_requests')
                .insert([{
                    doctor_id: user?.id,
                    user_id: user?.id,
                    plan_id: selectedPlan.id,
                    status: 'pending',
                    payment_method: paymentMethodValue,
                    payment_details: paymentDetails,
                    amount_paid: finalPrice
                }]);

            if (insertError) throw insertError;

            // Notify Admins
            await sendRoleNotification(
                'admin',
                isFullDiscount ? 'طلب اشتراك (كود خصم 100%)' : 'طلب اشتراك جديد',
                `قام ${senderName} بإرسال طلب اشتراك في ${selectedPlan.name}${isFullDiscount ? ` باستخدام كود خصم 100% (${appliedCouponCode})` : ''}.`,
                '/admin/subscriptions'
            );

            setShowSuccess(true);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مرة أخرى');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderPaymentMethodCard = (method: any) => {
        const isSelected = selectedPayment === method.id;
        const isAgent = method.type === 'agent';

        let Icon = CreditCard;
        let colorClass = 'border-gray-200 hover:border-gray-300';
        let bgClass = 'bg-white';

        if (method.type === 'zain') {
            Icon = Phone;
            if (isSelected) { colorClass = 'border-blue-600 ring-2 ring-blue-50'; bgClass = 'bg-blue-50/40'; }
        } else if (method.type === 'rafidain') {
            Icon = CreditCard;
            if (isSelected) { colorClass = 'border-emerald-600 ring-2 ring-emerald-50'; bgClass = 'bg-emerald-50/40'; }
        } else {
            Icon = User;
            if (isSelected) { colorClass = 'border-purple-600 ring-2 ring-purple-50'; bgClass = 'bg-purple-50/40'; }
        }

        return (
            <div key={method.id} className="transition-all duration-200">
                <div
                    onClick={() => {
                        if (selectedPayment !== method.id) {
                            setSelectedPayment(method.id);
                            setReceiptImage(null);
                        }
                    }}
                    className={`p-4 sm:p-5 rounded-2xl border-2 cursor-pointer relative overflow-hidden ${colorClass} ${bgClass}`}
                >
                    <div className="flex items-center gap-3.5">
                        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-white shadow-xs text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-sm sm:text-base text-gray-900">{method.name}</h3>
                            <p className="text-[11px] sm:text-xs text-gray-500">{isAgent ? 'الدفع المباشر لأحد وكلائنا المعتمدين' : 'تحويل مالي إلكتروني مباشر'}</p>
                        </div>
                        {isSelected && <div className="mr-auto text-emerald-600 shrink-0"><CheckCircle className="w-5 h-5" /></div>}
                    </div>

                    {/* EXPANDED CONTENT for Inline Payment */}
                    {isSelected && (
                        <div
                            className="mt-4 pt-4 border-t border-gray-200/70 animate-in fade-in slide-in-from-top-2"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* --- AGENT FLOW --- */}
                            {isAgent && (
                                <div className="space-y-3.5">
                                    <div>
                                        <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">اختر الوكيل المعتمد</label>
                                        <select
                                            className="w-full input-field bg-white text-sm"
                                            onChange={(e) => setSelectedAgentId(e.target.value)}
                                            value={selectedAgentId}
                                        >
                                            <option value="">اختر الوكيل...</option>
                                            {agents.map(agent => (
                                                <option key={agent.id} value={agent.id}>{agent.name} - {agent.governorate}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {selectedAgentId && (() => {
                                        const agent = agents.find(a => a.id === selectedAgentId);
                                        if (!agent) return null;
                                        return (
                                            <div className="bg-purple-50 p-3.5 rounded-xl border border-purple-100 space-y-1 text-xs sm:text-sm text-purple-900">
                                                <div className="font-bold flex justify-between">
                                                    <span>{agent.name}</span>
                                                    <span dir="ltr">{agent.phone}</span>
                                                </div>
                                                <div className="text-purple-700 text-xs">{agent.address || agent.governorate}</div>
                                            </div>
                                        );
                                    })()}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">اسم المرسل</label>
                                            <div className="relative">
                                                <User className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                                                <input
                                                    type="text"
                                                    value={senderName}
                                                    onChange={e => setSenderName(e.target.value)}
                                                    className="input-field w-full pr-9 text-sm"
                                                    placeholder="الاسم الثلاثي"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">رقم الهاتف</label>
                                            <div className="relative">
                                                <Phone className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                                                <input
                                                    type="text"
                                                    dir="ltr"
                                                    value={senderPhone}
                                                    onChange={e => setSenderPhone(e.target.value)}
                                                    className="input-field w-full pr-9 text-right text-sm"
                                                    placeholder="07xxxxxxxxx"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">ملاحظات إضافية (اختياري)</label>
                                        <textarea
                                            rows={2}
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                            className="input-field w-full resize-none text-sm"
                                            placeholder="أي ملاحظات إضافية بخصوص الدفع..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">صورة الوصل (اختياري للوكيل)</label>
                                        <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                                            receiptImage ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50/40'
                                        }`}>
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => setReceiptImage(e.target.files?.[0] || null)} />
                                            {receiptImage ? (
                                                <div className="text-center text-emerald-700 px-2">
                                                    <CheckCircle className="w-6 h-6 mx-auto mb-1" />
                                                    <span className="text-xs font-bold truncate block max-w-[220px]">{receiptImage.name}</span>
                                                </div>
                                            ) : (
                                                <div className="text-center text-gray-500">
                                                    <Upload className="w-6 h-6 mx-auto mb-1" />
                                                    <span className="text-xs">اضغط لرفع صورة الوصل</span>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* --- ZAIN / RAFIDAIN FLOW --- */}
                            {!isAgent && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Transfer To Info */}
                                    <div className="bg-white p-3.5 rounded-xl border border-gray-200 text-center flex flex-col justify-center">
                                        <p className="text-[11px] text-gray-500 font-bold mb-2">معلومات التحويل المطلوب ({finalPrice.toLocaleString()} د.ع)</p>

                                        {method.qrCodeUrl ? (
                                            <div
                                                className="w-32 h-32 mx-auto bg-gray-50 rounded-lg mb-2.5 p-1.5 border cursor-pointer hover:border-blue-400 transition-all relative group"
                                                onClick={() => setPreviewImage(method.qrCodeUrl)}
                                            >
                                                <img src={method.qrCodeUrl} className="w-full h-full object-contain" alt="QR" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                                                    <div className="bg-white/90 rounded-full p-1.5 text-gray-800">
                                                        <Search className="w-4 h-4" />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-28 h-28 mx-auto bg-gray-50 rounded-lg mb-2.5 flex items-center justify-center text-gray-300">
                                                <QrCode className="w-10 h-10" />
                                            </div>
                                        )}

                                        <div className="space-y-1">
                                            <div className="font-mono text-base font-bold text-gray-900 dir-ltr bg-gray-50 py-1.5 px-2 rounded border border-gray-100 select-all">
                                                {method.number}
                                            </div>
                                            {method.recipientName && (
                                                <div className="text-xs font-bold text-blue-600">
                                                    المستلم: {method.recipientName}
                                                </div>
                                            )}
                                            <p className="text-[11px] text-gray-400">حول المبلغ ثم أرفق صورة الإشعار</p>
                                        </div>
                                    </div>

                                    {/* Sender Inputs */}
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">اسم المرسل</label>
                                            <div className="relative">
                                                <User className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                                                <input
                                                    type="text"
                                                    value={senderName}
                                                    onChange={e => setSenderName(e.target.value)}
                                                    className="input-field w-full pr-9 text-sm"
                                                    placeholder="الاسم الثلاثي"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">رقم الهاتف</label>
                                            <div className="relative">
                                                <Phone className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                                                <input
                                                    type="text"
                                                    dir="ltr"
                                                    value={senderPhone}
                                                    onChange={e => setSenderPhone(e.target.value)}
                                                    className="input-field w-full pr-9 text-right text-sm"
                                                    placeholder="07xxxxxxxxx"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">ملاحظات (اختياري)</label>
                                            <input
                                                type="text"
                                                value={notes}
                                                onChange={e => setNotes(e.target.value)}
                                                className="input-field w-full text-sm"
                                                placeholder="رقم العملية أو ملاحظة..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">صورة وصل التحويل *</label>
                                            <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                                                receiptImage ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/40'
                                            }`}>
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => setReceiptImage(e.target.files?.[0] || null)} />
                                                {receiptImage ? (
                                                    <div className="text-center text-emerald-700 px-2">
                                                        <CheckCircle className="w-6 h-6 mx-auto mb-1" />
                                                        <span className="text-xs font-bold truncate block max-w-[200px]">{receiptImage.name}</span>
                                                    </div>
                                                ) : (
                                                    <div className="text-center text-gray-500">
                                                        <Upload className="w-6 h-6 mx-auto mb-1" />
                                                        <span className="text-xs">اضغط لرفع صورة الوصل</span>
                                                    </div>
                                                )}
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-5 pt-3 border-t border-gray-100 flex justify-end">
                                <Button
                                    className={`w-full sm:w-auto px-8 py-2.5 text-sm sm:text-base font-bold shadow-md ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}
                                    onClick={handleSubmitPayment}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'جاري إرسال الطلب...' : 'تأكيد الطلب وإرسال'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 py-4 sm:py-8 px-3 sm:px-6" dir="rtl">
            <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
                {/* Top Header with Back Button */}
                <div className="flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-blue-600 text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer"
                    >
                        <ArrowRight className="w-4 h-4" />
                        <span>تغيير الباقة</span>
                    </button>
                    <h1 className="text-lg sm:text-2xl font-bold text-gray-900">تفاصيل الطلب والدفع</h1>
                    <div className="w-20 hidden sm:block" />
                </div>

                {/* 1. Order Summary & Discount Code Card (Always at the TOP on Mobile & Desktop) */}
                <Card className="p-3.5 sm:p-4 bg-white border border-blue-100 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                        <h3 className="font-bold text-gray-900 text-xs sm:text-sm flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-blue-600" />
                            <span>ملخص الطلب</span>
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                            {billingPeriod === 'yearly' ? 'اشتراك سنوي' : billingPeriod === 'semi_annual' ? 'اشتراك 6 أشهر' : 'اشتراك شهري'}
                        </span>
                    </div>

                    {/* Plan Summary Row */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-100">
                            <div>
                                <span className="text-[11px] text-gray-500 block">الباقة المختارة</span>
                                <span className="font-bold text-gray-900 text-xs sm:text-sm">{selectedPlan?.name || 'غير محدد'}</span>
                            </div>
                            <div className="text-left">
                                <span className="text-[11px] text-gray-500 block">
                                    {discount > 0 ? 'سعر الباقة الأساسي' : 'المبلغ الصافي للدفع'}
                                </span>
                                <span className={`font-extrabold text-sm sm:text-base ${discount > 0 ? 'text-gray-700' : 'text-blue-600'}`}>
                                    {selectedPlanPrice.toLocaleString()} <span className="text-[11px] font-normal text-gray-500">د.ع</span>
                                </span>
                            </div>
                        </div>

                        {discount > 0 && (
                            <>
                                <div className="flex items-center justify-between text-xs text-emerald-700 bg-emerald-50/80 px-2.5 py-1.5 rounded-xl border border-emerald-200 font-bold">
                                    <span className="flex items-center gap-1">
                                        <Ticket className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>قيمة الخصم ({appliedCouponCode})</span>
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <span dir="ltr">- {discount.toLocaleString()} د.ع</span>
                                        <button
                                            type="button"
                                            onClick={handleRemoveCoupon}
                                            className="text-red-500 hover:text-red-700 p-0.5 rounded-full hover:bg-red-50 transition-colors"
                                            title="إزالة الكوبون"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
                                    <span className="font-bold text-gray-900 text-xs sm:text-sm">المبلغ الصافي للدفع</span>
                                    <span className={`font-extrabold text-base sm:text-lg ${isFullDiscount ? 'text-emerald-600' : 'text-blue-600'}`}>
                                        {isFullDiscount ? '0 د.ع (مجاني 100%)' : `${finalPrice.toLocaleString()} د.ع`}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Discount Coupon Input */}
                    <div className="pt-2 border-t border-gray-100">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="كود الخصم (إن وجد)..."
                                className="input-field text-xs sm:text-sm h-9 flex-1 font-mono uppercase"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value)}
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleApplyCoupon}
                                className="h-9 px-3.5 text-xs font-bold border-blue-200 text-blue-700 hover:bg-blue-50 shrink-0"
                            >
                                تطبيق الخصم
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* 2. Payment Methods OR 100% Discount Direct Activation */}
                {isFullDiscount ? (
                    <Card className="p-5 sm:p-6 bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-2 border-emerald-300 shadow-sm space-y-4 animate-in fade-in duration-200">
                        <div className="flex items-start gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-emerald-950 text-base sm:text-lg">
                                    تم إعفاؤك من الدفع بالكامل (خصم 100%)
                                </h3>
                                <p className="text-xs sm:text-sm text-emerald-800 mt-0.5 leading-relaxed">
                                    بفضل كود الخصم <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-emerald-200">{appliedCouponCode}</span>، لا يتطلب طلبك اختيار طريقة دفع أو إرفاق وصل تحويل. تأكد من بياناتك أدناه وأرسل الطلب مباشرة.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">اسم الطبيب</label>
                                <div className="relative">
                                    <User className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={senderName}
                                        onChange={e => setSenderName(e.target.value)}
                                        className="input-field w-full pr-9 bg-white text-sm"
                                        placeholder="الاسم الثلاثي"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">رقم الهاتف</label>
                                <div className="relative">
                                    <Phone className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                                    <input
                                        type="text"
                                        dir="ltr"
                                        value={senderPhone}
                                        onChange={e => setSenderPhone(e.target.value)}
                                        className="input-field w-full pr-9 text-right bg-white text-sm"
                                        placeholder="07xxxxxxxxx"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button
                                className="w-full py-3 text-sm sm:text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200"
                                onClick={handleSubmitPayment}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'جاري إرسال الطلب...' : 'تأكيد وتفعيل الاشتراك مجاناً (خصم 100%)'}
                            </Button>
                        </div>
                    </Card>
                ) : (
                    <Card className="p-4 sm:p-6 bg-white border border-gray-100 shadow-xs">
                        <h3 className="font-bold mb-4 flex items-center gap-2 text-sm sm:text-base border-b border-gray-100 pb-3">
                            <Shield className="w-5 h-5 text-blue-600" />
                            <span>اختر طريقة الدفع</span>
                        </h3>

                        <div className="space-y-3">
                            {allMethods.filter(m => m.isActive).map(method => renderPaymentMethodCard(method))}
                        </div>

                        {allMethods.filter(m => m.isActive).length === 0 && (
                            <p className="text-center text-gray-500 py-6 text-sm">لا توجد طرق دفع متاحة حالياً.</p>
                        )}

                        <div className="mt-4 bg-blue-50/70 p-3 rounded-xl text-xs text-blue-800 leading-relaxed flex items-center gap-2">
                            <Info className="w-4 h-4 text-blue-600 shrink-0" />
                            <span>عند إتمام الطلب، سيقوم فريق إدارة المنصة بمراجعته وتفعيله بأسرع وقت.</span>
                        </div>
                    </Card>
                )}
            </div>

            {/* Image Preview Overlay */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
                    onClick={() => setPreviewImage(null)}
                >
                    <button
                        className="absolute top-4 right-4 text-white hover:text-gray-300 bg-white/10 rounded-full p-2"
                        onClick={() => setPreviewImage(null)}
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <img
                        src={previewImage}
                        alt="Preview"
                        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
};
