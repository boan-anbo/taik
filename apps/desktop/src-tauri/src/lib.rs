//! Taik Desktop - Tauri Backend Library

mod accessibility;
mod tray;

use tauri::Manager;
use tauri::webview::WebviewWindowBuilder;
use tauri::WebviewUrl;

const LOCALHOST_BIND_HOST: &str = "127.0.0.1";
const LOCALHOST_URL_HOST: &str = "127.0.0.1";
const LOCALHOST_PORT: u16 = 9527;

/// Configure and run the Tauri application
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        // Plugins
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build());

    // macOS WKWebView does not treat custom schemes as secure contexts for getUserMedia.
    // Use a localhost origin for bundled builds (debug or release).
    #[cfg(target_os = "macos")]
    {
        builder = builder.plugin(
            tauri_plugin_localhost::Builder::new(LOCALHOST_PORT)
                .host(LOCALHOST_BIND_HOST)
                .build(),
        );
    }

    builder = builder.setup(|app| {
        let localhost = if cfg!(target_os = "macos") && !tauri::is_dev() {
            Some((LOCALHOST_URL_HOST, LOCALHOST_PORT))
        } else {
            None
        };

        create_webview_windows(app, localhost)?;

        // Create system tray
        tray::create_tray(app)?;

        // Log startup
        println!("Taik Desktop started successfully");

        Ok(())
    });

    builder
        // Invoke handlers
        .invoke_handler(tauri::generate_handler![
            show_main_window,
            hide_main_window,
            toggle_main_window,
            log_from_frontend,
            read_dev_env,
            // Accessibility commands
            accessibility::check_accessibility_permission,
            accessibility::request_accessibility_permission,
            accessibility::insert_text_direct,
            accessibility::paste_from_clipboard,
            accessibility::get_supported_insertion_methods,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn create_webview_windows(
    app: &tauri::App,
    localhost: Option<(&'static str, u16)>,
) -> Result<(), tauri::Error> {
    for config in &app.config().app.windows {
        let mut window_config = config.clone();

        if let Some((host, port)) = localhost {
            // Map configured app routes to external localhost routes.
            // Keep the window size, decorations, transparency, always-on-top, etc. from config.
            let external = match window_config.label.as_str() {
                "main" => format!("http://{host}:{port}/"),
                "floating-deck" => format!("http://{host}:{port}/deck-panel"),
                "floating-voice" => format!("http://{host}:{port}/voice-panel"),
                "floating-meter" => format!("http://{host}:{port}/voice-meter"),
                _ => format!("http://{host}:{port}/"),
            };

            window_config.url = WebviewUrl::External(external.parse().map_err(tauri::Error::InvalidUrl)?);
        }

        let window = WebviewWindowBuilder::from_config(app, &window_config)?.build()?;

        // Ensure floating windows stay fully transparent at the window + webview layer.
        if matches!(window.label(), "floating-deck" | "floating-voice" | "floating-meter") {
            window
                .set_background_color(Some(tauri::window::Color(0, 0, 0, 0)))
                .ok();
            window.set_shadow(false).ok();
        }
    }

    Ok(())
}

/// Show the main window
#[tauri::command]
async fn show_main_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Hide the main window
#[tauri::command]
async fn hide_main_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Toggle the main window visibility
#[tauri::command]
async fn toggle_main_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            window.hide().map_err(|e| e.to_string())?;
        } else {
            window.show().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

/// Log message from frontend to stdout (for debugging)
#[tauri::command]
fn log_from_frontend(level: String, message: String) {
    use std::io::Write;
    println!("[FRONTEND:{}] {}", level, message);
    std::io::stdout().flush().ok();
}

/// Read a dev-only environment variable (debug builds only)
#[tauri::command]
fn read_dev_env(key: String) -> Option<String> {
    #[cfg(debug_assertions)]
    {
        const ALLOWED_KEYS: [&str; 3] = [
            "TAIK_SONIOX_API_KEY",
            "SONIOX_API_KEY",
            "VITE_SONIOX_API_KEY",
        ];

        if !ALLOWED_KEYS.contains(&key.as_str()) {
            return None;
        }

        return std::env::var(key).ok();
    }

    #[cfg(not(debug_assertions))]
    {
        None
    }
}
