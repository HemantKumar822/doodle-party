import { Player } from "@/app/_types/game";
import { COLORS } from "@/app/design_system";
import Button from "@/app/_components/ui/Button";
import { useState, useEffect } from "react";

interface ScoreboardOverlayProps {
    players: Player[];
    word: string;
    nextDrawerName: string;
    timeLeft: number;
    isHost: boolean;
    isGameOver: boolean;
    onContinue?: () => void;
}

// Animated score counter component
function AnimatedScore({ value, duration = 1000 }: { value: number; duration?: number }) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        if (value === 0) {
            setDisplayValue(0);
            return;
        }

        const startTime = Date.now();
        const startValue = 0;

        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease-out animation
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(startValue + (value - startValue) * eased);

            setDisplayValue(current);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [value, duration]);

    return <>{displayValue}</>;
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm animate-fade-in">
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
                            <div className="font-bold text-lg">
                                <AnimatedScore value={p.score} duration={800 + i * 200} /> pts
                            </div>
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
                            <Button
                                onClick={onContinue}
                                size="lg"
                                animate
                            >
                                Continue →
                            </Button>
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

