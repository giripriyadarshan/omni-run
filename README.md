# Omni-Run (v1)

> Privacy-first, client-side WebAssembly (WASM) code execution browser extension for Google Gemini, ChatGPT, Claude, GitHub, and StackOverflow.

Omni-Run transforms static and real-time streaming code blocks across web platforms into instant, local execution sandboxes using client-side WebAssembly workers—eliminating server compute costs and protecting code privacy.

---

## Key Features

- **Zero Backend Compute ($0 Infra):** 100% client-side code execution using WASM workers.
- **Dual-Tier Hybrid Execution Pipeline:**
  - **Tier 1 (Instant WASI):** Single-file Python (`Pyodide`) and JavaScript (`QuickJS`) execute in <10ms with stdout/stderr capture.
  - **Tier 2 (OS Container):** C/C++, Rust, Go, and Shell scripts execute inside Linux container sandboxes (`container2wasm`) with on-demand Ext2 HTTP Range block streaming.
- **Chrome & Firefox Manifest V3 (WXT):** Cross-browser extension built on Vite and `webextension-polyfill`.
- **COOP/COEP Header Isolation:** Offscreen Document API execution sandbox for safe `SharedArrayBuffer` multi-threading.
- **OPFS Local Storage & Consent UX:** Origin Private File System binary asset caching with Shadow DOM consent modal dialogs and popup storage management.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Extension Framework** | [WXT Framework](https://wxt.dev/) (Vite MV3 Chrome Service Worker & Firefox Event Page) |
| **Languages & Styles** | TypeScript, Vanilla Web Components, Shadow DOM |
| **Tier 1 WASI Runtimes** | Pyodide (Python 3.11 CPython WASM), QuickJS WASM |
| **Tier 2 OS Runtimes** | `container2wasm` (c2w), Ext2 HTTP Range block fetcher |
| **Storage & Security** | OPFS (Origin Private File System), Chrome Offscreen Document (`COOP`/`COEP` isolation) |
| **Test Suite** | Vitest + JSDOM |

---

## Project Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ HOST WEB PAGE DOM (Gemini / ChatGPT / GitHub / StackOverflow)                    │
│                                                                                 │
│   <code-block> / <pre><code>  ──►  [ MutationObserver + Streaming Debouncer ] │
│                                           │                                     │
│                                           ▼                                     │
│                            [ Injected Shadow DOM Root ]                         │
│                            └── [ ▶ Run in WASM ] Action Bar                     │
│                            └── Expandable Output Drawer (stdout/stderr)         │
└────────────────────────────────────┬────────────────────────────────────────────┘
                                     │ (chrome.runtime.sendMessage)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ CROSS-BROWSER MV3 BACKGROUND MANAGER                                             │
│ (Chrome Service Worker / Firefox Event Page)                                    │
│                                                                                 │
│  ├── Code Language Detection Heuristics & Tier Router                           │
│  └── Offscreen Sandbox Manager (COOP/COEP Isolation Controller)                │
└───────────────────────────┬─────────────────────────┬───────────────────────────┘
                            │                         │
                            ▼                         ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
│ TIER 1: INSTANT WASI WORKER          │  │ TIER 2: OS CONTAINER WORKER          │
│                                      │  │                                      │
│ ├── Pyodide (Python 3.11+ CPython)   │  │ ├── container2wasm (x86/RISC-V emu) │
│ └── QuickJS-WASM (JS/ES2020)         │  │ └── Ext2 HTTP Range Block Streamer   │
└──────────────────┬───────────────────┘  └──────────────────┬───────────────────┘
                   │                                         │
                   └────────────────────┬────────────────────┘
                                        │ (Direct FileSystem API)
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ LOCAL PERSISTENT STORAGE (Client Device)                                        │
│ ├── OPFS (Origin Private File System): `.wasm` binaries & disk block chunks     │
│ └── IndexedDB: Runtime metadata, user settings, cache manifest                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation & Development

```bash
# Clone the repository
git clone https://github.com/user/omni-run.git
cd omni-run

# Install dependencies
npm install

# Run extension in Chrome development mode
npm run dev

# Run extension in Firefox development mode
npm run dev:firefox
```

---

## Testing & Quality Verification

Omni-Run is built using Test-Driven Development (TDD).

```bash
# Run unit and integration test suites
npm test

# Run tests in watch mode
npm run test:watch
```

**Test Suite Coverage (16 Test Files, 53 Passing Tests):**
- `DOMScanner` (Gemini `<code-block>` & standard `<pre><code>` discovery, 300ms debouncer)
- `TierRouter` (Language classification & tier routing)
- `PyodideRunner` & `QuickJSRunner` (WASI execution engines)
- `ContainerRunner` (Tier 2 OS virtualized container runner)
- `IsolationManager` (Chrome Offscreen / Firefox COOP-COEP header isolation)
- `OPFSManager` & `Ext2BlockStreamer` (OPFS binary asset cache & HTTP Range block streaming)
- `HardwareGuard` (Client RAM inspection & low-memory safety protection)
- `ConsentModal` & `OutputDrawer` (Shadow DOM UI components)
- `MetricsCollector` (Performance latency & KPI benchmark tracker)
- `Popup Dashboard` (OPFS storage management UI)

---

## Building for Production

```bash
# Build Chrome MV3 extension (.output/chrome-mv3/)
npm run build

# Build Firefox MV3 extension (.output/firefox-mv2/)
npm run build:firefox

# Create store release zip packages (.output/omni-run-0.1.0-chrome.zip & firefox.zip)
npm run zip && npm run zip:firefox
```

---

## License

MIT License
