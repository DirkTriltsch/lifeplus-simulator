export interface BenchResult {
  name: string;
  runs: number;
  warmup: number;
  minMs: number;
  medianMs: number;
  p95Ms: number;
  maxMs: number;
}

export function benchmark(
  name: string,
  fn: () => void,
  options: { runs?: number; warmup?: number } = {},
): BenchResult {
  const runs = options.runs ?? 20;
  const warmup = options.warmup ?? 5;

  for (let index = 0; index < warmup; index++) {
    fn();
  }

  const times: number[] = [];
  for (let index = 0; index < runs; index++) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }

  times.sort((a, b) => a - b);

  return {
    name,
    runs,
    warmup,
    minMs: times[0] ?? 0,
    medianMs: percentile(times, 0.5),
    p95Ms: percentile(times, 0.95),
    maxMs: times[times.length - 1] ?? 0,
  };
}

function percentile(sorted: number[], ratio: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * ratio) - 1),
  );
  return sorted[index] ?? 0;
}
