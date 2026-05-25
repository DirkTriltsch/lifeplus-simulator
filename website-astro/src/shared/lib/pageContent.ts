import yaml from 'js-yaml';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pageSchemas, type BrandId, type PageId } from '@shared/content-schemas/config';
import type { z } from 'zod';

type PageData<K extends PageId> = z.infer<(typeof pageSchemas)[K]>;

export async function getPage<K extends PageId>(brandId: BrandId, page: K): Promise<PageData<K>> {
  const path = resolve(process.cwd(), `src/brands/${brandId}/content/${page}.yaml`);
  const raw = await readFile(path, 'utf-8');
  const data = yaml.load(raw);
  return pageSchemas[page].parse(data) as PageData<K>;
}
