import { Player } from "@/app/types/game";
import { COLORS } from "@/app/design_system";

interface ScoreboardOverlayProps {
    players: Player[];
    word: string;
    nextDrawerName: string;
    timeLeft: number;
    isHost: boolean;
    isGameOver: boolean;
    onContinue?: () => void;
}

export default function ScoreboardOverlay({
    players,
    word,
    nextDrawerName,
    timeLeft,
    isHost,
    isGameOver,
    onContinue
}: ScoreboardOverlayProps) {
    // Sort by score
    const sorted = [...players].sort((a, b) => b.score - a.score);

    return (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="sketchy-border bg-white p-6 md:p-8 mx-4 max-w-lg w-full text-center relative max-h-[85vh] overflow-y-auto rounded-xl shadow-2xl">
                <h2 className="text-xl text-gray-500 mb-2">The word was...</h2>
                <h1 className="text-4xl font-bold mb-8 animate-wobble text-blue-600 uppercase">{word}</h1>

                <div className="space-y-2 mb-8">
                    {sorted.map((p, i) => (
                        <div key={p.id} className="flex items-center justify-between border-b border-gray-200 py-2">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-400">
                                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                                </span>
                                <span>{p.display_name}</span>
                            </div>
                            <div className="font-bold">{p.score} pts</div>
                        </div>
                    ))}
                </div>

                {isGameOver ? (
                    <div className="text-2xl font-bold text-green-600 animate-pulse">
                        🎉 Game Over! 🎉
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="text-lg text-gray-600">
                            Next drawer: <span className="font-bold">{nextDrawerName}</span>
                        </div>

                        {isHost ? (
                            <button
                                onClick={onContinue}
                                className="doodle-button text-xl px-8 py-3 animate-wobble"
                            >
                                Continue →
                            </button>
                        ) : (
                            <div className="text-gray-500 animate-pulse">
                                Waiting for host... ({timeLeft}s)
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

