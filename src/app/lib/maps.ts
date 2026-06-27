"use client";

import { Loader } from "@googlemaps/js-api-loader";
import { SearchResult, GeoLocation } from "@/types";

let loader: Loader | null = null;
let geocoder: google.maps.Geocoder | null = null;
let isLoaded = false;

// تهيئة Google Maps API
export async function initGoogleMaps(): Promise<void> {
  if (isLoaded) return;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey || apiKey === "your_google_maps_api_key_here") {
    console.warn("⚠️ Google Maps API key غير مُعيَّن. البحث الجغرافي لن يعمل.");
    return;
  }

  loader = new Loader({
    apiKey,
    version: "weekly",
    language: "ar",
    region: "SA",
  });

  // تحميل المكتبات المطلوبة
  await loader.importLibrary("maps");
  await loader.importLibrary("places");
  await loader.importLibrary("geocoding");

  geocoder = new google.maps.Geocoder();
  isLoaded = true;
}

// البحث عن مواقع باستخدام Place API الجديد
export async function searchPlaces(query: string): Promise<SearchResult[]> {
  if (!isLoaded) await initGoogleMaps();
  if (!isLoaded) return getMockResults(query);

  try {
    const { Place } = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;

    const request = {
      textQuery: query,
      fields: ["id", "displayName", "formattedAddress", "location", "types", "rating"],
      language: "ar",
      maxResultCount: 5,
    };

    const { places } = await Place.searchByText(request);

    if (places && places.length > 0) {
      return places.map((place) => ({
        placeId: place.id || "",
        name: place.displayName || "",
        formattedAddress: place.formattedAddress || "",
        location: {
          lat: place.location?.lat() || 0,
          lng: place.location?.lng() || 0,
        },
        types: place.types || [],
        rating: place.rating !== null ? place.rating : undefined,
      }));
    }

    return getMockResults(query);
  } catch (err) {
    console.warn("خطأ في البحث عن الأماكن:", err);
    return getMockResults(query);
  }
}

// Geocoding: تحويل اسم المكان إلى إحداثيات
export async function geocodeAddress(
  address: string
): Promise<GeoLocation | null> {
  if (!isLoaded) await initGoogleMaps();
  if (!geocoder) return null;

  return new Promise((resolve) => {
    geocoder!.geocode({ address, language: "ar" }, (results: google.maps.GeocoderResult[] | null, status: any) => {
      if (status === google.maps.GeocoderStatus.OK && results?.[0]) {
        const loc = results[0].geometry.location;
        resolve({
          lat: loc.lat(),
          lng: loc.lng(),
          name: results[0].formatted_address,
        });
      } else {
        resolve(null);
      }
    });
  });
}

// نتائج وهمية عند غياب API key (للتطوير)
function getMockResults(query: string): SearchResult[] {
  const mockData: Record<string, SearchResult> = {
    مكة: { placeId: "mecca", name: "مكة المكرمة", formattedAddress: "مكة المكرمة، المملكة العربية السعودية", location: { lat: 21.3891, lng: 39.8579 }, types: ["locality"] },
    دبي: { placeId: "dubai", name: "دبي", formattedAddress: "دبي، الإمارات العربية المتحدة", location: { lat: 25.2048, lng: 55.2708 }, types: ["locality"] },
    القاهرة: { placeId: "cairo", name: "القاهرة", formattedAddress: "القاهرة، مصر", location: { lat: 30.0444, lng: 31.2357 }, types: ["locality"] },
    لندن: { placeId: "london", name: "لندن", formattedAddress: "لندن، المملكة المتحدة", location: { lat: 51.5074, lng: -0.1278 }, types: ["locality"] },
    باريس: { placeId: "paris", name: "باريس", formattedAddress: "باريس، فرنسا", location: { lat: 48.8566, lng: 2.3522 }, types: ["locality"] },
    نيويورك: { placeId: "nyc", name: "نيويورك", formattedAddress: "نيويورك، الولايات المتحدة", location: { lat: 40.7128, lng: -74.006 }, types: ["locality"] },
    طوكيو: { placeId: "tokyo", name: "طوكيو", formattedAddress: "طوكيو، اليابان", location: { lat: 35.6762, lng: 139.6503 }, types: ["locality"] },
  };

  const match = Object.entries(mockData).find(([key]) =>
    query.includes(key) || key.includes(query)
  );

  return match ? [match[1]] : [];
}

// تحويل إحداثيات جغرافية إلى إحداثيات 3D على الكرة
export function latLngToVector3(
  lat: number,
  lng: number,
  radius: number = 1
): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return [x, y, z];
}