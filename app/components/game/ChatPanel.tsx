'use client';

import React, { useRef, useEffect } from 'react';

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
    onClose: () => void;
}

/**
 * ChatPanel - Chat sidebar for guesses and messages
 * Mobile: Bottom sheet that slides up
 * Desktop: Fixed sidebar
 */
function ChatPanel({
    messages,
    isDrawer,
    guess,
    onGuessChange,
    onSubmitGuess,
    isOpen,
    onClose,
}: ChatPanelProps) {
    const chatRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <>
            {/* Chat Panel */}
            <div className={`
                fixed inset-x-0 bottom-0 z-30 flex flex-col bg-white border-t-4 border-black transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-y-0 h-[50vh]' : 'translate-y-full h-0'}
                md:static md:translate-y-0 md:h-auto md:w-80 md:flex-shrink-0 md:sketchy-border md:border-2 md:shadow-md
            `}>
                {/* Mobile Header */}
                <div className="flex items-center justify-between p-2 border-b-2 border-gray-100 md:hidden bg-yellow-50">
                    <span className="font-bold">Chat</span>
                    <button
                        onClick={onClose}
                        className="px-3 py-1 font-bold text-sm bg-gray-200 rounded border border-black"
                    >
                        Close ▼
                    </button>
                </div>

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
                        className="p-2 border-t-2 border-gray-200 bg-gray-50 flex gap-2 shrink-0 pb-safe"
                    >
                        <input
                            className="flex-1 border-2 border-black rounded px-2 py-2 md:py-1 font-inherit focus:ring-2 focus:ring-yellow-300 outline-none"
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
                    <div className="p-2 border-t font-bold text-center text-gray-500 bg-gray-100 pb-safe">
                        Draw the word!
                    </div>
                )}
            </div>

            {/* Overlay to close chat on mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 md:hidden"
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}
        </>
    );
}

export default React.memo(ChatPanel);
