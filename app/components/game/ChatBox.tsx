import { useEffect, useRef } from 'react';

interface ChatBoxProps {
    room: any; // Using exact types from parent
    messages: any[];
    isDrawer: boolean;
    hasGuessedCorrectly: boolean;
    guess: string;
    setGuess: (g: string) => void;
    sendGuess: (e: React.FormEvent) => void;
}

export default function ChatBox({
    room,
    messages,
    isDrawer,
    hasGuessedCorrectly,
    guess,
    setGuess,
    sendGuess
}: ChatBoxProps) {
    const chatRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="w-full md:w-80 flex-shrink-0 flex flex-col sketchy-border bg-white h-full md:h-auto shadow-md">
            <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-paper min-h-0" ref={chatRef}>
                {messages.map((m, i) => (
                    <div key={i} className={`text-sm p-1 rounded ${m.is_correct ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-white border border-gray-100'}`}>
                        <span className="font-bold">{m.name}: </span>
                        {m.is_correct ? <span>🎉 Guessed correctly!</span> : m.guess_text}
                    </div>
                ))}
            </div>

            {!isDrawer ? (
                <form onSubmit={sendGuess} className="p-2 border-t-2 border-gray-200 bg-gray-50 flex gap-2 flex-shrink-0">
                    <input
                        className="flex-1 border-2 border-black rounded px-2 py-1 font-inherit focus:ring-2 focus:ring-yellow-300 outline-none"
                        placeholder={hasGuessedCorrectly ? "You guessed it!" : "Type your guess..."}
                        value={guess}
                        onChange={e => setGuess(e.target.value)}
                        maxLength={30}
                        autoFocus
                        disabled={hasGuessedCorrectly}
                    />
                    <button type="submit" className="doodle-button py-1 px-4 text-sm" disabled={hasGuessedCorrectly}>
                        Send
                    </button>
                </form>
            ) : (
                <div className="p-2 border-t font-bold text-center text-gray-500 bg-gray-100 flex-shrink-0">
                    Draw the word! NO CHEATING!
                </div>
            )}
        </div>
    );
}
