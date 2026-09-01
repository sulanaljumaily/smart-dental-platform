import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Copy, ExternalLink, Printer, Check, Smartphone, ShieldCheck } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { toast } from 'sonner';

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

  // The portal URL
  const portalUrl = `${window.location.origin}/patient-portal/${clinicId}/${patientId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    toast.success('تم نسخ رابط بوابة المراجع بنجاح');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenPortal = () => {
    window.open(portalUrl, '_blank');
  };

  const handlePrintCard = () => {
    const win = window.open('', '_blank');
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <title>بطاقة مراجع - ${patientName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800;900&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Cairo', sans-serif;
            direction: rtl;
            background: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
          }
          .card {
            width: 380px;
            border: 2px solid #2563eb;
            border-radius: 20px;
            padding: 24px;
            text-align: center;
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          }
          .clinic-header {
            font-size: 16px;
            font-weight: 900;
            color: #1e3a8a;
            margin-bottom: 2px;
          }
          .sub {
            font-size: 11px;
            color: #64748b;
            margin-bottom: 16px;
          }
          .qr-box {
            background: #fff;
            padding: 12px;
            border-radius: 16px;
            display: inline-block;
            border: 1px solid #e2e8f0;
            margin-bottom: 16px;
          }
          .patient-info {
            background: #eff6ff;
            border-radius: 12px;
            padding: 10px;
            margin-bottom: 12px;
          }
          .p-name {
            font-size: 14px;
            font-weight: 800;
            color: #1e40af;
          }
          .p-id {
            font-size: 11px;
            color: #64748b;
            font-mono: true;
          }
          .desc {
            font-size: 11px;
            color: #475569;
            line-height: 1.4;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="clinic-header">${clinicName}</div>
          <div class="sub">بطاقة الوصول الإلكترونية للمراجع</div>

          <div class="qr-box">
            <div id="qr-target"></div>
          </div>

          <div class="patient-info">
            <div class="p-name">${patientName}</div>
            <div class="p-id">رقم الملف: #${patientId} ${patientPhone ? `• ${patientPhone}` : ''}</div>
          </div>

          <div class="desc">
            امسح الرمز بكاميرا هاتفك في أي وقت للاطلاع على خطتك العلاجية، المواعيد، والسجل المالي بدون تسجيل دخول.
          </div>
        </div>

        <script src="https://unpkg.com/qrcode-generator@1.4.4/qrcode.js"></script>
        <script>
          var qr = qrcode(0, 'M');
          qr.addData("${portalUrl}");
          qr.make();
          document.getElementById('qr-target').innerHTML = qr.createSvgTag(5, 0);
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    win.document.close();
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Button
            variant="outline"
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-2 py-2.5 border-gray-200 hover:bg-gray-50 text-gray-700 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'تم النسخ!' : 'نسخ رابط البوابة'}</span>
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
