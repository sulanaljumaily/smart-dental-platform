const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const resDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');

if (!fs.existsSync(resDir)) {
  console.log('[prepare-android-assets] Android res directory not found at:', resDir);
  process.exit(0);
}

console.log('[prepare-android-assets] Configuring Android icons and native splash in:', resDir);

// 1. Copy pre-scaled Adaptive Icons for each density
const densities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
const androidIconsBase = path.join(projectRoot, 'public', 'icons', 'android');

for (const density of densities) {
  const srcDensityDir = path.join(androidIconsBase, `mipmap-${density}`);
  const targetDensityDir = path.join(resDir, `mipmap-${density}`);

  if (fs.existsSync(srcDensityDir)) {
    if (!fs.existsSync(targetDensityDir)) {
      fs.mkdirSync(targetDensityDir, { recursive: true });
    }
    for (const file of ['ic_launcher_foreground.png', 'ic_launcher.png', 'ic_launcher_round.png']) {
      const srcFile = path.join(srcDensityDir, file);
      if (fs.existsSync(srcFile)) {
        fs.copyFileSync(srcFile, path.join(targetDensityDir, file));
      }
    }
    console.log(`[prepare-android-assets] Installed adaptive icons for mipmap-${density}`);
  }
}

// 2. Remove default Capacitor vector foreground if present so PNG foreground takes effect
const vectorFg = path.join(resDir, 'drawable-v24', 'ic_launcher_foreground.xml');
if (fs.existsSync(vectorFg)) {
  fs.unlinkSync(vectorFg);
  console.log('[prepare-android-assets] Removed default vector foreground override');
}

// 3. Set adaptive icon background color to dark navy (#051329)
const bgXmlPath = path.join(resDir, 'values', 'ic_launcher_background.xml');
if (fs.existsSync(bgXmlPath)) {
  const bgContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#051329</color>
</resources>
`;
  fs.writeFileSync(bgXmlPath, bgContent, 'utf8');
  console.log('[prepare-android-assets] Updated ic_launcher_background.xml to #051329');
}

// 4. Install splash_icon.png drawable for Android 12+ SplashScreen API
const splashIconSrc = path.join(androidIconsBase, 'splash_icon.png');
for (const dirName of ['drawable', 'drawable-v24', 'drawable-nodpi']) {
  const targetDir = path.join(resDir, dirName);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  if (fs.existsSync(splashIconSrc)) {
    fs.copyFileSync(splashIconSrc, path.join(targetDir, 'splash_icon.png'));
  }
}
console.log('[prepare-android-assets] Installed splash_icon.png into drawables');

// 5. Splash screen mappings: install centered logo #030f21 splash images across all drawables
const splashSrc = path.join(projectRoot, 'public', 'splash.png');
if (fs.existsSync(splashSrc)) {
  const entries = fs.readdirSync(resDir);
  for (const entry of entries) {
    if (entry.startsWith('drawable')) {
      const drawableDir = path.join(resDir, entry);
      if (fs.statSync(drawableDir).isDirectory()) {
        const targetSplash = path.join(drawableDir, 'splash.png');
        fs.copyFileSync(splashSrc, targetSplash);
      }
    }
  }
  console.log('[prepare-android-assets] Installed seamless splash.png across all drawable folders');
}

// 6. Update styles.xml to use #030f21 and splash_icon for Theme.SplashScreen
const stylesXmlPath = path.join(resDir, 'values', 'styles.xml');
if (fs.existsSync(stylesXmlPath)) {
  let stylesContent = fs.readFileSync(stylesXmlPath, 'utf8');
  
  // Replace AppTheme.NoActionBarLaunch style
  const launchStyleRegex = /<style name="AppTheme\.NoActionBarLaunch"[\s\S]*?<\/style>/;
  const newLaunchStyle = `<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="windowSplashScreenBackground">#030f21</item>
        <item name="windowSplashScreenAnimatedIcon">@drawable/splash_icon</item>
        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
        <item name="android:background">#030f21</item>
    </style>`;

  if (launchStyleRegex.test(stylesContent)) {
    stylesContent = stylesContent.replace(launchStyleRegex, newLaunchStyle);
  } else {
    stylesContent = stylesContent.replace('</resources>', `    ${newLaunchStyle}\n</resources>`);
  }
  fs.writeFileSync(stylesXmlPath, stylesContent, 'utf8');
  console.log('[prepare-android-assets] Updated styles.xml with seamless logo splash screen config');
}

// 7. Update colors.xml to match #030f21
const colorsXmlPath = path.join(resDir, 'values', 'colors.xml');
if (fs.existsSync(colorsXmlPath)) {
  let colorsContent = fs.readFileSync(colorsXmlPath, 'utf8');
  if (colorsContent.includes('splashBackground')) {
    colorsContent = colorsContent.replace(
      /<color name="splashBackground">.*?<\/color>/,
      '<color name="splashBackground">#030f21</color>'
    );
  } else {
    colorsContent = colorsContent.replace(
      '</resources>',
      '    <color name="splashBackground">#030f21</color>\n</resources>'
    );
  }
  fs.writeFileSync(colorsXmlPath, colorsContent, 'utf8');
  console.log('[prepare-android-assets] Updated colors.xml with #030f21');
}

// 8. Inject Location Permissions & OAuth Deep Link Intent Filter into AndroidManifest.xml
const manifestPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
if (fs.existsSync(manifestPath)) {
  let manifestContent = fs.readFileSync(manifestPath, 'utf8');
  let modified = false;

  if (!manifestContent.includes('android:scheme="dentalplatform"')) {
    const deepLinkFilter = `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="dentalplatform" />
            </intent-filter>
        </activity>`;
    manifestContent = manifestContent.replace('</activity>', deepLinkFilter);
    modified = true;
    console.log('[prepare-android-assets] Injected dentalplatform:// OAuth deep-link intent-filter into AndroidManifest.xml');
  }

  if (!manifestContent.includes('android.permission.ACCESS_FINE_LOCATION')) {
    const locationPermissions = `
    <!-- Geolocation permissions for Interactive Dental Maps -->
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-feature android:name="android.hardware.location.gps" android:required="false" />
</manifest>`;
    manifestContent = manifestContent.replace('</manifest>', locationPermissions);
    modified = true;
    console.log('[prepare-android-assets] Injected ACCESS_FINE_LOCATION and ACCESS_COARSE_LOCATION into AndroidManifest.xml');
  }

  if (!manifestContent.includes('android.permission.POST_NOTIFICATIONS')) {
    const notifPermissions = `
    <!-- Native System & Background Notifications (Firebase-free) -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
</manifest>`;
    manifestContent = manifestContent.replace('</manifest>', notifPermissions);
    modified = true;
    console.log('[prepare-android-assets] Injected POST_NOTIFICATIONS, VIBRATE, WAKE_LOCK, RECEIVE_BOOT_COMPLETED');
  }

  if (!manifestContent.includes('NotificationPollReceiver')) {
    const notifReceivers = `
        <receiver android:name=".NotificationPollReceiver" android:exported="false" />
        <receiver android:name=".NotificationBootReceiver" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
            </intent-filter>
        </receiver>
    </application>`;
    manifestContent = manifestContent.replace('</application>', notifReceivers);
    modified = true;
    console.log('[prepare-android-assets] Registered NotificationPollReceiver & NotificationBootReceiver');
  }

  if (modified) {
    fs.writeFileSync(manifestPath, manifestContent, 'utf8');
  }
}

// 9. Enhance MainActivity.java with AndroidNative bridge (PrintManager, External Browser Intent, Location Permission, OAuth Deep Link)
const javaBaseDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'java');
function findMainActivityFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    if (fs.statSync(fullPath).isDirectory()) {
      results = results.concat(findMainActivityFiles(fullPath));
    } else if (entry === 'MainActivity.java') {
      results.push(fullPath);
    }
  }
  return results;
}

const mainActivityFiles = findMainActivityFiles(javaBaseDir);
for (const mainActivityPath of mainActivityFiles) {
  const existingJava = fs.readFileSync(mainActivityPath, 'utf8');
  const pkgMatch = existingJava.match(/package\s+([a-zA-Z0-9_.]+)\s*;/);
  if (pkgMatch) {
    const packageName = pkgMatch[1];
    const enhancedMainActivity = `package ${packageName};

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private WebView printWebView;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        NotificationHelper.ensureChannel(this);
        requestNotificationPermissionIfNeeded();
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().addJavascriptInterface(new AndroidNativeBridge(), "AndroidNative");
        }
        handleOAuthDeepLink(getIntent());
        handleNotificationTap(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleOAuthDeepLink(intent);
        handleNotificationTap(intent);
    }

    private void requestNotificationPermissionIfNeeded() {
        try {
            if (Build.VERSION.SDK_INT >= 33) {
                if (checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, 1002);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void handleNotificationTap(Intent intent) {
        if (intent == null) return;
        final String link = intent.getStringExtra("dental_notif_link");
        if (link != null && !link.trim().isEmpty()) {
            intent.removeExtra("dental_notif_link");
            final String safeLink = link.replace("'", "\\\\'");
            if (this.bridge != null && this.bridge.getWebView() != null) {
                this.bridge.getWebView().postDelayed(() -> {
                    this.bridge.getWebView().evaluateJavascript(
                        "if(window.__handleNativeNotifLink){window.__handleNativeNotifLink('" + safeLink + "');}",
                        null
                    );
                }, 500);
            }
        }
    }

    private void handleOAuthDeepLink(Intent intent) {
        if (intent == null) return;
        final Uri data = intent.getData();
        if (data != null && "dentalplatform".equals(data.getScheme())) {
            final String urlStr = data.toString().replace("'", "\\\\'");
            if (this.bridge != null && this.bridge.getWebView() != null) {
                this.bridge.getWebView().postDelayed(() -> {
                    this.bridge.getWebView().evaluateJavascript(
                        "if(window.__handleNativeOAuthDeepLink){window.__handleNativeOAuthDeepLink('" + urlStr + "');}",
                        null
                    );
                }, 400);
            }
        }
    }

    public class AndroidNativeBridge {
        @JavascriptInterface
        public void printHtml(final String htmlContent, final String jobName) {
            runOnUiThread(() -> {
                try {
                    printWebView = new WebView(MainActivity.this);
                    printWebView.getSettings().setJavaScriptEnabled(true);
                    printWebView.getSettings().setLoadsImagesAutomatically(true);
                    printWebView.setWebViewClient(new WebViewClient() {
                        private boolean printed = false;

                        @Override
                        public void onPageFinished(WebView view, String url) {
                            if (printed) return;
                            printed = true;
                            try {
                                PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                                String safeTitle = (jobName != null && !jobName.trim().isEmpty()) ? jobName : "Dental_Document";
                                PrintDocumentAdapter adapter = view.createPrintDocumentAdapter(safeTitle);
                                if (printManager != null) {
                                    printManager.print(safeTitle, adapter, new PrintAttributes.Builder().build());
                                }
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                        }
                    });
                    printWebView.loadDataWithBaseURL("https://dental-platform.com/", htmlContent, "text/html", "UTF-8", null);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });
        }

        @JavascriptInterface
        public void openExternalUrl(final String url) {
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });
        }

        @JavascriptInterface
        public void shareContent(final String title, final String text, final String url) {
            runOnUiThread(() -> {
                try {
                    Intent sendIntent = new Intent(Intent.ACTION_SEND);
                    sendIntent.setType("text/plain");
                    String safeTitle = (title != null && !title.trim().isEmpty()) ? title : "مشاركة";
                    StringBuilder body = new StringBuilder();
                    if (text != null && !text.trim().isEmpty()) {
                        body.append(text.trim());
                    }
                    if (url != null && !url.trim().isEmpty()) {
                        if (body.length() > 0) body.append("\\n");
                        body.append(url.trim());
                    }
                    sendIntent.putExtra(Intent.EXTRA_SUBJECT, safeTitle);
                    sendIntent.putExtra(Intent.EXTRA_TITLE, safeTitle);
                    sendIntent.putExtra(Intent.EXTRA_TEXT, body.toString());
                    Intent shareIntent = Intent.createChooser(sendIntent, safeTitle);
                    shareIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(shareIntent);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });
        }

        @JavascriptInterface
        public void requestLocationPermission() {
            runOnUiThread(() -> {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                            requestPermissions(new String[]{
                                Manifest.permission.ACCESS_FINE_LOCATION,
                                Manifest.permission.ACCESS_COARSE_LOCATION
                            }, 1001);
                        }
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });
        }

        @JavascriptInterface
        public void requestNotificationPermission() {
            runOnUiThread(() -> requestNotificationPermissionIfNeeded());
        }

        @JavascriptInterface
        public void showNotification(final String title, final String body, final String link) {
            runOnUiThread(() -> {
                try {
                    int notifId = (int) (System.currentTimeMillis() & 0x7fffffff);
                    NotificationHelper.showSystemNotification(MainActivity.this, title, body, link, notifId);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            });
        }

        @JavascriptInterface
        public void saveNotificationSession(final String supabaseUrl, final String anonKey, final String accessToken, final String refreshToken, final String userId) {
            try {
                NotificationHelper.saveSession(MainActivity.this, supabaseUrl, anonKey, accessToken, refreshToken, userId);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        @JavascriptInterface
        public void clearNotificationSession() {
            try {
                NotificationHelper.clearSession(MainActivity.this);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }
}
`;
    fs.writeFileSync(mainActivityPath, enhancedMainActivity, 'utf8');
    console.log('[prepare-android-assets] Enhanced MainActivity.java with AndroidNative bridge at:', mainActivityPath);

    // 10. Generate pure Android SDK Firebase-free System & Background Notification classes
    const pkgDir = path.dirname(mainActivityPath);

    const notificationHelperJava = `package ${packageName};

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.RingtoneManager;
import android.os.Build;
import android.os.SystemClock;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public class NotificationHelper {
    public static final String CHANNEL_ID = "dental_platform_alerts";
    public static final String PREFS_NAME = "dental_notif_prefs";

    public static void ensureChannel(Context ctx) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm == null) return;
                NotificationChannel existing = nm.getNotificationChannel(CHANNEL_ID);
                if (existing == null) {
                    NotificationChannel ch = new NotificationChannel(
                        CHANNEL_ID,
                        "إشعارات منصة طب الأسنان",
                        NotificationManager.IMPORTANCE_HIGH
                    );
                    ch.setDescription("إشعارات المواعيد، التنبيهات، والعروض الفورية");
                    ch.enableVibration(true);
                    ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                    nm.createNotificationChannel(ch);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    public static void showSystemNotification(Context ctx, String title, String body, String link, int notifId) {
        try {
            ensureChannel(ctx);
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            String safeTitle = (title != null && !title.trim().isEmpty()) ? title.trim() : "منصة طب الأسنان";
            String safeBody = (body != null && !body.trim().isEmpty()) ? body.trim() : "لديك إشعار جديد";

            Intent launchIntent = new Intent(ctx, MainActivity.class);
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
            if (link != null && !link.trim().isEmpty()) {
                launchIntent.putExtra("dental_notif_link", link.trim());
            }

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pi = PendingIntent.getActivity(ctx, notifId, launchIntent, flags);

            Notification.Builder builder = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                ? new Notification.Builder(ctx, CHANNEL_ID)
                : new Notification.Builder(ctx);

            builder.setSmallIcon(ctx.getApplicationInfo().icon)
                .setContentTitle(safeTitle)
                .setContentText(safeBody)
                .setStyle(new Notification.BigTextStyle().bigText(safeBody))
                .setAutoCancel(true)
                .setContentIntent(pi)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setCategory(Notification.CATEGORY_MESSAGE);

            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                builder.setPriority(Notification.PRIORITY_HIGH);
                builder.setDefaults(Notification.DEFAULT_ALL);
                builder.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION));
            }

            nm.notify(notifId, builder.build());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static String nowUtcIso() {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US);
        sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
        return sdf.format(new Date());
    }

    public static void saveSession(Context ctx, String supabaseUrl, String anonKey, String accessToken, String refreshToken, String userId) {
        if (supabaseUrl == null || userId == null || userId.trim().isEmpty()) return;
        SharedPreferences prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String prevUser = prefs.getString("user_id", "");
        SharedPreferences.Editor ed = prefs.edit();
        ed.putString("supabase_url", supabaseUrl.trim());
        ed.putString("anon_key", anonKey != null ? anonKey.trim() : "");
        ed.putString("access_token", accessToken != null ? accessToken.trim() : "");
        if (refreshToken != null && !refreshToken.trim().isEmpty()) {
            ed.putString("refresh_token", refreshToken.trim());
        }
        ed.putString("user_id", userId.trim());
        if (!userId.trim().equals(prevUser) || prefs.getString("last_seen_at", "").isEmpty()) {
            ed.putString("last_seen_at", nowUtcIso());
        }
        ed.apply();
        scheduleNextPoll(ctx, 180000L);
    }

    public static void clearSession(Context ctx) {
        SharedPreferences prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().clear().apply();
        cancelPolling(ctx);
    }

    public static void scheduleNextPoll(Context ctx, long delayMs) {
        try {
            AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;
            Intent intent = new Intent(ctx, NotificationPollReceiver.class);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pi = PendingIntent.getBroadcast(ctx, 9001, intent, flags);
            long triggerAt = SystemClock.elapsedRealtime() + Math.max(60000L, delayMs);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
            } else {
                am.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static void cancelPolling(Context ctx) {
        try {
            AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;
            Intent intent = new Intent(ctx, NotificationPollReceiver.class);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pi = PendingIntent.getBroadcast(ctx, 9001, intent, flags);
            am.cancel(pi);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
`;

    const notificationPollReceiverJava = `package ${packageName};

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import org.json.JSONArray;
import org.json.JSONObject;

public class NotificationPollReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(final Context context, Intent intent) {
        final PendingResult pendingResult = goAsync();
        new Thread(() -> {
            try {
                SharedPreferences prefs = context.getSharedPreferences(NotificationHelper.PREFS_NAME, Context.MODE_PRIVATE);
                String supabaseUrl = prefs.getString("supabase_url", "");
                String anonKey = prefs.getString("anon_key", "");
                String accessToken = prefs.getString("access_token", "");
                String refreshToken = prefs.getString("refresh_token", "");
                String userId = prefs.getString("user_id", "");
                String lastSeenAt = prefs.getString("last_seen_at", "");

                if (supabaseUrl.isEmpty() || userId.isEmpty() || anonKey.isEmpty()) {
                    return;
                }

                // Schedule next wakeup even if network fails right now (5 minutes interval, Doze-aware)
                NotificationHelper.scheduleNextPoll(context, 300000L);

                if (lastSeenAt.isEmpty()) {
                    lastSeenAt = NotificationHelper.nowUtcIso();
                    prefs.edit().putString("last_seen_at", lastSeenAt).apply();
                }

                String queryUrl = supabaseUrl + "/rest/v1/notifications?select=id,title,message,link,created_at"
                    + "&user_id=eq." + URLEncoder.encode(userId, "UTF-8")
                    + "&is_read=eq.false"
                    + "&created_at=gt." + URLEncoder.encode(lastSeenAt, "UTF-8")
                    + "&order=created_at.asc&limit=10";

                String responseBody = httpGet(queryUrl, anonKey, accessToken);

                // If access token expired (401), refresh via Supabase Auth REST and retry once
                if ("__401__".equals(responseBody) && !refreshToken.isEmpty()) {
                    String refreshed = refreshAccessToken(supabaseUrl, anonKey, refreshToken, prefs);
                    if (refreshed != null && !refreshed.isEmpty()) {
                        responseBody = httpGet(queryUrl, anonKey, refreshed);
                    }
                }

                if (responseBody == null || responseBody.isEmpty() || "__401__".equals(responseBody)) {
                    return;
                }

                JSONArray arr = new JSONArray(responseBody);
                String newestTimestamp = lastSeenAt;
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject item = arr.getJSONObject(i);
                    String id = item.optString("id", String.valueOf(i));
                    String title = item.optString("title", "منصة طب الأسنان");
                    String message = item.optString("message", "");
                    String link = item.optString("link", "/doctor/notifications");
                    String createdAt = item.optString("created_at", "");

                    int notifId = Math.abs(id.hashCode());
                    NotificationHelper.showSystemNotification(context, title, message, link, notifId);

                    if (!createdAt.isEmpty() && createdAt.compareTo(newestTimestamp) > 0) {
                        newestTimestamp = createdAt;
                    }
                }

                if (arr.length() > 0 && !newestTimestamp.equals(lastSeenAt)) {
                    prefs.edit().putString("last_seen_at", newestTimestamp).apply();
                }
            } catch (Exception e) {
                e.printStackTrace();
            } finally {
                try {
                    pendingResult.finish();
                } catch (Exception ignored) {}
            }
        }).start();
    }

    private String httpGet(String urlStr, String anonKey, String bearer) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(urlStr);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);
            conn.setRequestProperty("apikey", anonKey);
            if (bearer != null && !bearer.isEmpty()) {
                conn.setRequestProperty("Authorization", "Bearer " + bearer);
            }
            conn.setRequestProperty("Accept", "application/json");
            int code = conn.getResponseCode();
            if (code == 401) return "__401__";
            if (code < 200 || code >= 300) return null;
            return readStream(conn.getInputStream());
        } catch (Exception e) {
            return null;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private String refreshAccessToken(String supabaseUrl, String anonKey, String refreshToken, SharedPreferences prefs) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(supabaseUrl + "/auth/v1/token?grant_type=refresh_token");
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);
            conn.setDoOutput(true);
            conn.setRequestProperty("apikey", anonKey);
            conn.setRequestProperty("Content-Type", "application/json");

            JSONObject payload = new JSONObject();
            payload.put("refresh_token", refreshToken);
            byte[] outBytes = payload.toString().getBytes("UTF-8");
            try (OutputStream os = conn.getOutputStream()) {
                os.write(outBytes);
            }

            int code = conn.getResponseCode();
            if (code < 200 || code >= 300) return null;
            String body = readStream(conn.getInputStream());
            JSONObject json = new JSONObject(body);
            String newAccess = json.optString("access_token", "");
            String newRefresh = json.optString("refresh_token", "");
            if (!newAccess.isEmpty()) {
                SharedPreferences.Editor ed = prefs.edit();
                ed.putString("access_token", newAccess);
                if (!newRefresh.isEmpty()) ed.putString("refresh_token", newRefresh);
                ed.apply();
                return newAccess;
            }
            return null;
        } catch (Exception e) {
            return null;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private String readStream(InputStream is) throws Exception {
        StringBuilder sb = new StringBuilder();
        try (BufferedReader br = new BufferedReader(new InputStreamReader(is, "UTF-8"))) {
            String line;
            while ((line = br.readLine()) != null) {
                sb.append(line);
            }
        }
        return sb.toString();
    }
}
`;

    const notificationBootReceiverJava = `package ${packageName};

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

public class NotificationBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(NotificationHelper.PREFS_NAME, Context.MODE_PRIVATE);
            String userId = prefs.getString("user_id", "");
            if (userId != null && !userId.isEmpty()) {
                NotificationHelper.ensureChannel(context);
                NotificationHelper.scheduleNextPoll(context, 60000L);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
`;

    fs.writeFileSync(path.join(pkgDir, 'NotificationHelper.java'), notificationHelperJava, 'utf8');
    fs.writeFileSync(path.join(pkgDir, 'NotificationPollReceiver.java'), notificationPollReceiverJava, 'utf8');
    fs.writeFileSync(path.join(pkgDir, 'NotificationBootReceiver.java'), notificationBootReceiverJava, 'utf8');
    console.log('[prepare-android-assets] Generated Firebase-free NotificationHelper, NotificationPollReceiver, NotificationBootReceiver');
  }
}

console.log('[prepare-android-assets] Android assets configuration completed successfully.');
