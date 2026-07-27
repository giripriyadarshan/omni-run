import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConsentModal } from '@/entrypoints/content/consent-modal';

describe('ConsentModal - User Consent UI Component inside Shadow DOM', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should render consent modal inside an isolated Shadow DOM host', () => {
    const modal = new ConsentModal({
      title: 'Download Required Engine',
      assetName: 'Python Pyodide Engine',
      sizeMB: 12.4,
    });

    const host = modal.mount(document.body);
    expect(host.shadowRoot).not.toBeNull();

    const titleEl = host.shadowRoot?.querySelector('.consent-title');
    expect(titleEl?.textContent).toContain('Download Required Engine');

    const descEl = host.shadowRoot?.querySelector('.consent-details');
    expect(descEl?.textContent).toContain('12.4 MB');
  });

  it('should trigger onConfirm callback when user clicks Accept button', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    const modal = new ConsentModal({
      title: 'Download Python Engine',
      assetName: 'Pyodide WASM',
      sizeMB: 12.4,
      onConfirm,
      onCancel,
    });

    const host = modal.mount(document.body);
    const confirmBtn = host.shadowRoot?.querySelector<HTMLButtonElement>('.btn-confirm');
    expect(confirmBtn).not.toBeNull();

    confirmBtn?.click();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('should trigger onCancel callback and remove modal when user clicks Cancel', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    const modal = new ConsentModal({
      title: 'Download Python Engine',
      assetName: 'Pyodide WASM',
      sizeMB: 12.4,
      onConfirm,
      onCancel,
    });

    const host = modal.mount(document.body);
    const cancelBtn = host.shadowRoot?.querySelector<HTMLButtonElement>('.btn-cancel');
    expect(cancelBtn).not.toBeNull();

    cancelBtn?.click();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(document.body.contains(host)).toBe(false);
  });
});
