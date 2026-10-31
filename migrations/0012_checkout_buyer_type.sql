-- Verbraucher/Unternehmer-Checkout (Uebernahme des TraderScope-Flows).
--
-- Bisher war der Pro-Checkout B2B-only (company_name + b2b_confirmation
-- Pflicht). Neu kann ein Kaeufer als Verbraucher ('consumer') oder als
-- Unternehmer ('business') kaufen:
--   - consumer: Name statt Firma (billing_name), keine B2B-Bestaetigung,
--               optionaler Widerrufsverzicht (consent_log.accepted_withdrawal_waiver)
--   - business: wie bisher (company_name, USt-IdNr optional, B2B-Bestaetigung)
--
-- Rein additiv und nullable. Bestehende Rows (buyer_type NULL) gelten als
-- 'business' (so wurden sie angelegt).

ALTER TABLE checkout_intents ADD COLUMN buyer_type TEXT;
ALTER TABLE checkout_intents ADD COLUMN billing_name TEXT;

ALTER TABLE consent_log ADD COLUMN buyer_type TEXT;
