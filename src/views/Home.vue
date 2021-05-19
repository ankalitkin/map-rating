<template>
  <div>
    <div id="map" style="width: 800px; height: 600px"/>
    <v-btn @click="doSth">Count amenities</v-btn>
    <pre v-html="countResult"/>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import {Component} from "vue-property-decorator";
import * as L from 'leaflet';
import {LatLngTuple} from 'leaflet';
import {overpass, OverpassJson} from "overpass-ts";

@Component({})
export default class Home extends Vue {
  private map!: L.Map;
  private center = [51.6618, 39.2020];
  private delta = 0.1;
  private bbox = [this.center[0] - this.delta, this.center[1] - this.delta, this.center[0] + this.delta, this.center[1] + this.delta];
  private zoom = 13;
  private countResult = "";

  mounted(): void {
    this.map = L.map("map").setView(this.center as LatLngTuple, this.zoom);
    L.tileLayer(this.tileProvider.url, {attribution: this.tileProvider.attribution}).addTo(this.map);

  }

  private tileProvider = {
    attribution: '&copy; <a target="_blank" href="http://osm.org/copyright">OpenStreetMap</a> contributors',
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  };

  private doSth(): void {
    let query = `[out:json][bbox:${this.bbox.join(",")}];(node[amenity];way[amenity];relation[amenity];);out center;`;
    overpass(query).then(value => {
      const data = value as unknown as OverpassJson;
      const counter: Record<string, number> = {};
      data.elements.forEach(el => {
        const tags = el.tags as unknown as { amenity: string };
        let amenity = tags.amenity;
        if (!(amenity in counter)) {
          counter[amenity] = 0;
        }
        counter[amenity]++;
      });
      let entries = Object.entries(counter);
      entries.sort((a, b) => b[1] - a[1]);
      let out = "";
      entries.forEach(data => {
        out += data.join(": ")+"\r\n";
      });
      this.countResult = out;
    });
  }
}
</script>
