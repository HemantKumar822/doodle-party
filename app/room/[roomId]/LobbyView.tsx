'use client';

import { useRouter } from 'next/navigation';
import { Player, Room } from '@/app/_types/game';
import { COLORS } from '@/app/design_system';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import SettingsPanel from './SettingsPanel';
import GlobalControls from '@/app/_components/GlobalControls';
import Button from '@/app/_components/ui/Button';
import logger from '@/app/_lib/logger';
import { generateAvatarSvg } from '@/app/_components/AvatarSelector';

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
                .rpc('kick_player', {
                    requester_player_id: currentPlayerId, // Authenticate via "Knowledge of ID"
                    target_player_id: playerId
                });

            if (error) {
                // Revert optimistic update if failed
                setKickedPlayerIds(prev => {
                    const next = new Set(prev);
                    next.delete(playerId);
                    return next;
                });

                logger.error(`Failed to kick player: ${error.message}`, { context: 'player', data: error });
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
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        alert('Link copied!');
    };

    const router = useRouter(); // Ensure useRouter is imported

    const handleLeaveRoom = async () => {
        try {
            // Delete player from DB
            await supabase.from('players').delete().eq('id', currentPlayerId);
            // Clear local storage
            localStorage.removeItem(`player_id_${room.id}`);
            // Navigate home
            router.push('/');
        } catch (error) {
            logger.error('Error leaving room', { context: 'player', data: error });
            router.push('/'); // Navigate anyway
        }
    };

    return (
        <div className="flex flex-col items-center min-h-screen p-4">
            {/* Global Controls - Music Toggle + Settings */}
            <div className="absolute top-4 right-4 z-20">
                <GlobalControls
                    onLeaveRoom={handleLeaveRoom}
                    isHost={isHost}
                />
            </div>

            <div className="max-w-2xl w-full">
                {/* Header */}
                <div className="sketchy-border bg-white p-6 mb-6 text-center relative">
                    <h1 className="text-4xl mb-2">Party Code: <span className="text-blue-600 font-bold tracking-wider">{room.room_code}</span></h1>
                    <button onClick={copyLink} className="text-sm font-bold underline text-gray-700 hover:text-black">
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
                                    {/* Online/Offline Indicator */}
                                    <div
                                        className={`absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-white shadow-md ${p.is_connected ? 'bg-green-500' : 'bg-gray-400'
                                            }`}
                                        title={p.is_connected ? 'Online' : 'Offline'}
                                    />
                                    {p.is_host && (
                                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-xs bg-black text-white border border-white px-2 py-0.5 rounded-full shadow-md font-bold tracking-wider z-10" title="Host">
                                            HOST
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
                        <Button
                            onClick={startGame}
                            disabled={starting || players.length < 2}
                            size="xl"
                            animate={players.length >= 2}
                        >
                            {players.length < 2 ? 'Need 2+ Players' : 'Start Game! 🚀'}
                        </Button>
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

