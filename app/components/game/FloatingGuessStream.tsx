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
            <div className="flex flex-col gap-2 px-4 pb-2">
                {displayMessages.map((msg, index) => {
                    const isMe = currentUserDisplayName && msg.name === currentUserDisplayName;
                    const isCorrect = msg.is_correct;

                    return (
                        <div
                            key={msg.id || index}
                            className="animate-in slide-in-from-bottom-2 fade-in duration-300 px-1"
                        >
                            <span className={`text-xs ${isCorrect ? 'text-green-600' : 'text-gray-500'}`}>
                                {msg.name}:
                            </span>
                            <span className={`ml-1 text-sm ${isCorrect ? 'text-green-700 font-bold' : 'text-gray-700'}`}>
                                {isCorrect ? '🎉 Got it!' : msg.guess_text}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
