import { describe, it, expect } from 'vitest';
import { TierRouter } from '@/entrypoints/core/router';

describe('TierRouter - Code Language Detection & Execution Tier Router', () => {
  const router = new TierRouter();

  it('should route standard Python code blocks to Tier 1 WASI (Pyodide)', () => {
    const code = `def greet(name):\n    print(f"Hello, {name}!")`;
    const result = router.analyzeCode(code, 'language-python');

    expect(result.language).toBe('python');
    expect(result.tier).toBe('tier1');
    expect(result.engine).toBe('pyodide');
  });

  it('should route JavaScript code blocks to Tier 1 WASI (QuickJS)', () => {
    const code = `const nums = [1, 2, 3]; console.log(nums.map(x => x * 2));`;
    const result = router.analyzeCode(code, 'language-js');

    expect(result.language).toBe('javascript');
    expect(result.tier).toBe('tier1');
    expect(result.engine).toBe('quickjs');
  });

  it('should route Bash/Shell scripts to Tier 2 OS Container (container2wasm)', () => {
    const code = `#!/bin/bash\necho "Current user: $(whoami)"\nls -la`;
    const result = router.analyzeCode(code, 'language-bash');

    expect(result.language).toBe('bash');
    expect(result.tier).toBe('tier2');
    expect(result.engine).toBe('container2wasm');
  });

  it('should route C/C++ scripts to Tier 2 OS Container', () => {
    const code = `#include <iostream>\nint main() { std::cout << "C++ WASM" << std::endl; return 0; }`;
    const result = router.analyzeCode(code, 'language-cpp');

    expect(result.language).toBe('cpp');
    expect(result.tier).toBe('tier2');
    expect(result.engine).toBe('container2wasm');
  });

  it('should infer language from code heuristics if CSS hint is missing', () => {
    const pythonCode = `import math\nprint(math.sqrt(16))`;
    const result = router.analyzeCode(pythonCode);

    expect(result.language).toBe('python');
    expect(result.tier).toBe('tier1');
  });
});
