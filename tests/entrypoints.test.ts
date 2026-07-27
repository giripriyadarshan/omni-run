import { describe, it, expect, vi } from 'vitest';
import contentMain from '@/entrypoints/content';
import backgroundMain from '@/entrypoints/background';

describe('WXT Extension Entrypoints', () => {
  it('should define content script entrypoint', () => {
    expect(contentMain).toBeDefined();
    expect(typeof contentMain.main).toBe('function');
  });

  it('should define background entrypoint', () => {
    expect(backgroundMain).toBeDefined();
    expect(typeof backgroundMain.main).toBe('function');
  });
});
