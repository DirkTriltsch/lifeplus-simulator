import type {
  CompensationPlan,
  CompensationResult,
} from '@mlm/simulator-core';
import { calculateMonthlyCompensation } from './compensation';
import { calculateTreeCompensation } from './tree-compensation';

export const lifeplusPlan: CompensationPlan = {
  calculateMonth(snapshot, inputs): CompensationResult {
    const result = calculateMonthlyCompensation(snapshot, {
      personalMonthlyIP:
        inputs.personalMonthlyVolume ?? inputs.memberMonthlyVolume,
      memberMonthlyIP: inputs.memberMonthlyVolume,
      shopperMonthlyIP: inputs.shopperMonthlyVolume,
    });

    return {
      totalUnits: result.totalIP,
      phase1Units: result.phase1IP,
      phase2Units: result.phase2IP,
      phase3Units: result.phase3IP,
      rankName: result.rank.name,
      av: result.av,
      qgv: result.qgv,
      networkSize: result.networkSize,
      directLegs: result.directLegs,
      members: result.members,
      shoppers: result.shoppers,
    };
  },
  calculateTreeMonth(snapshot, inputs) {
    return calculateTreeCompensation(snapshot, {
      rootPersonalMonthlyVolume:
        inputs.personalMonthlyVolume ?? inputs.memberMonthlyVolume,
    });
  },
};
