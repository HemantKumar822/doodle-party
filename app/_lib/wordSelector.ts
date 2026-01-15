/**
 * Word Selector Utility
 * 
 * Smart word selection algorithm for Doodle Party
 * Provides one word from each difficulty level per turn
 */

import { WORDS_EASY, WORDS_MEDIUM, WORDS_HARD, WordDifficulty } from '@/app/_data/words';

export interface WordChoice {
    word: string;
    difficulty: WordDifficulty;
    bonusPoints: number;
}

/**
 * Difficulty configuration
 */
export const DIFFICULTY_CONFIG: Record<WordDifficulty, {
    emoji: string;
    label: string;
    drawerBonus: number;
    guesserMultiplier: number;
    color: string;
}> = {
    easy: {
        emoji: '🟢',
        label: 'Easy',
        drawerBonus: 25,
        guesserMultiplier: 1.0,
        color: '#22c55e' // green-500
    },
    medium: {
        emoji: '🟡',
        label: 'Medium',
        drawerBonus: 50,
        guesserMultiplier: 1.2,
        color: '#eab308' // yellow-500
    },
    hard: {
        emoji: '🔴',
        label: 'Hard',
        drawerBonus: 100,
        guesserMultiplier: 1.4,
        color: '#ef4444' // red-500
    }
};

/**
 * Get a random word from a specific difficulty pool
 */
function getRandomWord(pool: string[], usedWords: Set<string>): string {
    // Filter out already used words
    const availableWords = pool.filter(w => !usedWords.has(w.toUpperCase()));

    // If pool exhausted, reset (rare case)
    if (availableWords.length === 0) {
        const randomIndex = Math.floor(Math.random() * pool.length);
        return pool[randomIndex].toUpperCase();
    }

    const randomIndex = Math.floor(Math.random() * availableWords.length);
    return availableWords[randomIndex].toUpperCase();
}

/**
 * Get word choices for a turn
 * Returns one word from each difficulty, shuffled
 * 
 * @param usedWords - Set of words already used in this room (to prevent repeats)
 * @param wordCount - Number of word choices (from settings, default 3)
 * @returns Array of WordChoice objects
 */
export function getWordChoices(
    usedWords: Set<string> = new Set(),
    wordCount: number = 3
): WordChoice[] {
    const choices: WordChoice[] = [];

    // Always include one of each difficulty if we have 3 choices
    if (wordCount >= 3) {
        choices.push({
            word: getRandomWord(WORDS_EASY, usedWords),
            difficulty: 'easy',
            bonusPoints: DIFFICULTY_CONFIG.easy.drawerBonus
        });

        choices.push({
            word: getRandomWord(WORDS_MEDIUM, usedWords),
            difficulty: 'medium',
            bonusPoints: DIFFICULTY_CONFIG.medium.drawerBonus
        });

        choices.push({
            word: getRandomWord(WORDS_HARD, usedWords),
            difficulty: 'hard',
            bonusPoints: DIFFICULTY_CONFIG.hard.drawerBonus
        });
    } else if (wordCount === 2) {
        // 2 choices: easy and medium
        choices.push({
            word: getRandomWord(WORDS_EASY, usedWords),
            difficulty: 'easy',
            bonusPoints: DIFFICULTY_CONFIG.easy.drawerBonus
        });
        choices.push({
            word: getRandomWord(WORDS_MEDIUM, usedWords),
            difficulty: 'medium',
            bonusPoints: DIFFICULTY_CONFIG.medium.drawerBonus
        });
    } else {
        // 1 choice: random difficulty
        const difficulties: WordDifficulty[] = ['easy', 'medium', 'hard'];
        const randomDifficulty = difficulties[Math.floor(Math.random() * 3)];
        const pool = randomDifficulty === 'easy' ? WORDS_EASY :
            randomDifficulty === 'medium' ? WORDS_MEDIUM : WORDS_HARD;

        choices.push({
            word: getRandomWord(pool, usedWords),
            difficulty: randomDifficulty,
            bonusPoints: DIFFICULTY_CONFIG[randomDifficulty].drawerBonus
        });
    }

    // Shuffle the choices so difficulty position varies
    return shuffleArray(choices);
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Calculate drawer bonus points based on difficulty
 */
export function getDrawerBonus(difficulty: WordDifficulty): number {
    return DIFFICULTY_CONFIG[difficulty].drawerBonus;
}

/**
 * Calculate guesser points with difficulty multiplier
 */
export function getGuesserPoints(basePoints: number, difficulty: WordDifficulty): number {
    return Math.round(basePoints * DIFFICULTY_CONFIG[difficulty].guesserMultiplier);
}

/**
 * Get difficulty emoji
 */
export function getDifficultyEmoji(difficulty: WordDifficulty): string {
    return DIFFICULTY_CONFIG[difficulty].emoji;
}

/**
 * Get difficulty color
 */
export function getDifficultyColor(difficulty: WordDifficulty): string {
    return DIFFICULTY_CONFIG[difficulty].color;
}
