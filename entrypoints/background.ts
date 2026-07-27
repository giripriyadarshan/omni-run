import { defineBackground } from 'wxt/sandbox';
import { MetricsCollector } from './core/benchmarks';
import { IsolationManager } from './core/isolation-manager';

export default defineBackground({
  main() {
    console.log('[Omni-Run] Background Service Worker Initialized');
    const collector = new MetricsCollector();
    const isolation = new IsolationManager();

    if (typeof (globalThis as any).chrome !== 'undefined' && (globalThis as any).chrome.runtime?.onMessage) {
      (globalThis as any).chrome.runtime.onMessage.addListener(
        (message: any, sender: any, sendResponse: (response?: any) => void) => {
          if (message?.type === 'EXECUTE_WASM') {
            (async () => {
              try {
                await isolation.ensureOffscreenDocument();
                const chromeObj = (globalThis as any).chrome;
                const result = await chromeObj.runtime.sendMessage({
                  target: 'offscreen',
                  type: 'EXECUTE_WASM',
                  payload: message.payload,
                });
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
            return true; // Keep channel open for async response
          }

          if (message?.type === 'RECORD_METRIC') {
            collector.record(message.payload);
            sendResponse({ success: true });
            return true;
          }

          if (message?.type === 'GET_METRICS') {
            sendResponse({
              metrics: collector.getMetrics(),
              kpi: collector.verifyKPIs(),
            });
            return true;
          }

          if (message?.type === 'PING') {
            sendResponse({ status: 'active', time: Date.now() });
            return true;
          }

          return false;
        }
      );
    }
  },
});

