import type Phaser from 'phaser'
import type { Direction } from '../core/move'

export type Control = {
  move: Direction
  look: Direction
}

const idle: Control = {
  move: { x: 0, y: 0 },
  look: { x: 0, y: 0 },
}

export function createControlReader(scene: Phaser.Scene): () => Control {
  const keyboard = scene.input.keyboard
  if (!keyboard) return () => idle

  const cursors = keyboard.createCursorKeys()
  const look = keyboard.addKeys('W,A,S,D') as Record<
    'W' | 'A' | 'S' | 'D',
    Phaser.Input.Keyboard.Key
  >
  keyboard.addCapture([
    cursors.left.keyCode,
    cursors.right.keyCode,
    cursors.up.keyCode,
    cursors.down.keyCode,
  ])

  return () => ({
    move: {
      x: axis(cursors.left.isDown, cursors.right.isDown),
      y: axis(cursors.up.isDown, cursors.down.isDown),
    },
    look: {
      x: axis(look.A.isDown, look.D.isDown),
      y: axis(look.W.isDown, look.S.isDown),
    },
  })
}

function axis(negative: boolean, positive: boolean) {
  return Number(positive) - Number(negative)
}
