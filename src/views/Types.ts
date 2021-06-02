import {OverpassNode} from "overpass-ts/dist/types";
import {OverpassRelation, OverpassWay} from "overpass-ts";

export type OverpassElem = OverpassNode | OverpassWay | OverpassRelation;
export type BBox = [number, number, number, number];
export type CalcCache = { metersPerLatDeg: number, metersPerLngDeg: number };

export interface AmenityGroup {
    name: string,
    tags: string[],
}

export interface LifeCase {
    name: string,
    groupsNames: string[],
}

export interface XY {
    x: number,
    y: number,
}
