import React, { useEffect, useState } from 'react';
import './SplashScreen.css';

interface SplashScreenProps {
  isVisible?: boolean;
  onHide?: () => void;
  duration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  isVisible = true,
  onHide,
  duration = 2400,
}) => {
  const [show, setShow] = useState(isVisible);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      setIsFadingOut(false);

      // بدء التلاشي الانسيابي قبل الإغلاق بـ 600ms
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, Math.max(duration - 600, 1000));

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
      aria-label="منصة طب الأسنان - Dental Platform"
    >
      {/* هالة خلفية ناعمة مركزية فقط بدون أي شكل للسن */}
      <div className="splash-ambient-center-glow" aria-hidden="true"></div>

      {/* المحتوى المركزي: الشعار الأصلي بإطاره المطابق للصورة والنصوص */}
      <div className="splash-center-content">
        {/* مسرح الشعار والإطار الخارجي مع تأثيرات الحركة والهايلايت */}
        <div className="splash-frame-stage">
          {/* هالة النبض المتوهجة التفاعلية خلف الإطار البعيد عن الشعار */}
          <div className="splash-frame-aura" aria-hidden="true"></div>

          {/* الإطار الخارجي (البعيد عن الشعار) مع حركة الطفو والهايلايت */}
          <div className="splash-outer-frame">
            {/* الشعار الأصلي بتناسق الألوان والإطارات المطابقة لصورة التصميم بدقة */}
            <div className="splash-logo-card">
              <img
                src="/logo-emblem.png"
                alt="منصة طب الأسنان - Dental Platform"
                className="splash-logo-emblem-img"
              />
            </div>
          </div>
        </div>

        {/* النصوص المتطابقة تماماً من الصورة بالترتيب والتنسيق والخطوط */}
        <div className="splash-en-brand">DENTAL PLATFORM</div>
        <h1 className="splash-ar-title">منصة طب الأسنان</h1>
        <p className="splash-ar-subtitle">المنظومة الشاملة لطب الأسنان</p>
      </div>

      {/* قسم التحميل السفلي: دائرة اللودر المتدرجة وعبارة جاري تهيئة المنظومة */}
      <div className="splash-bottom-loader">
        <div className="splash-spinner-ring">
          <svg viewBox="0 0 50 50" className="splash-spinner-svg">
            <defs>
              <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="45%" stopColor="#93c5fd" stopOpacity="0.6" />
                <stop offset="85%" stopColor="#3b82f6" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0" />
              </linearGradient>
            </defs>
            <circle
              cx="25"
              cy="25"
              r="18"
              fill="none"
              stroke="url(#ring-gradient)"
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeDasharray="80 35"
            />
          </svg>
        </div>
        <p className="splash-loader-text">...جاري تهيئة المنظومة</p>
      </div>
    </div>
  );
};

export default SplashScreen;
