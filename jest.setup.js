/**
 * Jest Setup File
 * Global test configuration and environment setup
 */

// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock environment variables for testing
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing-only';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.REDIS_URL = 'redis://localhost:6379';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    route: '/',
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn((key) => null),
  }),
  usePathname: () => '/',
  useParams: () => ({}),
}));

// Increase timeout for integration tests
jest.setTimeout(30000);
