import { defs } from './defs'
import { addItem, handItem, withinLimit, withSlots } from './inventory'
import { grantXp } from './skills'
import type { State } from './state'

export function chop(state: State, treeId: string): State {
  if (handItem(state)?.itemId !== 'stone-axe') return state
  const tree = state.trees.find((item) => item.id === treeId)
  if (!tree) return state

  const hits = tree.hits + 1
  if (hits < defs.tree.hits) {
    return {
      ...state,
      trees: state.trees.map((item) => (item.id === treeId ? { ...item, hits } : item)),
    }
  }

  const slots = addItem(state.inventory.slots, 'log', 1)
  if (!slots || !withinLimit(slots, state.inventory.limit)) return state
  const stored = withSlots(state, slots)
  return grantXp(
    {
      ...stored,
      trees: state.trees.filter((item) => item.id !== treeId),
    },
    'gather',
    defs.skills.xp.chop,
  )
}
