'use client';

import React, { useState, useEffect } from 'react';
import { useAudio } from '@/app/_contexts/AudioContext';
import SettingsModal from './SettingsModal';

interface GlobalControlsProps {
    /** Optional: Pass a leave room handler for in-game usage */
    onLeaveRoom?: () => void;
    /** Optional: If true, shows host-specific options in settings */
    isHost?: boolean;
    /** Optional: Custom class for positioning adjustments */
    className?: string;
}

/**
 * GlobalControls - Unified control cluster for top-right corner
 * Contains: Music Toggle + Settings Gear
 * Use this component on ALL screens for consistency
 */
export default function GlobalControls({ onLeaveRoom, isHost, className = '' }: GlobalControlsProps) {
    const { isMusicPlaying, toggleMusic } = useAudio();
    const [showSettings, setShowSettings] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Prevent hydration mismatch - only render after mount
    useEffect(() => {
        setMounted(true);
    }, []);

    // Render static placeholder during SSR to prevent layout shift
    if (!mounted) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <div className="w-10 h-10 rounded-full bg-white/90 border-2 border-black shadow-md" />
            </div>
        );
    }

    return (
        <>
            {/* Control Buttons */}
            <div className={`flex items-center gap-2 ${className}`}>
                {/* Settings Gear */}
                <button
                    onClick={() => setShowSettings(true)}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm border-2 border-black shadow-md hover:scale-110 active:scale-95 transition-transform"
                    title="Settings"
                    aria-label="Open Settings"
                >
                    <span className="text-xl">⚙️</span>
                </button>
            </div>

            {/* Settings Modal */}
            <SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                onLeaveRoom={onLeaveRoom}
                isHost={isHost}
            />
        </>
    );
}

