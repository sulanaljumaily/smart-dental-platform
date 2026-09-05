import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dentalplatform.pro',
  appName: 'Dental Platform',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: ['*.supabase.co', '*.supabase.io'],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      backgroundColor: '#0084D1',
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
