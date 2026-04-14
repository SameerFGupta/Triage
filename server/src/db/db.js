const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../triage.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Migrate tables
db.exec(`
  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    submitter_email TEXT NOT NULL,
    status TEXT CHECK(status IN ('new', 'classified', 'resolved', 'escalated')) NOT NULL DEFAULT 'new',
    priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'critical')),
    category TEXT,
    assigned_team TEXT,
    sentiment_score REAL,
    confidence_score REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    sla_deadline DATETIME
  );

  CREATE TABLE IF NOT EXISTS responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    body TEXT NOT NULL,
    type TEXT CHECK(type IN ('auto', 'human')) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    feedback TEXT CHECK(feedback IN ('positive', 'negative')) DEFAULT NULL,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL, -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
  );
`);

// Seed 10 realistic mock tickets on first run
const countRow = db.prepare('SELECT COUNT(*) as count FROM tickets').get();
if (countRow.count === 0) {
  const insertTicket = db.prepare(`
    INSERT INTO tickets (
      subject, body, submitter_email, status, priority, category, assigned_team, sentiment_score, confidence_score, sla_deadline
    ) VALUES (
      @subject, @body, @submitter_email, @status, @priority, @category, @assigned_team, @sentiment_score, @confidence_score, @sla_deadline
    )
  `);
  const insertAudit = db.prepare(`
    INSERT INTO audit_log (ticket_id, event_type, payload)
    VALUES (@ticket_id, @event_type, @payload)
  `);

  const mockTickets = [
    {
      subject: 'Cannot access VPN',
      body: 'I am getting an authentication error when trying to connect to the corporate VPN from home. It says "invalid credentials" but I just reset my password.',
      submitter_email: 'j.doe@example.com',
      status: 'new',
      priority: 'high',
      category: 'Network Access',
      assigned_team: 'IT Support',
      sentiment_score: 0.3,
      confidence_score: 0.95,
      sla_deadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
    },
    {
      subject: 'Need new mouse',
      body: 'My wireless mouse has stopped working, tried changing batteries but no luck. Could I get a replacement?',
      submitter_email: 's.smith@example.com',
      status: 'resolved',
      priority: 'low',
      category: 'Hardware',
      assigned_team: 'Facilities',
      sentiment_score: 0.8,
      confidence_score: 0.98,
      sla_deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    },
    {
      subject: 'URGENT: Production database down',
      body: 'The main cluster is unresponsive and customers are getting 500 errors. We need all hands on deck!',
      submitter_email: 'oncall@example.com',
      status: 'escalated',
      priority: 'critical',
      category: 'Infrastructure',
      assigned_team: 'DevOps',
      sentiment_score: 0.1,
      confidence_score: 0.99,
      sla_deadline: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    },
    {
      subject: 'Software license expired',
      body: 'Adobe Creative Cloud says my license has expired and I cannot open Photoshop. I need this for the marketing campaign due tomorrow.',
      submitter_email: 'm.jones@example.com',
      status: 'classified',
      priority: 'medium',
      category: 'Software Licensing',
      assigned_team: 'IT Procurement',
      sentiment_score: 0.4,
      confidence_score: 0.92,
      sla_deadline: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
    },
    {
      subject: 'How to configure email on phone?',
      body: 'Can someone send me the instructions for setting up my work email on my personal iPhone?',
      submitter_email: 'r.williams@example.com',
      status: 'resolved',
      priority: 'low',
      category: 'Mobile Devices',
      assigned_team: 'IT Support',
      sentiment_score: 0.7,
      confidence_score: 0.96,
      sla_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    },
    {
      subject: 'Payroll system access',
      body: 'I am a new HR manager and I don\'t seem to have access to the Workday payroll module. Who can grant me access?',
      submitter_email: 'a.brown@example.com',
      status: 'new',
      priority: 'medium',
      category: 'Access Request',
      assigned_team: 'HR Systems',
      sentiment_score: 0.6,
      confidence_score: 0.88,
      sla_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    },
    {
      subject: 'Laptop screen flickering',
      body: 'The screen on my Dell XPS keeps flickering randomly, especially when I move the lid. It gives me a headache.',
      submitter_email: 't.davis@example.com',
      status: 'classified',
      priority: 'medium',
      category: 'Hardware',
      assigned_team: 'IT Support',
      sentiment_score: 0.2,
      confidence_score: 0.94,
      sla_deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    },
    {
      subject: 'Guest Wi-Fi password',
      body: 'We have clients coming in today, what is the current password for the Guest Wi-Fi network?',
      submitter_email: 'p.miller@example.com',
      status: 'resolved',
      priority: 'low',
      category: 'Network Access',
      assigned_team: 'Reception',
      sentiment_score: 0.9,
      confidence_score: 0.97,
      sla_deadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    },
    {
      subject: 'Can\'t print to the 3rd floor printer',
      body: 'Every time I try to print to the color printer on the 3rd floor, the print job just disappears from the queue. It doesn\'t print anything.',
      submitter_email: 'k.wilson@example.com',
      status: 'new',
      priority: 'low',
      category: 'Hardware',
      assigned_team: 'IT Support',
      sentiment_score: 0.4,
      confidence_score: 0.91,
      sla_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    },
    {
      subject: 'Suspicious email received',
      body: 'I received an email asking me to click a link to update my banking info for payroll. It looks fake but wanted to report it just in case.',
      submitter_email: 'e.moore@example.com',
      status: 'escalated',
      priority: 'high',
      category: 'Security',
      assigned_team: 'InfoSec',
      sentiment_score: 0.5,
      confidence_score: 0.99,
      sla_deadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    }
  ];

  const insertMany = db.transaction((tickets) => {
    for (const ticket of tickets) {
      const info = insertTicket.run(ticket);
      const ticketId = info.lastInsertRowid;

      insertAudit.run({
        ticket_id: ticketId,
        event_type: 'ticket_created',
        payload: JSON.stringify({
          subject: ticket.subject,
          body: ticket.body,
          submitter_email: ticket.submitter_email
        })
      });

      insertAudit.run({
        ticket_id: ticketId,
        event_type: 'ticket_classified',
        payload: JSON.stringify({
          category: ticket.category,
          assigned_team: ticket.assigned_team,
          priority: ticket.priority,
          confidence: ticket.confidence_score,
          sentiment: ticket.sentiment_score !== null && ticket.sentiment_score < 0.4 ? 'urgent' : 'neutral',
          plain_english_reason: getSeedReason(ticket)
        })
      });
    }
  });

  insertMany(mockTickets);
}

dedupeClassificationAuditTrail();
backfillAuditTrail();

function getSeedReason(ticket) {
  if (ticket.subject === 'Cannot access VPN') {
    return 'This mentions a VPN sign-in problem after a password reset, so it is routed for network access troubleshooting.';
  }

  if (ticket.subject === 'URGENT: Production database down') {
    return 'This describes a live outage affecting customers, so it is treated as critical and escalated immediately.';
  }

  if (ticket.subject === 'Suspicious email received') {
    return 'This looks like a possible phishing report, so it is routed to the security team for fast review.';
  }

  if (ticket.status === 'resolved') {
    return 'This request matches a common support issue, so the system can classify it confidently and provide a quick response.';
  }

  return 'The ticket content clearly matches a known IT support category, so it has been routed to the most likely team.';
}

function backfillAuditTrail() {
  const ticketsMissingClassificationAudit = db.prepare(`
    SELECT t.*
    FROM tickets t
    LEFT JOIN audit_log a
      ON a.ticket_id = t.id
     AND a.event_type = 'ticket_classified'
    WHERE a.id IS NULL
  `).all();

  if (ticketsMissingClassificationAudit.length === 0) {
    return;
  }

  const insertAudit = db.prepare(`
    INSERT INTO audit_log (ticket_id, event_type, payload)
    VALUES (@ticket_id, @event_type, @payload)
  `);

  const backfill = db.transaction((tickets) => {
    for (const ticket of tickets) {
      insertAudit.run({
        ticket_id: ticket.id,
        event_type: 'ticket_classified',
        payload: JSON.stringify({
          category: ticket.category || 'other',
          assigned_team: ticket.assigned_team || 'helpdesk',
          priority: ticket.priority || 'medium',
          confidence: ticket.confidence_score ?? 0.75,
          sentiment: ticket.sentiment_score !== null && ticket.sentiment_score < 0.4 ? 'urgent' : 'neutral',
          plain_english_reason: getSeedReason(ticket)
        })
      });
    }
  });

  backfill(ticketsMissingClassificationAudit);
}

function dedupeClassificationAuditTrail() {
  db.prepare(`
    DELETE FROM audit_log
    WHERE event_type = 'ticket_classified'
      AND id NOT IN (
        SELECT MIN(id)
        FROM audit_log
        WHERE event_type = 'ticket_classified'
        GROUP BY ticket_id
      )
  `).run();
}

module.exports = db;
