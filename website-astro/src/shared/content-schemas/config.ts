import { z } from 'zod';

export const BRAND_IDS = ['lifeplus', 'fitline', 'eqology'] as const;
export type BrandId = (typeof BRAND_IDS)[number];

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Hex-Farbe wie #1D9E75 erwartet');

const lockupSchema = z.object({
  initial: z.string().length(1),
  wordNeutral: z.string(),
  wordAccent: z.string(),
  markFill: hexColor,
  darkBg: hexColor,
  accentOnDark: hexColor,
  waveColor: hexColor,
  taglineDe: z.string(),
});

const paddleSchema = z.object({
  env: z.enum(['sandbox', 'live']),
  clientToken: z.string(),
  priceIdMonthly: z.string(),
  priceIdHalfYear: z.string().optional(),
  priceIdYearly: z.string(),
});

export const brandSchema = z.object({
  id: z.enum(BRAND_IDS),
  siteName: z.string(),
  siteDomain: z.string(),
  appUrl: z.string().url(),
  apiBaseUrl: z.string().url().optional(),
  productName: z.string(),
  accentColor: hexColor,
  accentColorDark: hexColor,
  ctaColor: hexColor,
  ctaColorDark: hexColor,
  paddle: paddleSchema,
  lockup: lockupSchema,
});
export type Brand = z.infer<typeof brandSchema>;

export const heroSchema = z.object({
  eyebrow: z.string(),
  claim: z.string().min(5).max(160),
  subClaim: z.string(),
  ctaLabel: z.string(),
  ctaUrl: z.string().optional(),
});
export type Hero = z.infer<typeof heroSchema>;

export const trustStripSchema = z.object({
  headline: z.string().optional(),
  items: z.array(z.string()).min(1),
});
export type TrustStrip = z.infer<typeof trustStripSchema>;

export const coreMessageSchema = z.object({
  headline: z.string(),
  body: z.string(),
});
export type CoreMessage = z.infer<typeof coreMessageSchema>;

export const featureTeaserSchema = z.object({
  headline: z.string(),
  items: z
    .array(
      z.object({
        title: z.string(),
        body: z.string(),
      }),
    )
    .min(1),
});
export type FeatureTeaser = z.infer<typeof featureTeaserSchema>;

export const pricingTeaserSchema = z.object({
  headline: z.string(),
  body: z.string(),
  ctaLabel: z.string(),
  ctaUrl: z.string().optional(),
});
export type PricingTeaser = z.infer<typeof pricingTeaserSchema>;

export const faqSchema = z.object({
  headline: z.string(),
  items: z
    .array(
      z.object({
        q: z.string(),
        a: z.string(),
      }),
    )
    .min(1),
});
export type FAQ = z.infer<typeof faqSchema>;

export const finalCtaSchema = z.object({
  headline: z.string(),
  body: z.string(),
  ctaLabel: z.string(),
  ctaUrl: z.string().optional(),
});
export type FinalCTA = z.infer<typeof finalCtaSchema>;

export const homeSchema = z.object({
  hero: heroSchema,
  trustStrip: trustStripSchema,
  coreMessage: coreMessageSchema,
  featureTeaser: featureTeaserSchema,
  pricingTeaser: pricingTeaserSchema,
  faq: faqSchema,
  finalCta: finalCtaSchema,
});
export type Home = z.infer<typeof homeSchema>;

const pricingFeatureSchema = z.object({
  strong: z.string().optional(),
  text: z.string(),
});

const pricingTierSchema = z.object({
  id: z.string(),
  featured: z.boolean().optional(),
  badge: z.string().optional(),
  name: z.string(),
  descHtml: z.string(),
  currency: z.string(),
  value: z.string(),
  unit: z.string(),
  unitNote: z.string().optional(),
  billed: z.string(),
  features: z.array(pricingFeatureSchema).min(1),
  cta: z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('link'),
      label: z.string(),
      url: z.string(),
    }),
    z.object({
      kind: z.literal('paddle'),
      label: z.string(),
      plan: z.string(),
      priceIdKey: z.enum(['monthly', 'halfyear', 'yearly']),
    }),
  ]),
});

const pricingNoteSchema = z.object({
  icon: z.enum(['info', 'doc']),
  title: z.string(),
  body: z.string(),
});

const pricingCompareColumnSchema = z.object({
  name: z.string(),
  sub: z.string(),
  featured: z.boolean().optional(),
});

const pricingCompareCellSchema = z.union([
  z.literal('check'),
  z.literal('-'),
  z.string(),
]);

const pricingCompareRowSchema = z.object({
  feature: z.string(),
  cells: z.array(pricingCompareCellSchema).length(4),
});

export const pricingPageSchema = z.object({
  seo: z.object({
    title: z.string(),
    description: z.string(),
  }),
  hero: z.object({
    eyebrow: z.string(),
    h1Html: z.string(),
    subHtml: z.string(),
  }),
  vatBanner: z.object({
    title: z.string(),
    body: z.string(),
  }),
  tiers: z.array(pricingTierSchema).length(4),
  notes: z.array(pricingNoteSchema),
  compare: z.object({
    headlineHtml: z.string(),
    sub: z.string(),
    columns: z.array(pricingCompareColumnSchema).length(4),
    rows: z.array(pricingCompareRowSchema).min(1),
  }),
  faq: z.object({
    headlineHtml: z.string(),
    items: z
      .array(
        z.object({
          q: z.string(),
          a: z.array(z.string()).min(1),
        }),
      )
      .min(1),
  }),
  finalCta: z.object({
    headlineHtml: z.string(),
    sub: z.string(),
    ctaLabel: z.string(),
    ctaUrl: z.string().optional(),
  }),
});
export type PricingPage = z.infer<typeof pricingPageSchema>;

export const pageSchemas = {
  home: homeSchema,
  pricing: pricingPageSchema,
} as const;
export type PageId = keyof typeof pageSchemas;
