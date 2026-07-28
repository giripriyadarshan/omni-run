import { TierRouter } from '../core/router';
import { OPFSManager } from '../storage/opfs';
import { ConsentModal, AIConfigModal } from './consent-modal';
import { OutputDrawer } from './output-drawer';
import { IsolationManager } from '../core/isolation-manager';

import { AILanguageDetector } from '../core/ai-detector';

export interface WorkflowOptions {
  autoConfirmConsent?: boolean;
  onConsentPrompt?: () => void;
  opfsManager?: OPFSManager;
}

export async function executeCodeBlockWorkflow(
  codeBlock: HTMLElement,
  shadowRoot: ShadowRoot,
  options: WorkflowOptions = {}
): Promise<void> {
  const router = new TierRouter();
  const opfs = options.opfsManager || new OPFSManager();
  const isolation = new IsolationManager();

  // Check BYOK API Key and custom Execution Timeout from local storage
  let apiKey = '';
  let timeoutMs = 30000;
  if (typeof (globalThis as any).chrome?.storage?.local?.get === 'function') {
    try {
      const res = await Promise.race([
        new Promise<any>((resolve) => {
          (globalThis as any).chrome.storage.local.get(['geminiApiKey', 'executionTimeoutMs'], (r: any) => resolve(r));
        }),
        new Promise<any>((resolve) => setTimeout(() => resolve(null), 100)),
      ]);
      apiKey = res?.geminiApiKey || '';
      if (res?.executionTimeoutMs) timeoutMs = parseInt(res.executionTimeoutMs, 10);
    } catch (_) {}
  }

  const hasBuiltinAI = AILanguageDetector.hasBuiltinAI();
  if (!hasBuiltinAI && !apiKey) {
    // Firefox / browser without built-in AI: show AIConfigModal popup
    const modal = new AIConfigModal();
    modal.mount(document.body);
    return;
  }

  // Find inner code or pre element if available
  const innerCodeEl = codeBlock.querySelector<HTMLElement>('code, pre');

  // Clone element to safely remove non-code UI elements (decorations, headers, copy buttons, runner host)
  const clone = codeBlock.cloneNode(true) as HTMLElement;
  const noiseSelectors = [
    '.code-block-decoration',
    '.code-header',
    '.omni-run-host',
    '.copy-code-button',
    'button',
  ];
  noiseSelectors.forEach((selector) => {
    clone.querySelectorAll(selector).forEach((el) => el.remove());
  });

  const code = (innerCodeEl ? innerCodeEl.textContent : clone.textContent)?.trim() || '';

  const headerText = codeBlock.querySelector('.code-block-decoration, .code-header')?.textContent || '';
  const hintClass = [
    codeBlock.className,
    codeBlock.getAttribute('language') || '',
    codeBlock.getAttribute('lang') || '',
    innerCodeEl?.className || '',
    codeBlock.parentElement?.className || '',
    headerText,
  ].join(' ');

  const analysis = await router.analyzeCode(code, hintClass, { apiKey });

  let assetName = 'quickjs.wasm';
  let sizeMB = 0.8;

  if (analysis.engine === 'pyodide') {
    assetName = 'pyodide.wasm';
    sizeMB = 12.4;
  } else if (analysis.engine === 'container2wasm') {
    assetName = 'c2w_kernel.bin';
    sizeMB = 45.2;
  }

  // OPFS asset cache check
  const hasCachedAsset = await opfs.hasAsset(assetName);

  if (!hasCachedAsset) {
    if (options.onConsentPrompt) {
      options.onConsentPrompt();
    }

    if (options.autoConfirmConsent === false) {
      // User declined consent
      return;
    }

    let confirmed = false;
    if (options.autoConfirmConsent === true) {
      confirmed = true;
    } else {
      confirmed = await new Promise<boolean>((resolve) => {
        const modal = new ConsentModal({
          title: 'Permission Required',
          assetName,
          sizeMB,
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false),
        });
        modal.mount();
      });
    }

    if (!confirmed) {
      return;
    }

    // Cache dummy asset buffer upon user consent
    await opfs.storeAsset(assetName, new ArrayBuffer(1024));
  }

  // Locate or initialize singleton OutputDrawer on Shadow DOM host
  let drawer: OutputDrawer = (shadowRoot as any).__omniDrawer;
  if (!drawer) {
    drawer = new OutputDrawer();
    drawer.mount(shadowRoot);
    (shadowRoot as any).__omniDrawer = drawer;
  } else {
    drawer.mount(shadowRoot);
  }

  drawer.setRunning();

  try {
    const result = await isolation.executeInIsolation({
      engine: analysis.engine,
      code,
      options: { timeoutMs },
    });

    if (result.success) {
      drawer.setSuccess(result);
    } else {
      drawer.setError(result);
    }
  } catch (err: any) {
    drawer.setError(err?.message || String(err));
  }
}
