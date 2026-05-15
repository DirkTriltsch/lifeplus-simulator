import type { ProductDefinition } from '@mlm/simulator-core';
import { lifeplusPlan } from '@mlm/product-lifeplus';

export const fitlineProduct: ProductDefinition = {
  id: 'fitline',
  domain: 'fitflow360.de',
  brand: {
    name: 'FitFlow360 Verguetungs-Simulator',
    shortName: 'FitFlow360',
    accentColor: '#D71920',
  },
  legal: {
    siteName: 'FitFlow360',
    contactEmail: 'info@lifeflow360.app',
  },
  terminology: {
    productName: 'FitLine',
    memberLabel: 'Partner',
    shopperLabel: 'Kunden',
    volumeUnit: 'Punkte',
    currencyLabel: 'EUR',
    rankLabel: 'Karriere',
  },
  simulator: {
    defaultInputs: {
      membersPerYear: 3,
      shoppersPerYear: 4,
      duplicationRate: 0.8,
      attritionRate: 0.05,
      memberMonthlyVolume: 45,
      shopperMonthlyVolume: 45,
      unitToCurrency: 1,
    },
    plan: lifeplusPlan,
  },
};
