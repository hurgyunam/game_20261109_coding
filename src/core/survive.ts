import { defs } from './defs'
import type { State, Survival } from './state'

export function drink(state: State, riverId: string): State {
  if (state.survival.health <= 0) return state
  if (!state.rivers.some((river) => river.id === riverId)) return state
  const thirst = defs.vitals.drink
  if (state.survival.thirst === thirst) return state
  return { ...state, survival: { ...state.survival, thirst } }
}

export function endure(state: State, minutes: number, moving: boolean): State {
  if (minutes <= 0 || state.survival.health <= 0) return state
  let survival = state.survival
  const step = moving ? defs.vitals.move : defs.vitals.idle
  for (let i = 0; i < minutes; i += 1) {
    survival = drainMinute(survival, step)
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
  return { hunger, thirst, health, meter }
}
