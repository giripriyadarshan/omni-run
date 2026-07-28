import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DOMScanner } from '../../entrypoints/content/scanner';
import { OPFSManager } from '../../entrypoints/storage/opfs';
import { executeCodeBlockWorkflow } from '../../entrypoints/content/runner-workflow';

describe('End-to-End WASM Execution Workflow', () => {
  // Mock PyodideRunner to avoid actual WASM loading in Node.js environment
  vi.mock('../../entrypoints/workers/pyodide-runner', async (importOriginal) => {
    const actual = await importOriginal<any>();
    return {
      ...actual,
      PyodideRunner: vi.fn().mockImplementation(() => {
        return {
          runCode: vi.fn().mockResolvedValue({
            success: true,
            stdout: 'End-to-End Workflow Test\n',
            stderr: '',
            executionTimeMs: 10,
          }),
          initRuntime: vi.fn().mockResolvedValue(undefined),
          buildRedirectionWrapper: actual.PyodideRunner.prototype.buildRedirectionWrapper,
        };
      }),
    };
  });

  let scanner: DOMScanner;
  let opfsManager: OPFSManager;

  beforeEach(() => {
    document.body.innerHTML = `
      <pre class="language-python">
        <code id="code-target">print("End-to-End Workflow Test")</code>
      </pre>
    `;
    (globalThis as any).ai = {
      languageModel: {
        create: vi.fn().mockResolvedValue({
          prompt: vi.fn().mockResolvedValue('{"language": "python"}'),
        }),
      },
    };
    scanner = new DOMScanner();
    opfsManager = new OPFSManager();
    vi.clearAllMocks();
  });

  it('should run OPFS cache check, prompt consent if uncached, and execute code to output drawer', async () => {
    const codeEl = document.getElementById('code-target') as HTMLElement;
    const host = scanner.injectRunnerUI(codeEl);
    const shadow = host.shadowRoot!;

    vi.spyOn(opfsManager, 'hasAsset').mockResolvedValue(false);
    vi.spyOn(opfsManager, 'storeAsset').mockResolvedValue(undefined);

    await executeCodeBlockWorkflow(codeEl, shadow, {
      autoConfirmConsent: true,
      opfsManager,
    });

    const drawer = shadow.querySelector('.omni-run-drawer');
    expect(drawer).not.toBeNull();

    const statusBadge = shadow.querySelector('.status-badge');
    const stdout = shadow.querySelector('.drawer-stdout');

    expect(statusBadge?.textContent).toContain('Success');
    expect(stdout?.textContent).toContain('End-to-End Workflow Test');
  });

  it('should skip consent modal if asset is already cached in OPFS', async () => {
    const codeEl = document.getElementById('code-target') as HTMLElement;
    const host = scanner.injectRunnerUI(codeEl);
    const shadow = host.shadowRoot!;

    vi.spyOn(opfsManager, 'hasAsset').mockResolvedValue(true);

    const consentSpy = vi.fn();
    await executeCodeBlockWorkflow(codeEl, shadow, {
      onConsentPrompt: consentSpy,
      opfsManager,
    });

    expect(consentSpy).not.toHaveBeenCalled();

    const statusBadge = shadow.querySelector('.status-badge');
    expect(statusBadge?.textContent).toContain('Success');
  });

  it('should abort execution if user cancels consent modal', async () => {
    const codeEl = document.getElementById('code-target') as HTMLElement;
    const host = scanner.injectRunnerUI(codeEl);
    const shadow = host.shadowRoot!;

    vi.spyOn(opfsManager, 'hasAsset').mockResolvedValue(false);

    await executeCodeBlockWorkflow(codeEl, shadow, {
      autoConfirmConsent: false, // User declines
      opfsManager,
    });

    const statusBadge = shadow.querySelector('.status-badge');
    expect(statusBadge?.textContent || '').not.toContain('Success');
  });
});
