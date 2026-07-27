import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IsolationManager } from '../../entrypoints/core/isolation-manager';

describe('IsolationManager (Chrome Offscreen / COOP-COEP Isolation)', () => {
  let isolationManager: IsolationManager;

  beforeEach(() => {
    isolationManager = new IsolationManager();
    vi.clearAllMocks();
  });

  it('should initialize and check offscreen document availability', async () => {
    const isSupported = isolationManager.isOffscreenSupported();
    expect(typeof isSupported).toBe('boolean');
  });

  it('should call chrome.offscreen.createDocument when offscreen API is available', async () => {
    const mockCreateDocument = vi.fn().mockResolvedValue(undefined);
    const mockHasDocument = vi.fn().mockResolvedValue(false);

    (globalThis as any).chrome = {
      ...globalThis.chrome,
      offscreen: {
        createDocument: mockCreateDocument,
        hasDocument: mockHasDocument,
        Reason: { WORKERS: 'WORKERS' },
      },
    };

    await isolationManager.ensureOffscreenDocument();

    expect(mockHasDocument).toHaveBeenCalled();
    expect(mockCreateDocument).toHaveBeenCalledWith({
      url: expect.stringContaining('offscreen.html'),
      reasons: ['WORKERS'],
      justification: expect.any(String),
    });
  });

  it('should dispatch execution payload via chrome.runtime.sendMessage', async () => {
    const mockSendMessage = vi.fn().mockResolvedValue({
      success: true,
      stdout: 'Isolated stdout output',
      stderr: '',
      executionTimeMs: 15,
    });

    (globalThis as any).chrome.runtime.sendMessage = mockSendMessage;

    const payload = {
      engine: 'container2wasm' as const,
      code: 'echo "Isolated Container"',
    };

    const result = await isolationManager.executeInIsolation(payload);

    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        target: 'offscreen',
        type: 'EXECUTE_WASM',
        payload,
      })
    );
    expect(result.success).toBe(true);
    expect(result.stdout).toBe('Isolated stdout output');
  });

  it('should fallback to direct engine execution when offscreen API is unavailable', async () => {
    delete (globalThis as any).chrome.offscreen;

    const payload = {
      engine: 'quickjs' as const,
      code: 'console.log("Direct Fallback")',
    };

    const result = await isolationManager.executeInIsolation(payload);

    expect(result.success).toBe(true);
    expect(result.stdout).toContain('Direct Fallback');
  });
});
