import { vi } from 'vitest';

// Mock WebExtension APIs globally for test suite
const chromeMock = {
  runtime: {
    sendMessage: vi.fn().mockResolvedValue(undefined),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    getURL: vi.fn((path: string) => `chrome-extension://mock-id/${path}`),
  },
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    },
  },
};

// Assign mock to global scope
(globalThis as any).chrome = chromeMock;
(globalThis as any).browser = chromeMock;
