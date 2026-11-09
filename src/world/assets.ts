import floorUrl from '../../assets/floor.png'
import logUrl from '../../assets/log.png'
import playerUrl from '../../assets/player.png'
import stoneAxeUrl from '../../assets/stone-axe.png'
import stoneHammerUrl from '../../assets/stone-hammer.png'
import treeUrl from '../../assets/tree.png'

export const images = {
  floor: { key: 'floor', url: floorUrl },
  player: { key: 'player', url: playerUrl },
  tree: { key: 'tree', url: treeUrl },
  log: { key: 'log', url: logUrl },
  'stone-axe': { key: 'stone-axe', url: stoneAxeUrl },
  'stone-hammer': { key: 'stone-hammer', url: stoneHammerUrl },
} as const
