import { defs, type BuildingId, type CropId, type Stack } from './defs'
import { addItem, weightOf, withSlots } from './inventory'
import { createStorage, type Building, type Field, type FieldTile, type State, type Storage, type Tree } from './state'
import { seasonOn } from './time'

const here = { dx: 0, dy: 0 }
const east = { dx: 1, dy: 0 }
const west = { dx: -1, dy: 0 }
const north = { dx: 0, dy: -1 }
const south = { dx: 0, dy: 1 }
const southEast = { dx: 1, dy: 1 }

const buildingLead = 3

type Cell = {
  dx: number
  dy: number
  crop?: CropId
  day?: number
}

type Span = {
  x: number
  y: number
  w: number
  h: number
}

const scenes: Record<string, (state: State) => State> = {
  burden,
  'full-store': fullStore,
  hearth,
  plot,
  unripe,
  summer,
  autumn,
  winter,
  'next-spring': nextSpring,
  'next-summer': nextSummer,
  manure,
  river,
  hungry,
  thirsty,
  meal,
  sprint,
  spent,
  lodge,
}

export function applyScene(state: State, name: string | null): State {
  if (!name) return state
  const build = scenes[name]
  return build ? build(state) : state
}

function burden(state: State): State {
  return placeBuilding(carry(stand(state), [{ itemId: 'log', count: 5 }]), 'warehouse')
}

function fullStore(state: State): State {
  return placeBuilding(carry(stand(state), [{ itemId: 'log', count: 4 }]), 'warehouse', 16)
}

function hearth(state: State): State {
  return placeBuilding(carry(stand(state), [{ itemId: 'meat', count: 1 }]), 'campfire')
}

function plot(state: State): State {
  return withPlot(
    carry(atDay(state, 0), [
      { itemId: 'stone-hoe', count: 1 },
      { itemId: 'flax-seed', count: 2 },
      { itemId: 'rye-seed', count: 2 },
      { itemId: 'cabbage-seed', count: 2 },
      { itemId: 'oat-seed', count: 2 },
      { itemId: 'wheat-seed', count: 2 },
    ]),
    [],
  )
}

function unripe(state: State): State {
  return withPlot(carry(atDay(state, 6), [{ itemId: 'stone-sickle', count: 1 }]), [
    plant(here, 'flax', 0),
    plant(east, 'cabbage', 0),
    plant(west, 'oat', 0),
    plant(north, 'wheat', 0),
  ])
}

function summer(state: State): State {
  return withPlot(
    carry(atDay(state, 7), [
      { itemId: 'stone-sickle', count: 1 },
      { itemId: 'cabbage-seed', count: 2 },
      { itemId: 'flax-seed', count: 2 },
      { itemId: 'rye-seed', count: 2 },
    ]),
    [
      plant(here, 'flax', 0),
      plant(east, 'cabbage', 0),
      plant(west, 'oat', 0),
      plant(north, 'wheat', 0),
      southEast,
    ],
  )
}

function autumn(state: State): State {
  return withPlot(
    carry(atDay(state, 14), [
      { itemId: 'stone-sickle', count: 1 },
      { itemId: 'rye-seed', count: 2 },
      { itemId: 'wheat-seed', count: 2 },
      { itemId: 'flax-seed', count: 2 },
    ]),
    [
      plant(here, 'oat', 0),
      plant(east, 'wheat', 0),
      plant(west, 'cabbage', 7),
      plant(south, 'flax', 0),
      north,
      southEast,
    ],
  )
}

function winter(state: State): State {
  return withPlot(
    carry(atDay(state, 21), [
      { itemId: 'stone-sickle', count: 1 },
      { itemId: 'flax-seed', count: 1 },
      { itemId: 'rye-seed', count: 1 },
      { itemId: 'cabbage-seed', count: 1 },
      { itemId: 'oat-seed', count: 1 },
      { itemId: 'wheat-seed', count: 1 },
    ]),
    [plant(here, 'rye', 14), plant(east, 'wheat', 14), plant(west, 'oat', 0), south],
  )
}

function nextSpring(state: State): State {
  return withPlot(
    carry(atDay(state, 28), [
      { itemId: 'stone-sickle', count: 1 },
      { itemId: 'flax-seed', count: 1 },
      { itemId: 'rye-seed', count: 1 },
    ]),
    [plant(here, 'rye', 14), plant(east, 'wheat', 14), west],
  )
}

function manure(state: State): State {
  return withPlot(
    carry(atDay(state, 14), [
      { itemId: 'stone-sickle', count: 1 },
      { itemId: 'fertilizer', count: 5 },
    ]),
    [plant(here, 'oat', 0), plant(east, 'wheat', 0), plant(south, 'flax', 0), north],
  )
}

function river(state: State): State {
  return besideRiver(state)
}

function hungry(state: State): State {
  return withVitals(state, { hunger: 0 })
}

function thirsty(state: State): State {
  return besideRiver(withVitals(state, { thirst: 0 }))
}

function meal(state: State): State {
  const stood = stand(state)
  const foot = footOf(stood)
  return withVitals(
    carry(clearSpan(stood, { x: foot.x - 3, y: foot.y - 3, w: 7, h: 7 }), [
      { itemId: 'meat', count: 1 },
      { itemId: 'cooked-meat', count: 1 },
      { itemId: 'flax', count: 1 },
      { itemId: 'rye', count: 1 },
      { itemId: 'cabbage', count: 1 },
      { itemId: 'oat', count: 1 },
      { itemId: 'wheat', count: 1 },
      { itemId: 'stone-axe', count: 1 },
    ]),
    { hunger: 10 },
  )
}

function sprint(state: State): State {
  return { ...state, player: { ...state.player, x: state.bounds.minX } }
}

function spent(state: State): State {
  const stood = stand(withVitals(state, { stamina: 0 }))
  const foot = footOf(stood)
  const carried = carry(clearSpan(stood, { x: foot.x - 2, y: foot.y - 2, w: 5, h: 5 }), [
    { itemId: 'stone-axe', count: 1 },
    { itemId: 'stone-hammer', count: 1 },
  ])
  const tile = defs.map.tile
  const tree: Tree = {
    id: 'tree-spent',
    x: (foot.x + 1) * tile + tile / 2,
    y: foot.y * tile + tile / 2,
    hits: 0,
  }
  return { ...carried, trees: [...carried.trees, tree] }
}

function withVitals(
  state: State,
  patch: Partial<Pick<State['survival'], 'hunger' | 'thirst' | 'health' | 'stamina'>>,
): State {
  return {
    ...state,
    survival: {
      hunger: patch.hunger ?? state.survival.hunger,
      thirst: patch.thirst ?? state.survival.thirst,
      health: patch.health ?? state.survival.health,
      meter: 0,
      stamina: patch.stamina ?? state.survival.stamina,
      rest: 0,
    },
  }
}

function besideRiver(state: State): State {
  const river = state.rivers[0]
  if (!river) return state
  const x = river.x - defs.map.tile
  const y = river.y
  if (x === state.player.x && y === state.player.y) return state
  return { ...state, player: { ...state.player, x, y } }
}

function nextSummer(state: State): State {
  return withPlot(carry(atDay(state, 35), [{ itemId: 'stone-sickle', count: 1 }]), [
    plant(here, 'wheat', 14),
    plant(east, 'rye', 14),
  ])
}

function plant(at: { dx: number; dy: number }, crop: CropId, day: number): Cell {
  return { ...at, crop, day }
}

function atDay(state: State, day: number): State {
  return {
    ...state,
    time: {
      minutes: defs.time.startMinute,
      day,
      season: seasonOn(day),
    },
  }
}

function carry(state: State, stacks: readonly Stack[]): State {
  let slots = state.inventory.slots.map((slot) => (slot ? { ...slot } : null))
  for (const stack of stacks) {
    const next = addItem(slots, stack.itemId, stack.count)
    if (!next) return state
    slots = next
  }
  return withSlots(state, slots)
}

function stand(state: State): State {
  const tile = defs.map.tile
  const foot = footOf(state)
  const x = foot.x * tile + tile / 2
  const y = foot.y * tile + tile / 2
  if (x === state.player.x && y === state.player.y) return state
  return { ...state, player: { ...state.player, x, y } }
}

function lodge(state: State): State {
  return placeBuilding(atDay(stand(state), 0), 'house')
}

function placeBuilding(state: State, kind: BuildingId, logs = 0): State {
  const tile = defs.map.tile
  const foot = footOf(state)
  const tileX = foot.x
  const tileY = foot.y + buildingLead
  const x = tileX * tile + tile / 2
  const y = tileY * tile + tile / 2
  const building: Building =
    kind === 'warehouse'
      ? { id: 'warehouse-1', kind, x, y, storage: stocked(logs) }
      : { id: `${kind}-1`, kind, x, y }
  return clearSpan(
    { ...state, buildings: [...state.buildings, building] },
    { x: tileX, y: foot.y, w: 1, h: buildingLead + 1 },
  )
}

function stocked(count: number): Storage {
  const storage = createStorage()
  if (count <= 0) return storage
  const slots = addItem(storage.slots, 'log', count)
  if (!slots) return storage
  return { ...storage, slots, weight: weightOf(slots) }
}

function withPlot(state: State, cells: readonly Cell[]): State {
  const stood = stand(state)
  const foot = footOf(stood)
  const span = { x: foot.x - 1, y: foot.y - 1, w: 3, h: 3 }
  const field: Field = {
    id: 'field-1',
    ...span,
    tilled: cells.map((cell) => furrow(foot, cell)),
  }
  return clearSpan({ ...stood, fields: [...stood.fields, field] }, margin(span))
}

function furrow(foot: { x: number; y: number }, cell: Cell): FieldTile {
  const tile: FieldTile = { x: foot.x + cell.dx, y: foot.y + cell.dy }
  if (cell.crop === undefined) return tile
  return { ...tile, crop: cell.crop, day: cell.day }
}

function margin(span: Span): Span {
  return { x: span.x - 1, y: span.y - 1, w: span.w + 2, h: span.h + 2 }
}

function clearSpan(state: State, span: Span): State {
  const tile = defs.map.tile
  const hits = (x: number, y: number) => {
    const tx = Math.floor(x / tile)
    const ty = Math.floor(y / tile)
    return tx >= span.x && tx < span.x + span.w && ty >= span.y && ty < span.y + span.h
  }
  return {
    ...state,
    trees: state.trees.filter((item) => !hits(item.x, item.y)),
    rabbits: state.rabbits.filter((item) => !hits(item.x, item.y)),
    merchants: state.merchants.filter((item) => !hits(item.x, item.y)),
    rivers: state.rivers.filter((item) => !hits(item.x, item.y)),
  }
}

function footOf(state: State) {
  const tile = defs.map.tile
  return {
    x: Math.floor(state.player.x / tile),
    y: Math.floor(state.player.y / tile),
  }
}
