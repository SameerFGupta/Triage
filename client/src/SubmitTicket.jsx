import React, { useEffect, useState } from 'react';
import useWebSocket from './services/useWebSocket';
import './SubmitTicket.css';

const SubmitTicket = ({ aiProvider }) => {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [autoResponse, setAutoResponse] = useState('');
  const [error, setError] = useState('');
  const [configurationHint, setConfigurationHint] = useState('');
  const [providerStatus, setProviderStatus] = useState(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [streamText, setStreamText] = useState('');

  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsHost = window.location.port === '5173' ? 'localhost:3000' : window.location.host;
  const { status, send, lastMessage } = useWebSocket(`${wsProtocol}//${wsHost}`);
  const [subscribedTicketId, setSubscribedTicketId] = useState(null);

  useEffect(() => {
    fetch('/api/settings/status')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load AI provider status.');
        }

        return response.json();
      })
      .then((status) => {
        setProviderStatus(status);
      })
      .catch(() => {
        setProviderStatus(null);
      });
  }, [aiProvider]);

  useEffect(() => {
    if (status === 'connected' && subscribedTicketId) {
      send({
        type: 'subscribe:ticket',
        payload: { ticketId: subscribedTicketId }
      });
      setIsClassifying(true);
      setLoading(false);
    }
  }, [status, subscribedTicketId, send]);

  useEffect(() => {
    if (lastMessage && subscribedTicketId) {
      try {
        const data = JSON.parse(lastMessage.data);
        if (data.type === 'ticket:stream:chunk' && data.payload.ticketId === subscribedTicketId) {
          setStreamText((prev) => prev + data.payload.chunk);
        } else if (data.type === 'ticket:classified' && data.payload.id === subscribedTicketId) {
          setResult(data.payload);
        } else if (data.type === 'ticket:auto_resolved' && data.payload.id === subscribedTicketId) {
          const resolvedTicket = data.payload;

          (async () => {
            let autoResText = '';
            const detailResponse = await fetch(`/api/tickets/${resolvedTicket.id}`);
            if (detailResponse.ok) {
              const detail = await detailResponse.json();
              if (detail.responses && detail.responses.length > 0) {
                autoResText = detail.responses[detail.responses.length - 1].body;
              }
            }
            setResult(resolvedTicket);
            setAutoResponse(autoResText);
            setIsClassifying(false);
            setSubscribedTicketId(null);
          })();
        } else if (data.type === 'stream:end' && data.payload.ticketId === subscribedTicketId) {
          setTimeout(() => {
            setIsClassifying(false);
            setSubscribedTicketId(null);
          }, 1000);
        }
      } catch (e) {
        console.error('Error parsing websocket message', e);
      }
    }
  }, [lastMessage, subscribedTicketId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setConfigurationHint('');

    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          submitter_email: email,
          subject,
          body: description
        })
      });

      if (!response.ok) {
        let errorMessage = 'Failed to submit ticket';
        let errorCode = null;

        try {
          const errorPayload = await response.json();
          errorMessage = errorPayload.message || errorPayload.error || errorMessage;
          errorCode = errorPayload.code;
        } catch {
          // Ignore invalid error payloads and use the fallback message.
        }

        if (errorCode === 'AI_NOT_CONFIGURED') {
          setConfigurationHint('Add the matching API key in server/.env or the project-root .env, then restart the server and try again.');
        }

        throw new Error(errorMessage);
      }

      const ticket = await response.json();

      if (status !== 'connected') {
        setResult(ticket);
        setLoading(false);
        setIsClassifying(false);
      } else {
        setSubscribedTicketId(ticket.id);
      }
    } catch (err) {
      setError(err.message || 'An error occurred while submitting your ticket.');
      setLoading(false);
    }
  };

  const resetForm = () => {
    setResult(null);
    setEmail('');
    setSubject('');
    setDescription('');
    setStreamText('');
    setAutoResponse('');
  };

  const priorityTone = {
    low: 'priority-low',
    medium: 'priority-medium',
    high: 'priority-high',
    critical: 'priority-critical'
  };

  if (isClassifying) {
    return (
      <section className="submit-layout">
        <article className="submit-panel submit-panel-processing">
          <div className="submit-state-icon submit-spinner" aria-hidden="true" />
          <div className="submit-state-copy">
            <div className="eyebrow">Live analysis</div>
            <h2>Analyzing your ticket</h2>
            <p>
              The queue is connected, so you are seeing the classifier stream in real time as the issue is routed.
            </p>
          </div>

          <div className="stream-console">
            <div className="stream-console-label">AI reasoning stream</div>
            <pre className="stream-console-body">
              {streamText || 'Connecting to AI...'}
              <span className="stream-cursor" />
            </pre>
          </div>
        </article>
      </section>
    );
  }

  if (result && !isClassifying) {
    return (
      <section className="submit-layout">
        <article className="submit-panel submit-result-panel">
          <div className="submit-result-header">
            <div className="submit-state-icon submit-state-success" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <div className="eyebrow">Ticket submitted</div>
              <h2>Request captured and analyzed</h2>
              <p className="submit-result-meta">Ticket ID #{result.id}</p>
            </div>
          </div>

          <div className="submit-result-tags">
            <span className="submit-chip submit-chip-neutral">{result.category || 'Uncategorized'}</span>
            <span className={`submit-chip ${priorityTone[result.priority] || 'submit-chip-neutral'}`}>
              Priority: {result.priority || 'normal'}
            </span>
          </div>

          {result.status === 'resolved' ? (
            <div className="submit-result-card submit-result-success">
              <h3>Auto-resolved by AI</h3>
              <p>{autoResponse || 'Your issue has been automatically resolved.'}</p>
            </div>
          ) : (
            <div className="submit-result-card submit-result-route">
              <h3>Routed for follow-up</h3>
              <p>
                Assigned to <strong>{result.assigned_team || 'Support'}</strong> for human follow-up.
              </p>
              <p className="submit-muted-copy">The team can pick up the full context without needing the requester to restate the issue.</p>
            </div>
          )}

          <button onClick={resetForm} className="button-secondary submit-reset-button">
            Submit another ticket
          </button>
        </article>
      </section>
    );
  }

  return (
    <section className="submit-layout">
      <aside className="submit-sidecard">
        <div className="eyebrow">Intake design</div>
        <h2>Make the first handoff the cleanest one.</h2>
        <p>
          Good support tooling reduces back-and-forth before it starts. Capture the issue clearly, then let routing and urgency happen in the background.
        </p>

        <div className="submit-sidecard-grid">
          <div className="submit-sidecard-stat">
            <span className="submit-sidecard-label">Provider</span>
            <strong>{providerStatus?.provider || aiProvider}</strong>
          </div>
          <div className="submit-sidecard-stat">
            <span className="submit-sidecard-label">Socket</span>
            <strong>{status}</strong>
          </div>
        </div>

        <ul className="submit-sidecard-list">
          <li>Use a concrete subject line instead of “Help” or “Issue”.</li>
          <li>Include what changed, who is blocked, and what you already tried.</li>
          <li>Longer context helps the triage model route with fewer corrections.</li>
        </ul>
      </aside>

      <article className="submit-panel">
        <div className="submit-panel-header">
          <div>
            <div className="eyebrow">Support request</div>
            <h2>Submit a ticket</h2>
            <p className="submit-panel-copy">
              Capture enough detail for routing, escalation, and a fast first response.
            </p>
          </div>
          <span className="submit-chip submit-chip-neutral">
            {providerStatus?.configured ? 'AI ready' : 'Manual fallback available'}
          </span>
        </div>

        {providerStatus && !providerStatus.configured && (
          <div className="submit-alert submit-alert-warning" role="status">
            <strong>AI classification is currently unavailable.</strong>
            <span>
              The {providerStatus.provider} provider is not configured. Add the matching API key in `server/.env` or the project-root `.env`, then restart the server to enable live classification.
            </span>
          </div>
        )}

        {error && (
          <div className="submit-alert submit-alert-danger" role="alert">
            <strong>{error}</strong>
            {configurationHint && <span>{configurationHint}</span>}
          </div>
        )}

        {loading ? (
          <div className="submit-loading">
            <div className="submit-state-icon submit-spinner" aria-hidden="true" />
            <p>Submitting ticket and preparing analysis...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="submit-form">
            <label className="submit-field">
              <span className="submit-label">Your email</span>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="submit-input"
                placeholder="you@company.com"
              />
            </label>

            <label className="submit-field">
              <span className="submit-label">Subject</span>
              <input
                type="text"
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="submit-input"
                placeholder="VPN blocks remote access after password reset"
              />
            </label>

            <label className="submit-field">
              <span className="submit-label">Description</span>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows="7"
                className="submit-input submit-textarea"
                placeholder="What happened, who is affected, when it started, and any steps already tried..."
              />
            </label>

            <button type="submit" className="button-primary submit-submit-button">
              Submit Ticket
            </button>
          </form>
        )}
      </article>
    </section>
  );
};

export default SubmitTicket;
