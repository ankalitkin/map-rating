<template>
  <div>
    <l-map ref="map" style="width: 800px; height: 600px">
      <l-tile-layer
          :url="tileProvider.url"
          :attribution="tileProvider.attribution"
      />
    </l-map>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import {Component} from "vue-property-decorator";
import {LMap, LTileLayer} from "vue2-leaflet"

@Component({
  components: {LMap, LTileLayer}
})
export default class Home extends Vue {
  private tileProvider = {
    attribution: '&copy; <a target="_blank" href="http://osm.org/copyright">OpenStreetMap</a> contributors',
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  };

}
</script>
