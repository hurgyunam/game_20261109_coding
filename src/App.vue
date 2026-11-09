<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { createGame } from './world/game'

const host = ref<HTMLElement | null>(null)
let game: { destroy: (removeCanvas: boolean) => void } | null = null

onMounted(() => {
  if (host.value) game = createGame(host.value)
})

onBeforeUnmount(() => {
  game?.destroy(true)
  game = null
})
</script>

<template>
  <div id="game" ref="host"></div>
</template>
