export interface WorldDefinition {
  id: number;
  name: string;
  subtitle: string;
  guardian: string;
  background: number;
  accent: number;
}

// Five encounters per world, followed by its guardian fight (stage 6).
export const WORLDS: WorldDefinition[] = [
  { id: 0, name: 'Glowing Forest', subtitle: 'Where the first light sleeps', guardian: 'Root Guardian', background: 0x102b32, accent: 0x8fffd0 },
  { id: 1, name: 'Crystal City', subtitle: 'A thousand reflections', guardian: 'Mirror Queen', background: 0x211c42, accent: 0xc3a7ff },
  { id: 2, name: 'Floating Seas', subtitle: 'Tides above the clouds', guardian: 'Storm Whale', background: 0x102940, accent: 0x7ce5ff },
  { id: 3, name: 'Cold Volcanoes', subtitle: 'Fire beneath the frost', guardian: 'Frost Giant', background: 0x312332, accent: 0xffb69b },
  { id: 4, name: 'Broken Sky', subtitle: 'The last horizon', guardian: 'Zion Shadow', background: 0x211629, accent: 0xffe69a },
];

export const REGULAR_STAGES_PER_WORLD = 5;
export const STAGES_PER_WORLD = REGULAR_STAGES_PER_WORLD + 1;
