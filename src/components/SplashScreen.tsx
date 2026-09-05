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

  // الشعار الملم والشامل لكافة أرجاء المنظومة
  const platformSlogan = isPatientApp
    ? 'بوابتكم الموحدة لخدمات ورعاية طب الأسنان'
    : isProApp
    ? 'المنظومة الرقمية المتكاملة لإدارة العيادات والمراكز التخصصية'
    : 'المنظومة الرقمية الشاملة والمتكاملة لطب وجراحة الفم والأسنان';

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      setIsFadingOut(false);

      // تنسيق الإخفاء مع بيئة كاباسيتور للهواتف
      CapacitorSplashScreen.show({
        autoHide: true,
        showDuration: duration,
      }).catch(() => {
        // متصفح أو سطح المكتب
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
      {/* هالات إضاءة ملكية متطابقة مع ألوان صفحة تسجيل الدخول */}
      <div className="splash-ambient-orb orb-1" aria-hidden="true"></div>
      <div className="splash-ambient-orb orb-2" aria-hidden="true"></div>

      <div className="splash-container">
        {/* قاعدة الشعار البيضاء المقتبسة من كرت صفحة تسجيل الدخول لإبراز الشعار الأزرق بدقة */}
        <div className="splash-logo-wrapper">
          <div className="splash-logo-card">
            <img
              src="/logo.svg"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/logo.png';
              }}
              alt="شعار منصة طب الأسنان الرسمي"
              className="splash-logo-img"
            />
          </div>
        </div>

        {/* النصوص المتناسقة بالأبيض النقي دون تصنيفات */}
        <div className="splash-text-group">
          <div className="splash-en-badge">{englishTitle}</div>
          <h1 className="splash-title">{mainTitle}</h1>
          <p className="splash-slogan">{platformSlogan}</p>
        </div>

        {/* مؤشر التحميل الانسيابي بالأبيض والشفافية */}
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
