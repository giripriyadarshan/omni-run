import { AILanguageDetector, AIDetectorOptions } from './ai-detector';

export type ExecutionTier = 'tier1' | 'tier2';
export type ExecutionEngine = 'pyodide' | 'quickjs' | 'container2wasm';

export interface MCPRPCRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

export interface MCPRPCResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

export class WASMMCPServer {
  private detector: AILanguageDetector;

  constructor() {
    this.detector = new AILanguageDetector();
  }

  /**
   * Handles incoming MCP JSON-RPC requests for tool discovery and execution.
   */
  public async handleRequest(request: MCPRPCRequest): Promise<MCPRPCResponse> {
    const { method, params, id } = request;

    if (method === 'tools/list') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: [
            {
              name: 'detect_code_language',
              description: 'Detects code language using AI classification engine',
            },
            {
              name: 'create_button',
              description: 'Evaluates code block using AI and creates an enabled WASM action button',
            },
            {
              name: 'execute_wasm_runtime',
              description: 'Executes code block inside appropriate WASI or Container WASM worker',
            },
            {
              name: 'get_button_config',
              description: 'Generates dynamic button UI configuration based on engine and language',
            },
          ],
        },
      };
    }

    if (method === 'tools/call') {
      const toolName = params?.name;
      const args = params?.arguments || {};

      if (toolName === 'detect_code_language') {
        const lang = await this.detector.detectLanguage(
          args.code || '',
          args.hintClass || '',
          args.options || {}
        );
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: lang }],
          },
        };
      }

      if (toolName === 'create_button') {
        const lang = await this.detector.detectLanguage(
          args.code || '',
          args.hintClass || '',
          args.options || {}
        );

        let engine: ExecutionEngine = 'quickjs';
        let tier: ExecutionTier = 'tier1';

        if (lang === 'python') {
          engine = 'pyodide';
          tier = 'tier1';
        } else if (['javascript', 'typescript'].includes(lang)) {
          engine = 'quickjs';
          tier = 'tier1';
        } else {
          engine = 'container2wasm';
          tier = 'tier2';
        }

        const formattedLang = lang.charAt(0).toUpperCase() + lang.slice(1);

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  enabled: true,
                  language: lang,
                  engine,
                  tier,
                  label: `▶ Run ${formattedLang} in WASM`,
                }),
              },
            ],
          },
        };
      }

      if (toolName === 'get_button_config') {
        const lang = args.language || 'javascript';
        const engine = args.engine || 'quickjs';
        const formattedLang = lang.charAt(0).toUpperCase() + lang.slice(1);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  enabled: true,
                  label: `▶ Run ${formattedLang} in WASM`,
                  language: lang,
                  engine,
                  tier: engine === 'container2wasm' ? 'tier2' : 'tier1',
                }),
              },
            ],
          },
        };
      }
    }

    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32601,
        message: `Method not found: ${method}`,
      },
    };
  }
}
