import {BBox, LifeCase, OverpassElem} from "@/views/Types";
import Preferences from "@/views/Preferences";
import {overpass, OverpassJson} from "overpass-ts";
import {LatLngTuple} from "leaflet";
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
            const cachedData = localStorage.getItem("cachedData");
            if (cachedData) {
                return JSON.parse(cachedData);
            }
        }
        const data = await overpass(loadQuery) as unknown as OverpassJson;
        try {
            localStorage.setItem("cachedQuery", loadQuery);
            localStorage.setItem("cachedData", JSON.stringify(data));
        } catch (e) {
            console.warn("Cannot save loaded data to cache");
            localStorage.removeItem("cachedQuery");
            localStorage.removeItem("cachedData");
        }
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
            return [element.lat, element.lon];
        }
        if (element.type === "way" || element.type === "relation") {
            if (!element.center) {
                throw new Error("No center data provided");
            }
            return [element.center.lat, element.center.lon];
        }
        throw new Error("Invalid element type");
    }

    private static getClosestPoint(data: OverpassElem[], latLng: LatLngTuple): LatLngTuple {
        let minRes = Infinity;
        let minPoint = this.getLatLng(data[0]);
        data.forEach(el => {
            const pos = this.getLatLng(el);
            const d = (pos[0] - latLng[0]) ** 2 + (pos[1] - latLng[1]) ** 2;
            if (d < minRes) {
                minRes = d;
                minPoint = pos;
            }
        });
        return minPoint;
    }

    public static cacheDistances(bounds: BBox): void {
        const options: haversine.Options = {unit: 'meter', format: '[lat,lon]'}
        this.calcCache.metersPerLatDeg =
            haversine([bounds[0], bounds[1]], [bounds[2], bounds[1]], options) / (bounds[2] - bounds[0]);
        this.calcCache.metersPerLngDeg =
            haversine([bounds[0], bounds[1]], [bounds[0], bounds[3]], options) / (bounds[3] - bounds[1]);
    }

    private static linearDistance(a: LatLngTuple, b: LatLngTuple) {
        const x = ((a[1] - b[1]) * this.calcCache.metersPerLngDeg) ** 2;
        const y = ((a[0] - b[0]) * this.calcCache.metersPerLatDeg) ** 2;
        return Math.sqrt(x + y);
    }

    private static getMinimalDistanceMeters(data: OverpassElem[], lanLng: LatLngTuple): number {
        const pos = this.getClosestPoint(data, lanLng);
        return this.linearDistance(pos, lanLng);
    }

    private static calcTimeMinutes(distance: number): number {
        return distance / 5000 * 60;
    }

    private static calcRating(time: number): number {
        if (time < 2.5) {
            return 5;
        }
        return 12.5 / time;
    }

    private static getRatingByGroupName(groupName: string, latLng: LatLngTuple): number {
        const data = this.amenities[groupName];
        const distance = this.getMinimalDistanceMeters(data, latLng);
        const time = this.calcTimeMinutes(distance);
        return this.calcRating(time);
    }

    public static getAverageRating(lifeCase: LifeCase, latLng: LatLngTuple): number {
        const sum = lifeCase.groupsNames
            .filter(groupName => groupName in this.amenities && this.amenities[groupName].length > 0)
            .map(groupName => this.getRatingByGroupName(groupName, latLng))
            .reduce((a, b) => a + b, 0);
        return sum / lifeCase.groupsNames.length;
    }

}
