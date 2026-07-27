import { PyodideRunner } from './pyodide-runner';
import { QuickJSRunner } from './quickjs-runner';
import { ContainerRunner } from './container-runner';
import { ExecutionPayload } from '../core/isolation-manager';

// Offscreen message listener
if (typeof (globalThis as any).chrome !== 'undefined' && (globalThis as any).chrome.runtime?.onMessage) {
  (globalThis as any).chrome.runtime.onMessage.addListener(
    (message: any, sender: any, sendResponse: (response?: any) => void) => {
      if (message?.target !== 'offscreen' || message?.type !== 'EXECUTE_WASM') {
        return false;
      }

      const payload: ExecutionPayload = message.payload;

      (async () => {
        try {
          let result;
          if (payload.engine === 'pyodide') {
            const runner = new PyodideRunner();
            result = await runner.runCode(payload.code);
          } else if (payload.engine === 'quickjs') {
            const runner = new QuickJSRunner();
            result = await runner.runCode(payload.code);
          } else if (payload.engine === 'container2wasm') {
            const runner = new ContainerRunner();
            result = await runner.runCode(payload.code, payload.options);
          } else {
            const runner = new QuickJSRunner();
            result = await runner.runCode(payload.code);
          }
          sendResponse(result);
        } catch (err: any) {
          sendResponse({
            success: false,
            stdout: '',
            stderr: err?.message || String(err),
            error: err?.message || String(err),
            executionTimeMs: 0,
          });
        }
      })();

      return true; // Keep message channel open for async response
    }
  );
}
