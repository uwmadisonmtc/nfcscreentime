// Loading screen clock: a hand-drawn melting pocket watch in white outline,
// after inspo/cartoonclock.webp. Double wobbly rim, a crown loop on top, all
// twelve Roman numerals, and ornate hands that sweep around.

const CX = 102;
const CY = 138;

// The face leans to the right as it melts, so numerals follow a tilted oval.
const TILT = -11;

const NUMERALS = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];

const OUTER_RIM =
  "M96 60 C120 54 150 80 168 112 C182 136 180 160 168 180 C156 200 150 222 128 220 " +
  "C108 218 92 212 70 196 C46 178 26 160 28 132 C30 104 70 66 96 60 Z";

const INNER_RIM =
  "M98 71 C118 67 145 90 159 116 C171 138 169 158 159 174 C149 190 143 209 124 208 " +
  "C106 207 92 200 74 186 C54 170 39 156 40 133 C42 110 76 77 98 71 Z";

// Hands point straight up from (0, 0); the group around them sets the angle.
const MINUTE_HAND =
  "M0 -56 C2.6 -50 2.6 -44 1.2 -38 C3 -35 3 -31 1 -29 L1.1 -7 L-1.1 -7 L-1 -29 " +
  "C-3 -31 -3 -35 -1.2 -38 C-2.6 -44 -2.6 -50 0 -56 Z";

const HOUR_HAND =
  "M0 -36 C4.5 -30 4.5 -24 1.6 -21 C2.8 -19 2.4 -17 1.3 -16 L1.3 -6 L-1.3 -6 L-1.3 -16 " +
  "C-2.4 -17 -2.8 -19 -1.6 -21 C-4.5 -24 -4.5 -30 0 -36 Z";

function numeralPosition(i) {
  const rad = ((i * 30 - 90) * Math.PI) / 180;
  const x = 42 * Math.cos(rad);
  const y = 52 * Math.sin(rad);
  const t = (TILT * Math.PI) / 180;
  // Rounded so the server and browser render identical markup.
  return {
    x: (CX + x * Math.cos(t) - y * Math.sin(t)).toFixed(2),
    y: (CY + x * Math.sin(t) + y * Math.cos(t)).toFixed(2),
  };
}

export default function MeltingClock({ label = "Loading" }) {
  return (
    <div className="clock-screen" role="status" aria-live="polite">
      <svg className="melting-clock" viewBox="0 0 200 240" aria-hidden="true">
        <defs>
          {/* A slight waver so the lines look drawn by hand. */}
          <filter id="hand-drawn">
            <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="1" seed="7" />
            <feDisplacementMap in="SourceGraphic" scale="2.5" />
          </filter>
        </defs>

        <g
          className="clock-ink"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#hand-drawn)"
        >
          {/* Crown: a stem and a double loop, like a pocket watch. */}
          <rect x="95" y="46" width="9" height="11" rx="3" />
          <path d="M86 46 C75 33 85 15 100 15 C116 15 125 32 114 46" />
          <path d="M93 44 C88 35 93 26 100 26 C107 26 112 35 107 44" />

          <path d={OUTER_RIM} />
          <path d={INNER_RIM} strokeWidth="2.4" />
        </g>

        <g className="clock-fill" filter="url(#hand-drawn)">
          {NUMERALS.map((n, i) => {
            const { x, y } = numeralPosition(i);
            return (
              <text
                key={n}
                fontSize={n.length > 3 ? 11 : 13}
                fontFamily="Georgia, 'Times New Roman', serif"
                fontStyle="italic"
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`translate(${x} ${y}) rotate(${TILT + (i % 2 ? 4 : -3)})`}
              >
                {n}
              </text>
            );
          })}
        </g>

        <g className="clock-fill">
          <g className="hand hour">
            <path d={HOUR_HAND} transform={`translate(${CX} ${CY})`} />
          </g>
          <g className="hand minute">
            <path d={MINUTE_HAND} transform={`translate(${CX} ${CY})`} />
          </g>
          <circle cx={CX} cy={CY} r="4.5" />
        </g>
        <circle cx={CX} cy={CY} r="1.4" className="clock-pin" />
      </svg>
      <p className="clock-label">{label}…</p>
    </div>
  );
}
