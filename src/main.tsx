import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx'
import { initSyncService } from './lib/offline/syncService'
import { initAutoUpdater } from './lib/autoUpdater'
import './index.css'
import App from './App.tsx'

// تهيئة خدمة المزامنة الذكية للأوفلاين
initSyncService();

// تهيئة التحديثات الهوائية التلقائية
initAutoUpdater();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
