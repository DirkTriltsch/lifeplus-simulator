import type { ProductDefinition } from '@mlm/simulator-core';
import { lifeplusPlan } from '@mlm/product-lifeplus';

export const eqologyProduct: ProductDefinition = {
  id: 'eqology',
  domain: 'eqoflow360.de',
  brand: {
    name: 'EqoFlow360 Verguetungs-Simulator',
    shortName: 'EqoFlow360',
    accentColor: '#48664D',
  },
  legal: {
    siteName: 'EqoFlow360',
    contactEmail: 'info@eqoflow360.de',
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
