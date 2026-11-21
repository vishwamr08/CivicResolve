import React, { useState } from 'react';
import { 
  ShieldCheck, ArrowRight, Search, Clock, Building2, 
  AlertTriangle, Trash2, Droplets, Waves, Lightbulb, 
  Zap, Landmark, HelpCircle, ChevronRight
} from 'lucide-react';

export default function ServicesPage({ onOpenSubmit, lang = 'en' }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const servicesDetails = [
    {
      id: 'Road Damage',
      title: 'Roads, Potholes & Footpaths',
      title_ta: 'சாலைகள், பள்ளங்கள் & நடைபாதைகள்',
      icon: AlertTriangle,
      color: 'amber',
      bgLight: 'bg-amber-500/10',
      borderLight: 'border-amber-500/20',
      textColor: 'text-amber-600',
      department: 'Tamil Nadu Highways & Municipal Works Dept',
      department_ta: 'நெடுஞ்சாலை & நகராட்சி பணிகள் துறை',
      slaHours: 48,
      group: 'infrastructure',
      description: 'Report road craters, uneven road milling, broken pedestrian footpaths, damaged speed bumps, and missing road median barriers.',
      description_ta: 'சாலைப் பள்ளங்கள், சேதமடைந்த நடைபாதைகள், வேகத்தடைகள் மற்றும் தடுப்புச் சுவர்கள் குறித்த புகார்கள்.',
      sampleIssues: ['Severe Potholes', 'Pedestrian Pathway Broken', 'Road Cave-in Risk', 'Damaged Median']
    },
    {
      id: 'Garbage and Sanitation',
      title: 'Garbage, Waste & Sanitation',
      title_ta: 'குப்பை, திடக்கழிவு & சுகாதாரம்',
      icon: Trash2,
      color: 'emerald',
      bgLight: 'bg-emerald-500/10',
      borderLight: 'border-emerald-500/20',
      textColor: 'text-emerald-600',
      department: 'Municipal Solid Waste & Public Health Division',
      department_ta: 'திடக்கழிவு மேலாண்மை & பொது சுகாதார பிரிவு',
      slaHours: 12,
      group: 'sanitation',
      description: 'Rapid clearance of overflowing community bins, open debris dumping, uncollected domestic waste, dead animal removal, and illegal garbage incineration.',
      description_ta: 'நிறைந்த குப்பைத் தொட்டிகள், கட்டடக் கழிவுகள், அகற்றப்படாத குப்பைகள் மற்றும் தூய்மைப் பணிகள்.',
      sampleIssues: ['Overflowing Public Bin', 'Construction Debris Dumped', 'Animal Carcass Removal', 'Illegal Trash Burning']
    },
    {
      id: 'Water Leakage',
      title: 'Drinking Water Supply & Pipelines',
      title_ta: 'குடிநீர் வழங்கல் & குழாய் உடைப்பு',
      icon: Droplets,
      color: 'cyan',
      bgLight: 'bg-cyan-500/10',
      borderLight: 'border-cyan-500/20',
      textColor: 'text-cyan-600',
      department: 'Chennai Metro Water (CMWSSB) & TWAD Board',
      department_ta: 'சென்னை பெருநகர குடிநீர் & வடிகால் வாரியம் (CMWSSB)',
      slaHours: 24,
      group: 'water',
      description: 'Emergency response for ruptured potable water distribution mains, contaminated water supply, contaminated tank seepage, and missing valve covers.',
      description_ta: 'குடிநீர் குழாய் உடைப்பு, அசுத்தமான குடிநீர் விநியோகம், குறைந்த அழுத்தம் மற்றும் நீர் கசிவு.',
      sampleIssues: ['Main Pipeline Burst', 'Contaminated Brown Water', 'Zero Water Pressure', 'Broken Valve Joint']
    },
    {
      id: 'Drainage',
      title: 'Stormwater Drains, Sewage & Flooding',
      title_ta: 'மழைநீர் வடிகால், கழிவுநீர் & வெள்ளம்',
      icon: Waves,
      color: 'blue',
      bgLight: 'bg-blue-500/10',
      borderLight: 'border-blue-500/20',
      textColor: 'text-blue-600',
      department: 'Municipal Drainage & Sewerage Operations',
      department_ta: 'நகராட்சி வடிகால் மற்றும் கழிவுநீரகப் பிரிவு',
      slaHours: 24,
      group: 'water',
      description: 'Urgent clearing of clogged stormwater canals, overflowing blackwater manholes, missing drain covers posing pedestrian hazards, and monsoon waterlogging.',
      description_ta: 'அடைபட்ட மழைநீர் வடிகால்கள், தெருவில் வழியும் கழிவுநீர் மற்றும் திறந்திருக்கும் சாக்கடை மூடிகள்.',
      sampleIssues: ['Street Sewage Overflow', 'Choked Storm Drain', 'Missing Sump Cover', 'Monsoon Waterlogging']
    },
    {
      id: 'Streetlight',
      title: 'Streetlights & Public Luminaire',
      title_ta: 'தெருவிளக்குகள் & பொது மின்விளக்கு',
      icon: Lightbulb,
      color: 'amber',
      bgLight: 'bg-yellow-500/10',
      borderLight: 'border-yellow-500/20',
      textColor: 'text-yellow-600',
      department: 'Electrical Works Division & Municipal Corporation',
      department_ta: 'மின் பணிகள் பிரிவு & மாநகராட்சி',
      slaHours: 24,
      group: 'utilities',
      description: 'Repair of dead streetlights, hazardous hanging LED luminaires, continuously daytime-burning lights, dark transit corridors, and high-mast lamp failures.',
      description_ta: 'எரியாத தெருவிளக்குகள், சேதமடைந்த மின் கம்பங்கள் மற்றும் இருளான பொது வழிகள்.',
      sampleIssues: ['Complete Street Dark', 'Damaged Light Fixture', 'Daytime Burning Lamp', 'High-Mast Tower Fault']
    },
    {
      id: 'Electricity',
      title: 'TANGEDCO Power Cables & Transformers',
      title_ta: 'மின்சார வயர்கள் & மின்மாற்றிகள் (TANGEDCO)',
      icon: Zap,
      color: 'rose',
      bgLight: 'bg-rose-500/10',
      borderLight: 'border-rose-500/20',
      textColor: 'text-rose-600',
      department: 'TANGEDCO (Tamil Nadu Generation & Distribution)',
      department_ta: 'தமிழ்நாடு மின் உற்பத்தி மற்றும் பகிர்மான கழகம்',
      slaHours: 8,
      group: 'utilities',
      description: 'Immediate red-flag response for sagging overhead electrical conductors, sparking transformer units, low-hanging HT/LT lines, and exposed roadside distribution pillars.',
      description_ta: 'அறுந்து தொங்கும் மின் கம்பிகள், தீப்பொறி பறக்கும் மின்மாற்றி மற்றும் ஆபத்தான மின்பெட்டிகள்.',
      sampleIssues: ['Snapped Power Wire', 'Sparking Transformer', 'Leaning Electrical Pole', 'Exposed Fuse Box']
    },
    {
      id: 'Public Infrastructure',
      title: 'Parks, Bus Shelters & Public Buildings',
      title_ta: 'பூங்காக்கள், பேருந்து நிழற்குடைகள் & பொது கட்டடங்கள்',
      icon: Landmark,
      color: 'purple',
      bgLight: 'bg-purple-500/10',
      borderLight: 'border-purple-500/20',
      textColor: 'text-purple-600',
      department: 'Town Planning, Parks & Public Infrastructure',
      department_ta: 'நகரமைப்பு, பூங்காக்கள் & பொது உள்கட்டமைப்பு',
      slaHours: 72,
      group: 'infrastructure',
      description: 'Restoration of broken bus passenger shelters, hazardous playground equipment, broken park perimeter fencing, unmaintained public restrooms, and dangerous tree boughs.',
      description_ta: 'சேதமடைந்த பேருந்து நிறுத்தங்கள், பூங்கா உபகரணங்கள், பொது கழிப்பறைகள் மற்றும் விழுந்த மரக்கிளைகள்.',
      sampleIssues: ['Vandalized Bus Stop', 'Broken Children Play Ride', 'Damaged Park Bench', 'Hazardous Tree Branch']
    },
    {
      id: 'Other',
      title: 'Other Civic Grievances',
      title_ta: 'பிற குடிமை குறைபாடுகள்',
      icon: HelpCircle,
      color: 'indigo',
      bgLight: 'bg-indigo-500/10',
      borderLight: 'border-indigo-500/20',
      textColor: 'text-indigo-600',
      department: 'Citizen Grievance Triage Desk & District Collectorate',
      department_ta: 'பொது மக்கள் குறைதீர்ப்பு பிரிவு & மாவட்ட ஆட்சியர் அலுவலகம்',
      slaHours: 48,
      group: 'other',
      description: 'Lodge complaints regarding public encroachments, stray dog and cattle menace, excessive commercial noise pollution, unlicensed hoardings, or unattended municipal concerns.',
      description_ta: 'ஆக்கிரமிப்புகள், தெரு நாய் மற்றும் கால்நடை தொல்லைகள், சத்தக் கேடு மற்றும் பொதுவான புகார்கள்.',
      sampleIssues: ['Stray Cattle Menace', 'Unauthorized Big Banner', 'Public Encroachment', 'Stagnant Mosquito Pool']
    }
  ];

  const filterTabs = [
    { id: 'all', label: lang === 'ta' ? 'அனைத்து சேவைகள்' : 'All Services' },
    { id: 'infrastructure', label: lang === 'ta' ? 'உள்கட்டமைப்பு' : 'Infrastructure' },
    { id: 'sanitation', label: lang === 'ta' ? 'சுகாதாரம்' : 'Sanitation' },
    { id: 'water', label: lang === 'ta' ? 'நீர் & கழிவுநீர்' : 'Water & Drains' },
    { id: 'utilities', label: lang === 'ta' ? 'மின்சாரம் & விளக்குகள்' : 'Power & Lights' }
  ];

  const filteredServices = servicesDetails.filter(srv => {
    const matchesFilter = selectedFilter === 'all' || srv.group === selectedFilter;
    const matchesSearch = !searchQuery.trim() || 
      srv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      srv.title_ta.includes(searchQuery) ||
      srv.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      srv.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      srv.sampleIssues.some(issue => issue.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-16">
      
      {/* Hero Section */}
      <div className="bg-slate-900 text-white border-b border-slate-800 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-950/40 via-slate-900/60 to-slate-950 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold tracking-wide">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>{lang === 'ta' ? 'தமிழ்நாடு நகராட்சி சேவைகள்' : 'Tamil Nadu Citizen Services Directory'}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white max-w-3xl">
            {lang === 'ta' 
              ? 'நகராட்சி சேவைகள் & தீர்வு கால அவகாசங்கள்' 
              : 'Municipal Public Services & Guaranteed SLAs'}
          </h1>

          <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
            {lang === 'ta'
              ? 'அனைத்து குடிமைப் பிரிவுகளின் பொறுப்பு துறைகள் மற்றும் தீர்வுக்கான கால வரம்புகளைப் பார்க்கவும். உடனடி நடவடிக்கைக்காக உங்கள் குறையை நேரடியாக பதிவு செய்யவும்.'
              : 'Every civic service is backed by guaranteed Citizen Charter turnaround timelines, automated AI triage, and real-time municipal ward officer dispatch across Tamil Nadu.'}
          </p>

          {/* Quick Search Bar */}
          <div className="pt-4 max-w-xl">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'ta' ? 'சேவை அல்லது துறை தேடவும் (எ.கா. குப்பை, குடிநீர், சாலை)...' : 'Search service, department, or keyword (e.g. pothole, sewage, streetlight)...'}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 shadow-lg"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none">
          {filterTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Results Counter */}
        <div className="py-2 flex items-center justify-between text-xs text-slate-500">
          <span>
            {lang === 'ta' 
              ? `${filteredServices.length} சேவைகள் காண்பிக்கப்படுகின்றன` 
              : `Showing ${filteredServices.length} of ${servicesDetails.length} Municipal Services`}
          </span>
          <span className="flex items-center gap-1 font-semibold text-teal-700">
            <Clock className="w-3.5 h-3.5" />
            <span>Guaranteed Resolution SLAs: 8h - 72h</span>
          </span>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {filteredServices.map(srv => {
            const Icon = srv.icon;
            return (
              <div 
                key={srv.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-teal-500/40 p-6 shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className={`w-12 h-12 rounded-xl ${srv.bgLight} border ${srv.borderLight} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                      <Icon className={`w-6 h-6 ${srv.textColor}`} />
                    </div>
                    
                    {/* SLA Badge */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-teal-600" />
                      <span>{srv.slaHours}h Target SLA</span>
                    </div>
                  </div>

                  {/* Title & Department */}
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 group-hover:text-teal-700 transition-colors">
                      {lang === 'ta' ? srv.title_ta : srv.title}
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500 mt-1 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{lang === 'ta' ? srv.department_ta : srv.department}</span>
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {lang === 'ta' ? srv.description_ta : srv.description}
                  </p>

                  {/* Typical Issues Tags */}
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      {lang === 'ta' ? 'பொதுவான குறைகள்:' : 'Common Report Types:'}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {srv.sampleIssues.map((issue, idx) => (
                        <span 
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-medium"
                        >
                          {issue}
                        </span>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Working CTA Button */}
                <div className="pt-6 mt-6 border-t border-slate-100">
                  <button
                    onClick={() => onOpenSubmit && onOpenSubmit(srv.id)}
                    className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-slate-900 hover:bg-teal-600 shadow-sm flex items-center justify-center gap-2 group-hover:shadow-md transition-all active:scale-[0.98]"
                  >
                    <span>{lang === 'ta' ? 'இக்குறையை பதிவு செய்' : 'Report This Issue'}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>

        {/* Bottom SLA Assurance Banner */}
        <div className="mt-12 p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl text-center md:text-left">
            <h3 className="font-extrabold text-xl text-white">
              {lang === 'ta' ? 'குடிமக்கள் உரிமை சாசனம் & கண்காணிப்பு' : 'Citizen Charter & SLA Guarantee'}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {lang === 'ta'
                ? 'அனைத்து புகார்களும் தமிழ்நாடு குடிமக்கள் குறைதீர்க்கும் சாசனத்தின் கீழ் கண்காணிக்கப்படுகின்றன. நிர்ணயிக்கப்பட்ட நேரத்திற்குள் தீர்வு காணப்படாவிட்டால் தானாகவே உயர் அதிகாரிகளுக்குப் பரிந்துரைக்கப்படும்.'
                : 'Every grievance filed through CivicResolve is tracked with cryptographic verification, automated departmental assignment, and real-time supervisory escalation if an SLA expires.'}
            </p>
          </div>
          <button
            onClick={() => onOpenSubmit && onOpenSubmit('Road Damage')}
            className="px-6 py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs shadow-lg transition-all flex items-center gap-2 whitespace-nowrap active:scale-95"
          >
            <span>{lang === 'ta' ? 'பொது மனு பதிவு செய்க' : 'File a New Grievance'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
}