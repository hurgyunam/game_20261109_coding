<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { craft } from './core/craft'
import type { BuildingId } from './core/defs'
import type { State } from './core/state'
import BuildMenu from './hud/BuildMenu.vue'
import Hotbar from './hud/Hotbar.vue'
import InventoryPanel from './hud/InventoryPanel.vue'
import { createGame, type GameApi } from './world/game'

const host = ref<HTMLElement | null>(null)
const state = ref<State | null>(null)
const inventoryOpen = ref(false)
const buildOpen = ref(false)
const buildPlan = ref<BuildingId | null>(null)
let game: { destroy: (removeCanvas: boolean) => void } | null = null
let api: GameApi | null = null

onMounted(() => {
  if (!host.value) return
  game = createGame(host.value, {
    onState: (next) => {
      state.value = next
    },
    onInventory: () => {
      inventoryOpen.value = !inventoryOpen.value
    },
    onBuild: () => {
      if (buildPlan.value) return
      buildOpen.value = true
    },
    onBuildDone: () => {
      buildPlan.value = null
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

function onChoose(buildingId: BuildingId) {
  if (!api) return
  buildOpen.value = false
  buildPlan.value = buildingId
  api.beginBuild(buildingId)
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
    <BuildMenu v-if="buildOpen" @choose="onChoose" @close="buildOpen = false" />
    <p v-if="buildPlan" class="build-hint" :data-building="buildPlan">
      마우스로 위치를 고르고 클릭하세요. 우클릭으로 취소합니다.
    </p>
    <Hotbar :state="state" :open="inventoryOpen" @toggle="inventoryOpen = !inventoryOpen" />
  </div>
</template>
