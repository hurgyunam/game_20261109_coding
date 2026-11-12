export const itemIds = ['log', 'stone-axe', 'stone-hammer', 'stone-hoe', 'meat', 'fur', 'cooked-meat'] as const

export type ItemId = (typeof itemIds)[number]

export const skillIds = ['gather', 'farm', 'hunt', 'craft'] as const

export type SkillId = (typeof skillIds)[number]

export const recipeIds = ['stone-axe', 'stone-hammer', 'stone-hoe'] as const

export type RecipeId = (typeof recipeIds)[number]

export const buildingIds = ['warehouse', 'campfire'] as const

export type BuildingId = (typeof buildingIds)[number]

export const seasonIds = ['spring', 'summer', 'autumn', 'winter'] as const

export type SeasonId = (typeof seasonIds)[number]

export const cropIds = ['flax', 'rye', 'cabbage', 'oat', 'wheat'] as const

export type CropId = (typeof cropIds)[number]

export type CropSeason = {
  plant: SeasonId
  harvest: SeasonId
  yearOffset: 0 | 1
}

export type Stack = {
  itemId: ItemId
  count: number
}

export type SkillStep = {
  xp: number
  tech: string
}

export const defs = {
  player: {
    speed: 240,
  },
  inventory: {
    slots: 9,
    limit: 20,
    slowdown: 0.5,
  },
  tree: {
    hits: 3,
  },
  items: {
    log: { weight: 5 },
    'stone-axe': { weight: 4 },
    'stone-hammer': { weight: 4 },
    'stone-hoe': { weight: 4 },
    meat: { weight: 2 },
    fur: { weight: 1 },
    'cooked-meat': { weight: 2 },
  },
  drops: {
    rabbit: [
      { itemId: 'meat', count: 1 },
      { itemId: 'fur', count: 1 },
    ] as Stack[],
  },
  recipes: {
    'stone-axe': {
      ingredients: [] as Stack[],
      result: { itemId: 'stone-axe', count: 1 },
    },
    'stone-hammer': {
      ingredients: [] as Stack[],
      result: { itemId: 'stone-hammer', count: 1 },
    },
    'stone-hoe': {
      ingredients: [] as Stack[],
      result: { itemId: 'stone-hoe', count: 1 },
    },
  } satisfies Record<RecipeId, { ingredients: Stack[]; result: Stack }>,
  buildings: {
    warehouse: {
      slots: 18,
      limit: 80,
    },
  },
  map: {
    tile: 64,
  },
  field: {
    maxSide: 10,
  },
  cooking: {
    campfire: {
      input: 'meat',
      output: 'cooked-meat',
      count: 1,
    },
  } satisfies {
    campfire: { input: ItemId; output: ItemId; count: number }
  },
  time: {
    startMinute: 6 * 60,
    dayMinutes: 24 * 60,
    daySeconds: 4 * 60,
    testPace: 10,
  },
  calendar: {
    start: 'spring',
    seasonDays: 7,
    yearDays: 28,
    crops: {
      flax: [{ plant: 'spring', harvest: 'summer', yearOffset: 0 }],
      rye: [{ plant: 'autumn', harvest: 'spring', yearOffset: 1 }],
      cabbage: [
        { plant: 'spring', harvest: 'summer', yearOffset: 0 },
        { plant: 'summer', harvest: 'autumn', yearOffset: 0 },
      ],
      oat: [{ plant: 'spring', harvest: 'autumn', yearOffset: 0 }],
      wheat: [
        { plant: 'spring', harvest: 'autumn', yearOffset: 0 },
        { plant: 'autumn', harvest: 'summer', yearOffset: 1 },
      ],
    },
  } satisfies {
    start: SeasonId
    seasonDays: number
    yearDays: number
    crops: Record<CropId, CropSeason[]>
  },
  skills: {
    xp: {
      chop: 10,
      craft: 10,
      hunt: 10,
    },
    thresholds: {
      gather: [] as SkillStep[],
      farm: [] as SkillStep[],
      hunt: [] as SkillStep[],
      craft: [] as SkillStep[],
    } satisfies Record<SkillId, SkillStep[]>,
  },
}
