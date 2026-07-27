import { defineConfig } from 'wxt';

export default defineConfig({
  extensionApi: 'chrome',
  modules: [],
  manifest: {
    name: 'Omni-Run',
    description: 'Privacy-first, client-side WebAssembly code execution in browser.',
    permissions: ['storage', 'offscreen'],
    content_scripts: [
      {
        matches: [
          'https://gemini.google.com/*',
          'https://chatgpt.com/*',
          'https://chat.openai.com/*',
          'https://claude.ai/*',
          'https://github.com/*',
          'https://stackoverflow.com/*'
        ],
        js: ['content-scripts/content.ts']
      }
    ]
  }
});
