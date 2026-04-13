const express = require('express');
const router = express.Router();
const db = require('../db/db');

router.get('/summary', (req, res) => {
  try {
    // 1. Basic Ticket Stats
    const totalTickets = db.prepare(`SELECT COUNT(*) as count FROM tickets`).get().count;

    // open = 'new' or 'classified'
    const openTickets = db.prepare(`SELECT COUNT(*) as count FROM tickets WHERE status IN ('new', 'classified')`).get().count;

    const resolvedTickets = db.prepare(`SELECT COUNT(*) as count FROM tickets WHERE status = 'resolved'`).get().count;

    const escalatedTickets = db.prepare(`SELECT COUNT(*) as count FROM tickets WHERE status = 'escalated'`).get().count;

    // 2. autoResolutionRate: % of resolved tickets that were resolved by bot (have at least one 'auto' response)
    const autoResolutionRateRow = db.prepare(`
      SELECT
        (SELECT COUNT(DISTINCT ticket_id) FROM responses WHERE type = 'auto' AND ticket_id IN (SELECT id FROM tickets WHERE status = 'resolved')) * 100.0 /
        NULLIF((SELECT COUNT(*) FROM tickets WHERE status = 'resolved'), 0) as rate
    `).get();
    const autoResolutionRate = autoResolutionRateRow.rate || 0;

    // 3. aiAccuracyRate: % of auto-responses with positive feedback
    const aiAccuracyRateRow = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM responses WHERE type = 'auto' AND feedback = 'positive') * 100.0 /
        NULLIF((SELECT COUNT(*) FROM responses WHERE type = 'auto'), 0) as rate
    `).get();
    const aiAccuracyRate = aiAccuracyRateRow.rate || 0;

    // 4. avgResolutionMinutes
    const avgResolutionMinutesRow = db.prepare(`
      SELECT AVG((julianday(resolved_at) - julianday(created_at)) * 24 * 60) as avg_mins
      FROM tickets
      WHERE status = 'resolved' AND resolved_at IS NOT NULL
    `).get();
    const avgResolutionMinutes = avgResolutionMinutesRow.avg_mins || 0;

    // 5. slaComplianceRate: % of resolved tickets where resolved_at <= sla_deadline
    const slaComplianceRateRow = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM tickets WHERE status = 'resolved' AND resolved_at <= sla_deadline AND resolved_at IS NOT NULL) * 100.0 /
        NULLIF((SELECT COUNT(*) FROM tickets WHERE status = 'resolved' AND resolved_at IS NOT NULL), 0) as rate
    `).get();
    const slaComplianceRate = slaComplianceRateRow.rate || 0;

    // 6. ticketsByCategory
    const ticketsByCategory = db.prepare(`
      SELECT IFNULL(category, 'Uncategorized') as category, COUNT(*) as count
      FROM tickets
      GROUP BY category
    `).all();

    // 7. ticketsByTeam
    const ticketsByTeam = db.prepare(`
      SELECT IFNULL(assigned_team, 'Unassigned') as team, COUNT(*) as count
      FROM tickets
      GROUP BY assigned_team
    `).all();

    // 8. ticketsByPriority
    const ticketsByPriority = db.prepare(`
      SELECT IFNULL(priority, 'Unassigned') as priority, COUNT(*) as count
      FROM tickets
      GROUP BY priority
    `).all();

    // 9. last7Days
    const last7Days = db.prepare(`
      SELECT date(created_at) as date, COUNT(*) as count
      FROM tickets
      WHERE date(created_at) >= date('now', '-7 days')
      GROUP BY date(created_at)
      ORDER BY date ASC
    `).all();

    res.json({
      totalTickets,
      openTickets,
      resolvedTickets,
      escalatedTickets,
      autoResolutionRate,
      aiAccuracyRate,
      avgResolutionMinutes,
      slaComplianceRate,
      ticketsByCategory,
      ticketsByTeam,
      ticketsByPriority,
      last7Days
    });
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
