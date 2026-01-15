'use client';

import React from 'react';

interface BadgeProps {
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
    size?: 'sm' | 'md';
    children: React.ReactNode;
    className?: string;
}

/**
 * Standardized Badge Component
 * For status indicators, labels, and counts
 */
export default function Badge({
    variant = 'default',
    size = 'sm',
    children,
    className = '',
}: BadgeProps) {
    const variantStyles = {
        default: 'bg-gray-200 text-gray-800',
        success: 'bg-green-100 text-green-800 border-green-300',
        warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        danger: 'bg-red-100 text-red-800 border-red-300',
        info: 'bg-blue-100 text-blue-800 border-blue-300',
    };

    const sizeStyles = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-3 py-1',
    };

    return (
        <span className={`inline-flex items-center font-bold rounded-full border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
            {children}
        </span>
    );
}
