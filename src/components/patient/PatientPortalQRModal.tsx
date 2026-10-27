import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Copy, ExternalLink, Printer, Check, Smartphone, ShieldCheck, Share2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { toast } from 'sonner';
import { getPublicOrigin, openExternalUrl } from '../../lib/platform';
import { printPatientQRCard } from '../../lib/printReceipt';

interface PatientPortalQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string | number;
  patientName?: string;
  patientPhone?: string;
  clinicId: string | number;
  clinicName?: string;
}

export const PatientPortalQRModal: React.FC<PatientPortalQRModalProps> = ({
  isOpen,
  onClose,
  patientId,
  patientName = 'المراجع',
  patientPhone,
  clinicId,
  clinicName = 'عيادة طب الأسنان'
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  // Always use public domain in mobile/desktop native apps so QR & external browser links resolve properly
  const portalUrl = `${getPublicOrigin()}/patient-portal/${clinicId}/${patientId}`;

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
      toast.success('تم نسخ رابط بوابة المراجع بنجاح');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('تعذر نسخ الرابط تلقائياً');
    }
  };

  const handleOpenPortal = () => {
    openExternalUrl(portalUrl);
  };

  const handleSharePortal = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `بوابة المراجع - ${patientName}`,
          text: `مرحباً ${patientName}، يمكنك متابعة خطتك العلاجية ومواعيدك وكشف حسابك في ${clinicName} عبر الرابط التالي:`,
          url: portalUrl,
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }
    await handleCopyLink();
  };

  const handlePrintCard = () => {
    printPatientQRCard({
      patientId,
      patientName,
      patientPhone,
      clinicId,
      clinicName
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="بوابة المراجع الإلكترونية" size="md">
      <div className="space-y-5 text-right -mt-2" dir="rtl">
        {/* Header Info */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200 shrink-0">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">{patientName}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              رقم الملف: #{patientId} {patientPhone && `• ${patientPhone}`}
            </p>
          </div>
        </div>

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
