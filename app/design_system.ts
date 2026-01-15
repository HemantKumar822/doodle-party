/**
 * Doodle Party Design System
 * Centralized design tokens for consistent styling across the app
 */

export const COLORS = {
    // Pastels
    pink: '#FFE5E5',
    peach: '#FFF4E5',
    blue: '#E5F4FF',
    mint: '#F0FFE5',

    // Accents
    sketchDark: '#2C2C2C',
    sketchMedium: '#666666',

    // Backgrounds
    paper: '#FFFEF9', // Slightly off-white

    // UI Colors
    primary: '#FACC15', // Yellow-400
    success: '#4ADE80', // Green-400
    danger: '#EF4444', // Red-500
    warning: '#F97316', // Orange-500

    // Game Palette (for canvas)
    palette: {
        black: '#000000',
        white: '#FFFFFF',
        red: '#FF0000',
        blue: '#0000FF',
        green: '#00AA00',
        yellow: '#FFFF00',
        orange: '#FF8800',
        purple: '#AA00FF',
        brown: '#8B4513'
    }
} as const;

export const SPACING = {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    '2xl': '32px',
    '3xl': '48px',
} as const;

export const TYPOGRAPHY = {
    fontFamily: {
        display: "'Permanent Marker', cursive",
        body: "system-ui, sans-serif",
        mono: "ui-monospace, monospace",
    },
    fontSize: {
        xs: '0.75rem',    // 12px
        sm: '0.875rem',   // 14px
        base: '1rem',     // 16px
        lg: '1.125rem',   // 18px
        xl: '1.25rem',    // 20px
        '2xl': '1.5rem',  // 24px
        '3xl': '2rem',    // 32px
        '4xl': '2.5rem',  // 40px
    },
    fontWeight: {
        normal: '400',
        medium: '500',
        bold: '700',
    },
} as const;

export const SIZES = {
    borderRadius: {
        sm: '6px',
        md: '12px',
        lg: '16px',
        full: '9999px',
    },
    borderWidth: {
        thin: '2px',
        medium: '3px',
        thick: '4px',
    },
} as const;

export const SHADOWS = {
    sm: '2px 2px 0px rgba(0,0,0,1)',
    md: '4px 4px 0px rgba(0,0,0,1)',
    lg: '6px 6px 0px rgba(0,0,0,1)',
    none: 'none',
} as const;

export const ANIMATIONS = {
    wobble: 'wobble 0.5s ease-in-out infinite',
    pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    spin: 'spin 1s linear infinite',
} as const;

export const Z_INDEX = {
    base: 0,
    dropdown: 10,
    modal: 50,
    tooltip: 60,
    toast: 70,
} as const;
