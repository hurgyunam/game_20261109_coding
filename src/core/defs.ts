export const itemIds = ['log', 'stone-axe', 'stone-hammer', 'meat', 'fur', 'cooked-meat'] as const

export type ItemId = (typeof itemIds)[number]

export const skillIds = ['gather', 'farm', 'hunt', 'craft'] as const

export type SkillId = (typeof skillIds)[number]

export const recipeIds = ['stone-axe', 'stone-hammer'] as const

export type RecipeId = (typeof recipeIds)[number]

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
  },
  tree: {
    hits: 3,
  },
  items: {
    log: { weight: 5 },
    'stone-axe': { weight: 4 },
    'stone-hammer': { weight: 4 },
    meat: { weight: 2 },
    fur: { weight: 1 },
    'cooked-meat': { weight: 2 },
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
  } satisfies Record<RecipeId, { ingredients: Stack[]; result: Stack }>,
  skills: {
    xp: {
      chop: 10,
      craft: 10,
    },
    thresholds: {
      gather: [] as SkillStep[],
      farm: [] as SkillStep[],
      hunt: [] as SkillStep[],
      craft: [] as SkillStep[],
    } satisfies Record<SkillId, SkillStep[]>,
  },
}
