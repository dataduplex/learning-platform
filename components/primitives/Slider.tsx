'use client';

import type { ReactNode } from 'react';
import { useId } from 'react';
import { formatFixed, groupThousands } from './NumberReadout';

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  digits = 2,
  unit,
  grouped = false,
}: {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  digits?: number;
  unit?: string;
  /** Commas between groups of three digits in the whole part. */
  grouped?: boolean;
}) {
  const id = useId();
  const written = formatFixed(value, digits);
  return (
    <div className="slider">
      <div className="slider-head">
        <label className="slider-label" htmlFor={id}>{label}</label>
        <span className="slider-value">
          <span className="slider-number">{grouped ? groupThousands(written) : written}</span>
          {unit === undefined ? null : <span className="slider-unit">{unit}</span>}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.valueAsNumber)}
      />
    </div>
  );
}
