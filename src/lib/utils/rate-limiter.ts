/**
 * Rate Limiter Utility
 * IP-based rate limiting to prevent API abuse
 */

import { NextRequest, NextResponse } from 'next/server';
import { log } from './logger';

/**
 * Rate limit record structure
 */
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

/**
 * In-memory rate limit store
 * In production, consider using Redis for distributed rate limiting
 */
const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the time window
   */
  limit: number;

  /**
   * Time window in seconds
   */
  window: number;

  /**
   * Optional identifier function (defaults to IP address)
   */
  identifier?: (request: NextRequest) => string;

  /**
   * Optional message to return when rate limited
   */
  message?: string;
}

/**
 * Default rate limit configurations
 */
export const RATE_LIMIT_CONFIGS = {
  // General API routes - 100 requests per minute
  API_DEFAULT: {
    limit: 100,
    window: 60,
  },
  // Authentication routes - 5 requests per minute
  AUTH: {
    limit: 5,
    window: 60,
    message: 'Too many authentication attempts. Please try again later.',
  },
  // Admin routes - 50 requests per minute
  ADMIN: {
    limit: 50,
    window: 60,
  },
  // File upload routes - 10 requests per minute
  FILE_UPLOAD: {
    limit: 10,
    window: 60,
  },
  // Export routes - 5 requests per minute
  EXPORT: {
    limit: 5,
    window: 60,
    message: 'Too many export requests. Please try again later.',
  },
} as const;

/**
 * Get client identifier from request (IP address)
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from headers (for proxied requests)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to connection IP
  return request.ip || 'unknown';
}

/**
 * Check if request should be rate limited
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { limited: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const windowMs = config.window * 1000;

  // Clean up expired entries periodically (every 1000 checks)
  if (Math.random() < 0.001) {
    cleanupExpiredEntries();
  }

  // Get or create rate limit record
  let record = rateLimitStore.get(identifier);

  if (!record || now > record.resetTime) {
    // Create new record or reset expired one
    record = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(identifier, record);

    return {
      limited: false,
      remaining: config.limit - 1,
      resetTime: record.resetTime,
    };
  }

  // Increment counter
  record.count++;

  // Check if limit exceeded
  if (record.count > config.limit) {
    log.warn('Rate limit exceeded', {
      identifier,
      count: record.count,
      limit: config.limit,
      window: config.window,
    });

    return {
      limited: true,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  return {
    limited: false,
    remaining: config.limit - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * Middleware function for rate limiting
 */
export function rateLimit(config: RateLimitConfig) {
  return async (request: NextRequest) => {
    const identifier = config.identifier
      ? config.identifier(request)
      : getClientIdentifier(request);

    const result = checkRateLimit(identifier, config);

    // Add rate limit headers
    const headers = new Headers();
    headers.set('X-RateLimit-Limit', config.limit.toString());
    headers.set('X-RateLimit-Remaining', result.remaining.toString());
    headers.set('X-RateLimit-Reset', result.resetTime.toString());

    if (result.limited) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
      headers.set('Retry-After', retryAfter.toString());

      return NextResponse.json(
        {
          error: config.message || 'Too many requests. Please try again later.',
          retryAfter,
        },
        {
          status: 429,
          headers,
        }
      );
    }

    return null; // Allow request
  };
}

/**
 * Create rate limit response with headers
 */
export function createRateLimitedResponse(
  config: RateLimitConfig,
  identifier: string
): NextResponse {
  const result = checkRateLimit(identifier, config);
  const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);

  return NextResponse.json(
    {
      error: config.message || 'Too many requests. Please try again later.',
      retryAfter,
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': config.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetTime.toString(),
        'Retry-After': retryAfter.toString(),
      },
    }
  );
}

/**
 * Clean up expired entries from the store
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [identifier, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(identifier);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    log.debug('Cleaned up expired rate limit entries', { count: cleaned });
  }
}

/**
 * Reset rate limit for a specific identifier
 * Useful for testing or manual overrides
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
  log.info('Rate limit reset', { identifier });
}

/**
 * Get current rate limit status for an identifier
 */
export function getRateLimitStatus(
  identifier: string,
  config: RateLimitConfig
): { count: number; remaining: number; resetTime: number } | null {
  const record = rateLimitStore.get(identifier);

  if (!record) {
    return null;
  }

  const now = Date.now();
  if (now > record.resetTime) {
    return null;
  }

  return {
    count: record.count,
    remaining: Math.max(0, config.limit - record.count),
    resetTime: record.resetTime,
  };
}

/**
 * Helper function to apply rate limiting in API routes
 */
export async function applyRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const identifier = config.identifier
    ? config.identifier(request)
    : getClientIdentifier(request);

  const result = checkRateLimit(identifier, config);

  if (result.limited) {
    return createRateLimitedResponse(config, identifier);
  }

  return null;
}
