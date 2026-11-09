<script setup lang="ts">
import type { State } from '../core/state'
import { itemIcon, itemLabel } from './items'

defineProps<{
  state: State
  open: boolean
}>()

defineEmits<{
  toggle: []
}>()
</script>

<template>
  <div class="hotbar">
    <p class="hand">핸드 {{ state.inventory.hand }}</p>
    <div class="slots">
      <div
        v-for="(slot, index) in state.inventory.slots"
        :key="index"
        class="slot"
        :class="{ selected: state.inventory.hand === index + 1 }"
        :data-slot="index + 1"
        :data-selected="state.inventory.hand === index + 1"
        :data-item="slot?.itemId ?? ''"
        :data-count="slot?.count ?? 0"
      >
        <span class="index">{{ index + 1 }}</span>
        <template v-if="slot">
          <img :src="itemIcon(slot.itemId)" :alt="itemLabel(slot.itemId)" />
          <span class="count">{{ slot.count }}</span>
        </template>
      </div>
    </div>
    <button type="button" class="bag" :aria-pressed="open" @click="$emit('toggle')">제작</button>
  </div>
</template>
