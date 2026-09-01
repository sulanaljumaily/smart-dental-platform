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
}

export const printExecutiveReport = ({
  clinic,
  stats,
  periodLabel,
  reportTypeLabel
}: PrintExecutiveReportParams) => {
  const clinicLogoUrl = clinic?.logo_url || clinic?.image_url || clinic?.image || '';
  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' });

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>التقرير الإداري والتنفيذي - ${clinic?.name || 'عيادة الأسنان'}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        @page {
          size: A4 portrait;
          margin: 12mm 12mm 12mm 12mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Cairo', sans-serif !important;
          direction: rtl !important;
          text-align: right !important;
          background: #ffffff !important;
          color: #1e293b !important;
          font-size: 11px;
          line-height: 1.4;
        }
        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .clinic-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .clinic-logo {
          width: 55px;
          height: 55px;
          border-radius: 12px;
          object-fit: cover;
          border: 1px solid #e2e8f0;
        }
        .clinic-title h1 {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
        }
        .clinic-title p {
          font-size: 10px;
          color: #64748b;
        }
        .report-meta {
          text-align: left;
        }
        .report-badge {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
          padding: 4px 10px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 11px;
          display: inline-block;
          margin-bottom: 4px;
        }
        .report-date {
          font-size: 10px;
          color: #64748b;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 18px;
        }
        .kpi-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px;
          text-align: center;
        }
        .kpi-card.highlight {
          background: #f0fdf4;
          border-color: #bbf7d0;
        }
        .kpi-card.expense {
          background: #fef2f2;
          border-color: #fecaca;
        }
        .kpi-title {
          font-size: 10px;
          color: #64748b;
          margin-bottom: 4px;
          font-weight: 600;
        }
        .kpi-value {
          font-size: 13px;
          font-weight: 800;
          color: #0f172a;
        }
        .kpi-card.highlight .kpi-value {
          color: #15803d;
        }
        .kpi-card.expense .kpi-value {
          color: #b91c1c;
        }

        .section-box {
          margin-bottom: 16px;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 12px;
          font-weight: 800;
          color: #1e293b;
          border-right: 4px solid #2563eb;
          padding-right: 8px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
          margin-bottom: 8px;
        }
        th {
          background: #f1f5f9;
          color: #334155;
          font-weight: 700;
          text-align: right;
          padding: 6px 8px;
          border: 1px solid #cbd5e1;
        }
        td {
          padding: 5px 8px;
          border: 1px solid #e2e8f0;
          color: #334155;
        }
        tr:nth-child(even) td {
          background: #f8fafc;
        }
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .font-bold { font-weight: 700; }
        .text-emerald { color: #059669; }
        .text-rose { color: #e11d48; }
        .text-blue { color: #2563eb; }

        .debts-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 8px;
        }
        .debt-pill {
          padding: 6px 10px;
          border-radius: 8px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .debt-pill.urgent {
          background: #fff1f2;
          border-color: #fecdd3;
          color: #be123c;
        }

        .report-footer {
          margin-top: 24px;
          border-top: 1px dashed #cbd5e1;
          padding-top: 14px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          page-break-inside: avoid;
        }
        .sig-block {
          text-align: center;
          width: 140px;
        }
        .sig-line {
          border-bottom: 1px solid #94a3b8;
          height: 35px;
          margin-bottom: 4px;
        }
        .sig-label {
          font-size: 9px;
          color: #64748b;
          font-weight: 700;
        }
      </style>
    </head>
    <body>
      <div class="report-header">
        <div class="clinic-brand">
          ${clinicLogoUrl ? `<img src="${clinicLogoUrl}" class="clinic-logo" />` : ''}
          <div class="clinic-title">
            <h1>${clinic?.name || 'عيادة الأسنان التخصصية'}</h1>
            <p>${clinic?.address || ''} ${clinic?.phone ? `| هاتف: ${clinic.phone}` : ''}</p>
          </div>
        </div>
        <div class="report-meta">
          <div class="report-badge">📊 ${reportTypeLabel}</div>
          <div class="report-date">الفترة: ${periodLabel} | التاريخ: ${dateStr}</div>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card highlight">
          <div class="kpi-title">إجمالي الإيرادات</div>
          <div class="kpi-value">${(stats.monthlyRevenue || 0).toLocaleString()} د.ع</div>
        </div>
        <div class="kpi-card expense">
          <div class="kpi-title">إجمالي المصروفات</div>
          <div class="kpi-value">${(stats.monthlyExpenses || 0).toLocaleString()} د.ع</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">صافي الأرباح (هامش: ${stats.profitMargin}%)</div>
          <div class="kpi-value ${(stats.monthlyRevenue - stats.monthlyExpenses) >= 0 ? 'text-emerald' : 'text-rose'}">
            ${(stats.monthlyRevenue - stats.monthlyExpenses).toLocaleString()} د.ع
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">المرضى النشطون | متوسط القيمة</div>
          <div class="kpi-value">${stats.totalPatients} مراجع (${(stats.avgPatientValue || 0).toLocaleString()} د.ع)</div>
        </div>
      </div>

      ${stats.staffStats && stats.staffStats.length > 0 ? `
        <div class="section-box">
          <div class="section-title">👨‍⚕️ إنتاجية الأطباء والكادر الطبي</div>
          <table>
            <thead>
              <tr>
                <th>الطبيب / الكادر</th>
                <th>التخصص / الدور</th>
                <th class="text-center">المواعيد المنجزة</th>
                <th class="text-center">نسبة الإنجاز</th>
                <th class="text-left">الإيراد المحقق</th>
                <th class="text-left">العمولة المستحقة</th>
              </tr>
            </thead>
            <tbody>
              ${stats.staffStats.map((s: any) => `
                <tr>
                  <td class="font-bold">${s.name}</td>
                  <td>${s.role}</td>
                  <td class="text-center">${s.completedCount} / ${s.appointmentsCount}</td>
                  <td class="text-center">${s.completionRate}%</td>
                  <td class="text-left font-bold text-emerald">${s.revenueGenerated.toLocaleString()} د.ع</td>
                  <td class="text-left font-bold text-blue">${s.commissionAmount.toLocaleString()} د.ع (${s.commissionRate}%)</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      ${stats.procedureStats && stats.procedureStats.length > 0 ? `
        <div class="section-box">
          <div class="section-title">🦷 العلاجات الأكثر طلباً ومساهمة بالإيرادات</div>
          <table>
            <thead>
              <tr>
                <th>اسم الإجراء / العلاج</th>
                <th class="text-center">عدد الحالات</th>
                <th class="text-center">الحصة من الإجمالي</th>
                <th class="text-left">متوسط السعر</th>
                <th class="text-left">إجمالي الإيرادات</th>
              </tr>
            </thead>
            <tbody>
              ${stats.procedureStats.slice(0, 6).map((p: any) => `
                <tr>
                  <td class="font-bold">${p.name}</td>
                  <td class="text-center">${p.count} حالة</td>
                  <td class="text-center font-bold">${p.percentage}%</td>
                  <td class="text-left">${p.avgCost.toLocaleString()} د.ع</td>
                  <td class="text-left font-bold text-emerald">${p.totalRevenue.toLocaleString()} د.ع</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      ${stats.debtStats ? `
        <div class="section-box">
          <div class="section-title">💳 تحليل أعمار الديون والمستحقات (معدل التحصيل: ${stats.debtStats.collectionRate}%)</div>
          <div class="debts-summary-grid">
            <div class="debt-pill">
              <span>ديون حديثة (0 - 30 يوماً):</span>
              <strong class="text-emerald">${stats.debtStats.aging0to30.amount.toLocaleString()} د.ع (${stats.debtStats.aging0to30.count})</strong>
            </div>
            <div class="debt-pill">
              <span>ديون متوسطة (31 - 60 يوماً):</span>
              <strong class="text-blue">${stats.debtStats.aging31to60.amount.toLocaleString()} د.ع (${stats.debtStats.aging31to60.count})</strong>
            </div>
            <div class="debt-pill urgent">
              <span>ديون متأخرة (+60 يوماً):</span>
              <strong>${stats.debtStats.aging60plus.amount.toLocaleString()} د.ع (${stats.debtStats.aging60plus.count})</strong>
            </div>
          </div>
        </div>
      ` : ''}

      ${stats.appointmentStats ? `
        <div class="section-box">
          <div class="section-title">📅 كفاءة المواعيد ونسبة الحضور والالتزام</div>
          <table>
            <thead>
              <tr>
                <th class="text-center">إجمالي المواعيد</th>
                <th class="text-center">المكتملة (حضور)</th>
                <th class="text-center">نسبة الحضور</th>
                <th class="text-center">الملغاة</th>
                <th class="text-center">لم يحضر (No-Show)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="text-center font-bold">${stats.appointmentStats.total}</td>
                <td class="text-center font-bold text-emerald">${stats.appointmentStats.completed}</td>
                <td class="text-center font-bold text-emerald">${stats.appointmentStats.attendanceRate}%</td>
                <td class="text-center text-rose">${stats.appointmentStats.cancelled} (${stats.appointmentStats.cancellationRate}%)</td>
                <td class="text-center font-bold text-rose">${stats.appointmentStats.noShow} (${stats.appointmentStats.noShowRate}%)</td>
              </tr>
            </tbody>
          </table>
        </div>
      ` : ''}

      <div class="report-footer">
        <div class="sig-block">
          <div class="sig-line"></div>
          <span class="sig-label">المسؤول المالي / المحاسب</span>
        </div>
        <div class="sig-block">
          <div class="sig-line"></div>
          <span class="sig-label">المدير الطبي / إدارة العيادة</span>
        </div>
        <div class="sig-block">
          <div class="sig-line"></div>
          <span class="sig-label">ختم واعتماد العيادة الرسمي</span>
        </div>
      </div>
    </body>
    </html>
  `;

  printViaIframe(html);
};
