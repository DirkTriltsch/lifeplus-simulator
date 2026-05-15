import type { ProductDefinition } from '@mlm/simulator-core';
import { lifeplusPlan } from './plan';

export const lifeplusProduct: ProductDefinition = {
  id: 'lifeplus',
  domain: 'lifeflow360.de',
  brand: {
    name: 'LifeFlow360 Verguetungs-Simulator',
    shortName: 'LifeFlow360',
    accentColor: '#1D9E75',
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
      shoppersPerYear: 3,
      duplicationRate: 1,
      attritionRate: 0,
      memberMonthlyVolume: 45,
      shopperMonthlyVolume: 45,
      unitToCurrency: 1,
    },
    plan: lifeplusPlan,
  },
};
