<template>
  <v-app>
    <v-main>
      <Home/>
    </v-main>
  </v-app>
</template>

<script lang="ts">
import Vue from 'vue';
import {Component} from "vue-property-decorator";
import Home from "@/views/Home.vue";

@Component({
  components: {Home},
})
export default class App extends Vue {

}
</script>
<style>
@import '~@mdi/font/css/materialdesignicons.css';
@import "~typeface-roboto-multilang/latin-ext.css";
@import "~typeface-roboto-multilang/cyrillic-ext.css";
@import "~leaflet/dist/leaflet.css";

.v-btn, .v-tab {
  text-transform: none !important;
  font-size: 1rem !important;
  letter-spacing: normal !important;
  font-weight: normal !important;
}

.v-btn::before {
  background-color: gray;
}
</style>



