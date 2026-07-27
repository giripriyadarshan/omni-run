import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OPFSManager } from '../../entrypoints/storage/opfs';
import { initPopupUI } from '../../entrypoints/popup/main';

describe('Extension Popup Dashboard UI', () => {
  let opfs: OPFSManager;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="popup-app">
        <h2 class="popup-title">Omni-Run Local Storage</h2>
        <div id="storage-text">Loading...</div>
        <button id="btn-clear-opfs">Clear Storage Cache</button>
      </div>
    `;
    opfs = new OPFSManager();
    vi.clearAllMocks();
  });

  it('should initialize popup UI and display OPFS storage usage metadata', async () => {
    vi.spyOn(opfs, 'getStorageMetadata').mockResolvedValue({
      usageBytes: 15 * 1024 * 1024, // 15MB
      quotaBytes: 1024 * 1024 * 1024, // 1GB
    });

    await initPopupUI(document, opfs);

    const storageText = document.getElementById('storage-text');
    expect(storageText?.textContent).toContain('15.0 MB');
    expect(storageText?.textContent).toContain('1024.0 MB');
  });

  it('should clear OPFS cache when clear button is clicked', async () => {
    vi.spyOn(opfs, 'getStorageMetadata').mockResolvedValue({
      usageBytes: 10 * 1024 * 1024,
      quotaBytes: 1024 * 1024 * 1024,
    });
    const removeSpy = vi.spyOn(opfs, 'removeAsset').mockResolvedValue(undefined);

    await initPopupUI(document, opfs);

    const clearBtn = document.getElementById('btn-clear-opfs') as HTMLButtonElement;
    clearBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(removeSpy).toHaveBeenCalledWith('pyodide.wasm');
    expect(removeSpy).toHaveBeenCalledWith('quickjs.wasm');
    expect(removeSpy).toHaveBeenCalledWith('c2w_kernel.bin');
  });
});
