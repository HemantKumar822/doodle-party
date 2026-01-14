'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Room, Player, Guess, DEFAULT_SETTINGS, DiceBearAvatarConfig } from '@/app/types/game';
import { COLORS } from '@/app/design_system';
import { isFuzzyMatch, calculateGuessPoints, wordToUnderscores } from '@/app/lib/gameUtils';
import { useSoundManager } from '@/app/lib/soundManager';
import { getWordChoices, WordChoice, getDrawerBonus, getGuesserPoints, DIFFICULTY_CONFIG } from '@/app/lib/wordSelector';
import { WordDifficulty } from '@/app/data/words';
import Canvas from '@/app/components/game/Canvas';
import GameHeader from '@/app/components/game/GameHeader';
import WordSelector from '@/app/components/game/WordSelector';
import ChatPanel from '@/app/components/game/ChatPanel';
import ScoreboardOverlay from './ScoreboardOverlay';
import { generateAvatarSvg, defaultAvatarConfig } from '@/app/components/AvatarSelector';
import logger from '@/app/lib/logger';

interface GameViewProps {
    room: Room;
    players: Player[];
    currentPlayerId: string;
}



export default function GameView({ room, players, currentPlayerId }: GameViewProps) {
    const [timeLeft, setTimeLeft] = useState(0);
    const [messages, setMessages] = useState<any[]>([]);
    const [guess, setGuess] = useState('');
    const [showWordModal, setShowWordModal] = useState(false);
    const [showScoreboard, setShowScoreboard] = useState(false);
    const [hasGuessedCorrectly, setHasGuessedCorrectly] = useState(false);
    const [wordChoices, setWordChoices] = useState<WordChoice[]>([]);
    const [selectedDifficulty, setSelectedDifficulty] = useState<WordDifficulty>('easy');
    const [wordSelectionTime, setWordSelectionTime] = useState(10);
    const [wordSelectionDeadline, setWordSelectionDeadline] = useState<number | null>(null); // Fix #43: Drift-proof timer
    const [correctGuessers, setCorrectGuessers] = useState<Set<string>>(new Set());
    const [usedWords, setUsedWords] = useState<Set<string>>(new Set()); // Track used words to prevent repeats

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

    // Extracted "All Guessed" Check - can be called from polling OR after a correct guess
    const checkAndEndTurnIfAllGuessed = useCallback(async () => {
        // Only the HOST should trigger this game state change
        if (!isHost) {
            return;
        }
        // Only check during an active turn
        if (!room.turn_ends_at || !room.current_word || !room.word_selected_at) {
            return;
        }

        const end = new Date(room.turn_ends_at).getTime();
        if (Date.now() >= end) {
            return;
        }

        // 1. Identify guessers (everyone connected except drawer)
        const connectedPlayers = players.filter(p => p.is_connected);
        const currentDrawerObj = connectedPlayers.find(p => p.turn_order === room.current_drawer_index);
        const guesserIds = connectedPlayers
            .filter(p => p.id !== currentDrawerObj?.id)
            .map(p => p.id);

        if (guesserIds.length === 0) {
            return;
        }

        // 2. Fetch correct guesses for THIS turn
        const { data: guesses } = await supabase
            .from('guesses')
            .select('player_id')
            .eq('room_id', room.id)
            .eq('is_correct', true)
            .gt('guessed_at', room.word_selected_at);

        // 3. Check if all guessers are in the set
        const successfulGuesserIds = new Set(guesses?.map(g => g.player_id) || []);
        const allGuessed = guesserIds.every(id => successfulGuesserIds.has(id));

        if (allGuessed) {
            logger.info('Everyone guessed! Ending turn early.', { context: 'game' });
            await supabase.from('rooms').update({
                turn_ends_at: new Date().toISOString()
            }).eq('id', room.id);
        }
    }, [isHost, room.turn_ends_at, room.current_word, room.word_selected_at, room.current_drawer_index, room.id, players]);

    // Host Game Loop (Polling)
    useEffect(() => {
        if (!isHost || room.status !== 'playing') return;

        // Use Web Worker for accurate timing in background tabs
        const worker = new Worker('/worker.js');

        worker.onmessage = (e) => {
            if (e.data === 'tick') {
                checkAndEndTurnIfAllGuessed();
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
                .gt('guessed_at', room.word_selected_at);

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
            // Use new smart word selector (one from each difficulty)
            const choices = getWordChoices(usedWords, 3);
            setWordChoices(choices);
            setWordSelectionTime(10);
            setWordSelectionDeadline(Date.now() + 10000); // 10s from now
        } else {
            setShowWordModal(false);
        }
    }, [isDrawer, room.current_word, room.status, usedWords]);

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
                    // Auto-select first word (usually easiest)
                    if (wordChoices.length > 0) {
                        selectWord(wordChoices[0].word, wordChoices[0].difficulty);
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

    const selectWord = async (word: string, difficulty: WordDifficulty) => {
        playSound('pop'); // Play pop sound on word select
        setSelectedDifficulty(difficulty);

        // Track used words to prevent repeats
        setUsedWords(prev => new Set(prev).add(word));

        const drawTime = room.settings?.draw_time || DEFAULT_SETTINGS.draw_time;
        const turnEndsAt = new Date(Date.now() + drawTime * 1000).toISOString();
        await supabase.from('rooms').update({
            current_word: word,
            turn_ends_at: turnEndsAt,
            word_selected_at: new Date().toISOString()
        }).eq('id', room.id);
        setShowWordModal(false);

        logger.info(`Word selected: "${word}" (${difficulty}) - Drawer bonus: +${getDrawerBonus(difficulty)} pts`, { context: 'game' });
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
            playSound('correct');
            const { error } = await supabase.rpc('increment_player_score', {
                p_player_id: currentPlayerId,
                p_points: pointsToAward
            });
            if (error) logger.error('Score update error', { context: 'game', data: error });

            // INSTANT TURN END CHECK: Trigger immediately after a correct guess
            // Small delay to ensure the guess is persisted in Supabase before querying
            setTimeout(() => checkAndEndTurnIfAllGuessed(), 100);
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

    const [isChatOpen, setIsChatOpen] = useState(false);

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
        // Mobile: Fixed full screen. Desktop: Centered container.
        <div className="fixed inset-0 overflow-hidden flex flex-col bg-gray-50 md:static md:h-screen md:max-w-[1400px] md:mx-auto md:p-4">

            {/* Top Bar */}
            <GameHeader
                currentRound={room.current_round}
                maxRounds={room.max_rounds}
                currentWord={room.current_word}
                timeLeft={timeLeft}
                isDrawer={isDrawer}
                hasGuessedCorrectly={hasGuessedCorrectly}
                showScoreboard={showScoreboard}
                revealedLetters={revealedLetters}
                isMuted={isMuted}
                onToggleMute={() => {
                    toggleMute();
                    playSound('click');
                }}
            />

            <div className="flex flex-col md:flex-row gap-0 md:gap-4 flex-1 min-h-0 relative">

                {/* Players List - Mobile: Horizontal Strip, Desktop: Vertical Sidebar */}
                <div className="w-full shrink-0 h-16 border-b-2 border-black flex flex-row gap-2 overflow-x-auto items-center px-2 bg-white md:border-0 md:w-52 md:flex-col md:h-auto md:overflow-y-auto md:pr-2">
                    {players.map(p => {
                        const avatarConfig = (p.avatar?.style && p.avatar?.seed)
                            ? { style: p.avatar.style, seed: p.avatar.seed }
                            : defaultAvatarConfig();

                        const maxScore = Math.max(...players.map(pl => pl.score));
                        const isLeader = p.score > 0 && p.score === maxScore;

                        return (
                            <div key={p.id} className={`
                                flex-shrink-0 flex items-center gap-2 p-1 border-2 bg-white transition-all relative
                                ${safestDrawer && p.id === safestDrawer.id ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-black shadow-sm'}
                                rounded-md md:sketchy-border md:rounded-none md:p-2 md:w-full
                            `}>
                                <div className="relative w-8 h-8 md:w-10 md:h-10 flex-shrink-0">
                                    <div className={`w-full h-full rounded-full overflow-hidden border ${isLeader ? 'border-yellow-400 ring-1 ring-yellow-200' : 'border-black'} bg-white`}>
                                        <img
                                            src={generateAvatarSvg(avatarConfig, 48)}
                                            alt={p.display_name}
                                            className="w-full h-full"
                                        />
                                    </div>
                                    {isLeader && (
                                        <div className="absolute -top-2 -right-1 text-xs filter drop-shadow-sm animate-bounce-slow" title="Leader">
                                            👑
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 max-w-[80px] md:max-w-none md:flex-1">
                                    <div className="truncate text-xs md:text-sm font-bold leading-tight">{p.display_name}</div>
                                    <div className="text-[10px] md:text-xs text-gray-500 font-bold leading-tight">{p.score} pts</div>
                                </div>
                                {safestDrawer && p.id === safestDrawer.id && <span className="text-sm md:text-xl">✏️</span>}
                                {correctGuessers.has(p.id) && <span className="text-green-500 font-bold text-sm md:text-xl">✓</span>}
                            </div>
                        );
                    })}
                </div>

                {/* Main: Canvas */}
                <div className="flex-1 relative bg-gray-200 overflow-hidden flex items-center justify-center md:sketchy-border md:bg-gray-100">
                    <Canvas
                        roomId={room.id}
                        isDrawer={isDrawer}
                        width={800}
                        height={600}
                        wordSelectedAt={room.word_selected_at}
                        artistName={safestDrawer?.display_name}
                    />

                    {/* Chat Toggle FAB (Mobile Only) */}
                    {!isChatOpen && (
                        <button
                            onClick={() => setIsChatOpen(true)}
                            className="md:hidden absolute bottom-4 left-4 z-20 w-12 h-12 bg-white border-2 border-black rounded-full shadow-[2px_2px_0px_rgba(0,0,0,1)] flex items-center justify-center text-xl active:translate-y-1 active:shadow-none transition-all"
                        >
                            💬
                            {/* Unread badge logic could go here */}
                        </button>
                    )}

                    {/* Word Selection Modal */}
                    {showWordModal && (
                        <WordSelector
                            words={wordChoices}
                            timeLeft={wordSelectionTime}
                            onSelectWord={selectWord}
                        />
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

                {/* Chat - Mobile: Bottom Sheet, Desktop: Sidebar */}
                <ChatPanel
                    messages={messages}
                    isDrawer={isDrawer}
                    guess={guess}
                    onGuessChange={setGuess}
                    onSubmitGuess={sendGuess}
                    isOpen={isChatOpen}
                    onClose={() => setIsChatOpen(false)}
                />
            </div>
        </div>
    );
}

