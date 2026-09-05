import { CapacitorConfig } from '@capacitor/cli';
import proConfig from './capacitor.pro.config';
import patientConfig from './capacitor.patient.config';

const target = process.env.VITE_BUILD_TARGET;
const config: CapacitorConfig = target === 'patient' ? patientConfig : proConfig;

export default config;
