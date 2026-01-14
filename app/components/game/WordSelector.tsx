'use client';

import React from 'react';
import { WordChoice, DIFFICULTY_CONFIG } from '@/app/lib/wordSelector';
import { WordDifficulty } from '@/app/data/words';

interface WordSelectorProps {
    words: WordChoice[];
    timeLeft: number;
    onSelectWord: (word: string, difficulty: WordDifficulty) => void;
}

/**
 * WordSelector - Modal for drawer to pick a word at the start of their turn
 * Shows difficulty badges and bonus points for each word choice
 */
function WordSelector({ words, timeLeft, onSelectWord }: WordSelectorProps) {
    return (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 transition-opacity p-4">
            <div className="sketchy-border bg-white p-4 md:p-8 text-center animate-wobble shadow-xl w-full max-w-xl">
                <h2 className="text-xl md:text-2xl mb-1 font-bold">Pick Your Challenge! 🎯</h2>
                <p className="text-sm text-gray-500 mb-3">Harder words = more bonus points!</p>

                {/* Countdown Timer */}
                <div
                    className={`text-3xl md:text-4xl font-bold mb-4 ${timeLeft <= 3 ? 'text-red-500 animate-pulse' : 'text-gray-600'
                        }`}
                    aria-live="polite"
                >
                    {timeLeft}s
                </div>

                {/* Word Choices with Difficulty */}
                <div className="flex flex-col gap-3">
                    {words.map((choice) => {
                        const config = DIFFICULTY_CONFIG[choice.difficulty];

                        return (
                            <button
                                key={choice.word}
                                onClick={() => onSelectWord(choice.word, choice.difficulty)}
                                className="relative w-full p-4 rounded-xl border-3 border-black transition-all transform hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
                                style={{
                                    backgroundColor: `${config.color}20`,
                                    borderColor: config.color,
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    {/* Difficulty Badge */}
                                    <div
                                        className="flex items-center gap-2 px-2 py-1 rounded-full text-sm font-bold"
                                        style={{
                                            backgroundColor: config.color,
                                            color: choice.difficulty === 'medium' ? 'black' : 'white'
                                        }}
                                    >
                                        {config.emoji} {config.label}
                                    </div>

                                    {/* Word */}
                                    <span className="text-lg md:text-xl font-bold flex-1 mx-4">
                                        {choice.word}
                                    </span>

                                    {/* Bonus Points */}
                                    <div className="text-sm font-bold text-gray-600 bg-yellow-100 px-2 py-1 rounded-full border border-yellow-400">
                                        +{choice.bonusPoints} pts
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default React.memo(WordSelector);
