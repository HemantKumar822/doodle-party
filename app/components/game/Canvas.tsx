import React, { useEffect, useRef, useState, useCallback } from 'react';
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

function Canvas(props: CanvasProps) {
    const { roomId, isDrawer, artistName, width = 800, height = 600 } = props;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [tool, setTool] = useState<'pen' | 'eraser' | 'fill'>('pen');
    const [color, setColor] = useState<string>(COLORS.palette.black);
    const [thickness, setThickness] = useState<number>(5);
    const [isDrawing, setIsDrawing] = useState(false);
    const strokeBuffer = useRef<StrokePoint[]>([]);

    // Mobile toolbar state
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showSizePicker, setShowSizePicker] = useState(false);

    // Undo/Redo History (stores canvas ImageData snapshots)
    const historyRef = useRef<ImageData[]>([]);
    const historyIndexRef = useRef<number>(-1);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const MAX_HISTORY = 20; // Reduced from 30 to save RAM (approx 40MB max)

    // Throttling ref
    const lastBroadcast = useRef<number>(0);
    const BROADCAST_INTERVAL = 16; // 60fps target
    const canvasRect = useRef<DOMRect | null>(null); // Cache for performance

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

    // FIX #5: Clear canvas AND history when turn changes (detected by word_selected_at change)
    const lastWordSelectedAt = useRef<string | null>(null);
    useEffect(() => {
        // If word_selected_at changes (new turn started), clear canvas and history for everyone
        if (lastWordSelectedAt.current !== null && lastWordSelectedAt.current !== props.wordSelectedAt) {
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx && canvasRef.current) {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                ctx.fillStyle = COLORS.paper;
                ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
            // Clear undo/redo history for new turn (saves memory and makes sense UX-wise)
            historyRef.current = [];
            historyIndexRef.current = -1;
            setCanUndo(false);
            setCanRedo(false);
        }
        lastWordSelectedAt.current = props.wordSelectedAt || null;
    }, [props.wordSelectedAt]);

    const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawer || !canvasRef.current) return;
        e.preventDefault(); // Prevent scrolling on touch

        // Cache the rect once at the start of the stroke
        canvasRect.current = canvasRef.current.getBoundingClientRect();

        setIsDrawing(true);
        const point = getCanvasPoint(e, canvasRef.current, canvasRect.current);
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

        // Use cached rect for smooth performance
        let rect = canvasRect.current;
        if (!rect) {
            rect = canvasRef.current.getBoundingClientRect();
            canvasRect.current = rect;
        }

        const point = getCanvasPoint(e, canvasRef.current, rect);
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
        <div className="relative w-full h-full flex flex-col md:flex-row gap-2">
            {/* Toolbar - Floating Pill on MOBILE, Compact Sidebar on DESKTOP */}
            {isDrawer && (
                <div className="
                    absolute bottom-[48px] left-0 w-full flex flex-row items-center justify-between px-4 py-2 bg-white border-t border-black shadow-[0_-2px_10px_rgba(0,0,0,0.1)] z-20
                    md:static md:translate-x-0 md:flex-col md:items-stretch md:justify-start md:p-3 md:sketchy-border md:rounded-none md:shadow-none md:w-32 md:h-auto md:gap-3 md:bg-white
                ">
                    <div className="hidden md:block text-xs font-bold text-center mb-1">Tools</div>

                    {/* Left/Top Group: Tools */}
                    <div className="flex flex-row md:flex-col gap-2 shrink-0">
                        <button onClick={() => setTool('pen')} className={`p-2 rounded-lg border-2 ${tool === 'pen' ? 'border-black bg-yellow-100' : 'border-transparent hover:bg-gray-100'}`} title="Pen">✏️</button>
                        <button onClick={() => setTool('eraser')} className={`p-2 rounded-lg border-2 ${tool === 'eraser' ? 'border-black bg-yellow-100' : 'border-transparent hover:bg-gray-100'}`} title="Eraser">🧹</button>
                        <button onClick={() => setTool('fill')} className={`p-2 rounded-lg border-2 ${tool === 'fill' ? 'border-black bg-yellow-100' : 'border-transparent hover:bg-gray-100'}`} title="Fill">🪣</button>
                    </div>

                    <div className="w-px h-8 bg-gray-200 md:w-full md:h-px md:mx-0 md:my-1 shrink-0" />

                    {/* Mobile: Expandable Color & Size Pickers */}
                    <div className="flex md:hidden flex-row gap-4 items-center flex-1 justify-center relative">
                        {/* Interactive Color Indicator */}
                        <div className="relative">
                            <button
                                onClick={() => {
                                    setShowColorPicker(!showColorPicker);
                                    setShowSizePicker(false);
                                }}
                                className="w-10 h-10 rounded-full border-2 border-black shadow-sm transition-transform active:scale-95"
                                style={{ backgroundColor: color }}
                                aria-label="Current Color"
                            />
                            {/* Mobile Popover: Colors */}
                            {showColorPicker && (
                                <div className="absolute bottom-14 left-1/2 -translate-x-1/2 p-3 bg-white border-2 border-black rounded-xl shadow-xl grid grid-cols-4 gap-2 w-48 mb-2 z-30 animate-in fade-in slide-in-from-bottom-2">
                                    {Object.values(COLORS.palette).map((c) => (
                                        <button
                                            key={c}
                                            onClick={() => {
                                                setColor(c);
                                                setShowColorPicker(false);
                                            }}
                                            className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-black scale-110' : 'border-gray-200'}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                    {/* Arrow */}
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b-2 border-r-2 border-black rotate-45 transform" />
                                </div>
                            )}
                        </div>

                        {/* Interactive Size Indicator */}
                        <div className="relative">
                            <button
                                onClick={() => {
                                    setShowSizePicker(!showSizePicker);
                                    setShowColorPicker(false);
                                }}
                                className="w-10 h-10 rounded-full border-2 border-gray-200 bg-white flex items-center justify-center shadow-sm active:scale-95 hover:bg-gray-50"
                                aria-label="Brush Size"
                            >
                                <div className="bg-black rounded-full" style={{ width: thickness * 1.5, height: thickness * 1.5 }} />
                            </button>
                            {/* Mobile Popover: Size */}
                            {showSizePicker && (
                                <div className="absolute bottom-14 left-1/2 -translate-x-1/2 p-3 bg-white border-2 border-black rounded-xl shadow-xl flex flex-row gap-3 z-30 animate-in fade-in slide-in-from-bottom-2">
                                    {[2, 5, 10].map(size => (
                                        <button
                                            key={size}
                                            onClick={() => {
                                                setThickness(size);
                                                setShowSizePicker(false);
                                            }}
                                            className={`w-10 h-10 flex items-center justify-center border-2 rounded-full ${thickness === size ? 'border-black bg-gray-100' : 'border-gray-200'}`}
                                        >
                                            <div className="bg-black rounded-full" style={{ width: size * 2, height: size * 2 }} />
                                        </button>
                                    ))}
                                    {/* Arrow */}
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b-2 border-r-2 border-black rotate-45 transform" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Desktop: Clear Button (Hidden on mobile to save space? No, user needs it. Keep it on right) */}
                    {/* Actually, let's put Clear on the far right on mobile */}

                    {/* Desktop: Full Palette (Hidden on Mobile) */}
                    <div className="hidden md:grid md:grid-cols-3 md:gap-2 shrink-0">
                        {Object.values(COLORS.palette).map((c) => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-7 h-7 rounded-full border-2 transition-transform ${color === c ? 'border-black scale-110' : 'border-gray-200 hover:scale-105'}`}
                                style={{ backgroundColor: c }}
                                title={c}
                            />
                        ))}
                    </div>

                    <div className="hidden md:block w-px h-px md:w-full md:h-px md:mx-0 md:my-1 bg-gray-200 shrink-0" />

                    {/* Desktop: Thickness (Hidden on Mobile) */}
                    <div className="hidden md:flex md:flex-col md:gap-3 md:items-center md:justify-center shrink-0">
                        {[2, 5, 10].map(size => (
                            <button
                                key={size}
                                onClick={() => setThickness(size)}
                                className={`w-8 h-8 flex items-center justify-center border-2 rounded-full ${thickness === size ? 'border-black bg-gray-100' : 'border-transparent hover:bg-gray-50'}`}
                                title={`Size ${size}`}
                            >
                                <div className="bg-black rounded-full" style={{ width: size * 2, height: size * 2 }} />
                            </button>
                        ))}
                    </div>

                    <div className="w-px h-8 bg-gray-200 md:w-full md:h-px md:mx-0 md:my-1 shrink-0" />

                    <button onClick={clearCanvas} className="p-2 border-2 border-red-200 hover:bg-red-100 rounded-lg text-red-500 shrink-0" title="Clear Canvas">🗑️</button>
                </div>
            )}

            {/* Canvas Area */}
            <div className="relative flex-1 w-full h-full md:h-auto sketchy-border bg-white overflow-hidden cursor-crosshair touch-none">
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
                    className="touch-none block w-full h-full mx-auto"
                    style={{ touchAction: 'none' }}
                />

                {/* Undo/Redo - Floating on canvas (top-left for drawer) */}
                {isDrawer && (
                    <div className="absolute top-2 left-2 flex gap-1 z-10">
                        <button
                            onClick={undo}
                            disabled={!canUndo}
                            className={`w-8 h-8 flex items-center justify-center rounded-full bg-white/90 border-2 shadow-sm backdrop-blur-sm transition-all ${canUndo ? 'border-gray-300 hover:bg-gray-100 hover:border-gray-400' : 'border-gray-200 opacity-40 cursor-not-allowed'
                                }`}
                            title="Undo"
                        >
                            ↩️
                        </button>
                        <button
                            onClick={redo}
                            disabled={!canRedo}
                            className={`w-8 h-8 flex items-center justify-center rounded-full bg-white/90 border-2 shadow-sm backdrop-blur-sm transition-all ${canRedo ? 'border-gray-300 hover:bg-gray-100 hover:border-gray-400' : 'border-gray-200 opacity-40 cursor-not-allowed'
                                }`}
                            title="Redo"
                        >
                            ↪️
                        </button>
                    </div>
                )}

                {!isDrawer && <div className="absolute top-2 right-2 bg-black/50 text-white px-3 py-1 rounded-full pointer-events-none text-xs font-bold backdrop-blur-sm animate-pulse">
                    Watching {artistName ? `${artistName}` : 'Artist'} 🎨
                </div>}
            </div>
        </div>
    );
}

export default React.memo(Canvas);
