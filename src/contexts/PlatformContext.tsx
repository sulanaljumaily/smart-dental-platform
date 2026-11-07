import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type StoreOptionStatus = 'active' | 'coming_soon' | 'hidden';

export interface AppsInstallConfig {
  windows: {
    exeStatus: StoreOptionStatus;
    exeDownloadUrl: string;
    exeTitle: string;
    exeSubtitle: string;
    exeComingSoonMessage: string;
    pwaEnabled: boolean;
    pwaTitle: string;
    pwaSubtitle: string;
    latestVersion: string;
    updateDownloadUrl: string;
    releaseNotes: string;
    autoUpdateEnabled: boolean;
    forceUpdate: boolean;
  };
  android: {
    playStoreStatus: StoreOptionStatus;
    playStoreProUrl: string;
    playStorePatientUrl: string;
    playStoreComingSoonMessage: string;
    directApkEnabled: boolean;
    directApkProUrl: string;
    directApkPatientUrl: string;
    directApkTitle: string;
    pwaEnabled: boolean;
  };
  ios: {
    appStoreStatus: StoreOptionStatus;
    appStoreProUrl: string;
    appStorePatientUrl: string;
    appStoreComingSoonMessage: string;
    homeScreenGuideEnabled: boolean;
  };
}

export type NavRoleKey = 'public' | 'doctor' | 'patient' | 'supplier' | 'laboratory';
export type NavDeviceKey = 'all' | 'web' | 'mobile' | 'desktop';

export interface DeviceRoleNavConfig {
  barEnabled: boolean;
  roles: Record<NavRoleKey, Record<string, boolean>>;
}

export interface SectionsNavigationConfig {
  separateByDevice: boolean;
  devices: Record<NavDeviceKey, DeviceRoleNavConfig>;
}

export const DEFAULT_APPS_CONFIG: AppsInstallConfig = {
  windows: {
    exeStatus: 'active',
    exeDownloadUrl: '',
    exeTitle: 'تثبيت نسخة ويندوز (أوفلاين)',
    exeSubtitle: 'برنامج سطح المكتب المتكامل • يعمل بدون إنترنت ويدعم الطابعات الحرارية',
    exeComingSoonMessage: 'نسخة الويندوز المحدثة ستتوفر للتحميل قريباً!',
    pwaEnabled: true,
    pwaTitle: 'تثبيت نسخة الويب السريعة',
    pwaSubtitle: 'تثبيت مباشر خفيف على المتصفح للوصول السريع من سطح المكتب',
    latestVersion: '1.0.0',
    updateDownloadUrl: '',
    releaseNotes: 'تحسينات في الأداء والطباعة الحرارية والمزامنة التلقائية.',
    autoUpdateEnabled: true,
    forceUpdate: false,
  },
  android: {
    playStoreStatus: 'coming_soon',
    playStoreProUrl: '',
    playStorePatientUrl: '',
    playStoreComingSoonMessage: 'تطبيق المنصة على متجر Google Play سيتوفر قريباً! يمكنك حالياً تحميل نسخة الأندرويد المباشرة (APK) أو تثبيت نسخة الويب.',
    directApkEnabled: true,
    directApkProUrl: '',
    directApkPatientUrl: '',
    directApkTitle: 'تحميل تطبيق الأندرويد المباشر (APK)',
    pwaEnabled: true,
  },
  ios: {
    appStoreStatus: 'coming_soon',
    appStoreProUrl: '',
    appStorePatientUrl: '',
    appStoreComingSoonMessage: 'تطبيق المنصة على متجر Apple App Store سيتوفر قريباً! يمكنك حالياً استخدام خيار (إضافة إلى الشاشة الرئيسية) أدناه لتثبيت التطبيق فوراً.',
    homeScreenGuideEnabled: true,
  },
};

const createDefaultDeviceRoleNav = (): DeviceRoleNavConfig => ({
  barEnabled: true,
  roles: {
    public: {
      store: true,
      home: true,
      services: true,
      community: false,
      jobs: false,
    },
    doctor: {
      home: true,
      community: true,
      doctor: true,
      jobs: true,
      store: true,
      services: false,
    },
    patient: {
      store: true,
      patient: true,
      services: true,
      home: false,
    },
    supplier: {
      store: true,
      supplier: true,
      jobs: true,
      community: false,
      home: false,
    },
    laboratory: {
      store: true,
      lab: true,
      jobs: true,
      community: false,
      home: false,
    },
  },
});

export const DEFAULT_SECTIONS_CONFIG: SectionsNavigationConfig = {
  separateByDevice: false,
  devices: {
    all: createDefaultDeviceRoleNav(),
    web: createDefaultDeviceRoleNav(),
    mobile: createDefaultDeviceRoleNav(),
    desktop: createDefaultDeviceRoleNav(),
  },
};

export interface PlatformSettings {
  contact_email?: string;
  support_phone?: string;
  platform_fee_percentage?: number;
  logo_url?: string;
  platform_title_ar?: string;
  platform_name_en?: string;
  footer_text?: string;
  apps_config?: AppsInstallConfig;
  sections_config?: SectionsNavigationConfig;
  [key: string]: any;
}

interface PlatformContextType {
  settings: PlatformSettings;
  appsConfig: AppsInstallConfig;
  sectionsConfig: SectionsNavigationConfig;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  updatePlatformConfig: (partial: Partial<PlatformSettings>) => Promise<boolean>;
}

const LOCAL_CACHE_KEY = 'dental_platform_config_cache_v1';

export const mergeAppsConfig = (raw?: Partial<AppsInstallConfig>): AppsInstallConfig => ({
  windows: { ...DEFAULT_APPS_CONFIG.windows, ...(raw?.windows || {}) },
  android: { ...DEFAULT_APPS_CONFIG.android, ...(raw?.android || {}) },
  ios: { ...DEFAULT_APPS_CONFIG.ios, ...(raw?.ios || {}) },
});

export const mergeSectionsConfig = (raw?: Partial<SectionsNavigationConfig>): SectionsNavigationConfig => {
  const base = DEFAULT_SECTIONS_CONFIG;
  const mergeDevice = (devKey: NavDeviceKey): DeviceRoleNavConfig => {
    const src = raw?.devices?.[devKey];
    const def = base.devices[devKey];
    return {
      barEnabled: src?.barEnabled ?? def.barEnabled,
      roles: {
        public: { ...def.roles.public, ...(src?.roles?.public || {}) },
        doctor: { ...def.roles.doctor, ...(src?.roles?.doctor || {}) },
        patient: { ...def.roles.patient, ...(src?.roles?.patient || {}) },
        supplier: { ...def.roles.supplier, ...(src?.roles?.supplier || {}) },
        laboratory: { ...def.roles.laboratory, ...(src?.roles?.laboratory || {}) },
      },
    };
  };

  return {
    separateByDevice: raw?.separateByDevice ?? base.separateByDevice,
    devices: {
      all: mergeDevice('all'),
      web: mergeDevice('web'),
      mobile: mergeDevice('mobile'),
      desktop: mergeDevice('desktop'),
    },
  };
};

const PlatformContext = createContext<PlatformContextType>({
  settings: {},
  appsConfig: DEFAULT_APPS_CONFIG,
  sectionsConfig: DEFAULT_SECTIONS_CONFIG,
  loading: true,
  refreshSettings: async () => {},
  updatePlatformConfig: async () => false,
});

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<PlatformSettings>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return {};
  });
  const [loading, setLoading] = useState(true);

  const applyAndCacheSettings = useCallback((val: PlatformSettings) => {
    setSettings(val);
    try {
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(val));
    } catch {
      // ignore
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'platform_config')
        .maybeSingle();

      if (data?.value) {
        applyAndCacheSettings(data.value);
      }
    } catch (error) {
      console.error('Error fetching platform settings:', error);
    } finally {
      setLoading(false);
    }
  }, [applyAndCacheSettings]);

  const updatePlatformConfig = useCallback(
    async (partial: Partial<PlatformSettings>): Promise<boolean> => {
      try {
        const { data: currentRow } = await supabase
          .from('admin_settings')
          .select('value')
          .eq('key', 'platform_config')
          .maybeSingle();

        const currentVal = currentRow?.value || settings || {};
        const updated: PlatformSettings = {
          ...currentVal,
          ...partial,
        };

        const { error } = await supabase
          .from('admin_settings')
          .upsert({ key: 'platform_config', value: updated }, { onConflict: 'key' });

        if (error) throw error;

        applyAndCacheSettings(updated);

        // Broadcast live update to all connected clients (Web, Desktop, Mobile)
        try {
          const ch = supabase.channel('platform-config-live-sync');
          ch.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              await ch.send({
                type: 'broadcast',
                event: 'config-updated',
                payload: updated,
              });
              setTimeout(() => supabase.removeChannel(ch), 1000);
            }
          });
        } catch {
          // ignore broadcast error
        }

        return true;
      } catch (err) {
        console.error('Error updating platform config:', err);
        return false;
      }
    },
    [settings, applyAndCacheSettings]
  );

  useEffect(() => {
    fetchSettings();

    // Subscribe to realtime changes on admin_settings and broadcast channel
    const channel = supabase
      .channel('platform-config-live-sync')
      .on('broadcast', { event: 'config-updated' }, (msg) => {
        if (msg?.payload) {
          applyAndCacheSettings(msg.payload as PlatformSettings);
        }
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_settings', filter: 'key=eq.platform_config' },
        (payload: any) => {
          if (payload?.new?.value) {
            applyAndCacheSettings(payload.new.value as PlatformSettings);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSettings, applyAndCacheSettings]);

  const appsConfig = mergeAppsConfig(settings.apps_config);
  const sectionsConfig = mergeSectionsConfig(settings.sections_config);

  return (
    <PlatformContext.Provider
      value={{
        settings,
        appsConfig,
        sectionsConfig,
        loading,
        refreshSettings: fetchSettings,
        updatePlatformConfig,
      }}
    >
      {children}
    </PlatformContext.Provider>
  );
};

export const usePlatform = () => useContext(PlatformContext);
