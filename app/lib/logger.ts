/**
 * Game Logger - Provides formatted console logging with levels and context
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

interface LogOptions {
    context?: string;
    data?: unknown;
}

// Color codes for terminal (works in browser console too)
const COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
};

// Emoji prefixes for different log types
const PREFIXES: Record<LogLevel, string> = {
    debug: '🔍',
    info: '📋',
    warn: '⚠️',
    error: '❌',
    success: '✅',
};

// Context emojis for different game areas
const CONTEXT_EMOJIS: Record<string, string> = {
    room: '🏠',
    player: '👤',
    game: '🎮',
    draw: '🎨',
    guess: '💬',
    score: '🏆',
    timer: '⏱️',
    network: '🌐',
    auth: '🔐',
    avatar: '🎭',
    music: '🎵',
    error: '💥',
};

function getTimestamp(): string {
    const now = new Date();
    return now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3
    });
}

function formatContext(context?: string): string {
    if (!context) return '';
    const emoji = CONTEXT_EMOJIS[context.toLowerCase()] || '📌';
    return `${emoji} [${context.toUpperCase()}]`;
}

function log(level: LogLevel, message: string, options: LogOptions = {}): void {
    const timestamp = getTimestamp();
    const prefix = PREFIXES[level];
    const contextStr = formatContext(options.context);

    // Build the log message
    const parts = [
        `${COLORS.dim}${timestamp}${COLORS.reset}`,
        prefix,
        contextStr,
        message,
    ].filter(Boolean);

    const logMessage = parts.join(' ');

    // Choose console method based on level
    switch (level) {
        case 'error':
            console.error(logMessage);
            if (options.data) {
                console.error('  └─ Details:', options.data);
            }
            break;
        case 'warn':
            console.warn(logMessage);
            if (options.data) {
                console.warn('  └─ Details:', options.data);
            }
            break;
        case 'debug':
            if (process.env.NODE_ENV === 'development') {
                console.debug(logMessage);
                if (options.data) {
                    console.debug('  └─ Data:', options.data);
                }
            }
            break;
        default:
            console.log(logMessage);
            if (options.data) {
                console.log('  └─ Data:', options.data);
            }
    }
}

// Main logger object with methods for each level
export const logger = {
    debug: (message: string, options?: LogOptions) => log('debug', message, options),
    info: (message: string, options?: LogOptions) => log('info', message, options),
    warn: (message: string, options?: LogOptions) => log('warn', message, options),
    error: (message: string, options?: LogOptions) => log('error', message, options),
    success: (message: string, options?: LogOptions) => log('success', message, options),

    // Shorthand methods with context
    room: {
        created: (roomCode: string, roomId: string) =>
            log('success', `Room created: ${roomCode}`, { context: 'room', data: { roomId } }),
        joined: (playerName: string, roomCode: string) =>
            log('info', `${playerName} joined room ${roomCode}`, { context: 'room' }),
        left: (playerName: string) =>
            log('info', `${playerName} left the room`, { context: 'room' }),
        error: (message: string, error?: unknown) =>
            log('error', message, { context: 'room', data: error }),
    },

    player: {
        connected: (name: string, id: string) =>
            log('success', `Player connected: ${name}`, { context: 'player', data: { id } }),
        disconnected: (name: string) =>
            log('warn', `Player disconnected: ${name}`, { context: 'player' }),
        scoreUpdate: (name: string, points: number, total: number) =>
            log('info', `${name} +${points} points (total: ${total})`, { context: 'score' }),
    },

    game: {
        started: (roomCode: string, playerCount: number) =>
            log('success', `Game started! Room: ${roomCode}, Players: ${playerCount}`, { context: 'game' }),
        roundStart: (round: number, maxRounds: number) =>
            log('info', `Round ${round}/${maxRounds} starting...`, { context: 'game' }),
        turnStart: (drawer: string, word: string) =>
            log('info', `${drawer}'s turn to draw: "${word}"`, { context: 'draw' }),
        turnEnd: (drawer: string) =>
            log('info', `${drawer}'s turn ended`, { context: 'game' }),
        correctGuess: (guesser: string, timeLeft: number) =>
            log('success', `${guesser} guessed correctly! (${timeLeft}s left)`, { context: 'guess' }),
        ended: (winner: string, score: number) =>
            log('success', `Game over! Winner: ${winner} with ${score} points 🏆`, { context: 'game' }),
        error: (message: string, error?: unknown) =>
            log('error', message, { context: 'game', data: error }),
    },

    network: {
        connecting: () => log('info', 'Connecting to server...', { context: 'network' }),
        connected: () => log('success', 'Connected to server', { context: 'network' }),
        disconnected: () => log('warn', 'Disconnected from server', { context: 'network' }),
        error: (message: string, error?: unknown) =>
            log('error', message, { context: 'network', data: error }),
        realtimeEvent: (event: string, table: string) =>
            log('debug', `Realtime: ${event} on ${table}`, { context: 'network' }),
    },

    // Generic group for related logs
    group: (title: string, fn: () => void) => {
        console.group(`📦 ${title}`);
        fn();
        console.groupEnd();
    },

    // Table for structured data
    table: (data: unknown[], columns?: string[]) => {
        if (columns) {
            console.table(data, columns);
        } else {
            console.table(data);
        }
    },
};

export default logger;
