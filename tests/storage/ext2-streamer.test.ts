import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Ext2BlockStreamer } from '../../entrypoints/storage/ext2-streamer';
import { OPFSManager } from '../../entrypoints/storage/opfs';

describe('Ext2BlockStreamer (HTTP Range Request Disk Block Fetcher)', () => {
  let streamer: Ext2BlockStreamer;

  beforeEach(() => {
    streamer = new Ext2BlockStreamer('https://cdn.example.com/c2w_disk.ext2');
  });

  it('should correctly calculate startByte and endByte for 4KB blocks', () => {
    const range0 = streamer.calculateByteRange(0);
    expect(range0).toEqual({ startByte: 0, endByte: 4095 });

    const range1 = streamer.calculateByteRange(1);
    expect(range1).toEqual({ startByte: 4096, endByte: 8191 });

    const range100 = streamer.calculateByteRange(100);
    expect(range100).toEqual({ startByte: 409600, endByte: 413695 });
  });

  it('should fetch disk block using HTTP Range header', async () => {
    const mockData = new Uint8Array([1, 2, 3, 4]).buffer;
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 206,
      arrayBuffer: async () => mockData,
    });

    const buffer = await streamer.fetchBlock(5, mockFetch as any);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://cdn.example.com/c2w_disk.ext2',
      expect.objectContaining({
        headers: {
          Range: 'bytes=20480-24575',
        },
      })
    );
    expect(buffer).toBe(mockData);
  });

  it('should retrieve block from OPFS cache if already present', async () => {
    const opfs = new OPFSManager();
    const mockData = new Uint8Array([10, 20, 30]).buffer;

    vi.spyOn(opfs, 'hasAsset').mockResolvedValue(true);
    vi.spyOn(opfs, 'getAsset').mockResolvedValue(mockData);

    const mockFetch = vi.fn();
    const buffer = await streamer.fetchAndCacheBlock(2, opfs, mockFetch as any);

    expect(opfs.hasAsset).toHaveBeenCalledWith('ext2_block_2.bin');
    expect(opfs.getAsset).toHaveBeenCalledWith('ext2_block_2.bin');
    expect(mockFetch).not.toHaveBeenCalled();
    expect(buffer).toBe(mockData);
  });
});
