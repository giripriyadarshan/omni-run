import { OPFSManager } from './opfs';

export interface ByteRange {
  startByte: number;
  endByte: number;
}

export class Ext2BlockStreamer {
  private imageUrl: string;
  private blockSizeBytes: number;

  constructor(
    imageUrl: string = 'https://cdn.omni-run.org/c2w_disk.ext2',
    blockSizeBytes: number = 4096
  ) {
    this.imageUrl = imageUrl;
    this.blockSizeBytes = blockSizeBytes;
  }

  /**
   * Calculates starting and ending byte offsets for a given Ext2 disk block index.
   */
  public calculateByteRange(blockIndex: number): ByteRange {
    const startByte = blockIndex * this.blockSizeBytes;
    const endByte = startByte + this.blockSizeBytes - 1;
    return { startByte, endByte };
  }

  /**
   * Issues an HTTP GET request with a Range header to fetch a specific disk block chunk.
   */
  public async fetchBlock(
    blockIndex: number,
    customFetch: typeof fetch = fetch
  ): Promise<ArrayBuffer> {
    const { startByte, endByte } = this.calculateByteRange(blockIndex);
    const response = await customFetch(this.imageUrl, {
      headers: {
        Range: `bytes=${startByte}-${endByte}`,
      },
    });

    if (!response.ok && response.status !== 206) {
      throw new Error(`Failed to fetch Ext2 block ${blockIndex}: ${response.statusText}`);
    }

    return await response.arrayBuffer();
  }

  /**
   * Fetches an Ext2 disk block, using OPFS binary cache if available.
   */
  public async fetchAndCacheBlock(
    blockIndex: number,
    opfsManager: OPFSManager = new OPFSManager(),
    customFetch: typeof fetch = fetch
  ): Promise<ArrayBuffer> {
    const assetName = `ext2_block_${blockIndex}.bin`;

    const hasBlock = await opfsManager.hasAsset(assetName);
    if (hasBlock) {
      const cached = await opfsManager.getAsset(assetName);
      if (cached) return cached;
    }

    const fetched = await this.fetchBlock(blockIndex, customFetch);
    await opfsManager.storeAsset(assetName, fetched);
    return fetched;
  }
}
