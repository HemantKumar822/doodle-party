/**
 * Game Utilities for Doodle Party
 * Contains validation, scoring, and fuzzy matching logic
 */

// ============================================
// INPUT VALIDATION
// ============================================

/**
 * Validates display name according to game rules
 * @param name - The display name to validate
 * @returns Object with isValid flag and error message if invalid
 */
export function validateDisplayName(name: string): { isValid: boolean; error?: string } {
    const trimmed = name.trim();

    if (trimmed.length < 2) {
        return { isValid: false, error: 'Name must be at least 2 characters' };
    }

    if (trimmed.length > 20) {
        return { isValid: false, error: 'Name must be 20 characters or less' };
    }

    // Allow alphanumeric, spaces, and common punctuation
    const validPattern = /^[a-zA-Z0-9\s\-_.]+$/;
    if (!validPattern.test(trimmed)) {
        return { isValid: false, error: 'Name can only contain letters, numbers, spaces, and -_.' };
    }

    return { isValid: true };
}

/**
 * Validates a guess before submission
 */
export function validateGuess(guess: string): { isValid: boolean; error?: string } {
    const trimmed = guess.trim();

    if (trimmed.length === 0) {
        return { isValid: false, error: 'Guess cannot be empty' };
    }

    if (trimmed.length > 100) {
        return { isValid: false, error: 'Guess too long' };
    }

    return { isValid: true };
}

// ============================================
// FUZZY MATCHING (Levenshtein Distance)
// ============================================

/**
 * Calculates Levenshtein distance between two strings
 * @param a - First string
 * @param b - Second string
 * @returns The edit distance between the strings
 */
export function levenshteinDistance(a: string, b: string): number {
    const aLower = a.toLowerCase().trim();
    const bLower = b.toLowerCase().trim();

    if (aLower === bLower) return 0;
    if (aLower.length === 0) return bLower.length;
    if (bLower.length === 0) return aLower.length;

    // Create distance matrix
    const matrix: number[][] = [];

    for (let i = 0; i <= bLower.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= aLower.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= bLower.length; i++) {
        for (let j = 1; j <= aLower.length; j++) {
            if (bLower.charAt(i - 1) === aLower.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    return matrix[bLower.length][aLower.length];
}

/**
 * Checks if a guess matches the target word using fuzzy matching
 * Rules:
 * - Words > 5 chars: Levenshtein distance ≤ 2
 * - Words 4-5 chars: Levenshtein distance ≤ 1
 * - Words < 4 chars: Exact match only
 * 
 * @param guess - The player's guess
 * @param target - The correct word
 * @returns true if the guess is considered correct
 */
export function isFuzzyMatch(guess: string, target: string): boolean {
    const guessNorm = guess.toLowerCase().trim().replace(/\s+/g, '');
    const targetNorm = target.toLowerCase().trim().replace(/\s+/g, '');

    // STRICT: Exact match only (User Request)
    return guessNorm === targetNorm;
}

// ============================================
// SCORING SYSTEM
// ============================================

/**
 * Base points for a correct guess
 */
const BASE_POINTS = 1000;

/**
 * Point decay per second (12.5 points/sec over 80 seconds = 0 at end)
 */
const DECAY_PER_SECOND = 12.5;

/**
 * Minimum points (even if timer almost up)
 */
const MIN_POINTS = 100;

/**
 * Calculates points for a correct guess based on time elapsed
 * @param secondsElapsed - Time since word was selected
 * @param guessRank - 1st, 2nd, 3rd... correct guesser
 * @returns Points to award
 */
export function calculateGuessPoints(secondsElapsed: number, guessRank: number): number {
    // Base decay
    let points = BASE_POINTS - (secondsElapsed * DECAY_PER_SECOND);
    points = Math.max(points, MIN_POINTS);

    // Apply rank multiplier
    let multiplier = 1.0;
    if (guessRank === 1) {
        multiplier = 1.0;    // 100% for first
    } else if (guessRank === 2) {
        multiplier = 0.75;   // 75% for second
    } else {
        multiplier = 0.50;   // 50% for third and beyond
    }

    return Math.round(points * multiplier);
}

/**
 * Calculates drawer points based on correct guesses
 * Drawer gets 25% of total points awarded
 */
export function calculateDrawerPoints(
    correctGuesses: { secondsElapsed: number }[]
): number {
    if (correctGuesses.length === 0) return 0;

    let totalAwarded = 0;
    correctGuesses.forEach((g, index) => {
        totalAwarded += calculateGuessPoints(g.secondsElapsed, index + 1);
    });

    return Math.round(totalAwarded * 0.25);
}

// ============================================
// WORD UTILITIES
// ============================================

/**
 * Converts a word to display format with underscores
 * Preserves spaces between words
 * @example "fire truck" -> "_ _ _ _  _ _ _ _ _"
 */
export function wordToUnderscores(word: string): string {
    return word
        .split('')
        .map(char => char === ' ' ? '  ' : '_')
        .join(' ');
}

/**
 * Returns word length hint
 * @example "fire truck" -> "(4, 5)"
 */
export function getWordLengthHint(word: string): string {
    const parts = word.split(' ').filter(p => p.length > 0);
    if (parts.length === 1) {
        return `(${parts[0].length})`;
    }
    return `(${parts.map(p => p.length).join(', ')})`;
}

// ============================================
// RATE LIMITING
// ============================================

/**
 * Simple in-memory rate limiter
 * Returns true if action is allowed, false if rate limited
 */
export class RateLimiter {
    private timestamps: number[] = [];
    private readonly maxActions: number;
    private readonly windowMs: number;

    constructor(maxActions: number, windowMs: number) {
        this.maxActions = maxActions;
        this.windowMs = windowMs;
    }

    canAct(): boolean {
        const now = Date.now();
        // Remove timestamps outside the window
        this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);

        if (this.timestamps.length >= this.maxActions) {
            return false;
        }

        this.timestamps.push(now);
        return true;
    }

    reset(): void {
        this.timestamps = [];
    }
}
