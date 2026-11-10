import { defs } from './defs'
import { addItem, removeItem, withSlots } from './inventory'
import type { State } from './state'

export function cook(state: State, campfireId: string): State {
  const campfire = state.buildings.find(
    (building) => building.id === campfireId && building.kind === 'campfire',
  )
  if (!campfire) return state

  const recipe = defs.cooking.campfire
  const removed = removeItem(state.inventory.slots, recipe.input, recipe.count)
  if (!removed) return state
  const added = addItem(removed, recipe.output, recipe.count)
  if (!added) return state
  return withSlots(state, added)
}
