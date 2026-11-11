<script setup lang="ts">
import { computed } from 'vue'
import { defs } from '../core/defs'
import type { State } from '../core/state'
import { seasonIcon, seasonLabel } from './seasons'

const props = defineProps<{
  state: State
}>()

const label = computed(() => {
  const total = Math.floor(props.state.time.minutes)
  const hour24 = Math.floor(total / 60) % 24
  const minute = total % 60
  const period = hour24 < 12 ? '오전' : '오후'
  const hour = hour24 % 12 || 12
  return `${period} ${hour}:${String(minute).padStart(2, '0')}`
})

const skyAngle = computed(() => {
  const span = defs.time.dayMinutes
  const minutes = ((props.state.time.minutes % span) + span) % span
  return -((minutes - span / 2) / span) * 360
})
</script>

<template>
  <div class="clock">
    <svg class="sky" viewBox="0 0 120 62" aria-hidden="true" :data-sky="skyAngle">
      <defs>
        <clipPath id="day-sky">
          <path d="M4 60 A56 56 0 0 1 116 60 Z" />
        </clipPath>
      </defs>
      <g clip-path="url(#day-sky)">
        <g :transform="`rotate(${skyAngle} 60 60)`">
          <path d="M4 60 A56 56 0 0 1 116 60 Z" fill="#9ed0f2" />
          <path d="M116 60 A56 56 0 0 1 4 60 Z" fill="#141c33" />
          <circle cx="38" cy="84" r="1.5" fill="#d7e6f8" />
          <circle cx="84" cy="90" r="1.3" fill="#d7e6f8" />
          <circle cx="98" cy="74" r="1.2" fill="#d7e6f8" />
          <circle cx="26" cy="74" r="1.1" fill="#d7e6f8" />
          <g :transform="`rotate(${-skyAngle} 60 22)`">
            <circle cx="60" cy="22" r="8" fill="#f6d15a" stroke="#c4922a" stroke-width="2" />
          </g>
          <g :transform="`rotate(${-skyAngle} 60 98)`">
            <circle cx="60" cy="98" r="7" fill="#f4f7fb" stroke="#b7c6d8" stroke-width="2" />
          </g>
        </g>
      </g>
      <path d="M4 60 A56 56 0 0 1 116 60" fill="none" stroke="#3d5344" stroke-width="3" />
    </svg>
    <div class="clock-face">
      <img
        class="season"
        :src="seasonIcon(state.time.season)"
        :alt="seasonLabel(state.time.season)"
        :data-season="state.time.season"
      />
      <p>{{ label }}</p>
    </div>
  </div>
</template>
