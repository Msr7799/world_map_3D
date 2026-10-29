import {
  getWaybackItemsWithLocalChanges,
  getMetadata,
  type WaybackItem,
  type WaybackMetadata,
} from "@esri/wayback-core";

export type { WaybackItem, WaybackMetadata };

export async function availableWaybackImages(lat: number, lng: number, zoom: number, signal: AbortSignal) {
  return getWaybackItemsWithLocalChanges(
    { latitude: lat, longitude: lng },
    zoom,
    { signal }
  );
}

export async function waybackCaptureMetadata(lat: number, lng: number, zoom: number, release: number) {
  return getMetadata({ latitude: lat, longitude: lng }, zoom, release);
}

export function waybackTileUrl(item: WaybackItem, x: number, y: number, zoom: number) {
  const count = 2 ** zoom;
  if (x < 0 || x >= count || y < 0 || y >= count) return "";
  return item.itemURL
    .replace("{level}", String(zoom))
    .replace("{row}", String(y))
    .replace("{col}", String(x));
}
