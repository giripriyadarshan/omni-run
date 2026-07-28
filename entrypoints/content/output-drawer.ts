import { ExecutionResult } from '../workers/pyodide-runner';

export interface ExecutionRunRecord {
  id: number; // 1, 2, 3...
  status: 'running' | 'success' | 'failed';
  executionTimeMs?: number;
  stdout?: string;
  stderr?: string;
}

export class OutputDrawer {
  private drawerElement: HTMLElement | null = null;
  private expanded: boolean = false;
  private history: ExecutionRunRecord[] = [];
  private activeRunIndex: number = -1;

  /**
   * Mounts the OutputDrawer component inside a ShadowRoot host container.
   */
  public mount(target: ShadowRoot | HTMLElement): HTMLElement {
    if (this.drawerElement && target.contains(this.drawerElement)) {
      return this.drawerElement;
    }

    const existingDrawer = target.querySelector<HTMLElement>('.omni-run-drawer');
    if (existingDrawer) {
      this.drawerElement = existingDrawer;
      return existingDrawer;
    }

    const container = document.createElement('div');
    container.className = 'omni-run-drawer';

    const style = document.createElement('style');
    style.textContent = `
      .omni-run-drawer {
        margin-top: 8px;
        margin-bottom: 8px;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 8px;
        overflow: hidden;
        font-family: system-ui, -apple-system, sans-serif;
        color: #f8fafc;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
        font-size: 13px;
      }
      .drawer-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: #1e293b;
        cursor: pointer;
        user-select: none;
      }
      .header-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .header-right {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .history-nav {
        display: flex;
        align-items: center;
        gap: 4px;
        background: #0f172a;
        padding: 2px 6px;
        border-radius: 4px;
        border: 1px solid #334155;
        font-size: 11px;
      }
      .nav-btn {
        background: transparent;
        border: none;
        color: #38bdf8;
        cursor: pointer;
        font-size: 11px;
        padding: 0 2px;
        line-height: 1;
      }
      .nav-btn:disabled {
        color: #475569;
        cursor: default;
      }
      .nav-label {
        color: #cbd5e1;
        font-weight: 600;
        font-size: 11px;
      }
      .status-badge {
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .status-badge.running {
        background: #1e40af;
        color: #93c5fd;
        animation: pulse-running 1.5s infinite ease-in-out;
      }
      @keyframes pulse-running {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }
      .status-badge.success {
        background: #14532d;
        color: #86efac;
      }
      .status-badge.failed {
        background: #7f1d1d;
        color: #fca5a5;
      }
      .timing-badge {
        color: #94a3b8;
        font-size: 12px;
      }
      .icon-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-size: 13px;
        padding: 2px 6px;
        border-radius: 4px;
        transition: background 0.15s, color 0.15s;
      }
      .icon-btn:hover {
        background: #334155;
        color: #f8fafc;
      }
      .btn-close {
        color: #ef4444;
      }
      .btn-close:hover {
        background: #7f1d1d;
        color: #fca5a5;
      }
      .drawer-body {
        display: none;
        padding: 8px;
        background: #020617;
        border-top: 1px solid #1e293b;
      }
      .drawer-body.open {
        display: block;
      }
      .drawer-stdout, .drawer-stderr {
        margin: 0;
        padding: 8px;
        border-radius: 4px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 12px;
        line-height: 1.4;
        white-space: pre-wrap;
        word-break: break-word;
        overflow-x: auto;
      }
      .drawer-stdout {
        color: #e2e8f0;
        background: #090d16;
      }
      .drawer-stderr {
        color: #fca5a5;
        background: #1c0a0a;
        margin-top: 4px;
      }
      .drawer-footer {
        display: flex;
        justify-content: flex-end;
        margin-top: 8px;
        padding-top: 6px;
        border-top: 1px solid #1e293b;
      }
      .btn-close-all {
        background: #334155;
        color: #f8fafc;
        border: none;
        border-radius: 4px;
        padding: 4px 10px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s;
      }
      .btn-close-all:hover {
        background: #ef4444;
        color: #ffffff;
      }
    `;

    container.innerHTML = `
      <div class="drawer-header">
        <div class="header-left">
          <div class="history-nav" style="display:none;">
            <button class="nav-btn btn-prev" aria-label="Previous run">◀</button>
            <span class="nav-label">Run 1/1</span>
            <button class="nav-btn btn-next" aria-label="Next run">▶</button>
          </div>
          <span class="status-badge ready">Ready</span>
          <span class="timing-badge"></span>
        </div>
        <div class="header-right">
          <button class="icon-btn toggle-btn" aria-label="Toggle drawer">▼</button>
          <button class="icon-btn btn-close" aria-label="Dismiss output">✕</button>
        </div>
      </div>
      <div class="drawer-body">
        <pre class="drawer-stdout" style="display:none;"></pre>
        <pre class="drawer-stderr" style="display:none;"></pre>
        <div class="drawer-footer">
          <button class="btn-close-all">✕ Close All</button>
        </div>
      </div>
    `;

    if (target instanceof ShadowRoot) {
      target.appendChild(style);
      target.appendChild(container);
    } else {
      target.appendChild(container);
    }

    this.drawerElement = container;

    // Header expand toggle
    const header = container.querySelector('.drawer-header');
    header?.addEventListener('click', (e: Event) => {
      const targetEl = e.target as HTMLElement;
      if (targetEl.closest('.history-nav') || targetEl.closest('.btn-close')) {
        return; // Don't toggle expand if clicking nav arrows or close button
      }
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      this.toggleExpand();
    });

    // History navigation arrows
    const prevBtn = container.querySelector('.btn-prev');
    const nextBtn = container.querySelector('.btn-next');

    prevBtn?.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      if (this.activeRunIndex > 0) {
        this.activeRunIndex--;
        this.renderActiveRun();
      }
    });

    nextBtn?.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      if (this.activeRunIndex < this.history.length - 1) {
        this.activeRunIndex++;
        this.renderActiveRun();
      }
    });

    // Top-right dismiss/close button
    const closeBtn = container.querySelector('.btn-close');
    closeBtn?.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      this.dismissCurrentRun();
    });

    // Bottom Close All button
    const closeAllBtn = container.querySelector('.btn-close-all');
    closeAllBtn?.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      this.closeAll();
    });

    return container;
  }

  public isExpanded(): boolean {
    return this.expanded;
  }

  public toggleExpand(expanded?: boolean): boolean {
    this.expanded = expanded !== undefined ? expanded : !this.expanded;
    if (this.drawerElement) {
      const body = this.drawerElement.querySelector('.drawer-body');
      const btn = this.drawerElement.querySelector('.toggle-btn');
      if (body) {
        body.classList.toggle('open', this.expanded);
      }
      if (btn) {
        btn.textContent = this.expanded ? '▲' : '▼';
      }
    }
    return this.expanded;
  }

  public setRunning(): void {
    if (!this.drawerElement) return;

    // Create a new run record and place at front (latest run active!)
    const newRun: ExecutionRunRecord = {
      id: this.history.length + 1,
      status: 'running',
    };
    this.history.push(newRun);
    this.activeRunIndex = this.history.length - 1;

    this.renderActiveRun();
    this.toggleExpand(true);
  }

  public setSuccess(result: ExecutionResult): void {
    if (!this.drawerElement) return;

    if (this.activeRunIndex >= 0 && this.activeRunIndex < this.history.length) {
      const currentRun = this.history[this.activeRunIndex];
      currentRun.status = 'success';
      currentRun.executionTimeMs = result.executionTimeMs;
      currentRun.stdout = result.stdout || '(No output)';
      currentRun.stderr = result.stderr || '';
    } else {
      // Fallback if setRunning wasn't called beforehand
      this.history.push({
        id: this.history.length + 1,
        status: 'success',
        executionTimeMs: result.executionTimeMs,
        stdout: result.stdout || '(No output)',
        stderr: result.stderr || '',
      });
      this.activeRunIndex = this.history.length - 1;
    }

    this.renderActiveRun();
    this.toggleExpand(true);
  }

  public setError(result: ExecutionResult | string): void {
    if (!this.drawerElement) return;

    const stderrMsg = typeof result === 'string' ? result : result.stderr || result.error || 'Execution failed';
    const executionTimeMs = typeof result === 'object' ? result.executionTimeMs : 0;
    const stdoutMsg = typeof result === 'object' ? result.stdout : '';

    if (this.activeRunIndex >= 0 && this.activeRunIndex < this.history.length) {
      const currentRun = this.history[this.activeRunIndex];
      currentRun.status = 'failed';
      currentRun.executionTimeMs = executionTimeMs;
      currentRun.stdout = stdoutMsg;
      currentRun.stderr = stderrMsg;
    } else {
      this.history.push({
        id: this.history.length + 1,
        status: 'failed',
        executionTimeMs,
        stdout: stdoutMsg,
        stderr: stderrMsg,
      });
      this.activeRunIndex = this.history.length - 1;
    }

    this.renderActiveRun();
    this.toggleExpand(true);
  }

  public dismissCurrentRun(): void {
    if (this.history.length <= 1) {
      this.closeAll();
      return;
    }

    // Remove active run
    this.history.splice(this.activeRunIndex, 1);
    if (this.activeRunIndex >= this.history.length) {
      this.activeRunIndex = this.history.length - 1;
    }
    this.renderActiveRun();
  }

  public closeAll(): void {
    this.history = [];
    this.activeRunIndex = -1;
    if (this.drawerElement) {
      this.drawerElement.style.display = 'none';
    }
    this.toggleExpand(false);
  }

  public clear(): void {
    this.closeAll();
  }

  public getHistory(): ExecutionRunRecord[] {
    return this.history;
  }

  public getActiveRunIndex(): number {
    return this.activeRunIndex;
  }

  private renderActiveRun(): void {
    if (!this.drawerElement) return;

    // Ensure container visible if hidden previously
    this.drawerElement.style.display = 'block';

    const historyNav = this.drawerElement.querySelector<HTMLElement>('.history-nav');
    const prevBtn = this.drawerElement.querySelector<HTMLButtonElement>('.btn-prev');
    const nextBtn = this.drawerElement.querySelector<HTMLButtonElement>('.btn-next');
    const navLabel = this.drawerElement.querySelector<HTMLElement>('.nav-label');

    const badge = this.drawerElement.querySelector('.status-badge');
    const timing = this.drawerElement.querySelector('.timing-badge');
    const stdoutEl = this.drawerElement.querySelector<HTMLElement>('.drawer-stdout');
    const stderrEl = this.drawerElement.querySelector<HTMLElement>('.drawer-stderr');

    if (this.history.length > 1) {
      if (historyNav) historyNav.style.display = 'flex';
      if (navLabel) navLabel.textContent = `Run ${this.activeRunIndex + 1}/${this.history.length}`;
      if (prevBtn) prevBtn.disabled = this.activeRunIndex === 0;
      if (nextBtn) nextBtn.disabled = this.activeRunIndex === this.history.length - 1;
    } else {
      if (historyNav) historyNav.style.display = 'none';
    }

    if (this.activeRunIndex < 0 || this.activeRunIndex >= this.history.length) {
      if (badge) {
        badge.className = 'status-badge ready';
        badge.textContent = 'Ready';
      }
      if (timing) timing.textContent = '';
      if (stdoutEl) stdoutEl.style.display = 'none';
      if (stderrEl) stderrEl.style.display = 'none';
      return;
    }

    const run = this.history[this.activeRunIndex];

    if (badge) {
      badge.className = `status-badge ${run.status}`;
      badge.textContent = run.status === 'running' ? 'Running...' : run.status === 'success' ? 'Success' : 'Failed';
    }

    if (timing) {
      timing.textContent = run.status === 'running' ? 'Executing...' : run.executionTimeMs ? `${run.executionTimeMs.toFixed(1)}ms` : '';
    }

    if (stdoutEl) {
      if (run.status === 'running') {
        stdoutEl.textContent = '⚙️ Executing code in WASM sandbox environment...';
        stdoutEl.style.display = 'block';
      } else if (run.stdout) {
        stdoutEl.textContent = run.stdout;
        stdoutEl.style.display = 'block';
      } else {
        stdoutEl.style.display = 'none';
      }
    }

    if (stderrEl) {
      if (run.stderr) {
        stderrEl.textContent = run.stderr;
        stderrEl.style.display = 'block';
      } else {
        stderrEl.style.display = 'none';
      }
    }
  }
}

