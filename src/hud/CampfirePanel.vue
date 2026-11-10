<script setup lang="ts">
import { computed } from 'vue'
import { defs, type ItemId } from '../core/defs'
import type { State } from '../core/state'
import { itemIcon, itemLabel } from './items'

const props = defineProps<{
  state: State
  campfireId: string
}>()

defineEmits<{
  cook: []
  close: []
}>()

const recipe = defs.cooking.campfire
const food = new Set<ItemId>([recipe.input, recipe.output])

const carried = computed(() =>
  props.state.inventory.slots.flatMap((slot) => (slot && food.has(slot.itemId) ? [slot] : [])),
)

const hasMeat = computed(() => carried.value.some((slot) => slot.itemId === recipe.input))
</script>

<template>
  <section class="campfire" aria-label="모닥불" :data-building="campfireId">
    <header>
      <h2>모닥불</h2>
      <button type="button" @click="$emit('close')">닫기</button>
    </header>
    <ul class="items">
      <li v-if="carried.length === 0">구울 고기가 없음</li>
      <li v-for="slot in carried" :key="slot.itemId" :data-item="slot.itemId" :data-count="slot.count">
        <img :src="itemIcon(slot.itemId)" :alt="itemLabel(slot.itemId)" />
        <span>{{ itemLabel(slot.itemId) }} × {{ slot.count }}</span>
      </li>
    </ul>
    <button v-if="hasMeat" type="button" data-action="cook" @click="$emit('cook')">고기 굽기</button>
  </section>
</template>
