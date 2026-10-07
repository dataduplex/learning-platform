import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LabelSymbol, NumberReadout, formatFixed, formatScientific, groupThousands } from './NumberReadout';

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

  it('keeps the sign of a small negative that rounds to zero, because the sign is real', () => {
    expect(formatFixed(-8.326672684688674e-17, 4)).toBe('-0.0000');
    expect(formatFixed(-0, 2)).toBe('0.00');
    expect(formatFixed(Number.NaN, 2)).toBe('-');
  });
});

describe('formatScientific', () => {
  it("writes the course's notation, not JavaScript's", () => {
    expect(formatScientific(4.805930865741478e-10, 3)).toBe('4.806 × 10⁻¹⁰');
    expect(formatScientific(3.8592439889821707e-16, 3)).toBe('3.859 × 10⁻¹⁶');
    expect(formatScientific(2.444557e-11, 3)).toBe('2.445 × 10⁻¹¹');
    expect(formatScientific(1170.4, 2)).toBe('1.17 × 10³');
    expect(formatScientific(1.43, 2)).toBe('1.43');
    expect(formatScientific(0, 2)).toBe('0.00');
    expect(formatScientific(Number.POSITIVE_INFINITY, 2)).toBe('-');
  });
});

describe('groupThousands', () => {
  it('puts a comma between each group of three digits in the whole part only', () => {
    expect(groupThousands('2000')).toBe('2,000');
    expect(groupThousands('-1234567.8912')).toBe('-1,234,567.8912');
    expect(groupThousands('999')).toBe('999');
    expect(groupThousands('0.0001')).toBe('0.0001');
    expect(groupThousands('-')).toBe('-');
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

  it('puts an optional test id on the number, not the label', () => {
    render(<NumberReadout label="error" value={0.25} digits={2} testId="the-error" />);
    expect(screen.getByTestId('the-error')).toHaveTextContent('0.25');
  });

  it('exposes label and value as a description list pair', () => {
    render(<NumberReadout label="norm" value={5} digits={2} />);
    expect(document.querySelector('dt')).toHaveTextContent('norm');
    expect(document.querySelector('dd')).toHaveTextContent('5.00');
  });

  it('groups the whole part in threes only when asked', () => {
    const { rerender } = render(<NumberReadout label="step" value={2000} digits={0} testId="n" />);
    expect(screen.getByTestId('n').textContent).toBe('2000');
    rerender(<NumberReadout label="step" value={2000} digits={0} grouped testId="n" />);
    expect(screen.getByTestId('n').textContent).toBe('2,000');
    rerender(<NumberReadout label="step" value={-1234.5} digits={2} grouped testId="n" />);
    expect(screen.getByTestId('n').textContent).toBe('-1,234.50');
  });

  it('formats in scientific notation when asked', () => {
    render(<NumberReadout label="error" value={4.805930865741478e-10} digits={3} format="scientific" testId="e" />);
    expect(screen.getByTestId('e').textContent).toBe('4.806 × 10⁻¹⁰');
  });

  it('keeps a symbol in its own case inside an uppercase label', () => {
    render(<NumberReadout label={<>Length of <LabelSymbol>ka + b</LabelSymbol></>} value={2} testId="n" />);
    expect(document.querySelector('.readout-label .label-symbol')?.textContent).toBe('ka + b');
  });
});
