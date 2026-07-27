import { OPFSManager } from '../storage/opfs';

export async function initPopupUI(
  doc: Document = document,
  opfsManager: OPFSManager = new OPFSManager()
): Promise<void> {
  const storageText = doc.getElementById('storage-text');
  const clearBtn = doc.getElementById('btn-clear-opfs') as HTMLButtonElement | null;

  try {
    const metadata = await opfsManager.getStorageMetadata();
    const usageMB = (metadata.usageBytes / (1024 * 1024)).toFixed(1);
    const quotaMB = (metadata.quotaBytes / (1024 * 1024)).toFixed(1);

    if (storageText) {
      storageText.textContent = `${usageMB} MB / ${quotaMB} MB used`;
    }
  } catch (err: any) {
    if (storageText) {
      storageText.textContent = 'Storage metadata unavailable';
    }
  }

  clearBtn?.addEventListener('click', async () => {
    try {
      const knownAssets = ['pyodide.wasm', 'quickjs.wasm', 'c2w_kernel.bin'];
      for (const asset of knownAssets) {
        await opfsManager.removeAsset(asset);
      }
      if (storageText) {
        storageText.textContent = '0.0 MB / 1024.0 MB used (Cache Cleared)';
      }
    } catch (err: any) {
      if (storageText) {
        storageText.textContent = 'Error clearing storage cache';
      }
    }
  });
}

// Auto-run if executed in browser window context
if (typeof window !== 'undefined' && document.getElementById('popup-app')) {
  initPopupUI();
}
