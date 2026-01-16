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
    const [isMounted, setIsMounted] = useState(false);
    const hasRandomized = useRef(false);

    // On client mount
    useEffect(() => {
        setIsMounted(true);

        // Randomization Logic:
        // Only randomize if:
        // 1. We haven't done it yet this session (ref check)
        // 2. The current seed is the "STABLE_DEFAULT" (meaning parent passed default)
        // 3. No saved avatar exists in localStorage (Legacy check, though parent usually handles this now)

        // Note: We check localStorage here as a safety fallback in case parent didn't load it,
        // to prevent overwriting a saved avatar with a random one if the parent is slow to hydrate.
        const savedAvatar = localStorage.getItem('doodleparty_avatar');
        const hasSaved = !!savedAvatar;

        if (!hasRandomized.current && value.seed === STABLE_DEFAULT_SEED && !hasSaved) {
            hasRandomized.current = true;
            // Directly request change to parent
            onChange({
                style: value.style,
                seed: randomSeed()
            });
        }
    }, [value.seed, value.style, onChange]);

    // Generate preview avatars for each style (use FIXED seeds for style previews)
    // Generate preview avatars:
    // - Active style: Uses CURRENT seed (so you see updates)
    // - Inactive styles: Uses FIXED seed (so they look like consistent category icons)
    const stylePreviews = useMemo(() => {
        return AVATAR_STYLES.map(s => ({
            ...s,
            svg: generateAvatarSvg({
                style: s.id,
                seed: s.id === value.style ? value.seed : 'preview'
            }, 48),
        }));
    }, [value.seed, value.style]);

    // Current avatar preview - Derived directly from props
    const currentAvatar = useMemo(() => {
        return generateAvatarSvg({ style: value.style, seed: value.seed }, size);
    }, [value.style, value.seed, size]);

    const randomize = () => {
        onChange({
            style: value.style,
            seed: randomSeed()
        });
    };

    const handleStyleChange = (newStyle: string) => {
        onChange({
            style: newStyle,
            // When switching styles, start with the "preview" seed
            // This ensures the avatar matches the icon they just clicked (Principle of Least Surprise)
            seed: 'preview'
        });
    };

    // Show static placeholder during SSR/hydration to avoid mismatch
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
                        onClick={() => handleStyleChange(s.id)}
                        className={`w-12 h-12 rounded-full border-2 overflow-hidden transition-all ${value.style === s.id
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

