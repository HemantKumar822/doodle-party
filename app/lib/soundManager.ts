/**
 * Sound Manager for Doodle Party
 * Uses Web Audio API to synthesize sounds - no external files needed!
 */

type SoundType =
    | 'correct'     // Correct guess - cheerful ding
    | 'wrong'       // Wrong guess - soft boop
    | 'tick'        // Timer tick
    | 'tickFast'    // Fast tick for last 5 seconds
    | 'yourTurn'    // Your turn to draw
    | 'turnEnd'     // Turn ended
    | 'victory'     // Game won
    | 'click'       // Button click
    | 'pop'         // Word selected
    | 'countdown';  // Countdown beep

class SoundManager {
    private audioContext: AudioContext | null = null;
    private isMuted: boolean = false;
    private volume: number = 0.5;

    constructor() {
        // Lazy init AudioContext on first user interaction
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

    setMuted(muted: boolean) {
        this.isMuted = muted;
    }

    getMuted() {
        return this.isMuted;
    }

    setVolume(vol: number) {
        this.volume = Math.max(0, Math.min(1, vol));
    }

    play(sound: SoundType) {
        if (this.isMuted || !this.audioContext) return;
        this.ensureContext();

        switch (sound) {
            case 'correct':
                this.playCorrect();
                break;
            case 'wrong':
                this.playWrong();
                break;
            case 'tick':
                this.playTick(false);
                break;
            case 'tickFast':
                this.playTick(true);
                break;
            case 'yourTurn':
                this.playYourTurn();
                break;
            case 'turnEnd':
                this.playTurnEnd();
                break;
            case 'victory':
                this.playVictory();
                break;
            case 'click':
                this.playClick();
                break;
            case 'pop':
                this.playPop();
                break;
            case 'countdown':
                this.playCountdown();
                break;
        }
    }

    // 🎉 Correct guess - Happy ascending arpeggio
    private playCorrect() {
        const ctx = this.audioContext!;
        const now = ctx.currentTime;

        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            gain.gain.setValueAtTime(0, now + i * 0.08);
            gain.gain.linearRampToValueAtTime(this.volume * 0.3, now + i * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.2);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.3);
        });
    }

    // ❌ Wrong guess - Soft descending "boop"
    private playWrong() {
        const ctx = this.audioContext!;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);

        gain.gain.setValueAtTime(this.volume * 0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.2);
    }

    // ⏰ Timer tick
    private playTick(fast: boolean) {
        const ctx = this.audioContext!;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = fast ? 880 : 440;

        gain.gain.setValueAtTime(this.volume * (fast ? 0.15 : 0.08), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    // 🎨 Your turn notification - Cheerful melody
    private playYourTurn() {
        const ctx = this.audioContext!;
        const now = ctx.currentTime;

        const notes = [392, 523.25, 659.25, 783.99]; // G, C, E, G

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.value = freq;

            gain.gain.setValueAtTime(0, now + i * 0.12);
            gain.gain.linearRampToValueAtTime(this.volume * 0.4, now + i * 0.12 + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.25);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + i * 0.12);
            osc.stop(now + i * 0.12 + 0.3);
        });
    }

    // 🔔 Turn end - Two-tone bell
    private playTurnEnd() {
        const ctx = this.audioContext!;
        const now = ctx.currentTime;

        [659.25, 523.25].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            gain.gain.setValueAtTime(this.volume * 0.3, now + i * 0.2);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.4);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + i * 0.2);
            osc.stop(now + i * 0.2 + 0.5);
        });
    }

    // 🏆 Victory fanfare - Epic rising arpeggio
    private playVictory() {
        const ctx = this.audioContext!;
        const now = ctx.currentTime;

        const notes = [
            { freq: 523.25, time: 0 },      // C
            { freq: 659.25, time: 0.1 },    // E
            { freq: 783.99, time: 0.2 },    // G
            { freq: 1046.5, time: 0.35 },   // C (octave)
            { freq: 783.99, time: 0.5 },    // G
            { freq: 1046.5, time: 0.65 },   // C
            { freq: 1318.5, time: 0.8 },    // E (high)
        ];

        notes.forEach(({ freq, time }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.value = freq;

            gain.gain.setValueAtTime(0, now + time);
            gain.gain.linearRampToValueAtTime(this.volume * 0.4, now + time + 0.02);
            gain.gain.setValueAtTime(this.volume * 0.4, now + time + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.4);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + time);
            osc.stop(now + time + 0.5);
        });
    }

    // 👆 Button click - Soft pop
    private playClick() {
        const ctx = this.audioContext!;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

        gain.gain.setValueAtTime(this.volume * 0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    // 💥 Pop sound - Word selected
    private playPop() {
        const ctx = this.audioContext!;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);

        gain.gain.setValueAtTime(this.volume * 0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.15);
    }

    // 3... 2... 1... countdown beep
    private playCountdown() {
        const ctx = this.audioContext!;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.value = 880;

        gain.gain.setValueAtTime(this.volume * 0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.1);
    }
}

// Singleton instance
export const soundManager = new SoundManager();

// React hook for easy access
import { useState, useCallback } from 'react';

export function useSoundManager() {
    const [isMuted, setIsMuted] = useState(soundManager.getMuted());

    const toggleMute = useCallback(() => {
        const newMuted = !isMuted;
        soundManager.setMuted(newMuted);
        setIsMuted(newMuted);
    }, [isMuted]);

    const play = useCallback((sound: SoundType) => {
        soundManager.play(sound);
    }, []);

    return { isMuted, toggleMute, play };
}
