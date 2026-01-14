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

    return (
        <div className="flex flex-col h-screen max-w-[1400px] mx-auto p-2 md:p-4">
            {/* Top Bar */}
            <div className="flex justify-between items-center mb-4 sketchy-border bg-white p-3 shadow-md">
                <div className="text-xl font-bold">Round {room.current_round} / {room.max_rounds}</div>
                <div className="text-3xl font-bold font-mono tracking-widest">
                    {room.current_word && !isDrawer && !hasGuessedCorrectly && !showScoreboard
                        ? room.current_word.split('').map((c, i) => {
                            if (c === ' ') return '  ';
                            if (revealedLetters.has(i)) return c + ' ';
                            return '_ ';
                        }).join('')
                        : (room.current_word || 'CHOOSING...')}
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            toggleMute();
                            playSound('click');
                        }}
                        className="text-2xl hover:scale-110 transition-transform"
                        title={isMuted ? 'Unmute' : 'Mute'}
                    >
                        {isMuted ? '🔇' : '🔊'}
                    </button>
                    <div className={`text-2xl font-bold ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-black'}`}>
                        ⏰ {timeLeft}s
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0">
                {/* Sidebar: Players */}
                <div className="w-full md:w-52 flex-shrink-0 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto pr-2">
                    {players.map(p => {
                        const avatarConfig = (p.avatar?.style && p.avatar?.seed)
                            ? { style: p.avatar.style, seed: p.avatar.seed }
                            : defaultAvatarConfig();

                        const maxScore = Math.max(...players.map(pl => pl.score));
                        const isLeader = p.score > 0 && p.score === maxScore;

                        return (
                            <div key={p.id} className={`sketchy-border p-2 bg-white flex items-center gap-2 transition-all relative ${safestDrawer && p.id === safestDrawer.id ? 'border-blue-500 bg-blue-50 scale-105 shadow-md' : 'shadow-sm'}`}>
                                <div className="relative w-10 h-10 flex-shrink-0">
                                    <div className={`w-full h-full rounded-full overflow-hidden border ${isLeader ? 'border-yellow-400 ring-1 ring-yellow-200' : 'border-black'} bg-white`}>
                                        <img
                                            src={generateAvatarSvg(avatarConfig, 48)}
                                            alt={p.display_name}
                                            className="w-full h-full"
                                        />
                                    </div>
                                    {isLeader && (
                                        <div className="absolute -top-2 -right-1 text-sm filter drop-shadow-sm animate-bounce-slow" title="Leader">
                                            👑
                                        </div>
                                    )}
                                    {p.is_host && (
                                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-black text-white text-[8px] font-bold px-1.5 py-px rounded-full uppercase tracking-wider">
                                            HOST
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="truncate text-sm font-bold leading-tight">{p.display_name}</div>
                                    <div className="text-xs text-gray-500 font-bold leading-tight">Score: {p.score}</div>
                                </div>
                                {safestDrawer && p.id === safestDrawer.id && <span className="text-xl">✏️</span>}
                                {correctGuessers.has(p.id) && <span className="text-green-500 font-bold text-xl">✓</span>}
                            </div>
                        );
                    })}
                </div>

                {/* Main: Canvas */}
                <div className="flex-1 relative min-h-[400px] sketchy-border bg-gray-100 overflow-hidden flex items-center justify-center">
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
                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10 transition-opacity">
                            <div className="sketchy-border bg-white p-8 text-center animate-wobble shadow-xl">
                                <h2 className="text-2xl mb-2 font-bold">It's your turn! Pick a word:</h2>
                                <div className={`text-4xl font-bold mb-4 ${wordSelectionTime <= 3 ? 'text-red-500 animate-pulse' : 'text-gray-600'}`}>
                                    {wordSelectionTime}s
                                </div>
                                <div className="flex flex-wrap justify-center gap-4">
                                    {wordChoices.map(w => (
                                        <button
                                            key={w}
                                            onClick={() => selectWord(w)}
                                            className="doodle-button text-lg bg-mint hover:bg-green-200 transform hover:scale-110 transition-transform"
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

                {/* Chat */}
                <div className="w-full md:w-80 flex-shrink-0 flex flex-col sketchy-border bg-white h-64 md:h-auto shadow-md">
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-paper" ref={chatRef}>
                        {messages.map((m, i) => (
                            <div key={i} className={`text-sm p-1 rounded ${m.is_correct ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-white border border-gray-100'}`}>
                                <span className="font-bold">{m.name}: </span>
                                {m.is_correct ? <span>🎉 Guessed correctly!</span> : m.guess_text}
                            </div>
                        ))}
                    </div>

                    {!isDrawer ? (
                        <form onSubmit={sendGuess} className="p-2 border-t-2 border-gray-200 bg-gray-50 flex gap-2">
                            <input
                                className="flex-1 border-2 border-black rounded px-2 py-1 font-inherit focus:ring-2 focus:ring-yellow-300 outline-none"
                                placeholder="Type your guess here..."
                                value={guess}
                                onChange={e => setGuess(e.target.value)}
                                maxLength={30}
                                autoFocus
                            />
                            <button type="submit" className="doodle-button py-1 px-4 text-sm">
                                Send
                            </button>
                        </form>
                    ) : (
                        <div className="p-2 border-t font-bold text-center text-gray-500 bg-gray-100">
                            Draw the word! NO CHEATING!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
