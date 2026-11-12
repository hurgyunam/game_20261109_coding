<script setup lang="ts">
import { computed } from 'vue'
import { tradeItemIds } from '../core/defs'
import type { State } from '../core/state'
import { offer } from '../core/trade'
import { itemIcon, itemLabel } from './items'

const props = defineProps<{
  state: State
  merchantId: string
}>()

defineEmits<{
  buy: [itemId: string]
  sell: [itemId: string]
  close: []
}>()

const goods = computed(() =>
  tradeItemIds.flatMap((id) => {
    const quoted = offer(id)
    if (!quoted) return []
    const count = props.state.inventory.slots.reduce(
      (sum, slot) => (slot?.itemId === id ? sum + slot.count : sum),
      0,
    )
    return [{ ...quoted, count }]
  }),
)
</script>

<template>
  <section class="trade" aria-label="거래" :data-merchant="merchantId">
    <header>
      <h2>거래</h2>
      <button type="button" @click="$emit('close')">닫기</button>
    </header>
    <p class="silver" :data-silver="state.silver">은화 {{ state.silver }}</p>
    <ul class="items">
      <li
        v-for="good in goods"
        :key="good.itemId"
        :data-item="good.itemId"
        :data-buy="good.buy"
        :data-sell="good.sell"
        :data-count="good.count"
      >
        <img :src="itemIcon(good.itemId)" :alt="itemLabel(good.itemId)" />
        <span class="meta">
          <span>{{ itemLabel(good.itemId) }}</span>
          <span class="price">구매 {{ good.buy }} · 판매 {{ good.sell }} · 보유 {{ good.count }}</span>
        </span>
        <span class="actions">
          <button type="button" data-action="buy" @click="$emit('buy', good.itemId)">사기</button>
          <button type="button" data-action="sell" @click="$emit('sell', good.itemId)">팔기</button>
        </span>
      </li>
    </ul>
  </section>
</template>
