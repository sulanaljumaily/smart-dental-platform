# نظام إدارة الخطط العلاجية - التوثيق الشامل

## نظرة عامة
تم تطوير نظام متكامل لإدارة الخطط العلاجية للأسنان مع ثلاث نوافذ منبثقة متميزة.

## الميزات الرئيسية

### 1. نافذة عرض التفاصيل (أزرق - #3B82F6)
**الموقع:** `src/components/treatment/ViewTreatmentModal.tsx`
**الحالة:** قراءة فقط (View-Only)

#### المميزات:
- عرض شامل لجميع تفاصيل الخطة العلاجية
- معلومات المريض والسن
- المعلومات المالية (التكلفة، المدفوع، المتبقي)
- التشخيص والحالة
- قائمة الجلسات مع تفاصيلها
- إحصائيات ملخصة (إجمالي الجلسات، المكتملة، المعلقة)

#### الأزرار:
- إغلاق (X)
- طباعة (Printer)
- تعديل (Edit2) - يفتح نافذة التعديل

---

### 2. نافذة التعديل (أخضر - #10B981)
**الموقع:** `src/components/treatment/EditTreatmentModal.tsx`
**الحالة:** قابل للتحرير (Editable)

#### المميزات:
- تعديل جميع بيانات الخطة العلاجية
- تحديث رقم السن ونوع العلاج والحالة
- تعديل التشخيص والملاحظات
- إدارة الجلسات (إضافة، حذف، تعديل)
- تعديل التاريخ والوقت والمدة لكل جلسة
- تحديث التكاليف والمدفوعات
- ملخص مالي تلقائي محسوب

#### الأزرار:
- إلغاء (X)
- حفظ التعديلات (Save)
- إكمال الخطة (CheckCircle)

#### التحديثات التلقائية:
- حساب التكلفة الإجمالية من مجموع تكاليف الجلسات
- حساب المبلغ المدفوع من مجموع المدفوعات
- حساب المبلغ المتبقي تلقائياً

---

### 3. نافذة إنشاء خطة جديدة (برتقالي - #F59E0B)
**الموقع:** `src/components/treatment/CreateTreatmentModal.tsx`
**الحالة:** إنشاء من الصفر (Create New)

#### المميزات:
- إنشاء خطة علاجية جديدة من البداية
- اختيار رقم السن (11-48 حسب نظام FDI)
- اختيار نوع العلاج (علاج عصب، حشوة، تاج، إلخ)
- إدخال التشخيص التفصيلي
- تحديد عدد الجلسات المتوقع
- تحديد مدة الجلسة الواحدة
- تقدير التكلفة (مع أسعار تلقائية حسب نوع العلاج)
- خيار طلب عمل مختبري
- ملخص شامل للخطة قبل الإنشاء

#### الأزرار:
- إلغاء (X)
- حفظ كمسودة (Save)
- إنشاء الخطة (Plus)

#### الأسعار التقديرية:
```javascript
{
  'علاج عصب': 300000 د.ع,
  'حشوة': 100000 د.ع,
  'تاج': 400000 د.ع,
  'خلع': 50000 د.ع,
  'تنظيف': 75000 د.ع,
  'تقويم': 2000000 د.ع,
  'قشرة': 500000 د.ع,
  'زراعة': 1500000 د.ع
}
```

---

## التكامل مع PatientProfile.tsx

### التحديثات الرئيسية:

1. **الاستيرادات الجديدة:**
```typescript
import { ViewTreatmentModal, EditTreatmentModal, CreateTreatmentModal } from '../../components/treatment';
```

2. **الحالات (States) الجديدة:**
```typescript
const [showViewTreatmentModal, setShowViewTreatmentModal] = useState(false);
const [showEditTreatmentModal, setShowEditTreatmentModal] = useState(false);
const [showCreateTreatmentModal, setShowCreateTreatmentModal] = useState(false);
const [selectedTreatmentPlan, setSelectedTreatmentPlan] = useState<any>(null);
```

3. **البيانات النموذجية:**
- 4 خطط علاجية نموذجية
- تغطي جميع الحالات: in_progress, pending, completed, cancelled
- تحتوي على جلسات متعددة بحالات مختلفة

4. **المعالجات (Handlers):**
```typescript
handleViewTreatment(plan) // فتح نافذة العرض
handleEditTreatment(plan) // فتح نافذة التعديل
handleCreateTreatment() // فتح نافذة الإنشاء
handleSaveTreatment(updatedPlan) // حفظ التعديلات
handleCreateNewTreatment(newPlan) // إنشاء خطة جديدة
handleCompleteSession(planId, sessionId) // إكمال جلسة
```

---

## قسم الخطط العلاجية في renderTreatmentPlanTab

### المكونات الجديدة:

#### 1. بطاقة إنشاء خطة جديدة:
- تصميم متدرج برتقالي جذاب
- زر كبير "إنشاء خطة جديدة"
- نص توضيحي

#### 2. قائمة الخطط العلاجية:
- عرض جميع الخطط بتصميم بطاقات احترافي
- ألوان مميزة حسب الحالة
- معلومات شاملة لكل خطة:
  * رقم السن
  * نوع العلاج
  * التكلفة الإجمالية
  * المدفوع
  * المتبقي
  * عدد الجلسات
  * التشخيص
  * قائمة الجلسات مع حالة كل جلسة

#### 3. الأزرار التفاعلية:
- زر "عرض" (أزرق) - يفتح ViewTreatmentModal
- زر "تعديل" (أخضر) - يفتح EditTreatmentModal
- زر "إكمال" (أخضر صغير) - لإكمال الجلسات المجدولة

---

## الإصلاحات الحرجة

### 1. إصلاح خطأ toLocaleString():
**المشكلة:** 
```javascript
{patientDetails.totalSpending.toLocaleString()} // قد يسبب خطأ إذا كانت القيمة undefined
```

**الحل:**
```javascript
{(patientDetails.totalSpending || 0).toLocaleString()} // آمن دائماً
```

**الأماكن المُصلحة:**
- إجمالي الإنفاق
- الرصيد المستحق
- جميع عرض المبالغ المالية

---

## التكامل المالي (جاهز للربط)

### الوظائف المطلوبة للربط مع النظام المالي:

1. **عند إنشاء خطة جديدة:**
   - إنشاء سجل مالي جديد
   - إضافة للحسابات المستحقة

2. **عند إكمال جلسة:**
   - تحديث حالة الجلسة
   - إضافة دفعة مالية
   - تحديث الرصيد المتبقي

3. **عند حفظ التعديلات:**
   - تحديث التكاليف في النظام المالي
   - إعادة حساب الرصيد المستحق

---

## ربط قاعدة البيانات (Supabase)

### الجداول المطلوبة:

تم إنشاء migration في: `supabase/migrations/create_treatment_plans_tables.sql`

#### 1. treatment_plans:
- id, patient_id, doctor_id, clinic_id
- plan_name, tooth_number, treatment_type, status
- diagnosis, tooth_condition
- root_treatment_sessions, root_treatment_notes
- number_of_roots, number_of_canals
- total_cost, paid_amount, remaining_amount
- estimated_sessions, completed_sessions
- estimated_duration_minutes, estimated_completion_date
- lab_order_required, lab_id, lab_order_details, lab_cost
- notes, created_at, updated_at, completed_at

#### 2. treatment_sessions:
- id, treatment_plan_id
- session_number, session_date, session_time, duration_minutes, status
- procedure_details, medications_prescribed
- canal_number, working_length_mm, files_used
- session_cost, paid_amount, payment_status
- notes, next_session_notes
- created_at, updated_at, completed_at

#### 3. root_canal_details:
- id, treatment_plan_id, session_id
- canal_number, working_length_mm, files_used, notes

#### 4. treatment_financial_records:
- id, treatment_plan_id, session_id, financial_record_id
- amount, payment_type, description

---

## أنواع العلاجات المدعومة

1. **علاج العصب** (Root Canal)
   - جذور متعددة وقنوات
   - جلسات متعددة
   - تفاصيل دقيقة لكل قناة

2. **التيجان** (Crowns)
   - ربط مع المختبر
   - جلستان عادةً

3. **الحشوات** (Fillings)
   - جلسة واحدة عادةً
   - تكلفة منخفضة

4. **العمليات الجراحية** (Surgical Procedures)
   - خلع الأسنان
   - جلسة واحدة

5. **تنظيف الأسنان** (Cleaning)
   - وقائي
   - جلسة واحدة

6. **التقويم** (Orthodontics)
   - جلسات متعددة طويلة المدى
   - تكلفة عالية

7. **القشور التجميلية** (Veneers)
   - ربط مع المختبر
   - تكلفة عالية

8. **الزراعة** (Implants)
   - أكثر تعقيداً
   - جلسات متعددة
   - تكلفة عالية جداً

---

## المتطلبات التالية (التكامل الكامل)

### 1. ربط Backend:
- [ ] إنشاء جداول Supabase
- [ ] تطبيق RLS policies
- [ ] إنشاء Edge Functions للعمليات المعقدة

### 2. ربط النظام المالي:
- [ ] تحديث financial_records عند إنشاء/تعديل خطة
- [ ] تحديث الرصيد المستحق
- [ ] إنشاء فواتير تلقائية

### 3. التقارير:
- [ ] تقرير الخطط العلاجية
- [ ] تقرير الإيرادات من العلاجات
- [ ] تقرير الجلسات المكتملة

### 4. الإشعارات:
- [ ] إشعار عند اقتراب موعد جلسة
- [ ] إشعار عند تأخر دفع
- [ ] إشعار عند اكتمال طلب مختبر

---

## الاختبار

### السيناريوهات المطلوبة:
1. ✅ عرض خطة علاجية موجودة
2. ✅ تعديل خطة علاجية
3. ✅ إنشاء خطة جديدة
4. ✅ إضافة جلسة جديدة
5. ✅ حذف جلسة
6. ✅ تعديل تكاليف الجلسات
7. ✅ إكمال جلسة
8. ⏳ حفظ في قاعدة البيانات
9. ⏳ ربط مع النظام المالي

---

## الخلاصة

تم تطوير نظام شامل ومتكامل لإدارة الخطط العلاجية مع:
- ✅ 3 نوافذ منبثقة مميزة بالألوان
- ✅ واجهة مستخدم احترافية وسهلة الاستخدام
- ✅ معالجة آمنة للبيانات
- ✅ تصميم متجاوب
- ✅ بيانات نموذجية شاملة
- ✅ جاهز للربط مع Backend

**الخطوة التالية:** ربط مع Supabase وتفعيل النظام المالي.
