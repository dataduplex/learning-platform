import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { lineEnds } from '@/test/render';
import {
  CHART_WIDTH, PROBABILITY_TICKS, Plot, createScales, decadeLabel, niceStep, pixel, plotPadding, plotScales, polylinePoints,
  stepTicks, wholeTicks,
  type PlotLayout,
} from './Plot';

const BOX = { left: 40, top: 20, width: 300, height: 200 };

describe('createScales', () => {
  it('maps the x domain onto the inner box', () => {
    const scales = createScales([-1, 1], [0, 10], BOX, 'fill');
    expect(scales.x(-1)).toBeCloseTo(40, 6);
    expect(scales.x(1)).toBeCloseTo(340, 6);
    expect(scales.x(0)).toBeCloseTo(190, 6);
  });

  it('flips y so larger values sit higher on screen', () => {
    const scales = createScales([-1, 1], [0, 10], BOX, 'fill');
    expect(scales.y(0)).toBeCloseTo(220, 6);
    expect(scales.y(10)).toBeCloseTo(20, 6);
    expect(scales.y(10)).toBeLessThan(scales.y(0));
  });

  it('inverts back to data coordinates', () => {
    const scales = createScales([-2, 6], [-3, 3], BOX, 'fill');
    expect(scales.invertX(scales.x(1.75))).toBeCloseTo(1.75, 9);
    expect(scales.invertY(scales.y(-0.5))).toBeCloseTo(-0.5, 9);
  });

  it('uses one scale factor for both axes when aspect is equal', () => {
    // A right angle must look like a right angle, or the geometry lies.
    const scales = createScales([-5, 5], [-5, 5], BOX, 'equal');
    const unitX = scales.x(1) - scales.x(0);
    const unitY = scales.y(0) - scales.y(1);
    expect(unitX).toBeCloseTo(unitY, 9);
  });

  it('centers the equal-aspect box inside the space it was given', () => {
    const scales = createScales([-5, 5], [-5, 5], BOX, 'equal');
    // 200px of height is the binding constraint, so the 300px width is inset.
    expect(scales.inner.width).toBeCloseTo(200, 6);
    expect(scales.inner.left).toBeCloseTo(90, 6);
    expect(scales.inner.top).toBeCloseTo(20, 6);
  });

  it('rejects a degenerate domain instead of dividing by zero', () => {
    expect(() => createScales([1, 1], [0, 1], BOX, 'fill')).toThrow(RangeError);
    expect(() => createScales([0, 1], [2, 2], BOX, 'fill')).toThrow(RangeError);
  });
});

describe('Plot', () => {
  it('names itself for assistive technology with a title and description', () => {
    render(
      <Plot
        title="Two vectors in the plane"
        description="Drag either arrow tip to change its components."
        xDomain={[-4, 4]}
        yDomain={[-4, 4]}
      />,
    );
    const group = screen.getByRole('group', { name: 'Two vectors in the plane' });
    expect(group).toHaveAccessibleDescription('Drag either arrow tip to change its components.');
  });

  it('hands scales to its children', () => {
    render(
      <Plot title="p" xDomain={[0, 10]} yDomain={[0, 10]} width={220} height={220} padding={10}>
        {(scales) => <circle data-testid="dot" cx={scales.x(10)} cy={scales.y(10)} r={3} />}
      </Plot>,
    );
    expect(screen.getByTestId('dot')).toHaveAttribute('cx', '210');
    expect(screen.getByTestId('dot')).toHaveAttribute('cy', '10');
  });

  it('draws a gridline per step and marks zero distinctly', () => {
    render(<Plot title="p" xDomain={[-2, 2]} yDomain={[-2, 2]} gridStep={1} />);
    // Five vertical and five horizontal lines at -2..2, minus the two at zero,
    // which are drawn as axes instead.
    expect(document.querySelectorAll('[data-role="gridline"]')).toHaveLength(8);
    expect(document.querySelectorAll('[data-role="zero-axis"]')).toHaveLength(2);
  });

  it('omits the zero axes when zero is outside the domain', () => {
    render(<Plot title="p" xDomain={[1, 5]} yDomain={[1, 5]} gridStep={1} />);
    expect(document.querySelectorAll('[data-role="zero-axis"]')).toHaveLength(0);
  });

  it('labels the axes when labels are given', () => {
    render(<Plot title="p" xDomain={[0, 1]} yDomain={[0, 1]} xLabel="time" yLabel="loss" />);
    expect(screen.getByText('time')).toBeInTheDocument();
    expect(screen.getByText('loss')).toBeInTheDocument();
  });

  it('renders no gridlines when no step is given', () => {
    render(<Plot title="p" xDomain={[0, 1]} yDomain={[0, 1]} />);
    expect(document.querySelectorAll('[data-role="gridline"]')).toHaveLength(0);
  });

  it('quantises a drawn coordinate, so two Math implementations agree on it', () => {
    // The defect this prevents: a curve computed with Math.log renders one string at
    // build time and a string differing in its last digits in the browser, which
    // hydration reports as a mismatched attribute it will not patch up.
    expect(pixel(229.48806957648713)).toBe(229.49);
    expect(pixel(229.48806957648710)).toBe(pixel(229.48806957648713));
    expect(pixel(-0.004)).toBe(-0);
    expect(polylinePoints([[36, 229.48806957648713], [40.2947368421, 215.273956]]))
      .toBe('36,229.49 40.29,215.27');
    expect(polylinePoints([])).toBe('');
  });

  it('grids one axis only when asked, for a figure whose axes share no units', () => {
    const { unmount } = render(
      <Plot title="p" xDomain={[1, 5]} yDomain={[1, 5]} gridStep={1} gridAxis="x" />,
    );
    const vertical = [...document.querySelectorAll('[data-role="gridline"]')];
    expect(vertical).toHaveLength(5);
    // Every surviving line runs top to bottom, so none of them is a horizontal one.
    for (const line of vertical) {
      expect(line.getAttribute('x1')).toBe(line.getAttribute('x2'));
    }
    unmount();

    render(<Plot title="p" xDomain={[1, 5]} yDomain={[1, 5]} gridStep={1} gridAxis="y" />);
    const horizontal = [...document.querySelectorAll('[data-role="gridline"]')];
    expect(horizontal).toHaveLength(5);
    for (const line of horizontal) {
      expect(line.getAttribute('y1')).toBe(line.getAttribute('y2'));
    }
  });

  it('spaces each axis by its own step when given one per axis', () => {
    render(
      <Plot
        title="p"
        xDomain={[-2, 2]}
        yDomain={[-8, 8]}
        width={420}
        height={220}
        padding={10}
        gridStep={{ x: 1, y: 4 }}
      />,
    );
    expect([...document.querySelectorAll('[data-role="gridline"]')].map(lineEnds)).toEqual([
      ...['10', '110', '310', '410'].map((x) => [x, '10', x, '210']),
      ...['210', '160', '60', '10'].map((y) => ['10', y, '410', y]),
    ]);
    expect([...document.querySelectorAll('[data-role="zero-axis"]')].map(lineEnds)).toEqual([
      ['10', '110', '410', '110'],
      ['210', '10', '210', '210'],
    ]);
  });
});

describe('Plot axes', () => {
  const ticks = [{ at: 0, label: '0' }, { at: 5, label: '5' }, { at: 10, label: '10' }];

  it('sets x tick values on a row 16px below the data box', () => {
    render(<Plot title="p" xDomain={[0, 10]} yDomain={[0, 1]} width={400} height={300} xTicks={ticks} />);
    const labels = [...document.querySelectorAll('.plot-tick[data-axis="x"]')];
    expect(labels.map((label) => label.textContent)).toEqual(['0', '5', '10']);
    expect(labels.map((label) => label.getAttribute('x'))).toEqual(['36', '200', '364']);
    for (const label of labels) expect(label).toHaveAttribute('y', '280');
  });

  it('gives the x title its own row, a full 22px below the tick values', () => {
    render(
      <Plot title="p" xDomain={[0, 10]} yDomain={[0, 1]} width={400} height={300} xTicks={ticks} xLabel="step" />,
    );
    // Ticks and a title need 48px below the data box, so the box ends at 252.
    expect(document.querySelector('.plot-tick[data-axis="x"]')).toHaveAttribute('y', '268');
    expect(screen.getByText('step')).toHaveAttribute('y', '290');
  });

  it('lets the x title take the tick row when there are no tick values', () => {
    render(<Plot title="p" xDomain={[0, 10]} yDomain={[0, 1]} width={400} height={300} xLabel="x" />);
    expect(screen.getByText('x')).toHaveAttribute('y', '280');
  });

  it('right-aligns y tick values against the axis and moves the y title outside them', () => {
    render(
      <Plot
        title="p" xDomain={[0, 1]} yDomain={[0, 1]} width={400} height={300}
        yTicks={[{ at: 0, label: '0' }, { at: 1, label: '1' }]} yLabel="loss"
      />,
    );
    const labels = [...document.querySelectorAll('.plot-tick[data-axis="y"]')];
    expect(labels.map((label) => label.getAttribute('y'))).toEqual(['268', '40']);
    for (const label of labels) {
      expect(label).toHaveAttribute('x', '56');
      expect(label).toHaveAttribute('text-anchor', 'end');
    }
    expect(screen.getByText('loss')).toHaveAttribute('x', '12');
  });

  it('keeps the rotated y-axis title within the SVG bounds', () => {
    render(<Plot title="with ticks" xDomain={[0, 1]} yDomain={[0, 1]} width={400} height={300} yTicks={ticks} yLabel="f(x)" />);
    expect(screen.getByText('f(x)')).toHaveAttribute('x', '12');
    render(<Plot title="without ticks" xDomain={[0, 1]} yDomain={[0, 1]} width={400} height={300} yLabel="value" />);
    expect(screen.getByText('value')).toHaveAttribute('x', '20');
  });

  it('frames its data box and marks it for geometry checks', () => {
    render(
      <Plot title="p" xDomain={[0, 1]} yDomain={[0.05, 0.95]} width={400} height={300} xTicks={ticks.slice(0, 1)} xLabel="t" />,
    );
    const frame = document.querySelector('rect.plot-frame[data-role="data-box"]');
    expect(frame).toHaveAttribute('x', '36');
    expect(frame).toHaveAttribute('y', '36');
    expect(frame).toHaveAttribute('width', '328');
    expect(frame).toHaveAttribute('height', '216');
  });

  it('sizes each side by what it draws, never below the base padding', () => {
    expect(plotPadding({ xTicks: true, xLabel: true, yTicks: true, yLabel: true }))
      .toEqual({ top: 36, right: 36, bottom: 48, left: 64 });
    expect(plotPadding({ xTicks: false, xLabel: false, yTicks: false, yLabel: false }))
      .toEqual({ top: 36, right: 36, bottom: 36, left: 36 });
    expect(plotPadding({ xTicks: false, xLabel: true, yTicks: true, yLabel: false }, 10))
      .toEqual({ top: 10, right: 10, bottom: 26, left: 48 });
  });

  it('writes a decade with a real superscript', () => {
    render(<svg><text data-testid="decade">{decadeLabel(-4)}</text></svg>);
    const text = screen.getByTestId('decade');
    expect(text.textContent).toBe('10−4');
    expect(text.querySelector('tspan')).toHaveAttribute('dy', '-4');
    render(<svg><text data-testid="unit">{decadeLabel(0)}</text></svg>);
    expect(screen.getByTestId('unit').textContent).toBe('1');
  });
});

describe('plotScales', () => {
  const plane: PlotLayout = {
    xDomain: [-6, 6], yDomain: [-6, 6], aspect: 'equal', width: CHART_WIDTH, height: 420,
    xTicks: wholeTicks([-6, 6], 2), yTicks: wholeTicks([-6, 6], 2),
  };

  it('gives the scales Plot draws with, from the same props', () => {
    const layouts: readonly PlotLayout[] = [
      plane,
      { xDomain: [0, 10], yDomain: [0, 1], width: 400, height: 300, xLabel: 't', yTicks: [{ at: 0, label: '0' }] },
      { xDomain: [0, 1], yDomain: [0, 1] },
    ];
    for (const layout of layouts) {
      const { inner } = plotScales(layout);
      const { unmount } = render(<Plot title="p" {...layout} />);
      const frame = document.querySelector('rect[data-role="data-box"]');
      expect(['x', 'y', 'width', 'height'].map((name) => frame?.getAttribute(name)))
        .toEqual([inner.left, inner.top, inner.width, inner.height].map((value) => String(pixel(value))));
      unmount();
    }
  });

  it('lays a vector plane out as a 348px square beside its tick values', () => {
    expect(plotScales(plane).inner).toEqual({ left: 131, top: 36, width: 348, height: 348 });
  });

  it('keeps the y title 8px left of the tick column when the data box is centred', () => {
    const titled: PlotLayout = { ...plane, yLabel: 'second coordinate' };
    expect(plotScales(titled).inner.left).toBe(139);
    render(<Plot title="p" {...titled} />);
    expect(screen.getByText('second coordinate')).toHaveAttribute('x', '87');
  });
});

describe('wholeTicks', () => {
  it('puts a tick at each multiple of the step inside the domain, labelled as a whole number', () => {
    expect(wholeTicks([-5, 5], 2)).toEqual([-4, -2, 0, 2, 4].map((at) => ({ at, label: String(at) })));
    expect(wholeTicks([-6, 6], 2).map((tick) => tick.label)).toEqual(['-6', '-4', '-2', '0', '2', '4', '6']);
  });

  it('refuses a step that is not a whole number, whose labels would round', () => {
    expect(() => wholeTicks([0, 1], 0.5)).toThrow(RangeError);
  });
});

describe('stepTicks', () => {
  it("labels each multiple of the step to the step's decimals, without trailing zeros", () => {
    expect(stepTicks([0, 1], 0.25)).toEqual([
      { at: 0, label: '0' }, { at: 0.25, label: '0.25' }, { at: 0.5, label: '0.5' },
      { at: 0.75, label: '0.75' }, { at: 1, label: '1' },
    ]);
    expect(stepTicks([-1, 1], 0.5).map((tick) => tick.label)).toEqual(['-1', '-0.5', '0', '0.5', '1']);
    expect(stepTicks([-3.25, 2.75], 0.75).map((tick) => tick.label))
      .toEqual(['-3', '-2.25', '-1.5', '-0.75', '0', '0.75', '1.5', '2.25']);
    expect(stepTicks([0, 0.32], 0.05).map((tick) => tick.label))
      .toEqual(['0', '0.05', '0.1', '0.15', '0.2', '0.25', '0.3']);
    expect(stepTicks([-6, 10], 2).map((tick) => tick.label))
      .toEqual(['-6', '-4', '-2', '0', '2', '4', '6', '8', '10']);
  });

  it('ticks a probability axis at quarters', () => {
    expect(PROBABILITY_TICKS).toEqual([
      { at: 0, label: '0' }, { at: 0.25, label: '0.25' }, { at: 0.5, label: '0.5' },
      { at: 0.75, label: '0.75' }, { at: 1, label: '1' },
    ]);
  });

  it('refuses a step that is not positive and finite', () => {
    expect(() => stepTicks([0, 1], 0)).toThrow(RangeError);
    expect(() => stepTicks([0, 1], -0.5)).toThrow(RangeError);
    expect(() => stepTicks([0, 1], Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('niceStep', () => {
  it('picks one, two or five times a power of ten that splits the span into about five', () => {
    expect([2.553, 1.277, 0.8511, 0.6383, 0.5107, 0.4255, 0.3647, 0.3191, 1.9, 5.1].map((span) => niceStep(span)))
      .toEqual([0.5, 0.2, 0.2, 0.1, 0.1, 0.1, 0.1, 0.05, 0.5, 1]);
  });

  it('refuses a span that is not positive and finite', () => {
    expect(() => niceStep(0)).toThrow(RangeError);
    expect(() => niceStep(Number.NaN)).toThrow(RangeError);
  });
});
