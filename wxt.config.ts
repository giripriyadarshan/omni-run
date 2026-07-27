import { defineConfig } from 'wxt';

export default defineConfig({
  extensionApi: 'chrome',
  modules: [],
  manifest: {
    name: 'Omni-Run',
    description: 'Privacy-first, client-side WebAssembly code execution in browser.',
    permissions: ['storage', 'offscreen']
  }
});

