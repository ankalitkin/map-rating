import {BBox, LifeCase, OverpassElem} from "@/views/Types";
import Preferences from "@/views/Preferences";
import {overpass, OverpassJson, OverpassRelation, OverpassWay} from "overpass-ts";
import {LatLngTuple} from "leaflet";
import {OverpassNode} from "overpass-ts/dist/types";
import haversine from "haversine";

export default class MapService {
    private static amenities: Record<string, OverpassElem[]> = {};
    private static calcCache = {
        metersPerLatDeg: 0,
        metersPerLngDeg: 0,
    }

    private static getCachedQuery(): string | null {
        return localStorage.getItem("cachedQuery");
    }

    private static async queryData(bbox: BBox): Promise<OverpassJson> {
        const loadQuery = this.createQuery(bbox);
        if (this.getCachedQuery() === loadQuery) {
            const data = localStorage.getItem("cachedData");
            if (data) {
                return JSON.parse(data);
            }
        }
        const data = await overpass(loadQuery) as unknown as OverpassJson;
        localStorage.setItem("cachedQuery", loadQuery);
        localStorage.setItem("cachedData", JSON.stringify(data));
        return data;
    }

    private static createQuery(bbox: BBox): string {
        let query = `[out:json][bbox:${bbox.join(",")}];(\n`;
        Object.keys(Preferences.groups).forEach(groupName => {
            Preferences.groups[groupName].tags.forEach(tag => {
                const cond = tag.replace(":", "=").replace(" ", "");
                query += `node[${cond}];way[${cond}];relation[${cond}];\n`
            });
        });
        query += ");out center;";
        return query;
    }

    public static async loadAmenities(bbox: BBox): Promise<void> {
        const acceptedTags = ["amenity", "shop", "healthcare"];
        const overpassData = await this.queryData(bbox);
        const amenities: Record<string, OverpassElem[]> = {}
        overpassData.elements.forEach(next => {
            const el = next as unknown as OverpassElem;
            const tags = el.tags as Record<string, string>;
            Object.keys(tags).filter(key => acceptedTags.indexOf(key) >= 0).forEach(key => {
                tags[key].split(/[;, ]/).forEach(value => {
                    const tag = `${key}: ${value}`;
                    Object.keys(Preferences.groups).forEach(groupName => {
                        if (Preferences.groups[groupName].tags.indexOf(tag) >= 0) {
                            if (!(groupName in amenities)) {
                                amenities[groupName] = [];
                            }
                            amenities[groupName].push(el);
                        }
                    });
                });
            });
        });
        MapService.amenities = amenities;
    }

    private static getLatLng(element: OverpassElem): LatLngTuple {
        if (element.type === "node") {
            const node = element as OverpassNode;
            return [node.lat, node.lon];
        }
        if (element.type === "way" || element.type === "relation") {
            const wr = element as OverpassWay | OverpassRelation;
            if (!wr.center) {
                throw "No center data provided";
            }
            return [wr.center.lat, wr.center.lon];
        }
        throw "Invalid element type";
    }

    private static getClosestPoint(data: OverpassElem[], latlng: LatLngTuple): LatLngTuple {
        let minres = Infinity;
        let minPoint = this.getLatLng(data[0]);
        data.forEach(el => {
            const pos = this.getLatLng(el);
            const d = (pos[0] - latlng[0]) ** 2 + (pos[1] - latlng[1]) ** 2;
            if (d < minres) {
                minres = d;
                minPoint = pos;
            }
        });
        return minPoint;
    }

    public static cacheDistances(center: LatLngTuple, delta: number): void {
        const options: haversine.Options = {unit: 'meter', format: '[lat,lon]'}
        this.calcCache.metersPerLatDeg =
            haversine([center[0]-delta, center[1]], [center[0]+delta, center[1]], options) / 2 / delta;
        this.calcCache.metersPerLngDeg =
            haversine([center[0], center[1]-delta], [center[0], center[1]+delta], options) / 2 / delta;
    }

    private static linearDistance(a: LatLngTuple, b: LatLngTuple) {
        const x = ((a[1]-b[1])*this.calcCache.metersPerLngDeg)**2;
        const y = ((a[0]-b[0])*this.calcCache.metersPerLatDeg)**2;
        return Math.sqrt(x+y);
    }

    private static getMinimalDistanceMeters(data: OverpassElem[], latlng: LatLngTuple): number {
        const pos = this.getClosestPoint(data, latlng);
        //return haversine(pos, latlng, {unit: 'meter', format: '[lat,lon]'});
        return this.linearDistance(pos, latlng);
    }

    private static calcTimeMinutes(distance: number): number {
        return distance / 5000 * 60;
    }

    private static calcRating(time: number): number {
        if (time < 2.5) {
            return 5;
        }
        //return 5 - Math.log2(time / 2.5);
        return 12.5/time;
        //return 5 - Math.log2(time/2.5);
    }

    private static getRatingByGroupName(groupName: string, latlng: LatLngTuple): number {
        const data = this.amenities[groupName];
        const distance = this.getMinimalDistanceMeters(data, latlng);
        const time = this.calcTimeMinutes(distance);
        return this.calcRating(time);
    }

    public static getAverageRating(lifecase: LifeCase, latlng: LatLngTuple): number {
        const sum = lifecase.groupsNames
            .filter(groupName => groupName in this.amenities && this.amenities[groupName].length > 0)
            .map(groupName => this.getRatingByGroupName(groupName, latlng))
            .reduce((a, b) => a + b);
        return sum / lifecase.groupsNames.length;
    }

}