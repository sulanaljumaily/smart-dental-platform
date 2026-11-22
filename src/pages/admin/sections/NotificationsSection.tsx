import React, { useState, useMemo } from 'react';
import { StatsCard } from '../../../components/admin/StatsCard';
import {
  Bell,
  Send,
  Users,
  Trash2,
  Clock,
  CheckCircle2,
  Sparkles,
  Tag,
  Percent,
  RefreshCw,
  Megaphone,
  Stethoscope,
  TestTube,
  Store,
  HeartPulse,
  CalendarClock,
  BookmarkPlus,
  Bookmark,
  Play,
  ExternalLink,
  Smartphone,
  GraduationCap,
  Search,
  ShoppingBag,
} from 'lucide-react';
import {
  useAdminNotifications,
  AudienceKey,
  CampaignCategory,
  NotificationTemplate,
  StoreProductLite,
} from '../../../hooks/useAdminNotifications';
import { usePlatform } from '../../../contexts/PlatformContext';
import { toast } from 'sonner';

const AUDIENCE_OPTIONS: Array<{
  key: AudienceKey;
  label: string;
  sub: string;
  icon: React.ComponentType<any>;
  color: string;
}> = [
  {
    key: 'doctor_staff',
    label: 'الأطباء وطاقمهم',
    sub: 'أطباء الأسنان وكوادر العيادات',
    icon: Stethoscope,
    color: 'blue',
  },
  {
    key: 'laboratory',
    label: 'المختبرات (معامل الأسنان)',
    sub: 'مختبرات ومعامل التعويضات السنية',
    icon: TestTube,
    color: 'purple',
  },
  {
    key: 'supplier',
    label: 'الموردين',
    sub: 'شركات ومذخر مستلزمات الأسنان',
    icon: Store,
    color: 'emerald',
  },
  {
    key: 'patient',
    label: 'المراجعين',
    sub: 'حسابات المرضى والجمهور',
    icon: HeartPulse,
    color: 'rose',
  },
];

const CATEGORY_META: Record<
  CampaignCategory,
  { label: string; badge: string; defaultLink: string; icon: React.ComponentType<any> }
> = {
  offer: {
    label: 'عرض منتج بالمتجر',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    defaultLink: '/store/deals',
    icon: ShoppingBag,
  },
  discount: {
    label: 'تخفيضات وخصومات',
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
    defaultLink: '/store/deals',
    icon: Percent,
  },
  promotional: {
    label: 'إشعار ترويجي',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    defaultLink: '/store',
    icon: Megaphone,
  },
  update: {
    label: 'تحديث التطبيق والمنصة',
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    defaultLink: '/doctor/updates',
    icon: RefreshCw,
  },
  course: {
    label: 'دورة / ندوة علمية',
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
    defaultLink: '/community',
    icon: GraduationCap,
  },
  webinar: {
    label: 'ندوة مباشرة',
    badge: 'bg-violet-100 text-violet-800 border-violet-200',
    defaultLink: '/community',
    icon: GraduationCap,
  },
  announcement: {
    label: 'إعلان إداري',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    defaultLink: '/doctor/notifications',
    icon: Bell,
  },
  reminder: {
    label: 'تذكير مجدول',
    badge: 'bg-orange-100 text-orange-800 border-orange-200',
    defaultLink: '/doctor/notifications',
    icon: Clock,
  },
  system: {
    label: 'تنبيه نظام',
    badge: 'bg-slate-100 text-slate-800 border-slate-200',
    defaultLink: '/doctor/notifications',
    icon: Bell,
  },
};

export const NotificationsSection: React.FC = () => {
  const {
    campaigns,
    templates,
    products,
    audienceCounts,
    loading,
    sendOrScheduleCampaign,
    dispatchCampaignNow,
    runScheduledAndRemindersNow,
    deleteCampaign,
    saveTemplate,
    incrementTemplateUsage,
    deleteTemplate,
    refresh,
  } = useAdminNotifications();

  const { appsConfig } = usePlatform();

  // Only 2 clean tabs: 'notifications' (الإشعارات) & 'send' (إرسال إشعارات)
  const [activeTab, setActiveTab] = useState<'notifications' | 'send'>('notifications');

  // List filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'scheduled'>('all');
  const [processingScheduled, setProcessingScheduled] = useState(false);

  // Composer states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<CampaignCategory>('offer');
  const [selectedAudiences, setSelectedAudiences] = useState<AudienceKey[]>(['all']);
  const [sendMode, setSendMode] = useState<'now' | 'scheduled'>('now');
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [link, setLink] = useState('/store/deals');
  const [imageUrl, setImageUrl] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Save as template inline state
  const [showSaveTemplateInput, setShowSaveTemplateInput] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const scheduledCampaigns = useMemo(
    () => campaigns.filter((c) => c.status === 'scheduled'),
    [campaigns]
  );

  const totalDelivered = useMemo(
    () => campaigns.reduce((sum, c) => sum + (c.sentCount || 0), 0),
    [campaigns]
  );

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.title.toLowerCase().includes(q) ||
          c.content.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [campaigns, statusFilter, searchQuery]);

  const toggleAudience = (key: AudienceKey) => {
    if (key === 'all') {
      setSelectedAudiences(['all']);
      return;
    }
    setSelectedAudiences((prev) => {
      const withoutAll = prev.filter((a) => a !== 'all');
      if (withoutAll.includes(key)) {
        const next = withoutAll.filter((a) => a !== key);
        return next.length === 0 ? ['all'] : next;
      }
      const next = [...withoutAll, key];
      if (next.length === AUDIENCE_OPTIONS.length) {
        return ['all'];
      }
      return next;
    });
  };

  const estimatedRecipients = useMemo(() => {
    if (selectedAudiences.includes('all')) return audienceCounts.all;
    return selectedAudiences.reduce((sum, key) => {
      if (key === 'doctor_staff') return sum + audienceCounts.doctor_staff;
      if (key === 'laboratory') return sum + audienceCounts.laboratory;
      if (key === 'supplier') return sum + audienceCounts.supplier;
      if (key === 'patient') return sum + audienceCounts.patient;
      return sum;
    }, 0);
  }, [selectedAudiences, audienceCounts]);

  const handleCategoryChange = (nextCat: CampaignCategory) => {
    setCategory(nextCat);
    const meta = CATEGORY_META[nextCat];
    if (meta?.defaultLink) {
      if (nextCat === 'offer' || nextCat === 'discount') {
        const onlyPatients = selectedAudiences.length === 1 && selectedAudiences[0] === 'patient';
        setLink(onlyPatients ? '/patient/store/deals' : '/store/deals');
      } else {
        setLink(meta.defaultLink);
      }
    }

    // Auto-fill latest app release from AppsManager when picking 'update'
    if (nextCat === 'update' && !title.trim()) {
      const ver = appsConfig.windows.latestVersion || '1.0.0';
      setTitle(`🚀 تحديث جديد للمنصة — الإصدار v${ver}`);
      setContent(
        appsConfig.windows.releaseNotes ||
          'تم إطلاق تحديث جديد يتضمن تحسينات في السرعة والمزامنة والاستقرار. يمكنك الاطلاع على التفاصيل من مركز التحديثات.'
      );
      setLink('/doctor/updates');
      setPriority('high');
    }
  };

  const handlePickProduct = (productId: string) => {
    setSelectedProductId(productId);
    const prod: StoreProductLite | undefined = products.find((p) => p.id === productId);
    if (!prod) return;

    const pct = prod.discount || (discountPercent ? Number(discountPercent) : 0);
    const onlyPatients = selectedAudiences.length === 1 && selectedAudiences[0] === 'patient';
    setTitle(
      pct > 0
        ? `🔥 خصم ${pct}% على ${prod.name}`
        : `🛍️ عرض خاص في المتجر: ${prod.name}`
    );
    setContent(
      pct > 0
        ? `لا تفوّت العرض الخاص على "${prod.name}" بسعر ${prod.price.toLocaleString()} د.ع فقط (بخصم ${pct}%). اطلبه الآن من المتجر!`
        : `تتوفر الآن "${prod.name}" في المتجر الطبي بسعر ${prod.price.toLocaleString()} د.ع — اضغط للتفاصيل والطلب السريع.`
    );
    setLink(onlyPatients ? `/patient/store/product/${prod.id}` : `/store/product/${prod.id}`);
    if (prod.imageUrl) setImageUrl(prod.imageUrl);
    if (pct > 0) setDiscountPercent(String(pct));
  };

  const handleApplyTemplate = (tpl: NotificationTemplate) => {
    setTitle(tpl.title);
    setContent(tpl.content);
    setCategory(tpl.type || 'promotional');
    setSelectedAudiences(tpl.targetAudiences?.length ? tpl.targetAudiences : ['all']);
    setLink(tpl.link || CATEGORY_META[tpl.type || 'promotional']?.defaultLink || '');
    setImageUrl(tpl.imageUrl || '');
    setPriority((tpl.priority === 'low' ? 'normal' : tpl.priority) || 'normal');
    incrementTemplateUsage(tpl.id);
    toast.success(`تم تعبئة قالب «${tpl.name}» — يمكنك التعديل والإرسال الآن`);
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim() || !title.trim() || !content.trim()) {
      toast.error('يرجى إدخال اسم القالب وعنوان الإشعار والرسالة');
      return;
    }
    const ok = await saveTemplate({
      name: templateName.trim(),
      title: title.trim(),
      content: content.trim(),
      type: category,
      targetAudiences: selectedAudiences,
      link: link.trim() || null,
      imageUrl: imageUrl.trim() || null,
      priority,
    });
    if (ok) {
      toast.success('تم حفظ القالب بنجاح لإعادة استخدامه لاحقاً');
      setTemplateName('');
      setShowSaveTemplateInput(false);
    } else {
      toast.error('تعذر حفظ القالب');
    }
  };

  const handleSendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('يرجى كتابة عنوان ونص الإشعار');
      return;
    }
    if (sendMode === 'scheduled') {
      if (!scheduledDateTime) {
        toast.error('يرجى تحديد تاريخ ووقت التفعيل للإشعار المجدول');
        return;
      }
      if (new Date(scheduledDateTime).getTime() <= Date.now()) {
        toast.error('وقت الجدولة يجب أن يكون في المستقبل');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await sendOrScheduleCampaign({
        title: title.trim(),
        content: content.trim(),
        type: category,
        targetAudiences: selectedAudiences,
        scheduledDate: sendMode === 'scheduled' ? scheduledDateTime : null,
        priority,
        link: link.trim() || null,
        imageUrl: imageUrl.trim() || null,
        metadata: {
          ...(selectedProductId ? { product_id: selectedProductId } : {}),
          ...(discountPercent ? { discount_percent: Number(discountPercent) } : {}),
        },
        channels: ['app', 'push'],
      });

      if (res.success) {
        if (res.scheduled) {
          toast.success('⏰ تم جدولة الإشعار بنجاح وسيُرسل تلقائياً في الوقت المحدد');
        } else {
          toast.success(`✅ تم إرسال الإشعار بنجاح إلى ${res.sentCount} مستخدم عبر التطبيق والأجهزة`);
        }
        setTitle('');
        setContent('');
        setScheduledDateTime('');
        setSelectedProductId('');
        setDiscountPercent('');
        setImageUrl('');
        setActiveTab('notifications');
      } else {
        toast.error(res.error || 'فشل إرسال الإشعار');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispatchNow = async (campaignId: string) => {
    const res = await dispatchCampaignNow(campaignId);
    if (res.success) {
      toast.success(`✅ تم تفعيل وإرسال الإشعار فوراً إلى ${res.sentCount} مستخدم`);
    } else {
      toast.error(res.error || 'تعذر تفعيل الإشعار');
    }
  };

  const handleRunDueNow = async () => {
    setProcessingScheduled(true);
    try {
      const res = await runScheduledAndRemindersNow();
      if (res.success) {
        toast.success(
          `تم فحص الجدولة: ${res.dispatchedCampaigns} إشعار مجدول + ${res.sentReminders} تذكير موعد قبل يوم`
        );
      }
    } finally {
      setProcessingScheduled(false);
    }
  };

  const formatAudienceBadge = (key: string) => {
    switch (key) {
      case 'all':
        return { label: 'جميع الفئات (4)', cls: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'doctor_staff':
      case 'doctor':
      case 'staff':
        return { label: 'الأطباء وطاقمهم', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'laboratory':
      case 'lab':
        return { label: 'المختبرات', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'supplier':
        return { label: 'الموردين', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'patient':
        return { label: 'المراجعين', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
      default:
        return { label: key, cls: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="إجمالي الإشعارات"
          value={campaigns.length}
          trend={{ value: campaigns.filter((c) => c.status === 'sent').length, direction: 'up' }}
          icon={Bell as any}
          color="purple"
        />
        <StatsCard
          title="إشعارات مجدولة"
          value={scheduledCampaigns.length}
          trend={{ value: scheduledCampaigns.length, direction: 'up' }}
          icon={CalendarClock as any}
          color="blue"
        />
        <StatsCard
          title="إجمالي الوصول"
          value={totalDelivered.toLocaleString()}
          trend={{ value: audienceCounts.all, direction: 'up' }}
          icon={Users as any}
          color="green"
        />
        <StatsCard
          title="القوالب الجاهزة"
          value={templates.length}
          trend={{ value: audienceCounts.pushTokensCount, direction: 'up' }}
          icon={Smartphone as any}
          color="orange"
        />
      </div>

      {/* Navigation Tabs + Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="bg-white p-1.5 rounded-2xl border border-gray-200 inline-flex gap-1 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 py-2.5 px-5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'notifications'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Bell className="h-4 w-4" />
            <span>الإشعارات</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'notifications' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {campaigns.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('send')}
            className={`flex items-center gap-2 py-2.5 px-5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'send'
                ? 'bg-gradient-to-l from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Send className="h-4 w-4" />
            <span>إرسال إشعارات</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRunDueNow}
            disabled={processingScheduled}
            className="px-3.5 py-2 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-60"
            title="فحص وإرسال الإشعارات المجدولة وتذكيرات المواعيد قبل يوم"
          >
            <Clock className={`w-4 h-4 ${processingScheduled ? 'animate-spin' : ''}`} />
            <span>فحص المجدول والتذكيرات</span>
          </button>
          <button
            type="button"
            onClick={refresh}
            className="p-2 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 rounded-xl transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* TAB 1: الإشعارات (Sent & Scheduled History) */}
      {/* ================================================================= */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث في الإشعارات المرسلة والمجدولة..."
                className="w-full pr-9 pl-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-200 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {[
                { key: 'all', label: 'الكل' },
                { key: 'sent', label: 'المُرسلة' },
                { key: 'scheduled', label: 'المجدولة' },
              ].map((st) => (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => setStatusFilter(st.key as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                    statusFilter === st.key
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {st.label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setActiveTab('send')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>إشعار جديد</span>
              </button>
            </div>
          </div>

          {/* Campaigns Cards / Table */}
          {filteredCampaigns.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-900">لا توجد إشعارات مطابقة</h3>
              <p className="text-sm text-gray-500 mt-1 mb-4">
                يمكنك إرسال إشعارات فورية أو مجدولة وعروض متجر للأطباء والمختبرات والموردين والمراجعين
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('send')}
                className="px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition-colors"
              >
                إرسال أول إشعار الآن
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCampaigns.map((camp) => {
                const catMeta = CATEGORY_META[camp.type] || CATEGORY_META.system;
                const CatIcon = catMeta.icon;
                const isScheduled = camp.status === 'scheduled';
                return (
                  <div
                    key={camp.id}
                    className={`bg-white rounded-2xl border p-5 shadow-xs hover:shadow-md transition-all ${
                      isScheduled ? 'border-blue-200 bg-blue-50/20' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${catMeta.badge}`}
                        >
                          <CatIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-gray-900 text-base">{camp.title}</h4>
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${catMeta.badge}`}>
                              {catMeta.label}
                            </span>
                            {isScheduled ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                <Clock className="w-3 h-3" />
                                مجدول للتفعيل
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                تم الإرسال ({camp.sentCount} مستخدم)
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                            {camp.content}
                          </p>

                          <div className="flex items-center gap-2 flex-wrap pt-1">
                            {camp.targetAudiences.map((aud) => {
                              const badge = formatAudienceBadge(aud);
                              return (
                                <span
                                  key={aud}
                                  className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${badge.cls}`}
                                >
                                  {badge.label}
                                </span>
                              );
                            })}

                            {camp.link && (
                              <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-lg font-mono flex items-center gap-1" dir="ltr">
                                <ExternalLink className="w-3 h-3" />
                                {camp.link}
                              </span>
                            )}

                            <span className="text-[11px] text-gray-400 mr-auto">
                              {isScheduled && camp.scheduledDate
                                ? `موعد التفعيل: ${new Date(camp.scheduledDate).toLocaleString('ar-IQ')}`
                                : `تاريخ الإرسال: ${new Date(camp.sentAt || camp.createdAt).toLocaleString('ar-IQ')}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isScheduled && (
                          <button
                            type="button"
                            onClick={() => handleDispatchNow(camp.id)}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>إرسال الآن</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm('هل أنت متأكد من حذف هذا الإشعار من السجل؟')) {
                              const ok = await deleteCampaign(camp.id);
                              if (ok) toast.success('تم الحذف');
                            }
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-100 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: إرسال إشعارات (Composer + Templates + Offers + Scheduling) */}
      {/* ================================================================= */}
      {activeTab === 'send' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Composer (2 Columns) */}
          <form onSubmit={handleSendSubmit} className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">إنشاء وإرسال إشعار Push للتطبيقات</h3>
                  <p className="text-xs text-gray-500">
                    يصل الإشعار مباشرة للأجهزة ومركز الإشعارات للفئات المستهدفة (فوراً أو بوقت مجدول)
                  </p>
                </div>
              </div>
            </div>

            {/* 1. Target Audience Multi-Select (4 User Categories) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-gray-900">1. الجمهور المستهدف (الفئات الأربع)</label>
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                  الوصول المتوقع: {estimatedRecipients} مستخدم
                </span>
              </div>

              <button
                type="button"
                onClick={() => toggleAudience('all')}
                className={`w-full p-3.5 rounded-xl border-2 text-right transition-all flex items-center justify-between ${
                  selectedAudiences.includes('all')
                    ? 'border-purple-600 bg-purple-50/70 shadow-xs'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      selectedAudiences.includes('all') ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-gray-900">جميع مستخدمي المنصة (الفئات الأربع معاً)</div>
                    <div className="text-xs text-gray-500">الأطباء وطاقمهم + المختبرات + الموردين + المراجعين</div>
                  </div>
                </div>
                <span className="text-xs font-bold bg-white px-2.5 py-1 rounded-lg border border-gray-200 text-gray-700">
                  {audienceCounts.all} مستخدم
                </span>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {AUDIENCE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isActive = !selectedAudiences.includes('all') && selectedAudiences.includes(opt.key);
                  const countVal =
                    opt.key === 'doctor_staff'
                      ? audienceCounts.doctor_staff
                      : opt.key === 'laboratory'
                      ? audienceCounts.laboratory
                      : opt.key === 'supplier'
                      ? audienceCounts.supplier
                      : audienceCounts.patient;

                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => toggleAudience(opt.key)}
                      className={`p-3.5 rounded-xl border-2 text-right transition-all flex items-center justify-between ${
                        isActive
                          ? 'border-purple-600 bg-purple-50/60 shadow-xs'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isActive ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-xs sm:text-sm text-gray-900">{opt.label}</div>
                          <div className="text-[11px] text-gray-500">{opt.sub}</div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-gray-700 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
                        {countVal}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Category Selector (Offers, Discounts, Updates, Promo, Courses) */}
            <div className="space-y-2.5">
              <label className="text-sm font-bold text-gray-900 block">2. نوع الإشعار والمحتوى</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(
                  [
                    'offer',
                    'discount',
                    'promotional',
                    'update',
                    'course',
                    'announcement',
                  ] as CampaignCategory[]
                ).map((catKey) => {
                  const meta = CATEGORY_META[catKey];
                  const Icon = meta.icon;
                  const active = category === catKey;
                  return (
                    <button
                      key={catKey}
                      type="button"
                      onClick={() => handleCategoryChange(catKey)}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        active
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Store Product Offer / Discount Quick Picker */}
            {(category === 'offer' || category === 'discount') && (
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <Tag className="w-4 h-4 text-amber-600" />
                  <span>ربط سريع بمنتج أو عرض من المتجر (اختياري — يعبئ العنوان والرابط تلقائياً)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <select
                      value={selectedProductId}
                      onChange={(e) => handlePickProduct(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-300"
                    >
                      <option value="">— اختر منتجاً من المتجر للترويج له —</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.price.toLocaleString()} د.ع
                          {p.discount ? ` (خصم ${p.discount}%)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="number"
                      min="1"
                      max="95"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(e.target.value)}
                      placeholder="نسبة التخفيض % (اختياري)"
                      className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. Title, Content, Link & Priority */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">عنوان الإشعار *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: 🔥 تخفيضات 25% على جميع مستلزمات طب الأسنان لمدة 48 ساعة"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">نص ورسالة الإشعار *</label>
                <textarea
                  rows={4}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="اكتب نص الإشعار بوضوح وجاذبية ليظهر في شاشة قفل الهاتف ومركز الإشعارات..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none resize-y"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    رابط التوجيه عند الضغط (اختياري)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="/store/deals أو /doctor/updates"
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-purple-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">الأولوية</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-purple-200 outline-none"
                  >
                    <option value="normal">عادي</option>
                    <option value="high">مرتفع (تنبيه مهم)</option>
                    <option value="urgent">عاجل</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 4. Immediate vs Scheduled Activation */}
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-3">
              <label className="text-sm font-bold text-gray-900 block">3. توقيت الإرسال والتفعيل</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSendMode('now')}
                  className={`p-3 rounded-xl border-2 text-right flex items-center gap-2.5 transition-all ${
                    sendMode === 'now'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  <Send className="w-4 h-4 shrink-0" />
                  <div>
                    <div className="text-xs font-bold">إرسال فوري الآن</div>
                    <div className="text-[11px] opacity-80">يصل فوراً للأجهزة والتطبيق</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSendMode('scheduled')}
                  className={`p-3 rounded-xl border-2 text-right flex items-center gap-2.5 transition-all ${
                    sendMode === 'scheduled'
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  <CalendarClock className="w-4 h-4 shrink-0" />
                  <div>
                    <div className="text-xs font-bold">جدولة بوقت محدد</div>
                    <div className="text-[11px] opacity-80">يُفعل تلقائياً بالتاريخ والساعة</div>
                  </div>
                </button>
              </div>

              {sendMode === 'scheduled' && (
                <div className="pt-2">
                  <label className="block text-xs font-bold text-blue-900 mb-1">
                    اختر تاريخ ووقت الإرسال التلقائي *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-blue-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-300 outline-none"
                  />
                </div>
              )}
            </div>

            {/* Save Template & Submit Buttons */}
            <div className="pt-2 border-t border-gray-100 space-y-3">
              {showSaveTemplateInput && (
                <div className="flex gap-2 bg-purple-50 p-3 rounded-xl border border-purple-200">
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="اكتب اسماً مختصراً لهذا القالب (مثال: عرض نهاية الأسبوع)..."
                    className="flex-1 px-3 py-2 bg-white border border-purple-200 rounded-lg text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveAsTemplate}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700"
                  >
                    حفظ
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSaveTemplateInput(false)}
                    className="px-3 py-2 text-gray-600 hover:bg-white rounded-lg text-xs"
                  >
                    إلغاء
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowSaveTemplateInput((v) => !v)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <BookmarkPlus className="w-4 h-4 text-purple-600" />
                  <span>حفظ كقالب جاهز</span>
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-gradient-to-l from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold shadow-md flex items-center gap-2 transition-all disabled:opacity-60"
                >
                  {submitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : sendMode === 'scheduled' ? (
                    <CalendarClock className="w-4 h-4" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>
                    {submitting
                      ? 'جاري التنفيذ...'
                      : sendMode === 'scheduled'
                      ? 'حفظ وجدولة الإشعار'
                      : `إرسال الإشعار الآن (${estimatedRecipients} مستخدم)`}
                  </span>
                </button>
              </div>
            </div>
          </form>

          {/* Right Sidebar: Live Device Preview + Saved Reusable Templates */}
          <div className="space-y-5">
            {/* Live Push Preview */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-5 text-white shadow-lg space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5 font-bold">
                  <Smartphone className="w-4 h-4 text-sky-400" />
                  معاينة الإشعار على الأجهزة
                </span>
                <span>الآن</span>
              </div>

              <div className="bg-white/95 text-gray-900 rounded-2xl p-3.5 shadow-xl space-y-2">
                <div className="flex items-center gap-2">
                  <img
                    src="/icons/icon-96x96.png"
                    alt=""
                    className="w-6 h-6 rounded-lg object-cover border border-gray-200"
                    onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                  />
                  <span className="text-[11px] font-bold text-sky-700">منصة طب الأسنان</span>
                  <span className="text-[10px] text-gray-400 mr-auto">Push Notification</span>
                </div>
                <div className="font-bold text-sm text-gray-900 leading-snug">
                  {title.trim() || 'عنوان الإشعار سيظهر هنا...'}
                </div>
                <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                  {content.trim() || 'نص الإشعار التفصيلي الذي سيظهر للمستخدمين على أندرويد وآيفون وسطح المكتب...'}
                </p>
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt=""
                    className="w-full h-28 object-cover rounded-xl border border-gray-100 mt-1"
                  />
                )}
              </div>
            </div>

            {/* Saved Reusable Templates (Inside Send Section) */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-purple-600" />
                  <h4 className="font-bold text-sm text-gray-900">القوالب المحفوظة الجاهزة</h4>
                </div>
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {templates.length}
                </span>
              </div>

              {templates.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">
                  لا توجد قوالب محفوظة بعد. اكتب إشعاراً واضغط «حفظ كقالب جاهز».
                </p>
              ) : (
                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pl-1">
                  {templates.map((tpl) => {
                    const meta = CATEGORY_META[tpl.type] || CATEGORY_META.promotional;
                    return (
                      <div
                        key={tpl.id}
                        className="p-3 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50/30 transition-all group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleApplyTemplate(tpl)}
                            className="text-right flex-1 min-w-0"
                          >
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <span className="font-bold text-xs text-gray-900 group-hover:text-purple-700">
                                {tpl.name}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${meta.badge}`}>
                                {meta.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 line-clamp-2">{tpl.content}</p>
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              if (window.confirm(`حذف القالب «${tpl.name}»؟`)) {
                                const ok = await deleteTemplate(tpl.id);
                                if (ok) toast.success('تم حذف القالب');
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-red-500 rounded-lg shrink-0"
                            title="حذف القالب"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                          <span className="text-[10px] text-gray-400">
                            <Sparkles className="w-3 h-3 inline ml-0.5 text-purple-500" />
                            اضغط لتعبئة النموذج فوراً
                          </span>
                          <button
                            type="button"
                            onClick={() => handleApplyTemplate(tpl)}
                            className="text-[11px] font-bold text-purple-600 hover:text-purple-800"
                          >
                            استخدام القالب ←
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
