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
