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

    // HOST TRANSFER: If no host exists in players list, promote the next player
    // HOST TRANSFER: If no host exists OR current host is offline, promote the next player
    useEffect(() => {
        if (!currentPlayerId || rawPlayers.length === 0) return;

        // Check if there is an ONLINE host
        // We consider a host "online" if they are in the DB as host AND present in the channel
        // BUT: effectively, if rawPlayers has a host, we need to check if that host ID is in onlineIds.
        // If onlineIds is empty (initial load), skip this check to avoid accidental transfer race on reload.
        if (onlineIds.size === 0) return;

        const currentHost = rawPlayers.find(p => p.is_host);
        const isHostOnline = currentHost && onlineIds.has(currentHost.id);

        const currentPlayerInRoom = rawPlayers.find(p => p.id === currentPlayerId);

        // If no host (deleted) OR host is offline, and I'm the next eligible player...
        if ((!currentHost || !isHostOnline) && currentPlayerInRoom && onlineIds.has(currentPlayerId)) {
            // Sort by turn_order, but FILTER for online players only to find the next valid host
            const onlinePlayers = rawPlayers.filter(p => onlineIds.has(p.id));
            const sortedOnlinePlayers = [...onlinePlayers].sort((a, b) => (a.turn_order ?? 999) - (b.turn_order ?? 999));

            const nextHost = sortedOnlinePlayers[0];

            // If *I* am the next connected player, I take the crown 👑
            // Also ensure we don't spam updates: only if I'm not already host
            if (nextHost && nextHost.id === currentPlayerId && !currentPlayerInRoom.is_host) {
                logger.info(`Host transfer needed (Active Host: ${!!currentHost}, Online: ${isHostOnline}). Promoting self.`, { context: 'player' });

                // Update DB to make this player the host
                // If there was an old host, demote them first? 
                // No, just setting is_host=true for me is enough if we trust the "single host" logic,
                // but strictly we should probably demote others. However, Supabase RLS or typical logic allows multiple for a split second.
                // Better: Update old host to false if exists?
                // For simplicity/robustness: Just set me to true. The UI usually handles "first host found" or "me is host".

                // If there is an idle/offline host, we should demote them to avoid "Two Kings" scenario when they reconnect?
                // Yes, better to unset old host.

                // Update DB to make this player the host
                // We use an async IIFE to handle the promises sequentially and robustly
                (async () => {
                    try {
                        // 1. Promote self
                        const { error: promoError } = await supabase
                            .from('players')
                            .update({ is_host: true })
                            .eq('id', currentPlayerId);

                        if (promoError) {
                            logger.error('Failed to promote self to host', { context: 'player', data: promoError });
                            return; // Stop if promotion fails
                        }

                        // 2. Demote old host if they exist
                        if (currentHost) {
                            const { error: demoteError } = await supabase
                                .from('players')
                                .update({ is_host: false })
                                .eq('id', currentHost.id);

                            if (demoteError) {
                                // Non-critical error, just log it
                                logger.warn('Failed to clean up old host', { context: 'player', data: demoteError });
                            }
                        }

                        logger.success('Host transfer complete', { context: 'player' });
                    } catch (err) {
                        logger.error('Unexpected error during host transfer', { context: 'player', data: err });
                    }
                })();
            }
        }
    }, [rawPlayers, currentPlayerId, onlineIds]);

    return { room, players, error, refresh };
}
