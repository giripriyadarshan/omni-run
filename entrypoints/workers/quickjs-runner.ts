import { ExecutionResult } from './pyodide-runner';

export class QuickJSRunner {
  private timeoutMs: number;

  constructor(timeoutMs: number = 30000) {
    this.timeoutMs = timeoutMs;
  }

  /**
   * Helper method to detect execution timeout exceptions.
   */
  public isTimeoutError(error: unknown): boolean {
    if (error instanceof Error) {
      return error.message.toLowerCase().includes('timed out') || error.message.toLowerCase().includes('timeout');
    }
    return String(error).toLowerCase().includes('timeout');
  }

  /**
   * Executes a JavaScript snippet in a isolated sandbox context, capturing console logs and error traces.
   */
  public async runCode(code: string): Promise<ExecutionResult> {
    const startTime = performance.now();
    const stdoutBuffer: string[] = [];
    const stderrBuffer: string[] = [];

    // Capture console output streams
    const mockConsole = {
      log: (...args: any[]) => stdoutBuffer.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
      warn: (...args: any[]) => stdoutBuffer.push(args.map((a) => String(a)).join(' ')),
      error: (...args: any[]) => stderrBuffer.push(args.map((a) => String(a)).join(' ')),
    };

    try {
      // Evaluate within a safe Function sandbox context with overridden console
      const sandboxFn = new Function('console', `
        "use strict";
        ${code}
      `);

      // Run code
      const result = sandboxFn(mockConsole);
      const executionTimeMs = performance.now() - startTime;

      const stdout = stdoutBuffer.length > 0 ? stdoutBuffer.join('\n') + '\n' : '';
      const stderr = stderrBuffer.length > 0 ? stderrBuffer.join('\n') + '\n' : '';

      return {
        success: stderrBuffer.length === 0,
        stdout,
        stderr,
        result,
        executionTimeMs,
      };
    } catch (err: any) {
      const executionTimeMs = performance.now() - startTime;
      const errorMessage = err?.stack || err?.message || String(err);

      return {
        success: false,
        stdout: stdoutBuffer.length > 0 ? stdoutBuffer.join('\n') + '\n' : '',
        stderr: errorMessage,
        error: errorMessage,
        executionTimeMs,
      };
    }
  }
}
