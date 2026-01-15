'use client';

import React from 'react';
import { GameMode } from '@/app/_types/game';
import { GAME_MODE_CONFIG, isRelayMode, getRelayProgressText } from '@/app/_lib/gameModes';

interface GameHeaderProps {
    currentRound: number;
    maxRounds: number;
    currentWord: string | null;
    timeLeft: number;
    isDrawer: boolean;
    hasGuessedCorrectly: boolean;
    showScoreboard: boolean;
    revealedLetters: Set<number>;
    gameMode?: GameMode;
    relaySegment?: number;
    children?: React.ReactNode;
}

/**
 * GameHeader - Displays round info, word/hint, timer, and game mode badge
 * Shows relay progress indicator when in relay mode
 */
function GameHeader({
    currentRound,
    maxRounds,
    currentWord,
    timeLeft,
    isDrawer,
    hasGuessedCorrectly,
    showScoreboard,
    revealedLetters,
    gameMode = 'classic',
    relaySegment = 0,
    children,
}: GameHeaderProps) {
    const modeConfig = GAME_MODE_CONFIG[gameMode];

    // Generate word display (underscores with revealed letters for guessers)
    const getWordDisplay = () => {
        if (!currentWord) return 'WAITING...';

        // Drawer or already guessed - show full word
        if (isDrawer || hasGuessedCorrectly || showScoreboard) {
            return currentWord;
        }

        // Guesser - show underscores with hints
        return currentWord.split('').map((c, i) => {
            if (c === ' ') return '  ';
            if (revealedLetters.has(i)) return c + ' ';
            return '_ ';
        }).join('');
    };

    return (
        <div className="flex shrink-0 justify-between items-center p-2 border-b-2 border-black bg-white z-10 shadow-sm md:mb-4 md:sketchy-border md:p-3 md:shadow-md">
            {/* Left: Round + Mode Badge */}
            <div className="flex items-center gap-2">
                <div className="text-lg md:text-xl font-bold">
                    Round {currentRound}/{maxRounds}
                </div>
                {/* Game Mode Badge */}
                {gameMode !== 'classic' && (
                    <div
                        className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm"
                        title={modeConfig.description}
                    >
                        {modeConfig.emoji} {modeConfig.name}
                    </div>
                )}
            </div>

            {/* Center: Word Display + Relay Progress */}
            <div className="flex flex-col items-center flex-1 min-w-0 px-2">
                <div className="text-xl md:text-2xl font-bold font-mono tracking-wider text-center break-all">
                    {getWordDisplay()}
                </div>
                {/* Relay Progress Indicator */}
                {isRelayMode(gameMode) && currentWord && (
                    <div className="text-xs font-bold text-purple-600 animate-pulse mt-0.5">
                        {getRelayProgressText(relaySegment, GAME_MODE_CONFIG.relay.relayPasses)}
                    </div>
                )}
            </div>

            {/* Right: Timer + Controls */}
            <div className="flex items-center gap-2 md:gap-3">
                {/* Timer */}
                <div
                    className={`text-xl md:text-2xl font-bold ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-black'
                        }`}
                    aria-label={`${timeLeft} seconds remaining`}
                >
                    {timeLeft}s
                </div>

                {/* Additional Controls (Settings/Menu) */}
                {children}
            </div>
        </div>
    );
}

export default React.memo(GameHeader);
