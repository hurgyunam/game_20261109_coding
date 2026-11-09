import { defs } from './defs'
import type { State } from './state'

export type Direction = {
  x: number
  y: number
}

export function move(state: State, direction: Direction, dt: number): State {
  if (dt <= 0 || (direction.x === 0 && direction.y === 0)) return state

  const length = Math.hypot(direction.x, direction.y)
  const distance = travelSpeed(state) * dt
  const x = clamp(
    state.player.x + (direction.x / length) * distance,
    state.bounds.minX,
    state.bounds.maxX,
  )
  const y = clamp(
    state.player.y + (direction.y / length) * distance,
    state.bounds.minY,
    state.bounds.maxY,
  )

  if (x === state.player.x && y === state.player.y) return state

  return {
    ...state,
    player: { ...state.player, x, y },
  }
}

function travelSpeed(state: State) {
  if (state.inventory.weight > state.inventory.limit) {
    return state.player.speed * defs.inventory.slowdown
  }
  return state.player.speed
}

function clamp(value: number, min: number, max: number) {
  if (max < min) return (min + max) / 2
  return Math.min(max, Math.max(min, value))
}
