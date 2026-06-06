import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export type CsvValue = string | number | boolean | null | undefined;

export function writeCsv(
  filePath: string,
  rows: Array<Record<string, CsvValue>>,
): void {
  mkdirSync(dirname(filePath), { recursive: true });

  if (rows.length === 0) {
    writeFileSync(filePath, '', 'utf8');
    return;
  }

  const headers = Object.keys(rows[0] ?? {});
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((header) => formatCsvValue(row[header])).join(','),
    ),
  ];

  writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function formatCsvValue(value: CsvValue): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}
