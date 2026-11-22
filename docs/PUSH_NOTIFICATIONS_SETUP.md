# دليل نظام الإشعارات الفورية (يعمل بدون Firebase بالكامل!)

تم بناء وتشغيل نظام الإشعارات الفورية في **منصة طب الأسنان** ليعمل مباشرة في **شريط إشعارات الجهاز** على ويندوز وأندرويد والويب **بدون الحاجة إلى Firebase نهائياً**، مع ترحيل جميع التعديلات على Supabase تلقائياً عبر سكربت `scripts/deploy-supabase-notifications.cjs`.

## 1. كيف تعمل الإشعارات بدون Firebase على كل منصة؟

| المنصة | التطبيق مفتوح | التطبيق مغلق / الشاشة مقفلة |
|---|---|---|
| **تطبيق سطح المكتب (Windows Tauri)** | فوري (<1–12 ثانية) في **شريط إشعارات ويندوز (Action Center)** عبر `tauri-plugin-notification` + Supabase Realtime | بمجرد فتح التطبيق تظهر الإشعارات الجديدة تلقائياً |
| **تطبيق أندرويد (Android APK)** | فوري (<1–12 ثانية) في **شريط إشعارات أندرويد** عبر `AndroidNative.showNotification` و `NotificationChannel (IMPORTANCE_HIGH)` | **نعم! يعمل والهاتف مغلق بدون Firebase** عبر `NotificationPollReceiver` + `AlarmManager.setAndAllowWhileIdle` (يفحص Supabase كل 5 دقائق ويحدّث التوكن تلقائياً ويعيد الجدولة بعد إعادة تشغيل الهاتف عبر `NotificationBootReceiver`) |
| **الويب (Web / PWA)** | فوري عبر Notification API و Service Worker | عند فتح المتصفح أو PWA |

## 2. ترحيل وتحديث قاعدة بيانات Supabase تلقائياً
لتطبيق جميع الجداول والـ Triggers و `REPLICA IDENTITY FULL` و `pg_cron` (الجدولة الخلفية كل 5 دقائق على الخادم):
```bash
node scripts/deploy-supabase-notifications.cjs
```
تم تشغيل هذا السكربت مسبقاً على قاعدة البيانات الحية، مما فعّل:
- `trg_notify_on_appointment_insert`: إشعار فوري للطبيب والطاقم عند استقبال موعد أونلاين أو تسجيل موعد جديد.
- `trg_notify_on_course_insert`: إشعار تلقائي عند نشر دورة أو ندوة جديدة.
- `dental_notifications_scheduler` (`pg_cron` كل 5 دقائق): يرسل الحملات المجدولة وتذكيرات المواعيد قبل يوم (24 ساعة) تلقائياً على الخادم.

## 3. ملاحظة هامة عند التحديث
بما أن إضافات إشعارات النظام الأصلية أُضيفت في الكود الأصلي لـ **Windows (`tauri-plugin-notification`)** و **Android (`MainActivity` + `NotificationPollReceiver` + إذن `POST_NOTIFICATIONS`)**:
- تحتاج لتثبيت **النسخة الجديدة المبنية عبر GitHub Actions (`v22.32` أو أحدث)** لـ `.exe` و `.apk` حتى تظهر الإشعارات في شريط إشعارات النظام!
- داخل `/doctor/notifications` يوجد زر **«تفعيل واختبار إشعارات الجهاز»** للتأكد بضغطة واحدة من منح الإذن وظهور الإشعار في شريط الجهاز.

## 4. (اختياري مستقبلاً) إضافة Firebase FCM لوصول فوري بأقل من ثانية على أندرويد وآيفون مغلق
في حال رغبت مستقبلاً بإضافة Firebase (للملاحظة فقط، غير مطلوب حالياً لأن أندرويد يعمل بالخلفية بدونه):
1. ضع `google-services.json` في `android/app/`.
2. ارفع المفتاح ونشر الدالة الجاهزة:
   ```bash
   supabase secrets set FIREBASE_SERVICE_ACCOUNT="$(cat service-account.json)"
   supabase functions deploy send-push-notification --project-ref nhueyaeyutfmadbgghfe --no-verify-jwt
   ```
3. اربط Database Webhook على `public.notifications` (حدث `INSERT`) بدالة `send-push-notification`.
