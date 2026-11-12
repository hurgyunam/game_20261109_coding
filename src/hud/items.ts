import cabbageUrl from '../../assets/cabbage.png'
import cabbageSeedUrl from '../../assets/cabbage-seed.png'
import cookedMeatUrl from '../../assets/cooked-meat.png'
import fertilizerUrl from '../../assets/fertilizer.png'
import flaxUrl from '../../assets/flax.png'
import flaxSeedUrl from '../../assets/flax-seed.png'
import furUrl from '../../assets/fur.png'
import logUrl from '../../assets/log.png'
import meatUrl from '../../assets/meat.png'
import oatUrl from '../../assets/oat.png'
import oatSeedUrl from '../../assets/oat-seed.png'
import ryeUrl from '../../assets/rye.png'
import ryeSeedUrl from '../../assets/rye-seed.png'
import stoneAxeUrl from '../../assets/stone-axe.png'
import stoneHammerUrl from '../../assets/stone-hammer.png'
import stoneHoeUrl from '../../assets/stone-hoe.png'
import stoneSickleUrl from '../../assets/stone-sickle.png'
import wheatUrl from '../../assets/wheat.png'
import wheatSeedUrl from '../../assets/wheat-seed.png'
import type { ItemId } from '../core/defs'

const icons: Partial<Record<ItemId, string>> = {
  log: logUrl,
  'stone-axe': stoneAxeUrl,
  'stone-hammer': stoneHammerUrl,
  'stone-hoe': stoneHoeUrl,
  'stone-sickle': stoneSickleUrl,
  meat: meatUrl,
  fur: furUrl,
  'cooked-meat': cookedMeatUrl,
  'flax-seed': flaxSeedUrl,
  'rye-seed': ryeSeedUrl,
  'cabbage-seed': cabbageSeedUrl,
  'oat-seed': oatSeedUrl,
  'wheat-seed': wheatSeedUrl,
  flax: flaxUrl,
  rye: ryeUrl,
  cabbage: cabbageUrl,
  oat: oatUrl,
  wheat: wheatUrl,
  fertilizer: fertilizerUrl,
}

const labels: Record<ItemId, string> = {
  log: '통나무',
  'stone-axe': '돌 도끼',
  'stone-hammer': '돌 망치',
  'stone-hoe': '돌 괭이',
  'stone-sickle': '돌 낫',
  meat: '고기',
  fur: '모피',
  'cooked-meat': '구운 고기',
  'flax-seed': '아마 씨앗',
  'rye-seed': '호밀 씨앗',
  'cabbage-seed': '양배추 씨앗',
  'oat-seed': '귀리 씨앗',
  'wheat-seed': '밀 씨앗',
  flax: '아마',
  rye: '호밀',
  cabbage: '양배추',
  oat: '귀리',
  wheat: '밀',
  fertilizer: '거름',
}

export function itemLabel(itemId: ItemId) {
  return labels[itemId]
}

export function itemIcon(itemId: ItemId) {
  return icons[itemId]
}
