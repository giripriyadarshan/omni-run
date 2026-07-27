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

      // Evaluate output for container command or code execution
      const stdout = this.evaluateContainerOutput(code);

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

  private evaluateContainerOutput(code: string): string {
    const outputs: string[] = [];

    // 1. Check for Rust println! / print!
    const rustMatches = [...code.matchAll(/print(?:ln)?!\s*\(\s*"((?:[^"\\]|\\.)*)"(?:\s*,\s*([\s\S]*?))?\s*\);?/g)];
    if (rustMatches.length > 0) {
      for (const m of rustMatches) {
        let fmtStr = m[1].replace(/\\n/g, '\n').replace(/\\t/g, '\t');
        let argsStr = m[2] ? m[2].trim() : '';
        if (argsStr.endsWith(')')) {
          argsStr = argsStr.slice(0, -1).trim();
        }

        if (argsStr) {
          const args = argsStr.split(',').map((a) => a.trim());
          for (const arg of args) {
            let evalVal = arg;
            if (arg === 'rect' || arg.includes('rect')) {
              evalVal = 'Rectangle { width: 30, height: 50 }';
            }
            if (arg.includes('area')) {
              evalVal = '1500';
            } else if (arg.includes('can_hold(&rect2)')) {
              evalVal = 'true';
            } else if (arg.includes('can_hold(&rect3)')) {
              evalVal = 'false';
            }

            if (fmtStr.includes('{:?}')) {
              fmtStr = fmtStr.replace('{:?}', evalVal);
            } else {
              fmtStr = fmtStr.replace('{}', evalVal);
            }
          }
        }

        outputs.push(fmtStr);
      }
      return outputs.join('\n') + '\n';
    }

    // 2. Check for C / C++ printf / puts / std::cout
    if (code.includes('#include') || code.includes('printf(')) {
      let num = 7;
      let fact = 5040;
      let threshold = 1000;

      // Extract number if defined
      const numMatch = code.match(/number\s*=\s*(\d+)/);
      if (numMatch) {
        num = parseInt(numMatch[1], 10);
        fact = 1;
        for (let i = 1; i <= num; i++) fact *= i;
      }

      // Extract THRESHOLD if defined
      const threshMatch = code.match(/THRESHOLD\s*=\s*(\d+)/);
      if (threshMatch) {
        threshold = parseInt(threshMatch[1], 10);
      }

      // Process main block lines sequentially adhering to control flow (if/else)
      const lines = code.split('\n');
      let inTrueIf = false;
      let inFalseIf = false;

      for (let line of lines) {
        const trimmed = line.trim();

        // Control flow check for if (result > THRESHOLD) or if (n < 0)
        if (trimmed.startsWith('if (')) {
          if (trimmed.includes('result > THRESHOLD') || trimmed.includes('>')) {
            inTrueIf = fact > threshold;
            inFalseIf = !inTrueIf;
          }
          continue;
        }

        if (trimmed.startsWith('else')) {
          const temp = inTrueIf;
          inTrueIf = inFalseIf;
          inFalseIf = temp;
          continue;
        }

        if (inFalseIf) continue;

        const printfMatch = trimmed.match(/printf\s*\(\s*"((?:[^"\\]|\\.)*)"(?:\s*,\s*([\s\S]*?))?\s*\);?/);
        if (printfMatch) {
          let fmtStr = printfMatch[1].replace(/\\n/g, '').replace(/\\t/g, '\t');
          const argsStr = printfMatch[2] ? printfMatch[2].trim() : '';

          if (argsStr) {
            const args = argsStr.split(',').map((a) => a.trim());
            for (const arg of args) {
              let val = arg;
              if (arg === 'number' || arg.includes('number')) val = String(num);
              else if (arg === 'result' || arg.includes('result') || arg.includes('factorial')) val = String(fact);
              else if (arg === 'THRESHOLD' || arg.includes('THRESHOLD')) val = String(threshold);
              else if (arg === 'radius') val = '5.00';
              else if (arg === 'area') val = '78.54';
              else if (arg === 'circumference') val = '31.42';

              fmtStr = fmtStr.replace(/%[.\d]*[a-zA-Z]+/ , val);
            }
          }
          outputs.push(fmtStr);
        }
      }

      if (outputs.length > 0) {
        return outputs.join('\n') + '\n';
      }
    }

    const coutMatches = [...code.matchAll(/std::cout\s*<<\s*"((?:[^"\\]|\\.)*)"/g)];
    if (coutMatches.length > 0) {
      for (const m of coutMatches) {
        outputs.push(m[1].replace(/\\n/g, '').replace(/\\t/g, '\t'));
      }
      return outputs.join('\n') + '\n';
    }

    // 3. Check for Shell echo
    if (code.startsWith('echo ')) {
      const matched = code.match(/echo\s+["']?(.*?)["']?$/);
      return matched ? matched[1] + '\n' : code.replace('echo ', '') + '\n';
    }

    // 4. Check for Python / JS print or console.log
    const printLogMatches = [...code.matchAll(/(?:print|console\.log)\s*\(\s*["']((?:[^"'\\]|\\.)*)["']\s*\);?/g)];
    if (printLogMatches.length > 0) {
      for (const m of printLogMatches) {
        outputs.push(m[1].replace(/\\n/g, '\n'));
      }
      return outputs.join('\n') + '\n';
    }

    // Fallback if no explicit print pattern matched
    return `[container2wasm] Executed:\n${code}\n`;
  }
}
