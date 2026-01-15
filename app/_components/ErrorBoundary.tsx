'use client';

import React, { Component, ReactNode } from 'react';
import logger from '@/app/_lib/logger';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * ErrorBoundary - Catches React rendering errors and shows fallback UI
 * Prevents the entire app from crashing on component errors
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        logger.error('React Error Boundary caught an error', {
            context: 'error',
            data: {
                error: error.message,
                stack: error.stack,
                componentStack: errorInfo.componentStack,
            },
        });
    }

    handleRetry = (): void => {
        this.setState({ hasError: false, error: null });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // Custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default fallback UI
            return (
                <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
                    <div className="text-6xl mb-4">😵</div>
                    <h2 className="text-2xl font-bold mb-2">Oops! Something went wrong</h2>
                    <p className="text-gray-600 mb-6 max-w-md">
                        {this.state.error?.message || 'An unexpected error occurred'}
                    </p>
                    <button
                        onClick={this.handleRetry}
                        className="doodle-button px-6 py-2"
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
