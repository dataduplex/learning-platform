import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SEQUENTIAL_BLUE } from '@/lib/palette';
import { ColorKey, keyWidth, swatchWidthFor } from './ColorKey';

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

  it('draws 22px swatches 2px apart unless told otherwise', () => {
    render(<ColorKey caption="Loss" stops={STOPS} />);
    const row = document.querySelector('.color-key-row') as HTMLElement;
    const stops = [...document.querySelectorAll('.color-key-stop')] as HTMLElement[];
    // 4 swatches of 22 and 3 gaps of 2.
    expect([row.style.width, row.style.gap]).toEqual(['94px', '2px']);
    expect(stops.map((stop) => stop.style.width)).toEqual(['22px', '22px', '22px', '22px']);
  });

  it('draws each swatch at the width it is given, and sizes the key from them', () => {
    render(<ColorKey caption="Loss" stops={STOPS} swatchWidth={8} />);
    const row = document.querySelector('.color-key-row') as HTMLElement;
    const stops = [...document.querySelectorAll('.color-key-stop')] as HTMLElement[];
    expect(row.style.width).toBe('38px');
    expect(stops.map((stop) => stop.style.width)).toEqual(['8px', '8px', '8px', '8px']);
  });
});

describe('keyWidth and swatchWidthFor', () => {
  it('measure a key from its swatches and gaps, and find the swatch that spans a width', () => {
    expect(keyWidth(13, 22)).toBe(310);
    expect(keyWidth(13, 8)).toBe(128);
    expect(swatchWidthFor(128, 13)).toBe(8);
    expect(swatchWidthFor(68, 7)).toBe(8);
  });

  it('refuses a span its swatches cannot fill in whole pixels', () => {
    expect(() => swatchWidthFor(126, 13)).toThrow('13 swatches cannot span 126px in whole pixels');
    // Twelve gaps of 2 fill 24 and leave the swatches nothing.
    expect(() => swatchWidthFor(24, 13)).toThrow('13 swatches cannot span 24px in whole pixels');
  });
});
