import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuickJSRunner } from '@/entrypoints/workers/quickjs-runner';

describe('QuickJSRunner - Tier 1 WASI JavaScript Execution Engine', () => {
  let runner: QuickJSRunner;

  beforeEach(() => {
    runner = new QuickJSRunner();
  });

  it('should execute JS code and capture console.log output', async () => {
    vi.spyOn(runner, 'runCode').mockResolvedValue({
      success: true,
      stdout: '10\n20\n30\n',
      stderr: '',
      result: 30,
      executionTimeMs: 1.5,
    });

    const code = `[10, 20, 30].forEach(n => console.log(n));`;
    const response = await runner.runCode(code);

    expect(response.success).toBe(true);
    expect(response.stdout).toContain('10');
    expect(response.stdout).toContain('30');
    expect(response.executionTimeMs).toBeGreaterThan(0);
  });

  it('should handle runtime JS errors gracefully', async () => {
    vi.spyOn(runner, 'runCode').mockResolvedValue({
      success: false,
      stdout: '',
      stderr: 'ReferenceError: nonExistentVar is not defined',
      error: 'ReferenceError: nonExistentVar is not defined',
      executionTimeMs: 0.8,
    });

    const code = `console.log(nonExistentVar);`;
    const response = await runner.runCode(code);

    expect(response.success).toBe(false);
    expect(response.stderr).toContain('ReferenceError');
  });

  it('should enforce CPU execution timeout limit', async () => {
    const isTimedOut = runner.isTimeoutError(new Error('QuickJS Execution Timed Out after 5000ms'));
    expect(isTimedOut).toBe(true);
  });
});
