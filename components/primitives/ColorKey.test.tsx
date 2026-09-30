import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SEQUENTIAL_BLUE } from '@/lib/palette';
import { ColorKey } from './ColorKey';

const STOPS = [
  { color: SEQUENTIAL_BLUE[0] as string, label: '0' },
  { color: SEQUENTIAL_BLUE[5] as string },
  { color: SEQUENTIAL_BLUE[7] as string },
  { color: SEQUENTIAL_BLUE[12] as string, label: '10' },
];

describe('ColorKey', () => {
  it('carries the data-role for identification', () => {
    render(<ColorKey caption="Loss" stops={STOPS} />);
    expect(document.querySelector('[data-role="color-key"]')).toBeInTheDocument();
  });

  it('renders the caption visibly', () => {
    render(<ColorKey caption="Loss" stops={STOPS} />);
    expect(screen.getByText('Loss')).toBeInTheDocument();
    expect(screen.getByText('Loss')).toHaveClass('color-key-caption');
  });

  it('renders all stops in order with their colors', () => {
    render(<ColorKey caption="Loss" stops={STOPS} />);
    const swatches = [...document.querySelectorAll('.color-key-swatch')] as HTMLElement[];
    expect(swatches).toHaveLength(4);
    expect(swatches[0]?.style.background).toBe('rgb(205, 226, 251)');
    expect(swatches[3]?.style.background).toBe('rgb(13, 54, 107)');
  });

  it('renders labels only for stops that carry them', () => {
    render(<ColorKey caption="Loss" stops={STOPS} />);
    const labels = [...document.querySelectorAll('.color-key-label')].map((n) => n.textContent);
    expect(labels).toHaveLength(4);
    expect(labels[0]).toBe('0');
    expect(labels[1]).toBe('');
    expect(labels[2]).toBe('');
    expect(labels[3]).toBe('10');
  });
});
