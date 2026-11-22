# خطة رفع التطبيقات إلى Google Play Console ونظام التحديثات الهوائية التلقائية (OTA)

> مرجع محفوظ لمشروع **Smart Dental Platform** — يتضمن خطوات إنتاج حزم `.aab` الموقّعة لمتجر Google Play وخطة تفعيل التحديثات الفورية داخل التطبيق (OTA) فور رفع التحديثات إلى GitHub.

---

## القسم الأول: إنتاج ورفع حزم الأندرويد الموقّعة (`.aab`) إلى Google Play Console

متجر Google Play لا يقبل ملفات `.apk` للتطبيقات الجديدة، بل يشترط ملف **Android App Bundle (`.aab`)** موقّع رقمياً بمفتاح `Keystore`.

### 1. إنشاء مفتاح التوقيع الرقمي (`Keystore`) مرة واحدة فقط
نفّذ الأمر التالي عبر PowerShell على جهازك (واحتفظ بالملف وكلمات المرور في نسخة احتياطية آمنة خارج الجهاز):

```powershell
keytool -genkey -v -keystore dental-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias dentalkey
```

### 2. تحويل المفتاح إلى Base64 وحفظه في GitHub Secrets
انسخ محتوى المفتاح بصيغة Base64:
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("dental-release.jks")) | Set-Clipboard
```

ثم انتقل إلى مستودع GitHub:
**Settings → Secrets and variables → Actions → New repository secret** وأضف المتغيرات الأربعة التالية:

| اسم المتغير (Secret) | القيمة |
| :--- | :--- |
| `ANDROID_KEYSTORE_BASE64` | النص المنسوخ من الأمر أعلاه |
| `ANDROID_KEYSTORE_PASSWORD` | كلمة مرور ملف الـ Keystore |
| `ANDROID_KEY_ALIAS` | الاسم المستعار للمفتاح (مثلاً `dentalkey`) |
| `ANDROID_KEY_PASSWORD` | كلمة مرور المفتاح (Alias Password) |

### 3. تحديث أتمتة البناء في GitHub Actions (`.github/workflows/android-build.yml`)
عند جاهزية التنفيذ، يتم تعديل `scripts/prepare-android-assets.cjs` و`.github/workflows/android-build.yml` لإضافة:
1. فك تشفير `ANDROID_KEYSTORE_BASE64` إلى `android/app/release.keystore` أثناء البناء.
2. حقن `signingConfigs.release` وتحديث `versionCode` تلقائياً باستخدام `${{ github.run_number }}` في `android/app/build.gradle`.
3. تنفيذ `./gradlew bundleRelease` لإنتاج الملفين الموقعين الجاهزين للرفع:
   - `patient-app-release.aab` (`com.dentalplatform.patient`)
   - `pro-app-release.aab` (`com.dentalplatform.pro`)
4. الاحتفاظ أيضاً بإنتاج ملفات `.apk` للتحميل المباشر خارج المتجر.

### 4. متطلبات الرفع داخل Google Play Console
- تفعيل **Google Play App Signing** عند رفع أول ملف `.aab`.
- رابط سياسة الخصوصية: `https://dental-platform.com/privacy-policy`.
- الأيقونة (`512×512 PNG`)، صورة العرض (`1024×500`)، ولقطات الشاشة.
- تعبئة نموذج أمان البيانات (Data Safety) وتوضيح استخدام صلاحية الموقع الجغرافي لعرض أقرب العيادات على الخريطة.
- للحسابات الفردية الجديدة: إكمال مسار **الاختبار المغلق (Closed Testing)** بمشاركة 12 مختبراً لمدة 14 يوماً قبل النشر العام في Production.

---

## القسم الثاني: خطة التحديثات الهوائية الفورية داخل التطبيق (OTA Live Updates)

تتيح هذه الخطة وصول تحديثات الواجهات والمنطق البرمجي (React / TypeScript / CSS / الصور) إلى هواتف المستخدمين **خلال ثوانٍ من رفع الكود إلى GitHub** دون الحاجة لإعادة الرفع إلى Google Play أو انتظار المراجعة.

### البنية الموجودة حالياً في المشروع:
- حزمة `@capgo/capacitor-updater` مثبتة في `package.json`.
- وحدة `src/lib/autoUpdater.ts` جاهزة لفحص جدول `app_versions` وتحميل حزمة `.zip` وتفعيلها مع حماية Auto-Rollback.
- جدول `public.app_versions` مجهّز في `supabase/migrations/20260905_create_app_versions.sql`.
- ملف `.github/workflows/ota-deploy.yml` مجهّز لتجهيز ملف `.zip` لحزمة `dist/`.

### خطوات التفعيل الكامل عند الطلب:
1. **تفعيل `initAutoUpdater()` داخل `src/App.tsx`:**
   - استدعاء `initAutoUpdater()` فور تشغيل التطبيق الأصلي (Android / iOS).
   - إظهار إشعار اختياري للمستخدم عند جاهزية التحديث (*"يتوفر تحديث جديد — اضغط لإعادة التشغيل وتطبيقه"*) أو تطبيقه بصمت عند إعادة فتح التطبيق.
2. **ضبط الوضع اليدوي في إعدادات Capacitor:**
   - إضافة `CapacitorUpdater: { autoUpdate: false }` في `capacitor.pro.config.ts` و`capacitor.patient.config.ts` للعمل مع خادمنا الخاص مجاناً دون الحاجة لاشتراك Capgo Cloud.
3. **أتمتة `.github/workflows/ota-deploy.yml` تلقائياً عند كل Push على `main`:**
   - بناء `dist` لكل من `pro` و`patient` وضغطهما في ملفي `.zip`.
   - رفعهما تلقائياً إلى **GitHub Releases** (روابط تحميل عامة ومجانية وسريعة) أو **Supabase Storage**.
   - تحديث سجل أحدث إصدار تلقائياً في جدول `app_versions` (أو ملف `ota-manifest.json` عام).
4. **تحديثات نسخة الويندوز (`Tauri EXE`):**
   - إضافة `tauri-plugin-updater` في `src-tauri/Cargo.toml` و`src-tauri/tauri.conf.json` لقراءة `latest.json` من GitHub Releases وتحديث البرنامج من داخله بضغطة زر.

> **توافق سياسات المتاجر:** تحديث ملفات الويب (HTML/JS/CSS) هوائياً عبر `@capgo/capacitor-updater` متوافق مع سياسات Google Play و Apple App Store، ويُطلب رفع نسخة `.aab` جديدة للمتجر فقط عند تغيير الأيقونة أو الصلاحيات أو كود Java/Native.
