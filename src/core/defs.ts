export const itemIds = [
  'log',
  'stone-axe',
  'stone-hammer',
  'stone-hoe',
  'meat',
  'fur',
  'cooked-meat',
  'flax-seed',
  'rye-seed',
  'cabbage-seed',
  'oat-seed',
  'wheat-seed',
  'stone-sickle',
  'flax',
  'rye',
  'cabbage',
  'oat',
  'wheat',
  'oat-porridge',
  'bread',
  'rye-bread',
  'fertilizer',
] as const

export type ItemId = (typeof itemIds)[number]

export const seedIds = ['flax-seed', 'rye-seed', 'cabbage-seed', 'oat-seed', 'wheat-seed'] as const

export type SeedId = (typeof seedIds)[number]

export function isSeedId(itemId: string): itemId is SeedId {
  return (seedIds as readonly string[]).includes(itemId)
}

export const skillIds = ['gather', 'farm', 'hunt', 'craft'] as const

export type SkillId = (typeof skillIds)[number]

export const recipeIds = ['stone-axe', 'stone-hammer', 'stone-hoe', 'stone-sickle'] as const

export type RecipeId = (typeof recipeIds)[number]

export const buildingIds = ['warehouse', 'campfire', 'house', 'oven'] as const

export type BuildingId = (typeof buildingIds)[number]

export const seasonIds = ['spring', 'summer', 'autumn', 'winter'] as const

export type SeasonId = (typeof seasonIds)[number]

export const cropIds = ['flax', 'rye', 'cabbage', 'oat', 'wheat'] as const

export type CropId = (typeof cropIds)[number]

export const foodIds = [
  'meat',
  'cooked-meat',
  'flax',
  'rye',
  'cabbage',
  'oat',
  'wheat',
  'oat-porridge',
  'bread',
  'rye-bread',
] as const

export type FoodId = (typeof foodIds)[number]

export function isFoodId(itemId: string): itemId is FoodId {
  return (foodIds as readonly string[]).includes(itemId)
}

export const tradeItemIds = [
  'stone-axe',
  'stone-hammer',
  'stone-hoe',
  'stone-sickle',
  'flax-seed',
  'rye-seed',
  'cabbage-seed',
  'oat-seed',
  'wheat-seed',
  'flax',
  'rye',
  'cabbage',
  'oat',
  'wheat',
] as const

export type TradeItemId = (typeof tradeItemIds)[number]

export type CropSeason = {
  plant: SeasonId
  harvest: SeasonId
  yearOffset: 0 | 1
}

export type Stack = {
  itemId: ItemId
  count: number
}

export type CookingRecipe = {
  input: ItemId
  output: ItemId
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
    hands: 9,
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
    'flax-seed': { weight: 1 },
    'rye-seed': { weight: 1 },
    'cabbage-seed': { weight: 1 },
    'oat-seed': { weight: 1 },
    'wheat-seed': { weight: 1 },
    'stone-sickle': { weight: 4 },
    flax: { weight: 1 },
    rye: { weight: 1 },
    cabbage: { weight: 1 },
    oat: { weight: 1 },
    wheat: { weight: 1 },
    'oat-porridge': { weight: 1 },
    bread: { weight: 1 },
    'rye-bread': { weight: 1 },
    fertilizer: { weight: 1 },
  } satisfies Record<ItemId, { weight: number }>,
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
    'stone-sickle': {
      ingredients: [] as Stack[],
      result: { itemId: 'stone-sickle', count: 1 },
    },
  } satisfies Record<RecipeId, { ingredients: Stack[]; result: Stack }>,
  buildings: {
    warehouse: {
      limit: 80,
    },
  },
  map: {
    tile: 64,
  },
  field: {
    maxSide: 10,
    harvest: {
      crop: 2,
      seed: 3,
      fertilizer: 2,
      fertilizedCrop: 3,
    },
  },
  trade: {
    silver: 50,
    prices: {
      'stone-axe': 20,
      'stone-hammer': 24,
      'stone-hoe': 30,
      'stone-sickle': 28,
      'flax-seed': 8,
      'rye-seed': 10,
      'cabbage-seed': 8,
      'oat-seed': 10,
      'wheat-seed': 12,
      flax: 12,
      rye: 16,
      cabbage: 12,
      oat: 16,
      wheat: 20,
    },
  } satisfies {
    silver: number
    prices: Record<TradeItemId, number>
  },
  cooking: {
    campfire: [
      { input: 'meat', output: 'cooked-meat', count: 1 },
      { input: 'oat', output: 'oat-porridge', count: 1 },
    ],
    oven: [
      { input: 'wheat', output: 'bread', count: 1 },
      { input: 'rye', output: 'rye-bread', count: 1 },
    ],
  } satisfies {
    campfire: CookingRecipe[]
    oven: CookingRecipe[]
  },
  time: {
    startMinute: 6 * 60,
    bedtime: 19 * 60,
    dayMinutes: 24 * 60,
    daySeconds: 4 * 60,
    testPace: 1,
  },
  vitals: {
    max: 100,
    hunger: 100,
    thirst: 100,
    health: 100,
    span: 48,
    idle: 1,
    move: 2,
    sprint: 4,
    hurt: 1,
    drink: 100,
  },
  stamina: {
    max: 100,
    start: 100,
    pace: 1.5,
    drain: 1,
    recover: 1,
    span: 6,
    chop: 10,
    place: 20,
  },
  food: {
    meat: 15,
    'cooked-meat': 40,
    flax: 5,
    rye: 5,
    cabbage: 5,
    oat: 5,
    wheat: 5,
    'oat-porridge': 20,
    bread: 25,
    'rye-bread': 20,
  } satisfies Record<FoodId, number>,
  calendar: {
    start: 'spring',
    seasonDays: 7,
    yearDays: 28,
    seeds: {
      'flax-seed': 'flax',
      'rye-seed': 'rye',
      'cabbage-seed': 'cabbage',
      'oat-seed': 'oat',
      'wheat-seed': 'wheat',
    },
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
    seeds: Record<SeedId, CropId>
    crops: Record<CropId, CropSeason[]>
  },
  skills: {
    xp: {
      chop: 10,
      craft: 10,
      hunt: 10,
      till: 10,
      sow: 10,
      harvest: 10,
    },
    thresholds: {
      gather: [] as SkillStep[],
      farm: [] as SkillStep[],
      hunt: [] as SkillStep[],
      craft: [] as SkillStep[],
    } satisfies Record<SkillId, SkillStep[]>,
  },
}
