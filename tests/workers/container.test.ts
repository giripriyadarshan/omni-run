import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContainerRunner } from '../../entrypoints/workers/container-runner';

describe('ContainerRunner (Tier 2 OS Container Engine)', () => {
  let runner: ContainerRunner;

  beforeEach(() => {
    runner = new ContainerRunner();
  });

  it('should initialize with default timeout and configuration', () => {
    expect(runner).toBeDefined();
    expect(runner.getTimeoutMs()).toBe(10000);
  });

  it('should execute bash/C++ commands and return structured stdout and execution metrics', async () => {
    const code = 'echo "Hello from Linux Container"';
    const result = await runner.runCode(code);

    expect(result.success).toBe(true);
    expect(result.stdout).toContain('Hello from Linux Container');
    expect(result.stderr).toBe('');
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('should handle runtime errors and return stderr', async () => {
    const code = 'command_that_does_not_exist_xyz';
    const result = await runner.runCode(code);

    expect(result.success).toBe(false);
    expect(result.stderr).toContain('command_that_does_not_exist_xyz: command not found');
    expect(result.error).toBeDefined();
  });

  it('should enforce execution timeout for long-running scripts', async () => {
    const shortTimeoutRunner = new ContainerRunner(100);
    const code = 'sleep 5';
    const result = await shortTimeoutRunner.runCode(code, { simulatedDelayMs: 300 });

    expect(result.success).toBe(false);
    expect(result.stderr.toLowerCase()).toContain('timed out');
    expect(shortTimeoutRunner.isTimeoutError(result.error)).toBe(true);
  });
});
