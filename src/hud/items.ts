import cookedMeatUrl from '../../assets/cooked-meat.png'
import furUrl from '../../assets/fur.png'
import logUrl from '../../assets/log.png'
import meatUrl from '../../assets/meat.png'
import stoneAxeUrl from '../../assets/stone-axe.png'
import stoneHammerUrl from '../../assets/stone-hammer.png'
import type { ItemId } from '../core/defs'

const icons: Partial<Record<ItemId, string>> = {
  log: logUrl,
  'stone-axe': stoneAxeUrl,
  'stone-hammer': stoneHammerUrl,
  meat: meatUrl,
  fur: furUrl,
  'cooked-meat': cookedMeatUrl,
}

const labels: Record<ItemId, string> = {
  log: '통나무',
  'stone-axe': '돌 도끼',
  'stone-hammer': '돌 망치',
  meat: '고기',
  fur: '모피',
  'cooked-meat': '구운 고기',
}

export function itemLabel(itemId: ItemId) {
  return labels[itemId]
}

export function itemIcon(itemId: ItemId) {
  return icons[itemId]
}
