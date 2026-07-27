import { ExecutionTier } from './router';

export interface ExecutionMetric {
  tier: ExecutionTier;
  engine: string;
  launchLatencyMs: number;
  executionTimeMs: number;
  cacheHit: boolean;
  timestamp?: number;
}

export interface KPIVerification {
  tier1LatencyOk: boolean;
  tier2BootOk: boolean;
  cacheHitRateOk: boolean;
}

export class MetricsCollector {
  private metrics: ExecutionMetric[] = [];

  public record(metric: Omit<ExecutionMetric, 'timestamp'>): void {
    this.metrics.push({
      ...metric,
      timestamp: Date.now(),
    });
  }

  public getMetrics(): ExecutionMetric[] {
    return [...this.metrics];
  }

  public getAverageLatencyMs(tier?: ExecutionTier): number {
    const filtered = tier ? this.metrics.filter((m) => m.tier === tier) : this.metrics;
    if (filtered.length === 0) return 0;
    const total = filtered.reduce((acc, curr) => acc + curr.launchLatencyMs, 0);
    return total / filtered.length;
  }

  public getCacheHitRate(): number {
    if (this.metrics.length === 0) return 1.0;
    const hits = this.metrics.filter((m) => m.cacheHit).length;
    return hits / this.metrics.length;
  }

  /**
   * Evaluates project KPIs against target thresholds:
   * - Tier 1 launch latency < 10ms
   * - Tier 2 warm boot time < 1000ms
   * - OPFS Cache hit rate >= 0.95 (95%)
   */
  public verifyKPIs(): KPIVerification {
    const tier1Avg = this.getAverageLatencyMs('tier1');
    const tier2Avg = this.getAverageLatencyMs('tier2');
    const hitRate = this.getCacheHitRate();

    return {
      tier1LatencyOk: tier1Avg === 0 || tier1Avg < 10.0,
      tier2BootOk: tier2Avg === 0 || tier2Avg < 1000.0,
      cacheHitRateOk: hitRate >= 0.95,
    };
  }

  public clear(): void {
    this.metrics = [];
  }
}
