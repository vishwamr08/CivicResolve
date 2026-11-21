const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

const ALLOWED_CATEGORIES = [
  'Road Damage',
  'Garbage and Sanitation',
  'Water Leakage',
  'Drainage',
  'Streetlight',
  'Electricity',
  'Public Infrastructure',
  'Other'
];

const ALLOWED_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const TN_DEPARTMENTS_LIST = [
  'Roads & Highways Department (TN Highways / PWD)',
  'Municipal Solid Waste & Sanitation Board',
  'Chennai Metro Water Supply & Sewerage Board (CMWSSB) / TWAD',
  'Stormwater Drainage & Flood Mitigation Division',
  'Tamil Nadu Generation and Distribution Corporation (TANGEDCO)',
  'Urban Local Bodies Public Lighting Division',
  'Public Safety & Traffic Infrastructure Wing',
  'Citizen Grievance Triage Desk'
];

/**
 * Deterministic Rule-Based Fallback Engine
 * Analyzes grievance keywords across English, Tamil, and Tanglish
 */
function deterministicRuleBasedTriage({ title = '', description = '', category = '', location = '', district = 'Chennai' }) {
  const text = `${title} ${description} ${category} ${location}`.toLowerCase();

  // Electricity / High-voltage live safety emergency
  if (
    text.includes('electric') || text.includes('wire') || text.includes('cable') ||
    text.includes('transformer') || text.includes('spark') || text.includes('shock') ||
    text.includes('power cut') || text.includes('மின்சாரம்') || text.includes('கம்பி') ||
    text.includes('tangedco') || text.includes('eb')
  ) {
    const isImminentDanger = text.includes('spark') || text.includes('snapped') || text.includes('hanging') || text.includes('shock') || text.includes('smoke');
    return {
      ai_status: 'SUCCESS',
      ai_engine: 'Rule-Based Deterministic Heuristic Engine (Gemini Fallback)',
      ai_summary: `Electrical Hazard Triage: ${title.slice(0, 80)}`,
      ai_category: 'Electricity',
      ai_priority: isImminentDanger ? 'Critical' : 'High',
      ai_department: 'Tamil Nadu Generation and Distribution Corporation (TANGEDCO)',
      ai_confidence: 0.92,
      ai_reason: 'Detected high-voltage electrical keywords affecting public safety. Routed to TANGEDCO emergency grid response.',
      ai_safety_risk: isImminentDanger ? 'Severe risk of electrocution or electrical fire' : 'Potential grid failure and public hazard',
      ai_recommended_action: 'Deploy TANGEDCO line patrol for immediate power isolation and cable repair.',
      ai_suggested_response_time: isImminentDanger ? '6 hours' : '12 hours',
      risk_flags: isImminentDanger ? ['Live Cable Hazard', 'Life Safety Emergency'] : ['Power Infrastructure Risk']
    };
  }

  // Road Damage / Pothole
  if (
    text.includes('pothole') || text.includes('road') || text.includes('crater') ||
    text.includes('cave-in') || text.includes('asphalt') || text.includes('divider') ||
    text.includes('சாலை') || text.includes('குழி') || text.includes('pallam') || text.includes('saalai')
  ) {
    const isCriticalRoad = text.includes('highway') || text.includes('deep') || text.includes('accident') || text.includes('cave-in');
    return {
      ai_status: 'SUCCESS',
      ai_engine: 'Rule-Based Deterministic Heuristic Engine (Gemini Fallback)',
      ai_summary: `Road Damage Redressal: ${title.slice(0, 80)}`,
      ai_category: 'Road Damage',
      ai_priority: isCriticalRoad ? 'High' : 'Medium',
      ai_department: 'Roads & Highways Department (TN Highways / PWD)',
      ai_confidence: 0.90,
      ai_reason: 'Identified vehicular surface hazard. Routed to Highways / Corporation road maintenance division.',
      ai_safety_risk: isCriticalRoad ? 'High risk of two-wheeler skids and traffic disruption' : 'Moderate vehicular wear and transit slowing',
      ai_recommended_action: 'Dispatch road repair crew with cold-mix asphalt patch for immediate leveling.',
      ai_suggested_response_time: isCriticalRoad ? '24 hours' : '48 hours',
      risk_flags: isCriticalRoad ? ['Accident Blackspot', 'Road Surface Fracture'] : ['Road Defect']
    };
  }

  // Drainage / Stormwater / Sewage overflow
  if (
    text.includes('drain') || text.includes('sewage') || text.includes('sewer') ||
    text.includes('waterlogging') || text.includes('flood') || text.includes('manhole') ||
    text.includes('சாக்கடை') || text.includes('வடிகால்') || text.includes('drainage') || text.includes('kulai')
  ) {
    const isFloodRisk = text.includes('overflow') || text.includes('flood') || text.includes('hospital') || text.includes('open manhole');
    return {
      ai_status: 'SUCCESS',
      ai_engine: 'Rule-Based Deterministic Heuristic Engine (Gemini Fallback)',
      ai_summary: `Drainage & Sewerage Triage: ${title.slice(0, 80)}`,
      ai_category: 'Drainage',
      ai_priority: isFloodRisk ? 'Critical' : 'High',
      ai_department: 'Stormwater Drainage & Flood Mitigation Division',
      ai_confidence: 0.89,
      ai_reason: 'Sewerage/stormwater discharge hazard identified. Routed to Municipal Flood & Sullage Mitigation.',
      ai_safety_risk: isFloodRisk ? 'Biological contamination, open fall hazard, and mosquito breeding vector' : 'Noxious odor and localized water accumulation',
      ai_recommended_action: 'Deploy super-sucker de-silting unit and secure manhole barriers.',
      ai_suggested_response_time: isFloodRisk ? '12 hours' : '24 hours',
      risk_flags: isFloodRisk ? ['Biohazard Threat', 'Open Manhole Hazard'] : ['Drainage Blockage']
    };
  }

  // Water Leakage / Drinking Water
  if (
    text.includes('water') || text.includes('leak') || text.includes('pipe') ||
    text.includes('potable') || text.includes('drinking water') || text.includes('குடிநீர்') ||
    text.includes('தண்ணீர்') || text.includes('thanneer') || text.includes('kudineer')
  ) {
    return {
      ai_status: 'SUCCESS',
      ai_engine: 'Rule-Based Deterministic Heuristic Engine (Gemini Fallback)',
      ai_summary: `Drinking Water Supply Triage: ${title.slice(0, 80)}`,
      ai_category: 'Water Leakage',
      ai_priority: 'High',
      ai_department: 'Chennai Metro Water Supply & Sewerage Board (CMWSSB) / TWAD',
      ai_confidence: 0.88,
      ai_reason: 'Drinking water distribution defect detected. Routed to CMWSSB / TWAD water supply wing.',
      ai_safety_risk: 'Wastage of precious treated drinking water and risk of low water pressure in neighborhood',
      ai_recommended_action: 'Dispatch CMWSSB pipeline repair gang to isolate valve and repair pipe burst.',
      ai_suggested_response_time: '24 hours',
      risk_flags: ['Treated Water Loss', 'Supply Contamination Risk']
    };
  }

  // Garbage and Sanitation
  if (
    text.includes('garbage') || text.includes('waste') || text.includes('trash') ||
    text.includes('bin') || text.includes('dump') || text.includes('debris') ||
    text.includes('குப்பை') || text.includes('kuppai') || text.includes('sanitation')
  ) {
    return {
      ai_status: 'SUCCESS',
      ai_engine: 'Rule-Based Deterministic Heuristic Engine (Gemini Fallback)',
      ai_summary: `Sanitation & Waste Clearance: ${title.slice(0, 80)}`,
      ai_category: 'Garbage and Sanitation',
      ai_priority: 'Medium',
      ai_department: 'Municipal Solid Waste & Sanitation Board',
      ai_confidence: 0.88,
      ai_reason: 'Municipal solid waste accumulation reported. Routed to zonal sanitary inspector squad.',
      ai_safety_risk: 'Vector-borne disease spread, stray animal proliferation, and environmental pollution',
      ai_recommended_action: 'Mobilize municipal compactor truck and deploy conservancy workers for area clearing.',
      ai_suggested_response_time: '24 hours',
      risk_flags: ['Sanitation Deficit', 'Vector Hazard']
    };
  }

  // Streetlight
  if (
    text.includes('light') || text.includes('streetlight') || text.includes('lamp') ||
    text.includes('dark') || text.includes('led') || text.includes('விளக்கு') || text.includes('vilakku')
  ) {
    return {
      ai_status: 'SUCCESS',
      ai_engine: 'Rule-Based Deterministic Heuristic Engine (Gemini Fallback)',
      ai_summary: `Street Lighting Redressal: ${title.slice(0, 80)}`,
      ai_category: 'Streetlight',
      ai_priority: 'Medium',
      ai_department: 'Urban Local Bodies Public Lighting Division',
      ai_confidence: 0.90,
      ai_reason: 'Public illumination outage reported. Routed to electrical lighting maintenance division.',
      ai_safety_risk: 'Reduced pedestrian nocturnal safety, increased vulnerability to antisocial activities',
      ai_recommended_action: 'Deploy hydraulic ladder crane to replace damaged luminaire or control timer relay.',
      ai_suggested_response_time: '24 hours',
      risk_flags: ['Public Safety Corridors']
    };
  }

  // Public Infrastructure
  if (
    text.includes('tree') || text.includes('park') || text.includes('bench') ||
    text.includes('shelter') || text.includes('bus stop') || text.includes('sidewalk') ||
    text.includes('pavement') || text.includes('மரம்') || text.includes('maram')
  ) {
    return {
      ai_status: 'SUCCESS',
      ai_engine: 'Rule-Based Deterministic Heuristic Engine (Gemini Fallback)',
      ai_summary: `Public Infrastructure Maintenance: ${title.slice(0, 80)}`,
      ai_category: 'Public Infrastructure',
      ai_priority: 'Medium',
      ai_department: 'Public Safety & Traffic Infrastructure Wing',
      ai_confidence: 0.85,
      ai_reason: 'Public civic amenity damage reported. Routed to municipal infrastructure division.',
      ai_safety_risk: 'Pedestrian impedance and civic utility degradation',
      ai_recommended_action: 'Schedule on-site civil works team for structural restoration.',
      ai_suggested_response_time: '48 hours',
      risk_flags: ['Public Amenity Disrepair']
    };
  }

  // Default General Category
  const finalCat = ALLOWED_CATEGORIES.includes(category) ? category : 'Other';
  return {
    ai_status: 'SUCCESS',
    ai_engine: 'Rule-Based Deterministic Heuristic Engine (Gemini Fallback)',
    ai_summary: `Civic Grievance Triage: ${title.slice(0, 80)}`,
    ai_category: finalCat,
    ai_priority: 'Medium',
    ai_department: 'Citizen Grievance Triage Desk',
    ai_confidence: 0.80,
    ai_reason: 'Grievance categorized via deterministic civic heuristic rules for municipal inspection.',
    ai_safety_risk: 'Standard municipal monitoring recommended.',
    ai_recommended_action: 'Assign to ward duty officer for initial verification.',
    ai_suggested_response_time: '48 hours',
    risk_flags: ['Standard Verification']
  };
}

/**
 * Primary AI Complaint Triage Engine powered by Official Google Gemini SDK (@google/genai)
 * Model: gemini-2.5-flash with Multimodal Vision & Bilingual Support
 */
async function analyzeComplaintWithGemini({ title, description, category, location, district, imagePath, mimeType }) {
  const apiKey = process.env.GEMINI_API_KEY;

  // If GEMINI_API_KEY is not configured or is a placeholder, trigger deterministic rule-based fallback
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_gemini_api_key')) {
    console.warn('[Gemini AI Triage] GEMINI_API_KEY is unconfigured. Applying deterministic rule-based heuristic triage.');
    return deterministicRuleBasedTriage({ title, description, category, location, district });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    const systemInstruction = `You are CivicResolve AI Triage Engine, modeled after Tamil Nadu's Mudhalvarin Mugavari municipal grievance redressal system.
You can read and understand grievances submitted in English, Tamil script (தமிழ்), and Tanglish (Tamil written in English script).
Analyze the citizen grievance to accurately categorize, prioritize, evaluate public safety risk, and route it to the proper Tamil Nadu civic authority.

MUNICIPAL DEPARTMENTS IN TAMIL NADU:
- "Roads & Highways Department (TN Highways / PWD)": Potholes, road cavities, bridge cracks, damaged dividers.
- "Municipal Solid Waste & Sanitation Board": Overflowing dumpsters, garbage accumulation, biohazards, dead animals.
- "Chennai Metro Water Supply & Sewerage Board (CMWSSB) / TWAD": Potable drinking water leaks, broken supply mains, low pressure, contaminated water.
- "Stormwater Drainage & Flood Mitigation Division": Choked storm drains, road waterlogging, open culverts, monsoon flooding.
- "Tamil Nadu Generation and Distribution Corporation (TANGEDCO)": Snapped power cables, sparking transformers, low-hanging electrical hazards, blackout feeder pillars.
- "Urban Local Bodies Public Lighting Division": Non-functional streetlights, dark public corridors, broken luminaires.
- "Public Safety & Traffic Infrastructure Wing": Fallen trees blocking traffic, damaged bus shelters, missing manhole covers, pedestrian crossing hazards.
- "Citizen Grievance Triage Desk": Other general administrative matters.

CRITICAL INSTRUCTIONS:
1. Category MUST be strictly one of:
   - "Road Damage"
   - "Garbage and Sanitation"
   - "Water Leakage"
   - "Drainage"
   - "Streetlight"
   - "Electricity"
   - "Public Infrastructure"
   - "Other"

2. Priority MUST be strictly one of:
   - "Low": Minor cosmetic issues, non-obstructive signage.
   - "Medium": Standard streetlight failure, regular garbage clearance.
   - "High": Potholes on active roads, water main leaks, blocked hospital drains.
   - "Critical": Imminent danger to life (live snapped electric wires, open deep storm drain, major water main collapse, road cave-in).

3. Output MUST be valid JSON adhering to this schema:
{
  "summary": "Concise 1-sentence synthesis in English (translate Tamil if necessary)",
  "category": "One of the allowed categories",
  "priority": "Low | Medium | High | Critical",
  "department": "Name of responsible Tamil Nadu civic authority",
  "confidence": 0.95,
  "reason": "Detailed justification explaining severity and department routing",
  "safetyRisk": "Direct assessment of public health or safety threats",
  "recommendedAction": "Concrete field action recommended for municipal officers",
  "suggestedResponseTime": "Target SLA window (e.g. '6 hours', '24 hours', '48 hours')",
  "risk_flags": ["Array of concise risk tags like 'Live Cable Hazard', 'Accident Blackspot'"]
}`;

    let userPromptText = `Citizen report details (Tamil Nadu Grievance Portal):
- Submitted Title: "${title}"
- Submitted Description: "${description}"
- Submitted Category: "${category || 'Not specified'}"
- Reported Location: "${location || 'Not specified'}"
- District: "${district || 'Chennai'}"`;

    const contents = [];

    // Multimodal image support
    const hasImage = imagePath && fs.existsSync(imagePath);
    if (hasImage) {
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Data = imageBuffer.toString('base64');
      const effectiveMime = mimeType || 'image/jpeg';

      userPromptText += `\n\nA photo of the reported incident is attached. Visually assess the physical severity and damage level.`;
      contents.push({
        inlineData: {
          data: base64Data,
          mimeType: effectiveMime
        }
      });
    }

    contents.push(userPromptText);

    // Invoke Google Gemini with gemini-2.5-flash
    const response = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    });

    const responseText = response.text ? response.text.trim() : '';
    console.log(`[Google Gemini AI Response] (model: ${model}):`, responseText.slice(0, 160));

    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseErr) {
      const cleaned = responseText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      parsed = JSON.parse(cleaned);
    }

    const validCategory = ALLOWED_CATEGORIES.includes(parsed.category)
      ? parsed.category
      : (ALLOWED_CATEGORIES.includes(category) ? category : 'Other');

    const validPriority = ALLOWED_PRIORITIES.includes(parsed.priority)
      ? parsed.priority
      : 'Medium';

    const validConfidence = typeof parsed.confidence === 'number' && parsed.confidence >= 0 && parsed.confidence <= 1
      ? Math.round(parsed.confidence * 100) / 100
      : 0.95;

    return {
      ai_status: 'SUCCESS',
      ai_engine: `Google Gemini 2.5 Flash (${model})`,
      ai_summary: parsed.summary || `${title}`,
      ai_category: validCategory,
      ai_priority: validPriority,
      ai_department: parsed.department || 'Roads & Highways Department (TN Highways / PWD)',
      ai_confidence: validConfidence,
      ai_reason: parsed.reason || 'AI multimodal classification completed via Google Gemini.',
      ai_safety_risk: parsed.safetyRisk || 'Standard municipal vigilance required.',
      ai_recommended_action: parsed.recommendedAction || 'Schedule departmental inspection.',
      ai_suggested_response_time: parsed.suggestedResponseTime || '24 hours',
      risk_flags: Array.isArray(parsed.risk_flags) ? parsed.risk_flags : ['Gemini Verified']
    };

  } catch (error) {
    console.warn('[Google Gemini API Notice]:', error.message, '- Falling back to deterministic rule-based engine.');
    return deterministicRuleBasedTriage({ title, description, category, location, district });
  }
}

module.exports = {
  analyzeComplaintWithGemini,
  analyzeComplaint: analyzeComplaintWithGemini,
  deterministicRuleBasedTriage,
  ALLOWED_CATEGORIES,
  ALLOWED_PRIORITIES,
  TN_DEPARTMENTS_LIST
};
