import React, { useEffect, useState } from 'react';
import { SplashScreen as CapacitorSplashScreen } from '@capacitor/splash-screen';
import './SplashScreen.css';

interface SplashScreenProps {
  isVisible?: boolean;
  onHide?: () => void;
  duration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  isVisible = true,
  onHide,
  duration = 2600,
}) => {
  const [show, setShow] = useState(isVisible);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const isPatientApp = import.meta.env.VITE_BUILD_TARGET === 'patient';
  const isProApp = import.meta.env.VITE_BUILD_TARGET === 'pro';

  // العنوان الرئيسي الموحد
  const mainTitle = 'منصة طب الأسنان';
  const englishTitle = 'DENTAL PLATFORM';

  // الشعار الملم والشامل لجميع أركان المنظومة
  const platformSlogan = isPatientApp
    ? 'بوابتكم الموحدة لخدمات ورعاية طب الأسنان'
    : isProApp
    ? 'المنظومة الرقمية المتكاملة لإدارة العيادات والمراكز التخصصية'
    : 'المنظومة الرقمية الشاملة والمتكاملة لطب وجراحة الفم والأسنان';

  // أركان المنصة الشاملة
  const pillars = isPatientApp
    ? ['حجز المواعيد', 'الملف الطبي', 'استشارات فورية', 'عيادات معتمدة']
    : isProApp
    ? ['إدارة العيادات', 'الملفات الطبية', 'المعامل والمالية', 'الذكاء الاصطناعي']
    : ['العيادات', 'الأطباء', 'المراجعين', 'المعامل', 'المستلزمات'];

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      setIsFadingOut(false);

      // تنسيق الإخفاء مع بيئة تطبيقات الموبايل Capacitor Native
      CapacitorSplashScreen.show({
        autoHide: true,
        showDuration: duration,
      }).catch(() => {
        // تشغيل على المتصفح أو تطبيق الويندوز Tauri
      });

      // بدء التلاشي الانسيابي قبل الإغلاق بـ 400ms
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, Math.max(duration - 400, 800));

      const hideTimer = setTimeout(() => {
        setShow(false);
        if (onHide) onHide();
      }, duration);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [isVisible, duration, onHide]);

  if (!show) return null;

  return (
    <div
      className={`splash-screen ${isFadingOut ? 'splash-fade-out' : ''}`}
      dir="rtl"
      aria-label="شاشة التحميل - منصة طب الأسنان"
    >
      {/* هالات الإضاءة المحيطية الناعمة */}
      <div className="splash-ambient-orb orb-1" aria-hidden="true"></div>
      <div className="splash-ambient-orb orb-2" aria-hidden="true"></div>

      <div className="splash-container">
        {/* الشعار المعتمد مع هالة النبض الفخمة */}
        <div className="splash-logo-container">
          <div className="splash-logo-glow" aria-hidden="true"></div>
          <div className="splash-logo-ring" aria-hidden="true"></div>
          <div className="splash-logo-box">
            <img
              src="/logo.svg"
              onError={(e) => {
                // استبدال بالنسخة النقطية في حال تعذر قراءة الفيكتور
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/logo.png';
              }}
              alt="شعار منصة طب الأسنان الرسمي"
              className="splash-logo-img"
            />
          </div>
        </div>

        {/* النصوص المتناسقة بدقة طبوغرافية عالية */}
        <div className="splash-text-group">
          <div className="splash-en-badge">{englishTitle}</div>
          <h1 className="splash-title">{mainTitle}</h1>
          <p className="splash-slogan">{platformSlogan}</p>

          {/* شريط أركان المنظومة الشامل */}
          <div className="splash-pillars-row">
            {pillars.map((pillar, idx) => (
              <React.Fragment key={pillar}>
                <span className="splash-pillar-item">{pillar}</span>
                {idx < pillars.length - 1 && (
                  <span className="splash-pillar-dot" aria-hidden="true">•</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* مؤشر التحميل الأنيق الانسيابي */}
        <div className="splash-loader-section">
          <div className="splash-progress-track">
            <div className="splash-progress-bar"></div>
          </div>
          <span className="splash-loading-label">جاري تهيئة المنظومة...</span>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
