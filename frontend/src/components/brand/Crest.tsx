/** The school crest: a navy shield, gold laurel wreath around a serif "I", and a small crown. Inline SVG, no image files. */
export function Crest({ size = 40, title }: { size?: number; title?: string }) {
  const cx = 32;
  const cy = 45;
  const r = 16.5;
  const leaves: { x: number; y: number; rot: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = 108 + i * 23; // degrees along the left side of the wreath, bottom to upper-left
    for (const side of [1, -1] as const) {
      const a = side === 1 ? angle : 180 - angle; // mirror for the right side
      const rad = (a * Math.PI) / 180;
      leaves.push({
        x: cx + r * Math.cos(rad),
        y: cy + r * Math.sin(rad),
        rot: a + 90 + side * 24, // along the curve, tilted outward
      });
    }
  }

  return (
    <svg
      width={size}
      height={Math.round(size * 1.19)}
      viewBox="0 0 64 76"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      <path d="M32 2 58 10v26c0 17.5-11.5 29.5-26 38C17.500 65.500 6 53.500 6 36V10L32 2Z" fill="#0a1630" stroke="#c9a75a" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M32 5.600 54.500 12.600V36c0 15.400-10 26.200-22.500 33.600C19.500 62.200 9.500 51.400 9.500 36V12.600L32 5.600Z" fill="none" stroke="#c9a75a" strokeOpacity=".45" strokeWidth=".8" />
      {/* crown */}
      <path d="M23 21.500 24.800 12.500 28.600 17 32 10.500 35.400 17 39.200 12.500 41 21.500Z" fill="#c9a75a" />
      <path d="M23.500 23.600h17" stroke="#c9a75a" strokeWidth="1.400" strokeLinecap="round" />
      {/* laurel */}
      {leaves.map((l, i) => (
        <ellipse key={i} cx={l.x} cy={l.y} rx="4.200" ry="1.700" transform={`rotate(${l.rot} ${l.x} ${l.y})`} fill="#c9a75a" opacity=".92" />
      ))}
      <text x="32" y="52.500" textAnchor="middle" fontFamily="'Cormorant Garamond', Georgia, serif" fontWeight="700" fontSize="24" fill="#e3c98a">
        I
      </text>
    </svg>
  );
}

/** A smaller shield in a house colour, for the four houses. */
export function HouseCrest({ color, letter, size = 52 }: { color: string; letter: string; size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 1.15)} viewBox="0 0 52 60" aria-hidden="true" focusable="false">
      <path d="M26 2 48 9v20c0 14.500-9.500 24-22 29C13.500 53 4 43.500 4 29V9L26 2Z" fill={color} fillOpacity=".22" stroke={color} strokeWidth="1.800" strokeLinejoin="round" />
      <path d="M26 7 43.500 12.500V29c0 11.500-7.500 19.500-17.500 24-10-4.500-17.500-12.500-17.500-24V12.500L26 7Z" fill="none" stroke={color} strokeOpacity=".5" strokeWidth=".8" />
      <text x="26" y="35" textAnchor="middle" fontFamily="'Cormorant Garamond', Georgia, serif" fontWeight="700" fontSize="24" fill="#f5f0e6">
        {letter}
      </text>
    </svg>
  );
}
