'use client';

import React from 'react';

interface WordSelectorProps {
    words: string[];
    timeLeft: number;
    onSelectWord: (word: string) => void;
}

/**
 * WordSelector - Modal for drawer to pick a word at the start of their turn
 * Extracted from GameView for better separation of concerns
 */
function WordSelector({ words, timeLeft, onSelectWord }: WordSelectorProps) {
    return (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 transition-opacity p-4">
            <div className="sketchy-border bg-white p-4 md:p-8 text-center animate-wobble shadow-xl w-full max-w-lg">
                <h2 className="text-xl md:text-2xl mb-2 font-bold">Pick a word!</h2>

                {/* Countdown Timer */}
                <div
                    className={`text-3xl md:text-4xl font-bold mb-4 ${timeLeft <= 3 ? 'text-red-500 animate-pulse' : 'text-gray-600'
                        }`}
                    aria-live="polite"
                >
                    {timeLeft}s
                </div>

                {/* Word Choices */}
                <div className="flex flex-wrap justify-center gap-2 md:gap-4">
                    {words.map(word => (
                        <button
                            key={word}
                            onClick={() => onSelectWord(word)}
                            className="doodle-button text-sm md:text-lg bg-mint hover:bg-green-200 transition-colors"
                        >
                            {word}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default React.memo(WordSelector);
