<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { cook } from './core/cook'
import { craft } from './core/craft'
import type { BuildingId } from './core/defs'
import { transfer, type TransferWay } from './core/inventory'
import type { State } from './core/state'
import { sleep } from './core/time'
import { buy, sell } from './core/trade'
import BuildMenu from './hud/BuildMenu.vue'
import CampfirePanel from './hud/CampfirePanel.vue'
import Clock from './hud/Clock.vue'
import OvenPanel from './hud/OvenPanel.vue'
import Hotbar from './hud/Hotbar.vue'
import InventoryPanel from './hud/InventoryPanel.vue'
import SkillPanel from './hud/SkillPanel.vue'
import SleepConfirm from './hud/SleepConfirm.vue'
import StoragePanel from './hud/StoragePanel.vue'
import TradePanel from './hud/TradePanel.vue'
import Vitals from './hud/Vitals.vue'
import { createGame, type GameApi } from './world/game'

const host = ref<HTMLElement | null>(null)
const state = ref<State | null>(null)
const inventoryOpen = ref(false)
const buildOpen = ref(false)
const buildPlan = ref<BuildingId | null>(null)
const warehouseId = ref<string | null>(null)
const campfireId = ref<string | null>(null)
const ovenId = ref<string | null>(null)
const merchantId = ref<string | null>(null)
const bedAsk = ref(0)
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
      warehouseId.value = null
      campfireId.value = null
      ovenId.value = null
      merchantId.value = null
    },
    onBuildDone: () => {
      buildPlan.value = null
    },
    onWarehouse: (id) => {
      warehouseId.value = id
      campfireId.value = null
      ovenId.value = null
      merchantId.value = null
      buildOpen.value = false
    },
    onCampfire: (id) => {
      campfireId.value = id
      ovenId.value = null
      warehouseId.value = null
      merchantId.value = null
      buildOpen.value = false
    },
    onOven: (id) => {
      ovenId.value = id
      campfireId.value = null
      warehouseId.value = null
      merchantId.value = null
      buildOpen.value = false
    },
    onTrade: (id) => {
      merchantId.value = id
      warehouseId.value = null
      campfireId.value = null
      ovenId.value = null
      buildOpen.value = false
    },
    onBed: () => {
      bedAsk.value += 1
    },
    onCampfireClose: () => {
      campfireId.value = null
    },
    onOvenClose: () => {
      ovenId.value = null
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

function onTransfer(itemId: string, way: TransferWay) {
  if (!state.value || !api || !warehouseId.value) return
  api.apply(transfer(state.value, warehouseId.value, itemId, 1, way))
}

function onCook(input: string) {
  if (!state.value || !api || !campfireId.value) return
  api.apply(cook(state.value, campfireId.value, input))
}

function onBake(input: string) {
  if (!state.value || !api || !ovenId.value) return
  api.apply(cook(state.value, ovenId.value, input))
}

function onBuy(itemId: string) {
  if (!state.value || !api || !merchantId.value) return
  api.apply(buy(state.value, merchantId.value, itemId))
}

function onSell(itemId: string) {
  if (!state.value || !api || !merchantId.value) return
  api.apply(sell(state.value, merchantId.value, itemId))
}

function onSleep() {
  if (!state.value || !api) return
  const next = sleep(state.value)
  bedAsk.value = 0
  if (next === state.value) return
  api.rest(next)
}

function declineSleep() {
  bedAsk.value = 0
}
</script>

<template>
  <div id="game" ref="host"></div>
  <div v-if="state" class="hud">
    <Clock :state="state" />
    <Vitals :state="state" />
    <SkillPanel :state="state" />
    <InventoryPanel
      v-if="inventoryOpen"
      :state="state"
      @craft="onCraft"
      @close="inventoryOpen = false"
    />
    <BuildMenu v-if="buildOpen" @choose="onChoose" @close="buildOpen = false" />
    <StoragePanel
      v-if="warehouseId"
      :state="state"
      :warehouse-id="warehouseId"
      @transfer="onTransfer"
      @close="warehouseId = null"
    />
    <CampfirePanel
      v-if="campfireId"
      :state="state"
      :campfire-id="campfireId"
      @cook="onCook"
      @close="campfireId = null"
    />
    <OvenPanel
      v-if="ovenId"
      :state="state"
      :oven-id="ovenId"
      @cook="onBake"
      @close="ovenId = null"
    />
    <TradePanel
      v-if="merchantId"
      :state="state"
      :merchant-id="merchantId"
      @buy="onBuy"
      @sell="onSell"
      @close="merchantId = null"
    />
    <SleepConfirm v-if="bedAsk > 0" :key="bedAsk" @sleep="onSleep" @decline="declineSleep" />
    <p v-if="buildPlan" class="build-hint" :data-building="buildPlan">
      마우스로 위치를 고르고 클릭하세요. 우클릭으로 취소합니다.
    </p>
    <Hotbar :state="state" :open="inventoryOpen" @toggle="inventoryOpen = !inventoryOpen" />
    <div v-if="state.survival.health <= 0" class="game-over">
      <p>게임 오버</p>
    </div>
  </div>
</template>
