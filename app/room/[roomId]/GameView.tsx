'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Room, Player, Guess, DEFAULT_SETTINGS, DiceBearAvatarConfig } from '@/app/_types/game';
import { COLORS } from '@/app/design_system';
import { isFuzzyMatch, calculateGuessPoints, wordToUnderscores } from '@/app/_lib/gameUtils';
import { useSoundManager } from '@/app/_contexts/AudioContext';
import { getWordChoices, WordChoice, getDrawerBonus, getGuesserPoints, DIFFICULTY_CONFIG } from '@/app/_lib/wordSelector';
import { WordDifficulty } from '@/app/_data/words';
import Canvas from '@/app/_components/game/Canvas';
import GameHeader from '@/app/_components/game/GameHeader';
import WordSelector from '@/app/_components/game/WordSelector';
import ChatPanel from '@/app/_components/game/ChatPanel';
import FloatingGuessStream from '@/app/_components/game/FloatingGuessStream';
import ScoreboardOverlay from './ScoreboardOverlay';
import GlobalControls from '@/app/_components/GlobalControls';
import { generateAvatarSvg, defaultAvatarConfig } from '@/app/_components/AvatarSelector';
import logger from '@/app/_lib/logger';
import {
    GAME_MODE_CONFIG,
    getEffectiveDrawTime,
    getRelaySegmentTime,
    applyModePointsMultiplier,
    getWordSelectionTime,
    shouldShowHints,
    isRelayMode,
    getRelayDrawerIndex,
    getRelayDrawerId,
    getRelayProgressText,
} from '@/app/_lib/gameModes';

interface GameViewProps {
    room: Room;
    players: Player[];
    currentPlayerId: string;
}


// Message type extends Guess with display name
interface ChatMessage extends Guess {
    name?: string;
}

export default function GameView({ room, players, currentPlayerId }: GameViewProps) {
    const router = useRouter();
    const [timeLeft, setTimeLeft] = useState(0);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
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

    // Relay mode tracking
    const [relaySegment, setRelaySegment] = useState(0);

    // Sound effects
    const { isMuted, toggleMute, play: playSound } = useSoundManager();

    const currentPlayer = players.find(p => p.id === currentPlayerId);
    const baseDrawer = players.find(p => p.turn_order === room.current_drawer_index);
    // FIX: Do not fallback to players[0] purely based on index if not found.
    const safestBaseDrawer = baseDrawer || (players.length > 0 && room.current_drawer_index === 0 ? players[0] : null);

    // Relay mode: Rotate drawer based on current relay segment
    const gameMode = room.settings?.game_mode || 'classic';
    const currentRelaySegment = isRelayMode(gameMode)
        ? getRelayDrawerIndex(room.settings, room.word_selected_at, room.turn_ends_at)
        : 0;

    // Get the actual drawer (considering relay rotation)
    const relayDrawerId = isRelayMode(gameMode) && safestBaseDrawer
        ? getRelayDrawerId(players, room.current_drawer_index, currentRelaySegment)
        : safestBaseDrawer?.id;
    const safestDrawer = players.find(p => p.id === relayDrawerId) || safestBaseDrawer;

    const isDrawer = currentPlayer?.id === safestDrawer?.id;
    const isHost = currentPlayer?.is_host;

    // Track relay segment changes
    useEffect(() => {
        if (isRelayMode(gameMode) && currentRelaySegment !== relaySegment) {
            setRelaySegment(currentRelaySegment);
            // Play sound when drawer changes in relay mode
            playSound('yourTurn');
        }
    }, [currentRelaySegment, relaySegment, gameMode, playSound]);

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

    // Track if drawer points were awarded this turn (to prevent duplicates)
    const drawerPointsAwardedRef = useRef<string | null>(null);

    // Turn End Detection (Client Side UI) with sound + Award drawer points
    useEffect(() => {
        if (room.turn_ends_at) {
            const end = new Date(room.turn_ends_at).getTime();
            const now = Date.now();
            if (now > end || (room.current_word && timeLeft === 0 && end < now)) {
                setShowScoreboard(true);
                playSound('turnEnd');

                // Award drawer points immediately when turn ends (only once per turn)
                const turnKey = `${room.id}-${room.word_selected_at}`;
                if (isHost && safestDrawer && room.word_selected_at && drawerPointsAwardedRef.current !== turnKey) {
                    drawerPointsAwardedRef.current = turnKey;
                    // Award drawer points async
                    (async () => {
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
                    })();
                }
            } else {
                setShowScoreboard(false);
            }
        } else {
            setShowScoreboard(false);
        }
    }, [timeLeft, room.turn_ends_at, room.current_word, playSound, isHost, safestDrawer, room.id, room.word_selected_at]);

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
        // NOTE: Drawer points are now awarded at turn end (before scorecard shows)
        // See drawerPointsAwardedRef effect above

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
            // FIX: Prevent regeneration if we already have choices (prevents glitch when usedWords updates on select)
            if (wordChoices.length === 0) {
                const choices = getWordChoices(usedWords, 3);
                setWordChoices(choices);
                // Use mode-specific word selection time (5s for speed, 10s for others)
                const selectionTime = getWordSelectionTime(gameMode);
                setWordSelectionTime(selectionTime);
                setWordSelectionDeadline(Date.now() + selectionTime * 1000);
            }
        } else {
            setShowWordModal(false);
            // Clear choices when selection is done so next turn gets new ones
            if (wordChoices.length > 0) {
                setWordChoices([]);
            }
        }
    }, [isDrawer, room.current_word, room.status, usedWords, wordChoices.length]);

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

        // Use mode-specific draw time (50% for speed mode)
        const effectiveDrawTime = getEffectiveDrawTime(room.settings);
        const turnEndsAt = new Date(Date.now() + effectiveDrawTime * 1000).toISOString();
        await supabase.from('rooms').update({
            current_word: word,
            turn_ends_at: turnEndsAt,
            word_selected_at: new Date().toISOString()
        }).eq('id', room.id);
        setShowWordModal(false);

        logger.info(`[${GAME_MODE_CONFIG[gameMode].emoji} ${GAME_MODE_CONFIG[gameMode].name}] Word: "${word}" (${difficulty}) - Draw time: ${effectiveDrawTime}s`, { context: 'game' });
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
            const basePoints = calculateGuessPoints(secondsElapsed, guessRank);
            // Apply mode-specific points multiplier (1.5x for Speed mode)
            pointsToAward = applyModePointsMultiplier(basePoints, gameMode);
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

        const resetGame = async () => {
            if (!isHost) return;

            // Reset room state to 'waiting' (Lobby)
            await supabase.from('rooms').update({
                status: 'waiting',
                current_round: 1,
                current_drawer_index: 0,
                current_word: null,
                turn_ends_at: null,
                word_selected_at: null
            }).eq('id', room.id);

            // Reset all player scores
            await supabase.from('players').update({
                score: 0
            }).eq('room_id', room.id);
        };
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-paper pattern-grid-lg">
                <div className="w-full max-w-md bg-white border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] p-6 md:p-10 text-center animate-in fade-in zoom-in duration-300 rounded-xl relative">
                    {/* Confetti/Decoration */}
                    <div className="absolute -top-6 -left-6 text-4xl animate-bounce-slow" style={{ animationDelay: '0s' }}>🎈</div>
                    <div className="absolute -top-6 -right-6 text-4xl animate-bounce-slow" style={{ animationDelay: '0.5s' }}>🎈</div>

                    <h1 className="text-3xl md:text-5xl font-black mb-6 uppercase tracking-wider transform -rotate-1">
                        Game Over!
                    </h1>

                    {/* Winner Display */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="relative mb-4">
                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-black overflow-hidden bg-white shadow-md">
                                {winner && (
                                    <img
                                        src={generateAvatarSvg(winner.avatar?.style && winner.avatar?.seed ? { style: winner.avatar.style, seed: winner.avatar.seed } : defaultAvatarConfig())}
                                        alt={winner.display_name}
                                        className="w-full h-full object-cover"
                                    />
                                )}
                            </div>
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-5xl md:text-6xl filter drop-shadow-md animate-bounce">
                                👑
                            </div>
                        </div>

                        <div className="text-xl md:text-2xl font-bold mb-1">Winner</div>
                        <div className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">
                            {winner?.display_name || 'Nobody?'}
                        </div>
                        <div className="text-lg md:text-xl font-bold bg-black text-white px-4 py-1 rounded-full transform rotate-1">
                            {winner?.score} points
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        {isHost ? (
                            <button
                                onClick={resetGame}
                                className="w-full bg-green-400 hover:bg-green-500 text-black border-2 border-black font-bold text-lg py-3 px-6 rounded-lg shadow-[4px_4px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all uppercase tracking-wide"
                            >
                                Play Again 🔄
                            </button>
                        ) : (
                            <div className="text-gray-500 font-bold mb-2 animate-pulse">
                                Waiting for host to restart...
                            </div>
                        )}

                        <a
                            href="/"
                            className="block w-full bg-yellow-300 hover:bg-yellow-400 text-black border-2 border-black font-bold text-lg py-3 px-6 rounded-lg shadow-[4px_4px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all uppercase tracking-wide"
                        >
                            New Game 🏠
                        </a>
                    </div>
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
                gameMode={gameMode}
                relaySegment={currentRelaySegment}
            >
                <GlobalControls
                    onLeaveRoom={async () => {
                        await supabase.from('players').delete().eq('id', currentPlayerId);
                        localStorage.removeItem(`player_id_${room.id}`);
                        router.push('/');
                    }}
                    isHost={isHost}
                    className="!gap-0" // Tighter gap for header integration
                />
            </GameHeader>



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
                                flex-shrink-0 flex items-center gap-2 p-1 border-2 transition-all relative
                                ${safestDrawer && p.id === safestDrawer.id ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-black bg-white shadow-sm'}
                                ${!p.is_connected ? 'opacity-50 grayscale' : ''}
                                rounded-md md:sketchy-border md:rounded-none md:p-2 md:w-full
                            `}>
                                <div className="relative w-8 h-8 md:w-10 md:h-10 shrink-0">
                                    <div className="w-full h-full rounded-full overflow-hidden border border-black bg-gray-100">
                                        <img src={generateAvatarSvg(avatarConfig, 40)} alt={p.display_name} className="w-full h-full" />
                                    </div>
                                    {/* Connectivity Indicator */}
                                    {!p.is_connected && (
                                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-gray-500 rounded-full border border-white" title="Offline" />
                                    )}
                                    {p.is_connected && (
                                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white" title="Online" />
                                    )}
                                    {isLeader && (
                                        <div className="absolute -top-2 -left-1 text-xs md:text-sm animate-bounce">👑</div>
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
                {/* Main: Canvas */}
                {/* Main: Canvas */}
                <div className="flex-1 relative bg-paper overflow-hidden flex flex-col items-center justify-start pt-2 px-0 md:justify-center md:pt-0 md:px-0 md:sketchy-border md:bg-gray-100">
                    <div className="w-full flex justify-center pt-2 px-4 md:pt-0 md:px-0"> {/* Wrapper to force top alignment */}
                        <Canvas
                            roomId={room.id}
                            isDrawer={isDrawer}
                            width={800}
                            height={800}
                            wordSelectedAt={room.word_selected_at}
                            artistName={safestDrawer?.display_name}
                            correctGuessCount={correctGuessers.size}
                            totalGuessersCount={players.length - 1}
                        />
                    </div>

                    {/* Mobile: Floating Guess Stream (Fills empty space) */}
                    {/* Mobile: Floating Guess Stream (Fills empty space) */}
                    <div className="flex-1 w-full relative min-h-0 md:hidden pointer-events-none z-10">
                        <FloatingGuessStream
                            messages={messages}
                            currentUserDisplayName={currentPlayer?.display_name}
                            className="absolute inset-0 pb-14"
                        />
                    </div>

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

                {/* Chat - Mobile: Peek Bottom Sheet, Desktop: Sidebar */}
                <ChatPanel
                    messages={messages}
                    isDrawer={isDrawer}
                    guess={guess}
                    onGuessChange={setGuess}
                    onSubmitGuess={sendGuess}
                    isOpen={isChatOpen}
                    onToggle={() => setIsChatOpen(!isChatOpen)}
                />
            </div>
        </div>
    );
}

