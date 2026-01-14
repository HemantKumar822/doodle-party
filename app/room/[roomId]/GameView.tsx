'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Room, Player, Guess, DEFAULT_SETTINGS, DiceBearAvatarConfig } from '@/app/types/game';
import { COLORS } from '@/app/design_system';
import { isFuzzyMatch, calculateGuessPoints, wordToUnderscores } from '@/app/lib/gameUtils';
import { useSoundManager } from '@/app/lib/soundManager';
import Canvas from '@/app/components/game/Canvas';
import ScoreboardOverlay from './ScoreboardOverlay';
import { generateAvatarSvg, defaultAvatarConfig } from '@/app/components/AvatarSelector';
import logger from '@/app/lib/logger';

interface GameViewProps {
    room: Room;
    players: Player[];
    currentPlayerId: string;
}

const WORDS = ['APPLE', 'ROBOT', 'VACUUM', 'MOUNTAIN', 'DOLPHIN', 'GALAXY', 'PIZZA', 'DRAGON', 'BEACH', 'UMBRELLA', 'CASTLE', 'RAINBOW', 'ELEPHANT', 'BICYCLE', 'CAMERA', 'SUNSHINE', 'PENGUIN', 'ROCKET'];

// FIX #11: Helper to pick N random words
function getRandomWords(arr: string[], n: number): string[] {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
}

import GameHeader from '@/app/components/game/GameHeader';
import PlayerList from '@/app/components/game/PlayerList';
import ChatBox from '@/app/components/game/ChatBox';

export default function GameView({ room, players, currentPlayerId }: GameViewProps) {
    const [timeLeft, setTimeLeft] = useState(0);
    const [messages, setMessages] = useState<any[]>([]);
    const [guess, setGuess] = useState('');
    const [showWordModal, setShowWordModal] = useState(false);
    const [showScoreboard, setShowScoreboard] = useState(false);
    const [hasGuessedCorrectly, setHasGuessedCorrectly] = useState(false);
    const [wordChoices, setWordChoices] = useState<string[]>([]);
    const [wordSelectionTime, setWordSelectionTime] = useState(10);
    const [wordSelectionDeadline, setWordSelectionDeadline] = useState<number | null>(null); // Fix #43: Drift-proof timer
    const [correctGuessers, setCorrectGuessers] = useState<Set<string>>(new Set());

    // Word Hints - revealed letter positions
    const [revealedLetters, setRevealedLetters] = useState<Set<number>>(new Set());

    // Sound effects
    const { isMuted, toggleMute, play: playSound } = useSoundManager();

    const currentPlayer = players.find(p => p.id === currentPlayerId);
    const currentDrawer = players.find(p => p.turn_order === room.current_drawer_index);
    // FIX: Do not fallback to players[0] purely based on index if not found.
    // If turn_order matches, great. If not, wait or show empty state.
    // Default to first player ONLY if we definitely have players and room index is 0,
    // but better to be strict to avoid bugs.
    const safestDrawer = currentDrawer || (players.length > 0 && room.current_drawer_index === 0 ? players[0] : null);

    const isDrawer = currentPlayer?.id === safestDrawer?.id;
    const isHost = currentPlayer?.is_host;

    // Timer Logic with sound effects
    useEffect(() => {
        if (!room.turn_ends_at) {
            setTimeLeft(0);
            return;
        }
        const end = new Date(room.turn_ends_at).getTime();
        const drawTime = room.settings?.draw_time || 80;

        const interval = setInterval(() => {
            const now = Date.now();
            const left = Math.max(0, Math.ceil((end - now) / 1000));
            setTimeLeft(left);

            // Sound effects for timer
            if (left > 0 && left <= 5) {
                playSound('tickFast');
            } else if (left > 5 && left <= 10 && left % 2 === 0) {
                playSound('tick');
            }

            // REMOVED: Automatic hints (User requested removal)
        }, 1000);
        return () => clearInterval(interval);
    }, [room.turn_ends_at, playSound, room.settings?.draw_time]);

    // Turn End Detection (Client Side UI) with sound
    useEffect(() => {
        if (room.turn_ends_at) {
            const end = new Date(room.turn_ends_at).getTime();
            const now = Date.now();
            if (now > end || (room.current_word && timeLeft === 0 && end < now)) {
                setShowScoreboard(true);
                playSound('turnEnd');
            } else {
                setShowScoreboard(false);
            }
        } else {
            setShowScoreboard(false);
        }
    }, [timeLeft, room.turn_ends_at, room.current_word, playSound]);

    // Host Game Loop
    useEffect(() => {
        if (!isHost || room.status !== 'playing') return;

        const checkTurn = async () => {
            // All Guessed Check (only runs during active turn)
            if (room.turn_ends_at && room.current_word && room.word_selected_at) {
                const end = new Date(room.turn_ends_at).getTime();
                // Only check if turn hasn't ended yet
                if (Date.now() < end) {

                    // FIX #45: Robust "Everyone Guessed" Logic
                    // 1. Identify who SHOULD guess (Everyone connected except drawer)
                    const connectedPlayers = players.filter(p => p.is_connected);
                    const currentDrawerObj = connectedPlayers.find(p => p.turn_order === room.current_drawer_index);

                    // If NO drawer is found (e.g. disconnected), we still wait for updated player list or just handle normally.
                    // If drawer is missing, everyone else is a guesser.
                    const guesserIds = connectedPlayers
                        .filter(p => p.id !== currentDrawerObj?.id)
                        .map(p => p.id);

                    if (guesserIds.length === 0) return; // No guessers? Wait.

                    // 2. Fetch all correct guesses for this specific turn
                    // ROBUST LOGIC: Use a "Hybrid Check" (Time Buffer + Content Match)
                    // We backdate the time check by 30s to handle extreme clock skew,
                    // but we strictly filter by the 'guess_text' matching the 'current_word'.
                    // This ensures we find the valid guesses even if the server is laggy, 
                    // without picking up guesses from previous rounds (unless the word repeats instantly, which is rare).

                    const timeBuffer = 30 * 1000; // 30 seconds buffer
                    const generousThreshold = new Date(new Date(room.word_selected_at).getTime() - timeBuffer).toISOString();

                    const { data: guesses } = await supabase
                        .from('guesses')
                        .select('player_id')
                        .eq('room_id', room.id)
                        .eq('is_correct', true)
                        .ilike('guess_text', room.current_word) // Ensure it matches CURRENT word
                        .gt('created_at', generousThreshold);   // Generous window

                    // 3. Verify if EVERY guesser ID is present in the database response
                    const successfulGuesserIds = new Set(guesses?.map(g => g.player_id) || []);
                    const allGuessed = guesserIds.every(id => successfulGuesserIds.has(id));

                    if (allGuessed) {
                        // End turn early
                        logger.info('Everyone guessed (Robust Check)! Ending turn early.', { context: 'game' });
                        await supabase.from('rooms').update({
                            turn_ends_at: new Date().toISOString()
                        }).eq('id', room.id);
                    }
                }
            }
        };

        // Use Web Worker for accurate timing in background tabs
        const worker = new Worker('/worker.js');

        worker.onmessage = (e) => {
            if (e.data === 'tick') {
                checkTurn();
            }
        };

        worker.postMessage('start');

        return () => {
            worker.postMessage('stop');
            worker.terminate();
        };
    }, [isHost, room.status, room.turn_ends_at, room.current_drawer_index, room.current_round, players, room.id, room.current_word, room.word_selected_at]);

    const nextTurn = async () => {
        // FIX #10: Award drawer points (50 per correct guesser)
        if (safestDrawer && room.word_selected_at) {
            const { count } = await supabase
                .from('guesses')
                .select('*', { count: 'exact', head: true })
                .eq('room_id', room.id)
                .eq('is_correct', true)
                .gt('created_at', room.word_selected_at);

            if (count && count > 0) {
                const drawerPoints = count * 50;
                await supabase.rpc('increment_player_score', {
                    p_player_id: safestDrawer.id,
                    p_points: drawerPoints
                });
            }
        }

        // FIX: Blind increment fails if players leave (gaps in turn_order).
        // Algorithm: Find next available player with turn_order > current.
        const sortedPlayers = [...players].sort((a, b) => (a.turn_order ?? 0) - (b.turn_order ?? 0));

        // Find next player in line
        let nextPlayer = sortedPlayers.find(p => (p.turn_order ?? 0) > room.current_drawer_index);
        let nextRound = room.current_round;
        let nextStatus = 'playing';

        // Wrap around if no higher turn_order found
        if (!nextPlayer) {
            nextPlayer = sortedPlayers[0];
            nextRound++;

            // Limit checks
            if (nextRound > room.max_rounds) {
                nextStatus = 'finished';
            }
        }

        const nextDrawerIdx = nextPlayer ? (nextPlayer.turn_order ?? 0) : 0;

        // Safety: If no players at all?
        if (sortedPlayers.length === 0) return;

        await supabase.from('rooms').update({
            current_drawer_index: nextDrawerIdx,
            current_round: nextRound,
            status: nextStatus as any,
            current_word: null,
            turn_ends_at: null,
            updated_at: new Date().toISOString()
        }).eq('id', room.id);

        // Canvas clear is now handled via wordSelectedAt prop change
        await supabase.channel(`room_draw:${room.id}`).send({
            type: 'broadcast',
            event: 'stroke',
            payload: { tool: 'clear' }
        });
    };

    // Word Selection 
    useEffect(() => {
        if (isDrawer && !room.current_word && room.status === 'playing') {
            setShowWordModal(true);
            const wordCount = room.settings?.word_count || DEFAULT_SETTINGS.word_count;
            setWordChoices(getRandomWords(WORDS, wordCount));
            setWordSelectionTime(10);
            setWordSelectionDeadline(Date.now() + 10000); // 10s from now
        } else {
            setShowWordModal(false);
        }
    }, [isDrawer, room.current_word, room.status]);

    // Play "your turn" sound when it's drawer's turn
    useEffect(() => {
        if (showWordModal) {
            playSound('yourTurn');
        }
    }, [showWordModal, playSound]);

    // Word selection countdown timer
    useEffect(() => {
        if (!showWordModal) return;

        const timer = setInterval(() => {
            if (wordSelectionDeadline) {
                const left = Math.ceil((wordSelectionDeadline - Date.now()) / 1000);
                setWordSelectionTime(Math.max(0, left));

                if (left <= 0) {
                    // Auto-select first word
                    if (wordChoices.length > 0) {
                        selectWord(wordChoices[0]);
                    }
                }
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [showWordModal, wordChoices]);

    // Check if already guessed this round logic (Persistence)
    useEffect(() => {
        const checkExistingGuess = async () => {
            if (room.current_word && room.word_selected_at && currentPlayerId && !isDrawer && !hasGuessedCorrectly) {
                const { data } = await supabase
                    .from('guesses')
                    .select('id')
                    .eq('room_id', room.id)
                    .eq('player_id', currentPlayerId)
                    .eq('is_correct', true)
                    .gt('created_at', room.word_selected_at)
                    .maybeSingle();

                if (data) {
                    setHasGuessedCorrectly(true);
                    setCorrectGuessers(prev => new Set(prev).add(currentPlayerId));
                }
            }
        };
        checkExistingGuess();
    }, [room.current_word, room.word_selected_at, currentPlayerId, isDrawer]);

    // Clear state when a new turn starts
    const lastTurnWordSelectedAt = useRef<string | null>(null);
    useEffect(() => {
        if (room.word_selected_at && room.word_selected_at !== lastTurnWordSelectedAt.current) {
            setMessages([]);
            setHasGuessedCorrectly(false);
            setCorrectGuessers(new Set());
            setRevealedLetters(new Set()); // Reset hints for new turn
        }
        lastTurnWordSelectedAt.current = room.word_selected_at || null;
    }, [room.word_selected_at]);

    const selectWord = async (word: string) => {
        playSound('pop'); // Play pop sound on word select
        const drawTime = room.settings?.draw_time || DEFAULT_SETTINGS.draw_time;
        const turnEndsAt = new Date(Date.now() + drawTime * 1000).toISOString();
        await supabase.from('rooms').update({
            current_word: word,
            turn_ends_at: turnEndsAt,
            word_selected_at: new Date().toISOString()
        }).eq('id', room.id);
        setShowWordModal(false);
    };

    const sendGuess = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!guess.trim() || hasGuessedCorrectly) return;

        // Use fuzzy matching
        const isCorrect = room.current_word ? isFuzzyMatch(guess, room.current_word) : false;

        // Calculate points based on time elapsed
        let pointsToAward = 0;
        if (isCorrect && room.word_selected_at) {
            const wordSelectedTime = new Date(room.word_selected_at).getTime();
            const secondsElapsed = Math.floor((Date.now() - wordSelectedTime) / 1000);

            // Get guess rank (count existing correct guesses for this turn)
            const { count } = await supabase
                .from('guesses')
                .select('*', { count: 'exact', head: true })
                .eq('room_id', room.id)
                .eq('is_correct', true)
                .gt('created_at', room.word_selected_at);

            const guessRank = (count || 0) + 1;
            pointsToAward = calculateGuessPoints(secondsElapsed, guessRank);
        }

        await supabase.from('guesses').insert({
            room_id: room.id,
            player_id: currentPlayerId,
            guess_text: guess,
            is_correct: isCorrect,
            points_awarded: pointsToAward
        });

        if (isCorrect) {
            setHasGuessedCorrectly(true);
            setCorrectGuessers(prev => new Set(prev).add(currentPlayerId));
            playSound('correct'); // Play correct sound!
            const { error } = await supabase.rpc('increment_player_score', {
                p_player_id: currentPlayerId,
                p_points: pointsToAward
            });
            if (error) console.error('Score update error:', error);
        } else {
            playSound('wrong'); // Play wrong sound
        }

        setGuess('');
    };

    // Chat subscription
    useEffect(() => {
        const channel = supabase.channel(`room_chat:${room.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'guesses', filter: `room_id=eq.${room.id}` },
                (payload) => {
                    const newType = payload.new as Guess;
                    const player = players.find(p => p.id === newType.player_id);
                    setMessages(prev => [...prev.slice(-19), { ...newType, name: player?.display_name }]);
                })
            .subscribe();

        // Load recent messages? (For MVP skip)
        return () => { supabase.removeChannel(channel); };
    }, [room.id, players]);

    // Helper for scroll
    const chatRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [messages]);

    if (room.status === 'finished') {
        // Game Over Screen
        const winner = [...players].sort((a, b) => b.score - a.score)[0];
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <div className="sketchy-border bg-white p-10 text-center animate-wobble">
                    <h1 className="text-6xl mb-4">🎉 GAME OVER! 🎉</h1>
                    <div className="text-4xl mb-4">Winner: {winner?.display_name || 'Nobody?'}</div>
                    <div className="text-2xl mb-8">Score: {winner?.score}</div>
                    <a href="/" className="doodle-button text-xl">New Game</a>
                </div>
            </div>
        )
    }

    // Next up calculator
    const nextDrawer = players.find(p => p.turn_order === (room.current_drawer_index + 1) % players.length);

    // Mobile Tab State
    const [activeTab, setActiveTab] = useState<'canvas' | 'chat' | 'players'>('canvas');

    return (
        <div className="flex flex-col h-[100dvh] max-w-[1400px] mx-auto p-0 md:p-4 overflow-hidden">
            {/* Header */}
            <GameHeader
                room={room}
                isDrawer={isDrawer}
                hasGuessedCorrectly={hasGuessedCorrectly}
                showScoreboard={showScoreboard}
                revealedLetters={revealedLetters}
                timeLeft={timeLeft}
                isMuted={isMuted}
                toggleMute={toggleMute}
                playSound={playSound}
            />

            <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0 relative">

                {/* Desktop: Sidebar Players */}
                <div className="hidden md:flex flex-col w-52 flex-shrink-0 gap-2 overflow-y-auto">
                    <PlayerList players={players} safestDrawer={safestDrawer} correctGuessers={correctGuessers} />
                </div>

                {/* Main Content Area (Canvas is always rendered to keep state) */}
                <div className={`flex-1 relative sketchy-border bg-gray-100 overflow-hidden flex items-center justify-center ${activeTab !== 'canvas' ? 'hidden md:flex' : 'flex'}`}>
                    <Canvas
                        roomId={room.id}
                        isDrawer={isDrawer}
                        width={800}
                        height={600}
                        wordSelectedAt={room.word_selected_at}
                        artistName={safestDrawer?.display_name}
                    />

                    {/* Word Selection Modal */}
                    {showWordModal && (
                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10 p-4">
                            <div className="sketchy-border bg-white p-6 md:p-8 text-center animate-wobble shadow-xl max-w-lg w-full">
                                <h2 className="text-xl md:text-2xl mb-2 font-bold">It's your turn! Pick a word:</h2>
                                <div className={`text-4xl font-bold mb-4 ${wordSelectionTime <= 3 ? 'text-red-500 animate-pulse' : 'text-gray-600'}`}>
                                    {wordSelectionTime}s
                                </div>
                                <div className="flex flex-wrap justify-center gap-3">
                                    {wordChoices.map(w => (
                                        <button
                                            key={w}
                                            onClick={() => selectWord(w)}
                                            className="doodle-button text-base md:text-lg bg-mint hover:bg-green-200 transform hover:scale-110 transition-transform"
                                        >
                                            {w}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Scoreboard Overlay */}
                    {showScoreboard && (
                        <ScoreboardOverlay
                            players={players}
                            word={room.current_word || "???"}
                            nextDrawerName={nextDrawer?.display_name || "Next Player"}
                            timeLeft={15}
                            isHost={isHost || false}
                            isGameOver={false}
                            onContinue={async () => {
                                if (isHost) {
                                    await nextTurn();
                                }
                            }}
                        />
                    )}
                </div>

                {/* Mobile: Players Tab View */}
                <div className={`flex-1 md:hidden ${activeTab === 'players' ? 'flex' : 'hidden'} overflow-y-auto p-2`}>
                    <PlayerList players={players} safestDrawer={safestDrawer} correctGuessers={correctGuessers} />
                </div>

                {/* Desktop: Chat Sidebar / Mobile: Chat Tab View */}
                <div className={`w-full md:w-80 flex-shrink-0 flex flex-col ${activeTab === 'chat' ? 'flex h-full' : 'hidden md:flex h-full'}`}>
                    <ChatBox
                        room={room}
                        messages={messages}
                        isDrawer={isDrawer}
                        hasGuessedCorrectly={hasGuessedCorrectly}
                        guess={guess}
                        setGuess={setGuess}
                        sendGuess={sendGuess}
                    />
                </div>
            </div>

            {/* Mobile Bottom Tab Bar */}
            <div className="md:hidden flex justify-around items-center bg-white border-t-2 border-black p-2 pb-safe">
                <button
                    onClick={() => setActiveTab('players')}
                    className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'players' ? 'bg-yellow-100' : ''}`}
                >
                    <span className="text-xl">👥</span>
                    <span className="text-xs font-bold">Players</span>
                </button>
                <button
                    onClick={() => setActiveTab('canvas')}
                    className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'canvas' ? 'bg-yellow-100' : ''}`}
                >
                    <span className="text-xl">🎨</span>
                    <span className="text-xs font-bold">Canvas</span>
                </button>
                <button
                    onClick={() => setActiveTab('chat')}
                    className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'chat' ? 'bg-yellow-100' : ''}`}
                >
                    <span className="text-xl">💬</span>
                    <span className="text-xs font-bold">Chat</span>
                    {/* Unread badge logic could go here */}
                </button>
            </div>
        </div>
    );
}
