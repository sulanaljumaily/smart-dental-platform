# خطة تطوير وإدارة مخطط الأسنان التفاعلي الذكي الشاملة (Smart Dynamic Odontogram Plan)

تطوير وتحديث مخطط الأسنان التفاعلي في المنصة لتمكين إدارة كاملة للأشكال الرسومية (SVG) من لوحة الإدارة (Platform Management)، مع أتمتة وتسهيل عمليات التصميم والرفع بناءً على الحالات التشخيصية والعلاجات الكاملة والمفصلة المعتمدة سريرياً.

---

## 🦷 1. مصفوفة حالات السن الكاملة (Diagnosis & Treatment States Matrix)

لتمثيل مخطط أسنان احترافي يغطي كافة الحالات السريرية بدقة فائقة، سيقوم النظام بالتعامل مع فئتين من أشكال السن الرسومية:

### أ. حالات التشخيص (Diagnostic Conditions)
وهي الحالات المرضية التي يشخصها الطبيب عند الفحص الأول للمريض:
1. **سليم (Healthy):** المظهر الطبيعي السليم للسن (الشكل الأساسي والافتراضي).
2. **تسوس (Decayed):** شكل السن مصاباً بالتسوس (تلوين أحمر مدمج بالتصميم في مناطق النخر).
3. **مكسور (Broken / Fractured):** شكل السن مع كسر بالتاج (شطبة أو صدع مدمج بالتصميم).
4. **تصبغ (Stained):** شكل السن مصاباً بالتصبغات الخارجية أو الجير (تلوين أصفر/بني خفيف).
5. **خراج (Abscess):** شكل السن مع خراج حول قمة الجذر (شكل التهاب أحمر مدمج في أطراف الجذور).
6. **مطمور (Impacted):** شكل السن كاملاً ومطلياً بوضعية مائلة بزاوية 45 درجة أو خافضاً تحت عظم الفك الافتراضي (خاص بأضراس العقل).
7. **مفقود (Missing):** **(أوتوماتيكي بالكامل!)** يستعين النظام بشكل السن السليم المرفوع، ويخفض شفافيته لـ 15% ويجعل الخطوط الخارجية متقطعة (`stroke-dasharray="3,3"`).

### ب. أشكال العلاج (Treatment States)
وهي أشكال السن بعد تطبيق العلاج، وتتحول تلقائياً أو يدوياً لتغطي الحالات التالية:
1. **حشوة (Filled):** شكل السن بعد إزالة التسوس وإضافة حشوة تجميلية (تلوين أزرق مدمج للحشوة).
2. **علاج عصب (Endo):** شكل السن مع حشوة عصب داخل القنوات الجذرية (خطوط أرجوانية/حمراء داخل قنوات الجذور).
3. **تلبيس / تاج (Crown):** شكل السن مغطى بالكامل بتاج تجميلي (سيراميك أو ذهب).
4. **جسر (Bridge):** شكل السن كجسر يربط بين الأسنان المعلقة والمجاورة (خط ربط أفقي مدمج).
5. **زرعة (Implant):** شكل برغي تيتانيوم مغروس في العظم بدلاً من السن الطبيعي.
6. **تقويم (Ortho):** شكل السن السليم مع إضافة حاصرة التقويم المعدنية (Brackets) فوق تاجه.

---

## 🛠️ 2. آلية الأتمتة وتقليل مجهود التصميم (50% جهد أقل!)

1. **ميزة الانعكاس التلقائي للجهات (Contralateral Auto-Mirroring):**
   * ستقوم بتصميم ورفع **16 سناً فقط (جهة واحدة)** (الفك العلوي الأيمن 11-18، والفك السفلي الأيمن 41-48) لكل من الحالات الـ 12 المذكورة أعلاه.
   * سيقوم النظام تلقائياً بنسخ نفس الـ SVG وعكسه أفقياً عبر CSS/SVG للجهة المقابلة (مثال: السن 11 ينعكس للسن 21).

2. **توليد السن المفقود تلقائياً (Auto-Missing):**
   * لن تحتاج لتصميم حالة "مفقود". يقوم النظام بتعديل شكل السن السليم برمجياً بخفض شفافيته لـ 15% وتحويل حدوده لخطوط متقطعة.

3. **تقسيم المخطط المجمع عبر الذكاء الاصطناعي:**
   * إذا زودتني بملف SVG مجمع ومكتمل يحتوي على مخطط الأسنان كاملاً لكل حالة، سأقوم بكتابة سكربت برمجى مخصص لتجزئة كل سن ورفعه تلقائياً نيابة عنك.

---

## 🎨 3. تعليمات تصميم ملفات الـ SVG

* **الأبعاد القياسية المعتمدة للتصدير في Figma/Illustrator:**
  * **العرض: 40 بكسل (40px)**
  * **الارتفاع: 80 بكسل (80px)**
  * (أو ViewBox موحد: `0 0 40 80`).
* **المحاذاة:** يجب إبقاء موضع السن ثابتاً تماماً في منتصف الإطار لجميع الحالات لضمان انتقال رسومي ناعم ومثالي دون اهتزاز السن.
* **الألوان:** يتم تلوين كل حالة سريرية مباشرة بالألوان الرسمية المدمجة في التصميم ليقوم النظام بعرضها مباشرة بدقة فائقة.

---

## 🗄️ 4. بنية قاعدة البيانات المحدثة (Database Schema)

```sql
-- جدول قوالب مخطط الأسنان المتكامل (يغطي التشخيص والعلاجات)
CREATE TABLE IF NOT EXISTS public.odontogram_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tooth_number INT NOT NULL, -- رقم السن من 11 إلى 48 (نظام FDI)
    state VARCHAR(50) NOT NULL, -- الحالات الـ 12: 'healthy', 'decayed', 'broken', 'stained', 'abscess', 'impacted', 'filled', 'endo', 'crown', 'bridge', 'implant', 'ortho'
    svg_content TEXT NOT NULL, -- كود الـ SVG الكامل المرفوع لهذه الحالة
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_tooth_state UNIQUE (tooth_number, state)
);

-- تفعيل صلاحيات الوصول (RLS)
ALTER TABLE public.odontogram_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read of odontogram templates"
    ON public.odontogram_templates FOR SELECT
    USING (true);

CREATE POLICY "Allow full admin control on odontogram templates"
    ON public.odontogram_templates FOR ALL
    USING (auth.jwt() ->> 'email' IN (SELECT email FROM public.profiles WHERE role = 'admin'));
```

---

## 🔗 5. خطة التعديل البرمجي للواجهات (UI Integration Plan)

### أ. لوحة إدارة مخطط الأسنان [Platform Management Section](file:///C:/Users/AL%20NABAA/Desktop/smart-dental-platform/src/pages/admin/sections/PlatformManagementSection.tsx)
* **إضافة تبويب جديد باسم "مخطط الأسنان" (Dental Chart)**.
* **إنشاء المكون [DentalChartManager](file:///C:/Users/AL%20NABAA/Desktop/smart-dental-platform/src/pages/admin/sections/platform/DentalChartManager.tsx):**
  * يعرض شبكة الـ 16 سناً الأساسية.
  * عند النقر على سن معين، تفتح لوحة جانبية مقسمة لـ قسمين:
    1. **قسم حالات التشخيص (Diagnosis States):** لرفع الـ SVGs الخاصة بـ (سليم، تسوس، مكسور، تصبغ، خراج، مطمور).
    2. **قسم أشكال العلاج (Treatment States):** لرفع الـ SVGs الخاصة بـ (حشوة، علاج عصب، تلبيس، جسر، زرعة، تقويم).
  * إمكانية رفع الـ SVG لكل حالة بسهولة مع عرض معاينة فورية وميزة الحفظ لقاعدة البيانات.

### ب. ترقية مخطط الأسنان للمرضى [TeethChart.tsx](file:///C:/Users/AL%20NABAA/Desktop/smart-dental-platform/src/components/treatment/TeethChart.tsx)
* جلب قوالب الـ SVG المخصصة من قاعدة البيانات وعرض شكل السن المناسب لحالته التشخيصية الحالية أو حالته العلاجية الحالية.
* تطبيق الانعكاس التلقائي لأسنان جهة اليسار (`transform: scaleX(-1)`).
* المعالجة التلقائية لحالة "مفقود".

### ج. ترقية نافذة تعديل حالة السن [ToothConditionModal.tsx](file:///C:/Users/AL%20NABAA/Desktop/smart-dental-platform/src/components/treatment/ToothConditionModal.tsx)
* إضافة الحالات الجديدة (مكسور، تصبغ، خراج، مطمور) لواجهة اختيار الطبيب التشخيصية لتتطابق تماماً مع الحالات المرفوعة.
