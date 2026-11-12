import { defs } from './defs'
import { handItem } from './inventory'
import { grantXp } from './skills'
import type { Field, State } from './state'

type Span = Omit<Field, 'id' | 'tilled'>

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
