import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, UploadCloud, AlertTriangle,
  Trash2, Loader2, Compass, CheckCircle2,
  Mic, MicOff, ArrowRight, ArrowLeft, Check
} from 'lucide-react';
import { TAMIL_NADU_DISTRICTS } from '../data/tamilnaduGeo';
import { translations } from '../data/translations';
import { getApiUrl } from '../config/api';
import LocationPickerMap from './LocationPickerMap';

export default function ComplaintFormModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  initialCategory = 'Road Damage',
  citizenUser = null,
  lang = 'en'
}) {
  const [step, setStep] = useState(1); // 1: Location, 2: Category, 3: Details & Voice, 4: Review

  // Location state
  const [selectedDistrict, setSelectedDistrict] = useState('chennai');
  const [selectedLocalBody, setSelectedLocalBody] = useState('gcc');
  const [selectedZoneWard, setSelectedZoneWard] = useState('Zone 8 - Anna Nagar (Ward 104)');
  const [streetAddress, setStreetAddress] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [accuracyTier, setAccuracyTier] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isGpsDetected, setIsGpsDetected] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [detectionMethod, setDetectionMethod] = useState('manual');

  // Issue info
  const [category, setCategory] = useState(initialCategory);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Citizen info
  const [citizenName, setCitizenName] = useState('');
  const [citizenPhone, setCitizenPhone] = useState('');
  const [citizenEmail, setCitizenEmail] = useState('');

  // Voice recording state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  // Validation
  const [validationError, setValidationError] = useState('');
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  const t = translations[lang] || translations.en;

  // Citizen-initiated GPS coordinates detection with accuracy validation
  const handleGetLocation = useCallback((forceUpdateAddress = false) => {
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Browser geolocation is not supported by your device or browser.');
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const rawLat = pos.coords.latitude;
        const rawLng = pos.coords.longitude;
        const accuracyMeters = Math.round(pos.coords.accuracy || 0);

        const lat = rawLat.toFixed(6);
        const lng = rawLng.toFixed(6);

        setLatitude(lat);
        setLongitude(lng);
        setLocationAccuracy(accuracyMeters);

        // Classify accuracy strictly per guidelines: High accuracy, Medium accuracy, Low accuracy
        let tier = 'High accuracy';
        if (accuracyMeters > 150) {
          tier = 'Low accuracy';
        } else if (accuracyMeters > 50) {
          tier = 'Medium accuracy';
        }
        setAccuracyTier(tier);

        setIsGpsDetected(true);
        setDetectionMethod('gps');

        try {
          const res = await fetch(getApiUrl(`/api/geocode/reverse?lat=${lat}&lng=${lng}&accuracy=${accuracyMeters}`));
          if (res.ok) {
            const data = await res.json();
            if (data.address && (!streetAddress || forceUpdateAddress)) {
              setStreetAddress(data.address);
            }
            if (data.district) {
              const match = TAMIL_NADU_DISTRICTS.find(d =>
                d.name.toLowerCase() === data.district.toLowerCase() ||
                d.id.toLowerCase() === data.district.toLowerCase()
              );
              if (match) {
                setSelectedDistrict(match.id);
                if (data.local_body && match.localBodies?.length) {
                  const matchedLb = match.localBodies.find(lb =>
                    lb.name.toLowerCase().includes(data.local_body.toLowerCase()) ||
                    data.local_body.toLowerCase().includes(lb.name.toLowerCase())
                  );
                  if (matchedLb) setSelectedLocalBody(matchedLb.id);
                }
              }
            }
          }
        } catch {
          if (!streetAddress || forceUpdateAddress) {
            setStreetAddress(`Geotagged Coordinates: Lat ${lat}, Lng ${lng} (Tamil Nadu)`);
          }
        } finally {
          setIsGettingLocation(false);
        }
      },
      (err) => {
        let msg = 'Could not acquire location.';
        if (err.code === 1) {
          msg = 'Location permission was denied. Please select your location or enter an address manually.';
        } else if (err.code === 2) {
          msg = 'Location position is unavailable from your device. Please select manually.';
        } else if (err.code === 3) {
          msg = 'Location request timed out. Please retry or enter your address manually.';
        } else if (err.message) {
          msg = err.message;
        }
        setLocationError(msg);
        setIsGettingLocation(false);
        // Note: Zero fake coordinate insertion. Coordinates and isGpsDetected remain unchanged.
      },
      { timeout: 10000, enableHighAccuracy: true, maximumAge: 0 }
    );
  }, [streetAddress]);

  // Citizen interactive map pin adjustment handler
  const handleMapLocationSelect = useCallback(async (newLat, newLng, method = 'map_pin') => {
    const latStr = Number(newLat).toFixed(6);
    const lngStr = Number(newLng).toFixed(6);

    setLatitude(latStr);
    setLongitude(lngStr);
    setDetectionMethod(method);
    setLocationError(null);

    // If marker is dragged manually, it is map_pin selection, not browser GPS lock
    if (method === 'map_pin') {
      setIsGpsDetected(false);
      setLocationAccuracy(null);
      setAccuracyTier(null);
    }

    try {
      const res = await fetch(getApiUrl(`/api/geocode/reverse?lat=${latStr}&lng=${lngStr}`));
      if (res.ok) {
        const data = await res.json();
        if (data.address) {
          setStreetAddress(data.address);
        }
        if (data.district) {
          const match = TAMIL_NADU_DISTRICTS.find(d =>
            d.name.toLowerCase() === data.district.toLowerCase() ||
            d.id.toLowerCase() === data.district.toLowerCase()
          );
          if (match) {
            setSelectedDistrict(match.id);
            if (data.local_body && match.localBodies?.length) {
              const matchedLb = match.localBodies.find(lb =>
                lb.name.toLowerCase().includes(data.local_body.toLowerCase()) ||
                data.local_body.toLowerCase().includes(lb.name.toLowerCase())
              );
              if (matchedLb) setSelectedLocalBody(matchedLb.id);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Map pin reverse geocode notice:', e);
    }
  }, []);

  // Setup speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = lang === 'ta' ? 'ta-IN' : 'en-IN';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setDescription((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [lang]);

  // Pre-fill user data & auto-fetch location on open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setValidationError('');
      if (initialCategory) setCategory(initialCategory);

      // Auto-fetch Citizen Profile Details from props or localStorage
      let activeUser = citizenUser;
      if (!activeUser) {
        try {
          const saved = localStorage.getItem('civic_citizen_user');
          if (saved) activeUser = JSON.parse(saved);
        } catch {
          activeUser = null;
        }
      }

      if (activeUser) {
        if (activeUser.name) setCitizenName(activeUser.name);
        if (activeUser.phone) setCitizenPhone(activeUser.phone);
        if (activeUser.email) setCitizenEmail(activeUser.email);
        if (activeUser.district) {
          const match = TAMIL_NADU_DISTRICTS.find(d =>
            d.name.toLowerCase() === activeUser.district.toLowerCase() ||
            d.id.toLowerCase() === activeUser.district.toLowerCase()
          );
          if (match) {
            setSelectedDistrict(match.id);
            if (activeUser.municipality || activeUser.localBody) {
              const targetLb = (activeUser.municipality || activeUser.localBody || '').toLowerCase();
              const lbMatch = match.localBodies?.find(lb =>
                lb.id.toLowerCase() === targetLb ||
                lb.name.toLowerCase().includes(targetLb)
              );
              if (lbMatch) {
                setSelectedLocalBody(lbMatch.id);
                if (activeUser.ward && lbMatch.zones?.length) {
                  const zMatch = lbMatch.zones.find(z => z.name.toLowerCase().includes(activeUser.ward.toLowerCase()));
                  if (zMatch) setSelectedZoneWard(zMatch.name);
                }
              }
            }
          }
        }
      }
    }
  }, [isOpen, initialCategory, citizenUser]);

  if (!isOpen) return null;

  // Active district object & local bodies
  const currentDistrictObj = TAMIL_NADU_DISTRICTS.find(d => d.id === selectedDistrict) || TAMIL_NADU_DISTRICTS[0];
  const localBodies = currentDistrictObj.localBodies || [];
  const currentLocalBodyObj = localBodies.find(lb => lb.id === selectedLocalBody) || localBodies[0];
  const zones = currentLocalBodyObj?.zones || [];

  const categories = [
    { name: 'Road Damage', desc: 'Potholes, surface cracks, cave-ins' },
    { name: 'Garbage and Sanitation', desc: 'Overflowing dumpsters, unattended biohazard' },
    { name: 'Water Leakage', desc: 'Broken drinking water mains, valve leaks' },
    { name: 'Drainage', desc: 'Choked stormwater drains, open manholes' },
    { name: 'Streetlight', desc: 'Burnt streetlights, dark corridors' },
    { name: 'Electricity', desc: 'Snapped live wires, spark hazards' },
    { name: 'Public Infrastructure', desc: 'Broken bus stops, public footbridges' },
    { name: 'Other', desc: 'General civic or environmental complaint' }
  ];

  // Tamil Nadu realistic test cases
  const demoPresets = [
    {
      label: 'Chennai: Anna Nagar Storm Drain',
      district: 'chennai',
      localBody: 'gcc',
      zoneWard: 'Zone 8 - Anna Nagar (Ward 104)',
      address: '2nd Avenue, near Tower Park Gate 3, Anna Nagar, Chennai - 600040',
      title: 'Open storm drain slab collapsed opposite Tower Park',
      description: 'Heavy rains broke the concrete cover over the 6-foot deep storm drain next to the pedestrian walkway. School students and senior citizens walk here daily. Immediate barrier and slab replacement needed.',
      category: 'Drainage',
      lat: '13.0850',
      lng: '80.2101'
    },
    {
      label: 'Coimbatore: Gandhipuram Garbage Dump',
      district: 'coimbatore',
      localBody: 'ccmc',
      zoneWard: 'Central Zone (Ward 62)',
      address: 'Cross Cut Road, near Gandhipuram Bus Stand, Coimbatore - 641012',
      title: 'Commercial compactor overflowing into stormwater canal',
      description: 'Secondary waste collection container has remained uncleared for 4 days. Waste is spilling across 20 feet of the road, causing severe foul odor and mosquito breeding.',
      category: 'Garbage and Sanitation',
      lat: '11.0183',
      lng: '76.9644'
    },
    {
      label: 'Madurai: Mattuthavani Pothole Hazard',
      district: 'madurai',
      localBody: 'mmc',
      zoneWard: 'North Zone (Ward 18)',
      address: 'Melur Main Road, opposite Mattuthavani Integrated Bus Terminal, Madurai',
      title: 'Deep road crater causing two-wheeler skids',
      description: 'A 3-foot wide, 8-inch deep crater opened right at the bus terminal exit curve. Two motorbikes skidded and fell during morning peak hours. Urgent cold-mix asphalt patch required.',
      category: 'Road Damage',
      lat: '9.9392',
      lng: '78.1537'
    }
  ];

  const applyPreset = (preset) => {
    setSelectedDistrict(preset.district);
    setSelectedLocalBody(preset.localBody);
    setSelectedZoneWard(preset.zoneWard);
    setStreetAddress(preset.address);
    setTitle(preset.title);
    setDescription(preset.description);
    setCategory(preset.category);
    setLatitude(preset.lat);
    setLongitude(preset.lng);
    setIsGpsDetected(true);
    setValidationError('');
  };

  const handleToggleVoice = () => {
    if (!speechSupported || !recognitionRef.current) {
      alert('Voice dictation is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setValidationError('Please upload a valid image file (JPEG, PNG, or WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setValidationError('Image size must be less than 10MB.');
      return;
    }

    setValidationError('');
    setImageFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Step Navigations
  const handleNextStep = () => {
    setValidationError('');
    if (step === 1) {
      if (!streetAddress.trim()) {
        setValidationError('Please provide the street address, landmark, or click Detect GPS.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!category) {
        setValidationError('Please select a grievance category.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!title.trim()) {
        setValidationError('Please provide a brief title or summary.');
        return;
      }
      if (!description.trim() || description.trim().length < 15) {
        setValidationError('Please provide a detailed description (at least 15 characters).');
        return;
      }
      setStep(4);
    }
  };

  const handleSubmitFinal = (e) => {
    e.preventDefault();
    setValidationError('');

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('category', category);
    formData.append('location', streetAddress.trim());
    formData.append('district', currentDistrictObj.name);
    formData.append('local_body', currentLocalBodyObj?.name || 'Municipal Administration');
    formData.append('ward', selectedZoneWard);
    if (latitude) formData.append('latitude', latitude);
    if (longitude) formData.append('longitude', longitude);
    formData.append('isGpsVerified', isGpsDetected ? 'true' : 'false');
    if (locationAccuracy !== null) formData.append('location_accuracy', String(locationAccuracy));
    formData.append('detection_method', detectionMethod);
    formData.append('language', lang);

    if (citizenName.trim()) formData.append('citizen_name', citizenName.trim());
    if (citizenPhone.trim()) formData.append('citizen_phone', citizenPhone.trim());
    if (citizenEmail.trim()) formData.append('citizen_email', citizenEmail.trim());

    if (imageFile) formData.append('image', imageFile);

    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6">
      <div className="bg-white rounded-xl max-w-2xl w-full border border-slate-200 shadow-xl overflow-hidden my-auto animate-in fade-in duration-200 flex flex-col max-h-[95vh] sm:max-h-[90vh]">

        {/* Modal Header */}
        <div className="bg-navy-950 px-4 sm:px-6 py-3.5 sm:py-4 text-white flex items-center justify-between border-b border-navy-900 flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <img
              src="/civicresolve-logo.png"
              alt="CivicResolve Logo"
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain flex-shrink-0 drop-shadow-sm"
            />
            <div>
              <h2 className="text-sm sm:text-base font-bold">
                {lang === 'ta' ? 'à®•à¯à®±à¯ˆà®¤à¯€à®°à¯à®ªà¯à®ªà¯ à®®à®©à¯ à®ªà®¤à®¿à®µà¯ à®šà¯†à®¯à¯à®•' : 'Register Civic Grievance'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-300">
                Tamil Nadu Municipal AI Triage & Direct Field Dispatch
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-navy-900 transition-colors disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Fast-fill Bar (Strictly Development / Demo Only) */}
        {import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_PRESETS === 'true' && (
          <div className="bg-slate-50 px-4 sm:px-6 py-2 border-b border-slate-200 flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs overflow-x-auto flex-nowrap sm:flex-wrap flex-shrink-0">
            <span className="font-semibold text-slate-500 flex-shrink-0">Quick Test Cases:</span>
            {demoPresets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(preset)}
                className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 text-slate-800 font-semibold border border-slate-300 shadow-xs transition-colors whitespace-nowrap"
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}

        {/* 4-Step Progress Indicator */}
        <div className="bg-white px-4 sm:px-6 py-2.5 sm:py-3 border-b border-slate-100 flex items-center justify-between text-[11px] sm:text-xs font-semibold flex-shrink-0">
          {[
            { num: 1, label: t.stepLocation || '1. Location' },
            { num: 2, label: t.stepCategory || '2. Issue Type' },
            { num: 3, label: t.stepDetails || '3. Grievance Info' },
            { num: 4, label: t.stepReview || '4. Review & File' }
          ].map((s) => (
            <div
              key={s.num}
              className={`flex items-center gap-1 sm:gap-1.5 ${
                step === s.num ? 'text-saffron-dark font-bold' : step > s.num ? 'text-emerald-700' : 'text-slate-400'
              }`}
            >
              <span className={`w-4 h-4 sm:w-5 sm:h-5 rounded-md flex items-center justify-center text-[9px] sm:text-[10px] font-bold ${
                step === s.num ? 'bg-saffron text-white' : step > s.num ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' : 'bg-slate-100 text-slate-500'
              }`}>
                {step > s.num ? 'âœ“' : s.num}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Form Body Scroll Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1">
          {validationError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{validationError}</span>
            </div>
          )}

          {/* STEP 1: LOCATION & JURISDICTION */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3 bg-navy-50 border border-navy-100 rounded-lg text-xs text-navy-900">
                <strong>Administrative Routing:</strong> Grievances are routed directly to the specific Municipal Corporation, Zone, and Ward field teams in Tamil Nadu.
              </div>

              {/* Geolocation Loading / Status / Error states */}
              {isGettingLocation && (
                <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-800 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-sky-600 flex-shrink-0" />
                  <span>Acquiring location coordinates from browser geolocation...</span>
                </div>
              )}

              {locationError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Location Detection Notice</p>
                      <p className="text-[11px] text-rose-700">{locationError}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleGetLocation(true)}
                    className="text-xs font-semibold text-rose-800 underline hover:text-rose-950 flex-shrink-0"
                  >
                    Retry
                  </button>
                </div>
              )}

              {isGpsDetected && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <div>
                      <span className="font-bold">Detected Location:</span>{' '}
                      <span className="font-mono">Lat {latitude}, Lng {longitude}</span>
                      {locationAccuracy !== null && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          {accuracyTier} (Â±{locationAccuracy}m)
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleGetLocation(true)}
                    disabled={isGettingLocation}
                    className="text-xs font-semibold text-navy-800 hover:underline flex-shrink-0"
                  >
                    Refresh GPS
                  </button>
                </div>
              )}

              {accuracyTier === 'Low accuracy' && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>Low accuracy detected (Â±{locationAccuracy}m). Please verify the street address or manually adjust location.</span>
                </div>
              )}

              {/* District */}
              <div>
                <label htmlFor="modal-district-select" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  District <span className="text-saffron-dark">*</span>
                </label>
                <select
                  id="modal-district-select"
                  value={selectedDistrict}
                  onChange={(e) => {
                    setSelectedDistrict(e.target.value);
                    const matched = TAMIL_NADU_DISTRICTS.find(d => d.id === e.target.value);
                    if (matched && matched.localBodies?.length) {
                      setSelectedLocalBody(matched.localBodies[0].id);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-navy-800 bg-white focus:outline-none"
                >
                  {TAMIL_NADU_DISTRICTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.name_ta})
                    </option>
                  ))}
                </select>
              </div>

              {/* Local Body */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="modal-localbody-select" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Local Body / Corporation <span className="text-saffron-dark">*</span>
                  </label>
                  <select
                    id="modal-localbody-select"
                    value={selectedLocalBody}
                    onChange={(e) => setSelectedLocalBody(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-navy-800 bg-white focus:outline-none"
                  >
                    {localBodies.map((lb) => (
                      <option key={lb.id} value={lb.id}>
                        {lb.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="modal-zoneward-select" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Zone & Ward
                  </label>
                  <select
                    id="modal-zoneward-select"
                    value={selectedZoneWard}
                    onChange={(e) => setSelectedZoneWard(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-navy-800 bg-white focus:outline-none"
                  >
                    {zones.length > 0 ? (
                      zones.map((z) => {
                        const hasWards = z.is_verified_zone && z.wards && z.wards.length > 0;
                        const optionValue = hasWards ? `${z.name} (Wards: ${z.wards.slice(0, 3).join(', ')}...)` : z.name;
                        const optionLabel = hasWards
                          ? `${z.name} (Wards: ${z.wards.slice(0, 3).join(', ')}...)`
                          : `${z.name} (${lang === 'ta' ? 'à®µà®¾à®°à¯à®Ÿà¯ à®Žà®²à¯à®²à¯ˆà®•à®³à¯ à®µà¯†à®³à®¿à®¯à®¿à®Ÿà®ªà¯à®ªà®Ÿà®µà®¿à®²à¯à®²à¯ˆ' : 'Official ward boundaries pending publication'})`;
                        return (
                          <option key={z.id} value={optionValue}>
                            {optionLabel}
                          </option>
                        );
                      })
                    ) : (
                      <option value="General Municipal Area">
                        {lang === 'ta' ? 'à®ªà¯Šà®¤à¯ à®¨à®•à®°à®¾à®Ÿà¯à®šà®¿ à®ªà®•à¯à®¤à®¿ (à®µà®¾à®°à¯à®Ÿà¯ à®µà¯†à®³à®¿à®¯à®¿à®Ÿà®ªà¯à®ªà®Ÿà®µà®¿à®²à¯à®²à¯ˆ)' : 'General Municipal Area (Ward pending publication)'}
                      </option>
                    )}
                  </select>
                </div>
              </div>

              {/* Street / Landmark Address */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="modal-street-address" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Street Address / Landmark <span className="text-saffron-dark">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleGetLocation(true)}
                    disabled={isGettingLocation}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-navy-900 text-white hover:bg-navy-950 disabled:opacity-50 transition-colors"
                  >
                    {isGettingLocation ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Detecting...</span>
                      </>
                    ) : (
                      <>
                        <Compass className="w-3.5 h-3.5" />
                        <span>{isGpsDetected ? 'Refresh GPS' : 'Detect My Location'}</span>
                      </>
                    )}
                  </button>
                </div>
                <input
                  id="modal-street-address"
                  type="text"
                  placeholder="e.g. 2nd Avenue, near Tower Park Gate 3, Anna Nagar"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-navy-800 focus:outline-none"
                  aria-required="true"
                />
              </div>

              {/* Interactive Location Picker Map */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Pinpoint Incident Spot on Map
                </label>
                <LocationPickerMap
                  latitude={latitude}
                  longitude={longitude}
                  accuracyMeters={locationAccuracy}
                  isGpsDetected={isGpsDetected}
                  onLocationSelect={handleMapLocationSelect}
                />
              </div>
            </div>
          )}

          {/* STEP 2: CATEGORY SELECTION */}
          {step === 2 && (
            <div className="space-y-3 animate-in fade-in">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Select Grievance Category <span className="text-saffron-dark">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    className={`p-3.5 rounded-lg border text-left transition-colors ${
                      category === cat.name
                        ? 'border-navy-900 bg-navy-50/50 ring-1 ring-navy-900 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-slate-900">{cat.name}</span>
                      {category === cat.name && <Check className="w-4 h-4 text-navy-900" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{cat.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: DETAILS, VOICE & EVIDENCE */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <label htmlFor="modal-grievance-title" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Grievance Headline / Summary <span className="text-saffron-dark">*</span>
                </label>
                <input
                  id="modal-grievance-title"
                  type="text"
                  placeholder="e.g. Hazardous deep pothole in front of Anna Nagar metro station"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-navy-800 focus:outline-none"
                  aria-required="true"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="modal-grievance-desc" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Detailed Description (Tamil, English, Tanglish) <span className="text-saffron-dark">*</span>
                  </label>
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={handleToggleVoice}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                        isListening
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      <span>{isListening ? 'Listening...' : 'Voice Dictation'}</span>
                    </button>
                  )}
                </div>
                <textarea
                  id="modal-grievance-desc"
                  rows={4}
                  placeholder="Describe the issue, its severity, and how it impacts traffic or public safety. You can speak or type in Tamil or English..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-navy-800 focus:outline-none"
                  aria-required="true"
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Photographic Evidence (Optional)
                </label>
                {imagePreview ? (
                  <div className="relative rounded-lg overflow-hidden border border-slate-300 h-40 bg-slate-100 flex items-center justify-center">
                    <img src={imagePreview} alt="Evidence preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={removeImage}
                      aria-label="Remove uploaded image"
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-navy-950/80 text-white hover:bg-rose-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-navy-800 rounded-lg p-4 text-center cursor-pointer transition-colors bg-slate-50/50"
                  >
                    <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-slate-700">Click to upload photo evidence</p>
                    <p className="text-[10px] text-slate-400">JPEG, PNG, WEBP up to 10MB</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      aria-label="Upload photographic evidence"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: CITIZEN DETAILS & REVIEW */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                <span className="font-semibold text-slate-600 block uppercase tracking-wider text-[10px]">
                  Grievance Summary Review
                </span>
                <p className="font-bold text-slate-900 text-sm">{title}</p>
                <div className="grid grid-cols-2 gap-2 text-slate-600 text-[11px] pt-1 border-t border-slate-200">
                  <div><strong>Category:</strong> {category}</div>
                  <div><strong>District:</strong> {currentDistrictObj.name}</div>
                  <div><strong>Local Body:</strong> {currentLocalBodyObj?.name}</div>
                  <div><strong>Ward:</strong> {selectedZoneWard}</div>
                  <div className="col-span-2">
                    <strong>Location Mode:</strong>{' '}
                    {isGpsDetected ? (
                      <span className="text-emerald-700 font-semibold">
                        GPS Geotagged (Verified, {accuracyTier} Â±{locationAccuracy}m)
                      </span>
                    ) : latitude && longitude ? (
                      <span className="text-navy-800 font-semibold">
                        Interactive Map Pin (Lat {Number(latitude).toFixed(4)}, Lng {Number(longitude).toFixed(4)})
                      </span>
                    ) : (
                      <span className="text-slate-600">Manual Street Address</span>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 italic pt-1">
                  "{description}"
                </p>
              </div>

              {/* Citizen Contact Information */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 block">
                    Citizen Contact for SMS & Resolution Slip (Optional)
                  </span>
                  {(citizenName || citizenPhone || citizenEmail) && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      âœ“ Session Pre-filled
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="modal-citizen-name" className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">Citizen Name</label>
                    <input
                      id="modal-citizen-name"
                      type="text"
                      placeholder="e.g. Kavitha R"
                      value={citizenName}
                      onChange={(e) => setCitizenName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-navy-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="modal-citizen-phone" className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">Mobile (SMS)</label>
                    <input
                      id="modal-citizen-phone"
                      type="tel"
                      placeholder="9840XXXXXX"
                      value={citizenPhone}
                      onChange={(e) => setCitizenPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-navy-800 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="modal-citizen-email" className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">Email</label>
                    <input
                      id="modal-citizen-email"
                      type="email"
                      placeholder="citizen@mail.com"
                      value={citizenEmail}
                      onChange={(e) => setCitizenEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-navy-800 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls - Sticky Bottom Bar */}
        <div className="sticky bottom-0 bg-slate-50 px-4 sm:px-6 py-3 border-t border-slate-200 flex items-center justify-between gap-2 sm:gap-3 flex-shrink-0 z-10">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors min-h-[44px]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t.backBtn || 'Back'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-lg text-slate-600 hover:text-slate-900 font-semibold text-xs transition-colors min-h-[44px] flex items-center justify-center"
            >
              {lang === 'ta' ? 'à®°à®¤à¯à®¤à¯' : 'Cancel'}
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-saffron hover:bg-saffron-dark text-white font-semibold text-xs shadow-sm transition-colors min-h-[44px]"
            >
              <span>{t.continueBtn || 'Next Step'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmitFinal}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-saffron hover:bg-saffron-dark text-white font-semibold text-xs shadow-sm transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t.submittingBtn || 'Submitting to Portal...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t.submitGrievanceBtn || 'Submit Grievance'}</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
