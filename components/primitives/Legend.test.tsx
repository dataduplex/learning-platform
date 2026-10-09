import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Legend } from './Legend';

const ITEMS = [
  { label: 'projection', color: 'var(--series-1)' },
  { label: 'residual', color: 'var(--series-2)' },
];

describe('Legend', () => {
  it('lists one entry per series', () => {
    render(<Legend items={ITEMS} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('projection')).toBeInTheDocument();
  });

  it('hides the swatches from assistive technology, since the text carries identity', () => {
    render(<Legend items={ITEMS} />);
    for (const swatch of document.querySelectorAll('.legend-swatch')) {
      expect(swatch).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('puts the color on the swatch, never on the label text', () => {
    render(<Legend items={ITEMS} />);
    const swatch = document.querySelector('.legend-swatch') as HTMLElement;
    expect(swatch.style.background).toBe('var(--series-1)');
    expect((screen.getByText('projection') as HTMLElement).style.color).toBe('');
  });

  it('takes an accessible name when one is given', () => {
    render(<Legend items={ITEMS} label="Decomposition" />);
    expect(screen.getByRole('list', { name: 'Decomposition' })).toBeInTheDocument();
  });

  it('renders nothing for a single series, because the title already names it', () => {
    const { container } = render(<Legend items={[ITEMS[0] as (typeof ITEMS)[number]]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a line key when kind is line', () => {
    const items = [
      { label: 'data', color: 'var(--series-1)', kind: 'line' as const },
      { label: 'fit', color: 'var(--series-2)', kind: 'line' as const },
    ];
    render(<Legend items={items} />);
    expect(document.querySelectorAll('.legend-line')).toHaveLength(2);
    expect(document.querySelectorAll('.legend-swatch')).toHaveLength(0);
  });

  it('renders a dashed key when kind is dashed, with its color as border color', () => {
    const items = [
      { label: 'boundary', color: 'var(--series-3)', kind: 'dashed' as const },
      { label: 'other', color: 'var(--series-4)' },
    ];
    render(<Legend items={items} />);
    const dashed = document.querySelector('.legend-dashed') as HTMLElement;
    expect(dashed).toBeInTheDocument();
    expect(dashed.style.borderColor).toBe('var(--series-3)');
    expect(document.querySelectorAll('.legend-swatch')).toHaveLength(1);
  });

  it('renders a framed area key when kind is area, filled with its color', () => {
    const items = [
      { label: 'span', color: 'var(--subspace-fill)', kind: 'area' as const },
      { label: 'column', color: 'var(--series-1)' },
    ];
    render(<Legend items={items} />);
    const keys = [...document.querySelectorAll('.legend-item > [aria-hidden="true"]')] as HTMLElement[];
    expect(keys.map((key) => [key.className, key.style.background]))
      .toEqual([['legend-area', 'var(--subspace-fill)'], ['legend-swatch', 'var(--series-1)']]);
  });

  it('renders a swatch when kind is omitted', () => {
    render(<Legend items={ITEMS} />);
    expect(document.querySelectorAll('.legend-swatch')).toHaveLength(2);
    expect(document.querySelectorAll('.legend-line')).toHaveLength(0);
    expect(document.querySelectorAll('.legend-dashed')).toHaveLength(0);
  });
});
