import React, { useEffect, useState } from 'react';
import { SplashScreen as CapacitorSplashScreen } from '@capacitor/splash-screen';
import './SplashScreen.css';

interface SplashScreenProps {
  isVisible?: boolean;
  onHide?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ isVisible = true, onHide }) => {
  const [show, setShow] = useState(isVisible);

  const isPatientApp = import.meta.env.VITE_BUILD_TARGET === 'patient';
  const title = isPatientApp ? 'منصة طب الأسنان' : 'Dental Platform';
  const subtitle = isPatientApp ? 'صحتك وابتسامتك أولويتنا' : 'نظام إدارة العيادات الذكي';

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      CapacitorSplashScreen.show({
        autoHide: true,
        showDuration: 3000,
      }).catch(() => {
        // في حالة التشغيل على المتصفح أو بيئة لا تدعم Capacitor Native
      });

      const timer = setTimeout(() => {
        setShow(false);
        if (onHide) onHide();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onHide]);

  if (!show) return null;

  return (
    <div className="splash-screen">
      <div className="splash-container">
        {/* Icon with animation */}
        <div className="splash-icon-wrapper">
          <div className="splash-icon">
            <svg
              viewBox="0 0 200 200"
              xmlns="http://www.w3.org/2000/svg"
              className="tooth-icon"
            >
              {/* Tooth shape */}
              <path
                d="M100 20C100 20 80 40 80 70C80 100 90 130 100 150C110 130 120 100 120 70C120 40 100 20 100 20Z"
                fill="#ffffff"
              />
              {/* Shine effect */}
              <ellipse cx="90" cy="60" rx="8" ry="15" fill="rgba(255,255,255,0.4)" />
            </svg>
          </div>
        </div>

        {/* Dynamic Target Text */}
        <div className="splash-text-group">
          <h1 className="splash-title animate-fade-in-up">{title}</h1>
          <p className="splash-subtitle animate-fade-in-up-delayed">{subtitle}</p>
        </div>

        {/* Loading indicator */}
        <div className="splash-loader">
          <div className="loader-dot"></div>
          <div className="loader-dot"></div>
          <div className="loader-dot"></div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
