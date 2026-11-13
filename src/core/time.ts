import { defs, seasonIds, type SeasonId } from './defs'
import type { State } from './state'
import { endure } from './survive'

export function tick(state: State, dt: number, moving = false): State {
  if (dt <= 0 || state.survival.health <= 0) return state
  const span = defs.time.dayMinutes
  const delta = ((dt * defs.time.testPace) / defs.time.daySeconds) * span
  const gained = Math.floor(state.time.minutes + delta) - Math.floor(state.time.minutes)
  const minutes = wrap(state.time.minutes + delta, span)
  const day = state.time.day + crossedDays(state.time.minutes, delta)
  const timed =
    minutes === state.time.minutes && day === state.time.day
      ? state
      : {
          ...state,
          time: {
            minutes,
            day,
            season: day === state.time.day ? state.time.season : seasonOn(day),
          },
        }
  if (gained <= 0) return timed
  return endure(timed, gained, moving)
}

function crossedDays(minutes: number, delta: number) {
  const span = defs.time.dayMinutes
  const intoDay = wrap(minutes - defs.time.startMinute, span)
  return Math.floor((intoDay + delta) / span)
}

export function canSleep(minutes: number) {
  const span = defs.time.dayMinutes
  const clock = ((minutes % span) + span) % span
  return clock >= defs.time.bedtime || clock < defs.time.startMinute
}

export function sleep(state: State): State {
  if (state.survival.health <= 0 || !canSleep(state.time.minutes)) return state
  const day = state.time.day + 1
  return {
    ...state,
    survival: { ...state.survival, stamina: defs.stamina.max },
    time: {
      minutes: defs.time.startMinute,
      day,
      season: seasonOn(day),
    },
  }
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
