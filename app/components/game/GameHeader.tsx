'use client';

import React from 'react';

interface GameHeaderProps {
    currentRound: number;
    maxRounds: number;
    currentWord: string | null;
    timeLeft: number;
    isDrawer: boolean;
    hasGuessedCorrectly: boolean;
    showScoreboard: boolean;
    revealedLetters: Set<number>;
    isMuted: boolean;
    onToggleMute: () => void;
}

/**
 * GameHeader - Displays round info, word/hint, timer, and mute button
 * Extracted from GameView for better separation of concerns
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
    isMuted,
    onToggleMute,
}: GameHeaderProps) {
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
            {/* Round Indicator */}
            <div className="text-lg md:text-xl font-bold">
                Round {currentRound}/{maxRounds}
            </div>

            {/* Word Display */}
            <div className="text-2xl md:text-3xl font-bold font-mono tracking-widest truncate max-w-[50%] text-center">
                {getWordDisplay()}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 md:gap-3">
                {/* Mute Button */}
                <button
                    onClick={onToggleMute}
                    className="text-xl md:text-2xl hover:scale-110 transition-transform"
                    title={isMuted ? 'Unmute' : 'Mute'}
                    aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
                >
                    {isMuted ? '🔇' : '🔊'}
                </button>

                {/* Timer */}
                <div
                    className={`text-xl md:text-2xl font-bold ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-black'
                        }`}
                    aria-label={`${timeLeft} seconds remaining`}
                >
                    {timeLeft}s
                </div>
            </div>
        </div>
    );
}

export default React.memo(GameHeader);
