export type GoalIconName = 'leaf' | 'plane' | 'car' | 'home' | 'crown';

interface GoalIconProps {
  name: GoalIconName;
  size?: number;
}

export function GoalIcon({ name, size = 16 }: GoalIconProps) {
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
      <GoalIconPaths name={name} />
    </svg>
  );
}

export function GoalIconPaths({ name }: { name: GoalIconName }) {
  switch (name) {
    case 'leaf':
      return (
        <>
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19.2 2.96c1.4 9.3-3.6 15.8-8.2 17.04Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6" />
        </>
      );
    case 'plane':
      return (
        <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
      );
    case 'car':
      return (
        <>
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.6-1.7-1.4-1.9L18.7 10 17 6a2 2 0 0 0-1.8-1H8.8A2 2 0 0 0 7 6l-1.7 4-1.9 1.1C2.6 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2" />
          <circle cx="7" cy="17" r="2" />
          <circle cx="17" cy="17" r="2" />
          <path d="M5.3 10h13.4" />
        </>
      );
    case 'home':
      return (
        <>
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </>
      );
    case 'crown':
      return (
        <>
          <path d="M11.6 4.6 8.4 9.3 4 6l1.4 9.4c.1.7.8 1.2 1.5 1.2h10.2c.7 0 1.4-.5 1.5-1.2L20 6l-4.4 3.3-3.2-4.7a.5.5 0 0 0-.8 0" />
          <path d="M5 21h14" />
        </>
      );
  }
}
