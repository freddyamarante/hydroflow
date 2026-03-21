export function DotGrid({
  className = "",
  rows = 3,
  cols = 8,
  color = "#018DC8",
}: {
  className?: string;
  rows?: number;
  cols?: number;
  color?: string;
}) {
  return (
    <svg
      className={className}
      width={cols * 16}
      height={rows * 16}
      viewBox={`0 0 ${cols * 16} ${rows * 16}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => (
          <circle
            key={`${r}-${c}`}
            cx={c * 16 + 4}
            cy={r * 16 + 4}
            r={3}
            fill={color}
            opacity={0.4}
          />
        ))
      )}
    </svg>
  );
}
