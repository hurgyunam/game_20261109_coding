import Phaser from 'phaser'
import type { BuildingId } from '../core/defs'
import type { State } from '../core/state'
import { WorldScene } from './scene'

export type GameApi = {
  apply: (state: State) => void
  beginBuild: (buildingId: BuildingId) => void
}

export type GameHooks = {
  onState: (state: State) => void
  onInventory: () => void
  onBuild: () => void
  onBuildDone: () => void
  onWarehouse: (id: string) => void
  onCampfire: (id: string) => void
  onCampfireClose: () => void
  onTrade: (id: string) => void
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
