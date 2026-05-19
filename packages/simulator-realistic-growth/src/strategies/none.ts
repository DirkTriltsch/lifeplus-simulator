import type { GrowthModulator, Leg } from '@mlm/simulator-core';

export function createNoneStrategy(): GrowthModulator {
  return {
    id: 'none',
    splitLegs({ membersByLevel, shoppersByLevel, directLegs }): Leg[] {
      const legCount = Math.round(directLegs);
      if (legCount <= 0) return [];
      const share = 1 / legCount;

      return Array.from({ length: legCount }, (_, i) => ({
        id: `leg-${i + 1}`,
        membersByLevel: membersByLevel.map((v) => v * share),
        shoppersByLevel: shoppersByLevel.map((v) => v * share),
      }));
    },
  };
}
