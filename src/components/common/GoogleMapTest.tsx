import React from 'react';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';

export const GoogleMapTest: React.FC = () => {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim() || "AIzaSyA79hWKJ8jS6ACxdtb44LT1oWIACZj1upY";
  const mapId = (import.meta.env.VITE_GOOGLE_MAPS_ID || '').trim();

  const defaultCenter = { lat: 12.9716, lng: 77.5946 }; // Default center
  console.log("API KEY =", apiKey);
  if (!apiKey) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-amber-50 p-6 text-center">
        <h2 className="text-lg font-bold text-amber-900 mb-2">Google Maps API Key Missing</h2>
        <p className="text-sm text-amber-800 max-w-md">
          Please define <code className="bg-amber-100 px-2 py-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code> in your environment variables to enable Google Maps.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col bg-slate-900 text-white">
      <header className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-base font-bold text-emerald-400">Google Maps Platform - Phase 1 Verification Test</h1>
          <p className="text-xs text-slate-400">Standalone verification map (Does not touch existing Leaflet functionality)</p>
        </div>
      </header>

      <div className="flex-1 w-full relative">
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={defaultCenter}
            defaultZoom={15}
            mapId={mapId || undefined}
            className="w-full h-full"
            style={{ width: '100%', height: '100%' }}
            disableDefaultUI={false}
          >
            <Marker position={defaultCenter} title="Google Maps Test Location" />
          </Map>
        </APIProvider>
      </div>
    </div>
  );
};

export default GoogleMapTest;
