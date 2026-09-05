import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dentalplatform.pro',
  appName: 'Dental Platform',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: ['*.supabase.co', '*.supabase.io'],
  },
  plugins: {},
};

export default config;
