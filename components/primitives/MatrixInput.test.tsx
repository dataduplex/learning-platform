import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { matFrom, toRows, type Mat } from '@/lib/linalg';
import { MatrixInput } from './MatrixInput';

/**
 * Stands in for a real parent, which owns the matrix. Without one the input is a
 * controlled field whose value prop never moves, so React restores each keystroke
 * and edits append to a stale value instead of replacing it.
 */
function Harness({ initial, onChange }: { initial: Mat; onChange: (next: Mat) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <MatrixInput
      label="A"
      value={value}
      onChange={(next) => { setValue(next); onChange(next); }}
    />
  );
}

describe('MatrixInput', () => {
  it('renders one input per entry', () => {
    render(<MatrixInput label="A" value={matFrom([[1, 2], [3, 4]])} onChange={() => {}} />);
    expect(screen.getAllByRole('spinbutton')).toHaveLength(4);
  });

  it('labels each cell by position', () => {
    render(<MatrixInput label="A" value={matFrom([[1, 2], [3, 4]])} onChange={() => {}} />);
    expect(screen.getByLabelText('A row 2 column 1')).toHaveValue(3);
  });

  it('reports a whole new matrix on edit, leaving the original untouched', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const original = matFrom([[1, 2], [3, 4]]);
    render(<Harness initial={original} onChange={onChange} />);
    const cell = screen.getByLabelText('A row 1 column 1');
    await user.clear(cell);
    await user.type(cell, '9');
    const next = onChange.mock.calls.at(-1)?.[0];
    expect(toRows(next)).toEqual([[9, 2], [3, 4]]);
    expect(toRows(original)).toEqual([[1, 2], [3, 4]]);
  });

  it('treats a cleared cell as zero rather than NaN', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MatrixInput label="A" value={matFrom([[1, 2]])} onChange={onChange} />);
    await user.clear(screen.getByLabelText('A row 1 column 1'));
    expect(toRows(onChange.mock.calls.at(-1)?.[0])).toEqual([[0, 2]]);
  });

  it('names the group so the whole matrix is announced once', () => {
    render(<MatrixInput label="A" value={matFrom([[1]])} onChange={() => {}} />);
    expect(screen.getByRole('group', { name: /A, 1 by 1/ })).toBeInTheDocument();
  });

  it('renders a visible caption when given', () => {
    render(<MatrixInput label="A" value={matFrom([[1]])} onChange={() => {}} caption="Logits" />);
    expect(screen.getByText('Logits')).toBeInTheDocument();
    expect(screen.getByText('Logits')).toHaveClass('matrix-input-caption');
  });

  it('brackets the cells alone, with the caption and column labels above the bracketed box', () => {
    render(
      <MatrixInput
        label="Logits"
        caption="Logits"
        value={matFrom([[0.5, 0.3]])}
        onChange={() => {}}
        columnLabels={['mat', 'floor']}
      />,
    );
    const group = screen.getByRole('group', { name: 'Logits' });
    expect([...group.children].map((child) => child.className))
      .toEqual(['matrix-input-caption', 'matrix-input-columns', 'matrix-input-cells']);
    const bracketed = group.querySelector('.matrix-input-cells');
    expect([...(bracketed?.children ?? [])].map((child) => child.getAttribute('aria-label'))).toEqual(['Logits mat', 'Logits floor']);
    expect(bracketed).not.toContainElement(screen.getByText('Logits'));
    expect(bracketed).not.toContainElement(screen.getByText('mat'));
  });

  it('names cells by column label when given', () => {
    render(
      <MatrixInput
        label="Logits"
        value={matFrom([[0.5, 0.3]])}
        onChange={() => {}}
        columnLabels={['mat', 'floor']}
      />,
    );
    expect(screen.getByLabelText('Logits mat')).toHaveValue(0.5);
    expect(screen.getByLabelText('Logits floor')).toHaveValue(0.3);
  });

  it('clamps typed values to the min and max', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MatrixInput label="A" value={matFrom([[0]])} onChange={onChange} min={0} max={1} />);
    const cell = screen.getByLabelText('A row 1 column 1');
    await user.clear(cell);
    await user.type(cell, '5');
    expect(toRows(onChange.mock.calls.at(-1)?.[0])).toEqual([[1]]);
  });
});
