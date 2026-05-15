import { describe, expect, it } from 'vitest';
import { products } from '@mlm/product-registry';
import { runSimulation } from '@mlm/simulator-core';

describe('product packs', () => {
  it('provide unique product ids and domains', () => {
    expect(new Set(products.map((product) => product.id)).size).toBe(products.length);
    expect(new Set(products.map((product) => product.domain)).size).toBe(products.length);
  });

  it('can all execute the shared simulation contract', () => {
    for (const product of products) {
      const result = runSimulation(product, product.simulator.defaultInputs, 12);

      expect(result.months).toHaveLength(12);
      expect(result.finalMonth.rankName).toBeTruthy();
      expect(product.brand.name).toContain(product.brand.shortName);
      expect(product.legal.contactEmail).toMatch(/^info@/);
    }
  });
});
