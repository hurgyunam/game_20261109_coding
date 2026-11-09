import Phaser from 'phaser'
import { move } from '../core/move'
import { createState, type State } from '../core/state'
import { images } from './assets'
import { createCamera } from './camera'
import { createControlReader, type Control } from './input'

const maxFrameSeconds = 0.1

export class WorldScene extends Phaser.Scene {
  private state!: State
  private player!: Phaser.GameObjects.Image
  private readControl!: () => Control
  private view!: ReturnType<typeof createCamera>

  constructor() {
    super('world')
  }

  preload() {
    for (const image of Object.values(images)) {
      this.load.image(image.key, image.url)
    }
  }

  create() {
    const floor = this.add.image(0, 0, images.floor.key).setOrigin(0, 0)
    const player = this.add.image(0, 0, images.player.key)
    this.state = createState(
      { width: floor.width, height: floor.height },
      { width: player.width, height: player.height },
    )
    player.setPosition(this.state.player.x, this.state.player.y)
    this.player = player
    this.view = createCamera(this.cameras.main, this.player, floor.width, floor.height)
    this.readControl = createControlReader(this)
  }

  update(_time: number, delta: number) {
    const control = this.readControl()
    const dt = Math.min(delta, maxFrameSeconds * 1000) / 1000
    this.state = move(this.state, control.move, dt)
    this.player.setPosition(this.state.player.x, this.state.player.y)
    if (control.move.x < 0) this.player.setFlipX(true)
    else if (control.move.x > 0) this.player.setFlipX(false)
    const follow = control.move.x !== 0 || control.move.y !== 0
    this.view.update(control.look, follow, dt)
  }
}
