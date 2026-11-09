import { defs } from './defs'

export type State = {
  player: {
    x: number
    y: number
    speed: number
  }
  bounds: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  }
}

export function createState(
  map: { width: number; height: number },
  body: { width: number; height: number },
): State {
  const minX = body.width / 2
  const minY = body.height / 2
  const maxX = map.width - body.width / 2
  const maxY = map.height - body.height / 2

  return {
    player: {
      x: map.width / 2,
      y: map.height / 2,
      speed: defs.player.speed,
    },
    bounds: { minX, minY, maxX, maxY },
  }
}
