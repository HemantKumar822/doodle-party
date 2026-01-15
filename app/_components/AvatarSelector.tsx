'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createAvatar } from '@dicebear/core';
import * as adventurer from '@dicebear/adventurer';
import * as lorelei from '@dicebear/lorelei';
import * as bottts from '@dicebear/bottts';
import * as funEmoji from '@dicebear/fun-emoji';
import * as thumbs from '@dicebear/thumbs';

// Available avatar styles
const AVATAR_STYLES = [
    { id: 'adventurer', name: 'Adventurer', style: adventurer },
    { id: 'lorelei', name: 'Lorelei', style: lorelei },
    { id: 'bottts', name: 'Robots', style: bottts },
    { id: 'funEmoji', name: 'Emoji', style: funEmoji },
    { id: 'thumbs', name: 'Thumbs', style: thumbs },
];

// Stable default seed for SSR (same on server and client initial render)
const STABLE_DEFAULT_SEED = 'player123';

export interface AvatarConfig {
    style: string;
    seed: string;
}

interface AvatarSelectorProps {
    value: AvatarConfig;
    onChange: (config: AvatarConfig) => void;
    size?: number;
}

// Generate avatar SVG
export function generateAvatarSvg(config: AvatarConfig, size: number = 64): string {
    const styleEntry = AVATAR_STYLES.find(s => s.id === config.style) || AVATAR_STYLES[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const avatar = createAvatar(styleEntry.style as any, {
        seed: config.seed,
        size: size,
    });
    return avatar.toDataUri();
}

// Create random seed (only call on client!)
export function randomSeed(): string {
    return Math.random().toString(36).substring(2, 10);
}

// Default avatar config - uses stable seed for SSR safety
export function defaultAvatarConfig(): AvatarConfig {
    return {
        style: 'adventurer',
        seed: STABLE_DEFAULT_SEED,
    };
}

export default function AvatarSelector({ value, onChange, size = 80 }: AvatarSelectorProps) {
    const [currentStyle, setCurrentStyle] = useState(value.style);
    const [currentSeed, setCurrentSeed] = useState(value.seed);
    const [isMounted, setIsMounted] = useState(false);
    const hasRandomized = useRef(false);

    // On client mount, generate a random seed if using default
    useEffect(() => {
        setIsMounted(true);
        if (!hasRandomized.current && currentSeed === STABLE_DEFAULT_SEED) {
            hasRandomized.current = true;
            const newSeed = randomSeed();
            setCurrentSeed(newSeed);
        }
    }, [currentSeed]);

    // Generate preview avatars for each style (use FIXED seeds for style previews)
    // This ensures style selector thumbnails stay consistent, only main avatar uses currentSeed
    const stylePreviews = useMemo(() => {
        return AVATAR_STYLES.map(s => ({
            ...s,
            svg: generateAvatarSvg({ style: s.id, seed: 'preview' }, 48),
        }));
    }, []);

    // Current avatar preview
    const currentAvatar = useMemo(() => {
        return generateAvatarSvg({ style: currentStyle, seed: currentSeed }, size);
    }, [currentStyle, currentSeed, size]);

    // Update parent when config changes (after mount)
    useEffect(() => {
        if (isMounted) {
            onChange({ style: currentStyle, seed: currentSeed });
        }
    }, [currentStyle, currentSeed, onChange, isMounted]);

    const randomize = () => {
        setCurrentSeed(randomSeed());
    };

    // Show static placeholder during SSR/hydration (exact same layout, no animation)
    if (!isMounted) {
        return (
            <div className="flex flex-col items-center gap-3">
                <div className="relative">
                    <div className="w-24 h-24 rounded-full border-4 border-black bg-gray-50" />
                </div>
                <div className="flex gap-2 flex-wrap justify-center">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="w-12 h-12 rounded-full border-2 border-gray-200 bg-gray-50" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-3">
            {/* Main Avatar Preview */}
            <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-black bg-white overflow-hidden shadow-lg">
                    <img src={currentAvatar} alt="Your avatar" className="w-full h-full" />
                </div>
                <button
                    onClick={randomize}
                    className="absolute -bottom-1 -right-1 w-8 h-8 bg-yellow-400 border-2 border-black rounded-full flex items-center justify-center hover:scale-110 transition-transform text-lg"
                    title="Randomize"
                >
                    🎲
                </button>
            </div>

            {/* Style Selector */}
            <div className="flex gap-2 flex-wrap justify-center">
                {stylePreviews.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setCurrentStyle(s.id)}
                        className={`w-12 h-12 rounded-full border-2 overflow-hidden transition-all ${currentStyle === s.id
                            ? 'border-black scale-110 ring-2 ring-offset-2 ring-black'
                            : 'border-gray-300 hover:border-gray-500 hover:scale-105'
                            }`}
                        title={s.name}
                    >
                        <img src={s.svg} alt={s.name} className="w-full h-full" />
                    </button>
                ))}
            </div>
        </div>
    );
}

