import { ExecutionResult } from './pyodide-runner';
import { Ext2BlockStreamer } from '../storage/ext2-streamer';
import { OPFSManager } from '../storage/opfs';

export interface ContainerRunOptions {
  containerImage?: string;
  timeoutMs?: number;
  simulatedDelayMs?: number;
}

export class ContainerRunner {
  private defaultTimeoutMs: number;

  constructor(defaultTimeoutMs: number = 30000) {
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

      // --- MOCK WASM ENGINE INTEGRATION ---
      // This section simulates booting the container2wasm Linux kernel using the 
      // Ext2BlockStreamer for lazy-loading disk chunks.
      const kernelUrl = options.containerImage || 'https://github.com/giripriyadarshan/omni-run/releases/latest/download/c2w_kernel.wasm';
      const diskUrl = 'https://github.com/giripriyadarshan/omni-run/releases/latest/download/c2w_disk.ext2';

      const streamer = new Ext2BlockStreamer(diskUrl);
      const opfs = new OPFSManager();

      // MOCK: Attempt to fetch kernel header (will fail gracefully since binary is not uploaded yet)
      try {
        const fetchRes = await fetch(kernelUrl, { method: 'HEAD' });
        if (!fetchRes.ok) {
          throw new Error('Kernel binary not found on CDN.');
        }
      } catch (err) {
         const errMsg = '[WASM Boot Failed] The container2wasm kernel binary is not yet available on the GitHub Releases CDN. Please upload the compiled kernel to enable execution for C, Rust, Go, and Bash.';
         return {
           success: false,
           stdout: '',
           stderr: errMsg,
           error: errMsg,
           executionTimeMs: performance.now() - startTime,
         };
      }

      // If the kernel fetch succeeded, we would initialize WASM here:
      // const memory = new WebAssembly.Memory({ initial: 256, maximum: 16384, shared: true });
      // const importObject = { ...WASI_mock, block_device: { read: (offset, len) => streamer.fetchBlockSync(...) }};
      // const { instance } = await WebAssembly.instantiateStreaming(fetch(kernelUrl), importObject);
      // instance.exports._start();

      return {
        success: true,
        stdout: 'Mock execution succeeded.',
        stderr: '',
        executionTimeMs: performance.now() - startTime,
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
