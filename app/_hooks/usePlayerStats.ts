'use client';

import { useCallback } from 'react';

/**
 * Player Statistics Hook
 * Tracks game history in localStorage for personal stats
 */

interface PlayerStats {
    gamesPlayed: number;
    wins: number;
    totalScore: number;
    bestScore: number;
    lastPlayed: string;
}

const STATS_KEY = 'doodleparty_stats';

const defaultStats: PlayerStats = {
    gamesPlayed: 0,
    wins: 0,
    totalScore: 0,
    bestScore: 0,
    lastPlayed: '',
};

export function usePlayerStats() {
    // Get current stats from localStorage
    const getStats = useCallback((): PlayerStats => {
        if (typeof window === 'undefined') return defaultStats;

        try {
            const stored = localStorage.getItem(STATS_KEY);
            if (stored) {
                return { ...defaultStats, ...JSON.parse(stored) };
            }
        } catch (e) {
            console.warn('Failed to load player stats', e);
        }
        return defaultStats;
    }, []);

    // Save stats to localStorage
    const saveStats = useCallback((stats: PlayerStats) => {
        if (typeof window === 'undefined') return;

        try {
            localStorage.setItem(STATS_KEY, JSON.stringify(stats));
        } catch (e) {
            console.warn('Failed to save player stats', e);
        }
    }, []);

    // Record a completed game
    const recordGame = useCallback((score: number, isWinner: boolean) => {
        const stats = getStats();
        const updatedStats: PlayerStats = {
            gamesPlayed: stats.gamesPlayed + 1,
            wins: stats.wins + (isWinner ? 1 : 0),
            totalScore: stats.totalScore + score,
            bestScore: Math.max(stats.bestScore, score),
            lastPlayed: new Date().toISOString(),
        };
        saveStats(updatedStats);
        return updatedStats;
    }, [getStats, saveStats]);

    // Get win rate as percentage
    const getWinRate = useCallback((): number => {
        const stats = getStats();
        if (stats.gamesPlayed === 0) return 0;
        return Math.round((stats.wins / stats.gamesPlayed) * 100);
    }, [getStats]);

    // Get average score
    const getAverageScore = useCallback((): number => {
        const stats = getStats();
        if (stats.gamesPlayed === 0) return 0;
        return Math.round(stats.totalScore / stats.gamesPlayed);
    }, [getStats]);

    // Reset stats
    const resetStats = useCallback(() => {
        saveStats(defaultStats);
    }, [saveStats]);

    return {
        getStats,
        recordGame,
        getWinRate,
        getAverageScore,
        resetStats,
    };
}
