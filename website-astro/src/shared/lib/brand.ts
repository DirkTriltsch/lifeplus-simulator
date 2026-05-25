import yaml from 'js-yaml';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { brandSchema, type Brand, type BrandId } from '@shared/content-schemas/config';

export async function getBrand(brandId: BrandId): Promise<Brand> {
  const path = resolve(process.cwd(), `src/brands/${brandId}/brand.yaml`);
  const raw = await readFile(path, 'utf-8');
  const data = yaml.load(raw);
  if (typeof data !== 'object' || data === null) {
    throw new Error(`brand.yaml fuer ${brandId} ist kein Objekt`);
  }
  return brandSchema.parse({ id: brandId, ...data });
}
