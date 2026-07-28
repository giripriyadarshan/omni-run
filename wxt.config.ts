import { defineConfig } from 'wxt';

export default defineConfig({
  extensionApi: 'chrome',
  modules: [],
  manifest: {
    name: 'Omni-Run',
    description: 'Privacy-first, client-side WebAssembly code execution in browser.',
    permissions: ['storage', 'offscreen'],
    cross_origin_embedder_policy: {
      value: 'require-corp'
    },
    cross_origin_opener_policy: {
      value: 'same-origin'
    },
    web_accessible_resources: [
      {
        resources: ['pyodide/*'],
        matches: ['<all_urls>']
      }
    ]
  },
  vite: () => ({
    server: {
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin'
      }
    }
  })
});

