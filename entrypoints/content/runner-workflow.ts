import { TierRouter } from '../core/router';
import { OPFSManager } from '../storage/opfs';
import { ConsentModal } from './consent-modal';
import { OutputDrawer } from './output-drawer';
import { IsolationManager } from '../core/isolation-manager';

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

  const analysis = router.analyzeCode(code, hintClass);

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

  // Initialize or locate OutputDrawer inside Shadow DOM
  let drawerElement = shadowRoot.querySelector<HTMLElement>('.omni-run-drawer');
  const drawer = new OutputDrawer();
  if (!drawerElement) {
    drawer.mount(shadowRoot);
  } else {
    // Re-bind drawer instance wrapper methods if host exists
    drawer.mount(shadowRoot);
  }

  drawer.setRunning();

  try {
    const result = await isolation.executeInIsolation({
      engine: analysis.engine,
      code,
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
