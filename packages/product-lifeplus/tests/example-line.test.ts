import { describe, expect, it } from 'vitest';
import { calculateExampleLine, normalizeRankName, phase3SlotCount } from '../src';

describe('Beispielrechnungen fuer konkrete Linien', () => {
  it('normalisiert n*Diamant ohne auf 3*Diamond zu kappen', () => {
    expect(normalizeRankName('4* Diamant')).toBe('4*Diamond');
    expect(normalizeRankName('15* Dia')).toBe('15*Diamond');
    expect(phase3SlotCount('15* Diamant')).toBe(3);
  });

  it('bildet eine Musterrechnung mit Phase 1, Phase 2 und Phase 3 ab', () => {
    const result = calculateExampleLine({
      order: { kind: 'shopper', ip: 1000 },
      peopleFromCustomerUp: [
        { id: 'a', rank: 'Member' },
        { id: 'b', rank: 'Member' },
        { id: 'c', rank: 'Member' },
        { id: 'bronze', rank: 'Bronze' },
        { id: 'silver', rank: 'Silver' },
        { id: 'gold', rank: 'Gold' },
        { id: 'diamond', rank: 'Diamond' },
        { id: 'one-d', rank: '1*Diamond' },
        { id: 'two-d', rank: '2*Diamond' },
        { id: 'three-d', rank: '3*Diamond' },
      ],
    });

    expect(result.phase1IP).toBeCloseTo(400, 2);
    expect(result.phase2IP).toBeCloseTo(120, 2);
    expect(result.phase3IP).toBeCloseTo(80, 2);
    expect(result.totalIP).toBeCloseTo(600, 2);
    expect(result.totalRateOnOrder).toBeCloseTo(0.6, 6);

    expect(result.payouts.filter((payout) => payout.phase === 2)).toMatchObject([
      { personId: 'bronze', rate: 0.03, slot: 'Bronze-Stueck' },
      { personId: 'silver', rate: 0.03, slot: 'Silber-Stueck' },
      { personId: 'gold', rate: 0.03, slot: 'Gold-Stueck' },
      { personId: 'diamond', rate: 0.03, slot: 'Diamant-Stueck' },
    ]);
    expect(result.payouts.filter((payout) => payout.phase === 3)).toMatchObject([
      { personId: 'one-d', rate: 0.03, slot: '1*Diamant-Stueck' },
      { personId: 'two-d', rate: 0.03, slot: '2*Diamant-Stueck' },
      { personId: 'three-d', rate: 0.02, slot: '3*Diamant-Stueck' },
    ]);
  });

  it('stellt Phase-2-Stuecke als Visualisierungsdaten bereit', () => {
    const result = calculateExampleLine({
      order: { kind: 'shopper', ip: 1000 },
      peopleFromCustomerUp: [
        { id: 'a', rank: 'Member' },
        { id: 'b', rank: 'Member' },
        { id: 'c', rank: 'Member' },
        { id: 'gold', rank: 'Gold' },
        { id: 'bronze-1', rank: 'Bronze' },
        { id: 'bronze-2', rank: 'Bronze' },
        { id: 'diamond', rank: 'Diamond' },
      ],
    });

    expect(result.payouts.filter((payout) => payout.phase === 2)).toMatchObject([
      {
        personId: 'gold',
        rate: 0.09,
        amountIP: 90,
        slot: 'Bronze-Stueck + Silber-Stueck + Gold-Stueck',
      },
      {
        personId: 'diamond',
        rate: 0.03,
        amountIP: 30,
        slot: 'Diamant-Stueck',
      },
    ]);
  });

  it('zahlt einer Person nicht gleichzeitig Phase 2 und Phase 3', () => {
    const result = calculateExampleLine({
      order: { kind: 'member_order', ip: 120 },
      peopleFromCustomerUp: [
        { id: 'bernd', rank: 'Believer' },
        { id: 'cornelia', rank: 'Builder' },
        { id: 'daniela', rank: 'Bronze' },
        { id: 'eva', rank: 'Silver' },
        { id: 'frank', rank: 'Gold' },
        { id: 'georg', rank: 'Diamond' },
        { id: 'heidi', rank: '1*Diamond' },
      ],
    });

    expect(result.payouts.filter((payout) => payout.phase === 2)).toMatchObject([
      { personId: 'eva', rate: 0.06, slot: 'Bronze-Stueck + Silber-Stueck' },
      { personId: 'frank', rate: 0.03, slot: 'Gold-Stueck' },
      { personId: 'georg', rate: 0.03, slot: 'Diamant-Stueck' },
    ]);
    expect(result.payouts.filter((payout) => payout.phase === 3)).toMatchObject([
      { personId: 'heidi', rate: 0.03, slot: '1*Diamant-Stueck' },
    ]);
    expect(
      result.payouts.filter((payout) => payout.personId === 'georg'),
    ).toHaveLength(1);
  });

  it('bildet die Default-Teamstruktur aus der aktuellen Skizze ab', () => {
    const result = calculateExampleLine({
      order: { kind: 'member_order', ip: 120 },
      peopleFromCustomerUp: [
        { id: 'bernd', rank: 'Believer' },
        { id: 'cornelia', rank: 'Builder' },
        { id: 'daniela', rank: 'Bronze' },
        { id: 'eva', rank: 'Silver' },
        { id: 'frank', rank: 'Gold' },
        { id: 'georg', rank: 'Diamond' },
        { id: 'heidi', rank: '1*Diamond' },
        { id: 'ingo', rank: '2*Diamond' },
        { id: 'katrin', rank: '3*Diamond' },
        { id: 'ludwig', rank: '4*Diamond' },
        { id: 'maria', rank: '7*Diamond' },
      ],
    });

    expect(result.payouts.filter((payout) => payout.phase === 2)).toMatchObject([
      { personId: 'eva', rate: 0.06, slot: 'Bronze-Stueck + Silber-Stueck' },
      { personId: 'frank', rate: 0.03, slot: 'Gold-Stueck' },
      { personId: 'georg', rate: 0.03, slot: 'Diamant-Stueck' },
    ]);
    expect(result.payouts.filter((payout) => payout.phase === 3)).toMatchObject([
      { personId: 'heidi', rate: 0.03, slot: '1*Diamant-Stueck' },
      { personId: 'ingo', rate: 0.03, slot: '2*Diamant-Stueck' },
      { personId: 'katrin', rate: 0.02, slot: '3*Diamant-Stueck' },
    ]);
  });

  it('behandelt 4* und hoehere Diamanten als Phase-3-qualifiziert, behaelt aber den Statusnamen', () => {
    const result = calculateExampleLine({
      order: { kind: 'shopper', ip: 1000 },
      peopleFromCustomerUp: [
        { id: 'a', rank: 'Member' },
        { id: 'b', rank: 'Member' },
        { id: 'c', rank: 'Member' },
        { id: 'four-d', rank: '4* Diamant' },
        { id: 'one-d', rank: '1*Diamant' },
        { id: 'fifteen-d', rank: '15* Dia' },
      ],
    });

    expect(result.payouts.filter((payout) => payout.phase === 3)).toMatchObject([
      { personId: 'one-d', rank: '1*Diamond', rate: 0.03, slot: '1*Diamant-Stueck' },
      { personId: 'fifteen-d', rank: '15*Diamond', rate: 0.03, slot: '2*Diamant-Stueck' },
    ]);
  });

  it('komprimiert Phase-1-Stuecke zur naechsten qualifizierten Upline', () => {
    const result = calculateExampleLine({
      order: { kind: 'shopper', ip: 100 },
      peopleFromCustomerUp: [
        { id: 'a', rank: 'Member', qualifiedForPhase1: false },
        { id: 'b', rank: 'Member' },
        { id: 'c', rank: 'Member' },
      ],
    });

    expect(result.payouts.filter((payout) => payout.phase === 1)).toMatchObject([
      {
        personId: 'b',
        rate: 0.25,
        amountIP: 25,
        note: 'Phase 1 Shopper, Ebene 1 komprimiert von Ebene 1 auf Ebene 2',
      },
      { personId: 'b', rate: 0.1, amountIP: 10 },
      { personId: 'c', rate: 0.05, amountIP: 5 },
    ]);
  });
});
