const db = require('./db');
const { analyzeComplaintWithGroq } = require('./groq-ai');

async function runTests() {
  console.log('--- TESTING 3 COMPLAINTS (PHASE 2) ---');

  const testCases = [
    {
      title: 'Pothole: Severe crater on outer ring road',
      description: 'A deep 7-inch pothole with sharp asphalt edges has formed at the entrance of the flyover. Two motorcyclists lost balance today. Immediate patch work required.',
      category: 'Road Damage',
      location: 'Outer Ring Road, Bellandur flyover ascent',
      latitude: 12.9260,
      longitude: 77.6762
    },
    {
      title: 'Overflowing garbage: Commercial waste blocking street corner',
      description: 'Garbage bins have been completely overflowing for 5 days. Food waste is rotting on the sidewalk, dogs and rodents are scattering trash into the drain, causing a public health menace.',
      category: 'Garbage and Sanitation',
      location: '5th Block Commercial Hub, near Market gate',
      latitude: 12.9348,
      longitude: 77.6189
    },
    {
      title: 'Water leakage: High pressure drinking water pipe burst',
      description: 'Clean municipal potable water pipe cracked underground and is gushing water at high pressure onto the road. Water is flooding 3 streets and residents have zero water pressure.',
      category: 'Water Leakage',
      location: '14th Cross, Malleshwaram',
      latitude: 12.9982,
      longitude: 77.5709
    }
  ];

  for (const tc of testCases) {
    console.log(`\nTesting case: [${tc.category}] "${tc.title}"`);
    const aiResult = await analyzeComplaintWithGroq({
      title: tc.title,
      description: tc.description,
      category: tc.category,
      location: tc.location
    });

    console.log('AI Analysis Output:', {
      ai_status: aiResult.ai_status,
      category: aiResult.ai_category,
      priority: aiResult.ai_priority,
      department: aiResult.ai_department,
      confidence: aiResult.ai_confidence,
      summary: aiResult.ai_summary,
      safetyRisk: aiResult.ai_safety_risk,
      recommendedAction: aiResult.ai_recommended_action,
      suggestedResponseTime: aiResult.ai_suggested_response_time
    });

    const ref_id = `CR-TEST-${Math.floor(1000 + Math.random() * 9000)}`;
    const insert = db.prepare(`
      INSERT INTO complaints (
        ref_id, title, description, category, location, latitude, longitude,
        status, priority, department, ai_summary, ai_category, ai_priority,
        ai_department, ai_confidence, ai_reason, ai_safety_risk,
        ai_recommended_action, ai_suggested_response_time, ai_status
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        'Pending', ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?
      )
    `);

    const res = insert.run(
      ref_id,
      tc.title,
      tc.description,
      aiResult.ai_category || tc.category,
      tc.location,
      tc.latitude,
      tc.longitude,
      aiResult.ai_priority || 'Medium',
      aiResult.ai_department || 'Municipal Operations',
      aiResult.ai_summary,
      aiResult.ai_category,
      aiResult.ai_priority,
      aiResult.ai_department,
      aiResult.ai_confidence,
      aiResult.ai_reason,
      aiResult.ai_safety_risk,
      aiResult.ai_recommended_action,
      aiResult.ai_suggested_response_time,
      aiResult.ai_status
    );

    const record = db.prepare('SELECT * FROM complaints WHERE id = ?').get(res.lastInsertRowid);
    console.log(`Saved to SQLite with ID ${record.id} and Ref ID ${record.ref_id}`);
  }

  const finalCount = db.prepare('SELECT COUNT(*) as count FROM complaints').get();
  console.log(`\nTotal verified complaints in SQLite: ${finalCount.count}`);
}

runTests().then(() => {
  console.log('Test run finished.');
  process.exit(0);
}).catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
