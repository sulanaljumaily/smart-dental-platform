// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, WindowEvent,
};
use tauri_plugin_notification::NotificationExt;

static NOTIFIED_BACKGROUND_ONCE: AtomicBool = AtomicBool::new(false);

#[cfg(target_os = "windows")]
const WINDOWS_AUMID: &str = "com.dentalplatform.pro";

/// Ensures Windows 10/11 recognizes our AppUserModelID in HKCU so Action Center
/// Toast Notifications always display (even without an MSIX package or Start Menu shortcut).
#[cfg(target_os = "windows")]
fn register_windows_aumid() {
    use std::os::windows::process::CommandExt;
    use std::process::Command;

    const CREATE_NO_WINDOW: u32 = 0x08000000;
    let reg_key = format!("HKCU\\Software\\Classes\\AppUserModelId\\{}", WINDOWS_AUMID);

    let _ = Command::new("reg")
        .args([
            "add",
            &reg_key,
            "/v",
            "DisplayName",
            "/t",
            "REG_SZ",
            "/d",
            "Dental Platform",
            "/f",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    let _ = Command::new("reg")
        .args([
            "add",
            &reg_key,
            "/v",
            "ShowInSettings",
            "/t",
            "REG_DWORD",
            "/d",
            "1",
            "/f",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
}

#[cfg(not(target_os = "windows"))]
fn register_windows_aumid() {}

/// Fallback native Windows WinRT Toast Notification using safe environment variables
/// (UTF-8 / Arabic safe, zero console window flash) if plugin toast returns an error.
#[cfg(target_os = "windows")]
fn send_windows_winrt_toast_fallback(title: &str, body: &str) {
    use std::os::windows::process::CommandExt;
    use std::process::Command;

    const CREATE_NO_WINDOW: u32 = 0x08000000;
    let ps_script = r#"
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
$t = [System.Security.SecurityElement]::Escape($env:DENTAL_NOTIF_TITLE)
$b = [System.Security.SecurityElement]::Escape($env:DENTAL_NOTIF_BODY)
$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$xml.LoadXml("<toast><visual><binding template='ToastGeneric'><text>$t</text><text>$b</text></binding></visual><audio src='ms-winsoundevent:Notification.Default'/></toast>")
$toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('com.dentalplatform.pro').Show($toast)
"#;

    let _ = Command::new("powershell")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-WindowStyle",
            "Hidden",
            "-Command",
            ps_script,
        ])
        .env("DENTAL_NOTIF_TITLE", title)
        .env("DENTAL_NOTIF_BODY", body)
        .creation_flags(CREATE_NO_WINDOW)
        .spawn();
}

#[cfg(not(target_os = "windows"))]
fn send_windows_winrt_toast_fallback(_title: &str, _body: &str) {}

fn dispatch_os_notification(app: &AppHandle, title: &str, body: &str) {
    let result = app
        .notification()
        .builder()
        .title(title)
        .body(body)
        .show();

    if result.is_err() {
        send_windows_winrt_toast_fallback(title, body);
    }
}

fn restore_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

#[tauri::command]
fn show_main_window(app: AppHandle) {
    restore_main_window(&app);
}

/// Closes/hides the main window while keeping the application running in the Windows System Tray
/// so real-time notifications keep arriving in the background.
#[tauri::command]
fn hide_to_tray(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
    if !NOTIFIED_BACKGROUND_ONCE.swap(true, Ordering::SeqCst) {
        dispatch_os_notification(
            &app,
            "منصة طب الأسنان تعمل في الخلفية",
            "تم إغلاق النافذة وبقي التطبيق نشطاً لاستقبال الإشعارات. للخروج النهائي اضغط بزر الفأرة الأيمن على الأيقونة في شريط المهام.",
        );
    }
}

/// Exits the application and its background tray process completely.
#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

/// Sends a real native OS notification directly from Rust (bypasses WebView2 permission blocks).
#[tauri::command]
fn send_native_notification(app: AppHandle, title: String, body: String) -> Result<(), String> {
    let safe_title = if title.trim().is_empty() {
        "منصة طب الأسنان".to_string()
    } else {
        title
    };
    dispatch_os_notification(&app, &safe_title, &body);
    Ok(())
}

fn main() {
    register_windows_aumid();

    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            show_main_window,
            hide_to_tray,
            quit_app,
            send_native_notification
        ])
        .setup(|app| {
            let open_item = MenuItemBuilder::with_id("tray_open", "فتح التطبيق").build(app)?;
            let quit_item =
                MenuItemBuilder::with_id("tray_quit", "خروج من التطبيق").build(app)?;

            let tray_menu = MenuBuilder::new(app)
                .item(&open_item)
                .separator()
                .item(&quit_item)
                .build()?;

            let mut tray_builder = TrayIconBuilder::with_id("main-tray")
                .tooltip("نظام إدارة العيادات - Dental Platform")
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app_handle, event| match event.id().as_ref() {
                    "tray_open" => restore_main_window(app_handle),
                    "tray_quit" => app_handle.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        restore_main_window(tray.app_handle());
                    }
                });

            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }

            tray_builder.build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // Keep app running in background System Tray when clicking X
                api.prevent_close();
                let _ = window.hide();
                if !NOTIFIED_BACKGROUND_ONCE.swap(true, Ordering::SeqCst) {
                    dispatch_os_notification(
                        window.app_handle(),
                        "منصة طب الأسنان تعمل في الخلفية",
                        "بقي التطبيق نشطاً في شريط المهام لاستقبال الإشعارات. اضغط بزر الفأرة الأيمن على الأيقونة للفتح أو الخروج النهائي.",
                    );
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
