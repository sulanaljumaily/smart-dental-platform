import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Smartphone,
  Apple,
  Save,
  Upload,
  RefreshCw,
  CheckCircle2,
  Clock,
  EyeOff,
  Download,
  Sparkles,
  Globe,
  ShieldCheck,
  Info,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../lib/supabase';
import {
  usePlatform,
  AppsInstallConfig,
  DEFAULT_APPS_CONFIG,
  StoreOptionStatus,
  mergeAppsConfig,
} from '../../../../contexts/PlatformContext';

export const AppsManager: React.FC = () => {
  const { appsConfig, updatePlatformConfig } = usePlatform();
  const [config, setConfig] = useState<AppsInstallConfig>(() => mergeAppsConfig(appsConfig));
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  useEffect(() => {
    setConfig(mergeAppsConfig(appsConfig));
  }, [appsConfig]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const ok = await updatePlatformConfig({ apps_config: config });
      if (ok) {
        toast.success('تم حفظ ومزامنة إعدادات التطبيقات والتحديثات بنجاح');
      } else {
        toast.error('تعذر حفظ إعدادات التطبيقات');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_APPS_CONFIG);
    toast.info('تمت استعادة القيم الافتراضية، اضغط "حفظ الإعدادات" لتطبيقها');
  };

  const handleFileUpload = async (
    file: File,
    folder: string,
    onUrlReady: (url: string) => void,
    fieldKey: string
  ) => {
    setUploadingField(fieldKey);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `releases/${folder}/${Date.now()}_${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from('platform-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('platform-assets').getPublicUrl(filePath);
      if (data?.publicUrl) {
        onUrlReady(data.publicUrl);
        toast.success('تم رفع الملف بنجاح وتعبئة الرابط تلقائياً');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err?.message || 'فشل رفع الملف، يمكنك وضع رابط التحميل المباشر يدوياً');
    } finally {
      setUploadingField(null);
    }
  };

  const renderStatusSelector = (
    current: StoreOptionStatus,
    onChange: (val: StoreOptionStatus) => void
  ) => {
    const options: { value: StoreOptionStatus; label: string; icon: React.ReactNode; activeClass: string }[] = [
      {
        value: 'active',
        label: 'متاح للتحميل (رابط مفعل)',
        icon: <CheckCircle2 className="w-4 h-4" />,
        activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-sm',
      },
      {
        value: 'coming_soon',
        label: 'سيتوفر قريباً (رسالة تنبيه)',
        icon: <Clock className="w-4 h-4" />,
        activeClass: 'bg-amber-500 text-white border-amber-500 shadow-sm',
      },
      {
        value: 'hidden',
        label: 'مخفي تماماً',
        icon: <EyeOff className="w-4 h-4" />,
        activeClass: 'bg-gray-700 text-white border-gray-700 shadow-sm',
      },
    ];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {options.map((opt) => {
          const isSelected = current === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                isSelected
                  ? opt.activeClass
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0D8ABC] to-[#085f85] rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 bg-white/15 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>مركز إدارة التطبيقات والتحديثات الذكي</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold">إدارة تطبيقات المنصة والتحديثات التلقائية</h2>
          <p className="text-white/85 text-xs md:text-sm max-w-2xl">
            تحكم في خيارات تثبيت التطبيق التي تظهر للمستخدمين حسب أجهزتهم (ويندوز، أندرويد، آيفون)، مع دعم رسائل «سيتوفر قريباً على Google Play / App Store» ونظام التحديث التلقائي لنسخة سطح المكتب.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>الافتراضي</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 md:flex-initial px-5 py-2.5 rounded-xl bg-white text-[#0D8ABC] hover:bg-blue-50 font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-60"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'جاري الحفظ...' : 'حفظ ومزامنة الإعدادات'}</span>
          </button>
        </div>
      </div>

      {/* 1. Windows Desktop Installation & Auto-Updates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Windows Installer Options */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Monitor className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">تثبيت سطح المكتب (Windows + Web PWA)</h3>
                <p className="text-xs text-gray-500">يظهر عند الضغط على «تثبيت التطبيق» من الحاسوب</p>
              </div>
            </div>
            <span className="text-[11px] font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
              Windows PC
            </span>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold text-gray-700">
              حالة خيار تثبيت نسخة ويندوز أوفلاين (.exe / .msi)
            </label>
            {renderStatusSelector(config.windows.exeStatus, (val) =>
              setConfig((prev) => ({
                ...prev,
                windows: { ...prev.windows, exeStatus: val },
              }))
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">عنوان خيار الويندوز</label>
              <input
                type="text"
                value={config.windows.exeTitle}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    windows: { ...prev.windows, exeTitle: e.target.value },
                  }))
                }
                className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">الوصف المختصر</label>
              <input
                type="text"
                value={config.windows.exeSubtitle}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    windows: { ...prev.windows, exeSubtitle: e.target.value },
                  }))
                }
                className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              رابط تحميل ملف تنصيب الويندوز المباشر (.exe / .msi)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                dir="ltr"
                placeholder="https://.../Dental-Platform-Setup.exe"
                value={config.windows.exeDownloadUrl}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    windows: { ...prev.windows, exeDownloadUrl: e.target.value },
                  }))
                }
                className="flex-1 px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <label className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 shrink-0 border border-blue-200 transition-colors">
                {uploadingField === 'win-exe' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span>رفع ملف</span>
                <input
                  type="file"
                  accept=".exe,.msi,.zip"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(
                        file,
                        'windows',
                        (url) =>
                          setConfig((prev) => ({
                            ...prev,
                            windows: { ...prev.windows, exeDownloadUrl: url },
                          })),
                        'win-exe'
                      );
                    }
                  }}
                />
              </label>
            </div>
          </div>

          {config.windows.exeStatus === 'coming_soon' && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5">
              <label className="block text-xs font-bold text-amber-900 mb-1">
                رسالة «سيتوفر قريباً» لنسخة الويندوز
              </label>
              <input
                type="text"
                value={config.windows.exeComingSoonMessage}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    windows: { ...prev.windows, exeComingSoonMessage: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          )}

          {/* Desktop Web PWA Option */}
          <div className="pt-3 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-teal-600" />
                <span className="text-sm font-bold text-gray-800">
                  إظهار خيار «تثبيت نسخة الويب السريعة (PWA)» للحاسوب
                </span>
              </div>
              <input
                type="checkbox"
                checked={config.windows.pwaEnabled}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    windows: { ...prev.windows, pwaEnabled: e.target.checked },
                  }))
                }
                className="w-5 h-5 accent-[#0D8ABC] rounded cursor-pointer"
              />
            </div>

            {config.windows.pwaEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="عنوان خيار الويب"
                  value={config.windows.pwaTitle}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      windows: { ...prev.windows, pwaTitle: e.target.value },
                    }))
                  }
                  className="px-3 py-2 border border-gray-200 rounded-xl text-xs"
                />
                <input
                  type="text"
                  placeholder="وصف خيار الويب"
                  value={config.windows.pwaSubtitle}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      windows: { ...prev.windows, pwaSubtitle: e.target.value },
                    }))
                  }
                  className="px-3 py-2 border border-gray-200 rounded-xl text-xs"
                />
              </div>
            )}
          </div>
        </div>

        {/* Windows Auto-Update System */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">نظام التحديث التلقائي لنسخة الويندوز</h3>
                <p className="text-xs text-gray-500">
                  يفحص التطبيق المثبت لدى الأطباء رقم الإصدار تلقائياً ويعرض نافذة التحديث المباشر
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full">
              Auto-Updater
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 bg-gray-50/60 cursor-pointer">
              <div>
                <div className="text-xs font-bold text-gray-900">تفعيل التحديث التلقائي</div>
                <div className="text-[11px] text-gray-500">إشعار المستخدمين عند توفر إصدار أحدث</div>
              </div>
              <input
                type="checkbox"
                checked={config.windows.autoUpdateEnabled}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    windows: { ...prev.windows, autoUpdateEnabled: e.target.checked },
                  }))
                }
                className="w-5 h-5 accent-indigo-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl border border-red-100 bg-red-50/40 cursor-pointer">
              <div>
                <div className="text-xs font-bold text-red-900">تحديث إجباري (Force Update)</div>
                <div className="text-[11px] text-red-600">منع إغلاق نافذة التحديث حتى الترقية</div>
              </div>
              <input
                type="checkbox"
                checked={config.windows.forceUpdate}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    windows: { ...prev.windows, forceUpdate: e.target.checked },
                  }))
                }
                className="w-5 h-5 accent-red-600 rounded"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                رقم الإصدار الأحدث (Version)
              </label>
              <input
                type="text"
                dir="ltr"
                placeholder="1.0.0"
                value={config.windows.latestVersion}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    windows: { ...prev.windows, latestVersion: e.target.value },
                  }))
                }
                className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm font-mono font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                رابط ملف التحديث المباشر (أو اتركه فارغاً لاستخدام رابط المثبت أعلاه)
              </label>
              <input
                type="url"
                dir="ltr"
                placeholder="https://.../Dental-Platform-Update.exe"
                value={config.windows.updateDownloadUrl}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    windows: { ...prev.windows, updateDownloadUrl: e.target.value },
                  }))
                }
                className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              ملاحظات التحديث الجديد (Release Notes)
            </label>
            <textarea
              rows={3}
              value={config.windows.releaseNotes}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  windows: { ...prev.windows, releaseNotes: e.target.value },
                }))
              }
              placeholder="اكتب أهم المزايا والتحسينات في هذا الإصدار..."
              className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-indigo-900">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <strong>كيف يعمل التحديث التلقائي؟</strong> تحديثات واجهة المنصة والخدمات تتم فورياً عبر السحابة، أما عند إصدار نسخة سطح مكتب جديدة (مثلاً تغيير الرقم من <code className="font-mono">1.0.0</code> إلى <code className="font-mono">1.1.0</code>)، فسيظهر إشعار أنيق داخل برنامج الويندوز لتحميل وتثبيت التحديث بضغطة واحدة.
            </div>
          </div>
        </div>
      </div>

      {/* 2. Android & iOS Mobile Apps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Android Settings */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">تطبيقات الأندرويد (Google Play & APK)</h3>
                <p className="text-xs text-gray-500">خيارات التحميل لمستخدمي هواتف وأجهزة Android</p>
              </div>
            </div>
            <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
              Android
            </span>
          </div>

          {/* Google Play Status */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-gray-700">
              حالة زر متجر Google Play Store
            </label>
            {renderStatusSelector(config.android.playStoreStatus, (val) =>
              setConfig((prev) => ({
                ...prev,
                android: { ...prev.android, playStoreStatus: val },
              }))
            )}
          </div>

          {config.android.playStoreStatus === 'active' && (
            <div className="grid grid-cols-1 gap-3 bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-100">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  رابط متجر Google Play (تطبيق القطاع الطبي Pro - للأطباء والموردين والمعامل)
                </label>
                <input
                  type="url"
                  dir="ltr"
                  placeholder="https://play.google.com/store/apps/details?id=com.smartdental.pro"
                  value={config.android.playStoreProUrl}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      android: { ...prev.android, playStoreProUrl: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  رابط متجر Google Play (تطبيق المراجعين Patient - للجمهور والمرضى)
                </label>
                <input
                  type="url"
                  dir="ltr"
                  placeholder="https://play.google.com/store/apps/details?id=com.smartdental.patient"
                  value={config.android.playStorePatientUrl}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      android: { ...prev.android, playStorePatientUrl: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                />
              </div>
            </div>
          )}

          {config.android.playStoreStatus === 'coming_soon' && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5">
              <label className="block text-xs font-bold text-amber-900 mb-1">
                رسالة «سيتوفر قريباً على Google Play» (تظهر للمستخدم عند الضغط على زر المتجر)
              </label>
              <textarea
                rows={2}
                value={config.android.playStoreComingSoonMessage}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    android: { ...prev.android, playStoreComingSoonMessage: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          )}

          {/* Direct APK Section */}
          <div className="pt-3 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-gray-800">
                  تفعيل زر التحميل المباشر بصيغة APK
                </span>
              </div>
              <input
                type="checkbox"
                checked={config.android.directApkEnabled}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    android: { ...prev.android, directApkEnabled: e.target.checked },
                  }))
                }
                className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
              />
            </div>

            {config.android.directApkEnabled && (
              <div className="space-y-3 bg-gray-50/70 p-3.5 rounded-xl border border-gray-200/80">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">عنوان زر APK</label>
                  <input
                    type="text"
                    value={config.android.directApkTitle}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        android: { ...prev.android, directApkTitle: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    رابط APK المباشر لتطبيق الأطباء والقطاع الطبي (Pro APK)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      dir="ltr"
                      placeholder="https://.../dental-pro.apk"
                      value={config.android.directApkProUrl}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          android: { ...prev.android, directApkProUrl: e.target.value },
                        }))
                      }
                      className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                    />
                    <label className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1 shrink-0 border border-emerald-200">
                      {uploadingField === 'apk-pro' ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>رفع APK</span>
                      <input
                        type="file"
                        accept=".apk"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(
                              file,
                              'android-pro',
                              (url) =>
                                setConfig((prev) => ({
                                  ...prev,
                                  android: { ...prev.android, directApkProUrl: url },
                                })),
                              'apk-pro'
                            );
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    رابط APK المباشر لتطبيق المراجعين والجمهور (Patient APK)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      dir="ltr"
                      placeholder="https://.../dental-patient.apk"
                      value={config.android.directApkPatientUrl}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          android: { ...prev.android, directApkPatientUrl: e.target.value },
                        }))
                      }
                      className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                    />
                    <label className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1 shrink-0 border border-emerald-200">
                      {uploadingField === 'apk-patient' ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>رفع APK</span>
                      <input
                        type="file"
                        accept=".apk"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(
                              file,
                              'android-patient',
                              (url) =>
                                setConfig((prev) => ({
                                  ...prev,
                                  android: { ...prev.android, directApkPatientUrl: url },
                                })),
                              'apk-patient'
                            );
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-bold text-gray-700">
                إظهار خيار «تثبيت نسخة الويب السريعة (PWA)» على أندرويد
              </span>
              <input
                type="checkbox"
                checked={config.android.pwaEnabled}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    android: { ...prev.android, pwaEnabled: e.target.checked },
                  }))
                }
                className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* iOS Settings */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
                <Apple className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">تطبيقات الآيفون والآيباد (Apple iOS)</h3>
                <p className="text-xs text-gray-500">خيارات App Store والإضافة للشاشة الرئيسية في Safari</p>
              </div>
            </div>
            <span className="text-[11px] font-bold bg-slate-100 text-slate-800 px-2.5 py-1 rounded-full">
              iOS / iPadOS
            </span>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold text-gray-700">
              حالة زر متجر Apple App Store
            </label>
            {renderStatusSelector(config.ios.appStoreStatus, (val) =>
              setConfig((prev) => ({
                ...prev,
                ios: { ...prev.ios, appStoreStatus: val },
              }))
            )}
          </div>

          {config.ios.appStoreStatus === 'active' && (
            <div className="grid grid-cols-1 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  رابط App Store (تطبيق القطاع الطبي Pro - للأطباء والموردين والمعامل)
                </label>
                <input
                  type="url"
                  dir="ltr"
                  placeholder="https://apps.apple.com/app/id..."
                  value={config.ios.appStoreProUrl}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      ios: { ...prev.ios, appStoreProUrl: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  رابط App Store (تطبيق المراجعين Patient - للجمهور والمرضى)
                </label>
                <input
                  type="url"
                  dir="ltr"
                  placeholder="https://apps.apple.com/app/id..."
                  value={config.ios.appStorePatientUrl}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      ios: { ...prev.ios, appStorePatientUrl: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                />
              </div>
            </div>
          )}

          {config.ios.appStoreStatus === 'coming_soon' && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5">
              <label className="block text-xs font-bold text-amber-900 mb-1">
                رسالة «سيتوفر قريباً على App Store» (تظهر للمستخدم عند الضغط على زر المتجر)
              </label>
              <textarea
                rows={2}
                value={config.ios.appStoreComingSoonMessage}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    ios: { ...prev.ios, appStoreComingSoonMessage: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          )}

          <div className="pt-3 border-t border-gray-100">
            <label className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 bg-gray-50/60 cursor-pointer">
              <div>
                <div className="text-xs font-bold text-gray-900">
                  إظهار دليل «إضافة إلى الشاشة الرئيسية (Safari)»
                </div>
                <div className="text-[11px] text-gray-500">
                  يشرح لمستخدمي الآيفون خطوات تثبيت تطبيق الويب من متصفح سفاري بخطوتين
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.ios.homeScreenGuideEnabled}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    ios: { ...prev.ios, homeScreenGuideEnabled: e.target.checked },
                  }))
                }
                className="w-5 h-5 accent-slate-800 rounded"
              />
            </label>
          </div>

          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-blue-900">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong>ملاحظة ذكية:</strong> يميز النظام تلقائياً بين صفحات الأطباء/الموردين/المعامل وصفحات الجمهور/المراجعين، ويعرض الرابط المخصص لكل فئة، وفي حال ترك أحد الرابطين فارغاً يستخدم الرابط المتوفر تلقائياً.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
