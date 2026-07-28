import { describe, it, expect, beforeEach } from 'vitest';
import { OutputDrawer } from '../../entrypoints/content/output-drawer';

describe('OutputDrawer UI Component (Shadow DOM)', () => {
  let drawer: OutputDrawer;
  let shadowRoot: ShadowRoot;

  beforeEach(() => {
    document.body.innerHTML = '<div id="host"></div>';
    const host = document.getElementById('host')!;
    shadowRoot = host.attachShadow({ mode: 'open' });
    drawer = new OutputDrawer();
  });

  it('should mount output drawer into shadow DOM root', () => {
    const element = drawer.mount(shadowRoot);

    expect(element).toBeDefined();
    expect(shadowRoot.querySelector('.omni-run-drawer')).not.toBeNull();
    expect(drawer.isExpanded()).toBe(false);
  });

  it('should update status to Running when setRunning is called', () => {
    drawer.mount(shadowRoot);
    drawer.setRunning();

    const statusBadge = shadowRoot.querySelector('.status-badge');
    expect(statusBadge?.textContent).toContain('Running');
    expect(drawer.isExpanded()).toBe(true);
  });

  it('should render stdout and execution time on setSuccess', () => {
    drawer.mount(shadowRoot);
    drawer.setSuccess({
      success: true,
      stdout: 'Hello World Output\n',
      stderr: '',
      executionTimeMs: 14.5,
    });

    const statusBadge = shadowRoot.querySelector('.status-badge');
    const stdoutContainer = shadowRoot.querySelector('.drawer-stdout');
    const timingBadge = shadowRoot.querySelector('.timing-badge');

    expect(statusBadge?.textContent).toContain('Success');
    expect(stdoutContainer?.textContent).toContain('Hello World Output');
    expect(timingBadge?.textContent).toContain('14.5ms');
  });

  it('should render stderr on setError', () => {
    drawer.mount(shadowRoot);
    drawer.setError({
      success: false,
      stdout: '',
      stderr: 'SyntaxError: Unexpected token',
      executionTimeMs: 8.2,
    });

    const statusBadge = shadowRoot.querySelector('.status-badge');
    const stderrContainer = shadowRoot.querySelector('.drawer-stderr');

    expect(statusBadge?.textContent).toContain('Failed');
    expect(stderrContainer?.textContent).toContain('SyntaxError: Unexpected token');
  });

  it('should toggle expand/collapse state when toggleExpand is called', () => {
    drawer.mount(shadowRoot);
    expect(drawer.isExpanded()).toBe(false);

    drawer.toggleExpand();
    expect(drawer.isExpanded()).toBe(true);

    drawer.toggleExpand();
    expect(drawer.isExpanded()).toBe(false);
  });

  it('should stack multiple execution runs and allow top-left arrow navigation', () => {
    drawer.mount(shadowRoot);

    // Run #1
    drawer.setRunning();
    drawer.setSuccess({ success: true, stdout: 'Run 1 Output', stderr: '', executionTimeMs: 10 });

    // Run #2
    drawer.setRunning();
    drawer.setSuccess({ success: true, stdout: 'Run 2 Output', stderr: '', executionTimeMs: 12 });

    expect(drawer.getHistory().length).toBe(2);
    expect(drawer.getActiveRunIndex()).toBe(1); // Run #2 active at front

    const navLabel = shadowRoot.querySelector('.nav-label');
    const stdout = shadowRoot.querySelector('.drawer-stdout');

    expect(navLabel?.textContent).toBe('Run 2/2');
    expect(stdout?.textContent).toBe('Run 2 Output');

    // Click previous arrow ◀
    const prevBtn = shadowRoot.querySelector<HTMLButtonElement>('.btn-prev');
    prevBtn?.click();

    expect(drawer.getActiveRunIndex()).toBe(0);
    expect(navLabel?.textContent).toBe('Run 1/2');
    expect(stdout?.textContent).toBe('Run 1 Output');

    // Click next arrow ▶
    const nextBtn = shadowRoot.querySelector<HTMLButtonElement>('.btn-next');
    nextBtn?.click();

    expect(drawer.getActiveRunIndex()).toBe(1);
    expect(navLabel?.textContent).toBe('Run 2/2');
    expect(stdout?.textContent).toBe('Run 2 Output');
  });

  it('should dismiss active run when dismiss button ✕ is clicked', () => {
    drawer.mount(shadowRoot);

    drawer.setRunning();
    drawer.setSuccess({ success: true, stdout: 'Run 1', stderr: '', executionTimeMs: 10 });
    drawer.setRunning();
    drawer.setSuccess({ success: true, stdout: 'Run 2', stderr: '', executionTimeMs: 12 });

    const closeBtn = shadowRoot.querySelector<HTMLButtonElement>('.btn-close');
    closeBtn?.click();

    expect(drawer.getHistory().length).toBe(1);
    const stdout = shadowRoot.querySelector('.drawer-stdout');
    expect(stdout?.textContent).toBe('Run 1');
  });

  it('should close output block entirely when Close All button is clicked', () => {
    drawer.mount(shadowRoot);

    drawer.setRunning();
    drawer.setSuccess({ success: true, stdout: 'Run 1', stderr: '', executionTimeMs: 10 });

    const closeAllBtn = shadowRoot.querySelector<HTMLButtonElement>('.btn-close-all');
    closeAllBtn?.click();

    expect(drawer.getHistory().length).toBe(0);
    const drawerEl = shadowRoot.querySelector<HTMLElement>('.omni-run-drawer');
    expect(drawerEl?.style.display).toBe('none');
  });

  it('should reuse existing drawer container and never duplicate .omni-run-drawer elements', () => {
    const d1 = new OutputDrawer();
    d1.mount(shadowRoot);

    const d2 = new OutputDrawer();
    d2.mount(shadowRoot);

    const drawers = shadowRoot.querySelectorAll('.omni-run-drawer');
    expect(drawers.length).toBe(1);
  });
});
