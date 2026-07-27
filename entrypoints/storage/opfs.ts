export interface StorageMetadata {
  usageBytes: number;
  quotaBytes: number;
}

export class OPFSManager {
  /**
   * Helper to retrieve the Origin Private File System root directory handle.
   */
  private async getRootDir(): Promise<FileSystemDirectoryHandle> {
    if (!navigator?.storage?.getDirectory) {
      throw new Error('OPFS (Origin Private File System) is not supported in this environment.');
    }
    return await navigator.storage.getDirectory();
  }

  /**
   * Checks whether a binary WASM asset or container block exists in OPFS storage.
   */
  public async hasAsset(assetName: string): Promise<boolean> {
    try {
      const rootDir = await this.getRootDir();
      await rootDir.getFileHandle(assetName);
      return true;
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        return false;
      }
      return false;
    }
  }

  /**
   * Stores a binary asset (e.g. pyodide.wasm, c2w_kernel.bin) into OPFS storage.
   */
  public async storeAsset(assetName: string, data: ArrayBuffer): Promise<void> {
    const rootDir = await this.getRootDir();
    const fileHandle = await rootDir.getFileHandle(assetName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(data);
    await writable.close();
  }

  /**
   * Retrieves a binary asset from OPFS storage as an ArrayBuffer.
   */
  public async getAsset(assetName: string): Promise<ArrayBuffer | null> {
    try {
      const rootDir = await this.getRootDir();
      const fileHandle = await rootDir.getFileHandle(assetName);
      const file = await fileHandle.getFile();
      return await file.arrayBuffer();
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        return null;
      }
      throw err;
    }
  }

  /**
   * Removes a specific asset file from OPFS storage.
   */
  public async removeAsset(assetName: string): Promise<void> {
    try {
      const rootDir = await this.getRootDir();
      await rootDir.removeEntry(assetName);
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        throw err;
      }
    }
  }

  /**
   * Estimates current OPFS storage usage and quota.
   */
  public async getStorageMetadata(): Promise<StorageMetadata> {
    if (navigator?.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        usageBytes: estimate.usage || 0,
        quotaBytes: estimate.quota || 0,
      };
    }
    return { usageBytes: 0, quotaBytes: 0 };
  }
}
