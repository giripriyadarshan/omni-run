import { AILanguageDetector, AIDetectorOptions } from './ai-detector';

export type ExecutionTier = 'tier1' | 'tier2';
export type ExecutionEngine = 'pyodide' | 'quickjs' | 'container2wasm';

export interface AnalysisResult {
  language: string;
  tier: ExecutionTier;
  engine: ExecutionEngine;
}

export class TierRouter {
  private detector: AILanguageDetector;

  constructor() {
    this.detector = new AILanguageDetector();
  }

  /**
   * Analyzes code snippet content and optional CSS class hint to determine language & execution tier.
   * Supports AI-assisted language classification via Built-in AI or BYOK Gemini API options.
   */
  public analyzeCode(
    code: string,
    hintClass: string = '',
    options: AIDetectorOptions = {}
  ): AnalysisResult | Promise<AnalysisResult> {
    // Fast path: if options has async requirements or if called as async
    const isAsync = options.apiKey || options.preferredMode === 'builtin' || options.preferredMode === 'byok';

    if (isAsync) {
      return this.analyzeCodeAsync(code, hintClass, options);
    }

    // Synchronous fallback
    const lang = this.detectLanguageSync(code, hintClass);
    return this.mapLanguageToTier(lang);
  }

  public async analyzeCodeAsync(
    code: string,
    hintClass: string = '',
    options: AIDetectorOptions = {}
  ): Promise<AnalysisResult> {
    const lang = await this.detector.detectLanguage(code, hintClass, options);
    return this.mapLanguageToTier(lang);
  }

  private mapLanguageToTier(lang: string): AnalysisResult {
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
        return { language: 'javascript', tier: 'tier1', engine: 'quickjs' };
    }
  }

  private detectLanguageSync(code: string, hintClass: string): string {
    const hintLower = hintClass.toLowerCase();

    if (/\b(python|py|lang-py|language-python)\b/.test(hintLower)) return 'python';
    if (/\b(javascript|js|typescript|ts)\b/.test(hintLower)) return 'javascript';
    if (/\b(bash|sh|zsh)\b/.test(hintLower)) return 'bash';
    if (/\b(cpp|c\+\+|lang-c|language-c)\b/.test(hintLower)) return 'cpp';
    if (/\b(rust|rs)\b/.test(hintLower)) return 'rust';
    if (/\b(go|golang)\b/.test(hintLower)) return 'go';

    if (/^\s*(fn\s+main|println!|let\s+mut|pub\s+fn)\b/m.test(code)) return 'rust';
    if (code.includes('#!/bin/bash') || code.includes('#!/bin/sh')) return 'bash';
    if (code.includes('#include <') || code.includes('std::cout')) return 'cpp';
    if (/^\s*(def|import|from)\s+/m.test(code)) return 'python';
    if (/^\s*(const|let|var|function|console\.log)\s+/m.test(code)) return 'javascript';

    return 'javascript';
  }
}
