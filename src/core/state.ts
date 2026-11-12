import { defs, skillIds, type BuildingId, type CropId, type ItemId, type SeasonId, type SkillId } from './defs'

export type Slot = {
  itemId: ItemId
  count: number
} | null

export type SkillState = {
  xp: number
  level: number
  unlocked: string[]
}

export type Tree = {
  id: string
  x: number
  y: number
  hits: number
}

export type Rabbit = {
  id: string
  x: number
  y: number
}

export type Merchant = {
  id: string
  x: number
  y: number
}

export type River = {
  id: string
  x: number
  y: number
}

export type Survival = {
  hunger: number
  thirst: number
  health: number
  meter: number
}

export type FieldTile = {
  x: number
  y: number
  crop?: CropId
  day?: number
  fertilized?: boolean
}

export type Field = {
  id: string
  x: number
  y: number
  w: number
  h: number
  tilled: FieldTile[]
}

export type Storage = {
  slots: Slot[]
  weight: number
  limit: number
}

type Placed = {
  id: string
  x: number
  y: number
}

export type Building =
  | (Placed & { kind: 'warehouse'; storage: Storage })
  | (Placed & { kind: 'campfire' })

export function createStorage(): Storage {
  const warehouse = defs.buildings.warehouse
  return {
    slots: [],
    weight: 0,
    limit: warehouse.limit,
  }
}

export type State = {
  player: {
    x: number
    y: number
    speed: number
  }
  bounds: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  }
  inventory: {
    slots: Slot[]
    hand: number
    weight: number
    limit: number
  }
  skills: Record<SkillId, SkillState>
  trees: Tree[]
  rabbits: Rabbit[]
  merchants: Merchant[]
  rivers: River[]
  buildings: Building[]
  survival: Survival
  fields: Field[]
  silver: number
  time: {
    minutes: number
    day: number
    season: SeasonId
  }
}

export function createState(
  map: { width: number; height: number },
  body: { width: number; height: number },
  trees: Tree[],
  rabbits: Rabbit[],
  merchants: Merchant[] = [],
  rivers: River[] = [],
): State {
  const minX = body.width / 2
  const minY = body.height / 2
  const maxX = map.width - body.width / 2
  const maxY = map.height - body.height / 2

  return {
    player: {
      x: map.width / 2,
      y: map.height / 2,
      speed: defs.player.speed,
    },
    bounds: { minX, minY, maxX, maxY },
    inventory: {
      slots: Array.from({ length: defs.inventory.hands }, () => null),
      hand: 1,
      weight: 0,
      limit: defs.inventory.limit,
    },
    skills: Object.fromEntries(skillIds.map((id) => [id, freshSkill()])) as Record<
      SkillId,
      SkillState
    >,
    trees: trees.map((tree) => ({ ...tree })),
    rabbits: rabbits.map((rabbit) => ({ ...rabbit })),
    merchants: merchants.map((merchant) => ({ ...merchant })),
    rivers: rivers.map((river) => ({ ...river })),
    buildings: [],
    survival: {
      hunger: defs.vitals.hunger,
      thirst: defs.vitals.thirst,
      health: defs.vitals.health,
      meter: 0,
    },
    fields: [],
    silver: defs.trade.silver,
    time: {
      minutes: defs.time.startMinute,
      day: 0,
      season: defs.calendar.start,
    },
  }
}

function freshSkill(): SkillState {
  return { xp: 0, level: 1, unlocked: [] }
}
