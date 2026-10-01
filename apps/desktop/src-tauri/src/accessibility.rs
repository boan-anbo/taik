//! macOS Accessibility API integration for direct text insertion
//!
//! This module provides commands for:
//! - Checking accessibility permission status
//! - Requesting accessibility permissions
//! - Inserting text directly into the focused application

/// Check if the app has accessibility permission (macOS)
#[tauri::command]
pub fn check_accessibility_permission() -> bool {
    #[cfg(target_os = "macos")]
    {
        use core_foundation::base::TCFType;
        use core_foundation::boolean::CFBoolean;
        use core_foundation::dictionary::CFDictionary;
        use core_foundation::string::CFString;

        // kAXTrustedCheckOptionPrompt = false (don't prompt, just check)
        let key = CFString::new("AXTrustedCheckOptionPrompt");
        let value = CFBoolean::false_value();
        let options = CFDictionary::from_CFType_pairs(&[(key.as_CFType(), value.as_CFType())]);

        extern "C" {
            fn AXIsProcessTrustedWithOptions(
                options: core_foundation::dictionary::CFDictionaryRef,
            ) -> bool;
        }

        unsafe { AXIsProcessTrustedWithOptions(options.as_concrete_TypeRef()) }
    }

    #[cfg(not(target_os = "macos"))]
    {
        false
    }
}

/// Request accessibility permission (opens System Preferences on macOS)
#[tauri::command]
pub fn request_accessibility_permission() -> bool {
    #[cfg(target_os = "macos")]
    {
        use core_foundation::base::TCFType;
        use core_foundation::boolean::CFBoolean;
        use core_foundation::dictionary::CFDictionary;
        use core_foundation::string::CFString;

        // kAXTrustedCheckOptionPrompt = true (prompt the user)
        let key = CFString::new("AXTrustedCheckOptionPrompt");
        let value = CFBoolean::true_value();
        let options = CFDictionary::from_CFType_pairs(&[(key.as_CFType(), value.as_CFType())]);

        extern "C" {
            fn AXIsProcessTrustedWithOptions(
                options: core_foundation::dictionary::CFDictionaryRef,
            ) -> bool;
        }

        unsafe { AXIsProcessTrustedWithOptions(options.as_concrete_TypeRef()) }
    }

    #[cfg(not(target_os = "macos"))]
    {
        false
    }
}

/// Insert text directly into the focused application using CGEvents
#[tauri::command]
pub fn insert_text_direct(text: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use core_graphics::event::{CGEvent, CGEventTapLocation};
        use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};

        // First check if we have permission
        if !check_accessibility_permission() {
            return Err("Accessibility permission not granted".to_string());
        }

        // Create event source
        let source = CGEventSource::new(CGEventSourceStateID::HIDSystemState)
            .map_err(|_| "Failed to create event source")?;

        // Insert text by simulating keyboard events for each character
        for ch in text.chars() {
            // Create key down event with the character
            if let Ok(event) = CGEvent::new_keyboard_event(source.clone(), 0, true) {
                // Set the Unicode string for the event
                let chars = [ch as u16];
                event.set_string_from_utf16_unchecked(&chars);

                // Post the key down event
                event.post(CGEventTapLocation::HID);

                // Create and post key up event
                if let Ok(key_up) = CGEvent::new_keyboard_event(source.clone(), 0, false) {
                    key_up.set_string_from_utf16_unchecked(&chars);
                    key_up.post(CGEventTapLocation::HID);
                }
            }
        }

        Ok(())
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err("Direct text insertion is only supported on macOS".to_string())
    }
}

/// Paste from clipboard by simulating Cmd+V (macOS only)
#[tauri::command]
pub fn paste_from_clipboard() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use core_graphics::event::{CGEvent, CGEventFlags, CGEventTapLocation};
        use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};
        use std::{thread, time::Duration};

        if !check_accessibility_permission() {
            return Err("Accessibility permission not granted".to_string());
        }

        let source = CGEventSource::new(CGEventSourceStateID::HIDSystemState)
            .map_err(|_| "Failed to create event source")?;

        let cmd_down = CGEvent::new_keyboard_event(source.clone(), 0x37, true)
            .map_err(|_| "Failed to create Cmd down event")?;
        let v_down = CGEvent::new_keyboard_event(source.clone(), 0x09, true)
            .map_err(|_| "Failed to create V down event")?;
        let v_up = CGEvent::new_keyboard_event(source.clone(), 0x09, false)
            .map_err(|_| "Failed to create V up event")?;
        let cmd_up = CGEvent::new_keyboard_event(source.clone(), 0x37, false)
            .map_err(|_| "Failed to create Cmd up event")?;

        v_down.set_flags(CGEventFlags::CGEventFlagCommand);
        v_up.set_flags(CGEventFlags::CGEventFlagCommand);

        cmd_down.post(CGEventTapLocation::HID);
        thread::sleep(Duration::from_millis(10));
        v_down.post(CGEventTapLocation::HID);
        thread::sleep(Duration::from_millis(10));
        v_up.post(CGEventTapLocation::HID);
        thread::sleep(Duration::from_millis(10));
        cmd_up.post(CGEventTapLocation::HID);

        Ok(())
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err("Paste simulation is only supported on macOS".to_string())
    }
}

/// Get the list of supported insertion methods for this platform
#[tauri::command]
pub fn get_supported_insertion_methods() -> Vec<String> {
    let mut methods = vec!["clipboard".to_string()];

    #[cfg(target_os = "macos")]
    {
        methods.push("direct".to_string());
    }

    methods
}
