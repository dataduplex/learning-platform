'use client';

import { useId } from 'react';
import { formatFixed } from './NumberReadout';

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  digits = 2,
  unit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  digits?: number;
  unit?: string;
}) {
  const id = useId();
  return (
    <div className="slider">
      <div className="slider-head">
        <label className="slider-label" htmlFor={id}>{label}</label>
        <span className="slider-value">
          <span className="slider-number">{formatFixed(value, digits)}</span>
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
