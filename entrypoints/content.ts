import { defineContentScript } from 'wxt/sandbox';
import { DOMScanner } from './content/scanner';

export default defineContentScript({
  matches: [
    'https://gemini.google.com/*',
    'https://chatgpt.com/*',
    'https://chat.openai.com/*',
    'https://claude.ai/*',
    'https://github.com/*',
    'https://stackoverflow.com/*',
  ],
  main() {
    const scanner = new DOMScanner();

    // Initial DOM scan
    const blocks = scanner.findCodeBlocks();
    blocks.forEach((block) => scanner.injectRunnerUI(block));

    // Streaming observer setup for dynamic sites like Gemini
    const debouncer = scanner.createStreamingDebouncer(() => {
      const updatedBlocks = scanner.findCodeBlocks();
      updatedBlocks.forEach((block) => scanner.injectRunnerUI(block));
    }, 300);

    const observer = new MutationObserver(() => {
      debouncer.notifyMutation();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  },
});
