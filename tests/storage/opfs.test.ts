import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OPFSManager } from '@/entrypoints/storage/opfs';

describe('OPFSManager - Origin Private File System Binary Cache Manager', () => {
  let manager: OPFSManager;
  let mockDirectoryMap: Map<string, ArrayBuffer>;

  beforeEach(() => {
    mockDirectoryMap = new Map();

    // Mock OPFS navigator.storage.getDirectory API
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
      values: async function* () {
        for (const [name, buffer] of mockDirectoryMap.entries()) {
          yield {
            name,
            getFile: async () => new Blob([buffer]),
          };
        }
      },
    };

    (globalThis as any).navigator.storage = {
      getDirectory: vi.fn().mockResolvedValue(mockRootDir),
      estimate: vi.fn().mockResolvedValue({ usage: 1024 * 1024 * 15, quota: 1024 * 1024 * 1024 }),
    };

    manager = new OPFSManager();
  });

  it('should return false for missing asset in OPFS', async () => {
    const exists = await manager.hasAsset('pyodide.wasm');
    expect(exists).toBe(false);
  });

  it('should store and retrieve binary WASM assets from OPFS', async () => {
    const sampleBinary = new TextEncoder().encode('wasm binary stream content').buffer;

    await manager.storeAsset('quickjs.wasm', sampleBinary);

    const exists = await manager.hasAsset('quickjs.wasm');
    expect(exists).toBe(true);

    const retrieved = await manager.getAsset('quickjs.wasm');
    expect(retrieved).not.toBeNull();
    const text = new TextDecoder().decode(retrieved!);
    expect(text).toBe('wasm binary stream content');
  });

  it('should remove specific asset and clear entire binary cache', async () => {
    const sampleBinary = new TextEncoder().encode('dummy container').buffer;
    await manager.storeAsset('c2w_kernel.bin', sampleBinary);

    await manager.removeAsset('c2w_kernel.bin');
    const exists = await manager.hasAsset('c2w_kernel.bin');
    expect(exists).toBe(false);
  });

  it('should return total storage usage metadata', async () => {
    const metadata = await manager.getStorageMetadata();
    expect(metadata.usageBytes).toBeGreaterThan(0);
    expect(metadata.quotaBytes).toBeGreaterThan(0);
  });
});
