<script setup lang="ts">
import { computed } from 'vue'
import { defs, recipeIds } from '../core/defs'
import type { State } from '../core/state'
import { itemIcon, itemLabel } from './items'

const props = defineProps<{
  state: State
}>()

defineEmits<{
  craft: [recipeId: string]
  close: []
}>()

const carried = computed(() =>
  props.state.inventory.slots.flatMap((slot, index) =>
    slot ? [{ itemId: slot.itemId, count: slot.count, index: index + 1 }] : [],
  ),
)

const recipes = recipeIds.map((id) => ({
  id,
  result: defs.recipes[id].result,
}))
</script>

<template>
  <section class="inventory" aria-label="인벤토리">
    <header>
      <h2>인벤토리</h2>
      <button type="button" @click="$emit('close')">닫기</button>
    </header>
    <p class="silver" :data-silver="state.silver">은화 {{ state.silver }}</p>
    <p class="weight">총중량 {{ state.inventory.weight }} / 한도 {{ state.inventory.limit }}</p>
    <ul class="items">
      <li v-if="carried.length === 0">비어 있음</li>
      <li
        v-for="slot in carried"
        :key="slot.index"
        :data-slot="slot.index"
        :data-item="slot.itemId"
        :data-count="slot.count"
      >
        <span class="index">{{ slot.index }}</span>
        <img :src="itemIcon(slot.itemId)" :alt="itemLabel(slot.itemId)" />
        <span>{{ itemLabel(slot.itemId) }} × {{ slot.count }}</span>
      </li>
    </ul>
    <h3>제작</h3>
    <div class="recipes">
      <button v-for="recipe in recipes" :key="recipe.id" type="button" @click="$emit('craft', recipe.id)">
        <img :src="itemIcon(recipe.result.itemId)" alt="" />
        {{ itemLabel(recipe.result.itemId) }} 만들기
      </button>
    </div>
  </section>
</template>
