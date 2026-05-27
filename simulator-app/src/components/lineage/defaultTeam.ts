import type { ExampleLinePerson } from '@mlm/product-lifeplus';

export const DEFAULT_LINEAGE_TEAM: ExampleLinePerson[] = [
  { id: 'anna', name: 'Anna', rank: 'Member' },
  { id: 'bernd', name: 'Bernd', rank: 'Believer' },
  { id: 'cornelia', name: 'Cornelia', rank: 'Builder' },
  { id: 'daniela', name: 'Daniela', rank: 'Bronze' },
  { id: 'eva', name: 'Eva', rank: 'Silver' },
  { id: 'frank', name: 'Frank', rank: 'Gold' },
  { id: 'georg', name: 'Georg', rank: '1*Diamond' },
  { id: 'heidi', name: 'Heidi', rank: '2*Diamond' },
  { id: 'ingo', name: 'Ingo', rank: '3*Diamond' },
  { id: 'katrin', name: 'Katrin', rank: '4*Diamond' },
  { id: 'ludwig', name: 'Ludwig', rank: '7*Diamond' },
];

export function cloneDefaultTeam(): ExampleLinePerson[] {
  return DEFAULT_LINEAGE_TEAM.map((person) => ({ ...person }));
}

