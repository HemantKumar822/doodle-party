'use client';

import { GameMode, RoomSettings, DEFAULT_SETTINGS } from '@/app/_types/game';

/**
 * Game Modes Configuration
 * 
 * Classic: Standard drawing & guessing
 * Speed: Faster turns (50% time), 1.5x points, no word hints
 * Relay: Pass drawing between 3 players, each gets 1/3 time, first drawer picks word
 */

export interface GameModeConfig {
    name: string;
    emoji: string;
    description: string;
    /** Multiplier for draw time (e.g., 0.5 = half time) */
    timeMultiplier: number;
    /** Multiplier for points earned */
    pointsMultiplier: number;
    /** Whether drawer can choose from multiple words */
    allowWordChoice: boolean;
    /** Number of times the canvas passes in relay mode (1 = normal, 3 = relay) */
    relayPasses: number;
    /** Whether to show letter hints over time */
    showHints: boolean;
    /** Word selection time in seconds */
    wordSelectionTime: number;
    /** Whether turn auto-ends when all guess correctly */
    autoEndOnAllGuessed: boolean;
}

export const GAME_MODE_CONFIG: Record<GameMode, GameModeConfig> = {
    classic: {
        name: 'Classic',
        emoji: '🎨',
        description: 'Standard drawing & guessing fun!',
        timeMultiplier: 1.0,
        pointsMultiplier: 1.0,
        allowWordChoice: true,
        relayPasses: 1,
        showHints: true,
        wordSelectionTime: 10,
        autoEndOnAllGuessed: true,
    },
    speed: {
        name: 'Speed Draw',
        emoji: '⚡',
        description: 'Half the time, 1.5x the points!',
        timeMultiplier: 0.5,
        pointsMultiplier: 1.5,
        allowWordChoice: true,
        relayPasses: 1,
        showHints: false, // No hints in speed mode
        wordSelectionTime: 5, // Faster word selection
        autoEndOnAllGuessed: true,
    },
    relay: {
        name: 'Relay Draw',
        emoji: '🔄',
        description: 'Pass the drawing to teammates!',
        timeMultiplier: 1.0, // Same total time, but split between drawers
        pointsMultiplier: 1.0,
        allowWordChoice: true,
        relayPasses: 3, // Drawing passes between 3 players
        showHints: true,
        wordSelectionTime: 10,
        autoEndOnAllGuessed: true,
    },
};

/**
 * Get effective draw time for a mode
 */
export function getEffectiveDrawTime(settings: RoomSettings): number {
    const baseTime = settings.draw_time ?? DEFAULT_SETTINGS.draw_time;
    const modeConfig = GAME_MODE_CONFIG[settings.game_mode ?? 'classic'];
    return Math.floor(baseTime * modeConfig.timeMultiplier);
}

/**
 * Get effective draw time per relay segment
 * In relay mode, total time is split between drawers
 */
export function getRelaySegmentTime(settings: RoomSettings): number {
    const totalTime = getEffectiveDrawTime(settings);
    const modeConfig = GAME_MODE_CONFIG[settings.game_mode ?? 'classic'];
    return Math.floor(totalTime / modeConfig.relayPasses);
}

/**
 * Calculate points with mode multiplier applied
 */
export function applyModePointsMultiplier(basePoints: number, gameMode: GameMode): number {
    const multiplier = GAME_MODE_CONFIG[gameMode].pointsMultiplier;
    return Math.floor(basePoints * multiplier);
}

/**
 * Get word selection timeout for current mode
 */
export function getWordSelectionTime(gameMode: GameMode): number {
    return GAME_MODE_CONFIG[gameMode].wordSelectionTime;
}

/**
 * Check if hints should be shown for current mode
 */
export function shouldShowHints(gameMode: GameMode): boolean {
    return GAME_MODE_CONFIG[gameMode].showHints;
}

/**
 * Check if mode is relay mode
 */
export function isRelayMode(gameMode: GameMode): boolean {
    return gameMode === 'relay';
}

/**
 * Get the current relay drawer index within a turn
 * For a turn with 3 relay passes: returns 0, 1, or 2 based on time elapsed
 */
export function getRelayDrawerIndex(
    settings: RoomSettings,
    wordSelectedAt: string | null,
    turnEndsAt: string | null
): number {
    if (!wordSelectedAt || !turnEndsAt || settings.game_mode !== 'relay') {
        return 0;
    }

    const totalTime = getEffectiveDrawTime(settings);
    const segmentTime = getRelaySegmentTime(settings);
    const relayPasses = GAME_MODE_CONFIG.relay.relayPasses;

    const startTime = new Date(wordSelectedAt).getTime();
    const endTime = new Date(turnEndsAt).getTime();
    const now = Date.now();

    // Calculate how much time has passed
    const elapsed = Math.max(0, now - startTime);
    const elapsedSeconds = Math.floor(elapsed / 1000);

    // Determine which relay segment we're in
    const segment = Math.min(Math.floor(elapsedSeconds / segmentTime), relayPasses - 1);
    return segment;
}

/**
 * Get the actual drawer for relay mode
 * Cycles through players based on relay segment
 */
export function getRelayDrawerId(
    players: { id: string; turn_order: number | null }[],
    baseDrawerIndex: number,
    relaySegment: number
): string | null {
    if (players.length === 0) return null;

    const sortedPlayers = [...players].sort((a, b) => (a.turn_order ?? 0) - (b.turn_order ?? 0));

    // Start from base drawer and cycle through
    const effectiveIndex = (baseDrawerIndex + relaySegment) % sortedPlayers.length;

    // Find player at this effective index
    const drawer = sortedPlayers.find(p => p.turn_order === effectiveIndex);
    return drawer?.id ?? sortedPlayers[effectiveIndex % sortedPlayers.length]?.id ?? null;
}

/**
 * Get display text for relay mode progress
 */
export function getRelayProgressText(relaySegment: number, totalPasses: number): string {
    return `Drawer ${relaySegment + 1} of ${totalPasses}`;
}

/**
 * Check if we should transition to next relay drawer
 */
export function shouldTransitionRelayDrawer(
    settings: RoomSettings,
    wordSelectedAt: string | null,
    lastRelaySegment: number
): { shouldTransition: boolean; newSegment: number } {
    if (settings.game_mode !== 'relay' || !wordSelectedAt) {
        return { shouldTransition: false, newSegment: 0 };
    }

    const segmentTime = getRelaySegmentTime(settings);
    const startTime = new Date(wordSelectedAt).getTime();
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const currentSegment = Math.floor(elapsed / segmentTime);

    return {
        shouldTransition: currentSegment > lastRelaySegment,
        newSegment: currentSegment,
    };
}
