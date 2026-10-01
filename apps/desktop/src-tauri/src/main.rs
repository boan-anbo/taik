//! Taik Desktop - Main Entry Point

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

fn main() {
    taik_desktop_lib::run()
}
