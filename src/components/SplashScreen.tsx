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

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      setIsFadingOut(false);

      // تنسيق الإخفاء مع بيئة كاباسيتور للهواتف الأصلية
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
      aria-label="منصة طب الأسنان - Dental Platform"
    >
      {/* هالة خلفية ناعمة مركزية فقط بدون أي شكل للسن */}
      <div className="splash-ambient-center-glow" aria-hidden="true"></div>

      {/* المحتوى المركزي: الشعار الأصلي بإطاره المطابق للصورة والنصوص */}
      <div className="splash-center-content">
        {/* الإطار الخارجي بنفس التباعد في صورة التصميم splash screen.jpg */}
        <div className="splash-outer-frame">
          <div className="splash-logo-card">
            <svg
              viewBox="0 0 128 128"
              className="splash-logo-svg"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* خلفية الشعار الأصلية الزرقاء بدون أي تعديل كما هي في logo.svg */}
              <path
                d="M25.736,0l77.96,0c1.181,0.074 1.642,0.154 3.672,0.647c12.715,3.09 18.172,13.094 19.605,18.445c0.662,2.474 0.764,2.942 0.769,3.753c0.003,0.504 0.008,0.587 0.008,1.513c-0,0.203 -0.006,1.308 -0.007,1.764c-0,0.049 -0.001,75.752 0,75.756c0.03,0.115 0.228,0.131 0.257,0.246l0,1.25c-0.018,0.121 -0.233,0.145 -0.251,0.266c-0.073,0.499 0.012,1.01 -0.008,1.514c-0.156,3.894 -3.49,10.83 -5.61,12.976c-3.002,3.039 -2.735,3.333 -5.849,5.382c-8.099,5.328 -15.838,4.155 -15.907,4.155c-70.63,-0.003 -70.624,0.065 -76.765,0.036c-5.947,-0.029 -19.233,-5.555 -22.826,-19.798c-0.378,-1.5 -0.464,-1.971 -0.529,-3c-0.046,-0.738 -0.023,-1.373 -0,-1.487c0.005,-0.024 0.001,-77.786 0.001,-77.801c0.001,-0.214 -0.004,-0.549 -0.022,-1.889c-0.002,-0.116 0.009,-0.496 0.018,-0.634c0.005,-0.075 0.283,-8.083 7.875,-15.717c4.157,-4.18 11.283,-6.755 13.994,-7.046c0.69,-0.074 0.683,-0.037 0.74,-0.056c0.197,-0.065 1.851,-0.276 2.874,-0.276Z"
                fill="#0084D1"
              />
              {/* رمز المصافحة والسن الأبيض الصافي الأصلي */}
              <path
                d="M19.509,63.125c0.021,-8.31 0.003,-8.293 0.008,-9.014c0.004,-0.606 0.309,-0.502 0.786,-0.137c12.187,9.322 37.838,28.133 41.144,30.558c1.389,1.018 2.375,0.907 1.535,2.407c-3.689,6.592 3.204,8.923 4.911,8.509c3.296,-0.798 4.384,-2.929 5.668,-1.986c1.07,0.786 12.606,9.255 13.29,9.935c0.524,0.52 -0.099,0.593 -7.148,5.835c-4.138,3.077 -4.204,3.515 -5.855,2.975c-11.689,-3.824 -19.432,-5.589 -28.734,-9.306c-26.917,-10.755 -25.606,-26.448 -25.606,-39.776Z"
                fill="#ffffff"
              />
              <path
                d="M110.741,46.375c-0.01,2.922 0.659,3.399 -1.7,5.14c-6.621,4.888 -6.576,4.942 -7.178,5.328c-0.473,0.303 -0.252,-0.35 -0.344,-18.466c-0.063,-12.433 -11.552,-20.615 -23.917,-14.799c-8.476,3.987 -14.746,5.194 -24.5,0.09c-10.884,-5.696 -25.195,0.847 -24.357,16.704c0.233,4.409 0.011,5.111 0.03,16.243c0.001,0.773 -0.663,0.094 -4.973,-3.147c-3.691,-2.776 -4.262,-2.814 -4.276,-4.092c-0.114,-10.141 -1.971,-27.519 15.821,-35.068c11.989,-5.086 22.949,1.913 24.028,2.317c12.027,4.503 16.103,-6.593 30.981,-3.65c10.828,2.142 20.196,11.378 20.377,24.898c0.009,0.68 0.085,6.281 0.008,8.502Z"
                fill="#ffffff"
              />
              <path
                d="M110.741,60.375c0.465,17.434 -0.12,25.703 -13.943,36.15c-0.665,0.502 -8.055,6.088 -8.419,6.128c-0.269,0.03 -0.26,-0.065 -9.588,-6.916c-0.175,-0.128 -0.164,-0.121 -2.731,-2.024c-1.46,-1.083 -2.351,-1.179 -1.285,-2.661c0.079,-0.11 0.812,-1.562 -0.915,-0.706c-1.211,0.6 -7.087,6.784 -9.635,0.984c-1.347,-3.065 0.817,-3.877 12.083,-12.296c17.005,-12.708 17.018,-12.649 18.495,-13.753c15.305,-11.444 16.125,-12.107 16.087,-11.159c-0.038,0.958 -0.169,0.932 -0.15,6.252Z"
                fill="#ffffff"
              />
              <path
                d="M66.361,117.758c-4.504,0.104 -4.676,-0.233 -17.65,-9.998c-2.503,-1.884 -1.846,-2.428 -1.613,-2.464c0.082,-0.013 22.552,7.242 24.512,7.875c0.103,0.033 1.296,0.418 1.174,0.665c-0.396,0.804 -1.66,1.766 -1.828,1.894c-2.324,1.769 -3.577,1.737 -4.595,2.028Z"
                fill="#ffffff"
              />
            </svg>
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
