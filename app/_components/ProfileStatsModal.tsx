'use client';

import React from 'react';
import { usePlayerStats } from '@/app/_hooks/usePlayerStats';
import { useAudio } from '@/app/_contexts/AudioContext';

interface ProfileStatsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ProfileStatsModal({ isOpen, onClose }: ProfileStatsModalProps) {
    const { getStats, getWinRate, getAverageScore } = usePlayerStats();
    const { playSound } = useAudio();
    const stats = getStats();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in p-4 backdrop-blur-sm">
            <div className="bg-white sketchy-border p-6 max-w-md w-full shadow-2xl relative">
                {/* Close Button */}
                <button
                    onClick={() => {
                        playSound('click');
                        onClose();
                    }}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-xl transition-colors"
                >
                    ✕
                </button>

                {/* Header */}
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold font-display mb-2">🏆 Career Stats</h2>
                    <p className="text-gray-500 font-handwriting text-lg">Your doodle legacy</p>
                </div>

                {/* Main Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    {/* Games Played */}
                    <div className="bg-blue-50 p-4 rounded-xl border-2 border-black/10 text-center transform hover:scale-105 transition-transform">
                        <div className="text-4xl font-black text-blue-500 font-display mb-1">
                            {stats.gamesPlayed}
                        </div>
                        <div className="text-sm font-bold text-gray-600 uppercase tracking-wider">Games</div>
                    </div>

                    {/* Wins */}
                    <div className="bg-yellow-50 p-4 rounded-xl border-2 border-black/10 text-center transform hover:scale-105 transition-transform">
                        <div className="text-4xl font-black text-yellow-500 font-display mb-1">
                            {stats.wins}
                        </div>
                        <div className="text-sm font-bold text-gray-600 uppercase tracking-wider">Wins</div>
                    </div>

                    {/* Win Rate */}
                    <div className="bg-green-50 p-4 rounded-xl border-2 border-black/10 text-center transform hover:scale-105 transition-transform">
                        <div className="text-4xl font-black text-green-500 font-display mb-1">
                            {getWinRate()}%
                        </div>
                        <div className="text-sm font-bold text-gray-600 uppercase tracking-wider">Win Rate</div>
                    </div>

                    {/* Best Score */}
                    <div className="bg-purple-50 p-4 rounded-xl border-2 border-black/10 text-center transform hover:scale-105 transition-transform">
                        <div className="text-4xl font-black text-purple-500 font-display mb-1">
                            {stats.bestScore}
                        </div>
                        <div className="text-sm font-bold text-gray-600 uppercase tracking-wider">Best Score</div>
                    </div>
                </div>

                {/* Avg Score (Full Width) */}
                <div className="bg-gray-50 p-4 rounded-xl border-2 border-black/10 text-center mb-8">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <span className="text-2xl font-black text-gray-700 font-display">{getAverageScore()}</span>
                        <span className="text-gray-400 font-bold">AVG PTS</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-black text-white font-bold rounded-lg border-2 border-transparent hover:bg-gray-800 transition-colors shadow-lg active:scale-95"
                    >
                        Close Profile
                    </button>
                    <div className="mt-4 text-xs text-gray-400 font-mono">
                        Last played: {stats.lastPlayed ? new Date(stats.lastPlayed).toLocaleDateString() : 'Never'}
                    </div>
                </div>
            </div>
        </div>
    );
}
