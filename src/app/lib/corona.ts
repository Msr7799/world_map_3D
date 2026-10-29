import coronaIndex from "./corona-index.json";

// Georeferenced CORONA Atlas blocks (1963–1972), catalogued by Iconem from CAST.
// CAST permits public viewing for non-commercial use only.
export type CoronaImage = {
  id: string;
  date: string;
  bbox: [number, number, number, number];
};

const images = coronaIndex as CoronaImage[];
const WMS_URL = "https://geoserve.cast.uark.edu/geoserver/corona/wms";
const WEB_MERCATOR_LIMIT = 20037508.342789244;

export function coronaCandidates(lat: number, lng: number): CoronaImage[] {
  return images
    .filter(({ bbox: [west, south, east, north] }) => lng >= west && lng <= east && lat >= south && lat <= north)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

async function hasImageAtPoint(image: CoronaImage, lat: number, lng: number, signal: AbortSignal): Promise<boolean> {
  const params = new URLSearchParams({
    service: "WMS",
    version: "1.1.1",
    request: "GetFeatureInfo",
    layers: `corona:${image.id}`,
    query_layers: `corona:${image.id}`,
    info_format: "application/json",
    srs: "EPSG:4326",
    bbox: `${lng - 0.02},${lat - 0.02},${lng + 0.02},${lat + 0.02}`,
    width: "11",
    height: "11",
    x: "5",
    y: "5",
    feature_count: "5",
  });
  const response = await fetch(`${WMS_URL}?${params}`, { signal });
  if (!response.ok) throw new Error(`CORONA WMS: ${response.status}`);
  const data: { features?: Array<{ properties?: { GRAY_INDEX?: number } }> } = await response.json();
  return data.features?.some(({ properties }) => Number(properties?.GRAY_INDEX) > 0) ?? false;
}

export async function availableCoronaImages(lat: number, lng: number, signal: AbortSignal) {
  const candidates = coronaCandidates(lat, lng);
  const available: CoronaImage[] = [];
  let failed = 0;

  // Keep requests to the university imagery server bounded.
  for (let start = 0; start < candidates.length; start += 4) {
    if (signal.aborted) break;
    const batch = await Promise.allSettled(
      candidates.slice(start, start + 4).map((image) => hasImageAtPoint(image, lat, lng, signal))
    );
    batch.forEach((result, offset) => {
      if (result.status === "fulfilled" && result.value) available.push(candidates[start + offset]);
      if (result.status === "rejected" && !signal.aborted) failed += 1;
    });
  }

  return { images: available, failed };
}

export function coronaTileUrl(image: CoronaImage, x: number, y: number, zoom: number): string {
  const count = 2 ** zoom;
  if (x < 0 || x >= count || y < 0 || y >= count) return "";

  const west = (x / count) * 360 - 180;
  const east = ((x + 1) / count) * 360 - 180;
  const latitude = (tileY: number) => Math.atan(Math.sinh(Math.PI * (1 - 2 * tileY / count))) * 180 / Math.PI;
  const north = latitude(y);
  const south = latitude(y + 1);
  const [imageWest, imageSouth, imageEast, imageNorth] = image.bbox;
  if (east < imageWest || west > imageEast || north < imageSouth || south > imageNorth) return "";

  const tileWidth = (2 * WEB_MERCATOR_LIMIT) / count;
  const minX = -WEB_MERCATOR_LIMIT + x * tileWidth;
  const maxY = WEB_MERCATOR_LIMIT - y * tileWidth;
  const params = new URLSearchParams({
    service: "WMS",
    version: "1.1.1",
    request: "GetMap",
    layers: `corona:${image.id}`,
    styles: "",
    format: "image/png",
    transparent: "true",
    srs: "EPSG:3857",
    bbox: `${minX},${maxY - tileWidth},${minX + tileWidth},${maxY}`,
    width: "256",
    height: "256",
  });
  return `${WMS_URL}?${params}`;
}
