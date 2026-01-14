import { Player } from '@/app/types/game';
import { generateAvatarSvg, defaultAvatarConfig } from '@/app/components/AvatarSelector';

interface PlayerListProps {
    players: Player[];
    currentDrawerId?: string;
}

export default function PlayerList({ players, currentDrawerId }: PlayerListProps) {
    const maxScore = Math.max(...players.map(p => p.score));

    return (
        <div className="w-full md:w-52 flex-shrink-0 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto pr-2">
            {players.map(p => {
                const avatarConfig = (p.avatar?.style && p.avatar?.seed)
                    ? { style: p.avatar.style, seed: p.avatar.seed }
                    : defaultAvatarConfig();

                const isLeader = p.score > 0 && p.score === maxScore;
                const isDrawer = p.id === currentDrawerId;

                return (
                    <div key={p.id} className={`sketchy-border p-2 bg-white flex items-center gap-2 transition-all relative ${isDrawer ? 'border-blue-500 bg-blue-50 scale-105 shadow-md' : 'shadow-sm'}`}>
                        <div className="relative w-10 h-10 flex-shrink-0">
                            <div className={`w-full h-full rounded-full overflow-hidden border ${isLeader ? 'border-yellow-400 ring-1 ring-yellow-200' : 'border-black'} bg-white`}>
                                <img
                                    src={generateAvatarSvg(avatarConfig, 48)}
                                    alt={p.display_name}
                                    className="w-full h-full"
                                />
                            </div>
                            {p.is_host && (
                                <div className="absolute -top-2 -right-2 text-xs bg-yellow-300 border border-black px-1 rounded-full shadow-sm" title="Host">
                                    HOST
                                </div>
                            )}
                            {isLeader && (
                                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-lg filter drop-shadow-sm animate-bounce-slow" title="Leader">
                                    👑
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className={`font-bold text-sm truncate ${isDrawer ? 'text-blue-600' : 'text-black'}`}>
                                {p.display_name} {p.id === currentDrawerId ? '✏️' : ''}
                            </div>
                            <div className="text-xs text-gray-500 font-mono">
                                {p.score} pts
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
