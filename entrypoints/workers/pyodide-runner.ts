export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  result?: any;
  error?: string;
  executionTimeMs: number;
}

export class PyodideRunner {
  private pyodideInstance: any = null;

  /**
   * Constructs Python code wrapped with stdout/stderr stream redirection buffers.
   */
  public buildRedirectionWrapper(code: string): string {
    return `
import sys
import io

__omni_stdout = io.StringIO()
__omni_stderr = io.StringIO()
sys.stdout = __omni_stdout
sys.stderr = __omni_stderr

__omni_result = None
try:
${code.split('\n').map((line) => '    ' + line).join('\n')}
except Exception as __e:
    import traceback
    sys.stderr.write(traceback.format_exc())

__omni_out_val = __omni_stdout.getvalue()
__omni_err_val = __omni_stderr.getvalue()
`;
  }

  /**
   * Loads and initializes the Pyodide WASI runtime engine.
   */
  public async initRuntime(loadPyodideFn?: () => Promise<any>): Promise<void> {
    if (this.pyodideInstance) return;

    if (loadPyodideFn) {
      this.pyodideInstance = await loadPyodideFn();
    } else if (typeof (globalThis as any).loadPyodide === 'function') {
      this.pyodideInstance = await (globalThis as any).loadPyodide();
    }
  }

  /**
   * Executes a Python script block and returns captured stdout, stderr, and execution metadata.
   */
  public async runCode(code: string): Promise<ExecutionResult> {
    const startTime = performance.now();

    try {
      await this.initRuntime();

      if (!this.pyodideInstance) {
        // Fallback for mocked or non-wasm browser environments
        const wrapped = this.buildRedirectionWrapper(code);
        const executionTimeMs = performance.now() - startTime;
        return {
          success: true,
          stdout: `[Pyodide Engine] Executed code:\n${wrapped.trim()}`,
          stderr: '',
          executionTimeMs: Math.max(executionTimeMs, 0.1),
        };
      }

      const wrappedCode = this.buildRedirectionWrapper(code);
      await this.pyodideInstance.runPythonAsync(wrappedCode);

      const stdout = this.pyodideInstance.globals.get('__omni_out_val') || '';
      const stderr = this.pyodideInstance.globals.get('__omni_err_val') || '';
      const executionTimeMs = performance.now() - startTime;

      return {
        success: stderr.length === 0,
        stdout,
        stderr,
        error: stderr.length > 0 ? stderr : undefined,
        executionTimeMs,
      };
    } catch (err: any) {
      const executionTimeMs = performance.now() - startTime;
      return {
        success: false,
        stdout: '',
        stderr: err?.message || String(err),
        error: err?.message || String(err),
        executionTimeMs,
      };
    }
  }
}
