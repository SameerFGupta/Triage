import React, { useState, useEffect } from 'react';
import { formatDistanceToNow, parseISO, isPast, isBefore } from 'date-fns';
import { ChevronUp, ChevronDown, CheckCircle, XCircle, Clock, AlertTriangle, AlertCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import './TicketQueue.css';

const TICKET_POLL_INTERVAL = 30000;

export default function TicketQueue() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  // Side panel state
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [ticketDetails, setTicketDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  useEffect(() => {
    fetchTickets();
    const intervalId = setInterval(fetchTickets, TICKET_POLL_INTERVAL);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (selectedTicketId) {
      fetchTicketDetails(selectedTicketId);
    } else {
      setTicketDetails(null);
    }
  }, [selectedTicketId]);

  const fetchTickets = async () => {
    try {
      const response = await fetch('/api/tickets');
      if (!response.ok) throw new Error('Failed to fetch tickets');
      const data = await response.json();
      setTickets(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketDetails = async (id) => {
    setLoadingDetails(true);
    try {
      const response = await fetch(`/api/tickets/${id}`);
      if (!response.ok) throw new Error('Failed to fetch ticket details');
      const data = await response.json();
      setTicketDetails(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedTickets = React.useMemo(() => {
    let sortableTickets = [...tickets];
    if (sortConfig !== null) {
      sortableTickets.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'created_at' || sortConfig.key === 'sla_deadline') {
           aValue = aValue ? new Date(aValue).getTime() : 0;
           bValue = bValue ? new Date(bValue).getTime() : 0;
        } else if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue ? bValue.toLowerCase() : '';
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableTickets;
  }, [tickets, sortConfig]);

  const getSLAStatus = (slaDeadline) => {
    if (!slaDeadline) return { label: 'None', color: 'gray' };
    const deadline = parseISO(slaDeadline);

    if (isPast(deadline)) {
      return { label: 'Breached', color: 'red', icon: <AlertTriangle size={16} /> };
    }

    // Warning if less than 2 hours remaining
    const warningTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
    if (isBefore(deadline, warningTime)) {
      return { label: 'Warning', color: 'yellow', icon: <Clock size={16} /> };
    }

    return { label: 'On Track', color: 'green', icon: <CheckCircle size={16} /> };
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'priority-critical';
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return '';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'status-new';
      case 'classified': return 'status-classified';
      case 'escalated': return 'status-escalated';
      case 'resolved': return 'status-resolved';
      default: return '';
    }
  };

  const submitFeedback = async (responseId, feedbackType) => {
    if (!selectedTicketId) return;
    setFeedbackLoading(true);
    try {
      const res = await fetch(`/api/tickets/${selectedTicketId}/feedback`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseId, feedback: feedbackType })
      });

      if (res.ok) {
        // Refresh ticket details
        fetchTicketDetails(selectedTicketId);
      }
    } catch (err) {
      console.error('Failed to submit feedback', err);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
    }
    return <ChevronUp size={16} className="text-transparent" />;
  };


  return (
    <div className="ticket-queue-container">
      <div className={`ticket-queue-main ${selectedTicketId ? 'panel-open' : ''}`}>
        <div className="ticket-queue-header">
          <h2>Ticket Queue</h2>
          {loading && <span className="loading-indicator">Refreshing...</span>}
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="table-container">
          <table className="ticket-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('id')}>ID {renderSortIcon('id')}</th>
                <th onClick={() => handleSort('subject')}>Subject {renderSortIcon('subject')}</th>
                <th onClick={() => handleSort('category')}>Category {renderSortIcon('category')}</th>
                <th onClick={() => handleSort('assigned_team')}>Team {renderSortIcon('assigned_team')}</th>
                <th onClick={() => handleSort('priority')}>Priority {renderSortIcon('priority')}</th>
                <th onClick={() => handleSort('status')}>Status {renderSortIcon('status')}</th>
                <th onClick={() => handleSort('sla_deadline')}>SLA Status {renderSortIcon('sla_deadline')}</th>
                <th onClick={() => handleSort('created_at')}>Submitted {renderSortIcon('created_at')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedTickets.map(ticket => {
                const sla = getSLAStatus(ticket.sla_deadline);
                return (
                  <tr
                    key={ticket.id}
                    className={selectedTicketId === ticket.id ? 'selected' : ''}
                    onClick={() => setSelectedTicketId(ticket.id)}
                  >
                    <td>#{ticket.id}</td>
                    <td className="ticket-subject" title={ticket.subject}>{ticket.subject}</td>
                    <td>{ticket.category || 'Uncategorized'}</td>
                    <td>{ticket.assigned_team || 'Unassigned'}</td>
                    <td>
                      <span className={`badge ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority?.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getStatusColor(ticket.status)}`}>
                        {ticket.status?.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div className={`sla-status sla-${sla.color}`}>
                        {sla.icon} {sla.label}
                      </div>
                    </td>
                    <td title={new Date(ticket.created_at).toLocaleString()}>
                      {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                    </td>
                  </tr>
                );
              })}
              {sortedTickets.length === 0 && !loading && (
                <tr>
                  <td colSpan="8" className="empty-state">No tickets found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTicketId && (
        <div className="side-panel">
          <div className="panel-header">
            <h3>Ticket #{selectedTicketId} Details</h3>
            <button className="close-btn" onClick={() => setSelectedTicketId(null)}>×</button>
          </div>

          <div className="panel-content">
            {loadingDetails ? (
              <div className="loading-spinner">Loading details...</div>
            ) : ticketDetails ? (
              <>
                <div className="detail-section">
                  <h4>{ticketDetails.subject}</h4>
                  <div className="meta-info">
                    <span>From: {ticketDetails.submitter_email}</span>
                    <span>Created: {new Date(ticketDetails.created_at).toLocaleString()}</span>
                  </div>
                  <div className="ticket-body">
                    {ticketDetails.body}
                  </div>
                </div>

                {ticketDetails.audit_trail && (
                  <div className="detail-section ai-reasoning">
                    <h4>AI Classification Reasoning</h4>
                    {ticketDetails.audit_trail
                      .filter(log => log.event_type === 'ticket_classified')
                      .map((log, idx) => (
                        <div key={idx} className="reasoning-box">
                          {log.payload?.plain_english_reason || 'No reasoning provided.'}
                          <div className="confidence-score">
                            Confidence: {log.payload?.confidence ? (log.payload.confidence * 100).toFixed(0) + '%' : 'N/A'}
                          </div>
                        </div>
                    ))}
                  </div>
                )}

                {ticketDetails.responses && ticketDetails.responses.filter(r => r.type === 'auto').length > 0 && (
                  <div className="detail-section auto-responses">
                    <h4>Auto Responses</h4>
                    {ticketDetails.responses.filter(r => r.type === 'auto').map(response => (
                      <div key={response.id} className="response-box auto">
                        <div className="response-body">{response.body}</div>
                        <div className="response-footer">
                          <span className="timestamp">{new Date(response.created_at).toLocaleString()}</span>
                          <div className="feedback-controls">
                            <span className="feedback-label">Was this helpful?</span>
                            <button
                              className={`feedback-btn ${response.feedback === 'positive' ? 'active' : ''}`}
                              onClick={() => submitFeedback(response.id, 'positive')}
                              disabled={feedbackLoading}
                            >
                              <ThumbsUp size={16} />
                            </button>
                            <button
                              className={`feedback-btn ${response.feedback === 'negative' ? 'active' : ''}`}
                              onClick={() => submitFeedback(response.id, 'negative')}
                              disabled={feedbackLoading}
                            >
                              <ThumbsDown size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {ticketDetails.audit_trail && (
                  <div className="detail-section audit-trail">
                    <h4>Audit Trail</h4>
                    <div className="timeline">
                      {ticketDetails.audit_trail.map(log => {
                        let summary = '';
                        const payload = log.payload || {};

                        switch (log.event_type) {
                          case 'ticket_created':
                            summary = `Subject: ${payload.subject}`;
                            break;
                          case 'ticket_classified':
                          case 'ai_classified':
                            summary = `Confidence: ${(payload.confidence * 100).toFixed(0)}%, Assigned to: ${payload.assigned_team}`;
                            break;
                          case 'ticket_auto_resolved':
                          case 'auto_resolved':
                            summary = 'Response generated';
                            break;
                          case 'ticket_manually_resolved':
                          case 'manually_resolved':
                            summary = `Status changed from ${payload.previous_status}`;
                            break;
                          case 'feedback_received':
                            summary = `Feedback: ${payload.feedback}`;
                            break;
                          case 'sla_breach':
                          case 'sla_breached':
                            summary = `Priority: ${payload.priority}, Deadline: ${new Date(payload.deadline).toLocaleString()}`;
                            break;
                          case 'escalated':
                            summary = 'Ticket has been escalated for human review';
                            break;
                          default:
                            summary = '';
                        }

                        return (
                          <div key={log.id} className="timeline-item">
                            <div className="timeline-time">
                              {new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                            <div className="timeline-content">
                              <div className="event-type">{log.event_type.replace(/_/g, ' ').toUpperCase()}</div>
                              {summary && <div className="event-summary">{summary}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="error-message">Could not load ticket details.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
