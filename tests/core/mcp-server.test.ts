import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WASMMCPServer } from '../../entrypoints/core/mcp-server';

describe('WASMMCPServer (In-Browser MCP Tool Calling Interface)', () => {
  let server: WASMMCPServer;

  beforeEach(() => {
    server = new WASMMCPServer();
  });

  it('should list available WASM MCP tools', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    });

    expect(response.result).toBeDefined();
    const tools = response.result.tools;
    expect(tools.map((t: any) => t.name)).toContain('detect_code_language');
    expect(tools.map((t: any) => t.name)).toContain('execute_wasm_runtime');
    expect(tools.map((t: any) => t.name)).toContain('get_button_config');
  });

  it('should call detect_code_language tool and return language analysis', async () => {
    (globalThis as any).ai = {
      languageModel: {
        create: vi.fn().mockResolvedValue({
          prompt: vi.fn().mockResolvedValue('{"language": "rust"}'),
        }),
      },
    };

    const response = await server.handleRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'detect_code_language',
        arguments: {
          code: 'fn main() {\n    println!("hello");\n}',
        },
      },
    });

    expect(response.result.content[0].text).toContain('rust');
  });

  it('should call get_button_config tool and return dynamic custom action button label', async () => {
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'get_button_config',
        arguments: {
          language: 'rust',
          engine: 'container2wasm',
        },
      },
    });

    const config = JSON.parse(response.result.content[0].text);
    expect(config.label).toBe('▶ Run Rust in WASM');
    expect(config.engine).toBe('container2wasm');
  });
});
