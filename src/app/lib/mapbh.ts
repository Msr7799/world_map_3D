// Georeferenced Bahrain satellite imagery published by mapBH from USGS scans.
// Bounds and zoom ranges come from map.mapbh.org TileJSON; dates from mapBH's catalog.
export type BahrainImage = {
  id: string;
  date: string;
  bounds: [number, number, number, number];
  minZoom: number;
  maxZoom: number;
};

const images: BahrainImage[] = [
  {
    id: "1965-DS1022-1024DA",
    date: "1965-07-21",
    bounds: [50.31592177759606, 25.992419879995676, 50.84433841120202, 26.367456375349096],
    minZoom: 10,
    maxZoom: 16,
  },
  {
    id: "1967-Bahrain",
    date: "1967-02-08",
    bounds: [50.38901225802568, 26.049807713007215, 50.69344298121599, 26.4799926064959],
    minZoom: 12,
    maxZoom: 18,
  },
  {
    id: "1968-DS1104-1057DA",
    date: "1968-08-11",
    bounds: [50.28736849058433, 25.87315076034323, 50.93205352056785, 26.330034154359467],
    minZoom: 11,
    maxZoom: 17,
  },
  {
    id: "1976-KH9-DZB1212",
    date: "1976-08-26",
    bounds: [50.28591865317506, 25.715238358783974, 50.85489028708619, 26.555147256761117],
    minZoom: 10,
    maxZoom: 16,
  },
];

export function availableBahrainImages(lat: number, lng: number): BahrainImage[] {
  return images.filter(({ bounds: [west, south, east, north] }) =>
    lng >= west && lng <= east && lat >= south && lat <= north
  );
}

export function bahrainTileUrl(image: BahrainImage, x: number, y: number, zoom: number): string {
  const count = 2 ** zoom;
  if (zoom < image.minZoom || zoom > image.maxZoom || x < 0 || x >= count || y < 0 || y >= count) return "";
  return `https://map.mapbh.org/data/${image.id}/${zoom}/${x}/${y}.png`;
}
