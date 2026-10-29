import {
  getWaybackItemsWithLocalChanges,
  getMetadata,
  lat2tile,
  long2tile,
  type WaybackItem,
  type WaybackMetadata,
} from "@esri/wayback-core";

export type { WaybackItem, WaybackMetadata };

// The Wayback change detector works per map tile. Reuse its result while the
// map center stays in that tile, including requests already in progress.
const localChanges = new Map<string, Promise<WaybackItem[]>>();
const MAX_CACHED_TILES = 24;
const metadataCache = new Map<string, Promise<WaybackMetadata | null>>();

function resultForTile(lat: number, lng: number, zoom: number) {
  const key = `${zoom}/${long2tile(lng, zoom)}/${lat2tile(lat, zoom)}`;
  const cached = localChanges.get(key);
  if (cached) return cached;

  const request = getWaybackItemsWithLocalChanges({ latitude: lat, longitude: lng }, zoom)
    .catch((error) => { localChanges.delete(key); throw error; });
  localChanges.set(key, request);
  if (localChanges.size > MAX_CACHED_TILES) {
    const oldest = localChanges.keys().next().value;
    if (oldest) localChanges.delete(oldest);
  }
  return request;
}

export async function availableWaybackImages(lat: number, lng: number, zoom: number, signal: AbortSignal) {
  if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
  const request = resultForTile(lat, lng, zoom);
  return new Promise<WaybackItem[]>((resolve, reject) => {
    const onAbort = () => reject(new DOMException("Cancelled", "AbortError"));
    signal.addEventListener("abort", onAbort, { once: true });
    request.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

export async function waybackCaptureMetadata(lat: number, lng: number, zoom: number, release: number) {
  const key = `${release}/${zoom}/${long2tile(lng, zoom)}/${lat2tile(lat, zoom)}`;
  const cached = metadataCache.get(key);
  if (cached) return cached;
  const request = getMetadata({ latitude: lat, longitude: lng }, zoom, release)
    .catch((error) => { metadataCache.delete(key); throw error; });
  metadataCache.set(key, request);
  if (metadataCache.size > 96) {
    const oldest = metadataCache.keys().next().value;
    if (oldest) metadataCache.delete(oldest);
  }
  return request;
}

export function waybackTileUrl(item: WaybackItem, x: number, y: number, zoom: number) {
  const count = 2 ** zoom;
  if (x < 0 || x >= count || y < 0 || y >= count) return "";
  return item.itemURL
    .replace("{level}", String(zoom))
    .replace("{row}", String(y))
    .replace("{col}", String(x));
}
