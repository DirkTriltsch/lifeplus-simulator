import type { BrandLockup as BrandLockupData } from '@mlm/simulator-core';

export function BrandLockup({ lockup, size = 28 }: { lockup: BrandLockupData; size?: number }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className="inline-block overflow-hidden rounded-md shrink-0"
        style={{ width: size, height: size, boxShadow: '0 1px 2px rgba(0,0,0,0.12)' }}
      >
        <svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ display: 'block', width: '100%', height: '100%' }}>
          <rect width="256" height="256" rx="28" fill={lockup.markFill} />
          <text
            x="29.16"
            y="158.067"
            fill="#FFFFFF"
            fontFamily="Inter, system-ui, -apple-system, sans-serif"
            fontWeight={600}
            letterSpacing="-3"
            style={{ whiteSpace: 'pre', fontSize: '145.9px' }}
            transform="matrix(1.268075, 0, 0, 1.045683, -16.903988, -22.842188)"
          >
            {lockup.initial}
          </text>
          <path
            d="M 26.39 182.443 L 86.155 180.164 L 127.99 173.328 C 151.895 167.249 171.818 153.575 187.756 132.306 C 203.692 111.034 217.637 89.764 229.59 68.494"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="15.36"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 22.943 210.906 C 45.668 204.506 68.394 204.506 91.118 210.906 C 113.842 217.307 136.567 217.307 159.293 210.906 C 182.016 204.506 206.807 204.506 233.664 210.906"
            fill="none"
            stroke={lockup.waveColor}
            strokeWidth="8.96"
            strokeLinecap="round"
            opacity={0.7}
          />
        </svg>
      </span>
      <span
        className="lowercase font-semibold leading-none"
        style={{
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          fontSize: '14px',
          letterSpacing: '-0.3px',
        }}
      >
        <span style={{ color: '#0F172A' }}>{lockup.wordNeutral}</span>
        <span style={{ color: lockup.markFill }}>{lockup.wordAccent}</span>
      </span>
    </span>
  );
}
