export function Logo({
  className = "",
  variant = "dark",
}: {
  className?: string;
  variant?: "dark" | "white";
}) {
  const textColor = variant === "dark" ? "#080935" : "#ffffff";
  const accentColor = "#018DC8";
  const darkAccent = variant === "dark" ? "#080935" : "#ffffff";

  return (
    <svg
      viewBox="0 0 200 41"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g>
        {/* Water drop / leaf shapes */}
        <path
          d="M12 2C8 8 2 16 2 22a10 10 0 0 0 20 0c0-6-6-14-10-20z"
          fill={accentColor}
          opacity={0.6}
        />
        <path
          d="M22 6c-3 5-8 11-8 16a7 7 0 0 0 14 0c0-5-3-11-6-16z"
          fill={darkAccent}
        />
        <path
          d="M30 10c-2 4-6 9-6 13a5.5 5.5 0 0 0 11 0c0-4-3-9-5-13z"
          fill={accentColor}
        />
        {/* HydroFlow text */}
        <text
          x="46"
          y="28"
          fontFamily="var(--font-barlow), Barlow, sans-serif"
          fontWeight="700"
          fontSize="24"
          fill={textColor}
          letterSpacing="-0.5"
        >
          <tspan fill={textColor}>Hydro</tspan>
          <tspan fill={accentColor}>Flow</tspan>
        </text>
      </g>
    </svg>
  );
}
