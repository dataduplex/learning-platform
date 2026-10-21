import { describe, expect, it } from 'vitest';
import { memoryStorage } from '../test/render';
import { applyTheme, readStoredTheme, resolveMode, themeBootstrapScript } from './theme';

const KEY = 'test-course:theme';

describe('readStoredTheme', () => {
  it('returns system when nothing is stored', () => {
    expect(readStoredTheme(memoryStorage(), KEY)).toBe('system');
  });

  it('reads a stored choice', () => {
    const storage = memoryStorage();
    storage.setItem(KEY, 'dark');
    expect(readStoredTheme(storage, KEY)).toBe('dark');
  });

  it('falls back to system for a value it does not recognise', () => {
    const storage = memoryStorage();
    storage.setItem(KEY, 'sepia');
    expect(readStoredTheme(storage, KEY)).toBe('system');
  });

  it('survives a storage that throws, as in private browsing', () => {
    const hostile: Storage = {
      length: 0,
      clear() {}, key: () => null, removeItem() {}, setItem() {},
      getItem() { throw new Error('denied'); },
    };
    expect(readStoredTheme(hostile, KEY)).toBe('system');
  });
});

describe('applyTheme', () => {
  it('stamps the attribute and persists the choice', () => {
    const root = document.createElement('html');
    const storage = memoryStorage();
    applyTheme('dark', root, storage, KEY);
    expect(root.dataset.theme).toBe('dark');
    expect(storage.getItem(KEY)).toBe('dark');
  });

  it('removes the attribute for system, so the media query takes over', () => {
    const root = document.createElement('html');
    const storage = memoryStorage();
    applyTheme('light', root, storage, KEY);
    applyTheme('system', root, storage, KEY);
    expect(root.dataset.theme).toBeUndefined();
    expect(storage.getItem(KEY)).toBe('system');
  });
});

describe('themeBootstrapScript', () => {
  it('reads the course key and stamps only an explicit choice', () => {
    const script = themeBootstrapScript(KEY);
    expect(script).toContain(`localStorage.getItem('${KEY}')`);
    expect(script).toContain("t==='dark'||t==='light'");
  });
});

describe('resolveMode', () => {
  function rootWith(theme?: string): HTMLElement {
    const element = document.createElement('html');
    if (theme !== undefined) element.dataset.theme = theme;
    return element;
  }

  it('follows the OS when nothing is stamped', () => {
    expect(resolveMode(rootWith(), true)).toBe('dark');
    expect(resolveMode(rootWith(), false)).toBe('light');
  });

  it('lets a dark stamp win over a light OS', () => {
    expect(resolveMode(rootWith('dark'), false)).toBe('dark');
  });

  it('lets a light stamp win over a dark OS', () => {
    // The toggle must beat the OS in BOTH directions, not just one.
    expect(resolveMode(rootWith('light'), true)).toBe('light');
  });

  it('ignores a stamp it does not recognise', () => {
    expect(resolveMode(rootWith('midnight'), true)).toBe('dark');
  });
});
