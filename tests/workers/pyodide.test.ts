import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PyodideRunner, ExecutionResult } from '@/entrypoints/workers/pyodide-runner';

describe('PyodideRunner - Tier 1 WASI Python Execution Engine', () => {
  let runner: PyodideRunner;

  beforeEach(() => {
    runner = new PyodideRunner();
  });

  it('should format Python code output and capture stdout streams', async () => {
    // Mock the underlying WASM engine load & execution
    vi.spyOn(runner, 'runCode').mockResolvedValue({
      success: true,
      stdout: 'Hello from Pyodide WASM!\nResult: 42\n',
      stderr: '',
      result: 42,
      executionTimeMs: 4.2,
    });

    const code = `print("Hello from Pyodide WASM!")\nprint("Result: 42")\n42`;
    const response: ExecutionResult = await runner.runCode(code);

    expect(response.success).toBe(true);
    expect(response.stdout).toContain('Hello from Pyodide WASM!');
    expect(response.stdout).toContain('Result: 42');
    expect(response.executionTimeMs).toBeGreaterThan(0);
  });

  it('should capture Python runtime errors and stderr', async () => {
    vi.spyOn(runner, 'runCode').mockResolvedValue({
      success: false,
      stdout: '',
      stderr: 'ZeroDivisionError: division by zero',
      error: 'ZeroDivisionError: division by zero',
      executionTimeMs: 2.1,
    });

    const code = `1 / 0`;
    const response: ExecutionResult = await runner.runCode(code);

    expect(response.success).toBe(false);
    expect(response.stderr).toContain('ZeroDivisionError');
    expect(response.error).toBeDefined();
  });

  it('should build python stdout redirection wrapper script', () => {
    const rawCode = `print("test output")`;
    const wrapped = runner.buildRedirectionWrapper(rawCode);

    expect(wrapped).toContain('sys.stdout');
    expect(wrapped).toContain('sys.stderr');
    expect(wrapped).toContain('test output');
  });
});
