export interface ConsentModalOptions {
  title: string;
  assetName: string;
  sizeMB: number;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export class ConsentModal {
  private options: ConsentModalOptions;
  private hostElement: HTMLElement | null = null;

  constructor(options: ConsentModalOptions) {
    this.options = options;
  }

  /**
   * Mounts the Shadow DOM consent modal UI into the specified parent node.
   */
  public mount(parent: HTMLElement = document.body): HTMLElement {
    if (this.hostElement && parent.contains(this.hostElement)) {
      return this.hostElement;
    }

    this.hostElement = document.createElement('div');
    this.hostElement.className = 'omni-run-consent-host';
    parent.appendChild(this.hostElement);

    const shadow = this.hostElement.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 999999;
        background: rgba(15, 23, 42, 0.65);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: system-ui, -apple-system, sans-serif;
      }
      .modal {
        background: #1e293b;
        color: #f8fafc;
        border: 1px solid #334155;
        border-radius: 12px;
        width: 100%;
        max-width: 420px;
        padding: 24px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);
      }
      .consent-title {
        margin: 0 0 12px 0;
        font-size: 18px;
        font-weight: 700;
        color: #f1f5f9;
      }
      .consent-details {
        font-size: 14px;
        line-height: 1.5;
        color: #94a3b8;
        margin-bottom: 20px;
      }
      .badge {
        display: inline-block;
        background: #0f172a;
        color: #38bdf8;
        padding: 2px 8px;
        border-radius: 4px;
        font-weight: 600;
        font-size: 13px;
      }
      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }
      button {
        font-size: 14px;
        font-weight: 600;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        border: none;
        transition: opacity 0.15s ease;
      }
      button:hover {
        opacity: 0.9;
      }
      .btn-cancel {
        background: #334155;
        color: #cbd5e1;
      }
      .btn-confirm {
        background: #2563eb;
        color: #ffffff;
      }
    `;

    const backdrop = document.createElement('div');
    backdrop.className = 'backdrop';

    backdrop.innerHTML = `
      <div class="modal">
        <h3 class="consent-title">${this.options.title}</h3>
        <p class="consent-details">
          Omni-Run requires local execution runtime <span class="badge">${this.options.assetName}</span> 
          (<strong style="color:#e2e8f0;">${this.options.sizeMB.toFixed(1)} MB</strong>). 
          This runtime will be downloaded once and cached securely in local device storage (OPFS).
        </p>
        <div class="actions">
          <button class="btn-cancel">Cancel</button>
          <button class="btn-confirm">Download & Run</button>
        </div>
      </div>
    `;

    shadow.appendChild(style);
    shadow.appendChild(backdrop);

    const cancelBtn = backdrop.querySelector<HTMLButtonElement>('.btn-cancel');
    const confirmBtn = backdrop.querySelector<HTMLButtonElement>('.btn-confirm');

    cancelBtn?.addEventListener('click', () => {
      if (this.options.onCancel) this.options.onCancel();
      this.unmount();
    });

    confirmBtn?.addEventListener('click', () => {
      if (this.options.onConfirm) this.options.onConfirm();
      this.unmount();
    });

    return this.hostElement;
  }

  /**
   * Removes the consent modal element from the DOM.
   */
  public unmount(): void {
    if (this.hostElement && this.hostElement.parentNode) {
      this.hostElement.parentNode.removeChild(this.hostElement);
      this.hostElement = null;
    }
  }
}
