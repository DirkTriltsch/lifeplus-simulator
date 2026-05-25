export const contact = {
  name: 'Dirk Triltsch',
  addressLine1: 'c/o COCENTER',
  addressLine2: 'Koppoldstr. 1',
  addressLine3: '86551 Aichach',
  phone: '015678 334022',
  email: 'info@lifeflow360.app',
} as const;

export type Contact = typeof contact;
