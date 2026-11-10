import campfireUrl from '../../assets/campfire.png'
import warehouseUrl from '../../assets/warehouse.png'
import type { BuildingId } from '../core/defs'

const icons: Record<BuildingId, string> = {
  warehouse: warehouseUrl,
  campfire: campfireUrl,
}

const labels: Record<BuildingId, string> = {
  warehouse: '창고',
  campfire: '모닥불',
}

export function buildingLabel(buildingId: BuildingId) {
  return labels[buildingId]
}

export function buildingIcon(buildingId: BuildingId) {
  return icons[buildingId]
}
