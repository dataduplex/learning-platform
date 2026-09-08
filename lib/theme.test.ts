import { describe, expect, it } from 'vitest';
import { THEME_STORAGE_KEY, applyTheme, readStoredTheme, resolveMode } from './theme';
import { memoryStorage } from '@/test/render';

describe('readStoredTheme', () => {
  it('returns system when nothing is stored', () => {
    expect(readStoredTheme(memoryStorage())).toBe('system');
  });

  it('reads a stored choice', () => {
    const storage = memoryStorage();
    storage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(readStoredTheme(storage)).toBe('dark');
  });

  it('falls back to system for a value it does not recognise', () => {
    const storage = memoryStorage();
    storage.setItem(THEME_STORAGE_KEY, 'sepia');
    expect(readStoredTheme(storage)).toBe('system');
  });

  it('survives a storage that throws, as in private browsing', () => {
    const hostile: Storage = {
      length: 0,
      clear() {}, key: () => null, removeItem() {}, setItem() {},
      getItem() { throw new Error('denied'); },
    };
    expect(readStoredTheme(hostile)).toBe('system');
  });
});

describe('applyTheme', () => {
  it('stamps the attribute and persists the choice', () => {
    const root = document.createElement('html');
    const storage = memoryStorage();
    applyTheme('dark', root, storage);
    expect(root.dataset.theme).toBe('dark');
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('removes the attribute for system, so the media query takes over', () => {
    const root = document.createElement('html');
    const storage = memoryStorage();
    applyTheme('light', root, storage);
    applyTheme('system', root, storage);
    expect(root.dataset.theme).toBeUndefined();
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('system');
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
