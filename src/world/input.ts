import type Phaser from 'phaser'
import type { Direction } from '../core/move'

export type Control = {
  move: Direction
  look: Direction
}

export type Action =
  | { type: 'selectSlot'; slot: number }
  | { type: 'click'; x: number; y: number }

const idle: Control = {
  move: { x: 0, y: 0 },
  look: { x: 0, y: 0 },
}

const digitNames = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'] as const

export function createControlReader(scene: Phaser.Scene) {
  const keyboard = scene.input.keyboard
  const actions: Action[] = []

  scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    if (!pointer.leftButtonDown()) return
    actions.push({ type: 'click', x: pointer.worldX, y: pointer.worldY })
  })

  if (!keyboard) {
    return {
      read: () => idle,
      consume: () => actions.splice(0),
    }
  }

  const cursors = keyboard.createCursorKeys()
  const walk = keyboard.addKeys('W,A,S,D') as Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>
  keyboard.addCapture([
    'W',
    'A',
    'S',
    'D',
    cursors.left.keyCode,
    cursors.right.keyCode,
    cursors.up.keyCode,
    cursors.down.keyCode,
    ...digitNames.flatMap((name) => [name, `NUMPAD_${name}`]),
  ])

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
          x: axis(walk.A.isDown, walk.D.isDown),
          y: axis(walk.W.isDown, walk.S.isDown),
        },
        look: {
          x: axis(cursors.left.isDown, cursors.right.isDown),
          y: axis(cursors.up.isDown, cursors.down.isDown),
        },
      }
    },
    consume: () => actions.splice(0),
  }
}

function axis(negative: boolean, positive: boolean) {
  return Number(positive) - Number(negative)
}
