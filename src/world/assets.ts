import floorUrl from '../../assets/floor.png'
import furUrl from '../../assets/fur.png'
import logUrl from '../../assets/log.png'
import meatUrl from '../../assets/meat.png'
import playerUrl from '../../assets/player.png'
import rabbitUrl from '../../assets/rabbit.png'
import stoneAxeUrl from '../../assets/stone-axe.png'
import stoneHammerUrl from '../../assets/stone-hammer.png'
import treeUrl from '../../assets/tree.png'

export const images = {
  floor: { key: 'floor', url: floorUrl },
  player: { key: 'player', url: playerUrl },
  tree: { key: 'tree', url: treeUrl },
  rabbit: { key: 'rabbit', url: rabbitUrl },
  log: { key: 'log', url: logUrl },
  meat: { key: 'meat', url: meatUrl },
  fur: { key: 'fur', url: furUrl },
  'stone-axe': { key: 'stone-axe', url: stoneAxeUrl },
  'stone-hammer': { key: 'stone-hammer', url: stoneHammerUrl },
} as const
