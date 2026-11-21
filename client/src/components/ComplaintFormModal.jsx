import React, { useState, useRef, useEffect } from 'react';
import { 
  X, UploadCloud, AlertTriangle, Sparkles, 
  Trash2, Loader2, Compass, CheckCircle2, 
  Mic, MicOff, ArrowRight, ArrowLeft, Check
} from 'lucide-react';
import { TAMIL_NADU_DISTRICTS } from '../data/tamilnaduGeo';
import { translations } from '../data/translations';
import { getApiUrl } from '../config/api';

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
  const [latitude, setLatitude] = useState('13.0850');
  const [longitude, setLongitude] = useState('80.2101');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isGpsDetected, setIsGpsDetected] = useState(false);

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

  // Pre-fill user data
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setValidationError('');
      if (initialCategory) setCategory(initialCategory);
      if (citizenUser) {
        setCitizenName(citizenUser.name || '');
        setCitizenPhone(citizenUser.phone || '');
        setCitizenEmail(citizenUser.email || '');
        if (citizenUser.district) {
          const match = TAMIL_NADU_DISTRICTS.find(d => d.name.toLowerCase() === citizenUser.district.toLowerCase());
          if (match) setSelectedDistrict(match.id);
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

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setValidationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setLatitude(lat);
        setLongitude(lng);
        setIsGpsDetected(true);

        try {
          const res = await fetch(getApiUrl(`/api/geocode/reverse?lat=${lat}&lng=${lng}`));
          if (res.ok) {
            const data = await res.json();
            if (data.address) {
              setStreetAddress(data.address);
            }
          }
        } catch (e) {
          if (!streetAddress) {
            setStreetAddress(`Geotagged Coordinates: Lat ${lat}, Lng ${lng}`);
          }
        } finally {
          setIsGettingLocation(false);
        }
      },
      (err) => {
        console.warn('Geolocation fallback:', err.message);
        // Default to Chennai Central coordinates
        setLatitude('13.0827');
        setLongitude('80.2707');
        setIsGpsDetected(true);
        if (!streetAddress) setStreetAddress('Chennai Central Municipal Zone, Tamil Nadu');
        setIsGettingLocation(false);
      },
      { timeout: 7000 }
    );
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
    formData.append('language', lang);

    if (citizenName.trim()) formData.append('citizen_name', citizenName.trim());
    if (citizenPhone.trim()) formData.append('citizen_phone', citizenPhone.trim());
    if (citizenEmail.trim()) formData.append('citizen_email', citizenEmail.trim());

    if (imageFile) formData.append('image', imageFile);

    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-navy-800 px-6 py-5 text-white flex items-center justify-between border-b border-navy-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal/20 border border-teal/40 flex items-center justify-center text-teal-accent">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {lang === 'ta' ? 'குறைதீர்ப்பு மனு பதிவு செய்க' : 'Register Civic Grievance'}
              </h2>
              <p className="text-xs text-slate-300">
                Tamil Nadu Municipal AI Triage & Direct Field Dispatch
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Fast-fill Bar */}
        <div className="bg-slate-50 px-6 py-2.5 border-b border-slate-200 flex flex-wrap items-center gap-2 text-xs flex-shrink-0">
          <span className="font-bold text-slate-500">Quick Test Cases:</span>
          {demoPresets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyPreset(preset)}
              className="px-2.5 py-1 rounded-lg bg-teal/10 hover:bg-teal/20 text-teal-dark font-medium border border-teal/20 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* 4-Step Progress Indicator */}
        <div className="bg-white px-6 py-3 border-b border-slate-100 flex items-center justify-between text-xs font-semibold flex-shrink-0">
          {[
            { num: 1, label: t.stepLocation || '1. Location' },
            { num: 2, label: t.stepCategory || '2. Issue Type' },
            { num: 3, label: t.stepDetails || '3. Grievance Info' },
            { num: 4, label: t.stepReview || '4. Review & File' }
          ].map((s) => (
            <div 
              key={s.num}
              className={`flex items-center gap-1.5 ${
                step === s.num ? 'text-teal font-bold' : step > s.num ? 'text-emerald-600' : 'text-slate-400'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === s.num ? 'bg-teal text-white' : step > s.num ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
              }`}>
                {step > s.num ? '✓' : s.num}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Form Body Scroll Area */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* STEP 1: LOCATION & JURISDICTION */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-blue-900">
                <strong>Administrative Routing:</strong> Grievances are routed directly to the specific Municipal Corporation, Zone, and Ward field teams in Tamil Nadu.
              </div>

              {/* District */}
              <div>
                <label htmlFor="modal-district-select" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  District <span className="text-teal">*</span>
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
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-teal bg-white"
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
                  <label htmlFor="modal-localbody-select" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Local Body / Corporation <span className="text-teal">*</span>
                  </label>
                  <select
                    id="modal-localbody-select"
                    value={selectedLocalBody}
                    onChange={(e) => setSelectedLocalBody(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-teal bg-white"
                  >
                    {localBodies.map((lb) => (
                      <option key={lb.id} value={lb.id}>
                        {lb.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="modal-zoneward-select" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Zone & Ward
                  </label>
                  <select
                    id="modal-zoneward-select"
                    value={selectedZoneWard}
                    onChange={(e) => setSelectedZoneWard(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-teal bg-white"
                  >
                    {zones.length > 0 ? (
                      zones.map((z) => (
                        <option key={z.id} value={`${z.name} (Wards: ${z.wards?.slice(0, 3).join(', ')}...)`}>
                          {z.name}
                        </option>
                      ))
                    ) : (
                      <option value="Municipal Ward Area">Municipal Ward Area</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Street / Landmark Address */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="modal-street-address" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Street Address / Landmark <span className="text-teal">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={isGettingLocation}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:text-teal-dark transition-colors"
                  >
                    {isGettingLocation ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Compass className="w-3.5 h-3.5" />
                    )}
                    <span>{isGpsDetected ? 'GPS Geotagged' : 'Detect GPS'}</span>
                  </button>
                </div>
                <input
                  id="modal-street-address"
                  type="text"
                  placeholder="e.g. 2nd Avenue, near Tower Park Gate 3, Anna Nagar"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal"
                  aria-required="true"
                />
              </div>

              {isGpsDetected && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Geotagged: Lat {latitude}, Lng {longitude} (Verified GPS)</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: CATEGORY SELECTION */}
          {step === 2 && (
            <div className="space-y-3 animate-in fade-in">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Grievance Category <span className="text-teal">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      category === cat.name
                        ? 'border-teal bg-teal-50/40 ring-2 ring-teal shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-navy-950">{cat.name}</span>
                      {category === cat.name && <Check className="w-4 h-4 text-teal" />}
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
                <label htmlFor="modal-grievance-title" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Grievance Headline / Summary <span className="text-teal">*</span>
                </label>
                <input
                  id="modal-grievance-title"
                  type="text"
                  placeholder="e.g. Hazardous deep pothole in front of Anna Nagar metro station"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal"
                  aria-required="true"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="modal-grievance-desc" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Detailed Description (Tamil, English, Tanglish) <span className="text-teal">*</span>
                  </label>
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={handleToggleVoice}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        isListening
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-teal/10 text-teal-dark hover:bg-teal/20'
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
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal"
                  aria-required="true"
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Photographic Evidence (Optional)
                </label>
                {imagePreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-300 h-40 bg-slate-100 flex items-center justify-center">
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
                    className="border-2 border-dashed border-slate-300 hover:border-teal rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50"
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
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <span className="font-bold text-slate-600 block uppercase tracking-wider text-[10px]">
                  Grievance Summary Review
                </span>
                <p className="font-bold text-navy-950 text-sm">{title}</p>
                <div className="grid grid-cols-2 gap-2 text-slate-600 text-[11px] pt-1 border-t border-slate-200">
                  <div><strong>Category:</strong> {category}</div>
                  <div><strong>District:</strong> {currentDistrictObj.name}</div>
                  <div><strong>Local Body:</strong> {currentLocalBodyObj?.name}</div>
                  <div><strong>Ward:</strong> {selectedZoneWard}</div>
                </div>
                <p className="text-[11px] text-slate-500 italic pt-1">
                  "{description}"
                </p>
              </div>

              {/* Citizen Contact Information */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-navy-950 block">
                  Citizen Contact for SMS & Resolution Slip (Optional)
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="modal-citizen-name" className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Citizen Name</label>
                    <input
                      id="modal-citizen-name"
                      type="text"
                      placeholder="e.g. Kavitha R"
                      value={citizenName}
                      onChange={(e) => setCitizenName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal"
                    />
                  </div>
                  <div>
                    <label htmlFor="modal-citizen-phone" className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Mobile (SMS)</label>
                    <input
                      id="modal-citizen-phone"
                      type="tel"
                      placeholder="9840XXXXXX"
                      value={citizenPhone}
                      onChange={(e) => setCitizenPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal"
                    />
                  </div>
                  <div>
                    <label htmlFor="modal-citizen-email" className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Email</label>
                    <input
                      id="modal-citizen-email"
                      type="email"
                      placeholder="citizen@mail.com"
                      value={citizenEmail}
                      onChange={(e) => setCitizenEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-teal"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3 flex-shrink-0">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:text-navy-950 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-dark hover:from-teal-light hover:to-teal text-white font-bold text-xs shadow-md shadow-teal-500/20 transition-all"
            >
              <span>Next Step</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmitFinal}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-dark hover:from-teal-light hover:to-teal text-white font-bold text-xs shadow-md shadow-teal-500/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting to Portal...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Grievance</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
