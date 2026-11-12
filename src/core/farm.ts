import { defs } from './defs'
import { handItem } from './inventory'
import type { Field, State } from './state'

type Span = Omit<Field, 'id'>

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
  const field: Field = { id: `field-${state.fields.length + 1}`, ...span }
  return { ...state, fields: [...state.fields, field] }
}

function occupied(state: State, span: Span): boolean {
  const spots = [...state.trees, ...state.rabbits, ...state.buildings, ...state.merchants]
  if (spots.some((spot) => covers(span, spot.x, spot.y))) return true
  return state.fields.some((field) => overlaps(field, span))
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
