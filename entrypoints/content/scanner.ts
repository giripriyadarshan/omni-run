import { executeCodeBlockWorkflow } from './runner-workflow';
import { WASMMCPServer } from '../core/mcp-server';

export interface StreamingDebouncer {
  notifyMutation: () => void;
  cancel: () => void;
}

export class DOMScanner {
  private static SELECTORS = [
    'code-block',
    'div.code-block-decoration',
    '.formatted-code',
    'pre code',
    'div.coding',
    'pre.notranslate',
  ];

  /**
   * Scans a DOM root container for supported code block elements.
   */
  public findCodeBlocks(root: ParentNode = document): HTMLElement[] {
    const matchedElements = new Set<HTMLElement>();

    for (const selector of DOMScanner.SELECTORS) {
      const elements = root.querySelectorAll<HTMLElement>(selector);
      elements.forEach((el) => matchedElements.add(el));
    }

    const allElements = Array.from(matchedElements);

    // Filter out any element that is contained within another matched element
    return allElements.filter(
      (el) => !allElements.some((other) => other !== el && other.contains(el))
    );
  }

  /**
   * Attaches an isolated Shadow DOM root with the [▶ Run in WASM] action button.
   */
  public injectRunnerUI(target: HTMLElement): HTMLElement {
    // Check if host wrapper already exists
    let host = target.querySelector<HTMLElement>('.omni-run-host');

    if (!host) {
      host = document.createElement('div');
      host.className = 'omni-run-host';
      target.appendChild(host);

      // Prevent events inside isolated host UI from leaking to host page listeners (e.g. Gemini WIZ)
      const stopLeaking = (e: Event) => {
        try {
          e.stopPropagation();
          e.stopImmediatePropagation();
        } catch (_) {}
      };
      host.addEventListener('click', stopLeaking);
      host.addEventListener('mousedown', stopLeaking);
      host.addEventListener('mouseup', stopLeaking);
    }

    if (!host.shadowRoot) {
      const shadowRoot = host.attachShadow({ mode: 'open' });

      // Inline Shadow DOM styles for host isolation
      const style = document.createElement('style');
      style.textContent = `
        .omni-run-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 6px;
          margin-bottom: 6px;
          padding: 6px 12px;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: #ffffff;
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          border: none;
          border-radius: 6px;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
          transition: transform 0.1s ease, filter 0.15s ease;
        }
        .omni-run-btn:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }
        .omni-run-btn:active {
          transform: translateY(0);
        }
      `;

      const button = document.createElement('button');
      button.className = 'omni-run-btn';
      button.disabled = true;
      button.style.opacity = '0.6';
      button.style.cursor = 'not-allowed';
      button.innerHTML = `<span>⏳</span> Detecting...`;

      const mcpServer = new WASMMCPServer();
      mcpServer
        .handleRequest({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: 'create_button',
            arguments: {
              code: target.textContent || '',
              hintClass: target.className || '',
            },
          },
        })
        .then((res) => {
          if (res.result?.content?.[0]?.text) {
            try {
              const cfg = JSON.parse(res.result.content[0].text);
              if (cfg.enabled) {
                button.innerHTML = cfg.label;
                button.disabled = false;
                button.style.opacity = '1.0';
                button.style.cursor = 'pointer';
              }
            } catch (_) {
              button.innerHTML = `<span>▶</span> Run in WASM`;
              button.disabled = false;
              button.style.opacity = '1.0';
              button.style.cursor = 'pointer';
            }
          }
        })
        .catch(() => {
          button.innerHTML = `<span>▶</span> Run in WASM`;
          button.disabled = false;
          button.style.opacity = '1.0';
          button.style.cursor = 'pointer';
        });

      button.addEventListener('click', (e) => {
        try {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        } catch (_) {}
        if (!button.disabled) {
          executeCodeBlockWorkflow(target, shadowRoot);
        }
      });

      shadowRoot.appendChild(style);
      shadowRoot.appendChild(button);
    }

    return host;
  }

  /**
   * Creates a streaming debouncer engine for real-time site updates (e.g., Gemini).
   */
  public createStreamingDebouncer(
    callback: () => void,
    delayMs: number = 300
  ): StreamingDebouncer {
    let timer: ReturnType<typeof setTimeout> | null = null;

    return {
      notifyMutation: () => {
        if (timer !== null) {
          clearTimeout(timer);
        }
        timer = setTimeout(() => {
          callback();
          timer = null;
        }, delayMs);
      },
      cancel: () => {
        if (timer !== null) {
          clearTimeout(timer);
          timer = null;
        }
      },
    };
  }
}
