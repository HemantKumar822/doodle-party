'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGameState } from '@/app/hooks/useGameState';
import JoinScreen from './JoinScreen';
import LobbyView from './LobbyView';
import { useParams } from 'next/navigation';
import GameView from './GameView';
import ErrorBoundary from '@/app/components/ErrorBoundary';
import logger from '@/app/lib/logger';

export default function RoomPage() {
    const params = useParams();
    const roomId = params.roomId as string;
    const [playerId, setPlayerId] = useState<string | null>(null);
    const justJoinedRef = useRef(false); // Track if we just joined to avoid false "not in room"

    // Try to recover player ID on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(`player_id_${roomId}`);
            if (stored) {
                logger.debug(`Recovered player ID from localStorage`, { context: 'player', data: { playerId: stored } });
                setPlayerId(stored);
            }
        }
    }, [roomId]);

    const { room, players, error, refresh } = useGameState(roomId, playerId);

    // Handle the onJoin callback - set a flag to avoid race condition
    const handleJoin = (newPlayerId: string) => {
        logger.success(`Player joined, setting ID: ${newPlayerId}`, { context: 'player' });
        justJoinedRef.current = true;
        setPlayerId(newPlayerId);

        // Force immediate refresh to fetch the new player
        refresh();

        // Reset the flag after a short delay to allow realtime sync
        setTimeout(() => {
            justJoinedRef.current = false;
        }, 3000);
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
                <div className="text-6xl mb-4">😵</div>
                <h2 className="text-2xl font-bold mb-2 text-red-500">Connection Error</h2>
                <p className="text-gray-600 mb-6">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="doodle-button px-6 py-2"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!room) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <div className="animate-bounce text-4xl mb-4">🎨</div>
                <div className="text-xl font-bold">Loading party...</div>
            </div>
        );
    }

    // If no player ID, show join screen
    if (!playerId) {
        return <JoinScreen roomId={roomId} onJoin={handleJoin} />;
    }

    // Check if player uses ID but was kicked (deleted from DB)
    const currentPlayer = players.find(p => p.id === playerId);

    // Don't show "not in room" if we just joined - give realtime time to sync
    if (players.length > 0 && !currentPlayer && !justJoinedRef.current) {
        logger.warn(`Player ${playerId} not found in players list, may be kicked`, { context: 'player' });

        // Auto-cleanup session
        if (typeof window !== 'undefined') {
            localStorage.removeItem(`player_id_${roomId}`);
        }

        return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in p-4">
                <div className="bg-white sketchy-border p-8 max-w-md w-full text-center shadow-2xl transform scale-100">
                    <div className="text-6xl mb-4">👢</div>
                    <h2 className="text-3xl font-bold mb-2 font-display">You've been kicked!</h2>
                    <p className="text-gray-600 mb-8 text-xl">The host has removed you from the party.</p>

                    <button
                        onClick={() => {
                            setPlayerId(null);
                            window.location.href = '/';
                        }}
                        className="doodle-button w-full text-xl py-3 bg-red-500 text-black hover:bg-red-600 border-2 border-black font-bold uppercase tracking-wider shadow-[4px_4px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
                    >
                        Go Home 🏠
                    </button>
                </div>
            </div>
        );
    }

    // Show loading if we just joined but player not in list yet
    if (playerId && !currentPlayer && justJoinedRef.current) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <div className="animate-bounce text-4xl mb-4">🎉</div>
                <div className="text-2xl font-bold font-display">Joining Party...</div>
            </div>
        );
    }

    if (room.status === 'waiting') {
        return (
            <ErrorBoundary>
                <LobbyView room={room} players={players} currentPlayerId={playerId} />
            </ErrorBoundary>
        );
    }

    return (
        <ErrorBoundary>
            <GameView room={room} players={players} currentPlayerId={playerId} />
        </ErrorBoundary>
    );
}
