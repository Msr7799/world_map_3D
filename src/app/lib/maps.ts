"use client";

import { Loader } from "@googlemaps/js-api-loader";
import { SearchResult, GeoLocation, PlaceDetails, RouteResult, RouteStep } from "@/types";

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
  await loader.importLibrary("routes");

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
      if (status === "OK" && results?.[0]) {
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

// =====================================================
// جلب تفاصيل مكان محدد (Places API الجديد)
// =====================================================
export async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  if (!isLoaded) await initGoogleMaps();
  if (!isLoaded) return null;

  try {
    const { Place } = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;

    const place = new Place({ id: placeId });

    await place.fetchFields({
      fields: [
        "id",
        "displayName",
        "formattedAddress",
        "location",
        "rating",
        "userRatingCount",
        "photos",
        "nationalPhoneNumber",
        "websiteURI",
        "regularOpeningHours",
        "types",
        "priceLevel",
      ],
    });

    // جلب صور المكان (أول 5 صور)
    const photos: { url: string; attribution?: string }[] = [];
    if (place.photos && place.photos.length > 0) {
      const photoSlice = place.photos.slice(0, 5);
      for (const photo of photoSlice) {
        try {
          const url = photo.getURI({ maxWidth: 800, maxHeight: 600 });
          photos.push({ url });
        } catch {
          // تجاهل صور فاشلة
        }
      }
    }

    // ساعات العمل
    const openingHours: string[] = [];
    if (place.regularOpeningHours?.weekdayDescriptions) {
      openingHours.push(...place.regularOpeningHours.weekdayDescriptions);
    }

    let openNow: boolean | undefined = undefined;
    try {
      openNow = await place.isOpen();
    } catch {
      // تجاهل إن لم يدعم المتصفح/المفتاح
    }

    return {
      placeId: place.id || placeId,
      name: place.displayName || "",
      address: place.formattedAddress || "",
      rating: place.rating ?? undefined,
      userRatingsTotal: place.userRatingCount ?? undefined,
      photos,
      phone: place.nationalPhoneNumber ?? undefined,
      website: place.websiteURI ?? undefined,
      openNow,
      openingHours,
      types: place.types || [],
      location: {
        lat: place.location?.lat() || 0,
        lng: place.location?.lng() || 0,
      },
      priceLevel: place.priceLevel ? Number(place.priceLevel) : undefined,
    };
  } catch (err) {
    console.warn("خطأ في جلب تفاصيل المكان:", err);
    return null;
  }
}

// =====================================================
// حساب المسار (Directions API الكلاسيكي)
// =====================================================
export async function calculateRoute(
  origin: google.maps.LatLngLiteral,
  destination: google.maps.LatLngLiteral,
  travelMode: "DRIVING" | "WALKING"
): Promise<{ result: RouteResult; response: google.maps.DirectionsResult } | null> {
  if (!isLoaded) await initGoogleMaps();
  if (!isLoaded) return null;

  return new Promise((resolve) => {
    const service = new google.maps.DirectionsService();

    service.route(
      {
        origin,
        destination,
        travelMode:
          travelMode === "DRIVING"
            ? google.maps.TravelMode.DRIVING
            : google.maps.TravelMode.WALKING,
        language: "ar",
        unitSystem: google.maps.UnitSystem.METRIC,
      },
      (response, status) => {
        if (status !== google.maps.DirectionsStatus.OK || !response) {
          console.warn("خطأ في حساب المسار:", status);
          resolve(null);
          return;
        }

        const leg = response.routes[0]?.legs[0];
        if (!leg) { resolve(null); return; }

        const steps: RouteStep[] = leg.steps.map((step) => ({
          instructions: step.instructions.replace(/<[^>]*>/g, ""),
          distance: step.distance?.text || "",
          duration: step.duration?.text || "",
          travelMode,
        }));

        resolve({
          result: {
            distance: leg.distance?.text || "",
            duration: leg.duration?.text || "",
            travelMode,
            steps,
          },
          response,
        });
      }
    );
  });
}

// =====================================================
// Reverse Geocoding: إحداثيات → عنوان
// =====================================================
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string> {
  if (!isLoaded) await initGoogleMaps();
  if (!geocoder) return `${lat.toFixed(5)}°, ${lng.toFixed(5)}°`;

  return new Promise((resolve) => {
    geocoder!.geocode(
      { location: { lat, lng }, language: "ar" },
      (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results?.[0]) {
          resolve(results[0].formatted_address);
        } else {
          resolve(`${lat.toFixed(5)}°, ${lng.toFixed(5)}°`);
        }
      }
    );
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