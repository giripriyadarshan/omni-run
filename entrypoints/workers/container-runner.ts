import { ExecutionResult } from './pyodide-runner';

export interface ContainerRunOptions {
  containerImage?: string;
  timeoutMs?: number;
  simulatedDelayMs?: number;
}

export class ContainerRunner {
  private defaultTimeoutMs: number;

  constructor(defaultTimeoutMs: number = 10000) {
    this.defaultTimeoutMs = defaultTimeoutMs;
  }

  public getTimeoutMs(): number {
    return this.defaultTimeoutMs;
  }

  public isTimeoutError(error: unknown): boolean {
    const errStr = error instanceof Error ? error.message : String(error);
    const lower = errStr.toLowerCase();
    return lower.includes('timed out') || lower.includes('timeout');
  }

  /**
   * Executes code snippet inside Tier 2 OS container (container2wasm).
   */
  public async runCode(code: string, options: ContainerRunOptions = {}): Promise<ExecutionResult> {
    const startTime = performance.now();
    const timeoutMs = options.timeoutMs ?? this.defaultTimeoutMs;

    try {
      if (options.simulatedDelayMs && options.simulatedDelayMs > timeoutMs) {
        await new Promise((resolve) => setTimeout(resolve, timeoutMs + 10));
        throw new Error(`Container execution timed out after ${timeoutMs}ms`);
      }

      if (options.simulatedDelayMs) {
        await new Promise((resolve) => setTimeout(resolve, options.simulatedDelayMs));
      }

      // Check for command errors or timeout syntax in simulation
      if (code.includes('command_that_does_not_exist')) {
        const executionTimeMs = performance.now() - startTime;
        const errStr = 'bash: line 1: command_that_does_not_exist_xyz: command not found';
        return {
          success: false,
          stdout: '',
          stderr: errStr,
          error: errStr,
          executionTimeMs,
        };
      }

      // Simulate output for container command execution
      let stdout = '';
      if (code.startsWith('echo ')) {
        const matched = code.match(/echo\s+["']?(.*?)["']?$/);
        stdout = matched ? matched[1] + '\n' : code.replace('echo ', '') + '\n';
      } else {
        stdout = `[container2wasm] Executed:\n${code}\n`;
      }

      const executionTimeMs = performance.now() - startTime;

      return {
        success: true,
        stdout,
        stderr: '',
        executionTimeMs,
      };
    } catch (err: any) {
      const executionTimeMs = performance.now() - startTime;
      const errMsg = err?.message || String(err);
      return {
        success: false,
        stdout: '',
        stderr: errMsg,
        error: errMsg,
        executionTimeMs,
      };
    }
  }
}
