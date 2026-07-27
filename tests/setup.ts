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

// Mock navigator.storage OPFS API globally
const mockDirectoryMap = new Map<string, ArrayBuffer>();

const mockRootDir = {
  getFileHandle: vi.fn(async (name: string, options?: { create?: boolean }) => {
    if (!options?.create && !mockDirectoryMap.has(name)) {
      const err = new Error('File not found');
      err.name = 'NotFoundError';
      throw err;
    }

    return {
      getFile: async () => {
        const buf = mockDirectoryMap.get(name) || new ArrayBuffer(0);
        return {
          arrayBuffer: async () => buf,
          size: buf.byteLength,
        };
      },
      createWritable: async () => {
        return {
          write: async (data: ArrayBuffer) => {
            mockDirectoryMap.set(name, data);
          },
          close: async () => {},
        };
      },
    };
  }),
  removeEntry: vi.fn(async (name: string) => {
    mockDirectoryMap.delete(name);
  }),
};

if (typeof (globalThis as any).navigator !== 'undefined') {
  (globalThis as any).navigator.storage = {
    getDirectory: vi.fn().mockResolvedValue(mockRootDir),
    estimate: vi.fn().mockResolvedValue({ usage: 1024 * 1024 * 15, quota: 1024 * 1024 * 1024 }),
  };
}
