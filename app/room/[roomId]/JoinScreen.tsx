import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { validateDisplayName } from '@/app/lib/gameUtils';
import { DEFAULT_SETTINGS } from '@/app/types/game';
import AvatarSelector, { AvatarConfig, defaultAvatarConfig } from '@/app/components/AvatarSelector';
import logger from '@/app/lib/logger';

interface JoinScreenProps {
    roomId: string;
    onJoin: (playerId: string) => void;
}

export default function JoinScreen({ roomId, onJoin }: JoinScreenProps) {
    const [name, setName] = useState('');
    const [nameError, setNameError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [roomError, setRoomError] = useState<string | null>(null);
    const [showNameInput, setShowNameInput] = useState(false);
    const [avatar, setAvatar] = useState<AvatarConfig>(defaultAvatarConfig());
    const hasTriedAutoJoin = useRef(false);
    const handleAvatarChange = useCallback((config: AvatarConfig) => setAvatar(config), []);

    // Check for pending data from home page and auto-join
    useEffect(() => {
        if (hasTriedAutoJoin.current) return;
        hasTriedAutoJoin.current = true;

        const pendingName = localStorage.getItem('pending_player_name');
        const pendingAvatar = localStorage.getItem('pending_player_avatar');

        if (pendingName && pendingAvatar) {
            localStorage.removeItem('pending_player_name');
            localStorage.removeItem('pending_player_avatar');
            // Auto-join with the pending data
            const avatarConfig = JSON.parse(pendingAvatar) as AvatarConfig;
            joinRoom(pendingName, avatarConfig);
        } else if (pendingName) {
            localStorage.removeItem('pending_player_name');
            // Has name but no avatar, show selector
            setName(pendingName);
            setShowNameInput(true);
        } else {
            // No pending data = direct link visitor, show full input
            setShowNameInput(true);
        }
    }, []);

    const joinRoom = async (playerName: string, avatarConfig?: AvatarConfig) => {
        const validation = validateDisplayName(playerName);
        if (!validation.isValid) {
            setNameError(validation.error || 'Invalid name');
            setShowNameInput(true);
            return;
        }
        setNameError(null);
        setRoomError(null);
        setLoading(true);

        const playerAvatar = avatarConfig || avatar;

        try {
            logger.info(`Joining room: ${roomId}`, { context: 'room', data: { playerName } });

            // Get room to check settings and status
            const { data: room, error: roomFetchError } = await supabase
                .from('rooms')
                .select('settings, status, room_code')
                .eq('id', roomId)
                .single();

            if (roomFetchError || !room) {
                logger.room.error('Room not found', { roomId });
                setRoomError('Party not found!');
                setShowNameInput(true);
                setLoading(false);
                return;
            }

            if (room.status === 'playing') {
                logger.warn('Cannot join - game in progress', { context: 'room' });
                setRoomError('Game already in progress!');
                setShowNameInput(true);
                setLoading(false);
                return;
            }

            // Get current players to check limit
            const { count } = await supabase
                .from('players')
                .select('*', { count: 'exact', head: true })
                .eq('room_id', roomId);

            const maxPlayers = room.settings?.max_players || DEFAULT_SETTINGS.max_players;
            if ((count || 0) >= maxPlayers) {
                logger.warn(`Room full: ${count}/${maxPlayers}`, { context: 'room' });
                setRoomError('Party is full!');
                setShowNameInput(true);
                setLoading(false);
                return;
            }

            const turnOrder = count || 0;

            const { data: player, error } = await supabase
                .from('players')
                .insert({
                    room_id: roomId,
                    display_name: playerName,
                    is_host: false,
                    is_connected: true,
                    score: 0,
                    turn_order: turnOrder,
                    avatar: playerAvatar
                })
                .select()
                .single();

            if (error) {
                logger.room.error('Failed to create player', error);
                throw error;
            }

            logger.room.joined(playerName, room.room_code || roomId);
            logger.player.connected(playerName, player.id);

            localStorage.setItem(`player_id_${roomId}`, player.id);
            onJoin(player.id);
        } catch (e) {
            logger.room.error('Join party failed', e);
            setRoomError('Error joining party. Please try again.');
            setShowNameInput(true);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <div className="animate-bounce text-4xl mb-4">🚀</div>
                <div className="text-2xl font-bold font-display">Joining Party...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 relative overflow-hidden">
            <h1 className="text-4xl md:text-6xl font-bold mb-8 font-display text-center transform -rotate-2">
                Join the Party! 🎉
            </h1>

            <div className="bg-white p-8 sketchy-border max-w-md w-full relative z-10">
                {roomError && (
                    <div className="bg-red-100 border-2 border-red-500 text-red-700 p-3 rounded mb-4 text-center font-bold">
                        {roomError}
                    </div>
                )}

                {showNameInput ? (
                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="block text-xl font-bold mb-2">Your Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value.slice(0, 12))}
                                className="w-full text-2xl p-3 border-2 border-black rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:translate-y-1 focus:shadow-none transition-all"
                                placeholder="Enter name..."
                                maxLength={12}
                            />
                            {nameError && <p className="text-red-500 text-sm mt-1">{nameError}</p>}
                        </div>

                        <div className="mt-2 text-center">
                            <label className="block text-xl font-bold mb-2">Your Look</label>
                            <AvatarSelector
                                value={avatar}
                                onChange={handleAvatarChange}
                                size={80}
                            />
                        </div>

                        <button
                            onClick={() => joinRoom(name)}
                            disabled={!name.trim()}
                            className="doodle-button w-full bg-green-400 hover:bg-green-500 text-black text-2xl py-3 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Let's Go! 🎨
                        </button>
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <div className="animate-spin text-4xl mb-4">🌀</div>
                        <p>Checking party...</p>
                    </div>
                )}
            </div>

            <button
                onClick={() => window.location.href = '/'}
                className="mt-8 text-gray-500 hover:text-black underline relative z-10"
            >
                ← Back to Home
            </button>
        </div>
    );
}



