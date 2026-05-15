import { describe, expect, it } from 'vitest';
import { runSimulation } from '@mlm/simulator-core';
import { eqologyProduct } from '../src';

describe('eqology product pack', () => {
  it('uses its own branding and defaults with the shared placeholder plan', () => {
    expect(eqologyProduct.brand.shortName).toBe('EqoFlow360');
    expect(eqologyProduct.simulator.defaultInputs.shoppersPerYear).toBe(2);

    const result = runSimulation(eqologyProduct, eqologyProduct.simulator.defaultInputs, 12);
    expect(result.finalMonth.networkSize).toBeGreaterThan(0);
  });
});
