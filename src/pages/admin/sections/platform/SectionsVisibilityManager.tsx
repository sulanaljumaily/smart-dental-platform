import React, { useState, useEffect } from 'react';
import {
  LayoutGrid,
  Globe,
  Smartphone,
  Monitor,
  Save,
  RotateCcw,
  RefreshCw,
  Home,
  Stethoscope,
  ShoppingBag,
  Users,
  Briefcase,
  User,
  Package,
  Building2,
  Eye,
  EyeOff,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  usePlatform,
  SectionsNavigationConfig,
  DEFAULT_SECTIONS_CONFIG,
  NavDeviceKey,
  NavRoleKey,
  mergeSectionsConfig,
} from '../../../../contexts/PlatformContext';

interface RoleSectionItemMeta {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface RoleGroupMeta {
  role: NavRoleKey;
  title: string;
  subtitle: string;
  badge: string;
  colorClass: string;
  items: RoleSectionItemMeta[];
}

const ROLE_GROUPS: RoleGroupMeta[] = [
  {
    role: 'public',
    title: 'الزوار (قبل تسجيل الدخول)',
    subtitle: 'الأقسام الظاهرة في الشريط السفلي للزوار غير المسجلين',
    badge: 'الجمهور العام',
    colorClass: 'from-sky-500 to-blue-600',
    items: [
      { id: 'home', label: 'الرئيسية', path: '/', icon: <Home className="w-4 h-4" /> },
      { id: 'services', label: 'الخدمات الطبية', path: '/services', icon: <Stethoscope className="w-4 h-4" /> },
      { id: 'store', label: 'المتجر الطبي', path: '/store', icon: <ShoppingBag className="w-4 h-4" /> },
      { id: 'community', label: 'المجتمع الطبي', path: '/community', icon: <Users className="w-4 h-4" /> },
      { id: 'jobs', label: 'الوظائف', path: '/jobs', icon: <Briefcase className="w-4 h-4" /> },
    ],
  },
  {
    role: 'doctor',
    title: 'الأطباء (بعد تسجيل الدخول)',
    subtitle: 'الأقسام الظاهرة للأطباء والعيادات في الشريط السفلي',
    badge: 'حساب طبيب',
    colorClass: 'from-indigo-600 to-blue-700',
    items: [
      { id: 'doctor', label: 'مركز الأطباء (إدارة العيادة)', path: '/doctor', icon: <Stethoscope className="w-4 h-4" /> },
      { id: 'home', label: 'الرئيسية', path: '/', icon: <Home className="w-4 h-4" /> },
      { id: 'community', label: 'المجتمع الطبي', path: '/community', icon: <Users className="w-4 h-4" /> },
      { id: 'jobs', label: 'الوظائف الطبية', path: '/jobs', icon: <Briefcase className="w-4 h-4" /> },
      { id: 'store', label: 'المتجر الطبي', path: '/store', icon: <ShoppingBag className="w-4 h-4" /> },
      { id: 'services', label: 'الخدمات الطبية', path: '/services', icon: <Stethoscope className="w-4 h-4" /> },
    ],
  },
  {
    role: 'patient',
    title: 'المراجعون والمرضى (بعد تسجيل الدخول)',
    subtitle: 'الأقسام الظاهرة لحسابات المرضى والمراجعين',
    badge: 'حساب مراجع',
    colorClass: 'from-emerald-500 to-teal-600',
    items: [
      { id: 'patient', label: 'ملفي الطبي', path: '/patient', icon: <User className="w-4 h-4" /> },
      { id: 'services', label: 'الخدمات الطبية', path: '/services', icon: <Stethoscope className="w-4 h-4" /> },
      { id: 'store', label: 'المتجر الطبي', path: '/store', icon: <ShoppingBag className="w-4 h-4" /> },
      { id: 'home', label: 'الرئيسية', path: '/', icon: <Home className="w-4 h-4" /> },
    ],
  },
  {
    role: 'supplier',
    title: 'الموردون والشركات (بعد تسجيل الدخول)',
    subtitle: 'الأقسام الظاهرة لحسابات شركات وموردي المواد الطبية',
    badge: 'حساب مورد',
    colorClass: 'from-purple-600 to-indigo-600',
    items: [
      { id: 'supplier', label: 'مركز الموردين', path: '/supplier', icon: <Package className="w-4 h-4" /> },
      { id: 'store', label: 'المتجر الطبي', path: '/store', icon: <ShoppingBag className="w-4 h-4" /> },
      { id: 'jobs', label: 'الوظائف', path: '/jobs', icon: <Briefcase className="w-4 h-4" /> },
      { id: 'community', label: 'المجتمع الطبي', path: '/community', icon: <Users className="w-4 h-4" /> },
      { id: 'home', label: 'الرئيسية', path: '/', icon: <Home className="w-4 h-4" /> },
    ],
  },
  {
    role: 'laboratory',
    title: 'معامل الأسنان (بعد تسجيل الدخول)',
    subtitle: 'الأقسام الظاهرة لحسابات المختبرات ومعامل الأسنان',
    badge: 'حساب معمل',
    colorClass: 'from-amber-500 to-orange-600',
    items: [
      { id: 'lab', label: 'مركز المعامل', path: '/laboratory', icon: <Building2 className="w-4 h-4" /> },
      { id: 'store', label: 'المتجر الطبي', path: '/store', icon: <ShoppingBag className="w-4 h-4" /> },
      { id: 'jobs', label: 'الوظائف', path: '/jobs', icon: <Briefcase className="w-4 h-4" /> },
      { id: 'community', label: 'المجتمع الطبي', path: '/community', icon: <Users className="w-4 h-4" /> },
      { id: 'home', label: 'الرئيسية', path: '/', icon: <Home className="w-4 h-4" /> },
    ],
  },
];

export const SectionsVisibilityManager: React.FC = () => {
  const { sectionsConfig, updatePlatformConfig } = usePlatform();
  const [config, setConfig] = useState<SectionsNavigationConfig>(() =>
    mergeSectionsConfig(sectionsConfig)
  );
  const [selectedDevice, setSelectedDevice] = useState<NavDeviceKey>('web');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setConfig(mergeSectionsConfig(sectionsConfig));
  }, [sectionsConfig]);

  const activeDeviceKey: NavDeviceKey = config.separateByDevice ? selectedDevice : 'all';
  const currentDeviceData = config.devices[activeDeviceKey] || config.devices.all;

  const handleToggleItem = (role: NavRoleKey, itemId: string) => {
    setConfig((prev) => {
      const currentVal = prev.devices[activeDeviceKey]?.roles?.[role]?.[itemId] ?? true;
      const nextVal = !currentVal;

      if (!prev.separateByDevice) {
        // Sync across all device keys so switching modes later stays consistent
        const updatedDevices = { ...prev.devices };
        (['all', 'web', 'mobile', 'desktop'] as NavDeviceKey[]).forEach((dk) => {
          updatedDevices[dk] = {
            ...updatedDevices[dk],
            roles: {
              ...updatedDevices[dk].roles,
              [role]: {
                ...updatedDevices[dk].roles[role],
                [itemId]: nextVal,
              },
            },
          };
        });
        return { ...prev, devices: updatedDevices };
      }

      return {
        ...prev,
        devices: {
          ...prev.devices,
          [activeDeviceKey]: {
            ...prev.devices[activeDeviceKey],
            roles: {
              ...prev.devices[activeDeviceKey].roles,
              [role]: {
                ...prev.devices[activeDeviceKey].roles[role],
                [itemId]: nextVal,
              },
            },
          },
        },
      };
    });
  };

  const handleToggleBarEnabled = (enabled: boolean) => {
    setConfig((prev) => {
      if (!prev.separateByDevice) {
        const updatedDevices = { ...prev.devices };
        (['all', 'web', 'mobile', 'desktop'] as NavDeviceKey[]).forEach((dk) => {
          updatedDevices[dk] = { ...updatedDevices[dk], barEnabled: enabled };
        });
        return { ...prev, devices: updatedDevices };
      }
      return {
        ...prev,
        devices: {
          ...prev.devices,
          [activeDeviceKey]: {
            ...prev.devices[activeDeviceKey],
            barEnabled: enabled,
          },
        },
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const ok = await updatePlatformConfig({ sections_config: config });
      if (ok) {
        toast.success('تم حفظ ومزامنة إعدادات الأقسام والشريط السفلي لجميع الأجهزة فوراً');
      } else {
        toast.error('حدث خطأ أثناء حفظ إعدادات الأقسام');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_SECTIONS_CONFIG);
    toast.info('تمت استعادة الإعدادات الافتراضية للأقسام، اضغط حفظ لتطبيقها');
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs font-bold text-indigo-200">
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>إدارة أقسام الشريط السفلي والتنقل</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold">التحكم بظهور وإخفاء أقسام المنصة</h2>
          <p className="text-slate-300 text-xs md:text-sm max-w-2xl">
            تحكم بالأقسام التي تظهر في شريط التنقل السفلي لكل فئة من المستخدمين (الزوار، الأطباء، المرضى، الموردين، المعامل) مع إمكانية المزامنة الموحدة أو التخصيص المستقل لكل جهاز (الويب، تطبيقات الهاتف، وتطبيق الويندوز).
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>الافتراضي</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 md:flex-initial px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-60"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'جاري المزامنة...' : 'حفظ ومزامنة الأقسام'}</span>
          </button>
        </div>
      </div>

      {/* Sync Mode & Device Selector */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">نظام المزامنة بين الأجهزة (الويب والتطبيقات)</h3>
              <p className="text-xs text-gray-500">
                اختر ما إذا كنت تريد تطبيق نفس الأقسام على جميع المنصات أو تخصيص كل منصة بشكل مستقل
              </p>
            </div>
          </div>

          <div className="inline-flex bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setConfig((prev) => ({ ...prev, separateByDevice: false }))}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                !config.separateByDevice
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>مزامنة موحدة لكل الأجهزة</span>
            </button>
            <button
              type="button"
              onClick={() => setConfig((prev) => ({ ...prev, separateByDevice: true }))}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                config.separateByDevice
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>تخصيص مستقل لكل جهاز</span>
            </button>
          </div>
        </div>

        {/* Device Tabs when separateByDevice is true */}
        {config.separateByDevice && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-gray-100">
            {[
              {
                key: 'web' as NavDeviceKey,
                label: 'نسخة متصفح الويب (Web)',
                sub: 'الهواتف والحواسيب عبر المتصفح',
                icon: <Globe className="w-4 h-4" />,
              },
              {
                key: 'mobile' as NavDeviceKey,
                label: 'تطبيقات الهواتف (Android / iOS)',
                sub: 'تطبيقات الأندرويد والآيفون المثبتة',
                icon: <Smartphone className="w-4 h-4" />,
              },
              {
                key: 'desktop' as NavDeviceKey,
                label: 'تطبيق سطح المكتب (Windows)',
                sub: 'نسخة الويندوز المثبتة (.exe)',
                icon: <Monitor className="w-4 h-4" />,
              },
            ].map((dev) => {
              const active = selectedDevice === dev.key;
              return (
                <button
                  key={dev.key}
                  type="button"
                  onClick={() => setSelectedDevice(dev.key)}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border text-right transition-all ${
                    active
                      ? 'bg-indigo-50/80 border-indigo-500 text-indigo-900 shadow-xs'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      active ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {dev.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">{dev.label}</div>
                    <div className="text-[11px] opacity-75 truncate">{dev.sub}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Master Bar Enable/Disable for active device */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 bg-gray-50/70 px-4 py-3 rounded-xl">
          <div className="flex items-center gap-2.5">
            {currentDeviceData.barEnabled ? (
              <Eye className="w-4 h-4 text-emerald-600" />
            ) : (
              <EyeOff className="w-4 h-4 text-red-500" />
            )}
            <div>
              <span className="text-xs font-bold text-gray-900">
                تفعيل شريط التنقل السفلي بالكامل{' '}
                {config.separateByDevice
                  ? selectedDevice === 'web'
                    ? '(لنسخة الويب)'
                    : selectedDevice === 'mobile'
                    ? '(لتطبيقات الهاتف)'
                    : '(لتطبيق الويندوز)'
                  : '(لجميع الأجهزة)'}
              </span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={currentDeviceData.barEnabled}
            onChange={(e) => handleToggleBarEnabled(e.target.checked)}
            className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
          />
        </div>
      </div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {ROLE_GROUPS.map((group) => {
          const roleState = currentDeviceData.roles[group.role] || {};
          const enabledCount = group.items.filter((i) => roleState[i.id] !== false).length;

          return (
            <div
              key={group.role}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col"
            >
              {/* Card Header */}
              <div className={`bg-gradient-to-r ${group.colorClass} px-5 py-4 text-white flex items-center justify-between`}>
                <div>
                  <h3 className="font-bold text-base">{group.title}</h3>
                  <p className="text-white/80 text-xs mt-0.5">{group.subtitle}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="bg-white/20 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                    {group.badge}
                  </span>
                  <span className="text-[11px] text-white/90 font-medium">
                    مفعل: {enabledCount} من {group.items.length}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="p-4 divide-y divide-gray-100 flex-1">
                {group.items.map((item) => {
                  const isVisible = roleState[item.id] !== false;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleItem(group.role, item.id)}
                      className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-gray-50/80 rounded-xl cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            isVisible
                              ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <div
                            className={`text-sm font-bold truncate ${
                              isVisible ? 'text-gray-900' : 'text-gray-400 line-through'
                            }`}
                          >
                            {item.label}
                          </div>
                          <div className="text-[11px] text-gray-400 font-mono" dir="ltr">
                            {item.path}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                            isVisible
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {isVisible ? 'ظاهر' : 'مخفي'}
                        </span>
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => {}}
                          className="w-5 h-5 accent-indigo-600 rounded pointer-events-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
