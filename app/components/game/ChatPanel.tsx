'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

interface Message {
    id?: string;
    name?: string;
    guess_text: string;
    is_correct: boolean;
}

interface ChatPanelProps {
    messages: Message[];
    isDrawer: boolean;
    guess: string;
    onGuessChange: (value: string) => void;
    onSubmitGuess: (e: React.FormEvent) => void;
    isOpen: boolean;
    onToggle: () => void; // Changed from onClose to onToggle
}

const PEEK_HEIGHT = 48; // Height of the peek bar in pixels

/**
 * ChatPanel - Chat sidebar for guesses and messages
 * Mobile: Peek-style bottom sheet (always shows peek bar, swipe/tap to expand)
 * Desktop: Fixed sidebar
 */
function ChatPanel({
    messages,
    isDrawer,
    guess,
    onGuessChange,
    onSubmitGuess,
    isOpen,
    onToggle,
}: ChatPanelProps) {
    const chatRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // Swipe gesture handling
    const touchStartY = useRef<number>(0);
    const [isDragging, setIsDragging] = useState(false);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (chatRef.current && isOpen) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    // Get most recent message for peek preview
    const recentMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const unreadCount = messages.filter(m => m.is_correct).length;

    // Touch handlers for swipe gesture
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartY.current = e.touches[0].clientY;
        setIsDragging(true);
    }, []);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        if (!isDragging) return;

        const touchEndY = e.changedTouches[0].clientY;
        const deltaY = touchStartY.current - touchEndY;

        // Swipe up: open, Swipe down: close
        if (Math.abs(deltaY) > 50) {
            if (deltaY > 0 && !isOpen) {
                if (onToggle) onToggle(); // Swipe up - open
            } else if (deltaY < 0 && isOpen) {
                if (onToggle) onToggle(); // Swipe down - close
            }
        }

        setIsDragging(false);
    }, [isDragging, isOpen, onToggle]);

    return (
        <>
            {/* Mobile: Persistent Bottom Input Bar (No Peek) */}
            {/* Mobile: Persistent Bottom Chat (No Peek) */}
            <div className="md:hidden fixed inset-x-0 bottom-0 z-30 pointer-events-none pb-safe">
                {!isDrawer ? (
                    <form
                        onSubmit={onSubmitGuess}
                        className="p-3 flex gap-2 items-center pointer-events-auto bg-gradient-to-t from-white via-white/80 to-transparent"
                    >
                        <input
                            className="flex-1 border-2 border-black rounded px-3 py-2 font-inherit focus:ring-4 focus:ring-yellow-200/50 outline-none bg-white text-base shadow-[2px_2px_0px_rgba(0,0,0,0.1)] transition-all"
                            placeholder="Type a guess..."
                            value={guess}
                            onChange={e => onGuessChange(e.target.value)}
                            maxLength={30}
                            aria-label="Enter your guess"
                        />
                        <button
                            type="submit"
                            className="doodle-button py-1 px-2.5 text-xs font-bold flex items-center justify-center shadow-[1px_1px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none transition-all border-2 border-black bg-yellow-300 rounded"
                            aria-label="Send"
                        >
                            Send
                        </button>
                    </form>
                ) : (
                    <div className="p-3 text-center pointer-events-auto bg-white/90 backdrop-blur-sm border-t-2 border-dashed border-gray-300">
                        <span className="font-bold text-gray-500 animate-pulse">✏️ You are drawing!</span>
                    </div>
                )}
            </div>

            {/* Desktop: Fixed Sidebar (unchanged) */}
            <div className="hidden md:flex md:flex-col md:w-80 md:flex-shrink-0 md:sketchy-border md:border-2 md:shadow-md md:bg-white">
                {/* Messages List */}
                <div
                    className="flex-1 overflow-y-auto p-2 space-y-2 bg-paper"
                    ref={chatRef}
                    role="log"
                    aria-label="Chat messages"
                >
                    {messages.length === 0 ? (
                        <div className="text-center text-gray-400 py-8">
                            <p className="text-2xl mb-2">💬</p>
                            <p className="text-sm">No guesses yet...</p>
                        </div>
                    ) : (
                        messages.map((m, i) => (
                            <div
                                key={m.id || i}
                                className={`text-sm px-1 py-0.5 ${m.is_correct
                                    ? 'text-green-700 font-bold'
                                    : 'text-gray-700'
                                    }`}
                            >
                                <span className="font-semibold">{m.name}: </span>
                                {m.is_correct ? (
                                    <span>🎉 Guessed correctly!</span>
                                ) : (
                                    m.guess_text
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Input Area */}
                {!isDrawer ? (
                    <form
                        onSubmit={onSubmitGuess}
                        className="p-3 border-t-2 border-dashed border-gray-300 bg-white/50 backdrop-blur-sm flex gap-3 shrink-0 items-center justify-center transition-all"
                    >
                        <input
                            className="flex-1 max-w-[200px] border-2 border-black rounded px-3 py-2 font-inherit focus:ring-4 focus:ring-yellow-200/50 outline-none bg-white shadow-sm transition-all"
                            placeholder="Type a guess..."
                            value={guess}
                            onChange={e => onGuessChange(e.target.value)}
                            maxLength={30}
                            aria-label="Enter your guess"
                        />
                        <button
                            type="submit"
                            className="doodle-button py-1 px-2.5 text-xs font-bold flex items-center justify-center shadow-[1px_1px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none transition-all border-2 border-black bg-yellow-300 rounded"
                        >
                            Send
                        </button>
                    </form>
                ) : (
                    <div className="p-2 border-t font-bold text-center text-gray-500 bg-gray-100">
                        Draw the word!
                    </div>
                )}
            </div>
        </>
    );
}

export default React.memo(ChatPanel);

