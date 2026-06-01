export interface Leg {
  id: string;
  membersByLevel: number[];
  shoppersByLevel: number[];
  ranksByLevel?: string[];
}

export interface NetworkSnapshot {
  membersByLevel: number[];
  shoppersByLevel: number[];
  directLegs: number;
  legs: Leg[];
  memberGrowth: number;
  memberAttrition: number;
  shopperGrowth: number;
  shopperAttrition: number;
}

export function totalMembers(snapshot: Pick<NetworkSnapshot, 'membersByLevel'>): number {
  return sum(snapshot.membersByLevel);
}

export function totalShoppers(snapshot: Pick<NetworkSnapshot, 'shoppersByLevel'>): number {
  return sum(snapshot.shoppersByLevel);
}

export function totalNetworkSize(
  snapshot: Pick<NetworkSnapshot, 'membersByLevel' | 'shoppersByLevel'>,
): number {
  return totalMembers(snapshot) + totalShoppers(snapshot);
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}
