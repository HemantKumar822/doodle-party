import { Player } from '@/app/types/game';
import { generateAvatarSvg, defaultAvatarConfig } from '@/app/components/AvatarSelector';

interface PlayerListProps {
    players: Player[];
    safestDrawer: Player | null | undefined; // Allow undefined for safety
    correctGuessers: Set<string>;
}

export default function PlayerList({ players, safestDrawer, correctGuessers }: PlayerListProps) {
    const maxScore = Math.max(...players.map(pl => pl.score));

    return (
        <div className="w-full md:w-52 flex-shrink-0 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto pr-2 min-h-[80px] md:min-h-0">
            {players.map(p => {
                const avatarConfig = (p.avatar?.style && p.avatar?.seed)
                    ? { style: p.avatar.style, seed: p.avatar.seed }
                    : defaultAvatarConfig();

                const isLeader = p.score > 0 && p.score === maxScore;

                return (
                    <div key={p.id} className={`sketchy-border p-2 bg-white flex items-center gap-2 transition-all relative ${safestDrawer && p.id === safestDrawer.id ? 'border-blue-500 bg-blue-50 scale-105 shadow-md' : 'shadow-sm'} min-w-[150px] md:min-w-0`}>
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
    );
}
