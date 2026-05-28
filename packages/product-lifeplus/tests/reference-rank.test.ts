import { describe, expect, it } from 'vitest';
import { calculateTreeCompensation } from '../src';
import { determineRank } from '../src/ranks';
import {
  expectRankState,
  member,
  networkFixture,
  root,
  shopper,
} from './helpers/tree-fixture';

describe('Referenznetzwerke fuer Rangberechnung', () => {
  it('berechnet ein festes 4*Diamond-Netzwerk aus echten Personen', () => {
    const snapshot = networkFixture({
      root: root('du', 50, [
        ...Array.from({ length: 4 }, (_value, index) =>
          diamondLeg(`diamond-leg-${index + 1}`),
        ),
        ...Array.from({ length: 8 }, (_value, index) =>
          member(`member-leg-${index + 1}`, 150),
        ),
      ]),
    });

    const comp = calculateTreeCompensation(snapshot, {
      rootPersonalMonthlyVolume: 50,
    });

    expectRankState(snapshot, comp.rankStates, 'du', {
      rank: { name: '4*Diamond' },
      av: 150,
      qgv: 61800,
      qualifiedLegs: 12,
      diamondLegs: 4,
    });

    for (let index = 1; index <= 4; index++) {
      expectRankState(snapshot, comp.rankStates, `diamond-leg-${index}`, {
        rank: { name: 'Diamond' },
        av: 150,
        qgv: 15000,
        qualifiedLegs: 12,
      });
    }
  });

  it('zaehlt Shopper-Volumen zum QGV, aber Shopper nicht als qualifiziertes Bein', () => {
    const snapshot = networkFixture({
      root: root('du', 50, [
        member('member-a', 50),
        member('member-b', 50),
        shopper('shopper-a', 5000),
      ]),
    });

    const comp = calculateTreeCompensation(snapshot, {
      rootPersonalMonthlyVolume: 50,
    });

    expectRankState(snapshot, comp.rankStates, 'du', {
      rank: { name: 'Member' },
      qgv: 5100,
      qualifiedLegs: 2,
      diamondLegs: 0,
    });
    expect(comp.members).toBe(2);
    expect(comp.shoppers).toBe(1);
    expect(comp.directLegs).toBe(2);
  });

  it('bewertet einen gewichteten Direktknoten wie die aequivalenten Einzelpersonen', () => {
    const weightedSnapshot = networkFixture({
      root: root('du', 50, [
        member('weighted-member-leg', 3000, [], { weight: 12 }),
      ]),
    });
    const expandedSnapshot = networkFixture({
      root: root(
        'du',
        50,
        Array.from({ length: 12 }, (_value, index) =>
          member(`member-leg-${index + 1}`, 3000),
        ),
      ),
    });

    const weightedComp = calculateTreeCompensation(weightedSnapshot, {
      rootPersonalMonthlyVolume: 50,
    });
    const expandedComp = calculateTreeCompensation(expandedSnapshot, {
      rootPersonalMonthlyVolume: 50,
    });
    const weightedRoot = weightedComp.rankStates.find(
      (state) => state.personId === 'du',
    );
    const expandedRoot = expandedComp.rankStates.find(
      (state) => state.personId === 'du',
    );

    expect(weightedRoot?.rank.name).toBe(expandedRoot?.rank.name);
    expect(weightedRoot?.av).toBe(expandedRoot?.av);
    expect(weightedRoot?.qgv).toBe(expandedRoot?.qgv);
    expect(weightedRoot?.qualifiedLegs).toBe(expandedRoot?.qualifiedLegs);
  });

  it.each([
    {
      name: '4 Diamond-Beine und QGV 29.999 bleiben 3*Diamond',
      qgv: 29999,
      diamondLegs: 4,
      expectedRank: '3*Diamond',
    },
    {
      name: '4 Diamond-Beine und QGV 30.000 werden 4*Diamond',
      qgv: 30000,
      diamondLegs: 4,
      expectedRank: '4*Diamond',
    },
    {
      name: '5 Diamond-Beine und QGV 30.000 bleiben 4*Diamond',
      qgv: 30000,
      diamondLegs: 5,
      expectedRank: '4*Diamond',
    },
    {
      name: '5 Diamond-Beine und QGV 35.000 werden 5*Diamond',
      qgv: 35000,
      diamondLegs: 5,
      expectedRank: '5*Diamond',
    },
    {
      name: '12 Diamond-Beine und QGV 60.000 werden 10*Diamond',
      qgv: 60000,
      diamondLegs: 12,
      expectedRank: '10*Diamond',
    },
  ])('$name', ({ qgv, diamondLegs, expectedRank }) => {
    expect(
      determineRank({
        av: 150,
        qgv,
        qualifiedLegs: 12,
        bronzeLegs: diamondLegs,
        diamondLegs,
      }).name,
    ).toBe(expectedRank);
  });

  it('zaehlt Diamond-Beine nicht als zusaetzliche Bronze-Beine fuer 1* und 2*Diamond', () => {
    expect(
      determineRank({
        av: 150,
        qgv: 20000,
        qualifiedLegs: 12,
        bronzeLegs: 2,
        diamondLegs: 2,
      }).name,
    ).toBe('Diamond');
  });
});

function diamondLeg(id: string) {
  return member(
    id,
    150,
    Array.from({ length: 12 }, (_value, index) =>
      member(`${id}-leaf-${index + 1}`, 1250),
    ),
  );
}
