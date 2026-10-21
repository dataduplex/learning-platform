import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TEST_NOTATION, testNotationById } from '../../test/fixtures';
import { createSym } from './Sym';

const Sym = createSym({ lookup: testNotationById, referencePath: '/glossary' });
const DOT = TEST_NOTATION[1]!;

describe('Sym', () => {
  it('typesets the symbol and links to its entry on the reference page', () => {
    render(<Sym id="dot" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/glossary#dot');
    expect(document.querySelector('.katex')).toBeInTheDocument();
  });

  it('carries the spoken name so a screen reader does not read the markup', () => {
    render(<Sym id="dot" />);
    expect(screen.getByText(DOT.name)).toHaveClass('sr-only');
  });

  it('throws on an unknown id rather than rendering a dangling reference', () => {
    expect(() => render(<Sym id="not-a-symbol" />)).toThrow(/not-a-symbol/);
  });

  it('renders the gloss as a title for a pointer reader', () => {
    render(<Sym id="dot" />);
    expect(screen.getByRole('link')).toHaveAttribute('title', DOT.meaning);
  });
});
