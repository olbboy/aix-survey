/**
 * Redis Client for Autosave
 * Handles guest assessment drafts with 30-day TTL
 */

import Redis from 'ioredis';

// Create Redis client singleton
const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    reconnectOnError(err) {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        // Reconnect on specific errors
        return true;
      }
      return false;
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

/**
 * Redis key patterns
 */
export const RedisKeys = {
  assessmentDraft: (sessionId: string) => `assessment:draft:${sessionId}`,
  assessmentProgress: (sessionId: string) => `assessment:progress:${sessionId}`,
};

/**
 * Assessment draft data structure
 */
export interface AssessmentDraft {
  assessmentId: string;
  templateVersion: string;
  industry?: string;
  size?: string;
  region?: string;
  responses: {
    [itemId: string]: {
      score: number | null;
      currentState?: string;
      evidences?: string[];
    };
  };
  currentDomain?: string;
  updatedAt: string;
}

/**
 * Save assessment draft to Redis
 */
export async function saveAssessmentDraft(
  sessionId: string,
  draft: AssessmentDraft
): Promise<void> {
  const key = RedisKeys.assessmentDraft(sessionId);
  const ttl = 30 * 24 * 60 * 60; // 30 days in seconds

  await redis.setex(key, ttl, JSON.stringify(draft));
}

/**
 * Get assessment draft from Redis
 */
export async function getAssessmentDraft(
  sessionId: string
): Promise<AssessmentDraft | null> {
  const key = RedisKeys.assessmentDraft(sessionId);
  const data = await redis.get(key);

  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to parse assessment draft:', error);
    return null;
  }
}

/**
 * Delete assessment draft (after linking to user account)
 */
export async function deleteAssessmentDraft(sessionId: string): Promise<void> {
  const key = RedisKeys.assessmentDraft(sessionId);
  await redis.del(key);
}

/**
 * Save progress (for quick lookup)
 */
export async function saveProgress(
  sessionId: string,
  progress: number
): Promise<void> {
  const key = RedisKeys.assessmentProgress(sessionId);
  const ttl = 30 * 24 * 60 * 60; // 30 days

  await redis.setex(key, ttl, progress.toString());
}

/**
 * Get progress
 */
export async function getProgress(sessionId: string): Promise<number | null> {
  const key = RedisKeys.assessmentProgress(sessionId);
  const data = await redis.get(key);

  if (!data) {
    return null;
  }

  return parseInt(data, 10);
}

/**
 * Check Redis connection
 */
export async function checkRedisConnection(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error('Redis connection error:', error);
    return false;
  }
}

/**
 * Gracefully disconnect Redis
 */
export async function disconnectRedis(): Promise<void> {
  await redis.quit();
}
