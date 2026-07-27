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
});
