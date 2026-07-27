import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HardwareGuard } from '../../entrypoints/core/hardware-guard';

describe('HardwareGuard (Hardware Concurrency & RAM Guard)', () => {
  let guard: HardwareGuard;

  beforeEach(() => {
    guard = new HardwareGuard();
  });

  it('should detect device memory in GB', () => {
    (globalThis as any).navigator.deviceMemory = 8;
    expect(guard.getDeviceMemoryGB()).toBe(8);
  });

  it('should approve Tier 2 OS container execution when system RAM >= 4GB', () => {
    (globalThis as any).navigator.deviceMemory = 8;
    expect(guard.isTier2Supported()).toBe(true);

    const evaluation = guard.evaluateExecutionTier('tier2');
    expect(evaluation.safeTier).toBe('tier2');
    expect(evaluation.downgraded).toBe(false);
  });

  it('should downgrade Tier 2 to Tier 1 when system RAM < 4GB', () => {
    (globalThis as any).navigator.deviceMemory = 2; // Low memory device (e.g. 2GB)
    expect(guard.isTier2Supported()).toBe(false);

    const evaluation = guard.evaluateExecutionTier('tier2');
    expect(evaluation.safeTier).toBe('tier1');
    expect(evaluation.downgraded).toBe(true);
    expect(evaluation.reason).toContain('under 4GB');
  });
});
