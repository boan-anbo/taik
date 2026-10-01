//! System Tray Implementation

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, Emitter, Manager, Runtime,
};

/// Create and configure the system tray
pub fn create_tray<R: Runtime>(app: &App<R>) -> Result<(), Box<dyn std::error::Error>> {
    let handle = app.handle();

    // Create menu items
    let show_item = MenuItem::with_id(handle, "show", "Show Taik", true, None::<&str>)?;
    let record_item = MenuItem::with_id(handle, "record", "Start Recording", true, None::<&str>)?;
    let separator = MenuItem::with_id(handle, "sep", "───────────", false, None::<&str>)?;
    let quit_item = MenuItem::with_id(handle, "quit", "Quit", true, None::<&str>)?;

    // Build menu
    let menu = Menu::with_items(handle, &[&show_item, &record_item, &separator, &quit_item])?;

    // Build tray icon
    let _tray = TrayIconBuilder::with_id("main-tray")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(move |app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "record" => {
                // Emit event to frontend to start recording
                let _ = app.emit("tray:record", ());
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                // Show window on left click
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(handle)?;

    Ok(())
}
