import { defs, isFoodId } from './defs'
import { withSlots } from './inventory'
import type { State, Survival } from './state'

export function eat(state: State): State {
  if (state.survival.health <= 0) return state
  const index = state.inventory.hand - 1
  const slot = state.inventory.slots[index]
  if (!slot || !isFoodId(slot.itemId)) return state
  const slots = state.inventory.slots.map((item) => (item ? { ...item } : null))
  slots[index] = slot.count <= 1 ? null : { itemId: slot.itemId, count: slot.count - 1 }
  const hunger = Math.min(defs.vitals.max, state.survival.hunger + defs.food[slot.itemId])
  return withSlots({ ...state, survival: { ...state.survival, hunger } }, slots)
}

export function drink(state: State, riverId: string): State {
  if (state.survival.health <= 0) return state
  if (!state.rivers.some((river) => river.id === riverId)) return state
  const thirst = defs.vitals.drink
  if (state.survival.thirst === thirst) return state
  return { ...state, survival: { ...state.survival, thirst } }
}

export function spendStamina(state: State, cost: number): State | null {
  if (state.survival.stamina < cost) return null
  return {
    ...state,
    survival: { ...state.survival, stamina: state.survival.stamina - cost },
  }
}

export function endure(state: State, minutes: number, moving: boolean): State {
  if (minutes <= 0 || state.survival.health <= 0) return state
  let survival = state.survival
  for (let i = 0; i < minutes; i += 1) {
    const sprinting = moving && state.player.sprinting && survival.stamina > 0
    const step = sprinting ? defs.vitals.sprint : moving ? defs.vitals.move : defs.vitals.idle
    survival = drainMinute(survival, step)
    if (sprinting) survival = exert(survival)
    else if (!moving) survival = recover(survival)
    if (survival.health <= 0) break
  }
  if (survival === state.survival) return state
  return { ...state, survival }
}

function drainMinute(survival: Survival, step: number): Survival {
  const span = defs.vitals.span
  const filled = survival.meter + step
  const loss = Math.floor(filled / span)
  const meter = filled - loss * span
  const hunger = Math.max(0, survival.hunger - loss)
  const thirst = Math.max(0, survival.thirst - loss)
  const starving = hunger === 0 || thirst === 0
  const health = starving ? Math.max(0, survival.health - defs.vitals.hurt) : survival.health
  return { ...survival, hunger, thirst, health, meter }
}

function exert(survival: Survival): Survival {
  const stamina = Math.max(0, survival.stamina - defs.stamina.drain)
  if (stamina === survival.stamina) return survival
  return { ...survival, stamina }
}

function recover(survival: Survival): Survival {
  const span = defs.stamina.span
  const filled = survival.rest + defs.stamina.recover
  const gain = Math.floor(filled / span)
  const rest = filled - gain * span
  const stamina = Math.min(defs.stamina.max, survival.stamina + gain)
  if (stamina === survival.stamina && rest === survival.rest) return survival
  return { ...survival, stamina, rest }
}
