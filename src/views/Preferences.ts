import {AmenityGroup, LifeCase} from "@/views/Types";

export default class Preferences {
    public static groups: Record<string, AmenityGroup> = {
        "grocery": {
            name: "Магазины и рынки",
            tags: [
                "shop: convenience",
                "shop: supermarket",
                "amenity: marketplace",
            ]
        },
        "pharmacy": {
            name: "Аптеки",
            tags: [
                "amenity: pharmacy",
                "healthcare: pharmacy",
            ]
        },
        "food": {
            name: "Кафе и быстрое питание",
            tags: [
                "amenity: fast_food",
                "amenity: cafe",
            ]
        },
        "kindergarten": {
            name: "Детские сады",
            tags: [
                "amenity: kindergarten",
            ]
        },
        "school": {
            name: "Школы",
            tags: [
                "amenity: school",
            ]
        },
        "clinic": {
            name: "Больницы и поликлиники",
            tags: [
                "amenity: clinic",
                "amenity: hospital",
                "amenity: doctor",
                "amenity: doctors",
                "healthcare: clinic",
                "healthcare: hospital",
                "healthcare: doctor",
                "healthcare: doctors",
                "healthcare: centre",
            ]
        },
        "hairdresser": {
            name: "Парикмахерские",
            tags: [
                "shop: hairdresser",
            ]
        },
        "cinema": {
            name: "Кино",
            tags: [
                "amenity: cinema",
            ]
        },
        "pub": {
            name: "Пабы и бары",
            tags: [
                "amenity: pub",
                "amenity: bar",
            ]
        },
        "nightclub": {
            name: "Ночные клубы",
            tags: [
                "amenity: nightclub",
            ]
        },
    }

    public static cases: LifeCase[] = [
        {
            name: "Семьянин",
            groupsNames: [
                "grocery",
                "pharmacy",
                "clinic",
                "kindergarten",
                "school",
                "hairdresser",
            ]
        },
        {
            name: "Ответственный студент",
            groupsNames: [
                "grocery",
                "pharmacy",
                "clinic",
                "food",
            ]
        },
        {
            name: "Безответственный студент",
            groupsNames: [
                "grocery",
                "pharmacy",
                "clinic",
                "food",
                "cinema",
                "pub",
                "nightclub",
            ]
        },
    ]
}

