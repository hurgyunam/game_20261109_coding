<script setup lang="ts">
import { computed } from 'vue'
import { defs, type ItemId } from '../core/defs'
import type { State } from '../core/state'
import { itemIcon, itemLabel } from './items'

const props = defineProps<{
  state: State
  ovenId: string
}>()

defineEmits<{
  cook: [input: ItemId]
  close: []
}>()

const recipes = defs.cooking.oven
const labels: Partial<Record<ItemId, string>> = {
  wheat: '빵 굽기',
  rye: '호밀빵 굽기',
}
const food = new Set<ItemId>([
  ...recipes.flatMap((recipe) => [recipe.input, recipe.output]),
  'flax',
  'cabbage',
])

const carried = computed(() =>
  props.state.inventory.slots.flatMap((slot) => (slot && food.has(slot.itemId) ? [slot] : [])),
)

const ready = computed(() => recipes.filter((recipe) => carried.value.some((slot) => slot.itemId === recipe.input)))
</script>

<template>
  <section class="oven" aria-label="화덕" :data-building="ovenId">
    <header>
      <h2>화덕</h2>
      <button type="button" @click="$emit('close')">닫기</button>
    </header>
    <ul class="items">
      <li v-if="carried.length === 0">조리할 것이 없음</li>
      <li v-for="slot in carried" :key="slot.itemId" :data-item="slot.itemId" :data-count="slot.count">
        <img :src="itemIcon(slot.itemId)" :alt="itemLabel(slot.itemId)" />
        <span>{{ itemLabel(slot.itemId) }} × {{ slot.count }}</span>
      </li>
    </ul>
    <button
      v-for="recipe in ready"
      :key="recipe.input"
      type="button"
      data-action="cook"
      :data-input="recipe.input"
      @click="$emit('cook', recipe.input)"
    >
      {{ labels[recipe.input] }}
    </button>
  </section>
</template>
