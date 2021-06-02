import {BBox, LifeCase, OverpassElem, XY} from "@/views/Types";
import Preferences from "@/views/Preferences";
import {overpass, OverpassJson} from "overpass-ts";
import {LatLngTuple} from "leaflet";
import haversine from "haversine";
import {kdTree} from "kd-tree-javascript";


export default class MapService {
    private static amenitiesList: Record<string, XY[]> = {};
    private static amenitiesTree: Record<string, kdTree<XY>> = {};
    private static calcCache = {
        metersPerLatDeg: 0,
        metersPerLngDeg: 0,
    }

    private static getCachedQuery(): string | null {
        return localStorage.getItem("cachedQuery");
    }

    public static async loadAmenities(bbox: BBox): Promise<void> {
        const acceptedToSave = ["amenity", "shop", "healthcare", "highway"];
        const overpassData = await MapService.queryData(bbox);
        const amenitiesList: Record<string, XY[]> = {}
        const amenitiesTree: Record<string, kdTree<XY>> = {}
        MapService.cacheDistances(bbox);
        overpassData.elements.forEach(next => {
            const el = next as unknown as OverpassElem;
            const tags = el.tags as Record<string, string>;
            Object.keys(tags).filter(key => acceptedToSave.indexOf(key) >= 0).forEach(key => {
                tags[key].split(/[;, ]/).forEach(value => {
                    const tag = `${key}: ${value}`;
                    Object.keys(Preferences.groups).forEach(groupName => {
                        if (Preferences.groups[groupName].tags.indexOf(tag) >= 0) {
                            if (!(groupName in amenitiesList)) {
                                amenitiesList[groupName] = [];
                            }
                            const xy = MapService.getXY(MapService.getLatLng(el));
                            amenitiesList[groupName].push(xy);
                        }
                    });
                });
            });
        });
        const metric = (a: XY, b: XY) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
        Object.keys(amenitiesList).forEach(tag => {
            if (amenitiesList[tag].length > 4000) {
                amenitiesTree[tag] = new kdTree<XY>(amenitiesList[tag], metric, ['x', 'y']);
            }
        });
        MapService.amenitiesList = amenitiesList;
        MapService.amenitiesTree = amenitiesTree;
    }

    public static cacheDistances(bounds: BBox): void {
        const options: haversine.Options = {unit: 'meter', format: '[lat,lon]'}
        MapService.calcCache.metersPerLatDeg =
            haversine([bounds[0], bounds[1]], [bounds[2], bounds[1]], options) / (bounds[2] - bounds[0]);
        MapService.calcCache.metersPerLngDeg =
            haversine([bounds[0], bounds[1]], [bounds[0], bounds[3]], options) / (bounds[3] - bounds[1]);
    }

    private static createQuery(bbox: BBox): string {
        const acceptedAmenityTags = ["amenity", "shop", "healthcare"];
        const keys: string[] = [];
        const values: string[] = [];
        let query = `[out:json][bbox:${bbox.join(",")}];(\n`;
        Object.keys(Preferences.groups)
            .flatMap(groupName => Preferences.groups[groupName])
            .flatMap(group => group.tags)
            .forEach(tag => {
                const colon = tag.indexOf(':');
                const key = tag.substring(0, colon).trim();
                if (acceptedAmenityTags.indexOf(key) < 0) {
                    const tagCond = tag.replace(":", "=").replace(" ", "");
                    query += `node[${tagCond}];\n`
                    return;
                }
                if (keys.indexOf(key) < 0) {
                    keys.push(key)
                }
                const value = tag.substring(colon + 1).trim();
                if (values.indexOf(value) < 0) {
                    values.push(value)
                }
            });
        const cond = `~"^(${keys.join('|')})$"~"^(${values.join('|')})$"`;
        query += `node[${cond}];\n`;
        query += `way[${cond}];\n`
        query += `relation[${cond}];\n`
        query += ");out center;";
        return query;
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

    public static getAverageRatingList(lifeCase: LifeCase, latLng: LatLngTuple): number {
        const sum = lifeCase.groupsNames
            .filter(groupName => groupName in MapService.amenitiesList)
            .map(groupName => MapService.getRatingByGroupNameList(groupName, latLng))
            .reduce((a, b) => a + b, 0);
        return sum / lifeCase.groupsNames.length;
    }

    public static getAverageRatingTree(lifeCase: LifeCase, latLng: LatLngTuple): number {
        const sum = lifeCase.groupsNames
            .filter(groupName => groupName in MapService.amenitiesTree)
            .map(groupName => MapService.getRatingByGroupNameTree(groupName, latLng))
            .reduce((a, b) => a + b, 0);
        return sum / lifeCase.groupsNames.length;
    }

    public static getAverageRating(lifeCase: LifeCase, latLng: LatLngTuple): number {
        const sum = lifeCase.groupsNames
            .filter(groupName => groupName in MapService.amenitiesList)
            .map(groupName => {
                const func = groupName in this.amenitiesTree ?
                    MapService.getRatingByGroupNameTree :
                    MapService.getRatingByGroupNameList;
                return func(groupName, latLng);
            })
            .reduce((a, b) => a + b, 0);
        return sum / lifeCase.groupsNames.length;
    }

    private static async queryData(bbox: BBox): Promise<OverpassJson> {
        const loadQuery = MapService.createQuery(bbox);
        if (MapService.getCachedQuery() === loadQuery) {
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

    private static calcTimeMinutes(distance: number): number {
        return distance / 5000 * 60;
    }

    private static calcRating(time: number): number {
        if (time < 2.5) {
            return 5;
        }
        return 12.5 / time;
    }

    private static getXY(latLng: LatLngTuple): XY {
        return {
            x: latLng[1] * MapService.calcCache.metersPerLngDeg,
            y: latLng[0] * MapService.calcCache.metersPerLatDeg
        };
    }

    private static getMinimalDistanceMetersTree(data: kdTree<XY>, lanLng: LatLngTuple): number {
        const nearest = data.nearest(MapService.getXY(lanLng), 1);
        return Math.sqrt(nearest[0][1]);
    }

    private static getMinimalDistanceMetersList(data: XY[], latLng: LatLngTuple): number {
        let minRes = Infinity;
        const xy = MapService.getXY(latLng);
        data.forEach(pos => {
            const d = (pos.x - xy.x) ** 2 + (pos.y - xy.y) ** 2;
            if (d < minRes) {
                minRes = d;
            }
        });
        return Math.sqrt(minRes);
    }

    private static getRatingByGroupNameList(groupName: string, latLng: LatLngTuple): number {
        const data = MapService.amenitiesList[groupName];
        const distance = MapService.getMinimalDistanceMetersList(data, latLng);
        const time = MapService.calcTimeMinutes(distance);
        return MapService.calcRating(time);
    }

    private static getRatingByGroupNameTree(groupName: string, latLng: LatLngTuple): number {
        const treeData = MapService.amenitiesTree[groupName];
        const distance = MapService.getMinimalDistanceMetersTree(treeData, latLng);
        const time = MapService.calcTimeMinutes(distance);
        return MapService.calcRating(time);
    }
}
