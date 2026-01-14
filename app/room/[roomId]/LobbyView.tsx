import { Player, Room } from '@/app/types/game';
import { COLORS } from '@/app/design_system';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import SettingsPanel from './SettingsPanel';
import { useMusicPlayer } from '@/app/lib/musicPlayer';
import logger from '@/app/lib/logger';
import { generateAvatarSvg } from '@/app/components/AvatarSelector';

interface LobbyViewProps {
    room: Room;
    players: Player[];
    currentPlayerId: string;
}

export default function LobbyView({ room, players: rawPlayers, currentPlayerId }: LobbyViewProps) {
    const [kickConfirm, setKickConfirm] = useState<string | null>(null);
    const [kickedPlayerIds, setKickedPlayerIds] = useState<Set<string>>(new Set());

    // Optimistically filter out players we just kicked
    const players = rawPlayers.filter(p => !kickedPlayerIds.has(p.id));

    const currentPlayer = players.find(p => p.id === currentPlayerId);
    const isHost = currentPlayer?.is_host;
    const [starting, setStarting] = useState(false);

    // Lower volume music for lobby (0.15 = half of home page)
    const { isPlaying, toggle: toggleMusic } = useMusicPlayer({ autoStart: true, volume: 0.15 });

    const maxPlayers = room.settings?.max_players || 8;
    const isFull = players.length >= maxPlayers;

    const startGame = async () => {
        if (!isHost) return;
        setStarting(true);

        await supabase.from('rooms').update({
            status: 'playing',
            current_round: 1,
            current_drawer_index: 0,
            turn_ends_at: null,
            current_word: null,
            word_selected_at: null,
            max_rounds: room.settings?.rounds || 3
        }).eq('id', room.id);
    };

    const kickPlayer = async (playerId: string) => {
        const playerToKick = players.find(p => p.id === playerId);
        logger.info(`Kicking player: ${playerToKick?.display_name || playerId}`, { context: 'player' });

        // Optimistic update: Remove from UI immediately
        setKickedPlayerIds(prev => new Set(prev).add(playerId));
        setKickConfirm(null);

        try {
            const { error } = await supabase
                .from('players')
                .delete()
                .eq('id', playerId);

            if (error) {
                // Revert optimistic update if failed
                setKickedPlayerIds(prev => {
                    const next = new Set(prev);
                    next.delete(playerId);
                    return next;
                });

                logger.error(`Failed to kick player: ${error.message}`, { context: 'player', data: error });
                console.error('Kick error:', error);
                alert(`Failed to kick player: ${error.message}`);
            } else {
                logger.success(`Player kicked: ${playerToKick?.display_name}`, { context: 'player' });
            }
        } catch (e) {
            // Revert optimistic update if failed
            setKickedPlayerIds(prev => {
                const next = new Set(prev);
                next.delete(playerId);
                return next;
            });

            logger.error('Kick player error', { context: 'player', data: e });
            console.error(e);
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        alert('Link copied!');
    };

    return (
        <div className="flex flex-col items-center min-h-screen p-4">
            {/* Music Toggle */}
            <button
                onClick={toggleMusic}
                className="absolute top-4 right-4 z-20 text-2xl p-2 hover:scale-110 transition-transform bg-white rounded-full shadow-lg border-2 border-black"
                title={isPlaying ? 'Stop Music' : 'Play Music'}
            >
                {isPlaying ? '🎵' : '🔇'}
            </button>

            <div className="max-w-2xl w-full">
                {/* Header */}
                <div className="sketchy-border bg-white p-6 mb-6 text-center relative">
                    <h1 className="text-4xl mb-2">Party Code: <span className="text-blue-500">{room.room_code}</span></h1>
                    <button onClick={copyLink} className="text-sm underline text-gray-500 hover:text-black">
                        Copy Invite Link 📋
                    </button>
                </div>

                {/* Settings Panel (Host Only) */}
                <SettingsPanel room={room} isHost={isHost || false} />

                {/* Player Count */}
                <div className="text-center mb-4 text-gray-600">
                    {players.length} / {maxPlayers} players
                    {isFull && <span className="text-red-500 ml-2">(Party Full!)</span>}
                </div>

                {/* Players Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                    {players.map(p => {
                        const avatarSvg = p.avatar
                            ? generateAvatarSvg(p.avatar, 96)
                            : generateAvatarSvg({ style: 'adventurer', seed: p.id }, 96);

                        return (
                            <div key={p.id} className="sketchy-border p-4 bg-white flex flex-col items-center relative group">
                                <div className="relative mb-2">
                                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-black bg-gray-50">
                                        <img src={avatarSvg} alt={p.display_name} className="w-full h-full" />
                                    </div>
                                    {p.is_host && (
                                        <div className="absolute -top-3 -right-3 text-2xl filter drop-shadow-md animate-bounce-slow" title="Host">
                                            👑
                                        </div>
                                    )}
                                </div>
                                <div className="font-bold text-lg truncate max-w-full">{p.display_name}</div>

                                {isHost && p.id !== currentPlayerId && (
                                    <button
                                        onClick={() => setKickConfirm(p.id)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center border-2 border-black text-xs hover:scale-110 z-10"
                                        title="Kick Player"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        );
                    })}

                    {/* Empty Slots */}
                    {Array.from({ length: Math.max(0, maxPlayers - players.length) }).map((_, i) => (
                        <div key={`empty-${i}`} className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-center opacity-50">
                            Waiting...
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="text-center">
                    {isHost ? (
                        <button
                            onClick={startGame}
                            disabled={starting || players.length < 2}
                            className={`doodle-button text-2xl px-12 py-4 ${players.length < 2 ? 'opacity-50 cursor-not-allowed' : 'animate-wobble'}`}
                        >
                            {players.length < 2 ? 'Need 2+ Players' : 'Start Game! 🚀'}
                        </button>
                    ) : (
                        <div className="text-xl animate-pulse">Waiting for host to start...</div>
                    )}
                </div>
            </div>

            {/* Kick Modal */}
            {kickConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white sketchy-border p-6 max-w-sm w-full text-center">
                        <h3 className="text-xl mb-4">Kick this player?</h3>
                        <div className="flex gap-4 justify-center">
                            <button onClick={() => setKickConfirm(null)} className="px-4 py-2 border-2 border-black rounded">Cancel</button>
                            <button onClick={() => kickPlayer(kickConfirm)} className="px-4 py-2 bg-red-500 text-white border-2 border-black rounded">Kick!</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

