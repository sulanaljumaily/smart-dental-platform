# دليل تفعيل إشعارات الدفع (Push Notifications — FCM HTTP v1 + Supabase)

تم بناء البنية البرمجية الكاملة لإشعارات الدفع في المنصة وفقاً للوثائق الرسمية لـ Supabase (`send-push-notification` + `user_push_tokens` + `Database Triggers` + `Realtime OS Notifications`).

## 1. ما يعمل تلقائياً الآن (بدون أي إعدادات إضافية)
- **إشعارات النظام الفورية على Windows Desktop و Web PWA والهواتف المفتوحة** عبر Supabase Realtime + Notification API + صوت وتنبيه داخل التطبيق.
- **إشعارات المواعيد التلقائية:** عند استقبال حجز أونلاين أو تسجيل موعد جديد يظهر إشعار فوري للطبيب وطاقم العيادة.
- **التذكير قبل الموعد بيوم (24 ساعة):** يتم توليده وإرساله تلقائياً للطبيب والعيادة وللمراجع (إن كان لديه حساب).
- **إشعارات الدورات والندوات الجديدة:** عند نشر أي دورة أو ندوة من لوحة الإدارة يُرسل إشعار تلقائي لجميع الأطباء والطاقم والمعامل والموردين.
- **حملات وإشعارات الإدارة المجدولة والفورية:** عروض المتجر، التخفيضات، التحديثات، والقوالب الجاهزة مع استهداف الفئات الأربع.

## 2. لتفعيل وصول الإشعارات والهاتف مغلق تماماً (Firebase Cloud Messaging — Android / iOS / Background Push)

### الخطوة 1: إنشاء مشروع Firebase
1. افتح [Firebase Console](https://console.firebase.google.com/) وأنشئ مشروعاً (أو استخدم مشروعك الحالي).
2. أضف تطبيق Android بمعرف الحزمة:
   - تطبيق القطاع الطبي: `com.dentalplatform.pro`
   - تطبيق المراجعين: `com.dentalplatform.patient`
3. حمّل ملف `google-services.json` وضعه في `android/app/google-services.json` (أو كـ Secret باسم `ANDROID_GOOGLE_SERVICES_JSON` في GitHub Actions).
4. من **Project Settings -> Service Accounts** اضغط **Generate new private key** لتحميل ملف JSON الخاص بحساب الخدمة (`service-account.json`).

### الخطوة 2: رفع مفتاح Firebase ونشر Edge Function على Supabase
```bash
# 1. تسجيل الدخول وربط المشروع
supabase login
supabase link --project-ref nhueyaeyutfmadbgghfe

# 2. حفظ مفتاح Firebase Service Account كسر آمن
supabase secrets set FIREBASE_SERVICE_ACCOUNT="$(cat service-account.json)"

# 3. نشر دالة Push Notifications
supabase functions deploy send-push-notification --no-verify-jwt
```

### الخطوة 3: تفعيل Database Webhook في لوحة Supabase
1. اذهب إلى **Supabase Dashboard -> Database -> Webhooks -> Create a new hook**.
2. الإعدادات:
   - **Name:** `push_on_new_notification`
   - **Table:** `public.notifications`
   - **Events:** `INSERT`
   - **Type:** `Supabase Edge Functions`
   - **Edge Function:** `send-push-notification`

### الخطوة 4 (اختياري لجدولة الخلفية الدقيقة): Cron Job كل 15 دقيقة
يمكنك استدعاء الدالة بوضع الجدولة (لإرسال الحملات المجدولة وتذكيرات المواعيد قبل يوم حتى لو لم يكن أحد فاتحاً التطبيق):
- **Endpoint:** `https://nhueyaeyutfmadbgghfe.supabase.co/functions/v1/send-push-notification`
- **Method:** `POST`
- **Body:** `{"action": "process_scheduled"}`
- **Schedule:** كل 15 دقيقة (`*/15 * * * *`) عبر Supabase Cron أو GitHub Actions Scheduled Workflow.
