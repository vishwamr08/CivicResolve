const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const Groq = require('groq-sdk');
const fs = require('fs');

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

// Models that support vision (image input) on Groq
const VISION_MODELS = [
  'llama-3.2-90b-vision-preview',
  'llama-3.2-11b-vision-preview'
];

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

async function analyzeComplaintWithGroq({ title, description, category, location, district, imagePath, mimeType }) {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_groq_api_key')) {
    console.warn('[AI Triage] GROQ_API_KEY is missing or unconfigured. Triggering honest fallback.');
    return {
      ai_status: 'UNAVAILABLE',
      ai_summary: `AI Analysis Pending: ${title.slice(0, 80)}`,
      ai_category: ALLOWED_CATEGORIES.includes(category) ? category : 'Other',
      ai_priority: 'Medium',
      ai_department: 'Citizen Grievance Triage Desk',
      ai_confidence: 0.0,
      ai_reason: 'Automated AI classification is pending manual officer review (GROQ_API_KEY not configured in backend).',
      ai_safety_risk: 'Pending manual inspection by civic duty officer',
      ai_recommended_action: 'Assign to field officer for preliminary on-site assessment',
      ai_suggested_response_time: '24 to 48 hours',
      risk_flags: ['Manual Review Queued']
    };
  }

  try {
    const groq = new Groq({ apiKey });

    // Check if the selected model supports vision and if we have an image
    const modelSupportsVision = VISION_MODELS.some(vm => model.toLowerCase().includes(vm.toLowerCase()));
    const hasImage = imagePath && fs.existsSync(imagePath);

    // Build the bilingual Tamil Nadu system prompt
    const systemPrompt = `You are CivicResolve AI Triage Engine, modeled after Tamil Nadu's Mudhalvarin Mugavari municipal grievance redressal system.
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

CRITICAL INSTRUCTIONS:
1. Category MUST be one of:
   - "Road Damage"
   - "Garbage and Sanitation"
   - "Water Leakage"
   - "Drainage"
   - "Streetlight"
   - "Electricity"
   - "Public Infrastructure"
   - "Other"

2. Priority MUST be one of:
   - "Low": Minor cosmetic issues, non-obstructive signage.
   - "Medium": Standard streetlight failure, regular garbage clearance.
   - "High": Potholes on active roads, water main leaks, blocked hospital drains.
   - "Critical": Imminent danger to life (live snapped electric wires, open deep storm drain, major water main collapse, road cave-in).

3. Output ONLY valid JSON matching this exact structure:
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
  "risk_flags": ["Array of concise risk tags like 'Live Cable Hazard', 'Accident Blackspot', 'Monsoon Flood Threat'"]
}`;

    // Build the user message content
    let userContent = `Citizen report details (Tamil Nadu Grievance Portal):
- Submitted Title: "${title}"
- Submitted Description: "${description}"
- Submitted Category: "${category || 'Not specified'}"
- Reported Location: "${location || 'Not specified'}"
- District: "${district || 'Chennai'}"`;

    // Handle image analysis
    let imageNote = '';
    if (hasImage && modelSupportsVision) {
      // Vision model: attach the image inline
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Data = imageBuffer.toString('base64');
      const effectiveMime = mimeType || 'image/jpeg';

      userContent = [
        {
          type: 'text',
          text: userContent + '\n\nA photo of the reported civic hazard is attached. Analyze both the image and the text description to assess the severity.'
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:${effectiveMime};base64,${base64Data}`
          }
        }
      ];
    } else if (hasImage && !modelSupportsVision) {
      // Text-only model: acknowledge image exists but can't be processed
      imageNote = '\n\nNote: A photo was uploaded by the citizen, but the current AI model processes text only. The image is stored and available for manual officer review.';
      userContent += imageNote;
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: typeof userContent === 'string' ? userContent : userContent
      }
    ];

    // Call Groq API with JSON mode, with automatic model fallback if configured model fails
    const candidateModels = [
      model,
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant'
    ].filter((m, idx, arr) => arr.indexOf(m) === idx);

    let chatCompletion = null;
    let successfulModel = model;
    let lastError = null;

    for (const candidate of candidateModels) {
      try {
        // If candidate is not a vision model and we had vision userContent, convert to string
        const candidateIsVision = VISION_MODELS.some(vm => candidate.toLowerCase().includes(vm.toLowerCase()));
        let candidateMessages = messages;

        if (Array.isArray(userContent) && !candidateIsVision) {
          const textOnly = `Citizen report details:
- Submitted Title: "${title}"
- Submitted Description: "${description}"
- Submitted Category: "${category || 'Not specified'}"
- Reported Location: "${location || 'Not specified'}"
Note: A photo was attached to this grievance, but text-only triage is executing for model compatibility.`;
          candidateMessages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: textOnly }
          ];
        }

        chatCompletion = await groq.chat.completions.create({
          model: candidate,
          messages: candidateMessages,
          response_format: { type: 'json_object' },
          temperature: 0.3,
          max_tokens: 1024
        });
        successfulModel = candidate;
        break; // Success!
      } catch (err) {
        lastError = err;
        console.warn(`[Groq AI Model Notice] Model ${candidate} failed: ${err.message}. Trying next candidate...`);
      }
    }

    if (!chatCompletion) {
      throw lastError || new Error('All Groq model attempts exhausted.');
    }

    const responseText = chatCompletion.choices?.[0]?.message?.content?.trim() || '';
    console.log(`[Groq AI Response] (model: ${successfulModel}):`, responseText);

    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      // Try stripping markdown fences if any
      const cleaned = responseText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      parsed = JSON.parse(cleaned);
    }

    // Validate structured fields
    const validCategory = ALLOWED_CATEGORIES.includes(parsed.category)
      ? parsed.category
      : (ALLOWED_CATEGORIES.includes(category) ? category : 'Other');

    const validPriority = ALLOWED_PRIORITIES.includes(parsed.priority)
      ? parsed.priority
      : 'Medium';

    const validConfidence = typeof parsed.confidence === 'number' && parsed.confidence >= 0 && parsed.confidence <= 1
      ? Math.round(parsed.confidence * 100) / 100
      : 0.85;

    const imageAnalysisNote = (hasImage && !VISION_MODELS.some(vm => successfulModel.toLowerCase().includes(vm.toLowerCase())))
      ? ' (Text-only analysis; uploaded photo available for manual review)'
      : '';

    return {
      ai_status: 'SUCCESS',
      ai_summary: (parsed.summary || `${title}`) + imageAnalysisNote,
      ai_category: validCategory,
      ai_priority: validPriority,
      ai_department: parsed.department || 'Roads & Highways Department (TN Highways / PWD)',
      ai_confidence: validConfidence,
      ai_reason: parsed.reason || 'AI analysis completed from submitted grievance data.',
      ai_safety_risk: parsed.safetyRisk || 'Standard municipal vigilance required.',
      ai_recommended_action: parsed.recommendedAction || 'Schedule routine departmental inspection.',
      ai_suggested_response_time: parsed.suggestedResponseTime || '24 hours',
      risk_flags: Array.isArray(parsed.risk_flags) ? parsed.risk_flags : ['Standard Triage']
    };

  } catch (error) {
    console.error('[Groq API Error]:', error.message);
    return {
      ai_status: 'UNAVAILABLE',
      ai_summary: `AI Offline: ${title.slice(0, 80)}`,
      ai_category: ALLOWED_CATEGORIES.includes(category) ? category : 'Other',
      ai_priority: 'Medium',
      ai_department: 'Municipal Operations (Manual Dispatch)',
      ai_confidence: 0.0,
      ai_reason: `AI service could not complete automated analysis: ${error.message}. Flagged for manual review.`,
      ai_safety_risk: 'Unassessed - officer review required',
      ai_recommended_action: 'Awaiting manual categorization by duty desk',
      ai_suggested_response_time: '48 hours'
    };
  }
}

module.exports = {
  analyzeComplaintWithGroq,
  ALLOWED_CATEGORIES,
  ALLOWED_PRIORITIES,
  TN_DEPARTMENTS_LIST
};
