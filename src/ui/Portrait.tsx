/** Original vector portrait using the same restrained clothing/skin/hair palette as world adults. */
export function Portrait({
  name,
  color = "#546b76",
  mentor = false,
}: {
  name: string;
  color?: string;
  mentor?: boolean;
}) {
  const hash = [...name].reduce((sum, c) => sum + c.charCodeAt(0), 0);
  const skin = ["#b7815e", "#d2a783", "#8f6349"][hash % 3];
  const hair = mentor ? "#6e726b" : ["#49362b", "#352e2a", "#805d3b"][hash % 3];
  return (
    <svg
      viewBox="0 0 80 90"
      role="img"
      aria-label={`${name}, fictional character`}
      className="character-portrait"
    >
      <defs>
        <linearGradient id={`portrait-${hash}`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#dde9e3" />
          <stop offset="1" stopColor="#9ab3ad" />
        </linearGradient>
      </defs>
      <rect width="80" height="90" rx="9" fill={`url(#portrait-${hash})`} />
      <path
        d="M6 90V78C7 66 19 62 32 59H48C63 62 74 69 74 79V90"
        fill={mentor ? "#546b76" : color}
      />
      <path d="M31 55L30 64L40 76L50 64L49 55" fill={skin} />
      <path
        d="M25 64L31 61L40 72L36 81Z M55 64L49 61L40 72L44 81Z"
        fill="#f0eee6"
      />
      <ellipse cx="22" cy="35" rx="4" ry="7" fill={skin} />
      <ellipse cx="58" cy="35" rx="4" ry="7" fill={skin} />
      <path
        d="M22 28C22 8 57 5 58 27L57 43C55 55 48 61 40 61C30 61 24 52 23 43Z"
        fill={skin}
      />
      <path
        d="M21 32C17 11 28 4 42 5C58 5 64 18 59 33L55 26L52 16C42 23 31 22 25 23L24 34Z"
        fill={hair}
      />
      <path
        d="M28 30Q33 27 37 30 M44 30Q49 27 53 30"
        fill="none"
        stroke={hair}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <ellipse cx="32.5" cy="34" rx="3.7" ry="1.8" fill="#edeae2" />
      <ellipse cx="47.5" cy="34" rx="3.7" ry="1.8" fill="#edeae2" />
      <circle cx="33" cy="34" r="1.5" fill="#333f39" />
      <circle cx="47" cy="34" r="1.5" fill="#333f39" />
      <path
        d="M40 35L37 44Q40 46 43 43"
        fill="none"
        stroke="#855c49"
        strokeWidth="1.1"
      />
      <path
        d="M34 51Q40 53 46 50"
        fill="none"
        stroke="#824d45"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
