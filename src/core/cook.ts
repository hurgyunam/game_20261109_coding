import { defs } from './defs'
import { addItem, removeItem, withinLimit, withSlots } from './inventory'
import type { State } from './state'

export function cook(state: State, buildingId: string, input: string): State {
  const building = state.buildings.find((item) => item.id === buildingId)
  if (!building || (building.kind !== 'campfire' && building.kind !== 'oven')) return state
  const recipe = defs.cooking[building.kind].find((item) => item.input === input)
  if (!recipe) return state
  const removed = removeItem(state.inventory.slots, recipe.input, recipe.count)
  if (!removed) return state
  const added = addItem(removed, recipe.output, recipe.count)
  if (!added || !withinLimit(added, state.inventory.limit)) return state
  return withSlots(state, added)
}
