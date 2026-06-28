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

// =====================================================
// معلومات المكان التفصيلية (Places API)
// =====================================================
export interface PlacePhoto {
  url: string;
  attribution?: string;
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  address: string;
  rating?: number;
  userRatingsTotal?: number;
  photos: PlacePhoto[];
  phone?: string;
  website?: string;
  openNow?: boolean;
  openingHours?: string[];
  types: string[];
  location: GeoLocation;
  priceLevel?: number; // 0-4
}

// =====================================================
// الدبوس الذي يضعه المستخدم
// =====================================================
export interface DroppedPin {
  lat: number;
  lng: number;
  address?: string;
  placeId?: string;
}

// =====================================================
// نتيجة حساب المسار (Directions API)
// =====================================================
export interface RouteStep {
  instructions: string;
  distance: string;
  duration: string;
  travelMode: "DRIVING" | "WALKING";
}

export interface RouteResult {
  distance: string;       // "5.2 كم"
  duration: string;       // "12 دقيقة"
  travelMode: "DRIVING" | "WALKING";
  steps: RouteStep[];
  polyline?: string;      // encoded polyline للرسم
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
  isMapActive: boolean;
  isRouteActive: boolean;

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
  setMapActive: (active: boolean) => void;
  setRouteActive: (active: boolean) => void;
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