<template>
  <div>
    <div id="map" style="height: 800px"/>
    <v-btn @click="paint" :disabled="false">Раскрасить карту</v-btn>
    {{ state }}
  </div>
</template>
<script lang="ts">
import Vue from 'vue'
import {Component} from "vue-property-decorator";
import * as L from 'leaflet';
import {BBox, LifeCase} from "@/views/Types";
import MapService from "@/views/MapService";
import Preferences from "@/views/Preferences";
import OverlayDrawer from "@/components/OverlayDrawer";

@Component({})
export default class Home extends Vue {
  private map!: L.Map;
  private center: L.LatLngTuple = [51.6618, 39.2020];
  private lastOverlay: L.ImageOverlay | null = null;
  private zoom = 13;
  private state = "Готов"

  private tileProvider = {
    attribution: '&copy; <a target="_blank" href="https://osm.org/copyright">OpenStreetMap</a> contributors',
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  };

  mounted(): void {
    this.map = L.map("map").setView(this.center, this.zoom);
    L.tileLayer(this.tileProvider.url, {attribution: this.tileProvider.attribution}).addTo(this.map);
    this.map.on('click', (e: { latlng: L.LatLng }) => {
      const pos: L.LatLngTuple = [e.latlng.lat, e.latlng.lng];
      const rList = MapService.getAverageRatingList(Preferences.cases[0], pos);
      L.popup()
          .setLatLng(e.latlng)
          .setContent('<b>Рейтинг: </b>' + rList.toFixed(3))
          .openOn(this.map);
    })
  }

  private async paint(): Promise<void> {
    try {
      this.state = "Загрузка данных";
      await MapService.loadAmenities(this.bbox());
    } catch (e) {
      console.error(e);
      this.state = "Произошла ошибка при загрузке данных";
    }

    const selectedCase = Preferences.cases[0];

    try {
      this.state = "Предварительная отрисовка";
      await this.draw(100, 100, selectedCase);

      this.state = "Финальная отрисовка";
      await this.draw(256, 256, selectedCase);

      this.state = "Готов"
    } catch (e) {
      console.error(e);
      this.state = "Произошла ошибка при отрисовке данных";
    }
  }

  private async draw(width: number, height: number, selectedCase: LifeCase): Promise<void> {
    const bbox = this.bbox();
    const imageBounds: L.LatLngBoundsExpression = [[bbox[0], bbox[1]], [bbox[2], bbox[3]]];
    const canvas: HTMLCanvasElement = await new Promise(resolve => setTimeout(() => {
      resolve(OverlayDrawer.drawRating(bbox, width, height, selectedCase));
    }));
    if (this.lastOverlay) {
      this.lastOverlay.removeFrom(this.map);
    }
    this.lastOverlay = L.imageOverlay(canvas.toDataURL(), imageBounds, {opacity: 0.5}).addTo(this.map);
  }

  private bbox(): BBox {
    const bounds = this.map.getBounds();
    return [bounds.getSouth(), bounds.getWest(), bounds.getNorth(), bounds.getEast()];
  }

}

</script>
