import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NumberReadout, formatFixed } from './NumberReadout';

describe('formatFixed', () => {
  it('pads to a fixed width so a value cannot shift the layout', () => {
    expect(formatFixed(0.5, 3)).toBe('0.500');
    expect(formatFixed(-1, 2)).toBe('-1.00');
    expect(formatFixed(12, 0)).toBe('12');
  });

  it('renders a dash for a value that is not a number', () => {
    expect(formatFixed(Number.NaN, 2)).toBe('-');
    expect(formatFixed(Number.POSITIVE_INFINITY, 2)).toBe('-');
  });

  it('shows a signed zero as plain zero', () => {
    expect(formatFixed(-0, 2)).toBe('0.00');
  });
});

describe('NumberReadout', () => {
  it('pairs a label with its value', () => {
    render(<NumberReadout label="cosine" value={0.7071} digits={3} />);
    expect(screen.getByText('cosine')).toBeInTheDocument();
    expect(screen.getByText('0.707')).toBeInTheDocument();
  });

  it('appends a unit outside the number, so the digits stay aligned', () => {
    render(<NumberReadout label="angle" value={45} digits={1} unit="degrees" />);
    expect(screen.getByText('45.0')).toBeInTheDocument();
    expect(screen.getByText('degrees')).toBeInTheDocument();
  });

  it('exposes label and value as a description list pair', () => {
    render(<NumberReadout label="norm" value={5} digits={2} />);
    expect(document.querySelector('dt')).toHaveTextContent('norm');
    expect(document.querySelector('dd')).toHaveTextContent('5.00');
  });
});
