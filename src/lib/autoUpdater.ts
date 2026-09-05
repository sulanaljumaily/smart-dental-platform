/**
 * Dental Platform — Over-The-Air (OTA) Auto-Updater via Supabase Storage
 * يُتيح تحديث ملفات التطبيق (JS/CSS) هوائياً في الخلفية بدون الحاجة لرفع حزمة جديدة إلى المتاجر
 */
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';

export const initAutoUpdater = async (): Promise<void> => {
  // التحديثات الهوائية خاصة بتطبيقات الهواتف الأصلية (Android / iOS عبر Capacitor) فقط
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
    // إخطار Capacitor بأن الحزمة الحالية تعمل بنجاح (لمنع الـ Rollback التلقائي)
    await CapacitorUpdater.notifyAppReady().catch(() => {
      // تجاهل أي استثناء
    });

    const target = (import.meta.env.VITE_BUILD_TARGET as string) || 'pro';

    // فحص أحدث إصدار متاح لنوع التطبيق الحالي
    const { data: latest, error } = await supabase
      .from('app_versions')
      .select('*')
      .eq('target', target)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !latest || !latest.bundle_url) {
      return;
    }

    // جلب معلومات الإصدار الحالي المثبت
    const current = await CapacitorUpdater.current().catch(() => null);
    const currentVersion = current?.bundle?.version || '0.0.0';

    if (latest.version && currentVersion !== latest.version) {
      console.log(`[AutoUpdater] New update found: v${latest.version} (current: v${currentVersion})`);
      
      const downloaded = await CapacitorUpdater.download({
        url: latest.bundle_url,
        version: latest.version,
      });

      if (downloaded?.id) {
        // تعيين الحزمة الجديدة لتعمل عند إعادة فتح التطبيق
        await CapacitorUpdater.set({ id: downloaded.id });
        console.log(`[AutoUpdater] Update v${latest.version} successfully downloaded and set ✅`);
      }
    }
  } catch (err) {
    // لن يؤثر أي خطأ في التحديث على تجربة المستخدم
    console.debug('[AutoUpdater] Check completed:', err);
  }
};
