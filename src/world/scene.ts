import Phaser from 'phaser'
import { place } from '../core/build'
import { buildingIds, type BuildingId } from '../core/defs'
import { chop } from '../core/gather'
import { hunt } from '../core/hunt'
import { handItem, selectSlot } from '../core/inventory'
import { move } from '../core/move'
import { createState, type Building, type Rabbit, type State, type Tree } from '../core/state'
import { images } from './assets'
import { createCamera } from './camera'
import type { GameHooks } from './game'
import { createControlReader, type Action, type Pointer } from './input'

const maxFrameSeconds = 0.1
const holdRepeatSeconds = 0.2
const reachDistance = 120
const reachDot = 0.6
const tileSize = 64

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

const rabbitSpots = [
  [0.534, 0.518],
  [0.4, 0.5],
  [0.62, 0.62],
  [0.36, 0.7],
  [0.72, 0.4],
  [0.28, 0.36],
] as const

type Aim = {
  kind: 'tree' | 'rabbit' | 'warehouse' | 'campfire'
  id: string
}

export class WorldScene extends Phaser.Scene {
  private state!: State
  private player!: Phaser.GameObjects.Image
  private controls!: ReturnType<typeof createControlReader>
  private view!: ReturnType<typeof createCamera>
  private hooks!: GameHooks
  private treeSprites = new Map<string, Phaser.GameObjects.Image>()
  private rabbitSprites = new Map<string, Phaser.GameObjects.Image>()
  private buildingSprites = new Map<string, Phaser.GameObjects.Image>()
  private mapSize = { width: 0, height: 0 }
  private ghost: { kind: BuildingId; sprite: Phaser.GameObjects.Image } | null = null
  private nextStrike = 0
  private facing = { x: 1, y: 0 }
  private campfireId: string | null = null

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
    this.mapSize = map
    this.state = createState(
      map,
      { width: player.width, height: player.height },
      placeTrees(map),
      placeRabbits(map),
    )
    player.setPosition(this.state.player.x, this.state.player.y)
    player.setDepth(this.state.player.y)
    this.player = player
    this.syncTrees(this.state)
    this.syncRabbits(this.state)
    this.view = createCamera(this.cameras.main, this.player, floor.width, floor.height)
    this.controls = createControlReader(this)
    this.input.mouse?.disableContextMenu()
    this.hooks = this.game.registry.get('hooks') as GameHooks
    this.hooks.bind({
      apply: (next) => {
        const pose = this.state.player
        this.commit(next.player === pose ? next : { ...next, player: pose })
      },
      beginBuild: (buildingId) => {
        this.beginBuild(buildingId)
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
      if (action.type === 'cancel') {
        this.finishGhost()
        continue
      }
      if (action.type === 'use') {
        if (this.ghost) {
          struck = true
          continue
        }
        this.interact(this.ahead())
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
    this.releaseCampfire()
    if (control.move.x < 0) this.player.setFlipX(true)
    else if (control.move.x > 0) this.player.setFlipX(false)
    const follow = control.move.x !== 0 || control.move.y !== 0
    this.view.update(control.look, follow, dt)
    if (this.ghost && handItem(this.state)?.itemId !== 'stone-hammer') this.finishGhost()
    else this.syncGhost(pointer)
  }

  private repeatStrike(pointer: Pointer, use: boolean, struck: boolean, dt: number) {
    if (this.ghost) {
      if (!pointer.down && !use) this.nextStrike = 0
      return
    }
    if (!pointer.down && !use) {
      this.nextStrike = 0
      return
    }
    if (struck) {
      this.nextStrike = holdRepeatSeconds
      return
    }
    this.nextStrike -= dt
    if (this.nextStrike > 0) return
    const clicked = pointer.down ? this.treeAt(pointer.x, pointer.y) : null
    const target = clicked ? { kind: 'tree' as const, id: clicked } : use ? this.ahead() : null
    if (!target && !use) return
    this.nextStrike = holdRepeatSeconds
    this.interact(target)
  }

  private interact(target: Aim | null) {
    if (target) {
      this.useTarget(target)
      return
    }
    this.offerBuild()
  }

  private offerBuild() {
    if (handItem(this.state)?.itemId !== 'stone-hammer') return
    const tile = this.emptyTileAhead()
    if (!tile) return
    this.hooks.onBuild()
  }

  private beginBuild(buildingId: string) {
    this.dropGhost()
    if (handItem(this.state)?.itemId !== 'stone-hammer' || !isBuildingId(buildingId)) {
      this.input.setDefaultCursor('default')
      this.hooks.onBuildDone()
      return
    }
    const sprite = this.add.image(0, 0, images[buildingId].key).setOrigin(0.5, 1).setAlpha(0.62)
    sprite.setVisible(false)
    this.tweens.add({
      targets: sprite,
      alpha: 0.28,
      duration: 520,
      yoyo: true,
      repeat: -1,
    })
    this.ghost = { kind: buildingId, sprite }
    this.input.setDefaultCursor('crosshair')
    this.syncGhost(this.controls.pointer())
  }

  private syncGhost(pointer: Pointer) {
    if (!this.ghost) return
    const tile = this.tileAt(pointer.x, pointer.y)
    const sprite = this.ghost.sprite
    if (!tile) {
      sprite.setVisible(false)
      return
    }
    const open = !this.tileOccupied(tile.tileX, tile.tileY)
    sprite.setVisible(true)
    sprite.setPosition(tile.x, tile.y)
    sprite.setDepth(tile.y + 1)
    sprite.setTint(open ? 0xd8ffe4 : 0xffb0b0)
  }

  private confirmGhost(x: number, y: number) {
    if (!this.ghost) return false
    const tile = this.tileAt(x, y)
    if (!tile || this.tileOccupied(tile.tileX, tile.tileY)) return true
    const next = place(this.state, this.ghost.kind, tile.x, tile.y)
    if (next === this.state) return true
    this.finishGhost()
    this.commit(next)
    return true
  }

  private finishGhost() {
    if (!this.ghost) return
    this.dropGhost()
    this.input.setDefaultCursor('default')
    this.hooks.onBuildDone()
  }

  private dropGhost() {
    if (!this.ghost) return
    this.tweens.killTweensOf(this.ghost.sprite)
    this.ghost.sprite.destroy()
    this.ghost = null
  }

  private tileAt(x: number, y: number) {
    const tileX = Math.floor(x / tileSize)
    const tileY = Math.floor(y / tileSize)
    const centerX = tileX * tileSize + tileSize / 2
    const centerY = tileY * tileSize + tileSize / 2
    const inside =
      centerX >= tileSize / 2 &&
      centerY >= tileSize / 2 &&
      centerX <= this.mapSize.width - tileSize / 2 &&
      centerY <= this.mapSize.height - tileSize / 2
    if (!inside) return null
    return { x: centerX, y: centerY, tileX, tileY }
  }

  private emptyTileAhead() {
    const step = facingStep(this.facing)
    const tileX = Math.floor(this.player.x / tileSize) + step.x
    const tileY = Math.floor(this.player.y / tileSize) + step.y
    const x = tileX * tileSize + tileSize / 2
    const y = tileY * tileSize + tileSize / 2
    const inside =
      x >= tileSize / 2 &&
      y >= tileSize / 2 &&
      x <= this.mapSize.width - tileSize / 2 &&
      y <= this.mapSize.height - tileSize / 2
    if (!inside || this.tileOccupied(tileX, tileY)) return null
    return { x, y }
  }

  private tileOccupied(tileX: number, tileY: number) {
    const here = (x: number, y: number) =>
      Math.floor(x / tileSize) === tileX && Math.floor(y / tileSize) === tileY
    return (
      this.state.trees.some((tree) => here(tree.x, tree.y)) ||
      this.state.rabbits.some((rabbit) => here(rabbit.x, rabbit.y)) ||
      this.state.buildings.some((building) => here(building.x, building.y))
    )
  }

  private useTarget(target: Aim) {
    if (target.kind === 'warehouse') {
      this.hooks.onWarehouse(target.id)
      return
    }
    if (target.kind === 'campfire') {
      this.campfireId = target.id
      this.hooks.onCampfire(target.id)
      return
    }
    if (handItem(this.state)?.itemId !== 'stone-axe') return
    const next = target.kind === 'tree' ? chop(this.state, target.id) : hunt(this.state, target.id)
    this.commit(next)
  }

  private applyAction(action: Action) {
    if (action.type === 'selectSlot') {
      this.commit(selectSlot(this.state, action.slot))
      return
    }

    if (action.type !== 'click') return
    if (this.confirmGhost(action.x, action.y)) return
    const treeId = this.treeAt(action.x, action.y)
    if (!treeId) return
    this.useTarget({ kind: 'tree', id: treeId })
  }

  private releaseCampfire() {
    const id = this.campfireId
    if (!id) return
    const campfire = this.state.buildings.find((building) => building.id === id && building.kind === 'campfire')
    if (campfire && this.beside(campfire.x, campfire.y, this.buildingSprites.get(campfire.id))) return
    this.campfireId = null
    this.hooks.onCampfireClose()
  }

  private beside(x: number, y: number, sprite?: Phaser.GameObjects.Image) {
    const dx = x - this.player.x
    const dy = y - (sprite?.displayHeight ?? 0) * 0.45 - this.player.y
    return Math.hypot(dx, dy) <= reachDistance
  }

  private ahead(): Aim | null {
    const spots = [
      ...this.state.trees.map((tree) => this.aimAt('tree', tree.id, tree.x, tree.y, this.treeSprites.get(tree.id))),
      ...this.state.rabbits.map((rabbit) =>
        this.aimAt('rabbit', rabbit.id, rabbit.x, rabbit.y, this.rabbitSprites.get(rabbit.id)),
      ),
      ...this.state.buildings.map((building) =>
        this.aimAt(building.kind, building.id, building.x, building.y, this.buildingSprites.get(building.id)),
      ),
    ]
    let found: (Aim & { distance: number }) | null = null
    for (const spot of spots) {
      if (!spot) continue
      if (!found || spot.distance < found.distance) found = spot
    }
    if (!found) return null
    return { kind: found.kind, id: found.id }
  }

  private aimAt(
    kind: Aim['kind'],
    id: string,
    x: number,
    y: number,
    sprite?: Phaser.GameObjects.Image,
  ): (Aim & { distance: number }) | null {
    const dx = x - this.player.x
    const dy = y - (sprite?.displayHeight ?? 0) * 0.45 - this.player.y
    const distance = Math.hypot(dx, dy)
    if (distance === 0 || distance > reachDistance) return null
    const dot = (dx / distance) * this.facing.x + (dy / distance) * this.facing.y
    if (dot < reachDot) return null
    return { kind, id, distance }
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
    this.syncRabbits(state)
    this.syncBuildings(state)
  }

  private syncBuildings(state: State) {
    const alive = new Set(state.buildings.map((building) => building.id))
    for (const [id, sprite] of this.buildingSprites) {
      if (alive.has(id)) continue
      this.buildingSprites.delete(id)
      sprite.destroy()
    }
    for (const building of state.buildings) {
      if (!this.buildingSprites.has(building.id)) this.spawnBuilding(building)
    }
  }

  private spawnBuilding(building: Building) {
    const sprite = this.add
      .image(building.x, building.y, images[building.kind].key)
      .setOrigin(0.5, 1)
    sprite.setDepth(building.y)
    this.buildingSprites.set(building.id, sprite)
  }

  private syncRabbits(state: State) {
    const alive = new Set(state.rabbits.map((rabbit) => rabbit.id))
    for (const [id, sprite] of this.rabbitSprites) {
      if (alive.has(id)) continue
      this.rabbitSprites.delete(id)
      this.flee(sprite)
    }
    for (const rabbit of state.rabbits) {
      if (!this.rabbitSprites.has(rabbit.id)) this.spawnRabbit(rabbit)
    }
  }

  private spawnRabbit(rabbit: Rabbit) {
    const sprite = this.add.image(rabbit.x, rabbit.y, images.rabbit.key).setOrigin(0.5, 1)
    sprite.setDepth(rabbit.y)
    this.rabbitSprites.set(rabbit.id, sprite)
    const hop = (Number(rabbit.id.replace(/\D/g, '')) % 4) * 90
    this.tweens.add({
      targets: sprite,
      y: rabbit.y - 4,
      duration: 460,
      delay: hop,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  private flee(sprite: Phaser.GameObjects.Image) {
    this.tweens.killTweensOf(sprite)
    this.tweens.add({
      targets: sprite,
      y: sprite.y - 16,
      alpha: 0,
      duration: 180,
      ease: 'Quad.easeOut',
      onComplete: () => sprite.destroy(),
    })
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

function placeRabbits(map: { width: number; height: number }): Rabbit[] {
  return rabbitSpots.map(([x, y], index) => ({
    id: `rabbit-${index + 1}`,
    x: Math.round(x * map.width),
    y: Math.round(y * map.height),
  }))
}

function placeTrees(map: { width: number; height: number }): Tree[] {
  return treeSpots.map(([x, y], index) => ({
    id: `tree-${index + 1}`,
    x: Math.round(x * map.width),
    y: Math.round(y * map.height),
    hits: 0,
  }))
}

function isBuildingId(buildingId: string): buildingId is BuildingId {
  return (buildingIds as readonly string[]).includes(buildingId)
}

function facingStep(facing: { x: number; y: number }) {
  const snapped = Math.round(Math.atan2(facing.y, facing.x) / (Math.PI / 4))
  const angle = snapped * (Math.PI / 4)
  return {
    x: Math.round(Math.cos(angle)),
    y: Math.round(Math.sin(angle)),
  }
}

function fallDirection(id: string) {
  return Number(id.replace(/\D/g, '')) % 2 === 0 ? -1 : 1
}

function lean(tree: Tree) {
  return tree.hits * 6 * fallDirection(tree.id)
}
