import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithProgress } from '@/test/render';
import { CompleteButton } from './CompleteButton';

describe('CompleteButton', () => {
  it('offers to mark the lesson complete', () => {
    renderWithProgress(<CompleteButton lessonId="vectors-as-meaning" />);
    expect(screen.getByRole('button', { name: /mark this lesson complete/i })).toBeInTheDocument();
  });

  it('records completion and switches to an undo affordance', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProgress(<CompleteButton lessonId="vectors-as-meaning" />);
    await user.click(screen.getByRole('button', { name: /mark this lesson complete/i }));
    expect(store.load().lessons['vectors-as-meaning']?.completed).toBe(true);
    expect(screen.getByRole('button', { name: /mark as not complete/i })).toBeInTheDocument();
  });

  it('announces the change in a live region', async () => {
    const user = userEvent.setup();
    renderWithProgress(<CompleteButton lessonId="vectors-as-meaning" />);
    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('status')).toHaveTextContent(/complete/i);
  });

  it('undoes cleanly', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProgress(<CompleteButton lessonId="vectors-as-meaning" />);
    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('button', { name: /mark as not complete/i }));
    expect(store.load().lessons['vectors-as-meaning']?.completed).toBe(false);
  });
});
