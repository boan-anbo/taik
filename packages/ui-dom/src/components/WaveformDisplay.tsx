/**
 * Waveform Display Component
 * Visualizes real-time audio levels as animated bars
 */

import React, { useMemo } from 'react';

export interface WaveformDisplayProps {
  /** Array of amplitude levels (0-1) */
  levels: number[];
  /** Current volume level (0-1) */
  volume?: number;
  /** Bar color (default: currentColor) */
  color?: string;
  /** Active/recording color (default: #FF3B30) */
  activeColor?: string;
  /** Whether currently recording/active */
  isActive?: boolean;
  /** Height of the component in pixels */
  height?: number;
  /** Width of each bar in pixels */
  barWidth?: number;
  /** Gap between bars in pixels */
  barGap?: number;
  /** Minimum bar height as percentage (0-1) */
  minBarHeight?: number;
  /** Custom class name */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
}

/**
 * Animated waveform visualization
 */
export function WaveformDisplay({
  levels,
  volume = 0,
  color = 'currentColor',
  activeColor = '#FF3B30',
  isActive = false,
  height = 32,
  barWidth = 3,
  barGap = 2,
  minBarHeight = 0.1,
  className,
  style,
}: WaveformDisplayProps) {
  // Generate bars with smooth transitions
  const bars = useMemo(() => {
    if (levels.length === 0) {
      // Generate idle bars when no data
      return Array(16).fill(minBarHeight);
    }
    return levels.map((level) => Math.max(minBarHeight, level));
  }, [levels, minBarHeight]);

  const totalWidth = bars.length * (barWidth + barGap) - barGap;
  const barColor = isActive ? activeColor : color;

  return (
    <div
      className={`waveform-display ${className || ''}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height,
        ...style,
      }}
      role="img"
      aria-label={isActive ? `Recording audio, volume ${Math.round(volume * 100)}%` : 'Audio waveform'}
    >
      <svg
        width={totalWidth}
        height={height}
        viewBox={`0 0 ${totalWidth} ${height}`}
        style={{ overflow: 'visible' }}
      >
        {bars.map((level, index) => {
          const barHeight = level * height;
          const x = index * (barWidth + barGap);
          const y = (height - barHeight) / 2;

          return (
            <rect
              key={index}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={barWidth / 2}
              ry={barWidth / 2}
              fill={barColor}
              style={{
                transition: 'height 0.05s ease-out, y 0.05s ease-out',
                opacity: isActive ? 0.9 : 0.4,
              }}
            />
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Compact waveform for inline display
 */
export function WaveformCompact({
  levels,
  isActive,
  className,
}: Pick<WaveformDisplayProps, 'levels' | 'isActive' | 'className'>) {
  return (
    <WaveformDisplay
      levels={levels}
      isActive={isActive}
      height={24}
      barWidth={2}
      barGap={1}
      className={className}
    />
  );
}
