import { defs } from './defs'
import { addItem, handItem, withSlots } from './inventory'
import { grantXp } from './skills'
import type { State } from './state'

export function hunt(state: State, rabbitId: string): State {
  if (handItem(state)?.itemId !== 'stone-axe') return state
  if (!state.rabbits.some((rabbit) => rabbit.id === rabbitId)) return state

  let slots = state.inventory.slots
  for (const drop of defs.drops.rabbit) {
    const next = addItem(slots, drop.itemId, drop.count)
    if (!next) return state
    slots = next
  }

  return grantXp(
    {
      ...withSlots(state, slots),
      rabbits: state.rabbits.filter((rabbit) => rabbit.id !== rabbitId),
    },
    'hunt',
    defs.skills.xp.hunt,
  )
}
