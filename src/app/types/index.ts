// =====================================================
// Types للكرة الأرضية والخرائط
// =====================================================

export interface GeoLocation {
  lat: number;
  lng: number;
  name?: string;
  country?: string;
  description?: string;
}

export interface EarthMarker extends GeoLocation {
  id: string;
  type: "city" | "landmark" | "custom" | "searched";
  color?: string;
  size?: number;
  altitude?: number; // ارتفاع النقطة فوق سطح الكرة (0-1)
}

export interface SearchResult {
  placeId: string;
  name: string;
  formattedAddress: string;
  location: GeoLocation;
  types: string[];
  rating?: number;
  photoUrl?: string;
}

export interface EarthState {
  // حالة الكرة
  isRotating: boolean;
  rotationSpeed: number;
  currentLat: number;
  currentLng: number;
  zoom: number; // 1 = بعيد، 5 = قريب جداً

  // نقاط الاهتمام
  markers: EarthMarker[];
  selectedMarker: EarthMarker | null;

  // حالة البحث
  searchQuery: string;
  searchResults: SearchResult[];
  isSearching: boolean;

  // إعدادات المظهر
  showAtmosphere: boolean;
  showClouds: boolean;
  showGrid: boolean;
  nightMode: boolean;

  // Actions
  setRotating: (rotating: boolean) => void;
  setZoom: (zoom: number) => void;
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  addMarker: (marker: EarthMarker) => void;
  removeMarker: (id: string) => void;
  selectMarker: (marker: EarthMarker | null) => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: SearchResult[]) => void;
  toggleAtmosphere: () => void;
  toggleClouds: () => void;
  toggleGrid: () => void;
  toggleNightMode: () => void;
}

export interface CameraState {
  distance: number; // المسافة من مركز الأرض
  phi: number; // الزاوية الرأسية
  theta: number; // الزاوية الأفقية
  target: [number, number, number];
}

export interface EarthTextures {
  dayMap: string;
  nightMap: string;
  specularMap: string;
  normalMap: string;
  cloudsMap: string;
}