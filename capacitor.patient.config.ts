import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dentalplatform.patient',
  appName: 'منصة طب الأسنان',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: ['*.supabase.co', '*.supabase.io'],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#030f21',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
