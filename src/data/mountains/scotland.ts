import type { Mountain } from "@/lib/types";

export const SCOTLAND: Mountain[] = [
  {
    id: "bennachie",
    name: "Bennachie",
    area: "Aberdeenshire",
    summit: { lat: 57.2908, lon: -2.5288, elevationM: 518 },
    trailhead: { name: "Bennachie Centre", lat: 57.2848, lon: -2.5023 },
    difficulty: "Easy",
    exposure: "medium",
    quality: 3,
    route: "Maiden Causeway to Mither Tap, then the ridge to Oxen Craig",
    walkingHours: "3–4 hrs · 10 km",
    stayNear: "Inverurie",
  },
  {
    id: "cairn-gorm",
    name: "Cairn Gorm & Ben Macdui",
    area: "Cairngorms",
    summit: { lat: 57.1167, lon: -3.6436, elevationM: 1245 },
    trailhead: { name: "Coire Cas car park", lat: 57.134, lon: -3.671 },
    difficulty: "Hard",
    exposure: "extreme",
    quality: 5,
    route: "Cairn Gorm across the plateau to Ben Macdui",
    walkingHours: "7–8 hrs · 18 km",
    stayNear: "Aviemore",
  },
];
