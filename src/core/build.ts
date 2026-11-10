import { buildingIds, type BuildingId } from './defs'
import { handItem } from './inventory'
import { createStorage, type Building, type State } from './state'

export function place(state: State, buildingId: string, x: number, y: number): State {
  if (handItem(state)?.itemId !== 'stone-hammer') return state
  if (!isBuilding(buildingId)) return state
  if (!Number.isFinite(x) || !Number.isFinite(y)) return state
  if (state.buildings.some((building) => building.x === x && building.y === y)) return state

  const count = state.buildings.filter((building) => building.kind === buildingId).length + 1
  const building: Building =
    buildingId === 'warehouse'
      ? { id: `${buildingId}-${count}`, kind: 'warehouse', x, y, storage: createStorage() }
      : { id: `${buildingId}-${count}`, kind: 'campfire', x, y }
  return {
    ...state,
    buildings: [...state.buildings, building],
  }
}

function isBuilding(buildingId: string): buildingId is BuildingId {
  return (buildingIds as readonly string[]).includes(buildingId)
}
