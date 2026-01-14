import { Room, Player } from '@/app/types/game';

interface GameHeaderProps {
    room: Room;
    isDrawer: boolean;
    hasGuessedCorrectly: boolean;
    showScoreboard: boolean;
    revealedLetters: Set<number>;
    timeLeft: number;
    isMuted: boolean;
    toggleMute: () => void;
    playSound: (sound: any) => void;
}

export default function GameHeader({
    room,
    isDrawer,
    hasGuessedCorrectly,
    showScoreboard,
    revealedLetters,
    timeLeft,
    isMuted,
    toggleMute,
    playSound
}: GameHeaderProps) {
    return (
        <div className="flex justify-between items-center mb-0 md:mb-4 sketchy-border bg-white p-2 md:p-3 shadow-md flex-shrink-0">
            <div className="text-sm md:text-xl font-bold">Round {room.current_round} / {room.max_rounds}</div>
            <div className="text-xl md:text-3xl font-bold font-mono tracking-widest truncate max-w-[50%]">
                {room.current_word && !isDrawer && !hasGuessedCorrectly && !showScoreboard
                    ? room.current_word.split('').map((c, i) => {
                        if (c === ' ') return '  ';
                        if (revealedLetters.has(i)) return c + ' ';
                        return '_ ';
                    }).join('')
                    : (room.current_word || 'CHOOSING...')}
            </div>
            <div className="flex items-center gap-2 md:gap-3">
                <button
                    onClick={() => {
                        toggleMute();
                        playSound('click');
                    }}
                    className="text-lg md:text-2xl hover:scale-110 transition-transform"
                    title={isMuted ? 'Unmute' : 'Mute'}
                >
                    {isMuted ? '🔇' : '🔊'}
                </button>
                <div className={`text-lg md:text-2xl font-bold ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-black'}`}>
                    ⏰ {timeLeft}s
                </div>
            </div>
        </div>
    );
}
