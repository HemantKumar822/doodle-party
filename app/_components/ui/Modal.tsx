'use client';

import React from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    showCloseButton?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

/**
 * Standardized Modal Component
 * Provides consistent overlay and container styling across the app
 */
export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    showCloseButton = true,
    size = 'md',
}: ModalProps) {
    if (!isOpen) return null;

    const sizeStyles = {
        sm: 'max-w-xs',
        md: 'max-w-md',
        lg: 'max-w-lg',
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className={`bg-white sketchy-border p-6 ${sizeStyles[size]} w-full shadow-2xl animate-in zoom-in-95 fade-in duration-200`}>
                {/* Header */}
                {(title || showCloseButton) && (
                    <div className="flex justify-between items-center mb-4">
                        {title && <h2 className="text-xl font-bold font-display">{title}</h2>}
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-xl ml-auto"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                )}

                {/* Content */}
                {children}
            </div>
        </div>
    );
}
