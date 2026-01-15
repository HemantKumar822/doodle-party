'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

/**
 * Global Audio Context for Doodle Party
 * Manages music and sound state persistently across all screens
 */

interface AudioContextType {
    isMusicPlaying: boolean;
    isMuted: boolean; // Controls Music Mute
    isSfxMuted: boolean; // Controls SFX Mute
    volume: number;
    toggleMusic: () => void;
    setMuted: (muted: boolean) => void;
    setSfxMuted: (muted: boolean) => void;
    setVolume: (vol: number) => void;
    toggleSfx: () => void;
    playSound: (type: 'correct' | 'wrong' | 'turnEnd' | 'yourTurn' | 'tick' | 'tickFast' | 'click' | 'pop') => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

// Singleton music player class
class MusicPlayer {
    private audioContext: AudioContext | null = null;
    private isPlaying: boolean = false;
    private volume: number = 0.3;
    private intervalId: NodeJS.Timeout | null = null;

    private melody = [
        { note: 523.25, duration: 0.15 }, { note: 587.33, duration: 0.15 },
        { note: 659.25, duration: 0.3 }, { note: 783.99, duration: 0.15 },
        { note: 659.25, duration: 0.15 }, { note: 523.25, duration: 0.3 },
        { note: 392.00, duration: 0.15 }, { note: 440.00, duration: 0.15 },
        { note: 523.25, duration: 0.3 }, { note: 659.25, duration: 0.15 },
        { note: 783.99, duration: 0.3 }, { note: 880.00, duration: 0.15 },
        { note: 783.99, duration: 0.3 }, { note: 659.25, duration: 0.15 },
        { note: 523.25, duration: 0.15 }, { note: 392.00, duration: 0.45 },
    ];

    private bassLine = [
        { note: 130.81, duration: 0.3 }, { note: 130.81, duration: 0.3 },
        { note: 196.00, duration: 0.3 }, { note: 196.00, duration: 0.3 },
        { note: 164.81, duration: 0.3 }, { note: 164.81, duration: 0.3 },
        { note: 196.00, duration: 0.3 }, { note: 130.81, duration: 0.3 },
    ];

    private initContext() {
        if (typeof window === 'undefined') return;
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    private ensureContext() {
        if (!this.audioContext) this.initContext();
        if (this.audioContext?.state === 'suspended') this.audioContext.resume();
    }

    private playNote(frequency: number, duration: number, type: OscillatorType = 'triangle', vol: number = 1) {
        if (!this.audioContext) return;
        const now = this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = type;
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(this.volume * vol, now + 0.02);
        gain.gain.setValueAtTime(this.volume * vol, now + duration * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.start(now);
        osc.stop(now + duration);
    }

    start() {
        if (this.isPlaying) return;
        this.ensureContext();
        this.isPlaying = true;

        let melodyIndex = 0, bassIndex = 0, beatCount = 0;

        const playNextBeat = () => {
            if (!this.isPlaying) return;
            const melNote = this.melody[melodyIndex % this.melody.length];
            this.playNote(melNote.note, melNote.duration, 'triangle', 0.5);
            if (beatCount % 2 === 0) {
                const bassNote = this.bassLine[bassIndex % this.bassLine.length];
                this.playNote(bassNote.note, bassNote.duration, 'sine', 0.3);
                bassIndex++;
            }
            if (beatCount % 8 === 0) this.playNote(1046.5, 0.1, 'sine', 0.1);
            melodyIndex++;
            beatCount++;
        };

        playNextBeat();
        this.intervalId = setInterval(playNextBeat, 300);
    }

    stop() {
        this.isPlaying = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    toggle() {
        if (this.isPlaying) this.stop();
        else this.start();
        return this.isPlaying;
    }

    setVolume(vol: number) {
        this.volume = Math.max(0, Math.min(1, vol));
    }

    getIsPlaying() {
        return this.isPlaying;
    }
}

// Singleton instance
const musicPlayerInstance = new MusicPlayer();

export function AudioProvider({ children }: { children: React.ReactNode }) {
    // Load initial state from localStorage
    const [isMusicPlaying, setIsMusicPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isSfxMuted, setIsSfxMuted] = useState(false);
    const [volume, setVolumeState] = useState(0.3);
    const audioContextRef = useRef<AudioContext | null>(null);

    // Initialize from localStorage on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const storedMuted = localStorage.getItem('doodleparty_muted'); // Legacy: mapped to music mute for now or global
        const storedSfxMuted = localStorage.getItem('doodleparty_sfx_muted');
        const storedVolume = localStorage.getItem('doodleparty_volume');

        if (storedMuted !== null) setIsMuted(storedMuted === 'true');
        if (storedSfxMuted !== null) setIsSfxMuted(storedSfxMuted === 'true');
        if (storedVolume !== null) setVolumeState(parseFloat(storedVolume));

        // Initialize audio context for sound effects
        try {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }

        // Auto-start music on first user interaction (click/touch)
        const startMusicOnInteraction = () => {
            if (!isMuted) {
                musicPlayerInstance.start();
                setIsMusicPlaying(true);
            }
            // Remove listeners after first interaction
            document.removeEventListener('click', startMusicOnInteraction);
            document.removeEventListener('touchstart', startMusicOnInteraction);
        };

        document.addEventListener('click', startMusicOnInteraction, { once: true });
        document.addEventListener('touchstart', startMusicOnInteraction, { once: true });

        return () => {
            document.removeEventListener('click', startMusicOnInteraction);
            document.removeEventListener('touchstart', startMusicOnInteraction);
        };
    }, []);

    // Sync muted state to music player
    useEffect(() => {
        if (isMuted && isMusicPlaying) {
            musicPlayerInstance.stop();
            setIsMusicPlaying(false);
        } else if (!isMuted && !isMusicPlaying && musicPlayerInstance.getIsPlaying()) {
            // If we unmuted and it was supposed to be playing
            musicPlayerInstance.start();
            setIsMusicPlaying(true);
        }
        localStorage.setItem('doodleparty_muted', String(isMuted));
    }, [isMuted]);

    // Sync SFX mute
    useEffect(() => {
        localStorage.setItem('doodleparty_sfx_muted', String(isSfxMuted));
    }, [isSfxMuted]);

    // Sync volume
    useEffect(() => {
        musicPlayerInstance.setVolume(volume);
        localStorage.setItem('doodleparty_volume', String(volume));
    }, [volume]);

    const toggleMusic = useCallback(() => {
        if (isMuted) {
            // If muted, toggling music should unmute music first
            setIsMuted(false);
            const playing = musicPlayerInstance.toggle();
            setIsMusicPlaying(playing);
            return;
        }
        const playing = musicPlayerInstance.toggle();
        setIsMusicPlaying(playing);
    }, [isMuted]);

    const setMuted = useCallback((muted: boolean) => {
        setIsMuted(muted);
    }, []);

    const setSfxMuted = useCallback((muted: boolean) => {
        setIsSfxMuted(muted);
    }, []);

    const toggleSfx = useCallback(() => {
        setIsSfxMuted(prev => !prev);
    }, []);

    const setVolume = useCallback((vol: number) => {
        setVolumeState(vol);
    }, []);

    // Sound effects player
    const playSound = useCallback((type: 'correct' | 'wrong' | 'turnEnd' | 'yourTurn' | 'tick' | 'tickFast' | 'click' | 'pop') => {
        if (isSfxMuted || !audioContextRef.current) return;

        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        const sounds: Record<string, { freq: number; duration: number; type: OscillatorType }> = {
            correct: { freq: 880, duration: 0.15, type: 'sine' },
            wrong: { freq: 220, duration: 0.3, type: 'sawtooth' },
            turnEnd: { freq: 440, duration: 0.5, type: 'triangle' },
            yourTurn: { freq: 660, duration: 0.2, type: 'sine' },
            tick: { freq: 1000, duration: 0.05, type: 'square' },
            tickFast: { freq: 1200, duration: 0.03, type: 'square' },
            click: { freq: 600, duration: 0.05, type: 'sine' },
            pop: { freq: 520, duration: 0.08, type: 'sine' },
        };

        const sound = sounds[type] || sounds.click;
        osc.type = sound.type;
        osc.frequency.value = sound.freq;
        gain.gain.setValueAtTime(volume * 0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + sound.duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + sound.duration);
    }, [isSfxMuted, volume]);

    return (
        <AudioContext.Provider value={{
            isMusicPlaying,
            isMuted,
            isSfxMuted,
            volume,
            toggleMusic,
            setMuted,
            setSfxMuted,
            toggleSfx,
            setVolume,
            playSound,
        }}>
            {children}
        </AudioContext.Provider>
    );
}

export function useAudio() {
    const context = useContext(AudioContext);
    if (!context) {
        throw new Error('useAudio must be used within AudioProvider');
    }
    return context;
}

// Backwards compatibility hook (replaces old useMusicPlayer)
export function useMusicPlayer() {
    const { isMusicPlaying, toggleMusic } = useAudio();
    return { isPlaying: isMusicPlaying, toggle: toggleMusic };
}

// Backwards compatibility hook (replaces old useSoundManager from deleted soundManager.ts)
export function useSoundManager() {
    const { isSfxMuted, toggleSfx, playSound } = useAudio();
    return {
        isMuted: isSfxMuted,
        toggleMute: toggleSfx,
        play: playSound,
    };
}
