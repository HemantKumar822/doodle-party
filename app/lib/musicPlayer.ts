/**
 * Background Music Player for Doodle Party
 * Generates a fun, bouncy synthesized melody loop
 */

class MusicPlayer {
    private audioContext: AudioContext | null = null;
    private isPlaying: boolean = false;
    private isMuted: boolean = false;
    private volume: number = 0.3;
    private intervalId: NodeJS.Timeout | null = null;
    private currentNoteIndex: number = 0;

    // Fun, bouncy melody in C major (pentatonic for catchiness)
    private melody = [
        { note: 523.25, duration: 0.15 }, // C5
        { note: 587.33, duration: 0.15 }, // D5
        { note: 659.25, duration: 0.3 },  // E5
        { note: 783.99, duration: 0.15 }, // G5
        { note: 659.25, duration: 0.15 }, // E5
        { note: 523.25, duration: 0.3 },  // C5
        { note: 392.00, duration: 0.15 }, // G4
        { note: 440.00, duration: 0.15 }, // A4
        { note: 523.25, duration: 0.3 },  // C5
        { note: 659.25, duration: 0.15 }, // E5
        { note: 783.99, duration: 0.3 },  // G5
        { note: 880.00, duration: 0.15 }, // A5
        { note: 783.99, duration: 0.3 },  // G5
        { note: 659.25, duration: 0.15 }, // E5
        { note: 523.25, duration: 0.15 }, // C5
        { note: 392.00, duration: 0.45 }, // G4 (rest feeling)
    ];

    // Bass line for rhythm
    private bassLine = [
        { note: 130.81, duration: 0.3 }, // C3
        { note: 130.81, duration: 0.3 },
        { note: 196.00, duration: 0.3 }, // G3
        { note: 196.00, duration: 0.3 },
        { note: 164.81, duration: 0.3 }, // E3
        { note: 164.81, duration: 0.3 },
        { note: 196.00, duration: 0.3 }, // G3
        { note: 130.81, duration: 0.3 }, // C3
    ];

    constructor() {
        if (typeof window !== 'undefined') {
            this.initContext();
        }
    }

    private initContext() {
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    private ensureContext() {
        if (!this.audioContext) {
            this.initContext();
        }
        if (this.audioContext?.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    private playNote(frequency: number, duration: number, type: OscillatorType = 'triangle', vol: number = 1) {
        if (!this.audioContext || this.isMuted) return;

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

    private playChord(notes: number[], duration: number) {
        notes.forEach(note => {
            this.playNote(note, duration, 'sine', 0.15);
        });
    }

    start() {
        if (this.isPlaying) return;

        this.ensureContext();
        this.isPlaying = true;
        this.currentNoteIndex = 0;

        let melodyIndex = 0;
        let bassIndex = 0;
        let beatCount = 0;

        const playNextBeat = () => {
            if (!this.isPlaying || this.isMuted) return;

            // Play melody note
            const melNote = this.melody[melodyIndex % this.melody.length];
            this.playNote(melNote.note, melNote.duration, 'triangle', 0.5);

            // Play bass every 2 beats
            if (beatCount % 2 === 0) {
                const bassNote = this.bassLine[bassIndex % this.bassLine.length];
                this.playNote(bassNote.note, bassNote.duration, 'sine', 0.3);
                bassIndex++;
            }

            // Add some sparkle occasionally
            if (beatCount % 8 === 0) {
                this.playNote(1046.5, 0.1, 'sine', 0.1); // High C sparkle
            }

            melodyIndex++;
            beatCount++;
        };

        // Start playing immediately
        playNextBeat();

        // Continue loop
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
        if (this.isPlaying) {
            this.stop();
        } else {
            this.start();
        }
        return this.isPlaying;
    }

    setMuted(muted: boolean) {
        this.isMuted = muted;
        if (muted && this.isPlaying) {
            this.stop();
        }
    }

    setVolume(vol: number) {
        this.volume = Math.max(0, Math.min(1, vol));
    }

    getIsPlaying() {
        return this.isPlaying;
    }
}

// Singleton instance
export const musicPlayer = new MusicPlayer();

// React hook
import { useState, useEffect, useCallback } from 'react';

interface MusicPlayerOptions {
    autoStart?: boolean;
    volume?: number; // 0-1, default 0.3
}

export function useMusicPlayer(options: MusicPlayerOptions = {}) {
    const { autoStart = false, volume = 0.3 } = options;
    const [isPlaying, setIsPlaying] = useState(false);

    const toggle = useCallback(() => {
        const playing = musicPlayer.toggle();
        setIsPlaying(playing);
    }, []);

    const stop = useCallback(() => {
        musicPlayer.stop();
        setIsPlaying(false);
    }, []);

    // Set volume and auto-start if enabled
    useEffect(() => {
        musicPlayer.setVolume(volume);

        if (autoStart) {
            const timer = setTimeout(() => {
                musicPlayer.start();
                setIsPlaying(true);
            }, 500);
            return () => {
                clearTimeout(timer);
                musicPlayer.stop();
            };
        }

        return () => {
            musicPlayer.stop();
        };
    }, [autoStart, volume]);

    return { isPlaying, toggle, stop };
}
