import { defs, itemIds, type ItemId } from './defs'
import type { Building, Slot, State } from './state'

const transferWays = ['store', 'take'] as const

export type TransferWay = (typeof transferWays)[number]

export function selectSlot(state: State, slot: number): State {
  if (!Number.isInteger(slot) || slot < 1 || slot > defs.inventory.hands) return state
  if (slot > state.inventory.slots.length) return state
  if (state.inventory.hand === slot) return state
  return {
    ...state,
    inventory: { ...state.inventory, hand: slot },
  }
}

export function assignHand(state: State, slot: number, hand: number): State {
  if (!Number.isInteger(slot) || !Number.isInteger(hand)) return state
  if (hand < 1 || hand > defs.inventory.hands) return state
  const length = state.inventory.slots.length
  if (slot < 1 || slot > length || hand > length || slot === hand) return state
  const slots = state.inventory.slots.map((item) => (item ? { ...item } : null))
  const from = slot - 1
  const to = hand - 1
  const moving = slots[from]
  const staying = slots[to]
  if (moving === staying) return state
  slots[from] = staying ?? null
  slots[to] = moving ?? null
  return withSlots(state, slots)
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
  if (empty >= 0) {
    next[empty] = { itemId, count }
    return next
  }
  next.push({ itemId, count })
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

export function withinLimit(slots: readonly Slot[], limit: number): boolean {
  return weightOf(slots) <= limit
}

export function transfer(
  state: State,
  warehouseId: string,
  itemId: string,
  count: number,
  way: string,
): State {
  if (!isItem(itemId) || !isWay(way) || !Number.isInteger(count) || count <= 0) return state
  const warehouse = state.buildings.find(
    (building): building is Extract<Building, { kind: 'warehouse' }> =>
      building.id === warehouseId && building.kind === 'warehouse',
  )
  if (!warehouse) return state

  const intoStorage = way === 'store'
  const source = intoStorage ? state.inventory.slots : warehouse.storage.slots
  const destination = intoStorage ? warehouse.storage.slots : state.inventory.slots
  const removed = removeItem(source, itemId, count)
  if (!removed) return state
  const added = addItem(destination, itemId, count)
  if (!added) return state

  const playerSlots = intoStorage ? removed : added
  const storageSlots = intoStorage ? added : removed
  const storageWeight = weightOf(storageSlots)
  const carried = withSlots(state, playerSlots)
  const destinationWeight = intoStorage ? storageWeight : carried.inventory.weight
  const destinationLimit = intoStorage ? warehouse.storage.limit : carried.inventory.limit
  if (destinationWeight > destinationLimit) return state

  return {
    ...carried,
    buildings: carried.buildings.map((building) =>
      building.kind === 'warehouse' && building.id === warehouseId
        ? { ...building, storage: { ...building.storage, slots: storageSlots, weight: storageWeight } }
        : building,
    ),
  }
}

function isItem(itemId: string): itemId is ItemId {
  return (itemIds as readonly string[]).includes(itemId)
}

function isWay(way: string): way is TransferWay {
  return (transferWays as readonly string[]).includes(way)
}
