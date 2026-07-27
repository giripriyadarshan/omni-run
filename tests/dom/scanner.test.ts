import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DOMScanner } from '@/entrypoints/content/scanner';

describe('DOMScanner - Code Block Detection & Debouncer Engine', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should detect standard <pre><code> blocks (ChatGPT/GitHub/Claude)', () => {
    document.body.innerHTML = `
      <div class="chat">
        <pre><code class="language-python">print("Hello World")</code></pre>
      </div>
    `;

    const scanner = new DOMScanner();
    const blocks = scanner.findCodeBlocks(document.body);
    expect(blocks.length).toBe(1);
    expect(blocks[0].tagName.toLowerCase()).toBe('code');
  });

  it('should detect Gemini custom <code-block> elements', () => {
    document.body.innerHTML = `
      <div class="gemini-response">
        <code-block>
          <div class="formatted-code">
            <pre><code>console.log('Gemini WASM');</code></pre>
          </div>
        </code-block>
      </div>
    `;

    const scanner = new DOMScanner();
    const blocks = scanner.findCodeBlocks(document.body);
    expect(blocks.length).toBeGreaterThan(0);
  });

  it('should attach Shadow DOM with [▶ Run in WASM] button to detected blocks', () => {
    document.body.innerHTML = `
      <pre id="target-block"><code>def add(a, b): return a + b</code></pre>
    `;

    const targetBlock = document.getElementById('target-block')!;
    const scanner = new DOMScanner();
    const shadowHost = scanner.injectRunnerUI(targetBlock);

    expect(shadowHost.shadowRoot).not.toBeNull();
    const button = shadowHost.shadowRoot?.querySelector('button');
    expect(button).not.toBeNull();
    expect(button?.textContent).toContain('Run in WASM');
  });

  it('should debounce rapid DOM streaming mutations before firing callback', () => {
    const onFinishedStreaming = vi.fn();
    const scanner = new DOMScanner();
    
    const debouncer = scanner.createStreamingDebouncer(onFinishedStreaming, 300);

    // Simulate rapid streaming updates every 50ms
    debouncer.notifyMutation();
    vi.advanceTimersByTime(100);
    expect(onFinishedStreaming).not.toHaveBeenCalled();

    debouncer.notifyMutation();
    vi.advanceTimersByTime(100);
    expect(onFinishedStreaming).not.toHaveBeenCalled();

    // Now wait for full 300ms idle
    vi.advanceTimersByTime(300);
    expect(onFinishedStreaming).toHaveBeenCalledTimes(1);
  });
});
