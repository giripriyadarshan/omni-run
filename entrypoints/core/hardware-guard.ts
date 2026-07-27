import { ExecutionTier } from './router';

export interface EvaluationResult {
  safeTier: ExecutionTier;
  downgraded: boolean;
  reason?: string;
}

export class HardwareGuard {
  private minTier2RAMGB: number;

  constructor(minTier2RAMGB: number = 4) {
    this.minTier2RAMGB = minTier2RAMGB;
  }

  public getDeviceMemoryGB(): number {
    if (typeof (globalThis as any).navigator !== 'undefined' && 'deviceMemory' in (globalThis as any).navigator) {
      return (globalThis as any).navigator.deviceMemory || 8;
    }
    return 8; // Default fallback for unknown browsers
  }

  public isTier2Supported(): boolean {
    return this.getDeviceMemoryGB() >= this.minTier2RAMGB;
  }

  /**
   * Evaluates requested execution tier against client device hardware memory specifications.
   */
  public evaluateExecutionTier(requestedTier: ExecutionTier): EvaluationResult {
    const memory = this.getDeviceMemoryGB();

    if (requestedTier === 'tier2' && !this.isTier2Supported()) {
      return {
        safeTier: 'tier1',
        downgraded: true,
        reason: `Device RAM is under ${this.minTier2RAMGB}GB (detected memory: ${memory}GB). Downgraded to Tier 1 WASI engine for browser tab stability.`,
      };
    }

    return {
      safeTier: requestedTier,
      downgraded: false,
    };
  }
}
