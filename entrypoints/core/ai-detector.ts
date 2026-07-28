export interface AIDetectorOptions {
  apiKey?: string;
  preferredMode?: 'auto' | 'builtin' | 'byok';
}

export class AILanguageDetector {
  private static SYSTEM_PROMPT = `You are an expert programming language classification engine.
Analyze the following code snippet and identify its primary programming language.
Respond ONLY with a valid JSON object matching this exact schema:
{"language": "<IDENTIFIER>"}

Allowed <IDENTIFIER> values: "rust", "python", "javascript", "typescript", "cpp", "c", "bash", "go".
Do NOT include any markdown block formatting, explanations, or extra text.

Code Snippet:
`;

  public static hasBuiltinAI(): boolean {
    const aiGlobal = (globalThis as any).ai || (typeof window !== 'undefined' ? (window as any).ai : undefined);
    const lmGlobal = aiGlobal?.languageModel || aiGlobal?.assistant || (globalThis as any).LanguageModel;
    return Boolean(aiGlobal || lmGlobal);
  }

  /**
   * Detects the programming language of a code block purely using Chrome Built-in AI
   * (window.ai Prompt API) or BYOK Gemini API (gemini-flash-lite-latest).
   */
  public async detectLanguage(
    code: string,
    _hintClass: string = '',
    options: AIDetectorOptions = {}
  ): Promise<string> {
    const trimmedCode = code.trim().slice(0, 800);

    // 1. Superior BYOK Gemini API (gemini-flash-lite-latest) takes priority when configured
    if (options.apiKey) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${options.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `${AILanguageDetector.SYSTEM_PROMPT}\n${trimmedCode}`,
                    },
                  ],
                },
              ],
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const parsed = this.parseAIResponse(text);
          if (parsed) return parsed;
        }
      } catch (err) {
        // Fallthrough to built-in AI
      }
    }

    // 2. Browser Built-in AI (Chrome window.ai / LanguageModel API)
    const aiGlobal = (globalThis as any).ai || (typeof window !== 'undefined' ? (window as any).ai : undefined);
    const lmGlobal = aiGlobal?.languageModel || aiGlobal?.assistant || (globalThis as any).LanguageModel;

    if (options.preferredMode !== 'byok' && (aiGlobal || lmGlobal)) {
      try {
        let session: any = null;
        if (lmGlobal && typeof lmGlobal.create === 'function') {
          try {
            session = await lmGlobal.create({ systemPrompt: AILanguageDetector.SYSTEM_PROMPT });
          } catch (_) {
            session = await lmGlobal.create();
          }
        } else if (aiGlobal && typeof aiGlobal.create === 'function') {
          try {
            session = await aiGlobal.create({ systemPrompt: AILanguageDetector.SYSTEM_PROMPT });
          } catch (_) {
            session = await aiGlobal.create();
          }
        } else if (aiGlobal && typeof aiGlobal.prompt === 'function') {
          const response = await aiGlobal.prompt(`${AILanguageDetector.SYSTEM_PROMPT}\n${trimmedCode}`);
          const parsed = this.parseAIResponse(response);
          if (parsed) return parsed;
        }

        if (session && typeof session.prompt === 'function') {
          const response = await session.prompt(`${AILanguageDetector.SYSTEM_PROMPT}\n${trimmedCode}`);
          const parsed = this.parseAIResponse(response);
          if (parsed) return parsed;
        }
      } catch (err) {
        // Fallthrough to fallback
      }
    }

    // 2. BYOK Gemini API fallback (gemini-flash-lite-latest)
    if (options.apiKey) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${options.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `${AILanguageDetector.SYSTEM_PROMPT}\n${trimmedCode}`,
                    },
                  ],
                },
              ],
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const parsed = this.parseAIResponse(text);
          if (parsed) return parsed;
        }
      } catch (err) {
        // Fallthrough
      }
    }

    // 3. Contextual keyword fallback if neither window.ai nor apiKey is active
    const hintLower = _hintClass.toLowerCase();
    if (/\b(rust|rs|lang-rust|language-rust)\b/.test(hintLower) || /^\s*(fn\s+main|struct\s+\w+|impl\s+\w+|println!)\b/m.test(trimmedCode)) return 'rust';
    if (/\b(python|py|lang-py|language-python)\b/.test(hintLower) || /^\s*(def\s+|import\s+|from\s+\w+|print\s*\()/m.test(trimmedCode)) return 'python';
    if (/\b(cpp|c\+\+|lang-c|language-c)\b/.test(hintLower) || trimmedCode.includes('#include <')) return 'cpp';
    if (/\b(bash|sh|zsh)\b/.test(hintLower) || trimmedCode.includes('#!/bin/bash')) return 'bash';
    if (/\b(javascript|js|typescript|ts)\b/.test(hintLower) || /^\s*(const|let|var|function|console\.log)/m.test(trimmedCode)) return 'javascript';

    return 'javascript';
  }

  private parseAIResponse(response: string): string | null {
    const validLanguages = ['rust', 'python', 'javascript', 'typescript', 'cpp', 'c', 'bash', 'go'];
    try {
      const cleanJsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJsonStr);
      if (parsed?.language && validLanguages.includes(parsed.language.toLowerCase())) {
        return parsed.language.toLowerCase();
      }
    } catch {
      // Fallback text match
      const lower = response.toLowerCase();
      for (const lang of validLanguages) {
        if (lower.includes(lang)) {
          return lang;
        }
      }
    }
    return null;
  }
}
