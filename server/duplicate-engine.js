const db = require('./db');

// Tokenize text into normalized word set
function getTokens(text) {
  if (!text) return new Set();
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2)
  );
}

// Compute Jaccard similarity between two texts
function calculateSimilarity(textA, textB) {
  const setA = getTokens(textA);
  const setB = getTokens(textB);
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

// Approximate Haversine distance in meters
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Detect potential duplicate complaints for a newly submitted grievance
 */
function findDuplicateCandidates({ title, description, category, district, ward, latitude, longitude, excludeId }) {
  try {
    // Look for active complaints in the same category within the last 14 days
    const query = `
      SELECT id, ref_id, title, description, category, location, latitude, longitude, status, created_at
      FROM complaints
      WHERE status IN ('Submitted', 'Under Review', 'Assigned', 'In Progress')
        AND (category = ? OR district = ?)
        ${excludeId ? 'AND id != ?' : ''}
      ORDER BY created_at DESC
      LIMIT 40
    `;

    const params = excludeId ? [category, district || 'Chennai', excludeId] : [category, district || 'Chennai'];
    const candidates = db.prepare(query).all(...params);

    const matches = [];

    for (const c of candidates) {
      let score = 0;
      const reasons = [];

      // 1. Text Similarity (Title & Description)
      const titleSim = calculateSimilarity(title, c.title);
      const descSim = calculateSimilarity(description, c.description);
      const textScore = Math.max(titleSim, descSim);

      if (textScore > 0.35) {
        score += textScore * 50;
        reasons.push(`High text similarity (${Math.round(textScore * 100)}%)`);
      }

      // 2. Geospatial Proximity (Within 400 meters)
      if (latitude && longitude && c.latitude && c.longitude) {
        const dist = getDistanceMeters(latitude, longitude, c.latitude, c.longitude);
        if (dist <= 400) {
          score += 40 * (1 - dist / 400);
          reasons.push(`Geospatial cluster within ${Math.round(dist)}m`);
        }
      }

      // 3. Category match bonus
      if (c.category === category) {
        score += 15;
      }

      if (score >= 40) {
        matches.push({
          id: c.id,
          ref_id: c.ref_id,
          title: c.title,
          category: c.category,
          location: c.location,
          status: c.status,
          created_at: c.created_at,
          matchScore: Math.min(100, Math.round(score)),
          matchReasons: reasons
        });
      }
    }

    return matches.sort((a, b) => b.matchScore - a.matchScore).slice(0, 3);
  } catch (err) {
    console.warn('[Duplicate Engine Error]:', err.message);
    return [];
  }
}

module.exports = {
  findDuplicateCandidates,
  calculateSimilarity
};
