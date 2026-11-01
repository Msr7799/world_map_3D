import catalog from "./mapbh-catalog.json";

// Georeferenced layers published by mapBH. Each entry was checked against its
// TileJSON endpoint; year-only dates are not claimed as acquisition dates.
export type BahrainImage = {
  id: string;
  name: string;
  date: string;
  type: "photo" | "map";
  bounds: [number, number, number, number];
  minZoom: number;
  maxZoom: number;
  format: "png" | "jpg";
};

export const bahrainImages = catalog as BahrainImage[];

export function availableBahrainImages(lat: number, lng: number): BahrainImage[] {
  return bahrainImages.filter(({ bounds: [west, south, east, north] }) =>
    lng >= west && lng <= east && lat >= south && lat <= north
  );
}

export function bahrainTileUrl(image: BahrainImage, x: number, y: number, zoom: number): string {
  const count = 2 ** zoom;
  if (zoom < image.minZoom || zoom > image.maxZoom || x < 0 || x >= count || y < 0 || y >= count) return "";
  return `https://map.mapbh.org/data/${encodeURIComponent(image.id)}/${zoom}/${x}/${y}.${image.format}`;
}

// At street zoom, show the appropriate crop of the highest-resolution archive
// tile instead of leaving the historical overlay empty above its native zoom.
export function bahrainTileView(image: BahrainImage, x: number, y: number, zoom: number) {
  if (zoom < image.minZoom) return null;
  const sourceZoom = Math.min(zoom, image.maxZoom);
  const scale = 2 ** (zoom - sourceZoom);
  const sourceX = Math.floor(x / scale);
  const sourceY = Math.floor(y / scale);
  const url = bahrainTileUrl(image, sourceX, sourceY, sourceZoom);
  if (!url) return null;
  return {
    url,
    scale,
    offsetX: x - sourceX * scale,
    offsetY: y - sourceY * scale,
  };
}
