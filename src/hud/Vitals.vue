<script setup lang="ts">
import { defs } from '../core/defs'
import type { State } from '../core/state'

defineProps<{
  state: State
}>()

const rows = [
  { key: 'hunger', label: '허기', max: defs.vitals.max },
  { key: 'thirst', label: '갈증', max: defs.vitals.max },
  { key: 'health', label: '체력', max: defs.vitals.max },
  { key: 'stamina', label: '스테미나', max: defs.stamina.max },
] as const
</script>

<template>
  <section class="vitals" aria-label="생존">
    <p v-for="row in rows" :key="row.key" :data-vital="row.key" :data-value="state.survival[row.key]">
      <span>{{ row.label }}</span>
      <span class="value">{{ state.survival[row.key] }}</span>
      <span class="track" aria-hidden="true">
        <span class="fill" :style="{ width: `${(state.survival[row.key] / row.max) * 100}%` }"></span>
      </span>
    </p>
    <p class="pace" :data-pace="state.player.sprinting ? 'sprint' : 'walk'">
      {{ state.player.sprinting ? '달리기' : '걷기' }}
    </p>
  </section>
</template>
