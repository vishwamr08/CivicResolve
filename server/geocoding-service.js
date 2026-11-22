// CivicResolve Reliable Reverse Geocoding Service
// Implements provider cascading (Google Maps -> OSM Nominatim),
// 24-hour in-memory caching, rate-limiting, timeout guards, and authoritative GIS integration.

const { determineMunicipalJurisdiction, validateTamilNaduMembership } = require('./gis-engine');

// In-Memory Geocoding Cache (Key: 'lat_round_lng_round', Value: { data, expiresAt })
const geocodeCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 1000;

// Simple IP Rate Limiter for Geocoding (Max 30 requests per minute per IP)
const rateLimits = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;

function checkGeocodeRateLimit(ip) {
  const now = Date.now();
  const record = rateLimits.get(ip);
  if (!record || now - record.startTime > RATE_LIMIT_WINDOW_MS) {
    rateLimits.set(ip, { count: 1, startTime: now });
    return { allowed: true };
  }
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, retryAfter: Math.ceil((record.startTime + RATE_LIMIT_WINDOW_MS - now) / 1000) };
  }
  record.count += 1;
  return { allowed: true };
}

function getCacheKey(lat, lng) {
  // Round to ~11 meters precision for robust cache hits on adjacent points
  return `${parseFloat(lat).toFixed(4)}_${parseFloat(lng).toFixed(4)}`;
}

function getFromCache(key) {
  const item = geocodeCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    geocodeCache.delete(key);
    return null;
  }
  return item.data;
}

function setInCache(key, data) {
  if (geocodeCache.size >= MAX_CACHE_SIZE) {
    // Evict oldest entry
    const oldestKey = geocodeCache.keys().next().value;
    geocodeCache.delete(oldestKey);
  }
  geocodeCache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS
  });
}

/**
 * Parses Google Geocoding API response address_components into structured civic entities
 */
function parseGoogleAddressComponents(components) {
  const parsed = {
    district: null,
    locality: null,
    sublocality: null,
    postal_code: null,
    state: null
  };

  for (const comp of components) {
    const types = comp.types || [];
    if (types.includes('postal_code')) {
      parsed.postal_code = comp.long_name;
    } else if (types.includes('administrative_area_level_1')) {
      parsed.state = comp.long_name;
    } else if (types.includes('administrative_area_level_2') || types.includes('administrative_area_level_3')) {
      parsed.district = comp.long_name.replace(/\s+District$/i, '').trim();
    } else if (types.includes('locality')) {
      parsed.locality = comp.long_name;
    } else if (types.includes('sublocality_level_1') || types.includes('sublocality')) {
      parsed.sublocality = comp.long_name;
    }
  }

  return parsed;
}

/**
 * Performs reverse geocoding with provider cascade (Google -> Nominatim -> Coordinates fallback)
 * Integrates GIS point-in-polygon verification for authoritative municipal routing.
 */
async function reverseGeocodeLocation(latitude, longitude, accuracyMeters = null) {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return {
      error: 'Invalid coordinates provided. Latitude must be between -90 and 90, Longitude between -180 and 180.',
      status: 400
    };
  }

  // Check in-memory cache
  const cacheKey = getCacheKey(lat, lng);
  const cached = getFromCache(cacheKey);
  if (cached) {
    return { ...cached, cached: true };
  }

  // 1. Authoritative GIS state and municipal zone check
  const stateCheck = validateTamilNaduMembership(lat, lng);
  const gisJurisdiction = determineMunicipalJurisdiction(lat, lng);

  let formattedAddress = null;
  let postalCode = null;
  let geocodedDistrict = null;
  let geocodedLocality = null;
  let providerUsed = 'GPS Coordinates';
  let geocodeSuccess = false;

  // 2. Primary Provider: Google Maps Geocoding API (if configured)
  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  if (googleKey && !googleKey.includes('your_')) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleKey}`;
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'OK' && data.results && data.results[0]) {
          formattedAddress = data.results[0].formatted_address;
          providerUsed = 'Google Maps Platform';
          geocodeSuccess = true;

          const parsed = parseGoogleAddressComponents(data.results[0].address_components || []);
          postalCode = parsed.postal_code;
          geocodedDistrict = parsed.district;
          geocodedLocality = parsed.locality;
        }
      }
    } catch (gErr) {
      console.warn('[Reverse Geocode Notice]: Google Geocoding timed out or failed:', gErr.message);
    }
  }

  // 3. Fallback Provider: OpenStreetMap Nominatim
  if (!geocodeSuccess) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'CivicResolve-GrievanceRedressal/2.5 (contact@civicresolve.gov)' }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const osmData = await response.json();
        if (osmData && osmData.display_name) {
          formattedAddress = osmData.display_name;
          providerUsed = 'OpenStreetMap (Nominatim)';
          geocodeSuccess = true;

          const addr = osmData.address || {};
          postalCode = addr.postcode || null;
          geocodedDistrict = (addr.state_district || addr.county || '').replace(/\s+District$/i, '').trim() || null;
          geocodedLocality = addr.city || addr.town || addr.municipality || null;
        }
      }
    } catch (osmErr) {
      console.warn('[Reverse Geocode Notice]: Nominatim fallback timed out or failed:', osmErr.message);
    }
  }

  // 4. Default Geotagged Coordinate String if all network geocoders fail
  if (!formattedAddress) {
    formattedAddress = `Geotagged Coordinates: Lat ${lat.toFixed(6)}, Lng ${lng.toFixed(6)}`;
    providerUsed = 'Raw Coordinates (Network Offline)';
  }

  // Determine final administrative fields
  // Authoritative GIS takes absolute precedence for corporation & zone
  const finalDistrict = gisJurisdiction.district || geocodedDistrict || (stateCheck.isTamilNadu ? 'Tamil Nadu District' : 'Out of State');
  const finalCorporation = gisJurisdiction.corporation || geocodedLocality || null;
  const finalZone = gisJurisdiction.zone || null;

  const result = {
    address: formattedAddress,
    latitude: lat,
    longitude: lng,
    accuracy: accuracyMeters !== null ? accuracyMeters : null,
    postal_code: postalCode,
    state: stateCheck.isTamilNadu ? 'Tamil Nadu' : 'Outside Tamil Nadu',
    in_tamil_nadu: stateCheck.isTamilNadu,
    warning: stateCheck.isTamilNadu ? null : (stateCheck.reason || 'Location falls outside Tamil Nadu jurisdiction.'),
    district: finalDistrict,
    local_body: finalCorporation,
    zone: finalZone,
    available_wards: gisJurisdiction.available_wards || [],
    ward: null, // micro-ward must be confirmed by citizen
    ward_verified: false,
    jurisdiction_source: gisJurisdiction.jurisdiction_source,
    provenance: gisJurisdiction.provenance || null,
    provider: providerUsed
  };

  // Cache successful responses
  setInCache(cacheKey, result);

  return result;
}

module.exports = {
  reverseGeocodeLocation,
  checkGeocodeRateLimit,
  geocodeCache
};
