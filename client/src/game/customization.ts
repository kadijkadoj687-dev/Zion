export const CUSTOMIZATION_OPTIONS = {
  weapon: {
    lightblade: { label: 'Lightblade', color: 0x8fffd0, damage: 2, range: 108, cooldown: 300 },
    sunstaff: { label: 'Sun staff', color: 0xffe69a, damage: 2, range: 150, cooldown: 430 },
    twinblades: { label: 'Twin blades', color: 0xc3a7ff, damage: 1, range: 88, cooldown: 190 },
  },
  outfit: {
    wayfarer: { label: 'Wayfarer', color: 0x8fffd0 },
    starguard: { label: 'Starguard', color: 0x83aaff },
    sunweave: { label: 'Sunweave', color: 0xffc879 },
    moonpetal: { label: 'Moonpetal', color: 0xe7a6ff },
  },
  hairstyle: {
    breeze: { label: 'Breeze', color: 0x38264a },
    starlight: { label: 'Starlight', color: 0xffd66e },
    midnight: { label: 'Midnight', color: 0x273b71 },
    rose: { label: 'Rose', color: 0xff91ad },
  },
  accessory: {
    none: { label: 'None', color: 0xffffff },
    halo: { label: 'Light halo', color: 0xffe69a },
    leaf: { label: 'Forest leaf', color: 0x8fffd0 },
    star: { label: 'Star pin', color: 0xc3a7ff },
  },
} as const;

export type Customization = {
  [K in keyof typeof CUSTOMIZATION_OPTIONS]: keyof (typeof CUSTOMIZATION_OPTIONS)[K];
};

export const DEFAULT_CUSTOMIZATION: Customization = {
  weapon: 'lightblade',
  outfit: 'wayfarer',
  hairstyle: 'breeze',
  accessory: 'halo',
};

export function sanitizeCustomization(value: unknown): Customization {
  if (typeof value !== 'object' || value === null) return { ...DEFAULT_CUSTOMIZATION };
  const candidate = value as Record<string, unknown>;
  return {
    weapon: isOption('weapon', candidate.weapon) ? candidate.weapon : DEFAULT_CUSTOMIZATION.weapon,
    outfit: isOption('outfit', candidate.outfit) ? candidate.outfit : DEFAULT_CUSTOMIZATION.outfit,
    hairstyle: isOption('hairstyle', candidate.hairstyle) ? candidate.hairstyle : DEFAULT_CUSTOMIZATION.hairstyle,
    accessory: isOption('accessory', candidate.accessory) ? candidate.accessory : DEFAULT_CUSTOMIZATION.accessory,
  };
}

function isOption<K extends keyof typeof CUSTOMIZATION_OPTIONS>(
  category: K,
  value: unknown,
): value is keyof (typeof CUSTOMIZATION_OPTIONS)[K] {
  return typeof value === 'string' && value in CUSTOMIZATION_OPTIONS[category];
}
