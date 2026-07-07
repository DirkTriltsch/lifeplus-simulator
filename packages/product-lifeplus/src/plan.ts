import type {
  CompensationPlan,
} from '@mlm/simulator-core';
import { calculateExampleLine } from './example-line';
import { calculateTreeCompensation } from './tree-compensation';

export const lifeplusPlan: CompensationPlan = {
  calculateTreeMonth(snapshot, inputs) {
    return calculateTreeCompensation(snapshot, {
      rootPersonalMonthlyVolume:
        inputs.personalMonthlyVolume ?? inputs.memberMonthlyVolume,
    });
  },
  calculateExampleLine,
  selectTreeMemberChurnCandidates(snapshot, inputs) {
    const churnableRanks = new Set(['Member', 'Believer', 'Builder', 'Bronze']);
    const activeMemberIds = new Set(
      snapshot.persons
        .filter((person) => person.active && person.kind === 'member')
        .map((person) => person.id),
    );
    const comp = calculateTreeCompensation(snapshot, {
      rootPersonalMonthlyVolume:
        inputs.personalMonthlyVolume ?? inputs.memberMonthlyVolume,
    });

    return comp.rankStates
      .filter(
        (state) =>
          activeMemberIds.has(state.personId) &&
          churnableRanks.has(state.rank.name),
      )
      .map((state) => state.personId);
  },
};
