'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
    children: React.ReactNode;
}

/**
 * Standardized Doodle Button Component
 * Replaces all ad-hoc button styling with consistent design system
 */
export default function Button({
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    className = '',
    children,
    disabled,
    ...props
}: ButtonProps) {
    const baseStyles = `
        font-bold uppercase tracking-wider
        border-2 border-black rounded-lg
        shadow-[4px_4px_0px_rgba(0,0,0,1)]
        active:translate-y-1 active:shadow-none
        transition-all
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:shadow-[4px_4px_0px_rgba(0,0,0,1)]
    `.trim().replace(/\s+/g, ' ');

    const variantStyles = {
        primary: 'bg-yellow-300 hover:bg-yellow-400 text-black',
        secondary: 'bg-white hover:bg-gray-100 text-black',
        danger: 'bg-red-500 hover:bg-red-600 text-black',
        ghost: 'bg-transparent hover:bg-gray-100 text-black border-transparent shadow-none active:shadow-none',
    };

    const sizeStyles = {
        sm: 'text-sm py-1.5 px-3',
        md: 'text-base py-2 px-4',
        lg: 'text-lg py-3 px-6',
    };

    const widthStyles = fullWidth ? 'w-full' : '';

    return (
        <button
            className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${className}`}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );
}
