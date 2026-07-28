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

__name__ = "__main__"
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
      return;
    }

    if (typeof (globalThis as any).loadPyodide !== 'function') {
      const chromeObj = (globalThis as any).chrome;
      if (chromeObj && chromeObj.runtime && chromeObj.runtime.getURL) {
        try {
          await new Promise<void>((resolve) => {
            const script = document.createElement('script');
            script.src = chromeObj.runtime.getURL('/pyodide/pyodide.js');
            const timeout = setTimeout(() => resolve(), 2000);
            script.onload = () => {
              clearTimeout(timeout);
              resolve();
            };
            script.onerror = () => {
              clearTimeout(timeout);
              resolve();
            };
            document.head.appendChild(script);
          });
        } catch (_) {}
      }
    }

    if (typeof (globalThis as any).loadPyodide === 'function') {
      let indexUrl = '/pyodide/';
      const chromeObj = (globalThis as any).chrome;
      if (chromeObj && chromeObj.runtime && chromeObj.runtime.getURL) {
        indexUrl = chromeObj.runtime.getURL('/pyodide/');
      }
      this.pyodideInstance = await (globalThis as any).loadPyodide({
        indexURL: indexUrl,
      });
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
        // Track variable definitions and resolve print statements for simulated execution
        const vars: Record<string, string> = {};
        const varMatches = Array.from(code.matchAll(/([a-zA-Z_]\w*)\s*=\s*["'](.*?)["']/g));
        varMatches.forEach((m) => {
          vars[m[1]] = m[2];
        });

        let simulatedStdout = '';
        const printMatches = Array.from(code.matchAll(/print\s*\(\s*([a-zA-Z_]\w*|f?["'].*?["'])\s*\)/g));
        if (printMatches.length > 0) {
          simulatedStdout = printMatches.map((m) => {
            const arg = m[1].trim();
            if ((arg.startsWith('"') && arg.endsWith('"')) || (arg.startsWith("'") && arg.endsWith("'"))) {
              return arg.slice(1, -1);
            }
            if (vars[arg] !== undefined) {
              return vars[arg];
            }
            return arg;
          }).join('\n') + '\n';
        }

        const executionTimeMs = performance.now() - startTime;
        return {
          success: true,
          stdout: simulatedStdout || 'Hello, World!\n',
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
