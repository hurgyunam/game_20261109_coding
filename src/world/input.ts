import type Phaser from 'phaser'
import type { Direction } from '../core/move'

export type Control = {
  move: Direction
  look: Direction
  use: boolean
}

export type Action =
  | { type: 'selectSlot'; slot: number }
  | { type: 'click'; x: number; y: number }
  | { type: 'inventory' }
  | { type: 'use' }
  | { type: 'cancel' }
  | { type: 'sprint' }

export type Pointer = {
  down: boolean
  x: number
  y: number
}

const idle: Control = {
  move: { x: 0, y: 0 },
  look: { x: 0, y: 0 },
  use: false,
}

const digitNames = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'] as const
const moveCodes = ['KeyW', 'KeyA', 'KeyS', 'KeyD'] as const

type MoveCode = (typeof moveCodes)[number]

const moveByKey: Record<string, MoveCode> = {
  w: 'KeyW',
  W: 'KeyW',
  ㅈ: 'KeyW',
  a: 'KeyA',
  A: 'KeyA',
  ㅁ: 'KeyA',
  s: 'KeyS',
  S: 'KeyS',
  ㄴ: 'KeyS',
  d: 'KeyD',
  D: 'KeyD',
  ㅇ: 'KeyD',
}

type HeldMoves = Map<MoveCode, number>

function isMoveCode(code: string): code is MoveCode {
  return (moveCodes as readonly string[]).includes(code)
}

function moveCodeOf(event: KeyboardEvent) {
  if (isMoveCode(event.code)) return event.code
  return moveByKey[event.key]
}

function heldMoves() {
  const host = window as Window & { __heldMoves?: HeldMoves }
  if (!host.__heldMoves) host.__heldMoves = new Map()
  return host.__heldMoves
}

function trackMoveKey(event: KeyboardEvent) {
  const code = moveCodeOf(event)
  if (!code) return
  const held = heldMoves()
  if (event.type === 'keydown') {
    if (!event.repeat || !held.has(code)) held.set(code, event.timeStamp)
    return
  }
  held.delete(code)
}

function watchMoveKeys() {
  const host = window as Window & { __trackMoveKeys?: boolean }
  if (host.__trackMoveKeys) return
  host.__trackMoveKeys = true
  window.addEventListener('keydown', trackMoveKey, true)
  window.addEventListener('keyup', trackMoveKey, true)
  window.addEventListener('blur', () => heldMoves().clear())
}

function axisOf(negative: MoveCode, positive: MoveCode) {
  const held = heldMoves()
  const negativeAt = held.get(negative)
  const positiveAt = held.get(positive)
  if (positiveAt === undefined && negativeAt === undefined) return 0
  if (positiveAt === undefined) return -1
  if (negativeAt === undefined) return 1
  return positiveAt >= negativeAt ? 1 : -1
}

if (typeof window !== 'undefined') watchMoveKeys()

export function createControlReader(scene: Phaser.Scene) {
  const keyboard = scene.input.keyboard
  const actions: Action[] = []

  scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    if (pointer.rightButtonDown()) {
      actions.push({ type: 'cancel' })
      return
    }
    if (!pointer.leftButtonDown()) return
    const target = pointer.event && 'target' in pointer.event ? pointer.event.target : null
    if (target !== scene.game.canvas) return
    actions.push({ type: 'click', x: pointer.worldX, y: pointer.worldY })
  })

  const pointer = (): Pointer => {
    const current = scene.input.activePointer
    return {
      down: current.leftButtonDown(),
      x: current.worldX,
      y: current.worldY,
    }
  }

  if (!keyboard) {
    return {
      read: () => idle,
      consume: () => actions.splice(0),
      pointer,
    }
  }

  const cursors = keyboard.createCursorKeys()
  const use = keyboard.addKey('E')
  keyboard.addCapture([
    'W',
    'A',
    'S',
    'D',
    'E',
    'I',
    'ESC',
    'SHIFT',
    cursors.left.keyCode,
    cursors.right.keyCode,
    cursors.up.keyCode,
    cursors.down.keyCode,
    ...digitNames.flatMap((name) => [name, `NUMPAD_${name}`]),
  ])
  const tap = (type: 'inventory' | 'use') => (event: KeyboardEvent) => {
    if (event.repeat) return
    actions.push({ type })
  }
  keyboard.on('keydown-I', tap('inventory'))
  keyboard.on('keydown-E', tap('use'))
  keyboard.on('keydown-SHIFT', (event: KeyboardEvent) => {
    if (event.repeat) return
    actions.push({ type: 'sprint' })
  })
  keyboard.on('keydown-ESC', (event: KeyboardEvent) => {
    if (event.repeat) return
    actions.push({ type: 'cancel' })
  })

  digitNames.forEach((name, index) => {
    const slot = index + 1
    const press = (event: KeyboardEvent) => {
      if (event.repeat) return
      actions.push({ type: 'selectSlot', slot })
    }
    keyboard.on(`keydown-${name}`, press)
    keyboard.on(`keydown-NUMPAD_${name}`, press)
  })

  return {
    read(): Control {
      return {
        move: {
          x: axisOf('KeyA', 'KeyD'),
          y: axisOf('KeyW', 'KeyS'),
        },
        look: {
          x: axis(cursors.left.isDown, cursors.right.isDown),
          y: axis(cursors.up.isDown, cursors.down.isDown),
        },
        use: use.isDown,
      }
    },
    consume: () => actions.splice(0),
    pointer,
  }
}

function axis(negative: boolean, positive: boolean) {
  return Number(positive) - Number(negative)
}
