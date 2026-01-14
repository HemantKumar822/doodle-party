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

    // Game Palette (for canvas)
    palette: {
        black: '#000000',
        red: '#FF0000',
        blue: '#0000FF',
        green: '#00AA00',
        yellow: '#FFFF00',
        orange: '#FF8800',
        purple: '#AA00FF',
        brown: '#8B4513'
    }
} as const;

export const SIZES = {
    borderRadius: '12px',
    borderWidth: '3px',
    gap: '12px',
} as const;
