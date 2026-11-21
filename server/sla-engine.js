const { DEFAULT_SLA_POLICY } = require('./data/tamilnadu-geo');

/**
 * Determine default SLA target hours for a priority and category
 */
function getTargetSlaHours(priority, _category) {
  if (DEFAULT_SLA_POLICY[priority]) {
    return DEFAULT_SLA_POLICY[priority];
  }
  return 24; // Default standard SLA
}

/**
 * Calculate SLA metrics for a complaint record
 */
function computeSlaMetrics(complaint) {
  if (!complaint) return null;

  const createdAt = new Date(complaint.created_at).getTime();
  const slaHours = complaint.sla_hours || getTargetSlaHours(complaint.priority, complaint.category);
  const deadlineTime = complaint.sla_deadline
    ? new Date(complaint.sla_deadline).getTime()
    : createdAt + slaHours * 3600 * 1000;

  const now = Date.now();
  const isResolved = complaint.status === 'Resolved';
  const remainingMs = deadlineTime - now;
  const remainingHours = Math.round(remainingMs / (3600 * 1000));
  const isOverdue = !isResolved && remainingMs < 0;
  const overdueHours = isOverdue ? Math.abs(remainingHours) : 0;

  // Escalation Tier computation
  let escalationTier = 'Tier 1 - Ward Field Officer';
  if (isOverdue) {
    if (overdueHours > 72) {
      escalationTier = 'Tier 3 - District Collectorate / State Secretary';
    } else if (overdueHours > 24) {
      escalationTier = 'Tier 2 - Zonal Executive Engineer / Municipal Commissioner';
    }
  }

  return {
    slaHours,
    deadlineTime: new Date(deadlineTime).toISOString(),
    remainingHours,
    isOverdue,
    overdueHours,
    escalationTier
  };
}

module.exports = {
  getTargetSlaHours,
  computeSlaMetrics
};
