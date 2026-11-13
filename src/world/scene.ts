import Phaser from 'phaser'
import { place } from '../core/build'
import { buildingIds, defs, isFoodId, isSeedId, type BuildingId, type CropId } from '../core/defs'
import {
  canFertilize,
  canHarvest,
  canPlaceField,
  cropStage,
  fieldAt,
  fieldSpan,
  fertilize,
  harvest,
  placeField,
  sow,
  till,
} from '../core/farm'
import { chop } from '../core/gather'
import { hunt } from '../core/hunt'
import { handItem, selectSlot } from '../core/inventory'
import { move } from '../core/move'
import { applyScene } from '../core/scenes'
import { createState, type Building, type Merchant, type Rabbit, type River, type State, type Tree } from '../core/state'
import { drink, eat } from '../core/survive'
import { tick } from '../core/time'
import { images } from './assets'
import { createCamera } from './camera'
import type { GameHooks } from './game'
import { createControlReader, type Action, type Pointer } from './input'

const maxFrameSeconds = 0.1
const holdRepeatSeconds = 0.2
const reachDistance = 120
const reachDot = 0.6
const tileSize = defs.map.tile

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

const merchantSpots = [[0.7067, 0.6933]] as const

type Aim = {
  kind: 'tree' | 'rabbit' | 'warehouse' | 'campfire' | 'merchant' | 'river'
  id: string
}

type TilePoint = {
  x: number
  y: number
}

type FieldGhost = {
  step: 'start' | 'end'
  aim: TilePoint
  anchor: TilePoint | null
  follow: boolean
  pointer: { x: number; y: number }
  mark: Phaser.GameObjects.Graphics
}

export class WorldScene extends Phaser.Scene {
  private state!: State
  private player!: Phaser.GameObjects.Image
  private controls!: ReturnType<typeof createControlReader>
  private view!: ReturnType<typeof createCamera>
  private hooks!: GameHooks
  private treeSprites = new Map<string, Phaser.GameObjects.Image>()
  private rabbitSprites = new Map<string, Phaser.GameObjects.Image>()
  private merchantSprites = new Map<string, Phaser.GameObjects.Image>()
  private riverSprites = new Map<string, Phaser.GameObjects.Image>()
  private tradeHints = new Map<string, Phaser.GameObjects.Text>()
  private buildingSprites = new Map<string, Phaser.GameObjects.Image>()
  private mapSize = { width: 0, height: 0 }
  private ghost: { kind: BuildingId; sprite: Phaser.GameObjects.Image } | null = null
  private fieldGhost: FieldGhost | null = null
  private fieldMarks!: Phaser.GameObjects.Graphics
  private cropSprites = new Map<string, Phaser.GameObjects.Image>()
  private tillHint: Phaser.GameObjects.Text | null = null
  private nextStrike = 0
  private holdPaused = false
  private facing = { x: 1, y: 0 }
  private campfireId: string | null = null
  private night!: Phaser.GameObjects.Rectangle

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
    this.fieldMarks = this.add.graphics().setDepth(1)
    const player = this.add.image(0, 0, images.player.key)
    const map = { width: floor.width, height: floor.height }
    this.mapSize = map
    this.state = applyScene(
      createState(
        map,
        { width: player.width, height: player.height },
        placeTrees(map),
        placeRabbits(map),
        placeMerchants(map),
        placeRivers(),
      ),
      openingScene(),
    )
    player.setPosition(this.state.player.x, this.state.player.y)
    player.setDepth(this.state.player.y)
    this.player = player
    this.render(this.state)
    this.view = createCamera(this.cameras.main, this.player, floor.width, floor.height)
    this.night = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x0c1428, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(100000)
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitNight, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.fitNight, this)
    })
    this.shadeNight()
    this.controls = createControlReader(this)
    this.input.mouse?.disableContextMenu()
    this.hooks = this.game.registry.get('hooks') as GameHooks
    this.hooks.bind({
      apply: (next) => {
        if (this.state.survival.health <= 0) return
        const pose = this.state.player
        const time = this.state.time
        const samePose = next.player === pose
        const sameTime = next.time === time
        this.commit(samePose && sameTime ? next : { ...next, player: pose, time })
      },
      beginBuild: (buildingId) => {
        this.beginBuild(buildingId)
      },
    })
    this.hooks.onState(this.state)
  }

  update(_time: number, delta: number) {
    if (this.state.survival.health <= 0) {
      this.controls.consume()
      this.tillHint?.setVisible(false)
      return
    }
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
        this.finishField()
        continue
      }
      if (action.type === 'use') {
        if (this.ghost || this.fieldGhost) {
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
    const moving = control.move.x !== 0 || control.move.y !== 0
    if (moving) {
      const length = Math.hypot(control.move.x, control.move.y)
      this.facing = { x: control.move.x / length, y: control.move.y / length }
    }
    this.repeatStrike(pointer, control.use, struck, dt)
    const stepped = move(this.state, control.move, dt)
    const next = tick(stepped, dt, stepped !== this.state)
    if (next !== this.state) {
      const dayChanged = next.time.day !== this.state.time.day
      const minuteChanged = Math.floor(next.time.minutes) !== Math.floor(this.state.time.minutes)
      this.state = next
      if (dayChanged) this.syncCrops(next)
      if (minuteChanged) this.hooks.onState(next)
    }

    this.player.setPosition(this.state.player.x, this.state.player.y)
    this.player.setDepth(this.state.player.y)
    this.shadeNight()
    this.releaseCampfire()
    this.syncTradeHint()
    this.syncActionHint()
    if (control.move.x < 0) this.player.setFlipX(true)
    else if (control.move.x > 0) this.player.setFlipX(false)
    const follow = control.move.x !== 0 || control.move.y !== 0
    this.view.update(control.look, follow, dt)
    if (this.ghost && handItem(this.state)?.itemId !== 'stone-hammer') this.finishGhost()
    else this.syncGhost(pointer)
    if (this.fieldGhost && handItem(this.state)?.itemId !== 'stone-hoe') this.finishField()
    else this.syncField(pointer)
  }

  private repeatStrike(pointer: Pointer, use: boolean, struck: boolean, dt: number) {
    if (this.holdPaused) {
      if (!pointer.down && !use) this.holdPaused = false
      this.nextStrike = 0
      return
    }
    if (this.ghost || this.fieldGhost) {
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
    if (this.tillAhead()) return
    if (this.sowAhead()) return
    if (this.fertilizeAhead()) return
    if (this.harvestAhead()) return
    if (target && this.targetClaims(target)) {
      this.useTarget(target)
      return
    }
    if (this.drinkAhead(target)) return
    if (this.eatHeld(target)) return
    if (this.beginField()) return
    this.offerBuild()
  }

  private targetClaims(target: Aim) {
    if (target.kind === 'warehouse' || target.kind === 'campfire' || target.kind === 'merchant') return true
    return handItem(this.state)?.itemId === 'stone-axe' && (target.kind === 'tree' || target.kind === 'rabbit')
  }

  private tillAhead() {
    if (this.ghost || this.fieldGhost) return false
    const tile = this.tillTile()
    if (!tile) return false
    this.commit(till(this.state, tile.tileX, tile.tileY))
    return true
  }

  private sowAhead() {
    if (this.ghost || this.fieldGhost) return false
    const tile = this.seedTile()
    if (!tile) return false
    this.commit(sow(this.state, tile.tileX, tile.tileY))
    return true
  }

  private seedTile() {
    if (!isSeedId(handItem(this.state)?.itemId ?? '')) return null
    const center = this.tileAt(this.player.x, this.player.y)
    const ahead = this.tileAhead()
    if (center && fieldAt(this.state, center.tileX, center.tileY)) {
      if (this.bare(center.tileX, center.tileY)) return center
      if (ahead && this.bare(ahead.tileX, ahead.tileY)) return ahead
      return center
    }
    if (ahead && fieldAt(this.state, ahead.tileX, ahead.tileY)) return ahead
    return null
  }

  private fertilizeAhead() {
    if (this.ghost || this.fieldGhost) return false
    const tile = this.manureTile()
    if (!tile) return false
    this.commit(fertilize(this.state, tile.tileX, tile.tileY))
    return true
  }

  private manureTile() {
    if (handItem(this.state)?.itemId !== 'fertilizer') return null
    const center = this.tileAt(this.player.x, this.player.y)
    const ahead = this.tileAhead()
    if (center && fieldAt(this.state, center.tileX, center.tileY)) return center
    if (ahead && this.planted(ahead.tileX, ahead.tileY)) return ahead
    return null
  }

  private harvestAhead() {
    if (this.ghost || this.fieldGhost) return false
    const tile = this.harvestTile()
    if (!tile) return false
    this.commit(harvest(this.state, tile.tileX, tile.tileY))
    return true
  }

  private harvestTile() {
    if (handItem(this.state)?.itemId !== 'stone-sickle') return null
    const center = this.tileAt(this.player.x, this.player.y)
    const ahead = this.tileAhead()
    if (center && this.planted(center.tileX, center.tileY)) return center
    if (ahead && this.planted(ahead.tileX, ahead.tileY)) return ahead
    if (center && fieldAt(this.state, center.tileX, center.tileY)) return center
    if (ahead && fieldAt(this.state, ahead.tileX, ahead.tileY)) return ahead
    return null
  }

  private planted(tileX: number, tileY: number) {
    const field = fieldAt(this.state, tileX, tileY)
    return !!field?.tilled.some((tile) => tile.x === tileX && tile.y === tileY && tile.crop)
  }

  private bare(tileX: number, tileY: number) {
    const field = fieldAt(this.state, tileX, tileY)
    if (!field) return false
    const tile = field.tilled.find((item) => item.x === tileX && item.y === tileY)
    return !!tile && !tile.crop
  }

  private tillTile() {
    if (handItem(this.state)?.itemId !== 'stone-hoe') return null
    const center = this.tileAt(this.player.x, this.player.y)
    const ahead = this.tileAhead()
    if (center && fieldAt(this.state, center.tileX, center.tileY)) {
      if (this.untilled(center.tileX, center.tileY)) return center
      if (ahead && this.untilled(ahead.tileX, ahead.tileY)) return ahead
      return center
    }
    if (ahead && this.untilled(ahead.tileX, ahead.tileY)) return ahead
    return null
  }

  private inUntilledField() {
    const center = this.tileAt(this.player.x, this.player.y)
    return center ? this.untilled(center.tileX, center.tileY) : false
  }

  private canMarkField() {
    if (handItem(this.state)?.itemId !== 'stone-hoe') return false
    if (this.ghost || this.fieldGhost) return false
    const center = this.tileAt(this.player.x, this.player.y)
    if (center && fieldAt(this.state, center.tileX, center.tileY)) return false
    const target = this.ahead()
    if (target && this.targetClaims(target)) return false
    const ahead = this.emptyTileAhead()
    if (!ahead) return false
    const tile = this.tileAt(ahead.x, ahead.y)
    return !!tile && canPlaceField(this.state, tile.tileX, tile.tileY, tile.tileX, tile.tileY)
  }

  private untilled(tileX: number, tileY: number) {
    const field = fieldAt(this.state, tileX, tileY)
    if (!field) return false
    return !field.tilled.some((tile) => tile.x === tileX && tile.y === tileY)
  }

  private syncActionHint() {
    const hint = this.tillHintText()
    const label = this.actionLabel()
    if (!label) {
      hint.setVisible(false)
      return
    }
    hint.setText(label)
    hint.setVisible(true)
    hint.setPosition(this.player.x, this.player.y - this.player.displayHeight / 2 - 8)
  }

  private actionLabel() {
    if (this.ghost || this.fieldGhost) return null
    const hand = handItem(this.state)?.itemId
    if (hand === 'stone-hoe') {
      if (this.inUntilledField()) return 'E키를 눌러 밭 갈기'
      if (this.canMarkField()) return 'E키를 눌러 밭 영역 지정'
    }
    const sowing = this.seedTile()
    if (sowing && this.bare(sowing.tileX, sowing.tileY)) return 'E키를 눌러 씨 뿌리기'
    const feeding = this.manureTile()
    if (feeding && canFertilize(this.state, feeding.tileX, feeding.tileY)) return 'E키를 눌러 거름 뿌리기'
    const reaping = this.harvestTile()
    if (reaping && canHarvest(this.state, reaping.tileX, reaping.tileY)) return 'E키를 눌러 수확'
    if (hand === 'stone-axe' && this.ahead()?.kind === 'tree') return 'E키를 눌러 벌목'
    if (this.ahead()?.kind === 'river') return 'E키를 눌러 물 마시기'
    if (!this.ahead() && hand && isFoodId(hand)) return 'E키를 눌러 먹기'
    return null
  }

  private eatHeld(target: Aim | null) {
    if (target) return false
    const itemId = handItem(this.state)?.itemId
    if (!itemId || !isFoodId(itemId)) return false
    this.commit(eat(this.state))
    return true
  }

  private drinkAhead(target: Aim | null) {
    if (target && target.kind !== 'river') return false
    const river = target?.kind === 'river' ? target : this.ahead()
    if (river?.kind !== 'river') return false
    this.commit(drink(this.state, river.id))
    return true
  }

  private tillHintText() {
    if (this.tillHint) return this.tillHint
    this.tillHint = this.add
      .text(0, 0, 'E키를 눌러 밭 갈기', {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '14px',
        color: '#f4f0e4',
        backgroundColor: '#0a120e',
        padding: { x: 8, y: 5 },
      })
      .setOrigin(0.5, 1)
      .setDepth(100001)
      .setVisible(false)
    return this.tillHint
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
    this.pauseHold()
    this.input.setDefaultCursor('default')
    this.hooks.onBuildDone()
  }

  private dropGhost() {
    if (!this.ghost) return
    this.tweens.killTweensOf(this.ghost.sprite)
    this.ghost.sprite.destroy()
    this.ghost = null
  }

  private beginField() {
    if (this.ghost || this.fieldGhost) return false
    if (handItem(this.state)?.itemId !== 'stone-hoe') return false
    const ahead = this.emptyTileAhead()
    if (!ahead) return false
    const tile = this.tileAt(ahead.x, ahead.y)
    if (!tile || !canPlaceField(this.state, tile.tileX, tile.tileY, tile.tileX, tile.tileY)) return false
    const pointer = this.controls.pointer()
    const mark = this.add.graphics().setDepth(2)
    this.fieldGhost = {
      step: 'start',
      aim: { x: tile.tileX, y: tile.tileY },
      anchor: null,
      follow: false,
      pointer: { x: pointer.x, y: pointer.y },
      mark,
    }
    this.input.setDefaultCursor('crosshair')
    this.drawFieldGhost()
    return true
  }

  private syncField(pointer: Pointer) {
    const mode = this.fieldGhost
    if (!mode) return
    if (!mode.follow && Math.hypot(pointer.x - mode.pointer.x, pointer.y - mode.pointer.y) > 8) {
      mode.follow = true
    }
    if (mode.follow) {
      const tile = this.tileAt(pointer.x, pointer.y)
      if (tile) mode.aim = { x: tile.tileX, y: tile.tileY }
    }
    this.drawFieldGhost()
  }

  private drawFieldGhost() {
    const mode = this.fieldGhost
    if (!mode) return
    const x1 = mode.anchor?.x ?? mode.aim.x
    const y1 = mode.anchor?.y ?? mode.aim.y
    const span = fieldSpan(x1, y1, mode.aim.x, mode.aim.y)
    mode.mark.clear()
    if (!span) return
    const open = canPlaceField(this.state, x1, y1, mode.aim.x, mode.aim.y)
    paintPlot(mode.mark, span, open ? 0x8fd9a8 : 0xf0a0a0, open ? 0xd8ffe4 : 0xffb4b4, false)
  }

  private confirmField(x: number, y: number) {
    const mode = this.fieldGhost
    if (!mode) return false
    if (mode.follow) {
      const tile = this.tileAt(x, y)
      if (!tile) return true
      mode.aim = { x: tile.tileX, y: tile.tileY }
    }
    const aim = mode.aim
    if (mode.step === 'start') {
      if (!canPlaceField(this.state, aim.x, aim.y, aim.x, aim.y)) return true
      mode.anchor = { ...aim }
      mode.step = 'end'
      mode.follow = false
      mode.pointer = { x, y }
      this.drawFieldGhost()
      return true
    }
    const anchor = mode.anchor
    if (!anchor) return true
    const next = placeField(this.state, anchor.x, anchor.y, aim.x, aim.y)
    if (next === this.state) return true
    this.finishField()
    this.commit(next)
    return true
  }

  private finishField() {
    if (!this.fieldGhost) return
    this.fieldGhost.mark.destroy()
    this.fieldGhost = null
    this.pauseHold()
    if (!this.ghost) this.input.setDefaultCursor('default')
  }

  private pauseHold() {
    this.holdPaused = true
    this.nextStrike = 0
  }

  private syncFields(state: State) {
    this.fieldMarks.clear()
    for (const field of state.fields) {
      paintPlot(this.fieldMarks, field, 0xf6e7a8, 0xd4b15a, true)
      for (const tile of field.tilled) paintFurrow(this.fieldMarks, tile.x, tile.y)
    }
  }

  private syncCrops(state: State) {
    const alive = new Set<string>()
    for (const field of state.fields) {
      for (const tile of field.tilled) {
        if (!tile.crop) continue
        const key = `${tile.x},${tile.y}`
        alive.add(key)
        const x = tile.x * tileSize + tileSize / 2
        const y = (tile.y + 1) * tileSize - 8
        const texture = cropImage[tile.crop]
        let sprite = this.cropSprites.get(key)
        if (!sprite) {
          sprite = this.add.image(x, y, texture).setOrigin(0.5, 1).setDepth(y)
          sprite.setDisplaySize(40, 40)
          this.cropSprites.set(key, sprite)
        } else {
          sprite.setPosition(x, y)
          sprite.setDepth(y)
          sprite.setTexture(texture)
        }
        if (cropStage(state, tile.x, tile.y) === 'rotten') sprite.setTint(0xb7a898)
        else sprite.clearTint()
      }
    }
    for (const [key, sprite] of this.cropSprites) {
      if (alive.has(key)) continue
      this.cropSprites.delete(key)
      sprite.destroy()
    }
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

  private tileAhead() {
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
    if (!inside) return null
    return { x, y, tileX, tileY }
  }

  private emptyTileAhead() {
    const tile = this.tileAhead()
    if (!tile || this.tileOccupied(tile.tileX, tile.tileY)) return null
    return { x: tile.x, y: tile.y }
  }

  private tileOccupied(tileX: number, tileY: number) {
    const here = (x: number, y: number) =>
      Math.floor(x / tileSize) === tileX && Math.floor(y / tileSize) === tileY
    return (
      this.state.trees.some((tree) => here(tree.x, tree.y)) ||
      this.state.rabbits.some((rabbit) => here(rabbit.x, rabbit.y)) ||
      this.state.buildings.some((building) => here(building.x, building.y)) ||
      this.state.merchants.some((merchant) => here(merchant.x, merchant.y)) ||
      this.state.rivers.some((river) => here(river.x, river.y))
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
    if (target.kind === 'merchant') {
      this.hooks.onTrade(target.id)
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
    if (this.confirmField(action.x, action.y)) return
    const treeId = this.treeAt(action.x, action.y)
    if (!treeId) return
    this.useTarget({ kind: 'tree', id: treeId })
  }

  private fitNight(size: { width: number; height: number }) {
    this.night.setSize(size.width, size.height)
  }

  private shadeNight() {
    this.night.setAlpha(nightCover(this.state.time.minutes))
  }

  private syncTradeHint() {
    for (const merchant of this.state.merchants) {
      const sprite = this.merchantSprites.get(merchant.id)
      const hint = this.tradeHint(merchant.id)
      if (!sprite || !this.beside(merchant.x, merchant.y, sprite)) {
        hint.setVisible(false)
        continue
      }
      hint.setVisible(true)
      hint.setPosition(sprite.x, sprite.y - sprite.displayHeight - 8)
    }
  }

  private tradeHint(id: string) {
    const existing = this.tradeHints.get(id)
    if (existing) return existing
    const hint = this.add
      .text(0, 0, 'E키를 눌러 거래', {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '14px',
        color: '#f4f0e4',
        backgroundColor: '#0a120e',
        padding: { x: 8, y: 5 },
      })
      .setOrigin(0.5, 1)
      .setDepth(100001)
      .setVisible(false)
    this.tradeHints.set(id, hint)
    return hint
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
      ...this.state.merchants.map((merchant) =>
        this.aimAt('merchant', merchant.id, merchant.x, merchant.y, this.merchantSprites.get(merchant.id)),
      ),
      ...this.state.rivers.map((river) =>
        this.aimAt('river', river.id, river.x, river.y, this.riverSprites.get(river.id)),
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
    this.syncMerchants(state)
    this.syncRivers(state)
    this.syncBuildings(state)
    this.syncFields(state)
    this.syncCrops(state)
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

  private syncRivers(state: State) {
    const alive = new Set(state.rivers.map((river) => river.id))
    for (const [id, sprite] of this.riverSprites) {
      if (alive.has(id)) continue
      this.riverSprites.delete(id)
      sprite.destroy()
    }
    for (const river of state.rivers) {
      if (!this.riverSprites.has(river.id)) this.spawnRiver(river)
    }
  }

  private spawnRiver(river: River) {
    const sprite = this.add.image(river.x, river.y, images.river.key).setOrigin(0.5, 1).setDepth(1)
    this.riverSprites.set(river.id, sprite)
  }

  private syncMerchants(state: State) {
    const alive = new Set(state.merchants.map((merchant) => merchant.id))
    for (const [id, sprite] of this.merchantSprites) {
      if (alive.has(id)) continue
      this.merchantSprites.delete(id)
      this.tweens.killTweensOf(sprite)
      sprite.destroy()
      this.tradeHints.get(id)?.destroy()
      this.tradeHints.delete(id)
    }
    for (const merchant of state.merchants) {
      if (!this.merchantSprites.has(merchant.id)) this.spawnMerchant(merchant)
    }
  }

  private spawnMerchant(merchant: Merchant) {
    const sprite = this.add.image(merchant.x, merchant.y, images.merchant.key).setOrigin(0.5, 1)
    sprite.setDepth(merchant.y)
    this.merchantSprites.set(merchant.id, sprite)
    this.tweens.add({
      targets: sprite,
      y: merchant.y - 3,
      duration: 720,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
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

const cropImage: Record<CropId, string> = {
  flax: images.flax.key,
  rye: images.rye.key,
  cabbage: images.cabbage.key,
  oat: images.oat.key,
  wheat: images.wheat.key,
}

function paintFurrow(graphics: Phaser.GameObjects.Graphics, tileX: number, tileY: number) {
  const left = tileX * tileSize
  const top = tileY * tileSize
  graphics.fillStyle(0x6b3f22, 0.92)
  graphics.fillRect(left + 4, top + 4, tileSize - 8, tileSize - 8)
  graphics.lineStyle(2, 0x3a2414, 0.95)
  for (let row = 1; row <= 3; row += 1) {
    const y = top + (tileSize * row) / 4
    graphics.lineBetween(left + 10, y, left + tileSize - 10, y)
  }
}

function paintPlot(
  graphics: Phaser.GameObjects.Graphics,
  span: { x: number; y: number; w: number; h: number },
  fill: number,
  line: number,
  hatch: boolean,
) {
  const left = span.x * tileSize
  const top = span.y * tileSize
  const width = span.w * tileSize
  const height = span.h * tileSize
  graphics.fillStyle(fill, hatch ? 0.4 : 0.48)
  graphics.fillRect(left, top, width, height)
  if (hatch) {
    graphics.lineStyle(2, line, 0.9)
    const gap = 16
    for (let offset = -height + gap; offset < width; offset += gap) {
      const startX = left + Math.max(0, offset)
      const startY = top + Math.max(0, -offset)
      const endX = left + Math.min(width, offset + height)
      const endY = top + (endX - left) - offset
      graphics.lineBetween(startX, startY, endX, endY)
    }
  }
  graphics.lineStyle(2, line, 0.95)
  graphics.strokeRect(left + 1, top + 1, Math.max(0, width - 2), Math.max(0, height - 2))
}

function nightCover(minutes: number) {
  const span = defs.time.dayMinutes
  const clock = ((minutes % span) + span) % span
  const sun = -Math.cos((clock / span) * Math.PI * 2)
  return Math.max(0, -sun) * 0.38
}

function openingScene() {
  if (!import.meta.env.DEV) return null
  return new URLSearchParams(window.location.search).get('scene')
}

function placeRivers(): River[] {
  const tile = defs.map.tile
  return [{ id: 'river-1', x: tile * 3 + tile / 2, y: tile * 7 + tile / 2 }]
}

function placeMerchants(map: { width: number; height: number }): Merchant[] {
  return merchantSpots.map(([x, y], index) => ({
    id: `merchant-${index + 1}`,
    x: Math.round(x * map.width),
    y: Math.round(y * map.height),
  }))
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
