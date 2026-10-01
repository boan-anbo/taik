/**
 * Audio Device Selector Component
 * Reusable dropdown for selecting audio input devices.
 * Can be used in Settings page or as a quick-switcher in VoiceWidget.
 */

import React, { useCallback } from 'react';
import type { AudioInputDevice } from '@taik/capabilities';
import './AudioDeviceSelector.css';

export interface AudioDeviceSelectorProps {
  /** Available audio devices */
  devices: AudioInputDevice[];
  /** Currently selected device ID (undefined = system default) */
  selectedDeviceId: string | undefined;
  /** Callback when device is selected */
  onSelect: (deviceId: string | undefined) => void;
  /** Whether permission is granted */
  hasPermission: boolean;
  /** Request permission callback */
  onRequestPermission: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Compact mode (for VoiceWidget) */
  compact?: boolean;
  /** Optional label */
  label?: string;
  /** Optional class name */
  className?: string;
}

/**
 * Microphone icon SVG
 */
function MicrophoneIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

/**
 * Chevron down icon SVG
 */
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * Audio Device Selector Component
 */
export function AudioDeviceSelector({
  devices,
  selectedDeviceId,
  onSelect,
  hasPermission,
  onRequestPermission,
  disabled = false,
  compact = false,
  label,
  className = '',
}: AudioDeviceSelectorProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      // Empty string means "System Default"
      onSelect(value === '' ? undefined : value);
    },
    [onSelect]
  );

  // Find the selected device for display
  const selectedDevice = devices.find(d => d.deviceId === selectedDeviceId);
  const displayLabel = selectedDevice?.label || 'System Default';

  // If no permission, show permission button
  if (!hasPermission) {
    // Compact: icon-only button to avoid noisy UI in VoiceWidget
    if (compact) {
      return (
        <div className={`audio-device-selector compact ${className}`.trim()}>
          <button
            type="button"
            className="permission-button compact-permission-button"
            onClick={onRequestPermission}
            disabled={disabled}
            title="Grant microphone access"
            aria-label="Grant microphone access"
          >
            <MicrophoneIcon className="button-icon" />
          </button>
        </div>
      );
    }

    return (
      <div className={`audio-device-selector ${compact ? 'compact' : ''} ${className}`.trim()}>
        {label && !compact && <label className="device-label">{label}</label>}
        <button
          type="button"
          className="permission-button"
          onClick={onRequestPermission}
          disabled={disabled}
        >
          <MicrophoneIcon className="button-icon" />
          <span>Grant Microphone Access</span>
        </button>
      </div>
    );
  }

  // No devices available
  if (devices.length === 0) {
    return (
      <div className={`audio-device-selector ${compact ? 'compact' : ''} ${className}`.trim()}>
        {label && !compact && <label className="device-label">{label}</label>}
        <div className="no-devices">
          <MicrophoneIcon className="no-devices-icon" />
          <span>No audio devices found</span>
        </div>
      </div>
    );
  }

  // Compact mode for VoiceWidget (just icon + dropdown)
  if (compact) {
    return (
      <div className={`audio-device-selector compact ${className}`.trim()}>
        <div className="compact-select-wrapper">
          <MicrophoneIcon className="compact-icon" />
          <select
            value={selectedDeviceId ?? ''}
            onChange={handleChange}
            disabled={disabled}
            className="compact-select"
            title={displayLabel}
          >
            <option value="">System Default</option>
            {devices
              .filter(d => d.deviceId !== 'default' && d.deviceId !== '')
              .map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
          </select>
          <ChevronDownIcon className="compact-chevron" />
        </div>
      </div>
    );
  }

  // Full mode for Settings
  return (
    <div className={`audio-device-selector ${className}`.trim()}>
      {label && <label className="device-label">{label}</label>}
      <div className="select-wrapper">
        <MicrophoneIcon className="select-icon" />
        <select
          value={selectedDeviceId ?? ''}
          onChange={handleChange}
          disabled={disabled}
          className="device-select"
        >
          <option value="">System Default</option>
          {devices
            .filter(d => d.deviceId !== 'default' && d.deviceId !== '')
            .map(device => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
                {device.isDefault ? ' (Default)' : ''}
              </option>
            ))}
        </select>
        <ChevronDownIcon className="select-chevron" />
      </div>
    </div>
  );
}

export default AudioDeviceSelector;
