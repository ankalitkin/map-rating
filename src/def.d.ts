import * as L from "leaflet";

declare module 'leaflet' {
    export type IdwLatLngTuple = [number, number, number];

    export interface ColorGradientConfig {
        [key: number]: string;
    }

    export interface IdwLayerOptions {
        opacity?: number;
        max?: number;
        cellSize?: number;
        exp?: number;
        gradient?: ColorGradientConfig;
    }

    export interface IdwLayer extends L.TileLayer {
        setOptions(options: HeatMapOptions): IdwLayer;
        addLatLng(latlng: L.LatLng | IdwLatLngTuple): IdwLayer;
        setLatLngs(latlngs: Array<L.LatLng | IdwLatLngTuple>): IdwLayer;
    }

    export function idwLayer(latlngs: Array<L.LatLng | IdwLatLngTuple>, options: IdwLayerOptions): IdwLayer;
}
