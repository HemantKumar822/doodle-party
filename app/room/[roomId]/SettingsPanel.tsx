'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Room, RoomSettings, DEFAULT_SETTINGS, GameMode } from '@/app/_types/game';

interface SettingsPanelProps {
    room: Room;
    isHost: boolean;
}

const DRAW_TIME_OPTIONS = [30, 45, 60, 80, 90, 120];
const ROUNDS_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10];
const MAX_PLAYERS_OPTIONS = [2, 4, 6, 8, 10, 12, 16];
const WORD_COUNT_OPTIONS = [2, 3, 4, 5];
const GAME_MODE_OPTIONS: { value: GameMode; label: string; desc: string }[] = [
    { value: 'classic', label: '🎨 Classic', desc: 'Standard drawing & guessing' },
    { value: 'speed', label: '⚡ Speed', desc: 'Faster turns, more pressure!' },
    { value: 'relay', label: '🔄 Relay', desc: 'Pass the drawing between players' },
];

export default function SettingsPanel({ room, isHost }: SettingsPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [settings, setSettings] = useState<RoomSettings>(room.settings || DEFAULT_SETTINGS);
    const [saving, setSaving] = useState(false);

    const updateSetting = async <K extends keyof RoomSettings>(key: K, value: RoomSettings[K]) => {
        if (!isHost) return;

        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);

        setSaving(true);
        await supabase.from('rooms').update({
            settings: newSettings,
            // Also update max_rounds to keep it in sync
            max_rounds: key === 'rounds' ? value as number : settings.rounds
        }).eq('id', room.id);
        setSaving(false);
    };

    if (!isHost) {
        // Non-host sees read-only settings badge
        return (
            <div className="sketchy-border bg-gray-50 p-4 mb-6">
                <div className="text-sm text-gray-600 text-center">
                    <span className="font-bold">Game Settings:</span>{' '}
                    {settings.rounds} rounds • {settings.draw_time}s draw time • {settings.word_count} words
                </div>
            </div>
        );
    }

    return (
        <div className="mb-6">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full sketchy-border bg-white p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
                <span className="font-bold text-lg">⚙️ Game Settings</span>
                <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {isOpen && (
                <div className="sketchy-border bg-white p-4 mt-2 space-y-4 animate-wobble">
                    {saving && <div className="text-xs text-gray-500 text-right">Saving...</div>}

                    {/* Draw Time */}
                    <div>
                        <label className="block text-sm font-bold mb-2">⏱️ Draw Time</label>
                        <div className="flex flex-wrap gap-2">
                            {DRAW_TIME_OPTIONS.map(t => (
                                <button
                                    key={t}
                                    onClick={() => updateSetting('draw_time', t)}
                                    className={`px-3 py-1 border-2 rounded-lg font-bold transition-all ${settings.draw_time === t
                                            ? 'border-black bg-yellow-200 scale-105'
                                            : 'border-gray-300 hover:border-black'
                                        }`}
                                >
                                    {t}s
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Rounds */}
                    <div>
                        <label className="block text-sm font-bold mb-2">🔄 Rounds</label>
                        <div className="flex flex-wrap gap-2">
                            {ROUNDS_OPTIONS.map(r => (
                                <button
                                    key={r}
                                    onClick={() => updateSetting('rounds', r)}
                                    className={`px-3 py-1 border-2 rounded-lg font-bold transition-all ${settings.rounds === r
                                            ? 'border-black bg-yellow-200 scale-105'
                                            : 'border-gray-300 hover:border-black'
                                        }`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Max Players */}
                    <div>
                        <label className="block text-sm font-bold mb-2">👥 Max Players</label>
                        <div className="flex flex-wrap gap-2">
                            {MAX_PLAYERS_OPTIONS.map(p => (
                                <button
                                    key={p}
                                    onClick={() => updateSetting('max_players', p)}
                                    className={`px-3 py-1 border-2 rounded-lg font-bold transition-all ${settings.max_players === p
                                            ? 'border-black bg-yellow-200 scale-105'
                                            : 'border-gray-300 hover:border-black'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Word Count */}
                    <div>
                        <label className="block text-sm font-bold mb-2">📝 Word Choices</label>
                        <div className="flex flex-wrap gap-2">
                            {WORD_COUNT_OPTIONS.map(w => (
                                <button
                                    key={w}
                                    onClick={() => updateSetting('word_count', w)}
                                    className={`px-3 py-1 border-2 rounded-lg font-bold transition-all ${settings.word_count === w
                                            ? 'border-black bg-yellow-200 scale-105'
                                            : 'border-gray-300 hover:border-black'
                                        }`}
                                >
                                    {w}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Game Mode */}
                    <div>
                        <label className="block text-sm font-bold mb-2">🎮 Game Mode</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {GAME_MODE_OPTIONS.map(mode => (
                                <button
                                    key={mode.value}
                                    onClick={() => updateSetting('game_mode', mode.value)}
                                    className={`p-3 border-2 rounded-lg text-left transition-all ${settings.game_mode === mode.value
                                            ? 'border-black bg-yellow-200'
                                            : 'border-gray-300 hover:border-black'
                                        }`}
                                >
                                    <div className="font-bold">{mode.label}</div>
                                    <div className="text-xs text-gray-600">{mode.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
