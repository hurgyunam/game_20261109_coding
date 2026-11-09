import type Phaser from 'phaser'
import type { Direction } from '../core/move'

const lookSpeed = 480

export function createCamera(
  camera: Phaser.Cameras.Scene2D.Camera,
  target: Phaser.GameObjects.GameObject & { x: number; y: number },
  mapWidth: number,
  mapHeight: number,
) {
  camera.setBounds(0, 0, mapWidth, mapHeight)
  camera.roundPixels = true
  camera.startFollow(target, true)

  let following = true

  return {
    update(look: Direction, follow: boolean, dt: number) {
      if (follow) {
        if (!following) {
          camera.startFollow(target, true)
          following = true
        }
        return
      }

      if (dt <= 0 || (look.x === 0 && look.y === 0)) return

      if (following) {
        camera.stopFollow()
        following = false
      }

      const length = Math.hypot(look.x, look.y)
      camera.scrollX += (look.x / length) * lookSpeed * dt
      camera.scrollY += (look.y / length) * lookSpeed * dt
    },
  }
}
