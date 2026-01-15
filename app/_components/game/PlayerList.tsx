import React, { useMemo } from 'react';
import { Player } from '@/app/_types/game';
import { generateAvatarSvg, defaultAvatarConfig } from '@/app/_components/AvatarSelector';

interface PlayerListProps {
    players: Player[];
    currentDrawerId?: string;
}

interface PlayerItemProps {
    player: Player;
    isDrawer: boolean;
    isLeader: boolean;
}

/**
 * Individual player item - memoized for performance
 */
const PlayerItem = React.memo(function PlayerItem({
    player,
    isDrawer,
    isLeader
}: PlayerItemProps) {
    const avatarConfig = useMemo(() =>
        (player.avatar?.style && player.avatar?.seed)
            ? { style: player.avatar.style, seed: player.avatar.seed }
            : defaultAvatarConfig(),
        [player.avatar?.style, player.avatar?.seed]
    );

    const avatarSrc = useMemo(() =>
        generateAvatarSvg(avatarConfig, 48),
        [avatarConfig]
    );

    return (
        <div
            className={`sketchy-border p-2 bg-white flex items-center gap-2 transition-all relative ${isDrawer ? 'border-blue-500 bg-blue-50 scale-105 shadow-md' : 'shadow-sm'
                }`}
        >
            <div className="relative w-10 h-10 flex-shrink-0">
                <div className={`w-full h-full rounded-full overflow-hidden border ${isLeader ? 'border-yellow-400 ring-1 ring-yellow-200' : 'border-black'
                    } bg-white`}>
                    <img
                        src={avatarSrc}
                        alt={player.display_name}
                        className="w-full h-full"
                        loading="lazy"
                    />
                </div>
                {/* Online/Offline Indicator */}
                <div
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white shadow-sm ${player.is_connected ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                    title={player.is_connected ? 'Online' : 'Offline'}
                />
                {player.is_host && (
                    <div
                        className="absolute -top-2 -right-2 text-xs bg-yellow-300 border border-black px-1 rounded-full shadow-sm"
                        title="Host"
                    >
                        HOST
                    </div>
                )}
                {isLeader && (
                    <div
                        className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-lg filter drop-shadow-sm animate-bounce-slow"
                        title="Leader"
                    >
                        👑
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className={`font-bold text-sm truncate ${isDrawer ? 'text-blue-600' : 'text-black'}`}>
                    {player.display_name} {isDrawer ? '✏️' : ''}
                </div>
                <div className="text-xs text-gray-500 font-mono">
                    {player.score} pts
                </div>
            </div>
        </div>
    );
});

/**
 * PlayerList - Displays all players with scores
 * Memoized to prevent unnecessary re-renders
 */
function PlayerList({ players, currentDrawerId }: PlayerListProps) {
    const maxScore = useMemo(() =>
        Math.max(...players.map(p => p.score), 0),
        [players]
    );

    return (
        <div className="w-full md:w-52 flex-shrink-0 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto pr-2">
            {players.map(player => (
                <PlayerItem
                    key={player.id}
                    player={player}
                    isDrawer={player.id === currentDrawerId}
                    isLeader={player.score > 0 && player.score === maxScore}
                />
            ))}
        </div>
    );
}

export default React.memo(PlayerList);
