import { defs, type ItemId } from './defs'
import type { Slot, State } from './state'

export function selectSlot(state: State, slot: number): State {
  if (!Number.isInteger(slot) || slot < 1 || slot > state.inventory.slots.length) return state
  if (state.inventory.hand === slot) return state
  return {
    ...state,
    inventory: { ...state.inventory, hand: slot },
  }
}

export function handItem(state: State): Slot {
  return state.inventory.slots[state.inventory.hand - 1] ?? null
}

export function addItem(slots: readonly Slot[], itemId: ItemId, count: number): Slot[] | null {
  if (count <= 0) return slots.slice()
  const next = slots.map((slot) => (slot ? { ...slot } : null))
  const stack = next.findIndex((slot) => slot?.itemId === itemId)
  if (stack >= 0) {
    const current = next[stack]
    if (!current) return null
    next[stack] = { itemId, count: current.count + count }
    return next
  }
  const empty = next.findIndex((slot) => slot === null)
  if (empty < 0) return null
  next[empty] = { itemId, count }
  return next
}

export function removeItem(slots: readonly Slot[], itemId: ItemId, count: number): Slot[] | null {
  if (count <= 0) return slots.slice()
  const next = slots.map((slot) => (slot ? { ...slot } : null))
  let left = count
  for (let index = 0; index < next.length; index += 1) {
    const slot = next[index]
    if (!slot || slot.itemId !== itemId) continue
    const taken = Math.min(slot.count, left)
    left -= taken
    next[index] = taken === slot.count ? null : { itemId, count: slot.count - taken }
    if (left === 0) return next
  }
  return null
}

export function weightOf(slots: readonly Slot[]): number {
  let weight = 0
  for (const slot of slots) {
    if (!slot) continue
    weight += defs.items[slot.itemId].weight * slot.count
  }
  return weight
}

export function withSlots(state: State, slots: Slot[]): State {
  return {
    ...state,
    inventory: {
      ...state.inventory,
      slots,
      weight: weightOf(slots),
    },
  }
}
