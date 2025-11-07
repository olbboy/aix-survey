/**
 * better-auth API Route Handler
 * Handles all authentication endpoints
 */

import { auth } from '@/lib/auth/auth';

export const { GET, POST } = auth.handler;
