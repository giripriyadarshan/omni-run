import { ExecutionResult, PyodideRunner } from '../workers/pyodide-runner';
import { QuickJSRunner } from '../workers/quickjs-runner';
import { ContainerRunner } from '../workers/container-runner';
import { ExecutionEngine } from './router';

export interface ExecutionPayload {
  engine: ExecutionEngine;
  code: string;
  options?: any;
}

export class IsolationManager {
  private OFFSCREEN_PATH = 'offscreen.html';

  public isOffscreenSupported(): boolean {
    return typeof (globalThis as any).chrome !== 'undefined' && typeof (globalThis as any).chrome?.offscreen !== 'undefined';
  }

  /**
   * Spawns an offscreen document configured with COOP/COEP response headers if not already active.
   */
  public async ensureOffscreenDocument(): Promise<void> {
    if (!this.isOffscreenSupported()) return;

    const chromeObj = (globalThis as any).chrome;
    const hasDoc = await chromeObj.offscreen.hasDocument();
    if (!hasDoc) {
      const url = chromeObj.runtime?.getURL ? chromeObj.runtime.getURL(this.OFFSCREEN_PATH) : this.OFFSCREEN_PATH;
      const reasons = [chromeObj.offscreen.Reason?.WORKERS || 'WORKERS'];
      await chromeObj.offscreen.createDocument({
        url,
        reasons,
        justification: 'WASM execution environment with COOP/COEP isolation',
      });
    }
  }

  /**
   * Sends code execution payload to offscreen document or falls back to direct runner execution.
   */
  public async executeInIsolation(payload: ExecutionPayload): Promise<ExecutionResult> {
    const cleanPayload: ExecutionPayload = {
      engine: payload.engine,
      code: String(payload.code || ''),
      options: payload.options ? JSON.parse(JSON.stringify(payload.options)) : undefined,
    };

    const chromeObj = (globalThis as any).chrome;
    if (typeof chromeObj !== 'undefined' && chromeObj.runtime?.sendMessage) {
      try {
        const result = await chromeObj.runtime.sendMessage({
          type: 'EXECUTE_WASM',
          payload: cleanPayload,
        });

        if (result) return result;
      } catch (_) {
        // Fallback to direct execution if message passing fails across sandbox boundaries
      }
    }

    // Direct execution fallback when offscreen API is not available (e.g. Firefox or test mocks)
    switch (payload.engine) {
      case 'pyodide': {
        const runner = new PyodideRunner();
        return await runner.runCode(payload.code);
      }
      case 'quickjs': {
        const runner = new QuickJSRunner();
        return await runner.runCode(payload.code);
      }
      case 'container2wasm': {
        const runner = new ContainerRunner();
        return await runner.runCode(payload.code, payload.options);
      }
      default: {
        const runner = new QuickJSRunner();
        return await runner.runCode(payload.code);
      }
    }
  }
}
