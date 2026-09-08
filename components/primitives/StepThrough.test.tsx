import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StepThrough } from './StepThrough';

const steps = [
  { title: 'Take the first row', body: <p>Row 1 of A.</p> },
  { title: 'Take the first column', body: <p>Column 1 of B.</p> },
  { title: 'Sum the products', body: <p>That is entry (1, 1).</p> },
];

describe('StepThrough', () => {
  it('starts on the first step and shows only that step', () => {
    render(<StepThrough steps={steps} label="Matrix multiplication" />);
    expect(screen.getByText('Take the first row')).toBeInTheDocument();
    expect(screen.queryByText('Sum the products')).not.toBeInTheDocument();
  });

  it('announces position in a live region', () => {
    render(<StepThrough steps={steps} label="Matrix multiplication" />);
    expect(screen.getByRole('status')).toHaveTextContent('Step 1 of 3');
  });

  it('advances and goes back', async () => {
    const user = userEvent.setup();
    render(<StepThrough steps={steps} label="Matrix multiplication" />);
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Take the first column')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByText('Take the first row')).toBeInTheDocument();
  });

  it('disables Back on the first step and Next on the last', async () => {
    const user = userEvent.setup();
    render(<StepThrough steps={steps} label="Matrix multiplication" />);
    expect(screen.getByRole('button', { name: /back/i })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('restarts from the last step', async () => {
    const user = userEvent.setup();
    render(<StepThrough steps={steps} label="Matrix multiplication" />);
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /restart/i }));
    expect(screen.getByRole('status')).toHaveTextContent('Step 1 of 3');
  });

  it('can be driven from outside, so a figure and the steps stay in sync', async () => {
    const user = userEvent.setup();
    const onIndexChange = vi.fn();
    render(
      <StepThrough steps={steps} label="l" index={1} onIndexChange={onIndexChange} />,
    );
    expect(screen.getByText('Take the first column')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(onIndexChange).toHaveBeenCalledWith(2);
    // Controlled: the component does not move itself.
    expect(screen.getByText('Take the first column')).toBeInTheDocument();
  });
});
