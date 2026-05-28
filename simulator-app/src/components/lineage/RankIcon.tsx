export type RankIconName =
  | 'member'
  | 'believer'
  | 'builder'
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'diamond'
  | 'one-star-diamond'
  | 'two-star-diamond'
  | 'three-star-diamond';

interface RankIconProps {
  name: RankIconName;
  size?: number;
}

export function RankIcon({ name, size = 16 }: RankIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <RankIconPaths name={name} />
    </svg>
  );
}

export function RankIconPaths({ name }: { name: RankIconName }) {
  switch (name) {
    case 'member':
      return (
        <>
          <path d="M10 6 11 3h2l1 3" />
          <rect x="4" y="6" width="16" height="14" rx="2" />
          <circle cx="9" cy="12" r="2" />
          <path d="M14 11h4" />
          <path d="M14 14h4" />
          <path d="M7 17h10" />
        </>
      );
    case 'believer':
      return (
        <>
          <path d="M7 21h10" />
          <path d="M12 21v-7" />
          <path d="M12 14c0-3 2-5 5-5-.5 3-2 5-5 5Z" />
          <path d="M11 17c-.5-2-2-3-4-3 .5 2 2 3 4 3Z" />
        </>
      );
    case 'builder':
      return (
        <>
          <rect x="3" y="3" width="11" height="11" rx="1" />
          <rect x="10" y="10" width="11" height="11" rx="1" />
        </>
      );
    case 'bronze':
      return (
        <>
          <MedalShape />
          <Digit3 />
        </>
      );
    case 'silver':
      return (
        <>
          <MedalShape />
          <Digit2 />
        </>
      );
    case 'gold':
      return (
        <>
          <MedalShape />
          <Digit1 />
        </>
      );
    case 'diamond':
      return <GemShape />;
    case 'one-star-diamond':
      return (
        <>
          <GemShapeSmall />
          <Sparkle cx={12} cy={4} r={1.7} />
        </>
      );
    case 'two-star-diamond':
      return (
        <>
          <GemShapeSmall />
          <Sparkle cx={8} cy={4} r={1.4} />
          <Sparkle cx={16} cy={4} r={1.4} />
        </>
      );
    case 'three-star-diamond':
      return (
        <>
          <GemShapeSmall />
          <Sparkle cx={5} cy={4} r={1.2} />
          <Sparkle cx={12} cy={4} r={1.4} />
          <Sparkle cx={19} cy={4} r={1.2} />
        </>
      );
  }
}

function MedalShape() {
  return (
    <>
      <path d="M8 3h8" />
      <path d="M8 3 12 11" />
      <path d="M16 3 12 11" />
      <circle cx="12" cy="16" r="5" />
    </>
  );
}

function Digit1() {
  return (
    <>
      <path d="M12 18.5V14" />
      <path d="M11 15 12 14" />
    </>
  );
}

function Digit2() {
  return (
    <path d="M10.6 14.8c.3-1 2.4-1 2.8 0 .3.9-2.8 2-2.8 3.7h2.8" />
  );
}

function Digit3() {
  return (
    <path d="M10.6 14.8c.3-1 2.5-1 2.8 0 .2.8-.8 1.2-1.3 1.2.5 0 1.5.4 1.5 1.3 0 1.1-2.5 1.3-2.9.2" />
  );
}

function GemShape() {
  return (
    <>
      <path d="M6 3h12l4 6-10 13L2 9Z" />
      <path d="M2 9h20" />
      <path d="M8 9 12 3l4 6-4 13Z" />
    </>
  );
}

function GemShapeSmall() {
  return (
    <>
      <path d="M7 10h10l3 4-8 9-8-9Z" />
      <path d="M4 14h16" />
      <path d="M9 14 12 10l3 4-3 9Z" />
    </>
  );
}

interface SparkleProps {
  cx: number;
  cy: number;
  r: number;
}

function Sparkle({ cx, cy, r }: SparkleProps) {
  const d = r * 0.87;
  return (
    <>
      <path d={`M${cx} ${cy - r} L${cx} ${cy + r}`} />
      <path d={`M${cx - d} ${cy - r / 2} L${cx + d} ${cy + r / 2}`} />
      <path d={`M${cx - d} ${cy + r / 2} L${cx + d} ${cy - r / 2}`} />
    </>
  );
}
