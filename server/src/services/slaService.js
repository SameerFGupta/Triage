const db = require('../db/db');

const SLA_TARGETS_HOURS = {
  critical: 1,
  high: 4,
  medium: 8,
  low: 24,
  security_incident: 0.5
};

function getSlaDeadline(priority, category) {
  let slaHours = SLA_TARGETS_HOURS.low;

  if (category && category.toLowerCase() === 'security') {
    slaHours = SLA_TARGETS_HOURS.security_incident;
  } else if (priority && SLA_TARGETS_HOURS[priority.toLowerCase()]) {
    slaHours = SLA_TARGETS_HOURS[priority.toLowerCase()];
  }

  return new Date(Date.now() + slaHours * 60 * 60 * 1000);
}

function getSlaStatus(ticket) {
  if (ticket.status === 'resolved') {
    return 'on_track';
  }

  if (!ticket.sla_deadline) {
    return 'on_track';
  }

  const deadline = new Date(ticket.sla_deadline);
  const timeRemaining = deadline.getTime() - Date.now();

  if (timeRemaining < 0) {
    return 'breached';
  }

  if (timeRemaining <= 3600000) { // 1 hour
    return 'at_risk';
  }

  return 'on_track';
}

function checkSlaBreaches() {
  const tickets = db.prepare(`SELECT * FROM tickets WHERE status != 'resolved' AND sla_deadline IS NOT NULL`).all();

  const checkAuditLog = db.prepare(`SELECT id FROM audit_log WHERE ticket_id = ? AND event_type = 'sla_breach'`);

  const insertAuditLog = db.prepare(`
    INSERT INTO audit_log (ticket_id, event_type, payload)
    VALUES (@ticket_id, 'sla_breach', @payload)
  `);

  const insertMany = db.transaction((breaches) => {
    for (const breach of breaches) {
      insertAuditLog.run(breach);
    }
  });

  const newBreaches = [];

  for (const ticket of tickets) {
    const status = getSlaStatus(ticket);
    if (status === 'breached') {
      const existingLog = checkAuditLog.get(ticket.id);
      if (!existingLog) {
        newBreaches.push({
          ticket_id: ticket.id,
          payload: JSON.stringify({
            priority: ticket.priority,
            deadline: ticket.sla_deadline,
            breachedAt: new Date().toISOString()
          })
        });
      }
    }
  }

  if (newBreaches.length > 0) {
    insertMany(newBreaches);
  }
}

module.exports = {
  getSlaDeadline,
  getSlaStatus,
  checkSlaBreaches
};
