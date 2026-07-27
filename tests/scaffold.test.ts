import { describe, it, expect } from 'vitest';

describe('Omni-Run Project Scaffold & Test Environment', () => {
  it('should have mock chrome runtime API initialized', () => {
    expect(chrome.runtime).toBeDefined();
    expect(chrome.runtime.getURL('test.png')).toBe('chrome-extension://mock-id/test.png');
  });

  it('should support DOM manipulation in jsdom environment', () => {
    const div = document.createElement('div');
    div.id = 'test-container';
    document.body.appendChild(div);
    
    expect(document.getElementById('test-container')).not.toBeNull();
  });
});
