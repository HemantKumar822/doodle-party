import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { COLORS } from '@/app/design_system';
import { getCanvasPoint, drawStroke, floodFill } from '@/app/lib/gameLogic';
import { StrokePoint } from '@/app/types/game';

interface CanvasProps {
    roomId: string;
    isDrawer: boolean;
    artistName?: string; // New prop for badge
    width?: number;
    height?: number;
    wordSelectedAt?: string | null;
}

export default function Canvas(props: CanvasProps) {
    const { roomId, isDrawer, artistName, width = 800, height = 600 } = props;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [tool, setTool] = useState<'pen' | 'eraser' | 'fill'>('pen');
    const [color, setColor] = useState<string>(COLORS.palette.black);
    const [thickness, setThickness] = useState<number>(5);
    const [isDrawing, setIsDrawing] = useState(false);
    const strokeBuffer = useRef<StrokePoint[]>([]);

    // Undo/Redo History (stores canvas ImageData snapshots)
    const historyRef = useRef<ImageData[]>([]);
    const historyIndexRef = useRef<number>(-1);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const MAX_HISTORY = 20; // Reduced from 30 to save RAM (approx 40MB max)

    // Throttling ref
    const lastBroadcast = useRef<number>(0);
    const BROADCAST_INTERVAL = 16; // 60fps target

    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;

        // Initialize white background (important for flood fill)
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = COLORS.paper;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Setup Realtime Subscription
        const channel = supabase.channel(`room_draw:${roomId}`)
            .on('broadcast', { event: 'stroke' }, ({ payload }) => {
                // Don't draw own strokes from server to avoid lag/double-draw
                if (!isDrawer) {
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return;

                    if (payload.tool === 'fill') {
                        floodFill(ctx, payload.x, payload.y, payload.color);
                    } else if (payload.tool === 'clear') {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        ctx.fillStyle = COLORS.paper;
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    } else {
                        // Reconstruct stroke
                        drawStroke(
                            ctx,
                            payload.points,
                            payload.tool === 'eraser' ? COLORS.paper : payload.color,
                            payload.thickness,
                            canvas.width,
                            canvas.height
                        );
                    }
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, isDrawer]);

    // FIX #5: Clear canvas when turn changes (detected by word_selected_at change)
    const lastWordSelectedAt = useRef<string | null>(null);
    useEffect(() => {
        // If word_selected_at changes (new turn started), clear canvas for everyone
        if (lastWordSelectedAt.current !== null && lastWordSelectedAt.current !== props.wordSelectedAt) {
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx && canvasRef.current) {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                ctx.fillStyle = COLORS.paper;
                ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
        }
        lastWordSelectedAt.current = props.wordSelectedAt || null;
    }, [props.wordSelectedAt]);

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawer || !canvasRef.current) return;
        e.preventDefault(); // Prevent scrolling on touch

        setIsDrawing(true);
        const point = getCanvasPoint(e, canvasRef.current);
        strokeBuffer.current = [point];

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        if (tool === 'fill') {
            floodFill(ctx, point.x, point.y, color);
            // Broadcast fill immediately
            supabase.channel(`room_draw:${roomId}`).send({
                type: 'broadcast',
                event: 'stroke',
                payload: { tool: 'fill', color, x: point.x, y: point.y }
            });
            setIsDrawing(false); // Fill is a one-off action
        } else {
            ctx.beginPath();
            ctx.moveTo(point.x * width, point.y * height);
        }
    };

    const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawer || !isDrawing || !canvasRef.current) return;
        const point = getCanvasPoint(e, canvasRef.current);
        strokeBuffer.current.push(point);

        // Local Drawing (Immediate Feedback)
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
            const prev = strokeBuffer.current[strokeBuffer.current.length - 2];
            if (prev) {
                ctx.beginPath();
                ctx.strokeStyle = tool === 'eraser' ? COLORS.paper : color;
                ctx.lineWidth = thickness;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.moveTo(prev.x * width, prev.y * height);
                ctx.lineTo(point.x * width, point.y * height);
                ctx.stroke();
            }
        }

        // Broadcast Throttling
        const now = Date.now();
        if (now - lastBroadcast.current > BROADCAST_INTERVAL) {
            if (strokeBuffer.current.length > 0) {
                supabase.channel(`room_draw:${roomId}`).send({
                    type: 'broadcast',
                    event: 'stroke',
                    payload: {
                        tool,
                        color,
                        thickness,
                        points: strokeBuffer.current
                    }
                });
                strokeBuffer.current = [point];
            }
            lastBroadcast.current = now;
        }
    };

    const handleEnd = () => {
        if (!isDrawer || !isDrawing) return;
        setIsDrawing(false);

        // Send remaining points
        if (strokeBuffer.current.length > 0) {
            supabase.channel(`room_draw:${roomId}`).send({
                type: 'broadcast',
                event: 'stroke',
                payload: {
                    tool,
                    color,
                    thickness,
                    points: strokeBuffer.current
                }
            });
        }
        strokeBuffer.current = [];

        // Save to history after stroke completes
        saveToHistory();
    };

    // Save current canvas state to history
    const saveToHistory = useCallback(() => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const imageData = ctx.getImageData(0, 0, width, height);

        // Remove any "future" states if we're not at the end
        historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);

        // Add new state
        historyRef.current.push(imageData);

        // Limit history size
        if (historyRef.current.length > MAX_HISTORY) {
            historyRef.current.shift();
        } else {
            historyIndexRef.current++;
        }

        setCanUndo(historyIndexRef.current > 0);
        setCanRedo(false);
    }, [width, height]);

    const undo = useCallback(() => {
        if (!canvasRef.current || historyIndexRef.current <= 0) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        historyIndexRef.current--;
        const imageData = historyRef.current[historyIndexRef.current];
        ctx.putImageData(imageData, 0, 0);

        // Broadcast the undo
        supabase.channel(`room_draw:${roomId}`).send({
            type: 'broadcast',
            event: 'stroke',
            payload: { tool: 'undo', imageData: Array.from(imageData.data) }
        });

        setCanUndo(historyIndexRef.current > 0);
        setCanRedo(true);
    }, [roomId]);

    const redo = useCallback(() => {
        if (!canvasRef.current || historyIndexRef.current >= historyRef.current.length - 1) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        historyIndexRef.current++;
        const imageData = historyRef.current[historyIndexRef.current];
        ctx.putImageData(imageData, 0, 0);

        // Broadcast the redo
        supabase.channel(`room_draw:${roomId}`).send({
            type: 'broadcast',
            event: 'stroke',
            payload: { tool: 'redo', imageData: Array.from(imageData.data) }
        });

        setCanUndo(true);
        setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    }, [roomId]);

    const clearCanvas = () => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
            saveToHistory(); // Save before clearing
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = COLORS.paper;
            ctx.fillRect(0, 0, width, height);

            supabase.channel(`room_draw:${roomId}`).send({
                type: 'broadcast',
                event: 'stroke',
                payload: { tool: 'clear' }
            });
        }
    };

    return (
        <div className="flex flex-col md:flex-row gap-4">
            {/* Toolbar */}
            {isDrawer && (
                <div className="flex flex-row md:flex-col gap-2 p-4 sketchy-border bg-white min-w-[80px]">
                    <div className="text-sm font-bold mb-2">Tools</div>
                    <button onClick={() => setTool('pen')} className={`p-2 border-2 ${tool === 'pen' ? 'border-black bg-yellow-100' : 'border-transparent'}`}>✏️</button>
                    <button onClick={() => setTool('eraser')} className={`p-2 border-2 ${tool === 'eraser' ? 'border-black bg-yellow-100' : 'border-transparent'}`}>🧹</button>
                    <button onClick={() => setTool('fill')} className={`p-2 border-2 ${tool === 'fill' ? 'border-black bg-yellow-100' : 'border-transparent'}`}>🪣</button>

                    <div className="h-px bg-gray-300 my-1" />

                    {/* Undo/Redo */}
                    <div className="flex gap-1">
                        <button
                            onClick={undo}
                            disabled={!canUndo}
                            className={`p-2 border-2 rounded ${canUndo ? 'hover:bg-gray-100' : 'opacity-30 cursor-not-allowed'}`}
                            title="Undo (Ctrl+Z)"
                        >↩️</button>
                        <button
                            onClick={redo}
                            disabled={!canRedo}
                            className={`p-2 border-2 rounded ${canRedo ? 'hover:bg-gray-100' : 'opacity-30 cursor-not-allowed'}`}
                            title="Redo (Ctrl+Y)"
                        >↪️</button>
                    </div>

                    <button onClick={clearCanvas} className="p-2 border-2 border-red-200 hover:bg-red-100 rounded">🗑️</button>

                    <div className="h-px bg-gray-300 my-2" />

                    <div className="grid grid-cols-2 gap-1">
                        {Object.values(COLORS.palette).map((c) => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-black scale-110' : 'border-transparent'}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>

                    <div className="h-px bg-gray-300 my-2" />

                    <div className="flex flex-col gap-2">
                        {[2, 5, 10].map(size => (
                            <button
                                key={size}
                                onClick={() => setThickness(size)}
                                className={`w-full h-8 flex items-center justify-center border-2 ${thickness === size ? 'border-black' : 'border-transparent'}`}
                            >
                                <div className="bg-black rounded-full" style={{ width: size * 2, height: size * 2 }} />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Canvas Area */}
            <div className="relative sketchy-border bg-white overflow-hidden cursor-crosshair">
                <canvas
                    ref={canvasRef}
                    width={width}
                    height={height}
                    onMouseDown={handleStart}
                    onMouseMove={handleMove}
                    onMouseUp={handleEnd}
                    onMouseLeave={handleEnd}
                    onTouchStart={handleStart}
                    onTouchMove={handleMove}
                    onTouchEnd={handleEnd}
                    className="touch-none block w-full h-auto aspect-[4/3] max-w-[800px] mx-auto shadow-sm"
                    style={{ touchAction: 'none' }} // Extra safety for mobile scroll prevention
                />
                {!isDrawer && <div className="absolute top-2 right-2 bg-black/50 text-white px-3 py-1 rounded-full pointer-events-none text-xs font-bold backdrop-blur-sm animate-pulse">
                    Watching {artistName ? `${artistName}` : 'Artist'} 🎨
                </div>}
            </div>
        </div>
    );
}
