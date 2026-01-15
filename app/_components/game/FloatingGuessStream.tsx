'use client';

import React, { useEffect, useState, useRef } from 'react';

interface Message {
    id?: string;
    name?: string;
    guess_text: string;
    is_correct: boolean;
}

interface FloatingGuessStreamProps {
    messages: Message[];
    className?: string;
    currentUserDisplayName?: string;
}

/**
 * FloatingGuessStream
 * Displays a stream of recent guesses as subtle chat bubbles.
 * Designed for the space below the canvas on mobile.
 */
export default function FloatingGuessStream({ messages, className = '', currentUserDisplayName }: FloatingGuessStreamProps) {
    const [displayMessages, setDisplayMessages] = useState<Message[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    // Keep only the last 4 messages for the stream
    useEffect(() => {
        if (messages.length > 0) {
            setDisplayMessages(messages.slice(-50));
        } else {
            setDisplayMessages([]);
        }
    }, [messages]);

    // Auto-scroll to bottom to show newest items
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [displayMessages]);

    if (displayMessages.length === 0) {
        return null; // Don't render anything if no messages
    }

    return (
        <div
            ref={containerRef}
            className={`flex flex-col justify-end overflow-hidden pointer-events-none ${className}`}
        >
            {/* Aesthetic Message Container */}
            <div className="mx-2 mb-2 p-2 rounded-2xl bg-white/60 backdrop-blur-md border border-white/40 shadow-sm flex flex-col gap-1.5 mask-image-fade-top">
                {displayMessages.map((msg, index) => {
                    const isMe = currentUserDisplayName && msg.name === currentUserDisplayName;
                    const isCorrect = msg.is_correct;

                    return (
                        <div
                            key={msg.id || index}
                            className={`animate-in slide-in-from-bottom-2 fade-in duration-300 flex items-baseline gap-1.5 px-1.5 py-0.5 rounded-lg ${isCorrect ? 'bg-green-100/50' : ''}`}
                        >
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isCorrect ? 'text-green-700' : 'text-gray-500'}`}>
                                {msg.name}
                            </span>
                            <span className={`text-sm ${isCorrect ? 'text-green-700 font-bold' : 'text-gray-800'} break-words leading-tight`}>
                                {isCorrect ? '🎉 Correct!' : msg.guess_text}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
