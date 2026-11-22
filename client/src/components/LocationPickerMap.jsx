import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Compass, Move } from 'lucide-react';
import { getApiUrl } from '../config/api';

// Custom Pin Icon for Leaflet
const pickerIcon = L.divIcon({
  className: 'location-picker-marker',
  html: `
    <div style="position: relative; width: 32px; height: 42px; transform: translate(-16px, -42px);">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="32" height="42">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24c0-6.63-5.37-12-12-12z" fill="#0f2040" stroke="#ffffff" stroke-width="2"/>
        <circle cx="12" cy="12" r="5" fill="#f59e0b" stroke="#ffffff" stroke-width="1.5"/>
      </svg>
    </div>
  `,
  iconSize: [32, 42],
  iconAnchor: [16, 42]
});

// Helper component to center Leaflet map when coordinates change
function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, 15, { animate: true });
    }
  }, [center, map]);
  return null;
}

// Map Click Handler for Leaflet
function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

export default function LocationPickerMap({
  latitude,
  longitude,
  onLocationSelect,
  accuracyMeters = null,
  isGpsDetected = false
}) {
  const [mapProvider, setMapProvider] = useState('osm'); // 'google' | 'osm'
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const googleMapRef = useRef(null);
  const googleMapInstance = useRef(null);
  const googleMarkerRef = useRef(null);

  const hasCoords = Boolean(latitude && longitude && !isNaN(Number(latitude)) && !isNaN(Number(longitude)));
  const currentCenter = useMemo(() => {
    return hasCoords ? [Number(latitude), Number(longitude)] : [13.0827, 80.2707];
  }, [hasCoords, latitude, longitude]);

  // Load Google Maps SDK if enabled
  useEffect(() => {
    fetch(getApiUrl('/api/config/client'))
      .then(res => res.json())
      .then(config => {
        if (config && config.googleMapsEnabled && config.googleMapsApiKey) {
          loadGoogleMaps(config.googleMapsApiKey);
        }
      })
      .catch(() => {});
  }, []);

  function loadGoogleMaps(apiKey) {
    if (window.google && window.google.maps) {
      setIsGoogleLoaded(true);
      setMapProvider('google');
      return;
    }
    const scriptId = 'google-maps-script';
    if (document.getElementById(scriptId)) {
      if (window.google?.maps) {
        setIsGoogleLoaded(true);
        setMapProvider('google');
      }
      return;
    }
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setIsGoogleLoaded(true);
      setMapProvider('google');
    };
    script.onerror = () => {
      console.warn('Google Maps SDK failed to load. Using OpenStreetMap Leaflet.');
      setMapProvider('osm');
    };
    document.head.appendChild(script);
  }

  // Google Maps Instance Effect
  useEffect(() => {
    if (mapProvider !== 'google' || !isGoogleLoaded || !googleMapRef.current || !window.google) return;

    if (!googleMapInstance.current) {
      googleMapInstance.current = new window.google.maps.Map(googleMapRef.current, {
        center: { lat: currentCenter[0], lng: currentCenter[1] },
        zoom: hasCoords ? 15 : 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true
      });

      googleMapInstance.current.addListener('click', (e) => {
        const clickedLat = e.latLng.lat();
        const clickedLng = e.latLng.lng();
        onLocationSelect(clickedLat, clickedLng, 'map_pin');
      });
    } else {
      googleMapInstance.current.panTo({ lat: currentCenter[0], lng: currentCenter[1] });
      if (hasCoords) googleMapInstance.current.setZoom(15);
    }

    if (hasCoords) {
      if (!googleMarkerRef.current) {
        googleMarkerRef.current = new window.google.maps.Marker({
          position: { lat: currentCenter[0], lng: currentCenter[1] },
          map: googleMapInstance.current,
          draggable: true,
          title: 'Incident Spot (Drag to adjust)'
        });

        googleMarkerRef.current.addListener('dragend', (e) => {
          onLocationSelect(e.latLng.lat(), e.latLng.lng(), 'map_pin');
        });
      } else {
        googleMarkerRef.current.setPosition({ lat: currentCenter[0], lng: currentCenter[1] });
      }
    }
  }, [mapProvider, isGoogleLoaded, currentCenter, hasCoords, onLocationSelect]);

  const handleLeafletDragEnd = (e) => {
    const marker = e.target;
    if (marker) {
      const pos = marker.getLatLng();
      onLocationSelect(pos.lat, pos.lng, 'map_pin');
    }
  };

  return (
    <div className="rounded-xl border border-slate-300 overflow-hidden shadow-xs bg-slate-50 relative">
      {/* Top Map Control Bar */}
      <div className="bg-white/95 backdrop-blur-xs px-3 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between text-xs gap-2 z-10 relative">
        <div className="flex items-center gap-1.5 text-navy-900 font-semibold">
          <MapPin className="w-4 h-4 text-saffron-dark" />
          <span>Interactive Location Marker</span>
          {isGpsDetected && (
            <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
              GPS Locked
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Move className="w-3 h-3 text-slate-400" />
            <span>Drag pin or click map to adjust</span>
          </span>
          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px] border border-slate-200">
            {mapProvider === 'google' ? 'Google Maps' : 'OpenStreetMap'}
          </span>
        </div>
      </div>

      {/* Map Rendering Container */}
      <div className="relative h-56 sm:h-64 w-full">
        {mapProvider === 'google' && isGoogleLoaded ? (
          <div ref={googleMapRef} className="w-full h-full" />
        ) : (
          <MapContainer
            center={currentCenter}
            zoom={hasCoords ? 15 : 12}
            scrollWheelZoom={false}
            className="w-full h-full z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ChangeView center={hasCoords ? currentCenter : null} />
            <MapClickHandler onLocationSelect={(lat, lng) => onLocationSelect(lat, lng, 'map_pin')} />
            {hasCoords && (
              <Marker
                position={currentCenter}
                icon={pickerIcon}
                draggable={true}
                eventHandlers={{ dragend: handleLeafletDragEnd }}
              />
            )}
          </MapContainer>
        )}

        {/* Prompt overlay when coordinates are not yet set */}
        {!hasCoords && (
          <div className="absolute inset-0 bg-navy-950/20 backdrop-blur-[1px] flex items-center justify-center p-4 z-10 pointer-events-none">
            <div className="bg-white/95 px-3.5 py-2 rounded-lg shadow-sm border border-slate-200 text-xs text-slate-800 font-semibold flex items-center gap-2">
              <Compass className="w-4 h-4 text-navy-800 animate-spin" />
              <span>Tap 'Detect My Location' or click anywhere on the map to place the incident pin</span>
            </div>
          </div>
        )}
      </div>

      {/* Accuracy & Coordinates Footer Banner */}
      {hasCoords && (
        <div className="bg-slate-100/90 px-3 py-1.5 border-t border-slate-200 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-1">
          <div className="flex items-center gap-1 font-mono">
            <span>Lat: {Number(latitude).toFixed(5)}, Lng: {Number(longitude).toFixed(5)}</span>
          </div>
          {accuracyMeters !== null && (
            <span className="text-slate-500">
              Accuracy: ±{Math.round(accuracyMeters)}m
            </span>
          )}
        </div>
      )}
    </div>
  );
}
