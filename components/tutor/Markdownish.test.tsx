import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Markdownish } from './Markdownish';

describe('Markdownish', () => {
  it('renders plain paragraphs', () => {
    render(<Markdownish source={'First.\n\nSecond.'} />);
    expect(screen.getByText('First.')).toBeInTheDocument();
    expect(screen.getByText('Second.')).toBeInTheDocument();
  });

  it('renders inline maths through KaTeX', () => {
    render(<Markdownish source={'The norm $\\|a\\|$ is a length.'} />);
    expect(document.querySelector('.katex')).toBeInTheDocument();
  });

  it('renders display maths', () => {
    render(<Markdownish source={'$$a \\cdot b = 0$$'} />);
    expect(document.querySelector('.katex-display')).toBeInTheDocument();
  });

  it('shows a broken formula as its source rather than an error', () => {
    render(<Markdownish source={'Broken $\\frac{1$ here.'} />);
    expect(screen.getByText(/\\frac\{1/)).toBeInTheDocument();
  });

  it('escapes rather than interprets HTML in the model output', () => {
    render(<Markdownish source={'<img src=x onerror=alert(1)>'} />);
    expect(document.querySelector('img')).toBeNull();
  });

  it('renders a bullet list as a list', () => {
    render(<Markdownish source={'- first\n- second'} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('keeps a lone dollar sign as text rather than opening maths', () => {
    render(<Markdownish source={'It costs $5 to run.'} />);
    expect(screen.getByText('It costs $5 to run.')).toBeInTheDocument();
    expect(document.querySelector('.katex')).toBeNull();
  });

  it('renders prose and maths in the order they were written', () => {
    // A wrong split order would put the formula before its own sentence.
    render(<Markdownish source={'Because $x = 1$ holds.'} />);
    expect(screen.getByText(/^Because/)).toBeInTheDocument();
    expect(screen.getByText(/holds\.$/)).toBeInTheDocument();
  });
});
