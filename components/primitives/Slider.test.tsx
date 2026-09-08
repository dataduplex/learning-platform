import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Slider } from './Slider';

describe('Slider', () => {
  it('renders a labeled range input carrying its bounds', () => {
    render(<Slider label="rank" value={2} min={1} max={4} step={1} onChange={() => {}} />);
    const input = screen.getByRole('slider', { name: /rank/i });
    expect(input).toHaveAttribute('min', '1');
    expect(input).toHaveAttribute('max', '4');
    expect(input).toHaveValue('2');
  });

  it('shows the current value beside the label', () => {
    render(<Slider label="angle" value={45} min={0} max={180} step={1} digits={0} onChange={() => {}} />);
    expect(screen.getByText('45')).toBeInTheDocument();
  });

  // Dragging and arrow-stepping a native range input is browser behaviour that
  // jsdom does not implement, so this drives the change event directly. What is
  // under test is the handler: valueAsNumber, never the raw string value.
  it('reports changes as numbers, not strings', () => {
    const onChange = vi.fn();
    render(<Slider label="rank" value={2} min={1} max={4} step={1} onChange={onChange} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '3' } });
    expect(onChange).toHaveBeenLastCalledWith(3);
  });

  it('formats the readout with the requested digits', () => {
    render(<Slider label="t" value={0.5} min={0} max={1} step={0.01} digits={2} onChange={() => {}} />);
    expect(screen.getByText('0.50')).toBeInTheDocument();
  });

  it('appends a unit to the readout when given', () => {
    render(
      <Slider label="angle" value={90} min={0} max={180} step={1} digits={0} unit="deg" onChange={() => {}} />,
    );
    expect(screen.getByText('deg')).toBeInTheDocument();
  });
});
