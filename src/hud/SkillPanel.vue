<script setup lang="ts">
import { skillIds, type SkillId } from '../core/defs'
import type { State } from '../core/state'

defineProps<{
  state: State
}>()

const labels: Record<SkillId, string> = {
  gather: '채집',
  farm: '농사',
  hunt: '사냥',
  craft: '제조',
}
</script>

<template>
  <section class="skills" aria-label="스킬">
    <h2>스킬</h2>
    <ul>
      <li
        v-for="id in skillIds"
        :key="id"
        :data-skill="id"
        :data-level="state.skills[id].level"
        :data-xp="state.skills[id].xp"
      >
        <span>{{ labels[id] }}</span>
        <span>Lv.{{ state.skills[id].level }}</span>
        <span class="xp">경험치 {{ state.skills[id].xp }}</span>
        <span v-if="state.skills[id].unlocked.length" class="techs">
          {{ state.skills[id].unlocked.join(' ') }}
        </span>
      </li>
    </ul>
  </section>
</template>
