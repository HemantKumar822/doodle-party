'use client';

import React, { useState } from 'react';
import { useAudio } from '@/app/_contexts/AudioContext';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLeaveRoom?: () => void;
    isHost?: boolean;
}

export default function SettingsModal({ isOpen, onClose, onLeaveRoom, isHost }: SettingsModalProps) {
    const { isSfxMuted, setSfxMuted, volume, setVolume, isMusicPlaying, toggleMusic } = useAudio();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in p-4">
            <div className="bg-white sketchy-border p-6 max-w-sm w-full shadow-2xl">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold font-display">⚙️ Settings</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-xl"
                    >
                        ✕
                    </button>
                </div>

                {/* Sound Settings */}
                <div className="space-y-4 mb-6">
                    {/* Music Toggle */}
                    <div className="flex items-center justify-between">
                        <span className="font-bold">🎵 Music</span>
                        <button
                            onClick={toggleMusic}
                            className={`w-14 h-8 rounded-full border-2 border-black transition-colors relative ${isMusicPlaying ? 'bg-green-400' : 'bg-gray-300'
                                }`}
                        >
                            <div
                                className={`absolute top-1 w-5 h-5 bg-white rounded-full border border-black transition-transform ${isMusicPlaying ? 'left-7' : 'left-1'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Sound Effects Toggle */}
                    <div className="flex items-center justify-between">
                        <span className="font-bold">🔊 Sound Effects</span>
                        <button
                            onClick={() => setSfxMuted(!isSfxMuted)}
                            className={`w-14 h-8 rounded-full border-2 border-black transition-colors relative ${!isSfxMuted ? 'bg-green-400' : 'bg-gray-300'
                                }`}
                        >
                            <div
                                className={`absolute top-1 w-5 h-5 bg-white rounded-full border border-black transition-transform ${!isSfxMuted ? 'left-7' : 'left-1'
                                    }`}
                            />
                        </button>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-bold">🔊 Volume</span>
                            <span className="text-sm text-gray-500">{Math.round(volume * 100)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={volume * 100}
                            onChange={(e) => setVolume(parseInt(e.target.value) / 100)}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                        />
                    </div>
                </div>

                {/* Leave Room Button */}
                {onLeaveRoom && (
                    <button
                        onClick={onLeaveRoom}
                        className="w-full py-3 bg-red-500 text-black font-bold rounded-lg border-2 border-black hover:bg-red-600 transition-colors"
                    >
                        🚪 Leave Room
                    </button>
                )}

                {/* Info */}
                <div className="mt-6 pt-4 border-t-2 border-gray-200 text-center text-xs text-gray-400">
                    Doodle Party • Made with ❤️
                </div>
            </div>
        </div>
    );
}
