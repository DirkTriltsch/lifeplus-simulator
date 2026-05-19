import { describe, expect, it } from 'vitest';
import { simulateNetwork, totalNetworkSize, runSimulation } from '@mlm/simulator-core';
import {
  PHASE1,
  REFERRAL_THRESHOLD_IP,
  calculateMonthlyCompensation,
  determineRank,
  lifeplusProduct,
} from '../src';

describe('Phase 1 aus dem Verguetungsplan', () => {
  it('bildet die Saetze fuer Shop, Referral und Shop-Discount ab', () => {
    expect(PHASE1.shop).toEqual({ level1: 0.25, level2: 0.1, level3: 0.05 });
    expect(PHASE1.referral).toEqual({
      level1: 0.05,
      level2: 0.25,
      level3: 0.1,
    });
    expect(PHASE1.shopDiscount).toEqual({
      level1: 0.1,
      level2: 0.05,
      level3: 0.05,
    });
  });

  it('teilt Member-Bestellungen bei 150 IP in Referral und Shop-Discount', () => {
    const memberOrder = 400;
    const referralPart = Math.min(memberOrder, REFERRAL_THRESHOLD_IP);
    const shopDiscountPart = Math.max(0, memberOrder - REFERRAL_THRESHOLD_IP);

    expect(referralPart).toBe(150);
    expect(shopDiscountPart).toBe(250);
  });

  it('berechnet Annas Phase-1-Provision fuer eine 400-IP-Member-Bestellung', () => {
    const comp = calculateMonthlyCompensation(
      {
        membersByLevel: [1, 0, 0],
        shoppersByLevel: [0, 0, 0],
        directLegs: 1,
        legs: [],
        memberGrowth: 0,
        memberAttrition: 0,
        shopperGrowth: 0,
        shopperAttrition: 0,
      },
      {
        personalMonthlyIP: 40,
        memberMonthlyIP: 400,
        shopperMonthlyIP: 0,
      },
    );

    expect(comp.phase1IP).toBeCloseTo(32.5, 2);
  });

  it('zahlt Ebene 3 erst bei 3 qualifizierten Beinen aus', () => {
    const comp = calculateMonthlyCompensation(
      {
        membersByLevel: [2, 0, 1],
        shoppersByLevel: [0, 0, 0],
        directLegs: 2,
        legs: [],
        memberGrowth: 0,
        memberAttrition: 0,
        shopperGrowth: 0,
        shopperAttrition: 0,
      },
      {
        personalMonthlyIP: 40,
        memberMonthlyIP: 150,
        shopperMonthlyIP: 0,
      },
    );

    expect(comp.phase1IP).toBeCloseTo(15, 2);
  });
});

describe('Netzwerk-Wachstum', () => {
  it('waechst bei Duplikation 0 Prozent nur auf Ebene 1 linear', () => {
    const snapshots = simulateNetwork(
      {
        membersPerYear: 12,
        shoppersPerYear: 0,
        duplicationRate: 0,
        attritionRate: 0,
      },
      24,
    );

    expect(snapshots[23].membersByLevel[0]).toBeCloseTo(24, 1);
    expect(snapshots[23].membersByLevel[1] ?? 0).toBeCloseTo(0, 1);
  });

  it('erzeugt bei Duplikation tiefere Ebenen ab dem dritten Jahr', () => {
    const snapshots = simulateNetwork(
      {
        membersPerYear: 12,
        shoppersPerYear: 0,
        duplicationRate: 1,
        attritionRate: 0,
      },
      36,
    );

    expect(snapshots[35].membersByLevel[0]).toBeGreaterThan(0);
    expect(snapshots[35].membersByLevel[1]).toBeGreaterThan(0);
    expect(snapshots[35].membersByLevel[2]).toBeGreaterThan(0);
  });

  it('laesst neue direkte Members erst im Folgejahr werben', () => {
    // membersPerYear=2, dupRate=1, attrition=0
    // Jahr 1: L0 = 2 (die 2 frischen werben noch nicht)
    // Jahr 2: L0 = 4 (2 alt + 2 neu), L1 = 4 (nur die 2 ALTEN werben je 2)
    // Jahr 3: L0 = 6, L1 = 4 + (4 alte L0 * 2) = 12, L2 = (4 alte L1 * 2) = 8
    const snapshots = simulateNetwork(
      {
        membersPerYear: 2,
        shoppersPerYear: 0,
        duplicationRate: 1,
        attritionRate: 0,
      },
      36,
    );

    const y1 = snapshots[11];
    expect(y1.membersByLevel[0]).toBeCloseTo(2, 5);
    expect(y1.membersByLevel[1] ?? 0).toBeCloseTo(0, 5);

    const y2 = snapshots[23];
    expect(y2.membersByLevel[0]).toBeCloseTo(4, 5);
    expect(y2.membersByLevel[1]).toBeCloseTo(4, 5);
    expect(y2.membersByLevel[2] ?? 0).toBeCloseTo(0, 5);

    const y3 = snapshots[35];
    expect(y3.membersByLevel[0]).toBeCloseTo(6, 5);
    expect(y3.membersByLevel[1]).toBeCloseTo(12, 5);
    expect(y3.membersByLevel[2]).toBeCloseTo(8, 5);
  });

  it('laesst Shopper aus dem Folgejahr-Recruiting nur von alten Members entstehen', () => {
    // membersPerYear=2, shoppersPerYear=3, dupRate=1, attrition=0
    // Jahr 2: Du wirbst 3 neue Shopper auf L0. Die 2 ALTEN Members werben je 3 Shopper auf L1 = 6.
    const snapshots = simulateNetwork(
      {
        membersPerYear: 2,
        shoppersPerYear: 3,
        duplicationRate: 1,
        attritionRate: 0,
      },
      24,
    );

    const y2 = snapshots[23];
    // L0 Shopper: 3 (Jahr1) + 3 (Jahr2) = 6
    expect(y2.shoppersByLevel[0]).toBeCloseTo(6, 5);
    // L1 Shopper: 2 alte Members * 3 = 6 (nicht 4 * 3 = 12 wie vorher mit Bug)
    expect(y2.shoppersByLevel[1]).toBeCloseTo(6, 5);
  });

  it('liefert pro Bein asymmetrische membersByLevel/shoppersByLevel (alte Beine voller als neue)', () => {
    // membersPerYear=2, shoppersPerYear=3, dupRate=1, attrition=0
    // Jahr 2 erwartet:
    //   leg-1, leg-2 (alt, aus Jahr 1): members=[1, 2], shoppers=[1.5, 3]
    //   leg-3, leg-4 (neu, in Jahr 2): members=[1],    shoppers=[1.5]
    const snapshots = simulateNetwork(
      {
        membersPerYear: 2,
        shoppersPerYear: 3,
        duplicationRate: 1,
        attritionRate: 0,
      },
      24,
    );

    const y2 = snapshots[23];
    expect(y2.legs.length).toBe(4);

    const oldLegs = y2.legs.slice(0, 2);
    const newLegs = y2.legs.slice(2, 4);

    for (const leg of oldLegs) {
      expect(leg.membersByLevel[0]).toBeCloseTo(1, 5);
      expect(leg.membersByLevel[1]).toBeCloseTo(2, 5);
      expect(leg.shoppersByLevel[0]).toBeCloseTo(1.5, 5);
      expect(leg.shoppersByLevel[1]).toBeCloseTo(3, 5);
    }

    for (const leg of newLegs) {
      expect(leg.membersByLevel[0]).toBeCloseTo(1, 5);
      expect(leg.membersByLevel[1] ?? 0).toBeCloseTo(0, 5);
      expect(leg.shoppersByLevel[0]).toBeCloseTo(1.5, 5);
      expect(leg.shoppersByLevel[1] ?? 0).toBeCloseTo(0, 5);
    }
  });

  it('haelt jedes Bein bei Fluktuation seine Wurzel (Level 0) ueber alle Jahre', () => {
    // attrition=0.3 sollte tiefere Ebenen reduzieren, aber jede Bein-Wurzel
    // bleibt erhalten (sonst loesen sich Beine auf).
    const snapshots = simulateNetwork(
      {
        membersPerYear: 2,
        shoppersPerYear: 0,
        duplicationRate: 1,
        attritionRate: 0.3,
      },
      60,
    );

    for (const snap of [snapshots[23], snapshots[47], snapshots[59]]) {
      for (const leg of snap.legs) {
        expect(leg.membersByLevel[0]).toBeCloseTo(1, 5);
      }
    }
  });

  it('reicht asymmetrische Beine durch runSimulation an MonthResult.legs durch (Default-Strategie)', () => {
    const result = runSimulation(
      lifeplusProduct,
      {
        ...lifeplusProduct.simulator.defaultInputs,
        membersPerYear: 2,
        shoppersPerYear: 3,
        duplicationRate: 1,
        attritionRate: 0,
      },
      24,
    );

    const y2 = result.yearEnds[1];
    expect(y2.legs.length).toBe(4);

    const oldLegNodes =
      (y2.legs[0].membersByLevel[0] ?? 0) +
      (y2.legs[0].membersByLevel[1] ?? 0) +
      (y2.legs[0].shoppersByLevel[0] ?? 0) +
      (y2.legs[0].shoppersByLevel[1] ?? 0);
    const newLegNodes =
      (y2.legs[3].membersByLevel[0] ?? 0) +
      (y2.legs[3].membersByLevel[1] ?? 0) +
      (y2.legs[3].shoppersByLevel[0] ?? 0) +
      (y2.legs[3].shoppersByLevel[1] ?? 0);

    expect(oldLegNodes).toBeGreaterThan(newLegNodes);
  });

  it('weist Member-Fluktuation am Jahresanfang aus', () => {
    const snapshots = simulateNetwork(
      {
        membersPerYear: 12,
        shoppersPerYear: 0,
        duplicationRate: 0.5,
        attritionRate: 0.3,
      },
      120,
    );

    expect(snapshots[108].memberAttrition).toBeGreaterThan(0);
  });

  it('reduziert das Netzwerk durch Fluktuation', () => {
    const noAttrition = simulateNetwork(
      {
        membersPerYear: 12,
        shoppersPerYear: 0,
        duplicationRate: 0.5,
        attritionRate: 0,
      },
      120,
    );
    const withAttrition = simulateNetwork(
      {
        membersPerYear: 12,
        shoppersPerYear: 0,
        duplicationRate: 0.5,
        attritionRate: 0.3,
      },
      120,
    );

    expect(totalNetworkSize(withAttrition[119])).toBeLessThan(
      totalNetworkSize(noAttrition[119]),
    );
  });

  it('wendet Shopper-Fluktuation auf bestehende Shopper an', () => {
    const snapshots = simulateNetwork(
      {
        membersPerYear: 1,
        shoppersPerYear: 10,
        duplicationRate: 0,
        attritionRate: 0.5,
      },
      24,
    );

    expect(snapshots[11].shoppersByLevel[0]).toBeCloseTo(10, 5);
    expect(snapshots[12].shopperAttrition).toBeCloseTo(5, 5);
    expect(snapshots[23].shoppersByLevel[0]).toBeCloseTo(15, 5);
  });
});

describe('Cap auf direkte Members (maxDirectMembersPerMember)', () => {
  it('begrenzt direkte Members des Users auf den Cap', () => {
    const snapshots = simulateNetwork(
      {
        membersPerYear: 10,
        shoppersPerYear: 0,
        duplicationRate: 0,
        attritionRate: 0,
        maxDirectMembersPerMember: 5,
      },
      24,
    );

    expect(snapshots[11].directLegs).toBeCloseTo(5, 1);
    expect(snapshots[23].directLegs).toBeCloseTo(5, 1);
  });

  it('aendert das Verhalten bei Default 29 und realistischen Inputs nicht', () => {
    const inputs = {
      membersPerYear: 2,
      shoppersPerYear: 3,
      duplicationRate: 1,
      attritionRate: 0,
    };
    const implicit = simulateNetwork(inputs, 120);
    const explicit = simulateNetwork(
      { ...inputs, maxDirectMembersPerMember: 29 },
      120,
    );

    expect(explicit[119].directLegs).toBeCloseTo(implicit[119].directLegs, 5);
    expect(totalNetworkSize(explicit[119])).toBeCloseTo(
      totalNetworkSize(implicit[119]),
      5,
    );
  });

  it('cappt auch die Duplikation pro Source-Member', () => {
    const snapshots = simulateNetwork(
      {
        membersPerYear: 20,
        shoppersPerYear: 0,
        duplicationRate: 1,
        attritionRate: 0,
        maxDirectMembersPerMember: 10,
      },
      24,
    );

    expect(snapshots[11].membersByLevel[0]).toBeCloseTo(10, 1);
    expect(snapshots[23].membersByLevel[0]).toBeCloseTo(10, 1);
    expect(snapshots[23].membersByLevel[1]).toBeCloseTo(100, 1);
  });

  it('laesst Compression durch Fluktuation nicht ueber den Cap springen', () => {
    const snapshots = simulateNetwork(
      {
        membersPerYear: 10,
        shoppersPerYear: 0,
        duplicationRate: 1,
        attritionRate: 0.3,
        maxDirectMembersPerMember: 5,
      },
      36,
    );

    expect(snapshots[11].directLegs).toBeLessThanOrEqual(5);
    expect(snapshots[23].directLegs).toBeLessThanOrEqual(5);
    expect(snapshots[35].directLegs).toBeLessThanOrEqual(5);
  });

  it('normalisiert nicht-positive Caps auf mindestens einen direkten Member', () => {
    const snapshots = simulateNetwork(
      {
        membersPerYear: 10,
        shoppersPerYear: 0,
        duplicationRate: 0,
        attritionRate: 0,
        maxDirectMembersPerMember: 0,
      },
      12,
    );

    expect(snapshots[11].directLegs).toBeCloseTo(1, 1);
  });
});

describe('Beine im NetworkSnapshot', () => {
  it('liefert genau directLegs Beine', () => {
    const snapshots = simulateNetwork(
      {
        membersPerYear: 3,
        shoppersPerYear: 0,
        duplicationRate: 1,
        attritionRate: 0,
      },
      24,
    );

    expect(snapshots[23].legs.length).toBe(
      Math.round(snapshots[23].directLegs),
    );
  });

  it('summiert Beine zu membersByLevel und bewahrt das Geburtsjahr der Beine', () => {
    const snapshots = simulateNetwork(
      {
        membersPerYear: 2,
        shoppersPerYear: 3,
        duplicationRate: 1,
        attritionRate: 0,
      },
      36,
    );

    const snap = snapshots[35];
    const legCount = snap.legs.length;
    if (legCount === 0) return;

    for (let level = 0; level < snap.membersByLevel.length; level++) {
      const sumOfLegs = snap.legs.reduce(
        (acc, leg) => acc + (leg.membersByLevel[level] ?? 0),
        0,
      );
      expect(sumOfLegs).toBeCloseTo(snap.membersByLevel[level], 4);
    }

    expect(snap.legs[0].membersByLevel).toEqual([1, 4, 4]);
    expect(snap.legs[1].membersByLevel).toEqual([1, 4, 4]);
    expect(snap.legs[2].membersByLevel).toEqual([1, 2]);
    expect(snap.legs[3].membersByLevel).toEqual([1, 2]);
    expect(snap.legs[4].membersByLevel).toEqual([1]);
    expect(snap.legs[5].membersByLevel).toEqual([1]);
  });

  it('legt neue Beine im Jahr frisch ohne rueckwirkende Downline an', () => {
    const snapshots = simulateNetwork(
      {
        membersPerYear: 2,
        shoppersPerYear: 3,
        duplicationRate: 1,
        attritionRate: 0,
      },
      24,
    );

    expect(snapshots[23].legs[0]).toMatchObject({
      membersByLevel: [1, 2],
      shoppersByLevel: [1.5, 3],
    });
    expect(snapshots[23].legs[1]).toMatchObject({
      membersByLevel: [1, 2],
      shoppersByLevel: [1.5, 3],
    });
    expect(snapshots[23].legs[2]).toMatchObject({
      membersByLevel: [1],
      shoppersByLevel: [1.5],
    });
    expect(snapshots[23].legs[3]).toMatchObject({
      membersByLevel: [1],
      shoppersByLevel: [1.5],
    });
  });

  it('bildet auch fractional Members/Jahr als Teil-Bein ab', () => {
    const snapshots = simulateNetwork(
      {
        membersPerYear: 0.25,
        shoppersPerYear: 1,
        duplicationRate: 0,
        attritionRate: 0,
      },
      12,
    );

    expect(snapshots[11].directLegs).toBeCloseTo(0.25, 5);
    expect(snapshots[11].membersByLevel[0]).toBeCloseTo(0.25, 5);
    expect(snapshots[11].legs[0].membersByLevel[0]).toBeCloseTo(0.25, 5);
    expect(snapshots[11].legs[0].shoppersByLevel[0]).toBeCloseTo(1, 5);
  });

  it('liefert leere legs-Liste bei membersPerYear = 0', () => {
    const snapshots = simulateNetwork(
      {
        membersPerYear: 0,
        shoppersPerYear: 0,
        duplicationRate: 0,
        attritionRate: 0,
      },
      12,
    );

    expect(snapshots[11].legs).toEqual([]);
  });
});

describe('Rangbestimmung', () => {
  it('vergibt keinen Rang bei zu wenig QGV', () => {
    const r = determineRank({
      av: 40,
      qgv: 100,
      qualifiedLegs: 1,
      bronzeLegs: 0,
      diamondLegs: 0,
    });

    expect(r.phase2Rate).toBe(0);
    expect(r.phase3Rate).toBe(0);
  });

  it('vergibt Bronze bei AV, 3000 QGV und 3 QL', () => {
    const r = determineRank({
      av: 100,
      qgv: 3000,
      qualifiedLegs: 3,
      bronzeLegs: 0,
      diamondLegs: 0,
    });

    expect(r.name).toBe('Bronze');
    expect(r.phase2Rate).toBe(0.03);
  });

  it('vergibt Gold knapp unter Diamond-Schwelle', () => {
    const r = determineRank({
      av: 150,
      qgv: 14999,
      qualifiedLegs: 12,
      bronzeLegs: 0,
      diamondLegs: 0,
    });

    expect(r.name).toBe('Gold');
    expect(r.phase2Rate).toBe(0.09);
    expect(r.phase3Rate).toBe(0);
  });

  it('vergibt 1*Diamond nur mit Diamond- und Bronze-Beinen', () => {
    const r = determineRank({
      av: 150,
      qgv: 15000,
      qualifiedLegs: 12,
      bronzeLegs: 2,
      diamondLegs: 1,
    });

    expect(r.name).toBe('1*Diamond');
    expect(r.phase3Rate).toBe(0.03);
  });

  it('vergibt 3*Diamond mit kumulierter Phase-3-Rate', () => {
    const r = determineRank({
      av: 150,
      qgv: 25000,
      qualifiedLegs: 12,
      bronzeLegs: 0,
      diamondLegs: 3,
    });

    expect(r.name).toBe('3*Diamond');
    expect(r.phase3Rate).toBe(0.08);
  });

  it('bewertet Phase-3-Beine aus echten legs statt aus Gleichverteilung', () => {
    const comp = calculateMonthlyCompensation(
      {
        membersByLevel: [12, 144],
        shoppersByLevel: [],
        directLegs: 12,
        legs: [
          {
            id: 'leg-1',
            membersByLevel: [1, 144],
            shoppersByLevel: [],
          },
          ...Array.from({ length: 11 }, (_, index) => ({
            id: `leg-${index + 2}`,
            membersByLevel: [1],
            shoppersByLevel: [],
          })),
        ],
        memberGrowth: 0,
        memberAttrition: 0,
        shopperGrowth: 0,
        shopperAttrition: 0,
      },
      {
        personalMonthlyIP: 150,
        memberMonthlyIP: 1250,
        shopperMonthlyIP: 0,
      },
    );

    expect(comp.rank.name).toBe('Diamond');
    expect(comp.rank.phase3Rate).toBe(0);
    expect(comp.phase3IP).toBe(0);
  });
});

describe('Vollstaendige Simulation', () => {
  it('liefert 120 Monate und 10 Jahreszusammenfassungen', () => {
    const result = runSimulation(lifeplusProduct, {
      membersPerYear: 2,
      shoppersPerYear: 3,
      duplicationRate: 1,
      attritionRate: 0,
      memberMonthlyVolume: 200,
      shopperMonthlyVolume: 200,
    });

    expect(result.months.length).toBe(120);
    expect(result.yearEnds.length).toBe(10);
    expect(result.yearSummaries.length).toBe(10);
  });

  it('laesst Provision bei positivem Wachstum steigen', () => {
    const result = runSimulation(lifeplusProduct, {
      membersPerYear: 2,
      shoppersPerYear: 3,
      duplicationRate: 1,
      attritionRate: 0,
      memberMonthlyVolume: 200,
      shopperMonthlyVolume: 200,
    });

    expect(result.yearEnds[9].totalEUR).toBeGreaterThan(
      result.yearEnds[0].totalEUR,
    );
  });

  it('liefert 0 Provision bei leerem Netzwerk', () => {
    const result = runSimulation(lifeplusProduct, {
      membersPerYear: 0,
      shoppersPerYear: 0,
      duplicationRate: 0,
      attritionRate: 0,
      memberMonthlyVolume: 200,
      shopperMonthlyVolume: 200,
    });

    expect(result.finalMonth.totalEUR).toBe(0);
  });

  it('rechnet IP in EUR um', () => {
    const r1 = runSimulation(lifeplusProduct, {
      membersPerYear: 2,
      shoppersPerYear: 3,
      duplicationRate: 1,
      attritionRate: 0,
      memberMonthlyVolume: 200,
      shopperMonthlyVolume: 200,
      unitToCurrency: 1,
    });
    const r2 = runSimulation(lifeplusProduct, {
      membersPerYear: 2,
      shoppersPerYear: 3,
      duplicationRate: 1,
      attritionRate: 0,
      memberMonthlyVolume: 200,
      shopperMonthlyVolume: 200,
      unitToCurrency: 0.5,
    });

    expect(r2.finalMonth.totalEUR).toBeCloseTo(r1.finalMonth.totalEUR / 2, 2);
  });
});
