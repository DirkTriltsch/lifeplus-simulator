import { describe, expect, it } from 'vitest';
import { normalizeRealityStrategy } from './App';

describe('normalizeRealityStrategy', () => {
  it('behaelt aktuelle Reality-Strategien und migriert Legacy-Werte', () => {
    expect(normalizeRealityStrategy('person-tree-equal')).toBe('person-tree-equal');
    expect(normalizeRealityStrategy('person-tree-random')).toBe('person-tree-random');
    expect(normalizeRealityStrategy('person-tree-momentum')).toBe('person-tree-momentum');

    expect(normalizeRealityStrategy('person-tree' as any)).toBe('person-tree-equal');
    expect(normalizeRealityStrategy('standard' as any)).toBe('person-tree-equal');
    expect(normalizeRealityStrategy('none' as any)).toBe('person-tree-equal');
    expect(normalizeRealityStrategy('lifecycle' as any)).toBe('person-tree-equal');
    expect(normalizeRealityStrategy('dirichlet' as any)).toBe('person-tree-random');
    expect(normalizeRealityStrategy('momentum' as any)).toBe('person-tree-momentum');
    expect(normalizeRealityStrategy(undefined)).toBe('person-tree-equal');
  });
});
