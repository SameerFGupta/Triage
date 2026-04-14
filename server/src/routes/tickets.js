const express = require('express');
const db = require('../db/db');
const classificationService = require('../services/classificationService');
const resolutionService = require('../services/resolutionService');
const slaService = require('../services/slaService');
const { AIConfigurationError } = require('../services/aiProvider');

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const { subject, body, submitter_email } = req.body;

    if (!subject || !body || !submitter_email) {
      return res.status(400).json({ error: 'Missing required fields: subject, body, submitter_email' });
    }

    // 1. Classify the ticket
    const classification = await classificationService.classifyTicket(subject, body);

    // 2. Determine SLA deadline
    const sla_deadline = slaService.getSlaDeadline(classification.priority, classification.category);

    // 3. Save ticket to DB
    const insertTicket = db.prepare(`
      INSERT INTO tickets (
        subject, body, submitter_email, status, priority, category, assigned_team, sentiment_score, confidence_score, sla_deadline
      ) VALUES (
        @subject, @body, @submitter_email, @status, @priority, @category, @assigned_team, @sentiment_score, @confidence_score, @sla_deadline
      )
    `);

    // we map classification values and use defaults where missing from classification
    // classification.sentiment is a string like "frustrated". Our DB takes a REAL sentiment_score.
    // The previous implementation seeded sentiment_score. We will leave it as null for now or calculate a rough value.
    let sentimentScore = null;
    if (classification.sentiment === 'frustrated' || classification.sentiment === 'urgent') sentimentScore = 0.2;
    else if (classification.sentiment === 'neutral') sentimentScore = 0.5;

    let initialStatus = 'classified';
    if (classification.status) {
      initialStatus = classification.status; // might be needs_human_review if confidence is low
    }

    const info = insertTicket.run({
      subject,
      body,
      submitter_email,
      status: initialStatus === 'needs_human_review' ? 'new' : initialStatus, // DB ENUM constraints
      priority: classification.priority,
      category: classification.category,
      assigned_team: classification.assigned_team,
      sentiment_score: sentimentScore,
      confidence_score: classification.confidence,
      sla_deadline: sla_deadline.toISOString()
    });

    const ticketId = info.lastInsertRowid;

    // 4. Write to audit_log
    const insertAudit = db.prepare(`
      INSERT INTO audit_log (ticket_id, event_type, payload)
      VALUES (@ticket_id, @event_type, @payload)
    `);

    insertAudit.run({
      ticket_id: ticketId,
      event_type: 'ticket_created',
      payload: JSON.stringify({ subject, body, submitter_email })
    });

    insertAudit.run({
      ticket_id: ticketId,
      event_type: 'ticket_classified',
      payload: JSON.stringify(classification)
    });

    // Fetch the inserted ticket to pass to resolution
    let ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);

    // 5. Attempt Auto-Resolution
    if (initialStatus !== 'needs_human_review') {
      const resolution = await resolutionService.resolveTicket(ticket);

      if (resolution.shouldAutoResolve) {
        // Update ticket status
        const resolveStmt = db.prepare(`
          UPDATE tickets SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP WHERE id = ?
        `);
        resolveStmt.run(ticketId);

        // Add response
        const addResponse = db.prepare(`
          INSERT INTO responses (ticket_id, body, type)
          VALUES (@ticket_id, @body, @type)
        `);
        addResponse.run({
          ticket_id: ticketId,
          body: resolution.responseBody,
          type: 'auto'
        });

        insertAudit.run({
          ticket_id: ticketId,
          event_type: 'ticket_auto_resolved',
          payload: JSON.stringify({ response: resolution.responseBody })
        });

        // Refetch ticket since it updated
        ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
      }
    }

    res.status(201).json(ticket);
  } catch (err) {
    if (err instanceof AIConfigurationError) {
      return res.status(503).json({
        error: 'AI provider not configured',
        code: err.code,
        message: err.message
      });
    }
    next(err);
  }
});


// GET /api/tickets
router.get('/', (req, res, next) => {
  try {
    // Return all tickets, newest first, with their latest response
    const tickets = db.prepare(`
      SELECT t.*,
             (SELECT body FROM responses r WHERE r.ticket_id = t.id ORDER BY created_at DESC LIMIT 1) as latest_response
      FROM tickets t
      ORDER BY t.created_at DESC
    `).all();

    res.json(tickets);
  } catch (err) {
    next(err);
  }
});

// GET /api/tickets/:id
router.get('/:id', (req, res, next) => {
  try {
    const { id } = req.params;

    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const responses = db.prepare('SELECT * FROM responses WHERE ticket_id = ? ORDER BY created_at ASC').all(id);

    const audit_trail = db.prepare('SELECT * FROM audit_log WHERE ticket_id = ? ORDER BY created_at ASC').all(id);

    // Parse JSON payload in audit logs for better readability if necessary
    const parsedAuditTrail = audit_trail.map(log => {
      try {
        log.payload = JSON.parse(log.payload);
      } catch (e) {
        // Leave as string if not valid JSON
      }
      return log;
    });

    res.json({
      ...ticket,
      responses,
      audit_trail: parsedAuditTrail
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tickets/:id/feedback
router.patch('/:id/feedback', (req, res, next) => {
  try {
    const { id } = req.params;
    const { responseId, feedback } = req.body;

    if (!responseId || !feedback) {
      return res.status(400).json({ error: 'Missing required fields: responseId, feedback' });
    }

    if (feedback !== 'positive' && feedback !== 'negative') {
      return res.status(400).json({ error: 'Feedback must be "positive" or "negative"' });
    }

    // Verify response exists and belongs to the ticket
    const response = db.prepare('SELECT * FROM responses WHERE id = ? AND ticket_id = ?').get(responseId, id);

    if (!response) {
      return res.status(404).json({ error: 'Response not found for this ticket' });
    }

    const updateStmt = db.prepare('UPDATE responses SET feedback = ? WHERE id = ?');
    updateStmt.run(feedback, responseId);

    // Also log feedback in audit_log
    const insertAudit = db.prepare(`
      INSERT INTO audit_log (ticket_id, event_type, payload)
      VALUES (@ticket_id, @event_type, @payload)
    `);
    insertAudit.run({
      ticket_id: id,
      event_type: 'feedback_received',
      payload: JSON.stringify({ responseId, feedback })
    });

    res.json({ message: 'Feedback recorded successfully' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tickets/:id/resolve
router.patch('/:id/resolve', (req, res, next) => {
  try {
    const { id } = req.params;

    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (ticket.status === 'resolved') {
      return res.status(400).json({ error: 'Ticket is already resolved' });
    }

    const resolveStmt = db.prepare(`
      UPDATE tickets SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
    resolveStmt.run(id);

    // Log to audit_log
    const insertAudit = db.prepare(`
      INSERT INTO audit_log (ticket_id, event_type, payload)
      VALUES (@ticket_id, @event_type, @payload)
    `);
    insertAudit.run({
      ticket_id: id,
      event_type: 'ticket_manually_resolved',
      payload: JSON.stringify({ previous_status: ticket.status })
    });

    const updatedTicket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);

    res.json(updatedTicket);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
