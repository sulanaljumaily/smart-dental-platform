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
  reportTypeLabel: string;
  selectedType?: string;
}

export const printExecutiveReport = ({
  clinic,
  stats,
  periodLabel,
  reportTypeLabel,
  selectedType = 'all'
}: PrintExecutiveReportParams) => {
  const clinicLogoUrl = clinic?.logo_url || clinic?.image_url || clinic?.image || clinic?.logo || '';
  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });
  const reportRefId = `REP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  const netProfit = (stats.monthlyRevenue || 0) - (stats.monthlyExpenses || 0);

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>${reportTypeLabel} - ${clinic?.name || 'العيادة'}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
        
        @page {
          size: A4 portrait;
          margin: 10mm 12mm 12mm 12mm;
        }

        *, *::before, *::after {
          box-sizing: border-box !important;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        body {
          font-family: 'Cairo', sans-serif !important;
          direction: rtl !important;
          text-align: right !important;
          background: #ffffff !important;
          color: #0f172a !important;
          font-size: 10.5px;
          line-height: 1.4;
          padding: 0;
          width: 100%;
        }

        /* Container */
        .report-page {
          width: 100%;
          max-width: 100%;
          margin: 0 auto;
        }

        /* Header */
        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: linear-gradient(135deg, #0f2b5c 0%, #1e3a8a 100%);
          border-radius: 10px;
          color: #ffffff;
          margin-bottom: 12px;
          width: 100%;
          box-sizing: border-box;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .clinic-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 28%;
        }

        .clinic-logo {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          object-fit: cover;
          background: #ffffff;
          padding: 2px;
          border: 1.5px solid rgba(255, 255, 255, 0.4);
          flex-shrink: 0;
        }

        .clinic-logo-placeholder {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          flex-shrink: 0;
        }

        .clinic-info h1 {
          font-size: 15px;
          font-weight: 900;
          color: #ffffff;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .clinic-info p {
          font-size: 9px;
          color: #cbd5e1;
          margin-top: 2px;
          line-height: 1.2;
        }

        .report-center-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          width: 44%;
        }

        .report-title-pill {
          font-size: 14px;
          font-weight: 900;
          color: #ffffff;
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.4);
          padding: 4px 14px;
          border-radius: 8px;
          letter-spacing: -0.2px;
          display: inline-block;
          white-space: nowrap;
          box-shadow: 0 2px 4px rgba(0,0,0,0.12);
        }

        .report-sub-details {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          margin-top: 4px;
          flex-wrap: wrap;
        }

        .report-meta-chip {
          font-size: 8px;
          background: rgba(0, 0, 0, 0.25);
          color: #e2e8f0;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
          border: 1px solid rgba(255, 255, 255, 0.15);
          white-space: nowrap;
        }

        .header-left-side {
          width: 28%;
          display: flex;
          justify-content: flex-end;
          align-items: center;
        }

        .official-stamp-badge {
          background: #ffffff;
          border-radius: 6px;
          padding: 4px 10px;
          text-align: center;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .badge-title {
          display: block;
          font-size: 9.5px;
          font-weight: 800;
          color: #1e3a8a;
          line-height: 1.2;
        }

        .badge-sub {
          display: block;
          font-size: 7.5px;
          font-weight: 600;
          color: #64748b;
          margin-top: 1px;
        }

        /* KPI Bento Grid */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 12px;
          width: 100%;
          box-sizing: border-box;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .kpi-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px 10px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .kpi-card::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          left: 0;
          height: 3px;
          background: #cbd5e1;
        }

        .kpi-card.green::before { background: #10b981; }
        .kpi-card.blue::before { background: #3b82f6; }
        .kpi-card.purple::before { background: #8b5cf6; }
        .kpi-card.red::before { background: #ef4444; }
        .kpi-card.orange::before { background: #f59e0b; }

        .kpi-label {
          font-size: 9px;
          font-weight: 700;
          color: #64748b;
          margin-bottom: 2px;
          white-space: nowrap;
        }

        .kpi-value {
          font-size: 13.5px;
          font-weight: 900;
          color: #0f172a;
          line-height: 1.2;
          white-space: nowrap;
        }

        .kpi-sub {
          font-size: 8px;
          color: #94a3b8;
          margin-top: 2px;
          font-weight: 600;
          white-space: nowrap;
        }

        .text-green { color: #047857 !important; }
        .text-red { color: #b91c1c !important; }
        .text-blue { color: #1d4ed8 !important; }
        .text-purple { color: #6d28d9 !important; }

        /* Section Boxes */
        .section-box {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px 10px;
          margin-bottom: 10px;
          width: 100%;
          box-sizing: border-box;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 5px;
        }

        .section-title {
          font-size: 11px;
          font-weight: 800;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .section-badge {
          font-size: 8.5px;
          background: #f1f5f9;
          color: #475569;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 700;
        }

        /* Unified Tables */
        table {
          width: 100% !important;
          max-width: 100% !important;
          table-layout: fixed !important;
          border-collapse: collapse !important;
          font-size: 9px;
          box-sizing: border-box !important;
        }

        th {
          background: #f1f5f9;
          color: #334155;
          font-weight: 800;
          text-align: right;
          padding: 5px 6px;
          border: 1px solid #e2e8f0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        td {
          padding: 4.5px 6px;
          border: 1px solid #e2e8f0;
          color: #1e293b;
          vertical-align: middle;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        tr:nth-child(even) td {
          background: #fafbfc;
        }

        .text-center { text-align: center !important; }
        .text-left { text-align: left !important; }
        .font-bold { font-weight: 800 !important; }

        /* 3-Tier Debt Aging */
        .aging-cards-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 6px;
          width: 100%;
          box-sizing: border-box;
        }

        .aging-card {
          border-radius: 6px;
          padding: 6px 8px;
          border: 1px solid transparent;
        }

        .aging-card.green {
          background: #f0fdf4;
          border-color: #bbf7d0;
        }

        .aging-card.blue {
          background: #eff6ff;
          border-color: #bfdbfe;
        }

        .aging-card.red {
          background: #fef2f2;
          border-color: #fecaca;
        }

        .aging-card-title {
          font-size: 9px;
          font-weight: 800;
          margin-bottom: 2px;
          display: flex;
          justify-content: space-between;
        }

        .aging-card-val {
          font-size: 12px;
          font-weight: 900;
        }

        /* Footer & Signatures */
        .report-footer {
          margin-top: 12px;
          padding-top: 8px;
          border-top: 1.5px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          page-break-inside: avoid;
          break-inside: avoid;
          width: 100%;
          box-sizing: border-box;
        }

        .stamp-box {
          width: 110px;
          height: 50px;
          border: 1.5px dashed #93c5fd;
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          color: #1d4ed8;
          font-size: 8px;
          font-weight: 800;
          text-align: center;
          line-height: 1.25;
        }

        .signatures-area {
          display: flex;
          gap: 25px;
        }

        .signature-item {
          text-align: center;
          width: 115px;
        }

        .signature-line {
          border-bottom: 1px solid #64748b;
          height: 25px;
          margin-bottom: 3px;
        }

        .signature-role {
          font-size: 8.5px;
          font-weight: 700;
          color: #475569;
        }

        .bottom-watermark {
          text-align: center;
          font-size: 7.5px;
          color: #94a3b8;
          margin-top: 6px;
        }
      </style>
    </head>
    <body>
      <div class="report-page">
        
        <!-- Centered Header -->
        <div class="report-header">
          <!-- Right: Clinic Brand -->
          <div class="clinic-brand">
            ${clinicLogoUrl 
              ? `<img src="${clinicLogoUrl}" class="clinic-logo" />` 
              : `<div class="clinic-logo-placeholder">🦷</div>`
            }
            <div class="clinic-info">
              <h1>${clinic?.name || 'عيادة الأسنان التخصصية'}</h1>
              <p>${clinic?.phone ? `هاتف: ${clinic.phone}` : 'نظام سمارت دينتل'}</p>
              ${clinic?.address ? `<p>${clinic.address}</p>` : ''}
            </div>
          </div>

          <!-- Center: Report Name & Details -->
          <div class="report-center-box">
            <div class="report-title-pill">${reportTypeLabel}</div>
            <div class="report-sub-details">
              <span class="report-meta-chip">📅 ${periodLabel}</span>
              <span class="report-meta-chip">⏰ ${dateStr} (${timeStr})</span>
              <span class="report-meta-chip"># ${reportRefId}</span>
            </div>
          </div>

          <!-- Left: Official Document Badge -->
          <div class="header-left-side">
            <div class="official-stamp-badge">
              <span class="badge-title">وثيقة إدارية رسمية</span>
              <span class="badge-sub">معتمد من إدارة المركز</span>
            </div>
          </div>
        </div>

        <!-- 4 Primary KPI Bento Cards -->
        <div class="kpi-grid">
          ${selectedType === 'staff' ? `
            <div class="kpi-card green">
              <div class="kpi-label">إجمالي إنتاجية الكادر</div>
              <div class="kpi-value text-green">${(stats.staffStats?.reduce((sum: number, s: any) => sum + s.revenueGenerated, 0) || 0).toLocaleString()} د.ع</div>
              <div class="kpi-sub">${periodLabel}</div>
            </div>
            <div class="kpi-card blue">
              <div class="kpi-label">الكادر الطبي النشط</div>
              <div class="kpi-value text-blue">${stats.staffStats?.length || 0} أطباء وموظفين</div>
              <div class="kpi-sub">طاقم العيادة</div>
            </div>
            <div class="kpi-card purple">
              <div class="kpi-label">الجلسات المنجزة</div>
              <div class="kpi-value text-purple">${stats.staffStats?.reduce((sum: number, s: any) => sum + s.completedCount, 0) || 0} جلسة</div>
              <div class="kpi-sub">معدل الإنجاز</div>
            </div>
            <div class="kpi-card orange">
              <div class="kpi-label">العمولات المستحقة</div>
              <div class="kpi-value">${(stats.staffStats?.reduce((sum: number, s: any) => sum + s.commissionAmount, 0) || 0).toLocaleString()} د.ع</div>
              <div class="kpi-sub">مستحقات الكادر</div>
            </div>
          ` : selectedType === 'procedures' ? `
            <div class="kpi-card blue">
              <div class="kpi-label">إجمالي الحالات المنفذة</div>
              <div class="kpi-value text-blue">${stats.procedureStats?.reduce((sum: number, p: any) => sum + p.count, 0) || 0} حالة</div>
              <div class="kpi-sub">${periodLabel}</div>
            </div>
            <div class="kpi-card purple">
              <div class="kpi-label">الإجراء الأكثر طلباً</div>
              <div class="kpi-value text-purple">${stats.procedureStats?.[0]?.name || 'حشوات الأسنان'}</div>
              <div class="kpi-sub">الخدمة الأولى</div>
            </div>
            <div class="kpi-card green">
              <div class="kpi-label">إجمالي إيراد الإجراءات</div>
              <div class="kpi-value text-green">${(stats.procedureStats?.reduce((sum: number, p: any) => sum + p.totalRevenue, 0) || 0).toLocaleString()} د.ع</div>
              <div class="kpi-sub">العائد الطبي</div>
            </div>
            <div class="kpi-card orange">
              <div class="kpi-label">متوسط سعر الجلسة</div>
              <div class="kpi-value">${(stats.procedureStats?.length > 0 
                ? Math.round(stats.procedureStats.reduce((sum: number, p: any) => sum + p.totalRevenue, 0) / Math.max(1, stats.procedureStats.reduce((sum: number, p: any) => sum + p.count, 0))) 
                : 0).toLocaleString()} د.ع</div>
              <div class="kpi-sub">لكل إجراء</div>
            </div>
          ` : selectedType === 'debts' ? `
            <div class="kpi-card red">
              <div class="kpi-label">إجمالي الديون المعلقة</div>
              <div class="kpi-value text-red">${(stats.debtStats?.totalOutstanding || 0).toLocaleString()} د.ع</div>
              <div class="kpi-sub">مطلوبة للتحصيل</div>
            </div>
            <div class="kpi-card green">
              <div class="kpi-label">إجمالي المبالغ المحصلة</div>
              <div class="kpi-value text-green">${(stats.debtStats?.totalCollected || 0).toLocaleString()} د.ع</div>
              <div class="kpi-sub">مسددة بنجاح</div>
            </div>
            <div class="kpi-card purple">
              <div class="kpi-label">معدل التحصيل المالي</div>
              <div class="kpi-value text-purple">${stats.debtStats?.collectionRate || 0}%</div>
              <div class="kpi-sub">نسبة الكفاءة</div>
            </div>
            <div class="kpi-card orange">
              <div class="kpi-label">المراجعين المدينين</div>
              <div class="kpi-value">${stats.debtStats?.totalDebtorsCount || 0} مراجع</div>
              <div class="kpi-sub">للمتابعة</div>
            </div>
          ` : selectedType === 'appointments' ? `
            <div class="kpi-card blue">
              <div class="kpi-label">إجمالي المواعيد</div>
              <div class="kpi-value text-blue">${stats.appointmentStats?.total || 0} موعد</div>
              <div class="kpi-sub">${periodLabel}</div>
            </div>
            <div class="kpi-card green">
              <div class="kpi-label">نسبة الحضور المكتملة</div>
              <div class="kpi-value text-green">${stats.appointmentStats?.attendanceRate || 0}%</div>
              <div class="kpi-sub">${stats.appointmentStats?.completed || 0} موعد مكتمل</div>
            </div>
            <div class="kpi-card red">
              <div class="kpi-label">نسبة الغياب (No-Show)</div>
              <div class="kpi-value text-red">${stats.appointmentStats?.noShowRate || 0}%</div>
              <div class="kpi-sub">${stats.appointmentStats?.noShow || 0} غياب</div>
            </div>
            <div class="kpi-card orange">
              <div class="kpi-label">نسبة الإلغاء</div>
              <div class="kpi-value">${stats.appointmentStats?.cancellationRate || 0}%</div>
              <div class="kpi-sub">${stats.appointmentStats?.cancelled || 0} موعد ملغى</div>
            </div>
          ` : `
            <div class="kpi-card green">
              <div class="kpi-label">إجمالي الإيرادات</div>
              <div class="kpi-value text-green">${(stats.monthlyRevenue || 0).toLocaleString()} د.ع</div>
              <div class="kpi-sub">${periodLabel}</div>
            </div>
            <div class="kpi-card red">
              <div class="kpi-label">إجمالي المصروفات</div>
              <div class="kpi-value text-red">${(stats.monthlyExpenses || 0).toLocaleString()} د.ع</div>
              <div class="kpi-sub">${periodLabel}</div>
            </div>
            <div class="kpi-card purple">
              <div class="kpi-label">صافي الأرباح (هامش ${stats.profitMargin || 0}%)</div>
              <div class="kpi-value ${netProfit >= 0 ? 'text-green' : 'text-red'}">${netProfit.toLocaleString()} د.ع</div>
              <div class="kpi-sub">${netProfit >= 0 ? 'ربح تشغيلي صافي' : 'عجز مؤقت'}</div>
            </div>
            <div class="kpi-card blue">
              <div class="kpi-label">المرضى النشطون | متوسط القيمة</div>
              <div class="kpi-value text-blue">${stats.totalPatients || 0} مراجع</div>
              <div class="kpi-sub">متوسط: ${(stats.avgPatientValue || 0).toLocaleString()} د.ع</div>
            </div>
          `}
        </div>

        <!-- Section 1: Staff / Doctor Performance -->
        ${(selectedType === 'all' || selectedType === 'staff') && stats.staffStats?.length > 0 ? `
          <div class="section-box">
            <div class="section-header">
              <div class="section-title">👨‍⚕️ إنتاجية وأداء الأطباء والكادر الطبي</div>
              <span class="section-badge">${stats.staffStats.length} أطباء وموظفين</span>
            </div>
            <table>
              <colgroup>
                <col style="width: 22%;">
                <col style="width: 16%;">
                <col style="width: 13%;">
                <col style="width: 11%;">
                <col style="width: 14%;">
                <col style="width: 10%;">
                <col style="width: 14%;">
              </colgroup>
              <thead>
                <tr>
                  <th>الطبيب / الموظف</th>
                  <th>الدور والتخصص</th>
                  <th class="text-center">المواعيد والجلسات</th>
                  <th class="text-center">نسبة الإنجاز</th>
                  <th class="text-left">الإيراد المحقق</th>
                  <th class="text-left">نسبة العمولة</th>
                  <th class="text-left">العمولة المستحقة</th>
                </tr>
              </thead>
              <tbody>
                ${stats.staffStats.map((s: any) => `
                  <tr>
                    <td class="font-bold">${s.name}</td>
                    <td>${s.role}</td>
                    <td class="text-center font-bold">${s.completedCount} <span style="color: #94a3b8; font-weight: normal;">/ ${s.appointmentsCount}</span></td>
                    <td class="text-center">
                      <span style="background: #ecfdf5; color: #047857; padding: 1.5px 5px; border-radius: 4px; font-weight: 800; font-size: 8.5px;">
                        ${s.completionRate}%
                      </span>
                    </td>
                    <td class="text-left font-bold text-green">${(s.revenueGenerated || 0).toLocaleString()} د.ع</td>
                    <td class="text-left">${s.commissionRate}%</td>
                    <td class="text-left font-bold text-blue">${(s.commissionAmount || 0).toLocaleString()} د.ع</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <!-- Section 2: Top Procedures -->
        ${(selectedType === 'all' || selectedType === 'procedures') && stats.procedureStats?.length > 0 ? `
          <div class="section-box">
            <div class="section-header">
              <div class="section-title">🦷 العلاجات والإجراءات الطبية الأكثر طلباً وربحية</div>
              <span class="section-badge">تحليل الجدوى والخدمات</span>
            </div>
            <table>
              <colgroup>
                <col style="width: 34%;">
                <col style="width: 16%;">
                <col style="width: 14%;">
                <col style="width: 18%;">
                <col style="width: 18%;">
              </colgroup>
              <thead>
                <tr>
                  <th>اسم الإجراء / العلاج</th>
                  <th class="text-center">عدد الحالات</th>
                  <th class="text-center">الحصة من الإجمالي</th>
                  <th class="text-left">متوسط سعر الجلسة</th>
                  <th class="text-left">إجمالي الإيرادات</th>
                </tr>
              </thead>
              <tbody>
                ${stats.procedureStats.slice(0, selectedType === 'procedures' ? 12 : 5).map((p: any) => `
                  <tr>
                    <td class="font-bold">${p.name}</td>
                    <td class="text-center">${p.count} حالة</td>
                    <td class="text-center">
                      <strong style="color: #1e3a8a;">${p.percentage}%</strong>
                    </td>
                    <td class="text-left">${(p.avgCost || 0).toLocaleString()} د.ع</td>
                    <td class="text-left font-bold text-green">${(p.totalRevenue || 0).toLocaleString()} د.ع</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <!-- Section 3: Debts & Aging Receivables -->
        ${(selectedType === 'all' || selectedType === 'debts') && stats.debtStats ? `
          <div class="section-box">
            <div class="section-header">
              <div class="section-title">💳 تقرير أعمار الديون والمستحقات المالية</div>
              <span class="section-badge">معدل التحصيل العام: ${stats.debtStats.collectionRate || 0}%</span>
            </div>
            
            <div class="aging-cards-grid">
              <div class="aging-card green">
                <div class="aging-card-title">
                  <span style="color: #047857;">🟢 ديون حديثة (0 - 30 يوماً)</span>
                  <span>${stats.debtStats.aging0to30?.count || 0} مراجع</span>
                </div>
                <div class="aging-card-val text-green">${(stats.debtStats.aging0to30?.amount || 0).toLocaleString()} د.ع</div>
              </div>

              <div class="aging-card blue">
                <div class="aging-card-title">
                  <span style="color: #1d4ed8;">🔵 ديون متوسطة (31 - 60 يوماً)</span>
                  <span>${stats.debtStats.aging31to60?.count || 0} مراجع</span>
                </div>
                <div class="aging-card-val text-blue">${(stats.debtStats.aging31to60?.amount || 0).toLocaleString()} د.ع</div>
              </div>

              <div class="aging-card red">
                <div class="aging-card-title">
                  <span style="color: #b91c1c;">🔴 ديون متأخرة (+60 يوماً)</span>
                  <span>${stats.debtStats.aging60plus?.count || 0} مراجع</span>
                </div>
                <div class="aging-card-val text-red">${(stats.debtStats.aging60plus?.amount || 0).toLocaleString()} د.ع</div>
              </div>
            </div>

            ${selectedType === 'debts' && stats.debtStats.debtorsList?.length > 0 ? `
              <table style="margin-top: 6px;">
                <colgroup>
                  <col style="width: 20%;">
                  <col style="width: 20%;">
                  <col style="width: 14%;">
                  <col style="width: 14%;">
                  <col style="width: 14%;">
                  <col style="width: 9%;">
                  <col style="width: 9%;">
                </colgroup>
                <thead>
                  <tr>
                    <th>المراجع</th>
                    <th>العلاج / الخطة</th>
                    <th class="text-left">التكلفة</th>
                    <th class="text-left">المدفوع</th>
                    <th class="text-left">المتبقي</th>
                    <th class="text-center">أيام التأخير</th>
                    <th class="text-center">التصنيف</th>
                  </tr>
                </thead>
                <tbody>
                  ${stats.debtStats.debtorsList.slice(0, 10).map((d: any) => `
                    <tr>
                      <td class="font-bold">${d.patientName}</td>
                      <td>${d.treatmentDescription}</td>
                      <td class="text-left">${(d.totalCost || 0).toLocaleString()} د.ع</td>
                      <td class="text-left text-green font-bold">${(d.paid || 0).toLocaleString()} د.ع</td>
                      <td class="text-left text-red font-bold">${(d.remaining || 0).toLocaleString()} د.ع</td>
                      <td class="text-center font-bold">${d.daysOld} يوم</td>
                      <td class="text-center">
                        <span style="padding: 1.5px 5px; border-radius: 4px; font-weight: 700; font-size: 8px; ${
                          d.ageCategory === '0-30' ? 'background: #ecfdf5; color: #047857;' :
                          d.ageCategory === '31-60' ? 'background: #eff6ff; color: #1d4ed8;' : 'background: #fef2f2; color: #b91c1c;'
                        }">
                          ${d.ageCategory === '0-30' ? '0-30 يوم' : d.ageCategory === '31-60' ? '31-60 يوم' : '+60 يوم'}
                        </span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : ''}
          </div>
        ` : ''}

        <!-- Section 4: Appointments Efficiency -->
        ${(selectedType === 'all' || selectedType === 'appointments') && stats.appointmentStats ? `
          <div class="section-box">
            <div class="section-header">
              <div class="section-title">📅 كفاءة المواعيد ونسبة الحضور والالتزام</div>
              <span class="section-badge">إجمالي المواعيد: ${stats.appointmentStats.total || 0}</span>
            </div>
            <table>
              <colgroup>
                <col style="width: 20%;">
                <col style="width: 20%;">
                <col style="width: 20%;">
                <col style="width: 20%;">
                <col style="width: 20%;">
              </colgroup>
              <thead>
                <tr>
                  <th class="text-center">المواعيد المكتملة (حضور)</th>
                  <th class="text-center">نسبة الحضور</th>
                  <th class="text-center">المواعيد المؤكدة</th>
                  <th class="text-center">المواعيد الملغاة</th>
                  <th class="text-center">الغياب بدون إشعار (No-Show)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="text-center font-bold text-green">${stats.appointmentStats.completed || 0} موعد</td>
                  <td class="text-center font-bold text-green">${stats.appointmentStats.attendanceRate || 0}%</td>
                  <td class="text-center font-bold text-blue">${stats.appointmentStats.confirmed || 0} موعد</td>
                  <td class="text-center text-red">${stats.appointmentStats.cancelled || 0} (${stats.appointmentStats.cancellationRate || 0}%)</td>
                  <td class="text-center font-bold text-red">${stats.appointmentStats.noShow || 0} (${stats.appointmentStats.noShowRate || 0}%)</td>
                </tr>
              </tbody>
            </table>
          </div>
        ` : ''}

        <!-- Signatures & Verification Footer -->
        <div class="report-footer">
          <div class="stamp-box">
            <span>معتمد رسمياً</span>
            <span>ختم الإدارة الطبية</span>
            <span style="font-size: 7px; color: #64748b; margin-top: 1px;">${clinic?.name || 'العيادة'}</span>
          </div>

          <div class="signatures-area">
            <div class="signature-item">
              <div class="signature-line"></div>
              <div class="signature-role">المسؤول المالي / المحاسب</div>
            </div>

            <div class="signature-item">
              <div class="signature-line"></div>
              <div class="signature-role">المدير الطبي / إدارة المركز</div>
            </div>
          </div>
        </div>

        <div class="bottom-watermark">
          تم إنشاء هذا التقرير آلياً عبر منصة سمارت دينتل لإدارة العيادات والمراكز الطبية التخصصية • وثيقة إدارية رسمية معتمدة
        </div>

      </div>
    </body>
    </html>
  `;

  printViaIframe(html);
};
