import type { ProductDefinition } from '@mlm/simulator-core';
import { lifeplusPlan } from '@mlm/product-lifeplus';

export const eqologyProduct: ProductDefinition = {
  id: 'eqology',
  domain: 'eqoflow360.triltsch.com',
  siteUrl: 'http://eqoflow360.triltsch.com/',
  brand: {
    name: 'EqoFlow360 Verguetungs-Simulator',
    shortName: 'EqoFlow360',
    accentColor: '#48664D',
    lockup: {
      initial: 'E',
      wordNeutral: 'eqo',
      wordAccent: 'flow360',
      markFill: '#293C94',
      darkBg: '#0F1832',
      accentOnDark: '#6E83D9',
      waveColor: '#9EA7CF',
      taglineDe: 'BESSER VERSTEHEN. STÄRKER WACHSEN.',
    },
  },
  legal: {
    siteName: 'EqoFlow360',
    contactEmail: 'info@lifeflow360.app',
  },
  terminology: {
    productName: 'Eqology',
    memberLabel: 'Partner',
    shopperLabel: 'Kunden',
    volumeUnit: 'Punkte',
    currencyLabel: 'EUR',
    rankLabel: 'Rang',
  },
  simulator: {
    defaultInputs: {
      membersPerYear: 2,
      shoppersPerYear: 2,
      duplicationRate: 0.75,
      attritionRate: 0.03,
      memberMonthlyVolume: 45,
      shopperMonthlyVolume: 45,
      unitToCurrency: 1,
    },
    plan: lifeplusPlan,
  },
};
