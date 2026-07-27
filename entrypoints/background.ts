import { defineBackground } from 'wxt/sandbox';
import { MetricsCollector } from './core/benchmarks';

export default defineBackground({
  main() {
    console.log('[Omni-Run] Background Service Worker Initialized');
    const collector = new MetricsCollector();

    if (typeof (globalThis as any).chrome !== 'undefined' && (globalThis as any).chrome.runtime?.onMessage) {
      (globalThis as any).chrome.runtime.onMessage.addListener(
        (message: any, sender: any, sendResponse: (response?: any) => void) => {
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
