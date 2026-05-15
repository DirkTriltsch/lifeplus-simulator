import { describe, expect, it } from 'vitest';
import { runSimulation } from '@mlm/simulator-core';
import { fitlineProduct } from '../src';

describe('fitline product pack', () => {
  it('uses its own branding and defaults with the shared placeholder plan', () => {
    expect(fitlineProduct.brand.shortName).toBe('FitFlow360');
    expect(fitlineProduct.simulator.defaultInputs.membersPerYear).toBe(3);

    const result = runSimulation(fitlineProduct, fitlineProduct.simulator.defaultInputs, 12);
    expect(result.finalMonth.networkSize).toBeGreaterThan(0);
  });
});
