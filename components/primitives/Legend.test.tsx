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
});
