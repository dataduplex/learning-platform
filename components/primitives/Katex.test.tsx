import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Katex } from './Katex';

describe('Katex', () => {
  it('typesets inline source', () => {
    render(<Katex source="x^2" />);
    expect(document.querySelector('.katex')).toBeInTheDocument();
  });

  // A JSX string attribute does no escape processing, so TeX sources go in an
  // expression container: source={'\\sum'} is one backslash, source="\\sum" is two.
  it('marks display math as a block', () => {
    render(<Katex source={'\\sum_i x_i'} display />);
    expect(document.querySelector('.katex-display')).toBeInTheDocument();
  });

  it('falls back to the source text rather than blowing up on bad input', () => {
    render(<Katex source={'\\frac{1}{'} />);
    expect(screen.getByText('\\frac{1}{')).toBeInTheDocument();
  });

  it('hides the rendered markup from assistive technology and exposes a label', () => {
    render(<Katex source="x^2" label="x squared" />);
    expect(screen.getByText('x squared')).toHaveClass('sr-only');
  });
});
