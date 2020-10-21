<template>
  <div class="container">
    <TitleBar
      class="titlebar"
      :title="'iRacing Screenshot Tool'"
      :ico="'./static/icon.png'"
    />
    <RouterView />
  </div>
</template>

<script>
import Vue from 'vue';
import TitleBar from './components/TitleBar.vue';

export default Vue.extend({
  name: 'App',
  components: { TitleBar }
});
</script>

<style lang="scss"></style>
