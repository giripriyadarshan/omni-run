import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AILanguageDetector } from '../../entrypoints/core/ai-detector';

describe('AILanguageDetector (Pure AI Language Detection Engine)', () => {
  let detector: AILanguageDetector;

  beforeEach(() => {
    detector = new AILanguageDetector();
    vi.restoreAllMocks();
    delete (globalThis as any).ai;
  });

  it('should use Browser Built-in AI (window.ai) with structured prompt to detect language', async () => {
    const mockPrompt = vi.fn().mockResolvedValue('{"language": "rust"}');
    (globalThis as any).ai = {
      languageModel: {
        create: vi.fn().mockResolvedValue({
          prompt: mockPrompt,
        }),
      },
    };

    const lang = await detector.detectLanguage('struct Rectangle { width: u32, height: u32 }');
    expect(lang).toBe('rust');
    expect(mockPrompt).toHaveBeenCalledWith(expect.stringContaining('You are an expert programming language classification engine'));
  });

  it('should use BYOK Gemini API (gemini-flash-lite-latest) if window.ai is unavailable', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: '{"language": "cpp"}' }],
            },
          },
        ],
      }),
    } as Response);

    const lang = await detector.detectLanguage('#include <vector>\nstd::vector<int> v;', '', {
      apiKey: 'TEST_GEMINI_KEY',
      preferredMode: 'byok',
    });

    expect(lang).toBe('cpp');
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=TEST_GEMINI_KEY'),
      expect.any(Object)
    );
  });
});
