import { defs, seasonIds, type SeasonId } from './defs'
import type { State } from './state'

export function tick(state: State, dt: number): State {
  if (dt <= 0) return state
  const span = defs.time.dayMinutes
  const delta = ((dt * defs.time.testPace) / defs.time.daySeconds) * span
  const minutes = wrap(state.time.minutes + delta, span)
  const day = state.time.day + crossedDays(state.time.minutes, delta)
  if (minutes === state.time.minutes && day === state.time.day) return state
  return {
    ...state,
    time: {
      minutes,
      day,
      season: day === state.time.day ? state.time.season : seasonOn(day),
    },
  }
}

function crossedDays(minutes: number, delta: number) {
  const span = defs.time.dayMinutes
  const intoDay = wrap(minutes - defs.time.startMinute, span)
  return Math.floor((intoDay + delta) / span)
}

export function seasonOn(day: number): SeasonId {
  const yearDays = defs.calendar.yearDays
  const dayOfYear = ((day % yearDays) + yearDays) % yearDays
  const passed = Math.floor(dayOfYear / defs.calendar.seasonDays)
  const start = seasonIds.indexOf(defs.calendar.start)
  const count = seasonIds.length
  return seasonIds[(((start + passed) % count) + count) % count]
}

function wrap(value: number, span: number) {
  const rest = value % span
  return rest < 0 ? rest + span : rest
}
