const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const { analyzeComplaintWithGroq, ALLOWED_CATEGORIES, ALLOWED_PRIORITIES } = require('./groq-ai');
const db = require('./db');

async function runGroqTestSuite() {
  console.log('====================================================');
  console.log('     CIVICRESOLVE - GROQ AI INTEGRATION TEST SUITE   ');
  console.log('====================================================\n');

  console.log(`[Config Check] Model configured: ${process.env.GROQ_MODEL || 'default: llama-3.3-70b-versatile'}`);
  const hasKey = !!process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.includes('your_');
  console.log(`[Config Check] Real GROQ_API_KEY detected: ${hasKey ? 'YES' : 'NO (Testing honest fallback mode)'}`);

  const testScenarios = [
    {
      name: 'Scenario 1: Deep Pothole Near School',
      data: {
        title: 'Deep crater pothole in front of St. Xavier Primary School',
        description: 'A 3-foot wide and 8-inch deep asphalt cavity has developed right where school buses and children cross every morning. Multiple children and parents on scooters have nearly fallen into traffic.',
        category: 'Road Damage',
        location: 'St. Xavier School Road, Sector 4'
      }
    },
    {
      name: 'Scenario 2: Overflowing Garbage Bin',
      data: {
        title: 'Municipal dumpster overflowing with medical and organic refuse',
        description: 'Community garbage dumpster has not been cleared for 6 days. Debris is spilling across 20 feet of the pedestrian walkway, attracting stray animals, with severe stench affecting nearby residents.',
        category: 'Garbage and Sanitation',
        location: 'Main Commercial Market, Block B'
      }
    },
    {
      name: 'Scenario 3: Water Pipeline Leakage',
      data: {
        title: 'Underground drinking water main cracked and flooding street',
        description: 'Potable water supply pipe has burst under high pressure. Clean drinking water is gushing onto the avenue like a geyser, cutting off water pressure to over 200 nearby homes.',
        category: 'Water Leakage',
        location: '4th Cross, Indiranagar'
      }
    },
    {
      name: 'Scenario 4: Damaged Streetlight',
      data: {
        title: 'Cluster of 4 streetlights dark creating hazardous road stretch',
        description: 'Four consecutive LED luminaires on the main ring road curve have been dark for over a week, causing dangerous blind spots for late night commuters.',
        category: 'Streetlight',
        location: 'Outer Ring Road, Km marker 14'
      }
    },
    {
      name: 'Scenario 5: Road Flooding',
      data: {
        title: 'Heavy water stagnation submerging arterial road after rain',
        description: 'Over 2 feet of stagnant rainwater has completely submerged both lanes of the underpass. Vehicles are stalling and traffic is backed up for two kilometers.',
        category: 'Drainage',
        location: 'Railway Underpass, South Junction'
      }
    },
    {
      name: 'Scenario 6: Open Drainage',
      data: {
        title: 'Uncovered storm drain slab creating fatal fall hazard',
        description: 'A heavy concrete manhole cover was removed during construction and left open without any warning tape or barricade right outside a busy grocery store.',
        category: 'Drainage',
        location: '15th Main, 3rd Stage'
      }
    },
    {
      name: 'Scenario 7: Dangerous Exposed Electrical Wiring',
      data: {
        title: 'Live high-voltage electrical cable snapped and dangling at eye level',
        description: 'Overhead transformer service cable snapped during wind gusts. Bare copper wires are hanging down to 5 feet above the public footpath, occasionally sparking against metal fences.',
        category: 'Electricity',
        location: 'Substation Lane near Metro Gate 2'
      }
    }
  ];

  let passedScenarios = 0;

  for (const scenario of testScenarios) {
    console.log(`\n--- Running ${scenario.name} ---`);
    const start = Date.now();
    const result = await analyzeComplaintWithGroq(scenario.data);
    const duration = Date.now() - start;

    console.log(`  Duration: ${duration}ms`);
    console.log(`  AI Status: ${result.ai_status}`);
    console.log(`  Category: ${result.ai_category}`);
    console.log(`  Priority: ${result.ai_priority}`);
    console.log(`  Department: ${result.ai_department}`);
    console.log(`  Confidence: ${result.ai_confidence}`);
    console.log(`  Summary: ${result.ai_summary}`);
    console.log(`  Safety Risk: ${result.ai_safety_risk}`);
    console.log(`  Action: ${result.ai_recommended_action}`);
    console.log(`  SLA: ${result.ai_suggested_response_time}`);

    // Validate structural schema
    const validCat = ALLOWED_CATEGORIES.includes(result.ai_category);
    const validPri = ALLOWED_PRIORITIES.includes(result.ai_priority);
    const validConf = typeof result.ai_confidence === 'number' && result.ai_confidence >= 0 && result.ai_confidence <= 1;
    const validDept = typeof result.ai_department === 'string' && result.ai_department.length > 0;
    const validSumm = typeof result.ai_summary === 'string' && result.ai_summary.length > 0;

    if (validCat && validPri && validConf && validDept && validSumm) {
      console.log(`  [Schema Check]: PASSED`);
      passedScenarios++;
    } else {
      console.error(`  [Schema Check]: FAILED`, { validCat, validPri, validConf, validDept, validSumm });
    }
  }

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passedScenarios} of ${testScenarios.length} Scenarios Verified`);
  console.log('====================================================\n');
}

runGroqTestSuite().catch(err => {
  console.error('Test Suite encountered an error:', err);
  process.exit(1);
});
