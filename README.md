<div align="center">

# 🌍 Earth3D Explorer

An interactive 3D experience for exploring Earth and the Solar System, with geographic search, road maps, and rich place details.

![Earth3D Explorer preview](public/earth3d.png)

<p>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=061A23">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
  <img alt="Three.js" src="https://img.shields.io/badge/Three.js-WebGL-000000?logo=threedotjs&logoColor=white">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white">
  <img alt="Google Maps Platform" src="https://img.shields.io/badge/Google_Maps-Platform-4285F4?logo=googlemaps&logoColor=white">
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-9-F69220?logo=pnpm&logoColor=white">
</p>

**English** · [العربية](README_AR.md)

</div>

## Overview

**Earth3D Explorer** combines a realistic globe, cloud and city-light layers, Google-powered place discovery, and an interactive Solar System. Users can move from space down to a road map, locate their device, enter coordinates directly, inspect place details, and explore planets without leaving the experience.

## Features

- High-resolution WebGL globe with smooth orbit controls, zooming, and camera transitions.
- Daytime Earth imagery, nighttime city lights, animated clouds, atmosphere, and a Milky Way background.
- A day/night simulation with the Sun's direction calculated from the current UTC time, date, and seasonal solar declination.
- Google Places search with addresses, ratings, photos, phone numbers, websites, and opening hours when available.
- Coordinate search, geocoding, reverse geocoding, and markers positioned directly on the globe.
- Browser geolocation displayed as a pulsing blue location marker.
- Automatic transition to Google Maps near the surface, with roadmap and satellite views.
- Destination selection and handoff to Google Maps for driving or walking navigation.
- Interactive Sun, Moon, and all eight planets, including orbital motion, summaries, and quick facts.
- Controls for auto-rotation, motion speed, zoom, clouds, atmosphere, coordinate grid, and night mode.
- Responsive layouts for desktop, tablet, and mobile screens.

## Day, night, and Sun direction

The app derives the Sun's position from the current UTC time and day of the year, including seasonal solar declination, and uses that direction to illuminate the globe. This places sunlight on the correct daytime side while nighttime city lights remain visible on the dark side. The model is intended for an interactive visual simulation; it is an astronomical approximation, not a scientific ephemeris or navigation instrument.

## Technology

| Technology | Role |
|---|---|
| Next.js 14 + React 18 | Application structure, routing, and UI components |
| TypeScript | Static typing and shared data models |
| Three.js | 3D rendering, WebGL, textures, and lighting |
| React Three Fiber | Declarative Three.js scenes in React |
| React Three Drei | Camera controls, text, stars, and 3D helpers |
| GSAP + Framer Motion | Camera transitions and interface animation |
| Google Maps JavaScript API | Interactive roadmap and satellite views |
| Places + Geocoding | Place search, details, and coordinate conversion |
| Zustand | Search, marker, camera, and display state |
| Tailwind CSS | Responsive interface styling |

## Requirements

- A modern Node.js release compatible with Next.js 14.
- [pnpm](https://pnpm.io/).
- A browser with WebGL and hardware acceleration support.
- A Google Maps Platform browser key for live maps and place search. The globe and a small set of mock search results remain available without a key.

## Quick start

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create `.env.local` in the project root:

   ```env
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_browser_api_key
   ```

3. Start the development server:

   ```bash
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

## Google Maps Platform setup

In the [Google Cloud Console](https://console.cloud.google.com/):

1. Create a project or select an existing one.
2. Enable **Maps JavaScript API**, **Places API (New)**, and **Geocoding API**.
3. Create a browser API key.
4. Restrict the key with **HTTP referrers**, for example:

   ```text
   http://localhost:3000/*
   https://your-domain.example/*
   ```

5. Restrict the key to only the required APIs, then assign it to `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.

> `NEXT_PUBLIC_*` values are exposed to the browser. Never place secrets in them, and never leave a Google API key unrestricted.

## Controls

| Action | Result |
|---|---|
| Drag | Orbit around Earth or the selected planet |
| Mouse wheel or pinch | Zoom in and out |
| Search | Find a place and move the camera to it |
| Coordinates tab | Add a marker using latitude and longitude |
| My Location tab | Request the device location and fly to it |
| Zoom close to Earth | Enter the road-map view automatically |
| Click the map | Inspect a place or its coordinates |
| Directions | Open the destination route in Google Maps |
| Planet menu | Fly to a celestial body and inspect its details |

## Routes

| Route | Description |
|---|---|
| `/` | Main Earth experience |
| `/earth` | The same Earth experience at an explicit route |
| `/solar` | Standalone Solar System viewer |

## Project structure

```text
world_map_3D/
├── public/
│   ├── earth3d.png
│   └── textures/              # Earth, space, and planet textures
├── src/app/
│   ├── components/
│   │   ├── Earth3D.tsx        # Earth, planets, and Google Maps scene
│   │   ├── SolarSystem.tsx    # Standalone Solar System viewer
│   │   ├── SearchPanel.tsx    # Search, coordinates, and geolocation
│   │   ├── ControlPanel.tsx   # Camera and display controls
│   │   ├── PlaceInfoPanel.tsx # Place details
│   │   └── RoutePanel.tsx     # Travel mode and navigation handoff
│   ├── earth/page.tsx
│   ├── solar/page.tsx
│   ├── lib/
│   │   ├── maps.ts            # Google Maps and geographic utilities
│   │   └── store.ts           # Zustand store
│   ├── types/index.ts
│   ├── layout.tsx
│   └── page.tsx
├── next.config.mjs
├── package.json
└── pnpm-lock.yaml
```

## Scripts

```bash
pnpm dev         # Start the development server
pnpm build       # Create a production build
pnpm start       # Run the production build
pnpm type-check  # Run the TypeScript checker
pnpm lint        # Run the Next.js linter
```

## Notes

- Earth and planet textures are bundled under `public/textures` and loaded locally.
- Visual quality and frame rate depend on WebGL support and graphics hardware.
- Device location requires user permission and a secure HTTPS context in production.
- Place photos, business details, and opening hours depend on Google data availability and API-key permissions.
