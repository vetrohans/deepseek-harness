//! DSH Desktop Tauri shell.
//!
//! The window starts on a local loading page; [`sidecar::boot`] spawns the
//! bundled Node.js sidecar running the dsh web profile, then navigates the
//! window to the URL the harness prints (`dsh web: http://127.0.0.1:<port>`).

mod first_run;
mod shell_path;
mod sidecar;

use std::sync::Mutex;

use tauri::{Manager, WindowEvent};

/// The running sidecar child, so the app can terminate it on window close.
pub struct SidecarState(pub Mutex<Option<tauri_plugin_shell::process::CommandChild>>);

/// A convenience alias so `?` works across the crate's fallible steps.
pub type Result<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(SidecarState(Mutex::new(None)))
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(err) = sidecar::boot(handle.clone()).await {
                    eprintln!("[desktop] boot failed: {err}");
                    // Do not leave the harness service running without a window.
                    if let Some(state) = handle.try_state::<SidecarState>() {
                        if let Ok(mut guard) = state.0.lock() {
                            if let Some(child) = guard.take() {
                                let _ = child.kill();
                            }
                        }
                    }
                    use tauri_plugin_dialog::DialogExt;
                    handle
                        .dialog()
                        .message(format!("DSH 服务启动失败：\n{err}"))
                        .title("DSH Desktop")
                        .kind(tauri_plugin_dialog::MessageDialogKind::Error)
                        .show(|_| {});
                    handle.exit(1);
                }
            });
            Ok(())
        })
        .on_window_event(|window, event| {
            // Closing the window ends the harness service with it.
            if matches!(event, WindowEvent::Destroyed) {
                if let Some(state) = window.app_handle().try_state::<SidecarState>() {
                    if let Ok(mut guard) = state.0.lock() {
                        if let Some(child) = guard.take() {
                            let _ = child.kill();
                        }
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![install_plugin])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Install a plugin through the bundled `dsh plugin --profile web add`.
/// Exposed for the shell UI; the harness's own agent can also run the same
/// command, since the sidecar environment (PATH, DSH_HOME, corepack prompt
/// suppression) is inherited by every child it spawns.
#[tauri::command]
fn install_plugin(app: tauri::AppHandle, package: String) -> std::result::Result<String, String> {
    sidecar::install_plugin_sync(&app, &package).map_err(|err| err.to_string())
}
