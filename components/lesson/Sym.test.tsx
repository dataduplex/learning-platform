import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { notationById } from '@/content/notation';
import { Sym } from './Sym';

// NotationEntry is {id, symbol, name, meaning, shape?, introducedIn}: the spoken
// form is `name` and the gloss is `meaning`.
const DOT = notationById('dot-product')!;

describe('Sym', () => {
  it('typesets the symbol and links to its entry', () => {
    render(<Sym id="dot-product" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/notation#dot-product');
    expect(document.querySelector('.katex')).toBeInTheDocument();
  });

  it('carries the spoken name so a screen reader does not read the markup', () => {
    render(<Sym id="dot-product" />);
    expect(screen.getByText(DOT.name)).toHaveClass('sr-only');
  });

  it('throws on an unknown id rather than rendering a dangling reference', () => {
    expect(() => render(<Sym id="not-a-symbol" />)).toThrow(/not-a-symbol/);
  });

  it('renders the gloss as a title for a pointer reader', () => {
    render(<Sym id="dot-product" />);
    expect(screen.getByRole('link')).toHaveAttribute('title', DOT.meaning);
  });
});
