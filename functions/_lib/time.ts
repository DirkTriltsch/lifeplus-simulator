export function nowMs(): number {
  return Date.now();
}

export function minutesFromNow(minutes: number): number {
  return Date.now() + minutes * 60_000;
}

export function daysFromNow(days: number): number {
  return Date.now() + days * 86_400_000;
}
