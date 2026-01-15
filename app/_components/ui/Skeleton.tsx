'use client';

import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
    count?: number;
}

/**
 * Skeleton - Loading placeholder component
 * Displays animated pulse effect while content is loading
 */
function Skeleton({
    className = '',
    variant = 'rectangular',
    width,
    height,
    count = 1,
}: SkeletonProps) {
    const baseClasses = 'animate-pulse bg-gray-200';

    const variantClasses = {
        text: 'rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-md',
    };

    const style: React.CSSProperties = {
        width: width || '100%',
        height: height || (variant === 'text' ? '1em' : '100%'),
    };

    const items = Array.from({ length: count }, (_, i) => (
        <div
            key={i}
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            style={style}
        />
    ));

    return count === 1 ? items[0] : <>{items}</>;
}

/**
 * PlayerListSkeleton - Loading state for player list
 */
export function PlayerListSkeleton({ count = 4 }: { count?: number }) {
    return (
        <div className="w-full md:w-52 flex-shrink-0 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto pr-2">
            {Array.from({ length: count }, (_, i) => (
                <div key={i} className="sketchy-border p-2 bg-white flex items-center gap-2 shadow-sm">
                    <Skeleton variant="circular" width={40} height={40} />
                    <div className="flex-1 min-w-0 space-y-1">
                        <Skeleton variant="text" width="80%" height={14} />
                        <Skeleton variant="text" width="40%" height={10} />
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * ChatPanelSkeleton - Loading state for chat panel
 */
export function ChatPanelSkeleton() {
    return (
        <div className="md:w-80 flex-shrink-0 sketchy-border border-2 shadow-md bg-white">
            <div className="p-2 space-y-2">
                {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="flex gap-2 p-1">
                        <Skeleton variant="text" width="20%" height={14} />
                        <Skeleton variant="text" width={`${50 + Math.random() * 30}%`} height={14} />
                    </div>
                ))}
            </div>
            <div className="p-2 border-t-2 border-gray-200 bg-gray-50 flex gap-2">
                <Skeleton variant="rectangular" height={36} className="flex-1" />
                <Skeleton variant="rectangular" width={60} height={36} />
            </div>
        </div>
    );
}

/**
 * CanvasSkeleton - Loading state for canvas area
 */
export function CanvasSkeleton() {
    return (
        <div className="flex-1 relative bg-gray-100 overflow-hidden flex items-center justify-center sketchy-border">
            <div className="text-center">
                <div className="animate-bounce text-4xl mb-4">🎨</div>
                <Skeleton variant="text" width={200} height={20} className="mx-auto" />
            </div>
        </div>
    );
}

/**
 * GameHeaderSkeleton - Loading state for game header
 */
export function GameHeaderSkeleton() {
    return (
        <div className="flex shrink-0 justify-between items-center p-2 border-b-2 border-black bg-white z-10 shadow-sm md:mb-4 md:sketchy-border md:p-3 md:shadow-md">
            <Skeleton variant="rectangular" width={100} height={24} />
            <Skeleton variant="rectangular" width={150} height={32} />
            <div className="flex items-center gap-2">
                <Skeleton variant="circular" width={32} height={32} />
                <Skeleton variant="rectangular" width={50} height={24} />
            </div>
        </div>
    );
}

/**
 * LobbyPlayerSkeleton - Loading state for lobby player cards
 */
export function LobbyPlayerSkeleton({ count = 4 }: { count?: number }) {
    return (
        <div className="flex flex-wrap gap-3 justify-center">
            {Array.from({ length: count }, (_, i) => (
                <div key={i} className="sketchy-border p-3 bg-white w-32 text-center">
                    <Skeleton variant="circular" width={48} height={48} className="mx-auto mb-2" />
                    <Skeleton variant="text" width="80%" height={16} className="mx-auto" />
                </div>
            ))}
        </div>
    );
}

/**
 * ButtonSkeleton - Loading state for buttons
 */
export function ButtonSkeleton({ width = 120, height = 40 }: { width?: number; height?: number }) {
    return <Skeleton variant="rectangular" width={width} height={height} className="rounded-lg" />;
}

export default Skeleton;
