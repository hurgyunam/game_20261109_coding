import { buildingIds, type BuildingId } from './defs'
import { handItem } from './inventory'
import type { State } from './state'

export function place(state: State, buildingId: string, x: number, y: number): State {
  if (handItem(state)?.itemId !== 'stone-hammer') return state
  if (!isBuilding(buildingId)) return state
  if (!Number.isFinite(x) || !Number.isFinite(y)) return state
  if (state.buildings.some((building) => building.x === x && building.y === y)) return state

  const count = state.buildings.filter((building) => building.kind === buildingId).length + 1
  return {
    ...state,
    buildings: [...state.buildings, { id: `${buildingId}-${count}`, kind: buildingId, x, y }],
  }
}

function isBuilding(buildingId: string): buildingId is BuildingId {
  return (buildingIds as readonly string[]).includes(buildingId)
}
