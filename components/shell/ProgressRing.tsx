export function ProgressRing({
  done,
  total,
  size = 44,
}: {
  done: number;
  total: number;
  size?: number;
}) {
  const radius = size / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  const fraction = total === 0 ? 0 : Math.min(1, Math.max(0, done / total));
  const drawn = circumference * fraction;

  return (
    <span className="progress-ring">
      <svg
        role="img"
        aria-label={`${done} of ${total} lessons complete`}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          className="progress-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
        />
        <circle
          data-role="arc"
          className="progress-ring-arc"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeDasharray={`${drawn} ${circumference - drawn}`}
          // A round cap on a zero-length dash still paints a dot, which would
          // read as progress that has not happened.
          strokeLinecap={drawn > 0 ? 'round' : 'butt'}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="progress-ring-count">{done} / {total}</span>
    </span>
  );
}
