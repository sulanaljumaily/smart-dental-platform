import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Copy, ExternalLink, Printer, Check, Smartphone, ShieldCheck, Share2, WifiOff, RefreshCw } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { toast } from 'sonner';
import { getPublicOrigin, openExternalUrl, shareContent } from '../../lib/platform';
import { printPatientQRCard } from '../../lib/printReceipt';
import {
  getResolvedPatientId,
  getPermanentPatientPortalSlug,
  runSync,
} from '../../lib/offline/syncService';
import { db } from '../../lib/offline/db';

interface PatientPortalQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string | number;
  patientName?: string;
  patientPhone?: string;
  clinicId: string | number;
  clinicName?: string;
  patient?: any;
  clinic?: any;
}

export const PatientPortalQRModal: React.FC<PatientPortalQRModalProps> = ({
  isOpen,
  onClose,
  patientId,
  patientName = 'المراجع',
  patientPhone,
  clinicId,
  clinicName = 'عيادة طب الأسنان',
  patient,
  clinic,
}) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [currentPatientId, setCurrentPatientId] = useState<string>(() =>
    getResolvedPatientId(patientId) || String(patientId)
  );
  const [isSyncingNow, setIsSyncingNow] = useState(false);

  const refreshResolvedState = useCallback(async () => {
    const resolved = getResolvedPatientId(patientId);
    if (resolved) {
      setCurrentPatientId(String(resolved));
    }
    // Check if Dexie already has the synced numeric record for this offline_id
    if (isNaN(Number(resolved))) {
      try {
        const allLocal = await db.patients.toArray();
        const matched = allLocal.find(
          (lp) =>
            String(lp.id) === String(patientId) ||
            String((lp.data as any)?.medical_history_data?.offline_id) === String(patientId)
        );
        if (matched && !isNaN(Number(matched.id))) {
          setCurrentPatientId(String(matched.id));
        }
      } catch {}
    }
  }, [patientId]);

  useEffect(() => {
    setCurrentPatientId(getResolvedPatientId(patientId) || String(patientId));
    refreshResolvedState();
  }, [patientId, isOpen, refreshResolvedState]);

  // Trigger background sync automatically if modal opens while online and patient is still unsynced
  useEffect(() => {
    if (!isOpen) return;
    if (isOnline && isNaN(Number(currentPatientId))) {
      setIsSyncingNow(true);
      runSync()
        .then(() => refreshResolvedState())
        .finally(() => setIsSyncingNow(false));
    }
  }, [isOpen, isOnline, currentPatientId, refreshResolvedState]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsSyncingNow(true);
      runSync()
        .then(() => refreshResolvedState())
        .finally(() => setIsSyncingNow(false));
    };
    const handleOffline = () => setIsOnline(false);
    const handleIdResolved = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.table === 'patients' && String(detail.oldId) === String(patientId)) {
        setCurrentPatientId(String(detail.newId));
        setIsSyncingNow(false);
      } else {
        refreshResolvedState();
      }
    };
    const handleSyncDone = () => {
      setIsSyncingNow(false);
      refreshResolvedState();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('dental-sync-id-resolved', handleIdResolved);
    window.addEventListener('dental-sync-completed', handleSyncDone);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('dental-sync-id-resolved', handleIdResolved);
      window.removeEventListener('dental-sync-completed', handleSyncDone);
    };
  }, [patientId, refreshResolvedState]);

  if (!isOpen) return null;

  const isUnsyncedOffline =
    isNaN(Number(currentPatientId)) || String(currentPatientId).startsWith('offline_');

  // Permanent portal slug: stays 100% identical whether generated offline or after syncing online!
  const portalSlug = getPermanentPatientPortalSlug(patient, currentPatientId || patientId);
  const portalUrl = `${getPublicOrigin()}/patient-portal/${clinicId}/${portalSlug}`;
  const displayFileNumber = !isUnsyncedOffline
    ? `#${currentPatientId}`
    : `#${String(portalSlug).slice(0, 8).toUpperCase()}`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(portalUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = portalUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      toast.success('تم نسخ رابط بوابة المراجع الدائم بنجاح');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('تعذر نسخ الرابط تلقائياً');
    }
  };

  const handleOpenPortal = async () => {
    if (!isOnline) {
      onClose();
      navigate(`/patient-portal/${clinicId}/${portalSlug}`);
      return;
    }
    if (isUnsyncedOffline) {
      setIsSyncingNow(true);
      try {
        await runSync();
        await refreshResolvedState();
      } finally {
        setIsSyncingNow(false);
      }
    }
    openExternalUrl(portalUrl);
  };

  const handleSharePortal = async () => {
    await shareContent({
      title: `بوابة المراجع - ${patientName}`,
      text: `مرحباً ${patientName}، يمكنك متابعة خطتك العلاجية ومواعيدك وكشف حسابك في ${clinic?.name || clinicName} عبر الرابط التالي:`,
      url: portalUrl,
    });
  };

  const handlePrintCard = () => {
    printPatientQRCard({
      patientId: currentPatientId || patientId,
      patientName,
      patientPhone,
      clinicId,
      clinicName: clinic?.name || clinicName,
      clinic,
      patient,
      portalSlug,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="بوابة المراجع الإلكترونية" size="md">
      <div className="space-y-5 text-right -mt-2" dir="rtl">
        {/* Header Info */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between gap-3.5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200 shrink-0">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">{patientName}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                رقم الملف: <span className="font-mono font-bold text-blue-700">{displayFileNumber}</span>{' '}
                {patientPhone && `• ${patientPhone}`}
              </p>
            </div>
          </div>
          {isSyncingNow && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700 bg-white px-2.5 py-1 rounded-full border border-blue-200 shadow-2xs">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
              جاري المزامنة...
            </span>
          )}
        </div>

        {/* Offline / Sync Status Notice */}
        {!isOnline && (
          <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-2.5 flex items-center gap-2 text-blue-800 text-xs">
            <WifiOff className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              رمز QR ورابط البوابة دائمان ومطابقان لقاعدة البيانات؛ يمكنك الطباعة أو النسخ أو المشاركة الآن، وستتزامن البيانات تلقائياً فور عودة الإنترنت.
            </span>
          </div>
        )}

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-gray-100 shadow-xs">
          <div className="p-3 bg-white rounded-2xl border-2 border-indigo-100 shadow-sm inline-flex">
            <QRCodeSVG value={portalUrl} size={180} level="M" />
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-xs text-indigo-700 font-semibold bg-indigo-50 px-3 py-1 rounded-full">
            <Smartphone className="w-3.5 h-3.5" />
            <span>امسح الرمز بكاميرا الهاتف للدخول الفوري</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <Button
            variant="outline"
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-2 py-2.5 border-gray-200 hover:bg-gray-50 text-gray-700 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'تم النسخ!' : 'نسخ الرابط'}</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleSharePortal}
            className="w-full flex items-center justify-center gap-2 py-2.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>مشاركة البوابة</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleOpenPortal}
            className="w-full flex items-center justify-center gap-2 py-2.5 border-blue-200 text-blue-700 hover:bg-blue-50 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>معاينة البوابة</span>
          </Button>
        </div>

        <Button
          onClick={handlePrintCard}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 py-2.5 cursor-pointer shadow-sm shadow-blue-200"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة بطاقة المراجع بـ QR Code</span>
        </Button>

        {/* Security & Access Note */}
        <div className="flex items-start gap-2 text-[11px] text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p>
            تتيح هذه البوابة للمراجعين الذين لا يملكون حساباً على المنصة الاطلاع على مواعيدهم وخطتهم العلاجية وسجل الدفعات في عيادتك فقط بوضع القراءة.
          </p>
        </div>
      </div>
    </Modal>
  );
};
