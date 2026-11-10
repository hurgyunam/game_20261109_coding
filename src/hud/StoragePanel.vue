<script setup lang="ts">
import { computed } from 'vue'
import type { TransferWay } from '../core/inventory'
import type { State } from '../core/state'
import { itemIcon, itemLabel } from './items'

const props = defineProps<{
  state: State
  warehouseId: string
}>()

defineEmits<{
  transfer: [itemId: string, way: TransferWay]
  close: []
}>()

const warehouse = computed(() => {
  const building = props.state.buildings.find((item) => item.id === props.warehouseId)
  return building?.kind === 'warehouse' ? building : null
})

const carried = computed(() => props.state.inventory.slots.flatMap((slot) => (slot ? [slot] : [])))

const stored = computed(() =>
  warehouse.value ? warehouse.value.storage.slots.flatMap((slot) => (slot ? [slot] : [])) : [],
)
</script>

<template>
  <section class="storage" aria-label="창고" :data-building="warehouseId">
    <header>
      <h2>창고</h2>
      <button type="button" @click="$emit('close')">닫기</button>
    </header>
    <div v-if="warehouse" class="columns">
      <div>
        <h3>캐릭터</h3>
        <p class="weight" data-side="player">
          총중량 {{ state.inventory.weight }} / 한도 {{ state.inventory.limit }}
        </p>
        <ul class="items">
          <li v-if="carried.length === 0">비어 있음</li>
          <li
            v-for="slot in carried"
            :key="slot.itemId"
            data-side="player"
            :data-item="slot.itemId"
            :data-count="slot.count"
          >
            <img :src="itemIcon(slot.itemId)" :alt="itemLabel(slot.itemId)" />
            <span>{{ itemLabel(slot.itemId) }} × {{ slot.count }}</span>
            <button type="button" @click="$emit('transfer', slot.itemId, 'store')">넣기</button>
          </li>
        </ul>
      </div>
      <div>
        <h3>창고</h3>
        <p class="weight" data-side="storage" :data-limit="warehouse.storage.limit">
          총중량 {{ warehouse.storage.weight }} / 한도 {{ warehouse.storage.limit }}
        </p>
        <ul class="items">
          <li v-if="stored.length === 0">비어 있음</li>
          <li
            v-for="slot in stored"
            :key="slot.itemId"
            data-side="storage"
            :data-item="slot.itemId"
            :data-count="slot.count"
          >
            <img :src="itemIcon(slot.itemId)" :alt="itemLabel(slot.itemId)" />
            <span>{{ itemLabel(slot.itemId) }} × {{ slot.count }}</span>
            <button type="button" @click="$emit('transfer', slot.itemId, 'take')">꺼내기</button>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
