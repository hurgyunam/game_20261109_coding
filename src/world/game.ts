import Phaser from 'phaser'
import { WorldScene } from './scene'

export function createGame(parent: HTMLElement) {
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
    scene: [WorldScene],
  })
}
