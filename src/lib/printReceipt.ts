import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import { formatCategoryName } from './utils';

// Helper to convert number to Arabic words (Iraqi dinar formatter)
export const numberToArabicWords = (num: number): string => {
  if (!num || isNaN(num)) return 'صفر دينار عراقي';
  return `${Number(num).toLocaleString('ar-IQ')} دينار عراقي فقط لا غير`;
};

// Generates an aesthetic Code128-like vector barcode
const generateBarcodeSvg = (code: string) => {
  const bars = [
    2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2, 2, 1, 1, 2, 3, 1, 1, 2, 2, 1, 3, 1,
    2, 1, 1, 3, 2, 1, 2, 2, 1, 1, 3, 1, 1, 2, 3, 2, 1, 1, 2, 1, 3, 2, 1, 1, 2
  ];
  let x = 8;
  const rects = bars.map((w, idx) => {
    const isBlack = idx % 2 === 0;
    const rect = isBlack ? `<rect x="${x}" y="0" width="${w * 1.3}" height="24" fill="#000000" />` : '';
    x += w * 1.3 + (idx % 3 === 0 ? 0.8 : 0.4);
    return rect;
  }).join('');

  return `
    <div style="text-align: center; margin: 4px 0 6px 0;">
      <svg width="${x + 8}" height="24" viewBox="0 0 ${x + 8} 24" style="display: inline-block;">
        ${rects}
      </svg>
      <div style="font-family: 'Courier New', monospace; font-size: 9px; font-weight: 800; letter-spacing: 1.5px; color: #1e293b; margin-top: 1px;">
        * ${code} *
      </div>
    </div>
  `;
};

const getThermalPrintStyles = () => `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@500;700;800;900&display=swap');
  
  @page {
    size: 80mm auto;
    margin: 2mm 2mm 4mm 2mm;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  
  body {
    font-family: 'Cairo', 'Tajawal', sans-serif !important;
    direction: rtl !important;
    text-align: right !important;
    background: #ffffff !important;
    color: #000000 !important;
    padding: 2px 3px !important;
    font-size: 11px !important;
    line-height: 1.35 !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    width: 74mm;
    margin: 0 auto;
  }

  .thermal-receipt {
    width: 100%;
    max-width: 74mm;
    margin: 0 auto;
    background: #ffffff;
    border: 1px dashed #cbd5e1;
    border-radius: 12px;
    padding: 10px 8px;
  }

  /* Header Section */
  .receipt-header {
    text-align: center;
    padding-bottom: 4px;
    position: relative;
  }

  .logo-frame {
    width: 68px;
    height: 68px;
    margin: 0 auto 6px auto;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #0f172a;
    border-radius: 16px;
    padding: 3px;
    background: #ffffff;
    box-shadow: 0 1px 4px rgba(0,0,0,0.12);
    overflow: hidden;
  }

  .clinic-logo-img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 12px;
  }

  .clinic-logo-svg {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0f172a;
    color: #ffffff;
    border-radius: 12px;
  }

  .clinic-title {
    font-size: 16px;
    font-weight: 900;
    color: #000000;
    line-height: 1.25;
    margin-bottom: 2px;
    letter-spacing: -0.2px;
  }

  .clinic-subtitle {
    font-size: 10px;
    font-weight: 700;
    color: #334155;
    margin-bottom: 3px;
  }

  .clinic-meta-row {
    font-size: 9.5px;
    color: #475569;
    font-weight: 600;
    display: flex;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  /* Decorative Dividers */
  .divider-teeth {
    border-top: 1.5px dashed #000000;
    margin: 8px 0 6px 0;
  }

  .divider-double {
    border-top: 2px solid #000000;
    border-bottom: 1px solid #000000;
    height: 2px;
    margin: 8px 0;
  }

  .divider-dotted {
    border-top: 1px dotted #94a3b8;
    margin: 5px 0;
  }

  /* Title Badge Inverted (Luxury Black Pill) */
  .receipt-badge-wrap {
    text-align: center;
    margin: 4px 0 4px 0;
  }

  .receipt-badge {
    display: inline-block;
    background: #000000;
    color: #ffffff;
    font-weight: 900;
    font-size: 11.5px;
    padding: 3px 16px;
    border-radius: 20px;
    letter-spacing: 0.5px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.15);
  }

  .receipt-badge-exp {
    background: #7f1d1d;
  }

  /* Meta Key-Value Rows */
  .meta-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 6px 8px;
    margin: 6px 0;
  }

  .kv-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 3.5px;
    font-size: 10.5px;
  }

  .kv-row:last-child {
    margin-bottom: 0;
  }

  .kv-label {
    color: #475569;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: nowrap;
  }

  .kv-val {
    color: #000000;
    font-weight: 900;
    text-align: left;
    max-width: 65%;
  }

  .pill-badge {
    background: #e2e8f0;
    color: #0f172a;
    font-weight: 800;
    font-size: 9.5px;
    padding: 1px 6px;
    border-radius: 4px;
    font-family: monospace, 'Cairo';
  }

  /* Description Card */
  .details-card {
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 6px 8px;
    margin: 6px 0;
    background: #ffffff;
  }

  .details-title {
    font-size: 9.5px;
    font-weight: 800;
    color: #475569;
    display: block;
    margin-bottom: 2px;
    border-bottom: 1px dotted #cbd5e1;
    padding-bottom: 2px;
  }

  .details-body {
    font-size: 10.5px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.35;
    margin-top: 3px;
  }

  /* Luxury Amount Card */
  .amount-card-luxury {
    border: 2px solid #000000;
    border-radius: 10px;
    padding: 8px;
    margin: 8px 0;
    text-align: center;
    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    box-shadow: inset 0 0 0 1px #e2e8f0;
  }

  .amount-header-label {
    font-size: 10px;
    font-weight: 800;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .amount-main-number {
    font-size: 21px;
    font-weight: 900;
    font-family: monospace, 'Cairo';
    color: #000000;
    letter-spacing: -0.5px;
    margin: 1px 0;
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 4px;
  }

  .amount-currency {
    font-size: 11px;
    font-weight: 800;
  }

  .amount-arabic-words {
    font-size: 9.5px;
    font-weight: 800;
    color: #1e293b;
    margin-top: 3px;
    padding-top: 3px;
    border-top: 1px dashed #94a3b8;
  }

  /* QR Box with Scan Target Corners */
  .qr-scanner-card {
    text-align: center;
    margin: 8px 0 6px 0;
    padding: 8px 6px;
    background: #ffffff;
    border: 1.5px dashed #000000;
    border-radius: 10px;
    position: relative;
  }

  .qr-frame {
    display: inline-block;
    padding: 5px;
    background: #ffffff;
    border: 1px solid #000000;
    border-radius: 8px;
    margin-bottom: 4px;
  }

  .qr-headline {
    font-size: 10.5px;
    font-weight: 900;
    color: #000000;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }

  .qr-subtext {
    font-size: 8.5px;
    font-weight: 700;
    color: #475569;
    line-height: 1.3;
    margin-top: 2px;
  }

  /* Signatures */
  .signatures-grid {
    display: flex;
    justify-content: space-between;
    margin-top: 14px;
    padding-top: 6px;
    text-align: center;
  }

  .sig-col {
    width: 46%;
  }

  .sig-line {
    border-bottom: 1px solid #000000;
    height: 24px;
    margin-bottom: 3px;
  }

  .sig-caption {
    font-size: 9px;
    font-weight: 800;
    color: #334155;
  }

  /* Tables */
  .pos-table {
    width: 100%;
    border-collapse: collapse;
    margin: 6px 0;
    font-size: 10px;
  }

  .pos-table th, .pos-table td {
    border: 1px solid #cbd5e1;
    padding: 4px 4px;
    text-align: center;
  }

  .pos-table th {
    background: #0f172a;
    color: #ffffff;
    font-weight: 800;
    font-size: 9.5px;
  }

  .pos-table td {
    font-weight: 800;
    background: #ffffff;
  }

  /* Footer Section */
  .receipt-footer {
    text-align: center;
    margin-top: 10px;
    padding-top: 4px;
  }

  .thank-you {
    font-size: 11px;
    font-weight: 900;
    color: #000000;
  }
`;

/**
 * Executes high-fidelity isolated receipt printing via a hidden iframe
 * designed specifically for Thermal Roll Printers (80mm) and standard printers.
 */
const printViaIframe = (htmlContent: string) => {
  let iframe = document.getElementById('dental-print-iframe') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'dental-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    console.error('Could not access print iframe document');
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8" />
      <title>طباعة السند</title>
      <style>${getThermalPrintStyles()}</style>
    </head>
    <body>
      ${htmlContent}
    </body>
    </html>
  `);
  doc.close();

  // Trigger print after iframe finishes layout and image loading
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Iframe print error:', e);
    }
  }, 450);
};

// Luxury Clinic Header Component with actual clinic logo support
const renderLuxuryClinicHeader = (clinic: any, clinicName: string, clinicPhone: string, clinicAddress: string) => {
  const logoSrc = clinic?.logo_url || clinic?.image_url || clinic?.image || clinic?.logo;
  const logoHtml = logoSrc ? `
    <div class="logo-frame">
      <img src="${logoSrc}" class="clinic-logo-img" alt="شعار العيادة" />
    </div>
  ` : `
    <div class="logo-frame">
      <div class="clinic-logo-svg">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2C7.5 2 4 4.5 4 8c0 3 1.5 6 3 9.5 1 2.3 2 4.5 3 4.5s2-2.2 3-4.5c1.5-3.5 3-6.5 3-9.5 0-3.5-3.5-6-8-6z" />
          <path d="M9 9.5c0-.8 1.3-1.5 3-1.5s3 .7 3 1.5-1 1.5-3 1.5-3-.7-3-1.5z" fill="#fff" />
        </svg>
      </div>
    </div>
  `;

  return `
    <div class="receipt-header">
      ${logoHtml}
      <h1 class="clinic-title">${clinicName}</h1>
      <p class="clinic-subtitle">مركز طب وجراحة الفم وتجميل الأسنان</p>
      <div class="clinic-meta-row">
        ${clinicAddress ? `<span>📍 ${clinicAddress}</span>` : ''}
        ${clinicPhone ? `<span dir="ltr">📞 ${clinicPhone}</span>` : ''}
      </div>
    </div>
  `;
};

// 1. PRINT INCOME RECEIPT (وصل قبض مالي - طابعة طولية 80mm)
export interface IncomeReceiptParams {
  transaction: any;
  clinic?: {
    id?: string | number;
    name?: string;
    logo_url?: string;
    image_url?: string;
    image?: string;
    logo?: string;
    phone?: string;
    address?: string;
  };
  patient?: {
    full_name?: string;
    phone?: string;
    id?: string | number;
  };
  doctorName?: string;
  recorderName?: string;
}

export const printIncomeReceipt = ({
  transaction,
  clinic,
  patient,
  doctorName,
  recorderName
}: IncomeReceiptParams) => {
  const clinicName = clinic?.name || 'العيادة التخصصية لطب الأسنان';
  const clinicPhone = clinic?.phone || '';
  const clinicAddress = clinic?.address || '';
  const receiptNo = transaction?.id ? `REC-${transaction.id.slice(-6).toUpperCase()}` : 'REC-000000';
  
  const rawDate = transaction?.date || transaction?.transaction_date || transaction?.created_at;
  const dateStr = rawDate ? rawDate.split('T')[0] : new Date().toISOString().split('T')[0];
  const timeStr = rawDate?.includes('T') ? rawDate.split('T')[1]?.slice(0, 5) : new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });

  const patientName = patient?.full_name || transaction?.patientName || transaction?.relatedPerson || 'مراجع العيادة';
  const patientPhone = patient?.phone || transaction?.patientPhone || '';
  const patientId = patient?.id || transaction?.patientId || transaction?.patient_id || '';
  const clinicId = clinic?.id || transaction?.clinicId || transaction?.clinic_id || '0';

  const doctor = doctorName || transaction?.doctorName || transaction?.assigned_doctor || 'العيادة';
  const recorder = recorderName || transaction?.recorderName || transaction?.recorder_staff?.full_name || 'المحاسب';
  const amount = Number(transaction?.amount) || 0;
  const description = transaction?.description || 'دفعة علاج أسنان';
  const category = formatCategoryName(transaction?.category, 'income');
  const paymentMethod = transaction?.paymentMethod === 'cash' ? 'نقدي (كاش)' : transaction?.paymentMethod === 'card' ? 'بطاقة دفع إلكتروني' : 'نقدي';

  // QR Code URL pointing to patient portal
  const portalUrl = `${window.location.origin}/patient-portal/${clinicId}/${patientId || '0'}`;
  const qrSvgString = renderToStaticMarkup(
    React.createElement(QRCodeSVG, { value: portalUrl, size: 84, level: 'M' })
  );

  const html = `
    <div class="thermal-receipt">
      <!-- Clinic Header & Logo -->
      ${renderLuxuryClinicHeader(clinic, clinicName, clinicPhone, clinicAddress)}

      <div class="divider-double"></div>

      <!-- Title Badge -->
      <div class="receipt-badge-wrap">
        <span class="receipt-badge">★ وصـل قـبـض مـالـي ★</span>
      </div>

      <!-- Barcode representation -->
      ${generateBarcodeSvg(receiptNo)}

      <!-- Meta Grid -->
      <div class="meta-box">
        <div class="kv-row">
          <span class="kv-label">رقم السند:</span>
          <span class="kv-val" style="font-family: monospace;">#${receiptNo}</span>
        </div>
        <div class="kv-row">
          <span class="kv-label">التاريخ والوقت:</span>
          <span class="kv-val">${dateStr} • ${timeStr}</span>
        </div>
        <div class="kv-row">
          <span class="kv-label">المراجع:</span>
          <span class="kv-val">${patientName}</span>
        </div>
        ${patientId ? `
          <div class="kv-row">
            <span class="kv-label">رقم الملف:</span>
            <span class="kv-val"><span class="pill-badge">#${patientId}</span></span>
          </div>
        ` : ''}
        ${patientPhone ? `
          <div class="kv-row">
            <span class="kv-label">رقم الهاتف:</span>
            <span class="kv-val" dir="ltr">${patientPhone}</span>
          </div>
        ` : ''}
        <div class="kv-row">
          <span class="kv-label">الطبيب المعالج:</span>
          <span class="kv-val">${doctor}</span>
        </div>
        <div class="kv-row">
          <span class="kv-label">طريقة السداد:</span>
          <span class="kv-val">${paymentMethod}</span>
        </div>
        <div class="kv-row">
          <span class="kv-label">التصنيف:</span>
          <span class="kv-val">${category}</span>
        </div>
      </div>

      <!-- Description Card -->
      <div class="details-card">
        <span class="details-title">تفاصيل الإجراء / البيان:</span>
        <p class="details-body">${description}</p>
      </div>

      <!-- Luxury Amount Container -->
      <div class="amount-card-luxury">
        <div class="amount-header-label">المبلغ المستلم • Total Paid</div>
        <div class="amount-main-number">
          <span>${amount.toLocaleString()}</span>
          <span class="amount-currency">د.ع</span>
        </div>
        <div class="amount-arabic-words">${numberToArabicWords(amount)}</div>
      </div>

      <!-- QR Code Scanner Box -->
      ${patientId ? `
        <div class="qr-scanner-card">
          <div class="qr-frame">
            ${qrSvgString}
          </div>
          <div class="qr-headline">
            <span>📱</span>
            <span>بوابة المراجع الإلكترونية</span>
          </div>
          <p class="qr-subtext">امسح الرمز بكاميرا هاتفك للاطلاع على ملفك الطبي، مواعيدك القادمة، وخطتك العلاجية بدون تسجيل دخول</p>
        </div>
      ` : ''}

      <!-- Signatures -->
      <div class="signatures-grid">
        <div class="sig-col">
          <div class="sig-line"></div>
          <span class="sig-caption">المستلم (${recorder})</span>
        </div>
        <div class="sig-col">
          <div class="sig-line"></div>
          <span class="sig-caption">ختم واعتماد العيادة</span>
        </div>
      </div>

      <div class="divider-teeth"></div>

      <!-- Footer -->
      <div class="receipt-footer">
        <p class="thank-you">نتمنى لكم دوام الصحة وابتسامة مشرقة ✨</p>
      </div>
    </div>
  `;

  printViaIframe(html);
};

// 2. PRINT EXPENSE VOUCHER (سند صرف مالي - طابعة طولية 80mm)
export interface ExpenseVoucherParams {
  transaction: any;
  clinic?: {
    id?: string | number;
    name?: string;
    logo_url?: string;
    image_url?: string;
    image?: string;
    logo?: string;
    phone?: string;
    address?: string;
  };
  recorderName?: string;
}

// Helper for generating category-based smart description when empty/default
const getExpenseAutoDescription = (t: any, beneficiaryName?: string): string => {
  const customDesc = t?.description?.trim();
  const cat = (t?.category || '').toLowerCase().trim();
  const ben = beneficiaryName || t?.relatedPerson || t?.beneficiary || t?.doctorName || '';

  // If user entered a meaningful specific custom description
  if (customDesc && !['مصروف', 'مصروف تشغيلي', 'مصروف عام', 'سند صرف', 'صرف'].includes(customDesc)) {
    return customDesc;
  }

  // Automatic category-based smart descriptions
  switch (cat) {
    case 'salary':
      return ben ? `صرف رواتب ومستحقات الموظف (${ben})` : 'صرف رواتب وأجور الكادر الطبي والإداري';
    case 'rent':
      return 'سداد إيجار مقر العيادة الشهري';
    case 'bills':
    case 'electricity':
    case 'كهرباء':
      return 'سداد فواتير الطاقة والكهرباء والخدمات التشغيلية';
    case 'inventory':
    case 'materials':
    case 'supplies':
      return 'شراء وتجهيز مواد ومستلزمات طبية للعيادة';
    case 'lab':
      return ben ? `سداد تكاليف ومستحقات معمل الأسنان (${ben})` : 'سداد تكاليف وأعمال مختبر الأسنان';
    case 'asset_purchase':
    case 'equipment':
    case 'assets':
      return 'شراء وتجهيز أجهزة ومعدات طبية للعيادة';
    case 'maintenance':
      return 'تكاليف صيانة وتشغيل المعدات والأجهزة';
    case 'marketing':
    case 'advertising':
      return 'تكاليف حملات التسويق والدعاية والإعلان';
    case 'cleaning':
      return 'مصاريف النظافة والتعقيم والضيافة';
    default:
      return t?.category ? `صرف ${formatCategoryName(t.category, 'expense')}` : 'مصروف تشغيلي للعيادة';
  }
};

export const printExpenseVoucher = ({
  transaction,
  clinic,
  recorderName
}: ExpenseVoucherParams) => {
  const clinicName = clinic?.name || 'العيادة التخصصية لطب الأسنان';
  const clinicPhone = clinic?.phone || '';
  const clinicAddress = clinic?.address || '';
  const voucherNo = transaction?.id ? `EXP-${transaction.id.slice(-6).toUpperCase()}` : 'EXP-000000';
  
  const rawDate = transaction?.date || transaction?.transaction_date || transaction?.created_at;
  const dateStr = rawDate ? rawDate.split('T')[0] : new Date().toISOString().split('T')[0];

  const amount = Number(transaction?.amount) || 0;
  const category = formatCategoryName(transaction?.category, 'expense');
  
  const isSalary = transaction?.category === 'salary';
  const beneficiary = isSalary
    ? (transaction?.doctorName || transaction?.relatedPerson || 'الموظف المستحق')
    : (transaction?.relatedPerson || transaction?.beneficiary || transaction?.doctorName || 'الجهة المستفيدة');
    
  const recorder = recorderName || transaction?.recorderName || transaction?.recorder_staff?.full_name || 'المسؤول المالي';
  const description = getExpenseAutoDescription(transaction, beneficiary);

  const html = `
    <div class="thermal-receipt">
      <!-- Clinic Header & Logo -->
      ${renderLuxuryClinicHeader(clinic, clinicName, clinicPhone, clinicAddress)}

      <div class="divider-double"></div>

      <!-- Title Badge -->
      <div class="receipt-badge-wrap">
        <span class="receipt-badge receipt-badge-exp">★ سـنـد صـرف مـالـي ★</span>
      </div>

      <!-- Barcode representation -->
      ${generateBarcodeSvg(voucherNo)}

      <!-- Meta Grid -->
      <div class="meta-box">
        <div class="kv-row">
          <span class="kv-label">رقم السند:</span>
          <span class="kv-val" style="font-family: monospace;">#${voucherNo}</span>
        </div>
        <div class="kv-row">
          <span class="kv-label">التاريخ:</span>
          <span class="kv-val">${dateStr}</span>
        </div>
        <div class="kv-row">
          <span class="kv-label">${isSalary ? 'المستلم (الموظف):' : 'يصرف إلى (المستفيد):'}</span>
          <span class="kv-val">${beneficiary}</span>
        </div>
        <div class="kv-row">
          <span class="kv-label">التصنيف المحاسبي:</span>
          <span class="kv-val">${category}</span>
        </div>
        <div class="kv-row">
          <span class="kv-label">المسؤول عن التسجيل:</span>
          <span class="kv-val">${recorder}</span>
        </div>
      </div>

      <!-- Description -->
      <div class="details-card">
        <span class="details-title">البيان والغرض من الصرف:</span>
        <p class="details-body">${description}</p>
      </div>

      <!-- Amount Highlight Box -->
      <div class="amount-card-luxury" style="border-color: #7f1d1d;">
        <div class="amount-header-label" style="color: #991b1b;">المبلغ المصروف • Expense Amount</div>
        <div class="amount-main-number">
          <span>${amount.toLocaleString()}</span>
          <span class="amount-currency">د.ع</span>
        </div>
        <div class="amount-arabic-words">${numberToArabicWords(amount)}</div>
      </div>

      <!-- Signatures (3 cols) -->
      <div class="signatures-grid" style="margin-top: 18px;">
        <div style="width: 31%; text-align: center;">
          <div class="sig-line"></div>
          <span class="sig-caption">المستلم (${beneficiary})</span>
        </div>
        <div style="width: 31%; text-align: center;">
          <div class="sig-line"></div>
          <span class="sig-caption">المسؤول عن التسجيل (${recorder})</span>
        </div>
        <div style="width: 31%; text-align: center;">
          <div class="sig-line"></div>
          <span class="sig-caption">اعتماد الإدارة</span>
        </div>
      </div>

      <div class="divider-teeth"></div>

      <!-- Footer -->
      <div class="receipt-footer">
        <p class="thank-you">سند صرف معتمد وموثق 🧾</p>
      </div>
    </div>
  `;

  printViaIframe(html);
};

// 3. PRINT TREATMENT PLAN & INSTALLMENTS REPORT (تقرير أقساط خطة العلاج - 80mm)
export interface TreatmentPlanReportParams {
  plan: any;
  patient?: any;
  clinic?: any;
}

export const printTreatmentPlanReport = ({
  plan,
  patient,
  clinic
}: TreatmentPlanReportParams) => {
  const clinicName = clinic?.name || 'العيادة التخصصية لطب الأسنان';
  const clinicPhone = clinic?.phone || '';
  const clinicAddress = clinic?.address || '';
  const patientName = patient?.full_name || plan?.patientName || 'المراجع';
  const patientPhone = patient?.phone || plan?.patientPhone || '';
  const patientId = patient?.id || plan?.patient_id || '';
  const clinicId = clinic?.id || plan?.clinic_id || '0';
  const treatmentName = plan?.treatment_description || plan?.treatment_name || 'خطة علاجية';
  const tooth = plan?.tooth_numbers?.join(', ') || plan?.tooth_number || 'عام';
  const totalSessions = Math.max(1, plan?.session_count || 1);
  const cost = Number(plan?.estimated_cost) || 0;
  const paid = Number(plan?.paid) || 0;
  const remaining = Math.max(0, cost - paid);
  const paidRatio = cost > 0 ? Math.min(1, paid / cost) : 0;
  const paidSegments = Math.min(totalSessions, Math.floor(paidRatio * totalSessions));

  // Segments HTML for progress bar
  const segmentsHtml = Array.from({ length: totalSessions }).map((_, idx) => {
    const isPaid = idx < paidSegments;
    return `
      <div style="flex: 1; height: 100%; border-radius: 2.5px; background: ${isPaid ? '#22c55e' : '#fca5a5'}; border: 1px solid ${isPaid ? '#16a34a' : '#f87171'};"></div>
    `;
  }).join('');

  const portalUrl = `${window.location.origin}/patient-portal/${clinicId}/${patientId || '0'}`;
  const qrSvgString = renderToStaticMarkup(
    React.createElement(QRCodeSVG, { value: portalUrl, size: 84, level: 'M' })
  );

  const html = `
    <div class="thermal-receipt">
      <!-- Clinic Header & Logo -->
      ${renderLuxuryClinicHeader(clinic, clinicName, clinicPhone, clinicAddress)}

      <div class="divider-double"></div>

      <!-- Title Badge -->
      <div class="receipt-badge-wrap">
        <span class="receipt-badge">★ تقرير خطة العلاج والأقساط ★</span>
      </div>

      <!-- Meta Grid -->
      <div class="meta-box">
        <div class="kv-row">
          <span class="kv-label">تاريخ التقرير:</span>
          <span class="kv-val">${new Date().toISOString().split('T')[0]}</span>
        </div>
        <div class="kv-row">
          <span class="kv-label">المراجع:</span>
          <span class="kv-val">${patientName}</span>
        </div>
        ${patientId ? `
          <div class="kv-row">
            <span class="kv-label">رقم الملف:</span>
            <span class="kv-val"><span class="pill-badge">#${patientId}</span></span>
          </div>
        ` : ''}
        <div class="kv-row">
          <span class="kv-label">الطبيب المعالج:</span>
          <span class="kv-val">${plan?.assigned_doctor || 'العيادة'}</span>
        </div>
      </div>

      <!-- Treatment Details -->
      <div class="details-card">
        <span class="details-title">الإجراء ورقم السن:</span>
        <p class="details-body">${treatmentName} (سن: ${tooth})</p>
      </div>

      <!-- Visual Session Progress Bar in Print -->
      <div style="margin: 6px 0; padding: 7px 8px; background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: 800; margin-bottom: 5px; color: #0f172a;">
          <span>شريط تقدم سداد الجلسات:</span>
          <span>${paidSegments} من ${totalSessions} جلسات (${Math.round(paidRatio * 100)}%)</span>
        </div>
        <div style="display: flex; gap: 3px; height: 14px; width: 100%; margin-bottom: 4px;">
          ${segmentsHtml}
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 9px; font-weight: 800; margin-top: 4px;">
          <span style="color: #16a34a;">● مسدد: ${paid.toLocaleString()} د.ع</span>
          <span style="color: #dc2626;">● متبقي: ${remaining.toLocaleString()} د.ع</span>
        </div>
      </div>

      <!-- Summary Breakdown Table -->
      <table class="pos-table">
        <thead>
          <tr>
            <th>إجمالي التكلفة</th>
            <th>إجمالي المسدد</th>
            <th>المبلغ المتبقي</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${cost.toLocaleString()} د.ع</td>
            <td style="color: #16a34a; font-weight: 900;">${paid.toLocaleString()} د.ع</td>
            <td style="color: #dc2626; font-weight: 900;">${remaining.toLocaleString()} د.ع</td>
          </tr>
        </tbody>
      </table>

      <!-- QR Code for Portal -->
      ${patientId ? `
        <div class="qr-scanner-card">
          <div class="qr-frame">
            ${qrSvgString}
          </div>
          <div class="qr-headline">
            <span>📱</span>
            <span>متابعة الخطة عبر بوابة المراجع</span>
          </div>
          <p class="qr-subtext">امسح الرمز للاطلاع على تفاصيل جلسات العلاج والدفعات المسددة بدون تسجيل دخول</p>
        </div>
      ` : ''}

      <!-- Signatures -->
      <div class="signatures-grid">
        <div class="sig-col">
          <div class="sig-line"></div>
          <span class="sig-caption">توقيع الطبيب</span>
        </div>
        <div class="sig-col">
          <div class="sig-line"></div>
          <span class="sig-caption">اعتماد الإدارة المالية</span>
        </div>
      </div>

      <div class="divider-teeth"></div>

      <div class="receipt-footer">
        <p class="thank-you">نتمنى لكم دوام الصحة وابتسامة مشرقة ✨</p>
      </div>
    </div>
  `;

  printViaIframe(html);
};

// 4. PRINT COMPREHENSIVE PATIENT ACCOUNT STATEMENT (كشف حساب مراجع شامل - 80mm)
export interface PatientStatementData {
  patient: any;
  plans: any[];
  transactions: any[];
  labOrders: any[];
  clinic?: any;
}

export const printPatientFullStatement = ({
  patient,
  plans = [],
  transactions = [],
  labOrders = [],
  clinic
}: PatientStatementData) => {
  const clinicName = clinic?.name || 'العيادة التخصصية لطب الأسنان';
  const clinicPhone = clinic?.phone || '';
  const clinicAddress = clinic?.address || '';
  const patientName = patient?.full_name || 'المراجع';
  const patientPhone = patient?.phone || '';
  const patientId = patient?.id || '';
  const clinicId = clinic?.id || patient?.clinic_id || '0';

  const totalCost = plans.reduce((sum, p) => sum + (Number(p.estimated_cost) || 0), 0);
  const totalPaid = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const remaining = Math.max(0, totalCost - totalPaid);

  const portalUrl = `${window.location.origin}/patient-portal/${clinicId}/${patientId || '0'}`;
  const qrSvgString = renderToStaticMarkup(
    React.createElement(QRCodeSVG, { value: portalUrl, size: 84, level: 'M' })
  );

  const html = `
    <div class="thermal-receipt">
      <!-- Clinic Header & Logo -->
      ${renderLuxuryClinicHeader(clinic, clinicName, clinicPhone, clinicAddress)}

      <div class="divider-double"></div>

      <!-- Title Badge -->
      <div class="receipt-badge-wrap">
        <span class="receipt-badge">★ كـشـف حـسـاب مـراجـع ★</span>
      </div>

      <!-- Meta Grid -->
      <div class="meta-box">
        <div class="kv-row">
          <span class="kv-label">المراجع:</span>
          <span class="kv-val">${patientName}</span>
        </div>
        <div class="kv-row">
          <span class="kv-label">رقم الملف:</span>
          <span class="kv-val"><span class="pill-badge">#${patientId}</span></span>
        </div>
        <div class="kv-row">
          <span class="kv-label">تاريخ الإصدار:</span>
          <span class="kv-val">${new Date().toISOString().split('T')[0]}</span>
        </div>
      </div>

      <!-- Summary Table -->
      <table class="pos-table">
        <thead>
          <tr>
            <th>إجمالي التكلفة</th>
            <th>إجمالي المسدد</th>
            <th>الرصيد المتبقي</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${totalCost.toLocaleString()} د.ع</td>
            <td>${totalPaid.toLocaleString()} د.ع</td>
            <td style="font-weight: 900;">${remaining.toLocaleString()} د.ع</td>
          </tr>
        </tbody>
      </table>

      <!-- Transactions List -->
      <div style="margin: 6px 0;">
        <span style="font-size: 10px; font-weight: 900; color: #000; display: block; margin-bottom: 3px;">سجل الحركات المالية:</span>
        <table class="pos-table">
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>البيان</th>
              <th>المبلغ</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.length === 0 ? '<tr><td colspan="3">لا توجد دفعات مسجلة</td></tr>' : transactions.map(t => `
              <tr>
                <td>${t.transaction_date || t.date?.split('T')[0] || '-'}</td>
                <td style="text-align: right;">${t.description || (t.type === 'income' ? 'إيراد' : 'صرف')}</td>
                <td style="font-family: monospace;">${Number(t.amount).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- QR Code for Portal -->
      ${patientId ? `
        <div class="qr-scanner-card">
          <div class="qr-frame">
            ${qrSvgString}
          </div>
          <div class="qr-headline">
            <span>📱</span>
            <span>بوابة المراجع الإلكترونية</span>
          </div>
          <p class="qr-subtext">امسح الرمز للوصول إلى كشف الحساب المحدث والخطط العلاجية مباشرة</p>
        </div>
      ` : ''}

      <!-- Signatures -->
      <div class="signatures-grid">
        <div class="sig-col">
          <div class="sig-line"></div>
          <span class="sig-caption">المحاسب</span>
        </div>
        <div class="sig-col">
          <div class="sig-line"></div>
          <span class="sig-caption">اعتماد العيادة</span>
        </div>
      </div>

      <div class="divider-teeth"></div>

      <div class="receipt-footer">
        <p class="thank-you">شكراً لثقتكم بنا 🦷</p>
      </div>
    </div>
  `;

  printViaIframe(html);
};

export interface PrintExecutiveReportParams {
  clinic: any;
  stats: any;
  periodLabel: string;
  reportType?: string;
  reportTypeLabel: string;
}

export const printExecutiveReport = ({
  clinic,
  stats,
  periodLabel,
  reportType = 'all',
  reportTypeLabel
}: PrintExecutiveReportParams) => {
  const clinicLogoUrl = clinic?.logo_url || clinic?.image_url || clinic?.image || clinic?.logo || '';
  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });
  const reportSerial = `REP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  const totalStaffRevenue = (stats.staffStats || []).reduce((sum: number, s: any) => sum + (s.revenueGenerated || 0), 0);
  const totalStaffCommissions = (stats.staffStats || []).reduce((sum: number, s: any) => sum + (s.commissionAmount || 0), 0);
  const totalStaffSessions = (stats.staffStats || []).reduce((sum: number, s: any) => sum + (s.completedCount || 0), 0);
  const totalStaffAppointments = (stats.staffStats || []).reduce((sum: number, s: any) => sum + (s.appointmentsCount || 0), 0);

  const totalProceduresCount = (stats.procedureStats || []).reduce((sum: number, p: any) => sum + (p.count || 0), 0);
  const totalProceduresRevenue = (stats.procedureStats || []).reduce((sum: number, p: any) => sum + (p.totalRevenue || 0), 0);

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>${reportTypeLabel} - ${clinic?.name || 'عيادة الأسنان'}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
        
        @page {
          size: A4 portrait;
          margin: 10mm 12mm 10mm 12mm;
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        body {
          font-family: 'Cairo', 'Tajawal', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          direction: rtl !important;
          text-align: right !important;
          background: #ffffff !important;
          color: #0f172a !important;
          font-size: 10.5px;
          line-height: 1.45;
          padding: 2px 4px;
        }

        /* Header */
        .doc-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2.5px solid #1e3a8a;
          padding-bottom: 12px;
          margin-bottom: 14px;
        }

        .brand-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .clinic-logo-img {
          width: 58px;
          height: 58px;
          border-radius: 12px;
          object-fit: cover;
          border: 1.5px solid #cbd5e1;
          background: #ffffff;
        }

        .clinic-logo-fallback {
          width: 58px;
          height: 58px;
          border-radius: 12px;
          background: #eff6ff;
          border: 1.5px solid #bfdbfe;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
        }

        .clinic-names h1 {
          font-size: 18px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.2px;
          margin-bottom: 2px;
        }

        .clinic-names p {
          font-size: 10px;
          color: #64748b;
          font-weight: 500;
        }

        .meta-box {
          text-align: left;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 3px;
        }

        .badge-report-type {
          background: #1e3a8a;
          color: #ffffff;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .meta-details {
          font-size: 9px;
          color: #475569;
          display: flex;
          flex-direction: column;
          gap: 1.5px;
          text-align: left;
        }

        /* KPI Summary Cards Grid */
        .kpis-container {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 14px;
          page-break-inside: avoid;
        }

        .kpi-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px 10px;
          text-align: right;
          position: relative;
          overflow: hidden;
        }

        .kpi-card::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 3.5px;
          height: 100%;
          background: #3b82f6;
        }

        .kpi-card.green::before { background: #10b981; }
        .kpi-card.red::before { background: #ef4444; }
        .kpi-card.purple::before { background: #8b5cf6; }
        .kpi-card.orange::before { background: #f59e0b; }

        .kpi-label {
          font-size: 9.5px;
          color: #64748b;
          font-weight: 700;
          margin-bottom: 3px;
        }

        .kpi-num {
          font-size: 13.5px;
          font-weight: 900;
          color: #0f172a;
        }

        .kpi-sub {
          font-size: 8.5px;
          color: #94a3b8;
          margin-top: 1px;
        }

        /* Section Box */
        .section-wrapper {
          margin-bottom: 14px;
          page-break-inside: avoid;
        }

        .section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1.5px solid #e2e8f0;
          padding-bottom: 4px;
          margin-bottom: 8px;
        }

        .section-title {
          font-size: 11.5px;
          font-weight: 800;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .section-tag {
          font-size: 9px;
          color: #64748b;
          background: #f1f5f9;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 600;
        }

        /* Tables */
        .report-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9.5px;
        }

        .report-table th {
          background: #1e293b;
          color: #ffffff;
          font-weight: 700;
          padding: 6px 8px;
          text-align: right;
          border: 1px solid #1e293b;
          font-size: 9px;
        }

        .report-table td {
          padding: 5.5px 8px;
          border: 1px solid #e2e8f0;
          color: #334155;
          vertical-align: middle;
        }

        .report-table tr:nth-child(even) td {
          background: #f8fafc;
        }

        .report-table tfoot td {
          background: #f1f5f9;
          font-weight: 800;
          color: #0f172a;
          border-top: 2px solid #cbd5e1;
        }

        .text-center { text-align: center !important; }
        .text-left { text-align: left !important; }
        .text-right { text-align: right !important; }
        .font-bold { font-weight: 700 !important; }
        .font-extrabold { font-weight: 900 !important; }
        .text-green { color: #047857 !important; }
        .text-blue { color: #1d4ed8 !important; }
        .text-red { color: #b91c1c !important; }
        .text-purple { color: #6d28d9 !important; }

        /* Debts breakdown cards */
        .debts-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 10px;
        }

        .debt-card {
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .debt-card.green { background: #f0fdf4; border-color: #bbf7d0; }
        .debt-card.blue { background: #eff6ff; border-color: #bfdbfe; }
        .debt-card.red { background: #fef2f2; border-color: #fecaca; }

        .debt-card-title {
          font-size: 9.5px;
          font-weight: 700;
          display: flex;
          justify-content: space-between;
        }

        .debt-card-amount {
          font-size: 13px;
          font-weight: 900;
        }

        /* Progress Mini Bar */
        .bar-container {
          width: 100%;
          height: 5px;
          background: #e2e8f0;
          border-radius: 3px;
          overflow: hidden;
          margin-top: 3px;
        }

        .bar-fill {
          height: 100%;
          background: #2563eb;
          border-radius: 3px;
        }

        /* Signatures & Footer */
        .report-footer {
          margin-top: 18px;
          border-top: 1.5px dashed #cbd5e1;
          padding-top: 12px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          page-break-inside: avoid;
        }

        .sig-box {
          text-align: center;
          width: 150px;
        }

        .sig-line-area {
          height: 35px;
          border-bottom: 1px solid #94a3b8;
          margin-bottom: 4px;
        }

        .sig-label-text {
          font-size: 9px;
          color: #475569;
          font-weight: 700;
        }

        .stamp-circle {
          width: 65px;
          height: 65px;
          border: 1.5px dashed #94a3b8;
          border-radius: 50%;
          margin: 0 auto 4px auto;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8.5px;
          color: #94a3b8;
          font-weight: 700;
        }
      </style>
    </head>
    <body>

      <!-- 1. Header Section -->
      <div class="doc-header">
        <div class="brand-section">
          ${clinicLogoUrl 
            ? `<img src="${clinicLogoUrl}" class="clinic-logo-img" alt="Logo" />` 
            : `<div class="clinic-logo-fallback">🦷</div>`
          }
          <div class="clinic-names">
            <h1>${clinic?.name || 'عيادة الأسنان التخصصية'}</h1>
            <p>${clinic?.address ? `${clinic.address} • ` : ''}${clinic?.phone ? `هاتف: ${clinic.phone}` : 'المنظومة الذكية لإدارة العيادات'}</p>
          </div>
        </div>

        <div class="meta-box">
          <div class="badge-report-type">📊 ${reportTypeLabel}</div>
          <div class="meta-details">
            <span><strong>رقم التقرير:</strong> ${reportSerial}</span>
            <span><strong>الفترة:</strong> ${periodLabel}</span>
            <span><strong>تاريخ الإصدار:</strong> ${dateStr} - ${timeStr}</span>
          </div>
        </div>
      </div>

      <!-- 2. Dynamic KPI Highlight Cards Based on Report Type -->
      <div class="kpis-container">
        ${reportType === 'staff' ? `
          <div class="kpi-card green">
            <div class="kpi-label">إجمالي إنتاجية الكادر</div>
            <div class="kpi-num text-green">${totalStaffRevenue.toLocaleString()} د.ع</div>
            <div class="kpi-sub">${periodLabel}</div>
          </div>
          <div class="kpi-card blue">
            <div class="kpi-label">الكادر الطبي النشط</div>
            <div class="kpi-num text-blue">${stats.staffStats?.length || 0} أطباء وموظفين</div>
            <div class="kpi-sub">على رأس العمل</div>
          </div>
          <div class="kpi-card purple">
            <div class="kpi-label">الجلسات المنجزة</div>
            <div class="kpi-num text-purple">${totalStaffSessions} جلسة</div>
            <div class="kpi-sub">من إجمالي ${totalStaffAppointments} موعد</div>
          </div>
          <div class="kpi-card orange">
            <div class="kpi-label">إجمالي العمولات المستحقة</div>
            <div class="kpi-num">${totalStaffCommissions.toLocaleString()} د.ع</div>
            <div class="kpi-sub">مستحقات الأطباء</div>
          </div>
        ` : reportType === 'procedures' ? `
          <div class="kpi-card blue">
            <div class="kpi-label">إجمالي الإجراءات المنفذة</div>
            <div class="kpi-num text-blue">${totalProceduresCount} حالة</div>
            <div class="kpi-sub">${periodLabel}</div>
          </div>
          <div class="kpi-card purple">
            <div class="kpi-label">الإجراء الأكثر طلباً</div>
            <div class="kpi-num text-purple">${stats.procedureStats?.[0]?.name || 'حشوات تجميلية'}</div>
            <div class="kpi-sub">المرتبة الأولى</div>
          </div>
          <div class="kpi-card green">
            <div class="kpi-label">إجمالي إيراد الإجراءات</div>
            <div class="kpi-num text-green">${totalProceduresRevenue.toLocaleString()} د.ع</div>
            <div class="kpi-sub">قيمة الخدمات</div>
          </div>
          <div class="kpi-card orange">
            <div class="kpi-label">متوسط سعر الجلسة</div>
            <div class="kpi-num">${(totalProceduresCount > 0 ? Math.round(totalProceduresRevenue / totalProceduresCount) : 0).toLocaleString()} د.ع</div>
            <div class="kpi-sub">لكل مريض</div>
          </div>
        ` : reportType === 'debts' ? `
          <div class="kpi-card red">
            <div class="kpi-label">إجمالي الديون المعلقة</div>
            <div class="kpi-num text-red">${(stats.debtStats?.totalOutstanding || 0).toLocaleString()} د.ع</div>
            <div class="kpi-sub">مستحقات غير محصلة</div>
          </div>
          <div class="kpi-card green">
            <div class="kpi-label">إجمالي المبالغ المحصلة</div>
            <div class="kpi-num text-green">${(stats.debtStats?.totalCollected || 0).toLocaleString()} د.ع</div>
            <div class="kpi-sub">مدفوعات مستلمة</div>
          </div>
          <div class="kpi-card purple">
            <div class="kpi-label">معدل التحصيل المالي</div>
            <div class="kpi-num text-purple">${stats.debtStats?.collectionRate || 0}%</div>
            <div class="kpi-sub">من إجمالي المستحق</div>
          </div>
          <div class="kpi-card orange">
            <div class="kpi-label">المراجعين المدينين</div>
            <div class="kpi-num">${stats.debtStats?.totalDebtorsCount || 0} مراجع</div>
            <div class="kpi-sub">مطلوب متابعتهم</div>
          </div>
        ` : reportType === 'appointments' ? `
          <div class="kpi-card blue">
            <div class="kpi-label">إجمالي المواعيد</div>
            <div class="kpi-num text-blue">${stats.appointmentStats?.total || 0} موعد</div>
            <div class="kpi-sub">${periodLabel}</div>
          </div>
          <div class="kpi-card green">
            <div class="kpi-label">نسبة الحضور المكتملة</div>
            <div class="kpi-num text-green">${stats.appointmentStats?.attendanceRate || 0}%</div>
            <div class="kpi-sub">${stats.appointmentStats?.completed || 0} موعد مكتمل</div>
          </div>
          <div class="kpi-card red">
            <div class="kpi-label">نسبة الغياب (No-Show)</div>
            <div class="kpi-num text-red">${stats.appointmentStats?.noShowRate || 0}%</div>
            <div class="kpi-sub">${stats.appointmentStats?.noShow || 0} غياب بدون إشعار</div>
          </div>
          <div class="kpi-card orange">
            <div class="kpi-label">نسبة الإلغاء</div>
            <div class="kpi-num">${stats.appointmentStats?.cancellationRate || 0}%</div>
            <div class="kpi-sub">${stats.appointmentStats?.cancelled || 0} موعد ملغي</div>
          </div>
        ` : `
          <div class="kpi-card green">
            <div class="kpi-label">إجمالي الإيرادات</div>
            <div class="kpi-num text-green">${(stats.monthlyRevenue || 0).toLocaleString()} د.ع</div>
            <div class="kpi-sub">${periodLabel}</div>
          </div>
          <div class="kpi-card red">
            <div class="kpi-label">إجمالي المصروفات</div>
            <div class="kpi-num text-red">${(stats.monthlyExpenses || 0).toLocaleString()} د.ع</div>
            <div class="kpi-sub">${periodLabel}</div>
          </div>
          <div class="kpi-card purple">
            <div class="kpi-label">صافي الأرباح (هامش: ${stats.profitMargin}%)</div>
            <div class="kpi-num ${(stats.monthlyRevenue - stats.monthlyExpenses) >= 0 ? 'text-green' : 'text-red'}">
              ${(stats.monthlyRevenue - stats.monthlyExpenses).toLocaleString()} د.ع
            </div>
            <div class="kpi-sub">${(stats.monthlyRevenue - stats.monthlyExpenses) >= 0 ? 'ربح تشغيلي صافي' : 'عجز مالي'}</div>
          </div>
          <div class="kpi-card blue">
            <div class="kpi-label">المرضى النشطون | متوسط القيمة</div>
            <div class="kpi-num text-blue">${stats.totalPatients} مراجع</div>
            <div class="kpi-sub">متوسط: ${(stats.avgPatientValue || 0).toLocaleString()} د.ع / مراجع</div>
          </div>
        `}
      </div>

      <!-- 3. DOCTOR & STAFF SECTION (If 'staff' or 'all') -->
      ${(reportType === 'staff' || reportType === 'all') && stats.staffStats && stats.staffStats.length > 0 ? `
        <div class="section-wrapper">
          <div class="section-head">
            <div class="section-title">👨‍⚕️ إنتاجية الأطباء والكادر الطبي وتوزيع العمولات</div>
            <span class="section-tag">${stats.staffStats.length} أطباء وموظفين</span>
          </div>

          <table class="report-table">
            <thead>
              <tr>
                <th style="width: 25%;">الطبيب / الموظف</th>
                <th style="width: 20%;">المسمى والتخصص</th>
                <th class="text-center" style="width: 14%;">الجلسات المنجزة</th>
                <th class="text-center" style="width: 11%;">نسبة الإنجاز</th>
                <th class="text-left" style="width: 15%;">الإيراد المحقق</th>
                <th class="text-left" style="width: 15%;">العمولة المستحقة</th>
              </tr>
            </thead>
            <tbody>
              ${stats.staffStats.map((s: any) => `
                <tr>
                  <td class="font-bold">${s.name}</td>
                  <td>${s.role}</td>
                  <td class="text-center font-bold">
                    <span class="text-green">${s.completedCount}</span> / <span style="color:#64748b;">${s.appointmentsCount}</span>
                  </td>
                  <td class="text-center font-bold">${s.completionRate}%</td>
                  <td class="text-left font-bold text-green">${s.revenueGenerated.toLocaleString()} د.ع</td>
                  <td class="text-left font-bold text-blue">${s.commissionAmount.toLocaleString()} د.ع <span style="font-size:8px; color:#64748b;">(${s.commissionRate}%)</span></td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" class="font-bold">المجموع الإجمالي للإنتاجية</td>
                <td class="text-center font-bold">${totalStaffSessions} / ${totalStaffAppointments}</td>
                <td class="text-center font-bold">${totalStaffAppointments > 0 ? Math.round((totalStaffSessions / totalStaffAppointments) * 100) : 100}%</td>
                <td class="text-left font-bold text-green">${totalStaffRevenue.toLocaleString()} د.ع</td>
                <td class="text-left font-bold text-blue">${totalStaffCommissions.toLocaleString()} د.ع</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ` : ''}

      <!-- 4. PROCEDURES BREAKDOWN SECTION (If 'procedures' or 'all') -->
      ${(reportType === 'procedures' || reportType === 'all') && stats.procedureStats && stats.procedureStats.length > 0 ? `
        <div class="section-wrapper">
          <div class="section-head">
            <div class="section-title">🦷 تحليل العلاجات والإجراءات الأكثر طلباً وربحية</div>
            <span class="section-tag">${stats.procedureStats.length} نوع إجراء</span>
          </div>

          <table class="report-table">
            <thead>
              <tr>
                <th style="width: 5%;" class="text-center">#</th>
                <th style="width: 35%;">اسم الإجراء / الخدمة العلاجية</th>
                <th class="text-center" style="width: 14%;">عدد الحالات</th>
                <th class="text-center" style="width: 16%;">الحصة من الإجمالي</th>
                <th class="text-left" style="width: 15%;">متوسط السعر</th>
                <th class="text-left" style="width: 15%;">إجمالي الإيرادات</th>
              </tr>
            </thead>
            <tbody>
              ${(reportType === 'procedures' ? stats.procedureStats : stats.procedureStats.slice(0, 5)).map((p: any, idx: number) => `
                <tr>
                  <td class="text-center font-bold" style="color:#64748b;">${idx + 1}</td>
                  <td class="font-bold">${p.name}</td>
                  <td class="text-center font-bold">${p.count} حالة</td>
                  <td class="text-center font-bold">
                    ${p.percentage}%
                    <div class="bar-container">
                      <div class="bar-fill" style="width: ${p.percentage}%;"></div>
                    </div>
                  </td>
                  <td class="text-left">${p.avgCost.toLocaleString()} د.ع</td>
                  <td class="text-left font-bold text-green">${p.totalRevenue.toLocaleString()} د.ع</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" class="font-bold">المجموع الكلي للإجراءات</td>
                <td class="text-center font-bold">${totalProceduresCount} حالة</td>
                <td class="text-center font-bold">100%</td>
                <td class="text-left font-bold">${(totalProceduresCount > 0 ? Math.round(totalProceduresRevenue / totalProceduresCount) : 0).toLocaleString()} د.ع</td>
                <td class="text-left font-bold text-green">${totalProceduresRevenue.toLocaleString()} د.ع</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ` : ''}

      <!-- 5. AGING RECEIVABLES & DEBTS SECTION (If 'debts' or 'all') -->
      ${(reportType === 'debts' || reportType === 'all') && stats.debtStats ? `
        <div class="section-wrapper">
          <div class="section-head">
            <div class="section-title">💳 تقرير أعمار الديون والمستحقات المالية (معدل التحصيل: ${stats.debtStats.collectionRate}%)</div>
            <span class="section-tag">${stats.debtStats.totalDebtorsCount} مراجع مدين</span>
          </div>

          <div class="debts-summary-grid">
            <div class="debt-card green">
              <div class="debt-card-title text-green">
                <span>🟢 ديون حديثة (0 - 30 يوماً)</span>
                <span>${stats.debtStats.aging0to30.count} مراجع</span>
              </div>
              <div class="debt-card-amount text-green">${stats.debtStats.aging0to30.amount.toLocaleString()} د.ع</div>
            </div>

            <div class="debt-card blue">
              <div class="debt-card-title text-blue">
                <span>🔵 ديون متوسطة (31 - 60 يوماً)</span>
                <span>${stats.debtStats.aging31to60.count} مراجع</span>
              </div>
              <div class="debt-card-amount text-blue">${stats.debtStats.aging31to60.amount.toLocaleString()} د.ع</div>
            </div>

            <div class="debt-card red">
              <div class="debt-card-title text-red">
                <span>🔴 ديون متأخرة (+60 يوماً)</span>
                <span>${stats.debtStats.aging60plus.count} مراجع</span>
              </div>
              <div class="debt-card-amount text-red">${stats.debtStats.aging60plus.amount.toLocaleString()} د.ع</div>
            </div>
          </div>

          ${reportType === 'debts' && stats.debtStats.debtorsList && stats.debtStats.debtorsList.length > 0 ? `
            <table class="report-table">
              <thead>
                <tr>
                  <th style="width: 25%;">اسم المراجع</th>
                  <th style="width: 23%;">العلاج / الخطة</th>
                  <th class="text-left" style="width: 13%;">التكلفة الكلية</th>
                  <th class="text-left" style="width: 13%;">المدفوع</th>
                  <th class="text-left" style="width: 14%;">المتبقي المطلوب</th>
                  <th class="text-center" style="width: 12%;">أيام التأخير</th>
                </tr>
              </thead>
              <tbody>
                ${stats.debtStats.debtorsList.slice(0, 12).map((d: any) => `
                  <tr>
                    <td class="font-bold">${d.patientName}</td>
                    <td>${d.treatmentDescription}</td>
                    <td class="text-left">${d.totalCost.toLocaleString()} د.ع</td>
                    <td class="text-left font-bold text-green">${d.paid.toLocaleString()} د.ع</td>
                    <td class="text-left font-bold text-red">${d.remaining.toLocaleString()} د.ع</td>
                    <td class="text-center font-bold ${d.daysOld > 60 ? 'text-red' : d.daysOld > 30 ? 'text-blue' : 'text-green'}">
                      ${d.daysOld} يوم (${d.ageCategory === '0-30' ? 'حديثة' : d.ageCategory === '31-60' ? 'متوسطة' : 'متأخرة'})
                    </td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" class="font-bold">إجمالي المطالبات المعلقة</td>
                  <td class="text-left font-bold">${stats.debtStats.debtorsList.reduce((s: number, d: any) => s + d.totalCost, 0).toLocaleString()} د.ع</td>
                  <td class="text-left font-bold text-green">${stats.debtStats.totalCollected.toLocaleString()} د.ع</td>
                  <td class="text-left font-bold text-red">${stats.debtStats.totalOutstanding.toLocaleString()} د.ع</td>
                  <td class="text-center font-bold">${stats.debtStats.collectionRate}% محصل</td>
                </tr>
              </tfoot>
            </table>
          ` : ''}
        </div>
      ` : ''}

      <!-- 6. APPOINTMENTS EFFICIENCY SECTION (If 'appointments' or 'all') -->
      ${(reportType === 'appointments' || reportType === 'all') && stats.appointmentStats ? `
        <div class="section-wrapper">
          <div class="section-head">
            <div class="section-title">📅 كفاءة المواعيد ونسبة الحضور والالتزام (${periodLabel})</div>
            <span class="section-tag">نسبة الحضور: ${stats.appointmentStats.attendanceRate}%</span>
          </div>

          <table class="report-table">
            <thead>
              <tr>
                <th class="text-center">إجمالي المواعيد</th>
                <th class="text-center">المكتملة (تم الحضور)</th>
                <th class="text-center">المواعيد القادمة والمؤكدة</th>
                <th class="text-center">المواعيد الملغاة</th>
                <th class="text-center">الغياب بدون إشعار (No-Show)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="text-center font-extrabold">${stats.appointmentStats.total} موعد</td>
                <td class="text-center font-extrabold text-green">${stats.appointmentStats.completed} (${stats.appointmentStats.attendanceRate}%)</td>
                <td class="text-center font-bold text-blue">${stats.appointmentStats.confirmed} موعد</td>
                <td class="text-center font-bold" style="color:#d97706;">${stats.appointmentStats.cancelled} (${stats.appointmentStats.cancellationRate}%)</td>
                <td class="text-center font-extrabold text-red">${stats.appointmentStats.noShow} (${stats.appointmentStats.noShowRate}%)</td>
              </tr>
            </tbody>
          </table>
        </div>
      ` : ''}

      <!-- 7. Signatures & Official Stamp Endorsement -->
      <div class="report-footer">
        <div class="sig-box">
          <div class="sig-line-area"></div>
          <span class="sig-label-text">المسؤول المالي / المحاسب</span>
        </div>

        <div class="sig-box">
          <div class="stamp-circle">ختم العيادة</div>
          <span class="sig-label-text">الاعتماد الرسمي</span>
        </div>

        <div class="sig-box">
          <div class="sig-line-area"></div>
          <span class="sig-label-text">المدير الطبي / إدارة العيادة</span>
        </div>
      </div>

    </body>
    </html>
  `;

  printViaIframe(html);
};
