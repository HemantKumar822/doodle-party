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
            {/* Mobile: Peek-style Bottom Sheet */}
            <div
                ref={panelRef}
                className={`
                    md:hidden fixed inset-x-0 bottom-0 z-30 flex flex-col bg-white border-t-4 border-black 
                    transition-all duration-300 ease-out
                    ${isOpen ? 'h-[55vh]' : `h-[${PEEK_HEIGHT}px]`}
                `}
                style={{ height: isOpen ? '55vh' : `${PEEK_HEIGHT}px` }}
            >
                {/* Peek Bar / Drag Handle - Always visible */}
                <div
                    className="flex items-center justify-between px-3 py-2 bg-yellow-50 border-b-2 border-gray-200 cursor-pointer select-none touch-none"
                    onClick={onToggle}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    role="button"
                    aria-expanded={isOpen}
                    aria-label={isOpen ? "Collapse chat" : "Expand chat"}
                >
                    {/* Drag indicator */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-1 w-10 h-1 bg-gray-300 rounded-full" />

                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-lg">💬</span>
                        {!isOpen && recentMessage && (
                            <span className="text-xs text-gray-600 truncate max-w-[150px]">
                                <span className="font-bold">{recentMessage.name}:</span>{' '}
                                {recentMessage.is_correct ? '🎉 Correct!' : recentMessage.guess_text}
                            </span>
                        )}
                        {!isOpen && !recentMessage && (
                            <span className="text-xs text-gray-400">Tap to chat</span>
                        )}
                        {isOpen && <span className="font-bold text-sm">Chat</span>}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                        {!isOpen && unreadCount > 0 && (
                            <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                                {unreadCount}
                            </span>
                        )}
                        <span className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                            ▲
                        </span>
                    </div>
                </div>

                {/* Expanded Content */}
                {isOpen && (
                    <>
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
                                        className={`text-sm p-1.5 rounded ${m.is_correct
                                            ? 'bg-green-100 text-green-800 border border-green-300'
                                            : 'bg-white border border-gray-100'
                                            }`}
                                    >
                                        <span className="font-bold">{m.name}: </span>
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
                                className="p-2 border-t-2 border-gray-200 bg-gray-50 flex gap-2 shrink-0 pb-safe"
                            >
                                <input
                                    className="flex-1 border-2 border-black rounded px-2 py-2 font-inherit focus:ring-2 focus:ring-yellow-300 outline-none"
                                    placeholder="Type guess..."
                                    value={guess}
                                    onChange={e => onGuessChange(e.target.value)}
                                    maxLength={30}
                                    aria-label="Enter your guess"
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    className="doodle-button py-1 px-4 text-sm"
                                >
                                    Send
                                </button>
                            </form>
                        ) : (
                            <div className="p-2 border-t font-bold text-center text-gray-500 bg-gray-100 pb-safe">
                                Draw the word!
                            </div>
                        )}
                    </>
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
                                className={`text-sm p-1 rounded ${m.is_correct
                                    ? 'bg-green-100 text-green-800 border border-green-300'
                                    : 'bg-white border border-gray-100'
                                    }`}
                            >
                                <span className="font-bold">{m.name}: </span>
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
                        className="p-2 border-t-2 border-gray-200 bg-gray-50 flex gap-2 shrink-0"
                    >
                        <input
                            className="flex-1 border-2 border-black rounded px-2 py-1 font-inherit focus:ring-2 focus:ring-yellow-300 outline-none"
                            placeholder="Type guess..."
                            value={guess}
                            onChange={e => onGuessChange(e.target.value)}
                            maxLength={30}
                            aria-label="Enter your guess"
                        />
                        <button
                            type="submit"
                            className="doodle-button py-1 px-4 text-sm"
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

            {/* Overlay to close chat on mobile when expanded */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-20 md:hidden"
                    onClick={onToggle}
                    aria-hidden="true"
                />
            )}
        </>
    );
}

export default React.memo(ChatPanel);

