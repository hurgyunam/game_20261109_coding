import Phaser from 'phaser'
import { chop } from '../core/gather'
import { handItem, selectSlot } from '../core/inventory'
import { move } from '../core/move'
import { createState, type State, type Tree } from '../core/state'
import { images } from './assets'
import { createCamera } from './camera'
import type { GameHooks } from './game'
import { createControlReader, type Action, type Pointer } from './input'

const maxFrameSeconds = 0.1
const holdRepeatSeconds = 0.2
const reachDistance = 120
const reachDot = 0.6

const treeSpots = [
  [0.575, 0.378],
  [0.425, 0.356],
  [0.16, 0.12],
  [0.32, 0.1],
  [0.5, 0.08],
  [0.72, 0.12],
  [0.88, 0.22],
  [0.08, 0.48],
  [0.14, 0.78],
  [0.36, 0.88],
  [0.58, 0.9],
  [0.8, 0.86],
  [0.93, 0.62],
  [0.84, 0.46],
  [0.48, 0.22],
  [0.68, 0.24],
] as const

export class WorldScene extends Phaser.Scene {
  private state!: State
  private player!: Phaser.GameObjects.Image
  private controls!: ReturnType<typeof createControlReader>
  private view!: ReturnType<typeof createCamera>
  private hooks!: GameHooks
  private treeSprites = new Map<string, Phaser.GameObjects.Image>()
  private nextStrike = 0
  private facing = { x: 1, y: 0 }

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
    const map = { width: floor.width, height: floor.height }
    this.state = createState(map, { width: player.width, height: player.height }, placeTrees(map))
    player.setPosition(this.state.player.x, this.state.player.y)
    player.setDepth(this.state.player.y)
    this.player = player
    this.syncTrees(this.state)
    this.view = createCamera(this.cameras.main, this.player, floor.width, floor.height)
    this.controls = createControlReader(this)
    this.hooks = this.game.registry.get('hooks') as GameHooks
    this.hooks.bind({
      apply: (next) => {
        const pose = this.state.player
        this.commit(next.player === pose ? next : { ...next, player: pose })
      },
    })
    this.hooks.onState(this.state)
  }

  update(_time: number, delta: number) {
    const control = this.controls.read()
    const pointer = this.controls.pointer()
    let struck = false
    for (const action of this.controls.consume()) {
      if (action.type === 'inventory') {
        this.hooks.onInventory()
        continue
      }
      if (action.type === 'use') {
        const treeId = this.treeAhead()
        if (treeId) this.chopTree(treeId)
        struck = true
        continue
      }
      this.applyAction(action)
      if (action.type === 'click') struck = true
    }

    const dt = Math.min(delta, maxFrameSeconds * 1000) / 1000
    if (control.move.x !== 0 || control.move.y !== 0) {
      const length = Math.hypot(control.move.x, control.move.y)
      this.facing = { x: control.move.x / length, y: control.move.y / length }
    }
    this.repeatStrike(pointer, control.use, struck, dt)
    const next = move(this.state, control.move, dt)
    if (next !== this.state) this.state = next

    this.player.setPosition(this.state.player.x, this.state.player.y)
    this.player.setDepth(this.state.player.y)
    if (control.move.x < 0) this.player.setFlipX(true)
    else if (control.move.x > 0) this.player.setFlipX(false)
    const follow = control.move.x !== 0 || control.move.y !== 0
    this.view.update(control.look, follow, dt)
  }

  private repeatStrike(pointer: Pointer, use: boolean, struck: boolean, dt: number) {
    if (!pointer.down && !use) {
      this.nextStrike = 0
      return
    }
    if (struck) {
      this.nextStrike = holdRepeatSeconds
      return
    }
    this.nextStrike -= dt
    const treeId = (pointer.down ? this.treeAt(pointer.x, pointer.y) : null) ?? (use ? this.treeAhead() : null)
    if (this.nextStrike > 0 || !treeId) return
    this.nextStrike = holdRepeatSeconds
    this.chopTree(treeId)
  }

  private chopTree(treeId: string) {
    if (handItem(this.state)?.itemId === 'stone-axe') this.commit(chop(this.state, treeId))
  }

  private applyAction(action: Action) {
    if (action.type === 'selectSlot') {
      this.commit(selectSlot(this.state, action.slot))
      return
    }

    const treeId = this.treeAt(action.x, action.y)
    if (!treeId) return
    this.chopTree(treeId)
  }

  private treeAhead() {
    let found: { id: string; distance: number } | null = null
    for (const tree of this.state.trees) {
      const sprite = this.treeSprites.get(tree.id)
      const dx = tree.x - this.player.x
      const dy = tree.y - (sprite?.displayHeight ?? 0) * 0.45 - this.player.y
      const distance = Math.hypot(dx, dy)
      if (distance === 0 || distance > reachDistance) continue
      const dot = (dx / distance) * this.facing.x + (dy / distance) * this.facing.y
      if (dot < reachDot) continue
      if (!found || distance < found.distance) found = { id: tree.id, distance }
    }
    return found?.id ?? null
  }

  private commit(next: State) {
    if (next === this.state) return
    this.state = next
    this.render(next)
    this.hooks.onState(next)
  }

  private render(state: State) {
    this.player.setPosition(state.player.x, state.player.y)
    this.player.setDepth(state.player.y)
    this.syncTrees(state)
  }

  private syncTrees(state: State) {
    const alive = new Map(state.trees.map((tree) => [tree.id, tree]))
    for (const [id, sprite] of this.treeSprites) {
      if (alive.has(id)) continue
      this.treeSprites.delete(id)
      this.fall(sprite, id)
    }
    for (const tree of state.trees) {
      const sprite = this.treeSprites.get(tree.id)
      if (!sprite) {
        this.spawnTree(tree)
        continue
      }
      const previous = sprite.getData('hits') as number
      if (previous === tree.hits) continue
      sprite.setData('hits', tree.hits)
      this.strike(sprite, tree)
    }
  }

  private spawnTree(tree: Tree) {
    const sprite = this.add.image(tree.x, tree.y, images.tree.key).setOrigin(0.5, 1)
    sprite.setDepth(tree.y)
    sprite.setData('hits', tree.hits)
    sprite.setData('baseX', tree.x)
    sprite.setAngle(lean(tree))
    this.treeSprites.set(tree.id, sprite)
  }

  private strike(sprite: Phaser.GameObjects.Image, tree: Tree) {
    const direction = fallDirection(tree.id)
    const baseX = sprite.getData('baseX') as number
    this.tweens.killTweensOf(sprite)
    sprite.x = baseX
    sprite.setAngle(lean(tree))
    const mark = ((sprite.getData('flash') as number | undefined) ?? 0) + 1
    sprite.setData('flash', mark)
    sprite.setTint(0xfff1c4)
    this.time.delayedCall(90, () => {
      if (!sprite.active || sprite.getData('flash') !== mark || !this.treeSprites.has(tree.id)) return
      sprite.clearTint()
    })
    this.tweens.add({
      targets: sprite,
      x: baseX + 7 * direction,
      duration: 45,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (!sprite.active || !this.treeSprites.has(tree.id)) return
        sprite.x = baseX
        sprite.setAngle(lean(tree))
      },
    })
    this.chip(sprite, direction)
  }

  private chip(sprite: Phaser.GameObjects.Image, direction: number) {
    const chip = this.add.rectangle(sprite.x, sprite.y - sprite.displayHeight * 0.45, 6, 4, 0x8a5a32)
    chip.setDepth(sprite.depth + 1)
    this.tweens.add({
      targets: chip,
      x: chip.x + 16 * direction,
      y: chip.y - 14,
      alpha: 0,
      angle: 50 * direction,
      duration: 220,
      onComplete: () => chip.destroy(),
    })
  }

  private fall(sprite: Phaser.GameObjects.Image, id: string) {
    this.tweens.killTweensOf(sprite)
    sprite.clearTint()
    const direction = fallDirection(id)
    this.tweens.add({
      targets: sprite,
      angle: 78 * direction,
      alpha: 0,
      duration: 420,
      ease: 'Cubic.easeIn',
      onComplete: () => sprite.destroy(),
    })
  }

  private treeAt(x: number, y: number) {
    let found: { id: string; distance: number } | null = null
    for (const [id, sprite] of this.treeSprites) {
      const width = sprite.displayWidth
      const height = sprite.displayHeight
      const left = sprite.x - width * sprite.originX
      const top = sprite.y - height * sprite.originY
      if (x < left || x > left + width || y < top || y > top + height) continue
      const distance = (sprite.x - x) ** 2 + (sprite.y - y) ** 2
      if (!found || distance < found.distance) found = { id, distance }
    }
    return found?.id ?? null
  }
}

function placeTrees(map: { width: number; height: number }): Tree[] {
  return treeSpots.map(([x, y], index) => ({
    id: `tree-${index + 1}`,
    x: Math.round(x * map.width),
    y: Math.round(y * map.height),
    hits: 0,
  }))
}

function fallDirection(id: string) {
  return Number(id.replace(/\D/g, '')) % 2 === 0 ? -1 : 1
}

function lean(tree: Tree) {
  return tree.hits * 6 * fallDirection(tree.id)
}
