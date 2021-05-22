<template>
  <div>
    <div id="map" style="width: 1200px; height: 900px"/>
    <v-btn @click="doSth" :disabled="false">Paint map</v-btn>
    <pre v-html="countResult"/>{{zoom}}
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import {Component} from "vue-property-decorator";
import * as L from 'leaflet';
import {LatLngTuple} from 'leaflet';
import {BBox} from "@/views/Types";
import 'leaflet.heat'
import MapService from "@/views/MapService";
import Preferences from "@/views/Preferences";

@Component({})
export default class Home extends Vue {
  private map!: L.Map;
  private center: LatLngTuple = [51.6618, 39.2020];
  private delta = 0.1;
  private bbox: BBox = [this.center[0] - this.delta, this.center[1] - this.delta, this.center[0] + this.delta, this.center[1] + this.delta];
  private zoom = 13;
  private countResult = "";

  created(): void {
    MapService.loadAmenities(this.bbox).catch(e => {console.error(e); alert("Произошла ошибка при загрузке")});
  }

  mounted(): void {
    this.map = L.map("map").setView(this.center, this.zoom);
    L.tileLayer(this.tileProvider.url, {attribution: this.tileProvider.attribution}).addTo(this.map);
    this.map.on('click', (e: { latlng: L.LatLng }) => {
      const pos: LatLngTuple = [e.latlng.lat, e.latlng.lng];
      const rating = MapService.getAverageRating(Preferences.cases[0], pos);
      L.popup()
          .setLatLng(e.latlng)
          .setContent('<b>Rating: </b>' + rating)
          .openOn(this.map);
    })
  }

  private tileProvider = {
    attribution: '&copy; <a target="_blank" href="http://osm.org/copyright">OpenStreetMap</a> contributors',
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  };

  private doSth(): void {
    console.log("Started painting");
    const heatData: L.HeatLatLngTuple[] = [];
    const bottom = this.bbox[0];
    const left = this.bbox[1];
    const top = this.bbox[2];
    const right = this.bbox[3];
    const number = 250;
    const dlat = (top - bottom) / number;
    const dlng = (right - left) / number;
    MapService.cacheDistances(this.center, this.delta);
    //const radius = haversineDistance(this.center, [this.center[0], this.center[1] + this.delta / number])/3;
    //console.log(radius);
    for(let lat = bottom; lat <= top; lat+=dlat) {
      for (let lng = left; lng <= right; lng += dlng) {
        const rating = MapService.getAverageRating(Preferences.cases[0], [lat, lng] as LatLngTuple);
        heatData.push([lat, lng, rating]);
      }
    }
    L.heatLayer(heatData, {radius: 20, max: 5, blur: 50}).addTo(this.map);
    console.log("Ended painting");
  }


}

</script>
