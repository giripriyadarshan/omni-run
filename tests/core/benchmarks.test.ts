import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsCollector } from '../../entrypoints/core/benchmarks';

describe('MetricsCollector (Performance Latency & KPI Monitor)', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  it('should record execution metrics and calculate average launch latency', () => {
    collector.record({
      tier: 'tier1',
      engine: 'quickjs',
      launchLatencyMs: 4.5,
      executionTimeMs: 12,
      cacheHit: true,
    });

    collector.record({
      tier: 'tier1',
      engine: 'quickjs',
      launchLatencyMs: 5.5,
      executionTimeMs: 10,
      cacheHit: true,
    });

    expect(collector.getMetrics().length).toBe(2);
    expect(collector.getAverageLatencyMs('tier1')).toBe(5.0);
  });

  it('should compute storage cache hit rate accurately', () => {
    // 19 hits out of 20 executions (95% hit rate)
    for (let i = 0; i < 19; i++) {
      collector.record({
        tier: 'tier1',
        engine: 'pyodide',
        launchLatencyMs: 3.0,
        executionTimeMs: 8,
        cacheHit: true,
      });
    }
    collector.record({
      tier: 'tier2',
      engine: 'container2wasm',
      launchLatencyMs: 250,
      executionTimeMs: 500,
      cacheHit: false,
    });

    expect(collector.getCacheHitRate()).toBe(0.95);
  });

  it('should verify project KPIs against latency targets', () => {
    collector.record({
      tier: 'tier1',
      engine: 'quickjs',
      launchLatencyMs: 6.0, // < 10ms target
      executionTimeMs: 5,
      cacheHit: true,
    });

    collector.record({
      tier: 'tier2',
      engine: 'container2wasm',
      launchLatencyMs: 450.0, // < 1000ms target
      executionTimeMs: 300,
      cacheHit: true,
    });

    const kpi = collector.verifyKPIs();
    expect(kpi.tier1LatencyOk).toBe(true);
    expect(kpi.tier2BootOk).toBe(true);
    expect(kpi.cacheHitRateOk).toBe(true);
  });
});
