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
    // Drawer feedback props
    correctGuessCount?: number;
    totalGuessersCount?: number;
}

function Canvas(props: CanvasProps) {
    const { roomId, isDrawer, artistName, width = 800, height = 600, correctGuessCount = 0, totalGuessersCount = 0 } = props;
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
            {/* Toolbar - Floating Pill on MOBILE & DESKTOP (Unified) */}
            {isDrawer && (
                <div className="hidden md:flex flex-col gap-2 absolute left-3 top-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-md py-4 px-3 rounded-2xl border border-black/10 shadow-xl z-20 animate-in slide-in-from-left-4 fade-in duration-300">

                    <div className="text-xs font-bold text-center mb-1">Tools</div>

                    {/* Desktop: Tools Group */}
                    <div className="flex flex-col gap-1 shrink-0">
                        <button onClick={() => setTool('pen')} className={`p-2 rounded-xl transition-all ${tool === 'pen' ? 'bg-black text-white scale-105 shadow-md' : 'text-gray-500 hover:bg-gray-100'}`} title="Pen">✏️</button>
                        <button onClick={() => setTool('eraser')} className={`p-2 rounded-xl transition-all ${tool === 'eraser' ? 'bg-black text-white scale-105 shadow-md' : 'text-gray-500 hover:bg-gray-100'}`} title="Eraser">🧹</button>
                        <button onClick={() => setTool('fill')} className={`p-2 rounded-lg transition-all ${tool === 'fill' ? 'bg-black text-white scale-105 shadow-md' : 'text-gray-500 hover:bg-gray-100'}`} title="Fill">🪣</button>
                    </div>

                    <div className="w-full h-px mx-0 my-1 bg-gray-200 shrink-0" />

                    {/* Desktop: Full Palette */}
                    <div className="grid grid-cols-2 gap-1.5 shrink-0">
                        {Object.values(COLORS.palette).map((c) => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-6 h-6 rounded-full border transition-transform ${color === c ? 'border-black scale-125 shadow-sm ring-1 ring-white' : 'border-gray-200 hover:scale-110'}`}
                                style={{ backgroundColor: c }}
                                title={c}
                            />
                        ))}
                    </div>

                    <div className="w-full h-px mx-0 my-1 bg-gray-200 shrink-0" />

                    {/* Desktop: Thickness */}
                    <div className="flex flex-col gap-2 items-center justify-center shrink-0">
                        {[2, 5, 10, 20].map(size => (
                            <button
                                key={size}
                                onClick={() => setThickness(size)}
                                className={`w-8 h-8 flex items-center justify-center rounded-full border transition-all ${thickness === size ? 'border-black bg-gray-50' : 'border-transparent hover:bg-gray-50'}`}
                                title={`Size ${size}`}
                            >
                                <div className="bg-black rounded-full" style={{ width: Math.min(24, size * 1.5), height: Math.min(24, size * 1.5) }} />
                            </button>
                        ))}
                    </div>

                    <div className="w-full h-px mx-0 my-1 bg-gray-200 shrink-0" />

                    <button onClick={clearCanvas} className="p-2.5 border-2 border-red-200 hover:bg-red-50 hover:border-red-300 rounded-xl text-red-500 shrink-0 transition-all" title="Clear Canvas">🗑️</button>
                </div>
            )}

            {/* Canvas Area - 4:3 Aspect Ratio Container */}
            <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden">
                <div className="relative w-full max-h-full aspect-square md:aspect-[4/3] sketchy-border bg-white overflow-hidden cursor-crosshair touch-none">
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
                        className="touch-none block w-full h-full"
                        style={{ touchAction: 'none' }}
                    />

                    {/* Integrated Floating Toolbar (Mobile Only) */}
                    {isDrawer && (
                        <div className="absolute bottom-3 left-3 right-3 h-12 md:hidden bg-white/95 backdrop-blur-md rounded-xl border border-black/10 shadow-lg flex items-center justify-between px-3 z-20 transition-all">

                            {/* Tools Group */}
                            <div className="flex gap-2">
                                <button onClick={() => setTool('pen')} className={`p-1.5 rounded-lg transition-all ${tool === 'pen' ? 'bg-black text-white scale-105 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`} title="Pen">✏️</button>
                                <button onClick={() => setTool('eraser')} className={`p-1.5 rounded-lg transition-all ${tool === 'eraser' ? 'bg-black text-white scale-105 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`} title="Eraser">🧹</button>
                                <button onClick={() => setTool('fill')} className={`p-1.5 rounded-lg transition-all ${tool === 'fill' ? 'bg-black text-white scale-105 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`} title="Fill">🪣</button>
                            </div>

                            {/* Separator */}
                            <div className="w-px h-6 bg-gray-200 mx-1" />

                            {/* Properties Group */}
                            <div className="flex gap-3 items-center">
                                {/* Color Picker Trigger */}
                                <div className="relative">
                                    <button
                                        onClick={() => { setShowColorPicker(!showColorPicker); setShowSizePicker(false); }}
                                        className="w-7 h-7 rounded-full border border-white shadow-sm transition-transform active:scale-95 ring-1 ring-gray-200"
                                        style={{ backgroundColor: color }}
                                    />
                                    {showColorPicker && (
                                        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 p-3 bg-white/95 backdrop-blur border-2 border-gray-200 rounded-2xl shadow-xl grid grid-cols-4 gap-2 w-56 animate-in slide-in-from-bottom-2 fade-in zoom-in-95">
                                            {Object.values(COLORS.palette).map((c) => (
                                                <button
                                                    key={c}
                                                    onClick={() => { setColor(c); setShowColorPicker(false); }}
                                                    className={`w-10 h-10 rounded-full border-2 transition-transform ${color === c ? 'border-black scale-110 shadow-sm' : 'border-gray-100 hover:scale-105'}`}
                                                    style={{ backgroundColor: c }}
                                                />
                                            ))}
                                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b-2 border-r-2 border-gray-200 rotate-45" />
                                        </div>
                                    )}
                                </div>

                                {/* Size Picker Trigger */}
                                <div className="relative">
                                    <button
                                        onClick={() => { setShowSizePicker(!showSizePicker); setShowColorPicker(false); }}
                                        className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center border border-transparent hover:border-gray-200 transition-all active:scale-95"
                                    >
                                        <div className="bg-black rounded-full transition-all" style={{ width: thickness * 0.8, height: thickness * 0.8, maxWidth: '14px', maxHeight: '14px' }} />
                                    </button>
                                    {showSizePicker && (
                                        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 p-3 bg-white/95 backdrop-blur border-2 border-gray-200 rounded-2xl shadow-xl flex gap-3 animate-in slide-in-from-bottom-2 fade-in zoom-in-95">
                                            {[2, 5, 10, 20].map(size => (
                                                <button
                                                    key={size}
                                                    onClick={() => { setThickness(size); setShowSizePicker(false); }}
                                                    className={`w-10 h-10 flex items-center justify-center rounded-full border-2 transition-all ${thickness === size ? 'border-black bg-gray-50' : 'border-transparent hover:bg-gray-50'}`}
                                                >
                                                    <div className="bg-black rounded-full" style={{ width: Math.min(24, size * 1.5), height: Math.min(24, size * 1.5) }} />
                                                </button>
                                            ))}
                                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b-2 border-r-2 border-gray-200 rotate-45" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Clear Button */}
                            <div className="pl-1 border-l border-gray-200">
                                <button onClick={clearCanvas} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm" title="Clear">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Undo/Redo - Floating on canvas (top-right for drawer) */}
                    {isDrawer && (
                        <div className="absolute top-2 right-2 flex gap-1 z-10">
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
        </div>
    );
}

export default React.memo(Canvas);
