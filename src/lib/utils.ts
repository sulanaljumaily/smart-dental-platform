import { clsx, ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' د.ع';
}

export function formatDate(date: string | Date | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function formatActivityDetails(action: string, details: any): string {
  if (!details) return 'لا توجد تفاصيل إضافية';
  
  // Parse if stringified JSON
  let parsedDetails = details;
  if (typeof details === 'string') {
    try {
      parsedDetails = JSON.parse(details);
    } catch (e) {
      // If it's a plain string, return it as is or try to handle
      if (details.startsWith('{') || details.startsWith('[')) {
        return details;
      }
      return details;
    }
  }

  const formatAmount = (val: number) => {
    return new Intl.NumberFormat('ar-IQ').format(val) + ' د.ع';
  };

  const getCategoryArabic = (cat: string) => {
    const cats: Record<string, string> = {
      treatment: 'علاج',
      bills: 'فواتير/مصاريف تشغيلية',
      rent: 'إيجار العيادة',
      salary: 'رواتب الموظفين',
      materials: 'مواد ومستلزمات سنية',
      consultation: 'كشف واستشارة',
      other: 'أخرى'
    };
    return cats[cat] || cat;
  };

  const actionLower = (action || '').toLowerCase();

  // 1. Transactions Actions
  if (actionLower.includes('transaction')) {
    const typeStr = parsedDetails.type === 'income' ? 'إيراد' : 'مصروف';
    const amountStr = parsedDetails.amount ? formatAmount(parsedDetails.amount) : '';
    const catStr = parsedDetails.category ? getCategoryArabic(parsedDetails.category) : '';
    const reasonStr = parsedDetails.reason ? ` (${parsedDetails.reason})` : '';
    const patientStr = parsedDetails.patientName ? ` للمريض: ${parsedDetails.patientName}` : '';

    if (actionLower.startsWith('create') || actionLower.startsWith('add')) {
      return `إضافة ${typeStr} بقيمة ${amountStr}${patientStr} - فئة ${catStr}`;
    }
    if (actionLower.startsWith('update') || actionLower.startsWith('edit')) {
      return `تعديل ${typeStr} بقيمة ${amountStr}${patientStr}${reasonStr}`;
    }
    if (actionLower.startsWith('delete') || actionLower.startsWith('remove')) {
      return `حذف ${typeStr} بقيمة ${amountStr}${patientStr}${reasonStr}`;
    }
    return `${typeStr}: ${amountStr}${patientStr} - ${catStr}`;
  }

  // 2. Patient Actions
  if (actionLower.includes('patient')) {
    const nameStr = parsedDetails.name || parsedDetails.full_name || parsedDetails.fullName || '';
    const reasonStr = parsedDetails.reason ? ` (${parsedDetails.reason})` : '';

    if (actionLower.startsWith('create') || actionLower.startsWith('add') || actionLower === 'تسجيل مريض') {
      return `إضافة ملف المريض: ${nameStr}`;
    }
    if (actionLower.startsWith('update') || actionLower.startsWith('edit')) {
      return `تعديل ملف المريض: ${nameStr}${reasonStr}`;
    }
    if (actionLower.startsWith('delete') || actionLower.startsWith('remove')) {
      const targetName = nameStr ? ` ${nameStr}` : '';
      return `حذف ملف المريض${targetName}${reasonStr}`;
    }
    return `مريض: ${nameStr}`;
  }

  // 3. Staff & Invitation Actions
  if (actionLower.includes('staff') || actionLower.includes('invitation')) {
    const nameStr = parsedDetails.name || parsedDetails.full_name || parsedDetails.fullName || '';
    const emailStr = parsedDetails.email || '';
    const roleStr = parsedDetails.role === 'doctor' ? 'طبيب' : parsedDetails.role === 'assistant' ? 'مساعد' : parsedDetails.role || '';
    const inviteIdStr = parsedDetails.invitationId ? ` (رقم الدعوة: ${parsedDetails.invitationId.substring(0, 8)}...)` : '';

    if (actionLower === 'cancel_invitation') {
      const staffEmailStr = emailStr ? ` لـ ${emailStr}` : '';
      return `إلغاء دعوة انضمام موظف${staffEmailStr}${inviteIdStr}`;
    }
    if (actionLower === 'send_invitation') {
      return `إرسال دعوة انضمام لـ ${roleStr}: ${emailStr}`;
    }
    if (actionLower.startsWith('create') || actionLower.startsWith('add')) {
      return `إضافة الموظف: ${nameStr} (${roleStr})`;
    }
    if (actionLower.startsWith('update') || actionLower.startsWith('edit')) {
      return `تعديل بيانات الموظف: ${nameStr}`;
    }
    if (actionLower.startsWith('delete') || actionLower.startsWith('remove')) {
      return `حذف الموظف: ${nameStr}`;
    }
    return `موظف: ${nameStr || emailStr}`;
  }

  // Fallback if not mapped
  return typeof parsedDetails === 'object' ? JSON.stringify(parsedDetails) : String(parsedDetails);
}

/**
 * Maps category keys to readable Arabic names, preserving custom names.
 */
export function formatCategoryName(category?: string, type?: 'income' | 'expense' | string): string {
  if (!category) return type === 'income' ? 'إيراد مالي' : 'مصروف عام';
  const cat = category.toLowerCase().trim();
  switch (cat) {
    case 'treatment': return 'علاج أسنان';
    case 'consultation': return 'كشفية / استشارة';
    case 'salary': return 'رواتب وأجور';
    case 'inventory': return 'مشتريات ومواد ومخزون';
    case 'materials': return 'مواد ومستلزمات طبية';
    case 'supplies': return 'مستلزمات طبية';
    case 'lab': return 'أعمال مختبر ومعمل';
    case 'rent': return 'إيجار العيادة';
    case 'bills': return 'فواتير وخدمات';
    case 'asset_purchase':
    case 'equipment':
    case 'assets': return 'شراء أصول ومعدات';
    case 'maintenance': return 'صيانة وتشغيل';
    case 'marketing':
    case 'advertising': return 'إعلانات وتسويق';
    case 'cleaning': return 'نظافة وضيافة';
    case 'other': return 'أخرى / متنوع';
    default: return category; // Preserve custom Arabic category names
  }
}
