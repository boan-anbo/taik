const tokens = {
  color: {
    // Core colors
    background: '#FFFFFF',
    surface: '#F5F5F5',
    surfaceAlt: '#F0F8FF',
    borderSubtle: '#E0E8F0',
    text: '#333333',
    textSubtle: '#666666',
    brand: '#007AFF',
    danger: '#DC2626',
    dangerSurface: '#FEE2E2',
    recording: '#FF3B30',
    processing: '#FF9500',

    // iOS System Grays (for Settings-style UI)
    systemGray: '#8E8E93',
    systemGray2: '#AEAEB2',
    systemGray3: '#C7C7CC',
    systemGray4: '#D1D1D6',
    systemGray5: '#E5E5EA',
    systemGray6: '#F2F2F7',

    // Semantic aliases for iOS-style UI
    secondaryLabel: '#8E8E93',
    tertiaryLabel: '#C7C7CC',
    separator: '#E5E5EA',
    groupedBackground: '#F2F2F7',
    secondaryGroupedBackground: '#FFFFFF',

    // Additional semantic colors
    success: '#34C759',
    warning: '#FF9500',
    black: '#000000',
    white: '#FFFFFF',
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    pill: 999,
  },
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    screenPadding: 20,
  },
  fontSize: {
    xs: 13,
    sm: 14,
    md: 15,
    lg: 16,
    xl: 17,
    title: 20,
  },
  lineHeight: {
    body: 24,
  },
  fontWeight: {
    medium: '500',
    semibold: '600',
    bold: '700',
    heavy: '900',
  },
};

module.exports = { tokens };

