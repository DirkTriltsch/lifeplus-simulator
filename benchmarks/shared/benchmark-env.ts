import { cpus, totalmem } from 'node:os';
import { execSync } from 'node:child_process';

export interface BenchmarkEnvironment {
  timestamp: string;
  gitCommit: string;
  gitBranch: string;
  nodeVersion: string;
  os: string;
  cpuModel: string;
  logicalCores: number;
  ramTotalGb: number;
  buildMode: string;
  testRunner: string;
}

export function collectBenchmarkEnvironment(): BenchmarkEnvironment {
  const cpu = cpus()[0];

  return {
    timestamp: new Date().toISOString(),
    gitCommit: safeExec('git rev-parse HEAD'),
    gitBranch: safeExec('git branch --show-current'),
    nodeVersion: process.version,
    os: `${process.platform} ${process.arch}`,
    cpuModel: cpu?.model ?? 'unknown',
    logicalCores: cpus().length,
    ramTotalGb: Math.round((totalmem() / 1024 ** 3) * 10) / 10,
    buildMode: process.env.NODE_ENV ?? 'test',
    testRunner: 'vitest',
  };
}

function safeExec(command: string): string {
  try {
    return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return 'unknown';
  }
}
