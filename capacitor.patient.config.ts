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
      launchShowDuration: 3000,
      backgroundColor: '#1E40AF',
      showSpinner: false,
      splashImmersive: true,
      layoutName: 'splash',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
