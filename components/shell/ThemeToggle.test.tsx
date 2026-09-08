import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ThemeToggle } from './ThemeToggle';

describe('ThemeToggle', () => {
  it('offers all three choices as a radio group', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('radiogroup', { name: /theme/i })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('stamps the document when a choice is made', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole('radio', { name: /dark/i }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    await user.click(screen.getByRole('radio', { name: /system/i }));
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('marks the active choice as checked', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole('radio', { name: /light/i }));
    expect(screen.getByRole('radio', { name: /light/i })).toBeChecked();
  });
});
