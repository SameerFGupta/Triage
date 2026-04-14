const db = require('../src/db/db');
require('dotenv').config({ path: '../.env' });
const classificationService = require('../src/services/classificationService');
const resolutionService = require('../src/services/resolutionService');
const slaService = require('../src/services/slaService');

async function main() {
  console.log(`Using AI provider: ${process.env.AI_PROVIDER || 'anthropic'}`);
  console.log('Seeding database...');

  // Clear existing DB tables
  db.exec(`
    DELETE FROM responses;
    DELETE FROM audit_log;
    DELETE FROM tickets;
    DELETE FROM sqlite_sequence WHERE name IN ('responses', 'audit_log', 'tickets');
  `);

  console.log('Cleared existing tables.');

  const mockTickets = [
    {
      subject: 'Forgot my Windows password',
      body: 'I locked myself out of my laptop after vacation. Can you reset my Active Directory password?',
      submitter_email: 'b.wayne@example.com'
    },
    {
      subject: 'VPN is extremely slow',
      body: 'Whenever I connect to the US-East VPN node, my download speed drops to like 10kbps. Impossible to work.',
      submitter_email: 'c.kent@example.com'
    },
    {
      subject: 'Need a new monitor',
      body: 'My second monitor just died. No power light, nothing. Can I get a replacement 27-inch monitor?',
      submitter_email: 'd.prince@example.com'
    },
    {
      subject: 'Install Docker Desktop',
      body: 'I need Docker Desktop installed for the new microservices project. My local admin rights are disabled.',
      submitter_email: 'p.parker@example.com'
    },
    {
      subject: 'Entire office network is down',
      body: 'Nobody on the 4th floor can access the internet or internal servers. The switch might be broken.',
      submitter_email: 't.stark@example.com'
    },
    {
      subject: 'Phishing email alert',
      body: 'I received an email from "HR" asking for my social security number via a Google Form link. This looks very suspicious.',
      submitter_email: 'n.romanoff@example.com'
    },
    {
      subject: 'Cannot access Jira',
      body: 'It says my account is disabled when I try to log into Jira. I need access to update my sprint tasks.',
      submitter_email: 's.rogers@example.com'
    },
    {
      subject: 'Recover deleted folder',
      body: 'I accidentally deleted the Q3 Financials folder from the shared drive. Is there any way to restore it from yesterday\'s backup?',
      submitter_email: 'b.banner@example.com'
    },
    {
      subject: 'New employee onboarding - John Smith',
      body: 'John starts next Monday. He needs a standard laptop, Jira/Confluence access, and a welcome packet.',
      submitter_email: 'hr.dept@example.com'
    },
    {
      subject: 'Office temperature is freezing',
      body: 'The AC is blasting right on my desk. Can facilities turn the temperature up a few degrees?',
      submitter_email: 'a.curry@example.com'
    },
    {
      subject: 'Need help formatting Excel pivot table',
      body: 'I am struggling to make my pivot table show month-over-month growth correctly. Anyone know Excel well?',
      submitter_email: 'j.jonah@example.com'
    },
    {
      subject: 'Github Copilot license request',
      body: 'Requesting a Github Copilot license. My manager already approved it verbally.',
      submitter_email: 's.strange@example.com'
    },
    {
      subject: 'Guest WiFi password for VIPs',
      body: 'We have board members visiting today. What is the current guest WiFi password?',
      submitter_email: 'w.maximoff@example.com'
    },
    {
      subject: 'Server CPU spiking to 100%',
      body: 'The production DB server (db-prod-01) is pegging at 100% CPU. App is crawling. Looking into slow queries now.',
      submitter_email: 'v.vision@example.com'
    },
    {
      subject: 'Need access to AWS Console',
      body: 'I need read-only access to the production AWS account to review CloudWatch logs for my service.',
      submitter_email: 'c.danvers@example.com'
    },
    {
      subject: 'Broken chair',
      body: 'The armrest on my Herman Miller chair fell off. Need it repaired or replaced.',
      submitter_email: 'm.murdock@example.com'
    },
    {
      subject: 'Zoom license upgrade',
      body: 'I need to host a webinar for 500 people next week, but my account maxes out at 100. Can I get a temporary upgrade?',
      submitter_email: 'j.nelson@example.com'
    },
    {
      subject: 'Suspicious login attempt',
      body: 'Okta sent me an alert about a login from Russia, but I am in New York. I haven\'t approved anything.',
      submitter_email: 'f.castle@example.com'
    },
    {
      subject: 'Can we install Slack?',
      body: 'My team wants to use Slack instead of Teams. Is that allowed by corporate policy?',
      submitter_email: 'j.jones@example.com'
    },
    {
      subject: 'Lost my company phone',
      body: 'I think I left my corporate iPhone in a taxi. Can you remote wipe it just in case?',
      submitter_email: 'l.cage@example.com'
    },
    {
      subject: 'Printer jamming on 2nd floor',
      body: 'The big Ricoh printer is constantly jamming when printing double-sided. Needs maintenance.',
      submitter_email: 'd.rand@example.com'
    },
    {
      subject: 'Error 500 on internal portal',
      body: 'The HR portal throws a 500 Internal Server Error when I try to submit my time off request.',
      submitter_email: 'h.pym@example.com'
    },
    {
      subject: 'Need Visio installed',
      body: 'I need Microsoft Visio to map out the new network topology. Can someone push it to my machine?',
      submitter_email: 'j.van@example.com'
    },
    {
      subject: 'Website SSL certificate expired',
      body: 'The main corporate website is showing a security warning. The SSL cert expired 2 hours ago!',
      submitter_email: 'admin@example.com'
    },
    {
      subject: 'Keyboard typing wrong characters',
      body: 'When I press "a" it types "z". I think the keyboard layout changed magically or it is broken.',
      submitter_email: 's.wilson@example.com'
    }
  ];

  const insertTicket = db.prepare(`
    INSERT INTO tickets (
      subject, body, submitter_email, status, priority, category, assigned_team, sentiment_score, confidence_score, sla_deadline, created_at, resolved_at
    ) VALUES (
      @subject, @body, @submitter_email, @status, @priority, @category, @assigned_team, @sentiment_score, @confidence_score, @sla_deadline, @created_at, @resolved_at
    )
  `);

  const insertResponse = db.prepare(`
    INSERT INTO responses (ticket_id, body, type, created_at, feedback)
    VALUES (@ticket_id, @body, @type, @created_at, @feedback)
  `);

  const insertAudit = db.prepare(`
    INSERT INTO audit_log (ticket_id, event_type, payload, created_at)
    VALUES (@ticket_id, @event_type, @payload, @created_at)
  `);

  let count = 0;
  for (const t of mockTickets) {
    count++;
    console.log(`Processing ticket ${count}/${mockTickets.length}: ${t.subject}`);

    try {
      const classification = await classificationService.classifyTicket(t.subject, t.body);
      const baseDeadline = slaService.getSlaDeadline(classification.priority, classification.category);

      let sentimentScore = null;
      if (classification.sentiment === 'frustrated' || classification.sentiment === 'urgent') sentimentScore = 0.2;
      else if (classification.sentiment === 'neutral') sentimentScore = 0.5;
      else sentimentScore = 0.8; // default to positive otherwise to vary data

      let status = classification.status === 'needs_human_review' ? 'new' : 'classified';

      // Manually vary the data slightly for a rich dashboard
      const now = new Date();
      let createdAt = new Date(now);
      let resolvedAt = null;
      let slaDeadline = new Date(baseDeadline);
      let feedback = null;

      // Make 2 tickets breached
      if (count === 2 || count === 14) { // VPN slow and Server CPU spiking
        status = 'escalated';
        createdAt = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48 hours ago
        slaDeadline = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago (breached)
      }
      // Make some tickets resolved
      else if (count % 4 === 0) {
        status = 'resolved';
        createdAt = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
        resolvedAt = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago
        if (count % 8 === 0) feedback = 'positive';
      }
      // Make some tickets new
      else if (count % 3 === 0) {
        status = 'new';
        createdAt = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
      }

      // Add one with negative feedback
      if (count === 10) {
        status = 'resolved';
        resolvedAt = new Date();
        feedback = 'negative';
      }

      const info = insertTicket.run({
        subject: t.subject,
        body: t.body,
        submitter_email: t.submitter_email,
        status,
        priority: classification.priority,
        category: classification.category,
        assigned_team: classification.assigned_team,
        sentiment_score: sentimentScore,
        confidence_score: classification.confidence,
        sla_deadline: slaDeadline.toISOString(),
        created_at: createdAt.toISOString(),
        resolved_at: resolvedAt ? resolvedAt.toISOString() : null
      });

      const ticketId = info.lastInsertRowid;

      // Add base audit logs
      insertAudit.run({
        ticket_id: ticketId,
        event_type: 'ticket_created',
        payload: JSON.stringify({ subject: t.subject, body: t.body, submitter_email: t.submitter_email }),
        created_at: createdAt.toISOString()
      });

      insertAudit.run({
        ticket_id: ticketId,
        event_type: 'ticket_classified',
        payload: JSON.stringify(classification),
        created_at: new Date(createdAt.getTime() + 5000).toISOString() // 5 secs later
      });

      // Attempt auto-resolution for a realistic flow if not overridden by our manual variations above
      const ticketForResolution = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);

      let finalStatus = status;
      if (status === 'classified') {
        const resolution = await resolutionService.resolveTicket(ticketForResolution);

        if (resolution.shouldAutoResolve) {
          finalStatus = 'resolved';
          resolvedAt = new Date(createdAt.getTime() + 10000); // 10 seconds later

          db.prepare(`UPDATE tickets SET status = 'resolved', resolved_at = ? WHERE id = ?`)
            .run(resolvedAt.toISOString(), ticketId);

          const resInfo = insertResponse.run({
            ticket_id: ticketId,
            body: resolution.responseBody,
            type: 'auto',
            created_at: resolvedAt.toISOString(),
            feedback: null
          });

          insertAudit.run({
            ticket_id: ticketId,
            event_type: 'ticket_auto_resolved',
            payload: JSON.stringify({ response: resolution.responseBody }),
            created_at: resolvedAt.toISOString()
          });

          // maybe add feedback
          if (count % 5 === 0) {
            db.prepare(`UPDATE responses SET feedback = 'positive' WHERE id = ?`).run(resInfo.lastInsertRowid);
            insertAudit.run({
              ticket_id: ticketId,
              event_type: 'feedback_received',
              payload: JSON.stringify({ responseId: resInfo.lastInsertRowid, feedback: 'positive' }),
              created_at: new Date(resolvedAt.getTime() + 60000).toISOString() // 1 min later
            });
          }
        }
      }

      // Add dummy responses and feedback for manually resolved tickets
      if (status === 'resolved' && finalStatus === 'resolved') {
        // Was resolved manually in our mock data
        const resInfo = insertResponse.run({
          ticket_id: ticketId,
          body: "We have fixed this issue. Please let us know if you need anything else.",
          type: 'human',
          created_at: resolvedAt.toISOString(),
          feedback
        });

        insertAudit.run({
          ticket_id: ticketId,
          event_type: 'ticket_manually_resolved',
          payload: JSON.stringify({ previous_status: 'new' }),
          created_at: resolvedAt.toISOString()
        });

        if (feedback) {
          insertAudit.run({
            ticket_id: ticketId,
            event_type: 'feedback_received',
            payload: JSON.stringify({ responseId: resInfo.lastInsertRowid, feedback }),
            created_at: new Date(resolvedAt.getTime() + 60000).toISOString()
          });
        }
      }

      // SLA breaches audit log for the breached tickets
      if (status === 'escalated' && (count === 2 || count === 14)) {
         insertAudit.run({
            ticket_id: ticketId,
            event_type: 'sla_breach',
            payload: JSON.stringify({ priority: classification.priority, deadline: slaDeadline.toISOString(), breachedAt: slaDeadline.toISOString() }),
            created_at: slaDeadline.toISOString()
         });
      }

    } catch (err) {
      console.error(`Error processing ticket ${t.subject}:`, err);
    }
  }

  console.log('Seeding complete!');
}

main().catch(console.error);
