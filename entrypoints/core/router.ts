export type ExecutionTier = 'tier1' | 'tier2';
export type ExecutionEngine = 'pyodide' | 'quickjs' | 'container2wasm';

export interface AnalysisResult {
  language: string;
  tier: ExecutionTier;
  engine: ExecutionEngine;
}

export class TierRouter {
  /**
   * Analyzes code snippet content and optional CSS class hint to determine language & execution tier.
   */
  public analyzeCode(code: string, hintClass: string = ''): AnalysisResult {
    const lang = this.detectLanguage(code, hintClass);

    switch (lang) {
      case 'python':
        return { language: 'python', tier: 'tier1', engine: 'pyodide' };
      case 'javascript':
      case 'typescript':
        return { language: 'javascript', tier: 'tier1', engine: 'quickjs' };
      case 'bash':
      case 'sh':
      case 'zsh':
        return { language: 'bash', tier: 'tier2', engine: 'container2wasm' };
      case 'cpp':
      case 'c':
      case 'rust':
      case 'go':
        return { language: lang, tier: 'tier2', engine: 'container2wasm' };
      default:
        // Default fallback to QuickJS for JavaScript, or Tier 2 container for general scripts
        return { language: 'javascript', tier: 'tier1', engine: 'quickjs' };
    }
  }

  private detectLanguage(code: string, hintClass: string): string {
    const hintLower = hintClass.toLowerCase();

    // Check CSS class hints first
    if (hintLower.includes('python') || hintLower.includes('py')) return 'python';
    if (hintLower.includes('javascript') || hintLower.includes('js')) return 'javascript';
    if (hintLower.includes('typescript') || hintLower.includes('ts')) return 'typescript';
    if (hintLower.includes('bash') || hintLower.includes('sh')) return 'bash';
    if (hintLower.includes('cpp') || hintLower.includes('c++') || hintLower.includes('c')) return 'cpp';
    if (hintLower.includes('rust') || hintLower.includes('rs')) return 'rust';
    if (hintLower.includes('go')) return 'go';

    // Heuristic inspections on code content
    if (code.includes('#!/bin/bash') || code.includes('#!/bin/sh')) return 'bash';
    if (code.includes('#include <') || code.includes('std::cout')) return 'cpp';
    if (/^\s*(def|import|from)\s+/m.test(code)) return 'python';
    if (/^\s*(const|let|var|function|console\.log)\s+/m.test(code)) return 'javascript';

    return 'javascript';
  }
}
