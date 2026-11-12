import campfireUrl from '../../assets/campfire.png'
import cookedMeatUrl from '../../assets/cooked-meat.png'
import floorUrl from '../../assets/floor.png'
import furUrl from '../../assets/fur.png'
import logUrl from '../../assets/log.png'
import meatUrl from '../../assets/meat.png'
import merchantUrl from '../../assets/merchant.png'
import playerUrl from '../../assets/player.png'
import rabbitUrl from '../../assets/rabbit.png'
import stoneAxeUrl from '../../assets/stone-axe.png'
import stoneHammerUrl from '../../assets/stone-hammer.png'
import stoneHoeUrl from '../../assets/stone-hoe.png'
import treeUrl from '../../assets/tree.png'
import warehouseUrl from '../../assets/warehouse.png'

export const images = {
  floor: { key: 'floor', url: floorUrl },
  player: { key: 'player', url: playerUrl },
  tree: { key: 'tree', url: treeUrl },
  rabbit: { key: 'rabbit', url: rabbitUrl },
  merchant: { key: 'merchant', url: merchantUrl },
  log: { key: 'log', url: logUrl },
  meat: { key: 'meat', url: meatUrl },
  'cooked-meat': { key: 'cooked-meat', url: cookedMeatUrl },
  fur: { key: 'fur', url: furUrl },
  'stone-axe': { key: 'stone-axe', url: stoneAxeUrl },
  'stone-hammer': { key: 'stone-hammer', url: stoneHammerUrl },
  'stone-hoe': { key: 'stone-hoe', url: stoneHoeUrl },
  warehouse: { key: 'warehouse', url: warehouseUrl },
  campfire: { key: 'campfire', url: campfireUrl },
} as const
