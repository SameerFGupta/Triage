const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { parse } = require('json2csv');

router.get('/summary', (req, res) => {
  try {
    // 1. Ticket counts
    const totalTicketsRow = db.prepare('SELECT COUNT(*) as count FROM tickets').get();
    const openTicketsRow = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status IN ('new', 'classified')").get();
    const resolvedTicketsRow = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'resolved'").get();
    const escalatedTicketsRow = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'escalated'").get();

    // 2. Auto Resolution Rate
    // Tickets that are resolved AND have at least one 'auto' response AND NO 'human' responses
    // Alternatively: % of all resolved tickets that were auto-resolved
    const autoResolvedQuery = `
      SELECT COUNT(*) as count FROM tickets t
      WHERE t.status = 'resolved'
        AND EXISTS (SELECT 1 FROM responses r WHERE r.ticket_id = t.id AND r.type = 'auto')
        AND NOT EXISTS (SELECT 1 FROM responses r WHERE r.ticket_id = t.id AND r.type = 'human')
    `;
    const autoResolvedRow = db.prepare(autoResolvedQuery).get();
    const autoResolutionRate = resolvedTicketsRow.count > 0
      ? (autoResolvedRow.count / resolvedTicketsRow.count) * 100
      : 0;

    // 3. AI Accuracy Rate
    // % of auto-responses with positive feedback (where feedback is not null)
    const aiFeedbackQuery = `
      SELECT
        SUM(CASE WHEN feedback = 'positive' THEN 1 ELSE 0 END) as positive_count,
        COUNT(feedback) as total_feedback
      FROM responses
      WHERE type = 'auto' AND feedback IS NOT NULL
    `;
    const aiFeedbackRow = db.prepare(aiFeedbackQuery).get();
    const aiAccuracyRate = aiFeedbackRow.total_feedback > 0
      ? (aiFeedbackRow.positive_count / aiFeedbackRow.total_feedback) * 100
      : 0;

    // 4. Avg Resolution Minutes
    const avgResQuery = `
      SELECT AVG((julianday(resolved_at) - julianday(created_at)) * 24 * 60) as avg_minutes
      FROM tickets
      WHERE status = 'resolved' AND resolved_at IS NOT NULL
    `;
    const avgResRow = db.prepare(avgResQuery).get();
    const avgResolutionMinutes = avgResRow.avg_minutes || 0;

    // 5. SLA Compliance Rate
    const slaQuery = `
      SELECT
        SUM(CASE WHEN resolved_at <= sla_deadline THEN 1 ELSE 0 END) as complied_count,
        COUNT(*) as total_resolved
      FROM tickets
      WHERE status = 'resolved' AND resolved_at IS NOT NULL AND sla_deadline IS NOT NULL
    `;
    const slaRow = db.prepare(slaQuery).get();
    const slaComplianceRate = slaRow.total_resolved > 0
      ? (slaRow.complied_count / slaRow.total_resolved) * 100
      : 0;

    // 6. Tickets by Category
    const ticketsByCategory = db.prepare(`
      SELECT category, COUNT(*) as count
      FROM tickets
      WHERE category IS NOT NULL
      GROUP BY category
    `).all();

    // 7. Tickets by Team
    const ticketsByTeam = db.prepare(`
      SELECT assigned_team as team, COUNT(*) as count
      FROM tickets
      WHERE assigned_team IS NOT NULL
      GROUP BY assigned_team
    `).all();

    // 8. Tickets by Priority
    const ticketsByPriority = db.prepare(`
      SELECT priority, COUNT(*) as count
      FROM tickets
      WHERE priority IS NOT NULL
      GROUP BY priority
    `).all();

    // 9. Last 7 Days (sparkline)
    const last7DaysQuery = `
      SELECT date(created_at) as date, COUNT(*) as count
      FROM tickets
      WHERE created_at >= date('now', '-6 days')
      GROUP BY date(created_at)
      ORDER BY date ASC
    `;
    const last7Days = db.prepare(last7DaysQuery).all();

    res.json({
      totalTickets: totalTicketsRow.count,
      openTickets: openTicketsRow.count,
      resolvedTickets: resolvedTicketsRow.count,
      escalatedTickets: escalatedTicketsRow.count,
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
    res.status(500).json({ error: 'Failed to fetch analytics summary', details: error.message });
  }
});

router.get('/export', (req, res) => {
  try {
    const tickets = db.prepare('SELECT * FROM tickets ORDER BY created_at DESC').all();
    const csv = parse(tickets);
    res.setHeader('Content-Type', 'text/csv');
    res.attachment('tickets.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting tickets:', error);
    res.status(500).json({ error: 'Failed to export tickets', details: error.message });
  }
});

module.exports = router;
