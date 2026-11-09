import { defs, skillIds, type ItemId, type SkillId } from './defs'

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
}

export function createState(
  map: { width: number; height: number },
  body: { width: number; height: number },
  trees: Tree[],
  rabbits: Rabbit[],
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
      slots: Array.from({ length: defs.inventory.slots }, () => null),
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
  }
}

function freshSkill(): SkillState {
  return { xp: 0, level: 1, unlocked: [] }
}
