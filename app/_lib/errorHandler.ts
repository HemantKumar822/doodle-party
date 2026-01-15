/**
 * Error Handler Utility for Doodle Party
 * Provides consistent error handling for async operations
 */

import logger from './logger';

export interface SafeResult<T> {
    data: T | null;
    error: Error | null;
    success: boolean;
}

/**
 * Wraps an async function with error handling
 * Returns a SafeResult object with data, error, and success flag
 * 
 * @example
 * const result = await safeAsync(() => supabase.from('rooms').select('*'));
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error);
 * }
 */
export async function safeAsync<T>(
    fn: () => Promise<T>,
    context?: string
): Promise<SafeResult<T>> {
    try {
        const data = await fn();
        return { data, error: null, success: true };
    } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        if (context) {
            logger.error(`Error in ${context}`, { context: 'error', data: error.message });
        }

        return { data: null, error, success: false };
    }
}

/**
 * Wraps a Supabase query with error handling
 * Automatically extracts data and error from Supabase response
 * 
 * @example
 * const result = await safeSupabase(
 *   supabase.from('rooms').select('*').eq('id', roomId).single(),
 *   'fetchRoom'
 * );
 */
export async function safeSupabase<T>(
    query: PromiseLike<{ data: T | null; error: { message: string } | null }>,
    context?: string
): Promise<SafeResult<T>> {
    try {
        const { data, error: supabaseError } = await query;

        if (supabaseError) {
            const error = new Error(supabaseError.message);
            if (context) {
                logger.error(`Supabase error in ${context}`, {
                    context: 'network',
                    data: supabaseError.message
                });
            }
            return { data: null, error, success: false };
        }

        return { data, error: null, success: true };
    } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        if (context) {
            logger.error(`Unexpected error in ${context}`, {
                context: 'error',
                data: error.message
            });
        }

        return { data: null, error, success: false };
    }
}

/**
 * Simple toast-style error display (logs to console with emoji)
 * In production, this could trigger a UI toast
 */
export function showError(message: string, details?: string): void {
    logger.error(message, { context: 'error', data: details });

    // In the future, this could trigger a toast notification
    // For now, we just log it prominently
    console.error(`❌ ${message}${details ? `: ${details}` : ''}`);
}

/**
 * Retry wrapper for flaky operations
 * Retries the function up to maxRetries times with exponential backoff
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 1000,
    context?: string
): Promise<SafeResult<T>> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const result = await safeAsync(fn, context);

        if (result.success) {
            return result;
        }

        lastError = result.error;

        if (attempt < maxRetries) {
            const delay = baseDelayMs * Math.pow(2, attempt - 1);
            logger.warn(`Retry ${attempt}/${maxRetries} for ${context || 'operation'} in ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    return { data: null, error: lastError, success: false };
}
