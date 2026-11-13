<script setup lang="ts">
defineEmits<{
  sleep: []
  decline: []
}>()
</script>

<template>
  <section class="sleep" role="dialog">
    <p>취침하시겠습니까?</p>
    <div class="choices">
      <button type="button" data-action="sleep" @click="$emit('sleep')">취침</button>
      <button type="button" data-action="decline" @click="$emit('decline')">아니오</button>
    </div>
  </section>
</template>
