<script setup lang="ts">
import { buildingIds, type BuildingId } from '../core/defs'
import { buildingIcon, buildingLabel } from './buildings'

defineEmits<{
  choose: [buildingId: BuildingId]
  close: []
}>()
</script>

<template>
  <section class="build-menu" aria-label="건설">
    <header>
      <h2>건설</h2>
      <button type="button" @click="$emit('close')">닫기</button>
    </header>
    <p>고른 건물이 마우스를 따라갑니다.</p>
    <div class="choices">
      <button
        v-for="id in buildingIds"
        :key="id"
        type="button"
        :data-building="id"
        @click="$emit('choose', id)"
      >
        <img :src="buildingIcon(id)" alt="" />
        {{ buildingLabel(id) }}
      </button>
    </div>
  </section>
</template>
