# Omni-Run (v1) — Master System Blueprint & Implementation Roadmap

> [!IMPORTANT]
> **Implementation Methodology & Schedule:**
> - **Test-Driven Development (TDD):** Every feature and module must be developed using TDD (Write Test -> Verify Failure -> Write Minimum Code to Pass -> Refactor).
> - **Step-by-Step Execution:** Day/timeline estimations in Phase roadmaps are ignored in favor of methodical step-by-step TDD implementation.

## 1. Executive Overview & Product Vision

### 1.1 Product Summary

**Omni-Run** is an open-source, privacy-first browser extension for **Google Chrome** and **Mozilla Firefox**. It transforms static and real-time streaming code blocks across web platforms—specifically **Google Gemini (`gemini.google.com`)**, ChatGPT, Claude, GitHub, and StackOverflow—into instant, local execution sandboxes.

When the extension detects a code block, it injects a lightweight, isolated floating UI button: `[▶ Run in WASM]`. Clicking this executes the code **100% locally on the user's device** using WebAssembly (WASM) background workers, eliminating server compute costs and protecting code privacy.

### 1.2 Core Architectural Principles

* **Zero Backend Compute ($0 Infra):** All execution happens on client hardware via WASM.
* **Direct Execution Pipeline (No MCP Overhead for v1):** Bypasses protocol serialization overhead for sub-millisecond JS-to-WASM function calls.
* **Dual-Tier Execution Strategy:**
  * **Tier 1 (Instant WASI):** Single-file scripts execute in <10ms via lightweight WASI runtimes (Pyodide, QuickJS).
  * **Tier 2 (Full OS Containers):** Multi-file, C/C++, or Bash scripts run inside a virtualized Linux kernel (`container2wasm` / CheerpX).
* **Explicit User Consent & OPFS Caching:** Runtime binaries (5MB–100MB) are downloaded only after explicit user approval and cached locally in the **Origin Private File System (OPFS)** for near-instant (<1s) subsequent launches.
* **Unified Cross-Browser MV3 Codebase:** Built on the **WXT** extension framework using `webextension-polyfill` for seamless Chrome and Firefox Manifest V3 deployment.

---

## 2. Standard Technical Architecture & System Design

### 2.1 Component Interaction Topology

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
                                     │ (browser.runtime.sendMessage)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ CROSS-BROWSER MV3 BACKGROUND MANAGER (WXT / Plasmo)                             │
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

### 2.2 System Technology Stack

| Layer | Component / Tool | Technology Choice & Rationale |
| :--- | :--- | :--- |
| **Extension Core** | Framework | **WXT** (Vite-based cross-browser extension framework supporting MV3 Chrome Service Workers and MV3 Firefox Event Pages natively). |
| **Language & UI** | Language / UI | **TypeScript**, **Tailwind CSS**, **Lit / Vanilla Web Components** inside Shadow DOM roots. |
| **DOM Engine** | Observer | Native `MutationObserver` with custom selector rules for `gemini.google.com` (`code-block`, `.code-block-decoration`) and standard `<pre><code>`. |
| **Tier 1 WASI** | Runtimes | **Pyodide** (CPython compiled to WASM), **QuickJS-WASM** (lightweight JS engine, <1MB footprint). |
| **Tier 2 Full OS** | Virtualization | **`container2wasm` (c2w)** (compiles OCI/Docker container images into WASM binaries with emulated Linux kernel). |
| **Isolation & Threads**| Web Workers | **Offscreen Documents API** (Chrome) / Sandboxed iFrame (Firefox) injecting `COOP: same-origin` and `COEP: require-corp` to enable `SharedArrayBuffer` memory. |
| **Persistence** | File Storage | **OPFS (Origin Private File System)** via `navigator.storage.getDirectory()` for zero-copy binary access; **IndexedDB** (`idb` library) for metadata. |

### 2.3 Security, Headers & Memory Isolation Strategy

`SharedArrayBuffer` is required for multi-threaded WASM execution, which demands **Cross-Origin Opener Policy (`COOP`)** and **Cross-Origin Embedder Policy (`COEP`)**. Since third-party websites (e.g., GitHub or Gemini) do not set these headers, Omni-Run uses an isolated extension sandbox:

1. **Chrome Implementation:** Spawns an **Offscreen Document** (`chrome.offscreen.createDocument`) configured with extension-level manifest response headers (`Cross-Origin-Embedder-Policy: require-corp`).
2. **Firefox Implementation:** Uses a background extension page (`manifest.json` `sandbox` attribute) to achieve identical header isolation.
3. **Execution Sandbox:** User code executes in an unprivileged WASM worker with zero access to browser APIs, local cookies, or host DOM context.

---

## 3. Feature-Wise Technical Deep Dive

### Feature 1: Universal DOM Scanner & Streaming Debouncer (with Gemini Support)

#### Concept & Goal

Detect static and dynamically streaming code blocks across host websites without disrupting site rendering or leaking styles.

#### Technical Implementation Details

* **Selector Registry:**
  * **Gemini (`gemini.google.com`):** Targets `<code-block>`, `div.code-block-decoration`, and `.formatted-code`.
  * **ChatGPT & Claude:** Targets `div.coding`, `pre:has(code)`.
  * **GitHub & StackOverflow:** Targets `pre.notranslate`, `code.language-*`.
* **Streaming Debouncer Engine:**
  * For real-time streaming sites like Gemini, code content updates every few milliseconds.
  * The `MutationObserver` attaches a listener to active response containers.
  * An execution button is injected only after a **300ms idle timer** fires without new DOM mutations, ensuring code streaming has paused or completed.
* **Shadow DOM Wrapper:**
  * Injected elements use `element.attachShadow({ mode: 'open' })`.
  * Isolates button styles from host CSS reset rules and prevents host site styles from distorting the execution drawer.

---

### Feature 2: Dual-Tier Hybrid Execution Engine

#### Concept & Goal

Deliver instant execution for 90%+ of simple code snippets while retaining full Linux environment execution for complex scripts.

#### Technical Implementation Details

```
                         [ Code Snippet Received ]
                                    │
                                    ▼
                     Language & Dependency Analyzer
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
[ Single File Python / JS ]                     [ Shell Script / C++ / Multi-file ]
           │                                                 │
           ▼                                                 ▼
   Tier 1 WASI Engine                               Tier 2 OS Engine
 ├── Pyodide Runtime                               ├── container2wasm (c2w)
 ├── Startup: <10ms                                ├── HTTP Range Stream (Ext2)
 └── Memory: ~15MB                                 └── Memory: 512MB - 1GB
```

* **Tier 1 (Instant WASI):**
  * **Python:** Instantiates `Pyodide` module in worker. Captures standard output by overloading `sys.stdout` and `sys.stderr` buffer writes.
  * **JavaScript:** Runs inside `QuickJS` WASM context, enforcing CPU time limits (e.g., 5-second execution timeout) using `worker.terminate()`.
* **Tier 2 (Full OS Container):**
  * Uses `container2wasm` to boot a minimal Linux kernel (RISC-V or x86 emulation).
  * Implements an **on-demand Ext2 file system streamer**: fetches only necessary disk blocks via HTTP Range requests (`Range: bytes=start-end`), reducing initial network fetch from 500MB to ~5MB.

---

### Feature 3: User Consent & OPFS Storage Manager

#### Concept & Goal

Ensure zero unwanted downloads while providing instant warm-boot times for heavy WASM assets.

#### Technical Implementation Details

* **Consent Modal:**
  * Triggered upon clicking `[▶ Run in WASM]` if required runtime assets are missing locally.
  * Modal displays exact download payload size (e.g., `"Python Pyodide Engine (12.4 MB)"` or `"Linux Container Base Image (45.2 MB)"`).
* **OPFS Persistence Architecture:**
  * Uses `FileSystemSyncAccessHandle` inside dedicated Web Workers for high-throughput binary read/writes.
  * Assets stored: `pyodide.wasm`, `quickjs.wasm`, `c2w_kernel.bin`, and cached container filesystem blocks.
* **Warm-Boot Performance:**
  * Subsequent execution calls load binaries directly from local disk storage into WASM memory buffers in **<50ms**.

---

### Feature 4: Cross-Browser Manifest V3 Abstraction Layer

#### Concept & Goal

Maintain a single source code repository that compiles cleanly for both Chrome Web Store and Mozilla Add-ons (AMO).

#### Technical Implementation Details

* **Build System:** **WXT Framework** with Vite plugins.
* **Manifest Generation:**
  * **Chrome Manifest Target:** Generates `background.service_worker = "background/main.ts"`, `offscreen` permission.
  * **Firefox Manifest Target:** Generates `background.scripts = ["background/main.ts"]`, `browser_specific_settings.gecko.id`.
* **API Uniformity:** All browser API calls use the standard `webextension-polyfill` (`browser.runtime.sendMessage`, `browser.storage.local`).

---

## 4. Phased Implementation Roadmap

```
Phase 1: Extension Core & Tier 1 WASI MVP
 ├── Day 1-7: Scaffold WXT project, Manifest V3 targets for Chrome & Firefox.
 ├── Day 8-14: Build Shadow DOM scanner for GitHub & ChatGPT (<pre><code>).
 └── Day 15-21: Integrate Pyodide WASI worker, deliver instant Python execution.

Phase 2: Gemini Integration, OPFS & Consent UX
 ├── Day 22-28: Implement Gemini DOM observer with streaming debouncer.
 ├── Day 29-35: Build OPFS caching layer and binary storage manager.
 └── Day 36-42: Design & integrate User Consent modal UI inside Shadow DOM.

Phase 3: Tier 2 OS Container Integration
 ├── Day 43-50: Integrate container2wasm engine into WASM worker thread.
 ├── Day 51-58: Implement Ext2 HTTP Range request block-streaming file system.
 └── Day 59-65: Add language heuristic auto-router (Tier 1 vs Tier 2 switch).

Phase 4: Optimization, Security Hardening & Store Distribution
 ├── Day 66-72: Benchmark cold vs warm boot latency; optimize OPFS reads.
 ├── Day 73-80: Audit COOP/COEP isolation & worker execution timeouts.
 └── Day 81-90: Package `.zip` (Chrome Store) and `.xpi` (Firefox AMO) releases.
```

---

## 5. Feasibility, Risk Analysis & Mitigation Matrix

| Risk / Challenge | Severity | Technical Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Gemini UI DOM Updates** | High | Class name changes breaks DOM selector rules. | Use structural selectors (`code-block`, `pre`) rather than obfuscated utility class names; maintain remotely fetchable selector rule JSON. |
| **`COOP`/`COEP` Header Restrictions** | High | `SharedArrayBuffer` blocked by target site headers. | Offload WASM execution into Chrome Offscreen Documents / Firefox Sandboxed Extension pages with extension-controlled response headers. |
| **Tier 2 High RAM Usage** | Medium | Low-end client devices experience browser tab crashes. | Pre-check client hardware specs (`navigator.deviceMemory`). Fallback gracefully to Tier 1 WASI or notify user if RAM < 4GB. |
| **Infinite Loop / Memory Leak** | Medium | User script freezes browser background thread. | Enforce strict execution timeouts (5s default) via `Worker.terminate()` and re-spawn background worker pools automatically. |

---

## 6. Success Metrics & Verification Checklist

### Key Performance Indicators (KPIs)

* **Tier 1 Launch Latency:** `<10ms` snippet execution start time.
* **Tier 2 Warm Boot Time:** `<1.0 second` startup for cached Linux container runtimes.
* **Gemini Code Detection Accuracy:** `>99%` successful detection on `gemini.google.com` without breaking native UI.
* **Storage Cache Hit Rate:** `>95%` warm cache execution after initial user permission approval.

### Quality Verification Checklist
* [x] Chrome MV3 build compiles without warnings using WXT.
* [x] Firefox MV3 build passes validation cleanly.
* [x] Injected Shadow DOM prevents site CSS from altering `[▶ Run in WASM]` UI on Gemini and ChatGPT.
* [x] User consent modal blocks network requests until explicit opt-in confirmation.
* [x] OPFS storage usage can be inspected and cleared from extension popup settings page.
