import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContainerRunner } from '../../entrypoints/workers/container-runner';

describe('ContainerRunner (Tier 2 OS Container Engine)', () => {
  let runner: ContainerRunner;

  beforeEach(() => {
    runner = new ContainerRunner();
  });

  it('should initialize with default timeout and configuration', () => {
    expect(runner).toBeDefined();
    expect(runner.getTimeoutMs()).toBe(30000);
  });

  it('should return Boot Failed error for bash commands', async () => {
    const code = 'echo "Hello from Linux Container"';
    const result = await runner.runCode(code);

    expect(result.success).toBe(false);
    expect(result.stderr).toContain('[WASM Boot Failed]');
  });

  it('should handle runtime errors by returning the Boot Failed error since the engine is mocked', async () => {
    const code = 'command_that_does_not_exist_xyz';
    const result = await runner.runCode(code);

    expect(result.success).toBe(false);
    expect(result.stderr).toContain('[WASM Boot Failed]');
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

  it('should return Boot Failed error for Rust code', async () => {
    const code = `fn main() {\n    println!("Hello, world!");\n}`;
    const result = await runner.runCode(code);

    expect(result.success).toBe(false);
    expect(result.stderr).toContain('[WASM Boot Failed]');
  });

  it('should return Boot Failed error for C code', async () => {
    const code = `#include <stdio.h>\nint main() {\n    printf("Hello\n");\n    return 0;\n}`;
    const result = await runner.runCode(code);

    expect(result.success).toBe(false);
    expect(result.stderr).toContain('[WASM Boot Failed]');
  });
});
