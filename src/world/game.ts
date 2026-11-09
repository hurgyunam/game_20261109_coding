import Phaser from 'phaser'
import type { State } from '../core/state'
import { WorldScene } from './scene'

export type GameApi = {
  apply: (state: State) => void
}

export type GameHooks = {
  onState: (state: State) => void
  bind: (api: GameApi) => void
}

export function createGame(parent: HTMLElement, hooks: GameHooks) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#142018',
    banner: false,
    audio: { noAudio: true },
    render: {
      pixelArt: true,
      antialias: false,
      roundPixels: true,
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: parent.clientWidth || window.innerWidth,
      height: parent.clientHeight || window.innerHeight,
    },
    callbacks: {
      preBoot: (game) => {
        game.registry.set('hooks', hooks)
      },
    },
    scene: [WorldScene],
  })
}
