<script setup lang="ts">
import { defs } from '../core/defs'
import type { State } from '../core/state'

defineProps<{
  state: State
}>()

const rows = [
  { key: 'hunger', label: '허기' },
  { key: 'thirst', label: '갈증' },
  { key: 'health', label: '체력' },
] as const
</script>

<template>
  <section class="vitals" aria-label="생존">
    <p v-for="row in rows" :key="row.key" :data-vital="row.key" :data-value="state.survival[row.key]">
      <span>{{ row.label }}</span>
      <span class="value">{{ state.survival[row.key] }}</span>
      <span class="track" aria-hidden="true">
        <span
          class="fill"
          :style="{ width: `${(state.survival[row.key] / defs.vitals.max) * 100}%` }"
        ></span>
      </span>
    </p>
  </section>
</template>
