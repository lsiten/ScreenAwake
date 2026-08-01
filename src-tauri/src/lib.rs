mod input_guard;
mod permission;
mod power_guard;
mod state;

use serde::Deserialize;
use state::{AppState, AppStatus, AwakeOptions};
use std::time::Duration;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, RunEvent,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AwakeRequest {
    duration_seconds: Option<u64>,
    enable_jiggle: bool,
    enable_keyboard: bool,
    enable_window_ping: bool,
}

fn emit_status(app: &AppHandle) -> AppStatus {
    let status = app.state::<AppState>().status();
    let _ = app.emit("awake-status", &status);
    status
}

#[tauri::command(rename_all = "snake_case")]
fn start_awake(app: AppHandle, request: AwakeRequest) -> Result<AppStatus, String> {
    let status = app.state::<AppState>().start(AwakeOptions {
        duration_seconds: request.duration_seconds,
        enable_jiggle: request.enable_jiggle,
        enable_keyboard: request.enable_keyboard,
        enable_window_ping: request.enable_window_ping,
    })?;
    if request.enable_window_ping {
        if let Some(running) = app.state::<AppState>().start_window_ping() {
            let app_handle = app.clone();
            std::thread::spawn(move || {
                while running.load(std::sync::atomic::Ordering::SeqCst) {
                    for _ in 0..55 {
                        if !running.load(std::sync::atomic::Ordering::SeqCst) {
                            return;
                        }
                        std::thread::sleep(Duration::from_secs(1));
                    }
                    if let Some(window) = app_handle.get_webview_window("keepalive") {
                        let _ = window.set_focus();
                    }
                }
            });
        }
    }
    let _ = app.emit("awake-status", &status);
    Ok(status)
}

#[tauri::command(rename_all = "snake_case")]
fn stop_awake(app: AppHandle) -> AppStatus {
    app.state::<AppState>().stop();
    emit_status(&app)
}

#[tauri::command(rename_all = "snake_case")]
fn get_status(app: AppHandle) -> AppStatus {
    emit_status(&app)
}

#[tauri::command(rename_all = "snake_case")]
fn check_accessibility_permission() -> bool {
    permission::is_accessibility_enabled()
}

#[tauri::command(rename_all = "snake_case")]
fn open_mac_accessibility_settings() -> Result<(), String> {
    permission::open_accessibility_settings()
}

#[tauri::command(rename_all = "snake_case")]
fn set_launch_at_login(app: AppHandle, enabled: bool) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    let manager = app.autolaunch();
    if enabled {
        manager.enable().map_err(|error| error.to_string())
    } else {
        manager.disable().map_err(|error| error.to_string())
    }
}

#[tauri::command(rename_all = "snake_case")]
fn get_launch_at_login(app: AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch()
        .is_enabled()
        .map_err(|error| error.to_string())
}

fn toggle_awake(app: &AppHandle) {
    let state = app.state::<AppState>();
    if state.status().active {
        state.stop();
    } else {
        let _ = state.start(AwakeOptions {
            duration_seconds: None,
            enable_jiggle: false,
            enable_keyboard: false,
            enable_window_ping: false,
        });
    }
    emit_status(app);
}

fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "显示 ScreenAwake", true, None::<&str>)?;
    let toggle = MenuItem::with_id(app, "toggle", "开启常亮", true, None::<&str>)?;
    let thirty = MenuItem::with_id(app, "30m", "开启 30 分钟", true, None::<&str>)?;
    let hour = MenuItem::with_id(app, "1h", "开启 1 小时", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &toggle, &thirty, &hour, &quit])?;
    TrayIconBuilder::with_id("screen-awake")
        .menu(&menu)
        .tooltip("ScreenAwake")
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "toggle" => toggle_awake(app),
            "30m" | "1h" => {
                let seconds = if event.id().as_ref() == "30m" {
                    1800
                } else {
                    3600
                };
                let _ = app.state::<AppState>().start(AwakeOptions {
                    duration_seconds: Some(seconds),
                    enable_jiggle: false,
                    enable_keyboard: false,
                    enable_window_ping: false,
                });
                emit_status(app);
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .build(app)?;
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            setup_tray(app.handle())?;
            let shortcut = Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyA);
            app.global_shortcut()
                .on_shortcut(shortcut, |app, _, event| {
                    if event.state() == ShortcutState::Pressed {
                        toggle_awake(app);
                    }
                })?;
            let app_handle = app.handle().clone();
            std::thread::spawn(move || loop {
                std::thread::sleep(Duration::from_secs(1));
                if app_handle.state::<AppState>().expired() {
                    app_handle.state::<AppState>().stop();
                    emit_status(&app_handle);
                }
            });
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            start_awake,
            stop_awake,
            get_status,
            check_accessibility_permission,
            open_mac_accessibility_settings,
            set_launch_at_login,
            get_launch_at_login
        ])
        .build(tauri::generate_context!())
        .expect("创建 ScreenAwake 应用失败")
        .run(|app, event| {
            if let RunEvent::ExitRequested { .. } = event {
                app.state::<AppState>().stop();
            }
        });
}
