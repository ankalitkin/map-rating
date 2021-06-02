import {BBox, LifeCase} from "@/views/Types";
import MapService from "@/views/MapService";
import {LatLngTuple} from "leaflet";

export default class OverlayDrawer {
    private static colors = [
        'transparent',
        'blue',
        'cyan',
        'lime',
        'yellow',
        'orange',
        'red'
    ];
    private static defaultGradient = OverlayDrawer.colors.reduce((dictionary, currentValue, currentIndex, array) => {
        dictionary[currentIndex / (array.length - 1)] = currentValue;
        return dictionary;
    }, {} as Record<number, string>);

    private static _grad = OverlayDrawer.gradient();

    private static gradient(grad: Record<number, string> = this.defaultGradient) {
        // create a 256x1 gradient that we'll use to turn a grayscale heatmap into a colored one
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error("Canvas error");
        }
        const gradient = ctx.createLinearGradient(0, 0, 0, 256);

        canvas.width = 1;
        canvas.height = 256;

        Object.keys(grad).forEach(pos => gradient.addColorStop(+pos, grad[+pos]));

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1, 256);

        return ctx.getImageData(0, 0, 1, 256).data;
    }

    public static drawRating(bounds: BBox, width: number, height: number, lifeCase: LifeCase): HTMLCanvasElement {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error("Canvas error");
        }
        const imageData = new ImageData(width, height);
        const data = imageData.data;
        const bottom = bounds[0];
        const left = bounds[1];
        const top = bounds[2];
        const right = bounds[3];
        const dLat = (top - bottom) / 2 / height;
        const dLng = (right - left) / 2 / width;
        let counter = 0;
        MapService.cacheDistances(bounds);
        for (let lat = top - dLat, i = 0; i < height; i++, lat -= 2 * dLat) {
            for (let lng = left + dLng, j = 0; j < width; j++, lng += 2 * dLng) {
                const rating = MapService.getAverageRating(lifeCase, [lat, lng] as LatLngTuple);
                const r = Math.trunc(Math.max(0, Math.min(255, rating / 5 * 255)));
                const r4 = 4 * r;
                data[counter++] = this._grad[r4];
                data[counter++] = this._grad[r4 + 1];
                data[counter++] = this._grad[r4 + 2];
                data[counter++] = this._grad[r4 + 3];
            }
        }
        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }
}
