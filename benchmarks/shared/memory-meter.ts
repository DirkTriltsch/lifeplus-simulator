/**
 * Memory-Meter - indikative Speichermessung fuer Benchmarks.
 *
 * Doc 13 §2.3 und §5.5: Speicher als Indikator, kein Pass/Fail.
 * Verwendung mit Node-Flag `--expose-gc`.
 *
 * Beispiel:
 *   const before = measureMemoryMb();
 *   doExpensiveWork();
 *   const after = measureMemoryMb();
 *   console.log(`Delta: ${(after - before).toFixed(1)} MB`);
 */

export interface MemorySnapshot {
  heapUsedMb: number;
  heapTotalMb: number;
  rssMb: number;
  gcAvailable: boolean;
}

/**
 * Forciert einen Garbage Collection und liefert den Heap-Stand danach.
 * Wenn --expose-gc nicht aktiv ist, wird trotzdem ein Snapshot zurueckgegeben,
 * aber das Feld gcAvailable ist false.
 */
export function measureMemorySnapshot(): MemorySnapshot {
  const globalWithGc = globalThis as typeof globalThis & { gc?: () => void };
  const gcAvailable = typeof globalWithGc.gc === 'function';

  if (gcAvailable) {
    // Doppelter GC-Aufruf hilft, alle Generationen zu raeumen.
    globalWithGc.gc!();
    globalWithGc.gc!();
  }

  const usage = process.memoryUsage();
  return {
    heapUsedMb: round(usage.heapUsed / 1024 / 1024),
    heapTotalMb: round(usage.heapTotal / 1024 / 1024),
    rssMb: round(usage.rss / 1024 / 1024),
    gcAvailable,
  };
}

/**
 * Komfort-Funktion: misst Delta-Heap fuer einen Code-Block.
 */
export function measureMemoryDeltaMb(fn: () => void): number {
  const before = measureMemorySnapshot();
  fn();
  const after = measureMemorySnapshot();
  return round(after.heapUsedMb - before.heapUsedMb);
}

/**
 * Komfort-Funktion: liefert nur die heapUsed-Zahl, fuer schnellen CSV-Eintrag.
 * Ergebnis kann negativ sein (GC hat mehr freigegeben als allokiert) — das ist OK fuer einen Indikator.
 */
export function measureMemoryMb(): number {
  return measureMemorySnapshot().heapUsedMb;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
