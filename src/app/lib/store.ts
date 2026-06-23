"use client";

import { create } from "zustand";
import { EarthState, EarthMarker, SearchResult } from "@/types";

// نقاط الاهتمام الافتراضية
const DEFAULT_MARKERS: EarthMarker[] = [
  { id: "mecca", lat: 21.3891, lng: 39.8579, name: "مكة المكرمة", country: "المملكة العربية السعودية", type: "landmark", color: "#f59e0b", size:1.0 },
  { id: "dubai", lat: 25.2048, lng: 55.2708, name: "دبي", country: "الإمارات", type: "city", color: "#38bdf8", size: 0.7 },
  { id: "riyadh", lat: 24.7136, lng: 46.6753, name: "الرياض", country: "المملكة العربية السعودية", type: "city", color: "#38bdf8", size: 0.7 },
  { id: "cairo", lat: 30.0444, lng: 31.2357, name: "القاهرة", country: "مصر", type: "city", color: "#38bdf8", size: 0.7 },
  { id: "london", lat: 51.5074, lng: -0.1278, name: "لندن", country: "المملكة المتحدة", type: "city", color: "#4ade80", size: 0.5 },
  { id: "nyc", lat: 40.7128, lng: -74.006, name: "نيويورك", country: "الولايات المتحدة", type: "city", color: "#4ade80", size: 0.5 },
  { id: "tokyo", lat: 35.6762, lng: 139.6503, name: "طوكيو", country: "اليابان", type: "city", color: "#4ade80", size: 0.5 },
];

export const useEarthStore = create<EarthState>((set: (partial: Partial<EarthState> | ((state: EarthState) => Partial<EarthState>)) => void) => ({
  // الحالة الافتراضية
  isRotating: true,
  rotationSpeed: 0.3,
  currentLat: 24.0,
  currentLng: 45.0,
  zoom: 2.5,

  markers: DEFAULT_MARKERS,
  selectedMarker: null,

  searchQuery: "",
  searchResults: [],
  isSearching: false,

  showAtmosphere: true,
  showClouds: true,
  showGrid: false,
  nightMode: false,

  // Actions
  setRotating: (rotating) => set({ isRotating: rotating }),
  setZoom: (zoom) => set({ zoom: Math.max(1.2, Math.min(8, zoom)) }),

  flyTo: (lat, lng, zoom = 3) =>
    set({
      currentLat: lat,
      currentLng: lng,
      zoom,
      isRotating: false,
    }),

  addMarker: (marker) =>
    set((state) => ({
      markers: [...state.markers.filter((m) => m.id !== marker.id), marker],
    })),

  removeMarker: (id) =>
    set((state) => ({
      markers: state.markers.filter((m) => m.id !== id),
    })),

  selectMarker: (marker) => set({ selectedMarker: marker }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSearchResults: (results) =>
    set({ searchResults: results, isSearching: false }),

  toggleAtmosphere: () =>
    set((state) => ({ showAtmosphere: !state.showAtmosphere })),

  toggleClouds: () =>
    set((state) => ({ showClouds: !state.showClouds })),

  toggleGrid: () =>
    set((state) => ({ showGrid: !state.showGrid })),

  toggleNightMode: () =>
    set((state) => ({ nightMode: !state.nightMode })),
}));