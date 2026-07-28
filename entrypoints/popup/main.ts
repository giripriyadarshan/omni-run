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

    // Asset status checkers
    const updateAssetStatus = async (asset: string, elementId: string, label: string) => {
      const el = doc.getElementById(elementId);
      if (!el) return;
      try {
        const exists = await opfsManager.hasAsset(asset);
        if (exists) {
          el.textContent = `Downloaded (${label})`;
          el.style.background = '#166534';
          el.style.color = '#4ade80';
        } else {
          el.textContent = 'Not Downloaded';
          el.style.background = '#374151';
          el.style.color = '#9ca3af';
        }
      } catch (_) {
        el.textContent = 'Not Downloaded';
      }
    };

    await updateAssetStatus('pyodide.wasm', 'status-pyodide', '12.4 MB');
    await updateAssetStatus('quickjs.wasm', 'status-quickjs', '0.8 MB');
    await updateAssetStatus('c2w_kernel.bin', 'status-container', '45.2 MB');
  } catch (err: any) {
    if (storageText) {
      storageText.textContent = 'Storage metadata unavailable';
    }
  }

  // Collapsible toggle handler
  const assetsToggle = doc.getElementById('assets-toggle');
  const assetsContainer = doc.getElementById('assets-container');
  const assetsChevron = doc.getElementById('assets-chevron');

  assetsToggle?.addEventListener('click', () => {
    if (!assetsContainer) return;
    const isHidden = assetsContainer.style.display === 'none';
    assetsContainer.style.display = isHidden ? 'block' : 'none';
    if (assetsChevron) {
      assetsChevron.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
    }
  });

  const byokInput = doc.getElementById('byok-api-key') as HTMLInputElement | null;
  const saveByokBtn = doc.getElementById('btn-save-byok') as HTMLButtonElement | null;
  const timeoutSelect = doc.getElementById('timeout-select') as HTMLSelectElement | null;

  if (typeof (globalThis as any).chrome !== 'undefined' && (globalThis as any).chrome.storage?.local) {
    (globalThis as any).chrome.storage.local.get(['geminiApiKey', 'executionTimeoutMs'], (res: any) => {
      if (res?.geminiApiKey && byokInput) {
        byokInput.value = res.geminiApiKey;
      }
      if (res?.executionTimeoutMs && timeoutSelect) {
        timeoutSelect.value = String(res.executionTimeoutMs);
      }
    });
  }

  timeoutSelect?.addEventListener('change', () => {
    const timeoutMs = parseInt(timeoutSelect.value, 10);
    if (typeof (globalThis as any).chrome !== 'undefined' && (globalThis as any).chrome.storage?.local) {
      (globalThis as any).chrome.storage.local.set({ executionTimeoutMs: timeoutMs });
    }
  });

  saveByokBtn?.addEventListener('click', () => {
    const key = byokInput?.value?.trim() || '';
    if (typeof (globalThis as any).chrome !== 'undefined' && (globalThis as any).chrome.storage?.local) {
      (globalThis as any).chrome.storage.local.set({ geminiApiKey: key }, () => {
        if (saveByokBtn) saveByokBtn.textContent = 'Saved!';
      });
    } else {
      if (saveByokBtn) saveByokBtn.textContent = 'Saved (Mock context)';
    }
  });

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
