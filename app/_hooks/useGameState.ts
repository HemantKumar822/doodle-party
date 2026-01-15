import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GameState, Player, Room } from '@/app/_types/game';
import { RealtimeChannel } from '@supabase/supabase-js';
import logger from '@/app/_lib/logger';

export function useGameState(roomId: string, currentPlayerId: string | null = null, initialRoom?: Room, initialPlayers?: Player[]) {
    const [room, setRoom] = useState<Room | null>(initialRoom || null);
    const [players, setPlayers] = useState<Player[]>(initialPlayers || []);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!roomId) return;

        // Load initial state if not provided
        const fetchState = async () => {
            if (!initialRoom) {
                const { data: roomData, error: roomError } = await supabase
                    .from('rooms')
                    .select('*')
                    .eq('id', roomId)
                    .single();

                if (roomError) {
                    setError(roomError.message);
                    return;
                }
                setRoom(roomData);
            }

            if (!initialPlayers) {
                const { data: playersData } = await supabase
                    .from('players')
                    .select('*')
                    .eq('room_id', roomId)
                    .order('turn_order', { ascending: true });

                setPlayers(playersData || []);
            }
        };

        fetchState();

        // Subscribe to Room changes
        const roomChannel = supabase
            .channel(`room_state:${roomId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
                (payload) => setRoom(payload.new as Room)
            )
            .subscribe();

        // Subscribe to Player changes AND Presence
        const playerChannel = supabase
            .channel(`room_players:${roomId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
                async (payload) => {
                    // Reload all players
                    const { data: playersData } = await supabase
                        .from('players')
                        .select('*')
                        .eq('room_id', roomId)
                        .order('turn_order', { ascending: true });

                    if (playersData) {
                        // Merge with known presence state if needed, but for now just set raw data
                        // The presence effect (below) will handle the is_connected override
                        // Actually, we need to combine them. 
                        // Let's store raw DB players in a ref or separate state, and derived players in main state?
                        // For simplicity, we'll just update the DB data here, and let the Presence effect re-merge.
                        // BUT: We need a way to share the 'onlineIds' state.
                        // Refactor: We will use a separate 'onlineIds' state and merge it during render or setPlayers.

                        setRawPlayers(playersData);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(roomChannel);
            supabase.removeChannel(playerChannel);
        };
    }, [roomId, initialRoom, initialPlayers]);

    // NEW: Proper Presence Tracking
    const [rawPlayers, setRawPlayers] = useState<Player[]>(initialPlayers || []);
    const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());


    const refresh = async () => {
        const { data: playersData } = await supabase
            .from('players')
            .select('*')
            .eq('room_id', roomId)
            .order('turn_order', { ascending: true });

        if (playersData) {
            setRawPlayers(playersData);
            logger.debug('Manually refreshed player list', { context: 'network', data: { count: playersData.length } });
        }
    };

    useEffect(() => {
        if (!roomId || !currentPlayerId) return;

        const presenceChannel = supabase.channel(`room_presence:${roomId}`, {
            config: { presence: { key: currentPlayerId } }
        });

        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const state = presenceChannel.presenceState();
                const ids = new Set(Object.keys(state));
                setOnlineIds(ids);
                logger.debug('Presence Sync', { context: 'network', data: { count: ids.size, ids: Array.from(ids) } });

                // Trigger refresh to check if an offline player was actually deleted (left room)
                refresh();
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await presenceChannel.track({ online_at: new Date().toISOString() });
                }
            });

        return () => {
            presenceChannel.untrack();
            supabase.removeChannel(presenceChannel);
        };
    }, [roomId, currentPlayerId]);

    // Merge DB data with Presence
    useEffect(() => {
        if (rawPlayers.length > 0) {
            const merged = rawPlayers.map(p => ({
                ...p,
                is_connected: onlineIds.has(p.id)
            }));
            // Only update if actually changed to avoid cycles?
            // JSON.stringify comparison is heavy, but safeguards loops.
            // For now, rely on standard equality check of React hooks or just set it.
            setPlayers(merged);
        }
    }, [rawPlayers, onlineIds]);

    return { room, players, error, refresh };
}
