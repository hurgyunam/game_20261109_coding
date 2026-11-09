import { defs, type SkillId } from './defs'
import type { State } from './state'

export function grantXp(state: State, skill: SkillId, amount: number): State {
  if (amount <= 0) return state
  const current = state.skills[skill]
  const xp = current.xp + amount
  const unlocked = current.unlocked.slice()
  for (const step of defs.skills.thresholds[skill]) {
    if (xp >= step.xp && !unlocked.includes(step.tech)) unlocked.push(step.tech)
  }
  const level = 1 + unlocked.length
  if (
    xp === current.xp &&
    level === current.level &&
    unlocked.length === current.unlocked.length
  ) {
    return state
  }
  return {
    ...state,
    skills: {
      ...state.skills,
      [skill]: { xp, level, unlocked },
    },
  }
}
