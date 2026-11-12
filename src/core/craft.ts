import { defs, recipeIds, type RecipeId } from './defs'
import { addItem, removeItem, withinLimit, withSlots } from './inventory'
import { grantXp } from './skills'
import type { State } from './state'

export function craft(state: State, recipeId: string): State {
  if (!isRecipe(recipeId)) return state
  const recipe = defs.recipes[recipeId]
  let slots = state.inventory.slots
  for (const ingredient of recipe.ingredients) {
    const next = removeItem(slots, ingredient.itemId, ingredient.count)
    if (!next) return state
    slots = next
  }
  const added = addItem(slots, recipe.result.itemId, recipe.result.count)
  if (!added || !withinLimit(added, state.inventory.limit)) return state
  return grantXp(withSlots(state, added), 'craft', defs.skills.xp.craft)
}

function isRecipe(recipeId: string): recipeId is RecipeId {
  return (recipeIds as readonly string[]).includes(recipeId)
}
