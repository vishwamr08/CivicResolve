import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, MapPin, CheckCircle2, AlertTriangle, ShieldAlert, Layers, Globe } from 'lucide-react';

// Create custom colored Leaflet markers based on priority AND resolution status
const createCustomIcon = (priority, status) => {
  const isResolved = status === 'Resolved';
  
  let color = '#0D9488'; // Default Teal
  let innerIcon = `<circle cx="12" cy="12" r="4.5" fill="#ffffff"/>`;

  if (isResolved) {
    color = '#10B981'; // Emerald Green
    innerIcon = `
      <circle cx="12" cy="12" r="6" fill="#10B981" stroke="#ffffff" stroke-width="1.5"/>
      <path d="M9 12l2 2 4-4" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    `;
  } else if (priority === 'Critical') {
    color = '#EF4444'; // Red
    innerIcon = `
      <circle cx="12" cy="12" r="6" fill="#EF4444" stroke="#ffffff" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="3" fill="#ffffff"/>
    `;
  } else if (priority === 'High') {
    color = '#F59E0B'; // Amber
  } else if (priority === 'Medium') {
    color = '#0D9488'; // Teal
  } else if (priority === 'Low') {
    color = '#64748B'; // Slate
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="30" height="44">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24c0-6.63-5.37-12-12-12z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
      ${innerIcon}
    </svg>
  `;

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: svg,
    iconSize: [30, 44],
    iconAnchor: [15, 44],
    popupAnchor: [0, -40]
  });
};

export default function ComplaintMap({ complaints, onSelectComplaint }) {
  const [mapProvider, setMapProvider] = useState('osm'); // 'google' or 'osm'
  const [googleKey, setGoogleKey] = useState(null);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [googleLoadError, setGoogleLoadError] = useState(false);
  const googleMapRef = useRef(null);
  const googleMapInstance = useRef(null);
  const googleMarkersRef = useRef([]);

  // Filter complaints that strictly have valid coordinates
  const geotaggedComplaints = (complaints || []).filter(
    c => c.latitude !== null && c.longitude !== null && !isNaN(Number(c.latitude)) && !isNaN(Number(c.longitude))
  );

  // Default center: Chennai, Tamil Nadu coordinates
  const defaultCenter = geotaggedComplaints.length > 0 
    ? [Number(geotaggedComplaints[0].latitude), Number(geotaggedComplaints[0].longitude)]
    : [13.0827, 80.2707];

  const nonGeotaggedCount = (complaints || []).length - geotaggedComplaints.length;

  // Check backend for Google Maps API Key
  useEffect(() => {
    fetch('/api/config/client')
      .then(r => r.json())
      .then(config => {
        if (config && config.googleMapsEnabled && config.googleMapsApiKey) {
          setGoogleKey(config.googleMapsApiKey);
          loadGoogleMapsScript(config.googleMapsApiKey);
        }
      })
      .catch(() => {});
  }, []);

  const loadGoogleMapsScript = (apiKey) => {
    if (window.google && window.google.maps) {
      setIsGoogleLoaded(true);
      setMapProvider('google');
      return;
    }

    const scriptId = 'google-maps-script';
    if (document.getElementById(scriptId)) return;

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
      console.warn('Google Maps Platform failed to load. Falling back to OpenStreetMap.');
      setGoogleLoadError(true);
      setMapProvider('osm');
    };
    document.head.appendChild(script);
  };

  // Initialize or update Google Maps instance
  useEffect(() => {
    if (mapProvider !== 'google' || !isGoogleLoaded || !googleMapRef.current || !window.google) return;

    if (!googleMapInstance.current) {
      googleMapInstance.current = new window.google.maps.Map(googleMapRef.current, {
        center: { lat: defaultCenter[0], lng: defaultCenter[1] },
        zoom: 12,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }
        ]
      });
    }

    // Clear previous markers
    googleMarkersRef.current.forEach(m => m.setMap(null));
    googleMarkersRef.current = [];

    // Add Markers for each geotagged complaint
    geotaggedComplaints.forEach((c) => {
      const lat = Number(c.latitude);
      const lng = Number(c.longitude);

      let pinColor = '#0D9488';
      if (c.status === 'Resolved') pinColor = '#10B981';
      else if (c.priority === 'Critical') pinColor = '#EF4444';
      else if (c.priority === 'High') pinColor = '#F59E0B';

      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: googleMapInstance.current,
        title: `${c.ref_id}: ${c.title}`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: pinColor,
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });

      const infoContent = `
        <div style="font-family: -apple-system, sans-serif; padding: 4px; max-width: 240px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-family: monospace; font-weight: bold; font-size: 11px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${c.ref_id}</span>
            <span style="font-weight: bold; font-size: 10px; color: ${pinColor};">${c.status === 'Resolved' ? 'Resolved' : c.priority + ' Priority'}</span>
          </div>
          <h4 style="font-size: 12px; font-weight: bold; margin: 0 0 4px 0; color: #0f172a;">${c.title}</h4>
          <p style="font-size: 11px; color: #64748b; margin: 0 0 6px 0;">${c.location || 'Municipal Ward'}</p>
          <div style="font-size: 10px; color: #0d9488; font-weight: bold; cursor: pointer;">Click to view full details</div>
        </div>
      `;

      const infoWindow = new window.google.maps.InfoWindow({ content: infoContent });

      marker.addListener('click', () => {
        infoWindow.open(googleMapInstance.current, marker);
        if (onSelectComplaint) onSelectComplaint(c);
      });

      googleMarkersRef.current.push(marker);
    });
  }, [mapProvider, isGoogleLoaded, geotaggedComplaints]);

  return (
    <div className="space-y-3" role="region" aria-label="Interactive Map of Reported Grievances">
      
      {/* Map Header with Provider Switcher & Accessible Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-teal-600" />
            <span>Map Engine:</span>
          </span>
          
          {/* Provider Toggle Pill */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                if (googleKey || isGoogleLoaded) {
                  setMapProvider('google');
                } else {
                  alert('Google Maps Platform is ready. To enable, configure GOOGLE_MAPS_API_KEY in server/.env.');
                }
              }}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 text-[11px] ${
                mapProvider === 'google'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              aria-pressed={mapProvider === 'google'}
              aria-label="Switch to Google Maps Platform"
            >
              <span>Google Maps</span>
              {googleKey && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
            </button>

            <button
              type="button"
              onClick={() => setMapProvider('osm')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 text-[11px] ${
                mapProvider === 'osm'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              aria-pressed={mapProvider === 'osm'}
              aria-label="Switch to OpenStreetMap Fallback"
            >
              <span>OpenStreetMap</span>
            </button>
          </div>
        </div>

        {/* Engine Status Tag */}
        <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
          {mapProvider === 'google' ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Google Maps Platform Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
              OpenStreetMap Active {googleKey ? '' : '(Google Maps Available)'}
            </span>
          )}
        </div>
      </div>

      {/* Map Display Container */}
      <div className="w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative z-0">
        
        {/* VIEW 1: GOOGLE MAPS PLATFORM */}
        {mapProvider === 'google' && (
          <div 
            ref={googleMapRef} 
            className="w-full h-full"
            aria-label="Google Maps Incident Canvas"
          />
        )}

        {/* VIEW 2: LEAFLET OPENSTREETMAP FALLBACK */}
        {mapProvider === 'osm' && (
          <MapContainer
            center={defaultCenter}
            zoom={12}
            scrollWheelZoom={false}
            className="w-full h-full"
            aria-label="Leaflet OpenStreetMap Canvas"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {geotaggedComplaints.map((c) => (
              <Marker
                key={c.id || c.ref_id}
                position={[Number(c.latitude), Number(c.longitude)]}
                icon={createCustomIcon(c.priority, c.status)}
              >
                <Popup className="custom-popup">
                  <div className="p-1 max-w-xs space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-bold">
                        {c.ref_id}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        c.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' :
                        c.priority === 'Critical' ? 'bg-red-100 text-red-700' :
                        c.priority === 'High' ? 'bg-amber-100 text-amber-700' :
                        'bg-teal/10 text-teal'
                      }`}>
                        {c.status === 'Resolved' ? 'Resolved' : `${c.priority} Priority`}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-navy-900 leading-snug line-clamp-2">
                      {c.title}
                    </h4>

                    <div className="text-[11px] text-slate-500 flex items-center gap-1 line-clamp-1">
                      <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span>{c.location}</span>
                    </div>

                    <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                        c.is_gps_verified 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {c.is_gps_verified ? 'GPS Geotag Verified' : 'Approximate Pin'}
                      </span>

                      {onSelectComplaint && (
                        <button
                          onClick={() => onSelectComplaint(c)}
                          className="text-[11px] text-teal-600 font-bold hover:underline focus:outline-none focus:ring-1 focus:ring-teal-500"
                        >
                          Details &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}

      </div>

      {/* Screen Reader Accessible Data Alternative */}
      <div className="sr-only">
        <table>
          <caption>Geotagged Municipal Grievances Summary for Screen Readers</caption>
          <thead>
            <tr>
              <th scope="col">Reference ID</th>
              <th scope="col">Title</th>
              <th scope="col">Category</th>
              <th scope="col">Priority</th>
              <th scope="col">Coordinates</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {geotaggedComplaints.map(c => (
              <tr key={c.id || c.ref_id}>
                <td>{c.ref_id}</td>
                <td>{c.title}</td>
                <td>{c.category}</td>
                <td>{c.priority}</td>
                <td>Latitude {c.latitude}, Longitude {c.longitude}</td>
                <td>{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Map Legend & Non-Geotagged Clarification */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-2 text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-700">Legend:</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" aria-hidden="true"></span> Resolved</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" aria-hidden="true"></span> Critical</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" aria-hidden="true"></span> High</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-teal-600" aria-hidden="true"></span> Medium/Low</span>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-emerald-700 font-medium">
            {geotaggedComplaints.length} GPS Mapped
          </span>
          {nonGeotaggedCount > 0 && (
            <span className="text-slate-400">
              • {nonGeotaggedCount} Manual street addresses (No GPS invented)
            </span>
          )}
        </div>
      </div>

    </div>
  );
}