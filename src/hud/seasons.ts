import autumnUrl from '../../assets/autumn.png'
import springUrl from '../../assets/spring.png'
import summerUrl from '../../assets/summer.png'
import winterUrl from '../../assets/winter.png'
import type { SeasonId } from '../core/defs'

const icons: Record<SeasonId, string> = {
  spring: springUrl,
  summer: summerUrl,
  autumn: autumnUrl,
  winter: winterUrl,
}

const labels: Record<SeasonId, string> = {
  spring: '봄',
  summer: '여름',
  autumn: '가을',
  winter: '겨울',
}

export function seasonIcon(season: SeasonId) {
  return icons[season]
}

export function seasonLabel(season: SeasonId) {
  return labels[season]
}
