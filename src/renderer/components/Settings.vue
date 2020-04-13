<template>
  <div class="settings">
    <ul class="toolbar" style="padding:.5rem">
      <li>
        <a @click="showSettings = true" ><i class="mdi mdi-settings"/></a>
      </li>
      <li>
        <a @click="showHelp = true" v-shortkey.push="['f1']" @shortkey="showHelp = true"><i class="mdi mdi-help"/></a>
      </li>
    </ul>

    <b-modal :active.sync="showSettings"
    has-modal-card full-screen :can-cancel="true">
    <SettingsModal />
  </b-modal>

  <b-modal :active.sync="showHelp"
has-modal-card full-screen :can-cancel="true">
  <HelpModal/>
</b-modal>


</div>
</template>

<script>
import HelpModal from '../components/HelpModal.vue';
import SettingsModal from '../components/SettingsModal.vue';

export default {
  components: {
    HelpModal, SettingsModal
  },
  data() {
    return {
      showSettings: false,
      showHelp: false,
    }
  },
  methods: {

  }
}
</script>

<style scoped>
.settings{
  margin-top: auto;
  /* padding: 1rem; */
  /* background-color: rgba(0, 0, 0, 0.3); */
  margin-bottom: 1.5rem;
}

.modal{
  margin-top: 24px;
  border: 0px;
}

.toolbar {
  list-style-type: none;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

.toolbar li {
  float: left;
  margin-left: 0.3rem;
  margin-right: 0.3rem;
  font-size: 1.25rem;
}

.toolbar li a {
  display: block;
  color: white;
  text-align: center;
  text-decoration: none;
}

.toolbar li a:hover {
  opacity: 0.5;
}
</style>
