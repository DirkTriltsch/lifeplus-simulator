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
