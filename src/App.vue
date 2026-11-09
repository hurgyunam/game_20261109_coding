<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { craft } from './core/craft'
import type { State } from './core/state'
import Hotbar from './hud/Hotbar.vue'
import InventoryPanel from './hud/InventoryPanel.vue'
import { createGame, type GameApi } from './world/game'

const host = ref<HTMLElement | null>(null)
const state = ref<State | null>(null)
const inventoryOpen = ref(false)
let game: { destroy: (removeCanvas: boolean) => void } | null = null
let api: GameApi | null = null

onMounted(() => {
  if (!host.value) return
  game = createGame(host.value, {
    onState: (next) => {
      state.value = next
    },
    bind: (bound) => {
      api = bound
    },
  })
})

onBeforeUnmount(() => {
  game?.destroy(true)
  game = null
  api = null
})

function onCraft(recipeId: string) {
  if (!state.value || !api) return
  api.apply(craft(state.value, recipeId))
}
</script>

<template>
  <div id="game" ref="host"></div>
  <div v-if="state" class="hud">
    <InventoryPanel
      v-if="inventoryOpen"
      :state="state"
      @craft="onCraft"
      @close="inventoryOpen = false"
    />
    <Hotbar :state="state" :open="inventoryOpen" @toggle="inventoryOpen = !inventoryOpen" />
  </div>
</template>
