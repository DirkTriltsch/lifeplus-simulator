/**
 * Anbieter-/Kontaktdaten fuer Impressum, Datenschutz, Widerruf, AGB.
 *
 * Pflichtangaben nach §5 DDG bei kommerzieller Webseite:
 * - name, address, contact (immer noetig)
 * - vatId: erforderlich bei USt-pflichtigem Unternehmer (sobald
 *   Reverse-Charge im Checkout angeboten wird, ist eine eigene USt-IdNr
 *   faktisch noetig). Wenn Kleinunternehmer (§19 UStG), stattdessen
 *   `smallBusinessNote` setzen.
 * - registerCourt + registerNumber: nur wenn im Handels-/Vereins-Register
 *   eingetragen. Einzelunternehmer ohne Eintrag lassen leer.
 * - responsibleForContent: §18 Abs. 2 MStV (i.d.R. derselbe wie name).
 * - smallBusinessNote: wenn Kleinunternehmer, hier Standard-Hinweis.
 *
 * Felder mit `undefined` werden im Impressum-Template ausgeblendet.
 */
export const contact = {
  name: 'Dirk Triltsch',
  addressLine1: 'c/o COCENTER',
  addressLine2: 'Koppoldstr. 1',
  addressLine3: '86551 Aichach',
  phone: '015678 334022',
  email: 'info@lifeflow360.app',

  // === Optionale Pflichtangaben — bitte aktuellen Stand eintragen ===
  /** USt-IdNr nach §27a UStG, Format DE + 9 Ziffern. */
  vatId: undefined as string | undefined,
  /** Handelsregister-/Vereinsregister-Gericht, falls eingetragen. */
  registerCourt: undefined as string | undefined,
  /** HRB-/HRA-/VR-Nummer, falls eingetragen. */
  registerNumber: undefined as string | undefined,
  /** Verantwortlich i.S.v. §18 Abs. 2 MStV (typ. dieselbe Person). */
  responsibleForContent: 'Dirk Triltsch' as string | undefined,
  /** Hinweis fuer Kleinunternehmer nach §19 UStG (wenn vatId leer). */
  smallBusinessNote: undefined as string | undefined,
} as const;

export type Contact = typeof contact;
