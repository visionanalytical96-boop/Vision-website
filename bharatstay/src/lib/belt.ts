/**
 * The Badlapur–Karjat area the service covers today. These landmarks give
 * people something to pick when the browser cannot get a location fix, and
 * they bound the live map.
 */
export const BELT_LANDMARKS: { label: string; lat: number; lng: number }[] = [
  { label: 'Badlapur Station (East)', lat: 19.1551, lng: 73.2661 },
  { label: 'Badlapur Station (West)', lat: 19.1558, lng: 73.2612 },
  { label: 'Katrap Naka, Badlapur', lat: 19.1613, lng: 73.2743 },
  { label: 'Kulgaon, Badlapur West', lat: 19.1668, lng: 73.2585 },
  { label: 'Manjarli, Badlapur West', lat: 19.1489, lng: 73.2521 },
  { label: 'Shirgaon, Badlapur East', lat: 19.1421, lng: 73.2856 },
  { label: 'Kondeshwar Temple Road', lat: 19.1452, lng: 73.2831 },
  { label: 'Barvi Dam Road', lat: 19.2352, lng: 73.3033 },
  { label: 'Ambernath Station', lat: 19.2094, lng: 73.1854 },
  { label: 'Vangani Station', lat: 19.1152, lng: 73.3431 },
  { label: 'Shelu Station', lat: 19.0733, lng: 73.3286 },
  { label: 'Neral Station', lat: 19.0331, lng: 73.3172 },
  { label: 'Bhivpuri Road Station', lat: 18.9663, lng: 73.3531 },
  { label: 'Karjat Station', lat: 18.9107, lng: 73.3233 },
  { label: 'Kadav, Karjat', lat: 18.9215, lng: 73.3402 },
  { label: 'Kondivade, Karjat', lat: 18.9486, lng: 73.3762 },
];

/** Bounding box used by the live map, with a little padding around the belt. */
export const BELT_BOUNDS = { minLat: 18.87, maxLat: 19.27, minLng: 73.14, maxLng: 73.42 };

export const inBelt = (lat: number, lng: number) =>
  lat >= BELT_BOUNDS.minLat && lat <= BELT_BOUNDS.maxLat && lng >= BELT_BOUNDS.minLng && lng <= BELT_BOUNDS.maxLng;

/** Projects a coordinate into the live map's 1000×760 drawing space. */
export const projectBelt = (lat: number, lng: number, w = 1000, h = 760) => ({
  x: ((lng - BELT_BOUNDS.minLng) / (BELT_BOUNDS.maxLng - BELT_BOUNDS.minLng)) * w,
  y: h - ((lat - BELT_BOUNDS.minLat) / (BELT_BOUNDS.maxLat - BELT_BOUNDS.minLat)) * h,
});
