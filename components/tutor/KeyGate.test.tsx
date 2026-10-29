import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { KeyGate } from './KeyGate';
import { memoryStorage } from '../../test/render';

const KEY = `sk-ant-${'x'.repeat(60)}`;
const STORAGE_KEY = 'test-course:tutor-key';

describe('KeyGate', () => {
  it('explains where the key goes before asking for it', () => {
    render(<KeyGate storageKey={STORAGE_KEY} storage={memoryStorage()} onSaved={vi.fn()} />);
    expect(screen.getByText(/stays in this browser/i)).toBeInTheDocument();
  });

  it('links to where a key comes from', () => {
    render(<KeyGate storageKey={STORAGE_KEY} storage={memoryStorage()} onSaved={vi.fn()} />);
    expect(screen.getByRole('link', { name: /console/i })).toHaveAttribute(
      'href',
      'https://console.anthropic.com/settings/keys',
    );
  });

  it('uses a password field so the key is not left on screen', () => {
    render(<KeyGate storageKey={STORAGE_KEY} storage={memoryStorage()} onSaved={vi.fn()} />);
    expect(screen.getByLabelText(/api key/i)).toHaveAttribute('type', 'password');
  });

  it('saves a plausible key and reports it upward', async () => {
    const user = userEvent.setup();
    const storage = memoryStorage();
    const onSaved = vi.fn();
    render(<KeyGate storageKey={STORAGE_KEY} storage={storage} onSaved={onSaved} />);
    await user.type(screen.getByLabelText(/api key/i), KEY);
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(onSaved).toHaveBeenCalled();
    expect(storage.getItem(STORAGE_KEY)).toBe(KEY);
  });

  it('rejects an implausible key with a message that does not echo it', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(<KeyGate storageKey={STORAGE_KEY} storage={memoryStorage()} onSaved={onSaved} />);
    await user.type(screen.getByLabelText(/api key/i), 'hunter2');
    await user.click(screen.getByRole('button', { name: /save/i }));
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/does not look like/i);
    expect(alert).not.toHaveTextContent('hunter2');
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('does not leave the key in the field after saving it', async () => {
    const user = userEvent.setup();
    render(<KeyGate storageKey={STORAGE_KEY} storage={memoryStorage()} onSaved={vi.fn()} />);
    const field = screen.getByLabelText(/api key/i);
    await user.type(field, KEY);
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(field).toHaveValue('');
  });

  it('does not store a key that storage refuses, and does not crash either', async () => {
    // Private browsing throws on setItem. The tutor is optional, so this must
    // degrade rather than take the lesson down with it.
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const hostile: Storage = {
      length: 0,
      clear: vi.fn(),
      getItem: () => null,
      key: () => null,
      removeItem: vi.fn(),
      setItem: () => { throw new DOMException('denied', 'QuotaExceededError'); },
    };
    render(<KeyGate storageKey={STORAGE_KEY} storage={hostile} onSaved={onSaved} />);
    await user.type(screen.getByLabelText(/api key/i), KEY);
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(onSaved).toHaveBeenCalled();
  });
});
