import type { ProductDefinition } from '@mlm/simulator-core';
import { lifeplusPlan } from './plan';

export const lifeplusProduct: ProductDefinition = {
  id: 'lifeplus',
  domain: 'www.lifeflow360.app',
  siteUrl: 'https://www.lifeflow360.app/',
  brand: {
    name: 'LifeFlow360 Verguetungs-Simulator',
    shortName: 'LifeFlow360',
    accentColor: '#1D9E75',
    lockup: {
      initial: 'L',
      wordNeutral: 'life',
      wordAccent: 'flow360',
      markFill: '#006F44',
      darkBg: '#0E1F1A',
      accentOnDark: '#1FAE74',
      waveColor: '#7FB6A1',
      taglineDe: 'BESSER VERSTEHEN. STÄRKER WACHSEN.',
    },
  },
  legal: {
    siteName: 'LifeFlow360',
    contactEmail: 'info@lifeflow360.app',
  },
  terminology: {
    productName: 'LifePlus',
    memberLabel: 'Members',
    shopperLabel: 'Shopper',
    volumeUnit: 'IP',
    currencyLabel: 'EUR',
    rankLabel: 'Rang',
  },
  simulator: {
    defaultInputs: {
      membersPerYear: 2,
      shoppersPerYear: 2,
      duplicationRate: 0,
      attritionRate: 0,
      memberMonthlyVolume: 45,
      shopperMonthlyVolume: 45,
      unitToCurrency: 1,
      monthlyProductCostEUR: 100,
      maxDirectMembersPerMember: 29,
    },
    plan: lifeplusPlan,
  },
};
