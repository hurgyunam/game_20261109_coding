import { defs, isSeedId, seasonIds, seedIds, type CropId, type CropSeason, type SeasonId, type SeedId } from './defs'
import { addItem, handItem, withSlots } from './inventory'
import { grantXp } from './skills'
import type { Field, FieldTile, Slot, State } from './state'
import { seasonOn } from './time'

type Span = Omit<Field, 'id' | 'tilled'>

export type CropStage = 'growing' | 'ripe' | 'rotten'

export function fieldSpan(x1: number, y1: number, x2: number, y2: number): Span | null {
  if (![x1, y1, x2, y2].every(Number.isInteger)) return null
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.abs(x2 - x1) + 1,
    h: Math.abs(y2 - y1) + 1,
  }
}

export function canPlaceField(state: State, x1: number, y1: number, x2: number, y2: number): boolean {
  const span = fieldSpan(x1, y1, x2, y2)
  if (!span) return false
  if (span.w > defs.field.maxSide || span.h > defs.field.maxSide) return false
  return !occupied(state, span)
}

export function placeField(state: State, x1: number, y1: number, x2: number, y2: number): State {
  if (handItem(state)?.itemId !== 'stone-hoe') return state
  const span = fieldSpan(x1, y1, x2, y2)
  if (!span || !canPlaceField(state, x1, y1, x2, y2)) return state
  const field: Field = { id: `field-${state.fields.length + 1}`, ...span, tilled: [] }
  return { ...state, fields: [...state.fields, field] }
}

export function fieldAt(state: State, tileX: number, tileY: number): Field | undefined {
  if (!Number.isInteger(tileX) || !Number.isInteger(tileY)) return undefined
  return state.fields.find((field) => contains(field, tileX, tileY))
}

export function canSow(state: State, tileX: number, tileY: number): boolean {
  const crop = cropInHand(state)
  if (!crop || !inPlantSeason(crop, state.time.season)) return false
  const field = fieldAt(state, tileX, tileY)
  if (!field) return false
  const tile = field.tilled.find((item) => item.x === tileX && item.y === tileY)
  return !!tile && !tile.crop
}

export function sow(state: State, tileX: number, tileY: number): State {
  const crop = cropInHand(state)
  if (!crop || !canSow(state, tileX, tileY)) return state
  const carried = consumeHand(state)
  const field = fieldAt(state, tileX, tileY)
  if (!carried || !field) return state
  const tilled = field.tilled.map((tile) =>
    tile.x === tileX && tile.y === tileY ? { ...tile, crop, day: state.time.day } : tile,
  )
  return grantXp(
    {
      ...carried,
      fields: carried.fields.map((item) => (item.id === field.id ? { ...item, tilled } : item)),
    },
    'farm',
    defs.skills.xp.sow,
  )
}

export function cropStage(state: State, tileX: number, tileY: number): CropStage | null {
  const tile = plantedAt(state, tileX, tileY)
  if (!tile) return null
  const rule = plantRule(tile.crop, tile.day)
  if (!rule) return null
  const span = harvestWindow(tile.day, rule)
  if (state.time.day < span.start) return 'growing'
  if (state.time.day < span.end) return 'ripe'
  return 'rotten'
}

export function canHarvest(state: State, tileX: number, tileY: number): boolean {
  if (handItem(state)?.itemId !== 'stone-sickle') return false
  const stage = cropStage(state, tileX, tileY)
  return stage === 'ripe' || stage === 'rotten'
}

export function harvest(state: State, tileX: number, tileY: number): State {
  if (!canHarvest(state, tileX, tileY)) return state
  const tile = plantedAt(state, tileX, tileY)
  const field = fieldAt(state, tileX, tileY)
  if (!tile || !field) return state
  const stage = cropStage(state, tileX, tileY)
  if (stage !== 'ripe' && stage !== 'rotten') return state
  const slots = stage === 'rotten' ? takeRotten(state.inventory.slots) : takeRipe(state.inventory.slots, tile.crop)
  if (!slots) return state
  const tilled = field.tilled.filter((item) => item.x !== tileX || item.y !== tileY)
  const carried = withSlots(state, slots)
  return grantXp(
    {
      ...carried,
      fields: carried.fields.map((item) => (item.id === field.id ? { ...item, tilled } : item)),
    },
    'farm',
    defs.skills.xp.harvest,
  )
}

export function till(state: State, tileX: number, tileY: number): State {
  if (handItem(state)?.itemId !== 'stone-hoe') return state
  const field = fieldAt(state, tileX, tileY)
  if (!field || field.tilled.some((tile) => tile.x === tileX && tile.y === tileY)) return state
  const tilled = { ...field, tilled: [...field.tilled, { x: tileX, y: tileY }] }
  return grantXp(
    {
      ...state,
      fields: state.fields.map((item) => (item.id === field.id ? tilled : item)),
    },
    'farm',
    defs.skills.xp.till,
  )
}

function plantedAt(state: State, tileX: number, tileY: number): (FieldTile & { crop: CropId; day: number }) | null {
  const field = fieldAt(state, tileX, tileY)
  const tile = field?.tilled.find((item) => item.x === tileX && item.y === tileY)
  if (!tile?.crop || tile.day === undefined) return null
  return { ...tile, crop: tile.crop, day: tile.day }
}

function plantRule(crop: CropId, day: number): CropSeason | undefined {
  const season = seasonOn(day)
  return defs.calendar.crops[crop].find((span) => span.plant === season)
}

function harvestWindow(plantedDay: number, rule: CropSeason) {
  const year = Math.floor(plantedDay / defs.calendar.yearDays) + rule.yearOffset
  const start = seasonStart(year, rule.harvest)
  return { start, end: start + defs.calendar.seasonDays }
}

function seasonStart(year: number, season: SeasonId) {
  const origin = seasonIds.indexOf(defs.calendar.start)
  const index = seasonIds.indexOf(season)
  const passed = (index - origin + seasonIds.length) % seasonIds.length
  return year * defs.calendar.yearDays + passed * defs.calendar.seasonDays
}

function seedOf(crop: CropId): SeedId | null {
  return seedIds.find((id) => defs.calendar.seeds[id] === crop) ?? null
}

function takeRipe(slots: readonly Slot[], crop: CropId): Slot[] | null {
  const seed = seedOf(crop)
  if (!seed) return null
  const withCrop = addItem(slots, crop, defs.field.harvest.crop)
  if (!withCrop) return null
  return addItem(withCrop, seed, defs.field.harvest.seed)
}

function takeRotten(slots: readonly Slot[]): Slot[] | null {
  return addItem(slots, 'fertilizer', defs.field.harvest.fertilizer)
}

function cropInHand(state: State): CropId | null {
  const itemId = handItem(state)?.itemId
  if (!itemId || !isSeedId(itemId)) return null
  return defs.calendar.seeds[itemId]
}

function inPlantSeason(crop: CropId, season: SeasonId) {
  return defs.calendar.crops[crop].some((span) => span.plant === season)
}

function consumeHand(state: State): State | null {
  const index = state.inventory.hand - 1
  const slot = state.inventory.slots[index]
  if (!slot || slot.count < 1) return null
  const slots = state.inventory.slots.map((item) => (item ? { ...item } : null))
  const count = slot.count - 1
  slots[index] = count === 0 ? null : { itemId: slot.itemId, count }
  return withSlots(state, slots)
}

function occupied(state: State, span: Span): boolean {
  const spots = [...state.trees, ...state.rabbits, ...state.buildings, ...state.merchants]
  if (spots.some((spot) => covers(span, spot.x, spot.y))) return true
  return state.fields.some((field) => overlaps(field, span))
}

function contains(field: Span, tileX: number, tileY: number) {
  return tileX >= field.x && tileX < field.x + field.w && tileY >= field.y && tileY < field.y + field.h
}

function covers(span: Span, x: number, y: number) {
  const tile = defs.map.tile
  const tx = Math.floor(x / tile)
  const ty = Math.floor(y / tile)
  return tx >= span.x && tx < span.x + span.w && ty >= span.y && ty < span.y + span.h
}

function overlaps(a: Span, b: Span) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}
