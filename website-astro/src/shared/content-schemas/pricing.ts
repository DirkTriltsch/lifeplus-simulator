// Pricing-Page-Form fuer die geteilte PricingPageDefault.astro.
// Plain-TS (vorher Zod): Brands inlinen ihre Daten in
// src/brands/<brand>/pages/pricing.astro und nutzen `satisfies PricingPage`,
// damit zukuenftige Brand-spezifische Extra-Felder nicht durch ein zentrales
// Schema gebremst werden. Wenn ein Brand strukturell divergiert, forkt er
// PricingPageDefault statt diesen Typ aufzuweichen.

export type PricingPlanKey = 'monthly' | 'halfyear' | 'yearly';

export type PricingFeature = {
  strong?: string;
  text: string;
};

export type PricingTierCta =
  | { kind: 'link'; label: string; url: string }
  | {
      kind: 'paddle';
      label: string;
      plan: PricingPlanKey;
      priceIdKey: PricingPlanKey;
    };

export type PricingTier = {
  id: string;
  featured?: boolean;
  badge?: string;
  name: string;
  descHtml: string;
  currency: string;
  value: string;
  unit: string;
  unitNote?: string;
  billed: string;
  features: PricingFeature[];
  cta: PricingTierCta;
};

export type PricingNote = {
  icon: 'info' | 'doc';
  title: string;
  body: string;
};

export type PricingCompareColumn = {
  name: string;
  sub: string;
  featured?: boolean;
};

export type PricingCompareRow = {
  feature: string;
  cells: string[];
};

export type PricingFaqItem = {
  q: string;
  a: string[];
};

export type PricingPage = {
  seo: { title: string; description: string };
  hero: { eyebrow: string; h1Html: string; subHtml: string };
  vatBanner: { title: string; body: string };
  tiers: PricingTier[];
  notes: PricingNote[];
  compare: {
    headlineHtml: string;
    sub: string;
    columns: PricingCompareColumn[];
    rows: PricingCompareRow[];
  };
  faq: {
    headlineHtml: string;
    items: PricingFaqItem[];
  };
  finalCta: {
    headlineHtml: string;
    sub: string;
    ctaLabel: string;
    ctaUrl?: string;
  };
};
