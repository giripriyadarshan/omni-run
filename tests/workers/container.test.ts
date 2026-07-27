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

  it('should execute Rust code block and return stdout of println! instead of raw source code', async () => {
    const code = `fn main() {\n    println!("Hello, world!");\n}`;
    const result = await runner.runCode(code);

    expect(result.success).toBe(true);
    expect(result.stdout.trim()).toBe('Hello, world!');
    expect(result.stderr).toBe('');
  });

  it('should execute Rust code block with struct debug formatting {:?} and methods', async () => {
    const code = `#[derive(Debug)]\nstruct Rectangle { width: u32, height: u32 }\nfn main() {\n    let rect = Rectangle { width: 30, height: 50 };\n    println!("The rect is {:?}", rect);\n    println!("The area of the rectangle is {} square pixels.", rect.area());\n}`;
    const result = await runner.runCode(code);

    expect(result.success).toBe(true);
    expect(result.stdout).toContain('The rect is Rectangle { width: 30, height: 50 }');
    expect(result.stdout).toContain('The area of the rectangle is 1500 square pixels.');
  });

  it('should execute C code with printf format strings and arguments', async () => {
    const code = `#include <stdio.h>\nint main() {\n    float radius = 5.0;\n    float area = 78.54;\n    printf("Circle Radius: %.2f\\n", radius);\n    printf("Area: %.2f\\n", area);\n    return 0;\n}`;
    const result = await runner.runCode(code);

    expect(result.success).toBe(true);
    expect(result.stdout).toContain('Circle Radius: 5.00');
    expect(result.stdout).toContain('Area: 78.54');
  });
});
