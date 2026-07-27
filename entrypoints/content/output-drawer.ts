import { ExecutionResult } from '../workers/pyodide-runner';

export class OutputDrawer {
  private drawerElement: HTMLElement | null = null;
  private expanded: boolean = false;

  /**
   * Mounts the OutputDrawer component inside a ShadowRoot host container.
   */
  public mount(target: ShadowRoot | HTMLElement): HTMLElement {
    if (this.drawerElement && target.contains(this.drawerElement)) {
      return this.drawerElement;
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
      .toggle-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-size: 12px;
        padding: 0 4px;
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
    `;

    container.innerHTML = `
      <div class="drawer-header">
        <div class="header-left">
          <span class="status-badge ready">Ready</span>
          <span class="timing-badge"></span>
        </div>
        <button class="toggle-btn" aria-label="Toggle drawer">▼</button>
      </div>
      <div class="drawer-body">
        <pre class="drawer-stdout" style="display:none;"></pre>
        <pre class="drawer-stderr" style="display:none;"></pre>
      </div>
    `;

    if (target instanceof ShadowRoot) {
      target.appendChild(style);
      target.appendChild(container);
    } else {
      target.appendChild(container);
    }

    this.drawerElement = container;

    const header = container.querySelector('.drawer-header');
    header?.addEventListener('click', (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      this.toggleExpand();
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
    const badge = this.drawerElement.querySelector('.status-badge');
    const timing = this.drawerElement.querySelector('.timing-badge');
    if (badge) {
      badge.className = 'status-badge running';
      badge.textContent = 'Running...';
    }
    if (timing) timing.textContent = '';
    this.toggleExpand(true);
  }

  public setSuccess(result: ExecutionResult): void {
    if (!this.drawerElement) return;
    const badge = this.drawerElement.querySelector('.status-badge');
    const timing = this.drawerElement.querySelector('.timing-badge');
    const stdoutEl = this.drawerElement.querySelector<HTMLElement>('.drawer-stdout');
    const stderrEl = this.drawerElement.querySelector<HTMLElement>('.drawer-stderr');

    if (badge) {
      badge.className = 'status-badge success';
      badge.textContent = 'Success';
    }
    if (timing) {
      timing.textContent = `${result.executionTimeMs.toFixed(1)}ms`;
    }
    if (stdoutEl) {
      stdoutEl.textContent = result.stdout || '(No output)';
      stdoutEl.style.display = 'block';
    }
    if (stderrEl) {
      stderrEl.style.display = result.stderr ? 'block' : 'none';
      if (result.stderr) stderrEl.textContent = result.stderr;
    }
    this.toggleExpand(true);
  }

  public setError(result: ExecutionResult | string): void {
    if (!this.drawerElement) return;
    const badge = this.drawerElement.querySelector('.status-badge');
    const timing = this.drawerElement.querySelector('.timing-badge');
    const stdoutEl = this.drawerElement.querySelector<HTMLElement>('.drawer-stdout');
    const stderrEl = this.drawerElement.querySelector<HTMLElement>('.drawer-stderr');

    const stderrMsg = typeof result === 'string' ? result : result.stderr || result.error || 'Execution failed';
    const executionTimeMs = typeof result === 'object' ? result.executionTimeMs : 0;
    const stdoutMsg = typeof result === 'object' ? result.stdout : '';

    if (badge) {
      badge.className = 'status-badge failed';
      badge.textContent = 'Failed';
    }
    if (timing && executionTimeMs > 0) {
      timing.textContent = `${executionTimeMs.toFixed(1)}ms`;
    }
    if (stdoutEl) {
      stdoutEl.style.display = stdoutMsg ? 'block' : 'none';
      if (stdoutMsg) stdoutEl.textContent = stdoutMsg;
    }
    if (stderrEl) {
      stderrEl.textContent = stderrMsg;
      stderrEl.style.display = 'block';
    }
    this.toggleExpand(true);
  }

  public clear(): void {
    if (!this.drawerElement) return;
    const stdoutEl = this.drawerElement.querySelector<HTMLElement>('.drawer-stdout');
    const stderrEl = this.drawerElement.querySelector<HTMLElement>('.drawer-stderr');
    if (stdoutEl) {
      stdoutEl.textContent = '';
      stdoutEl.style.display = 'none';
    }
    if (stderrEl) {
      stderrEl.textContent = '';
      stderrEl.style.display = 'none';
    }
  }
}
