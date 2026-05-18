import React, { useEffect, useState } from 'react';

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

  // Streaming states
  const [isClassifying, setIsClassifying] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [wsClientId, setWsClientId] = useState(null);

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

      // Set the initial result so if websocket stream fails, we still show the submitted ticket
      setResult(ticket);

      // Open WebSocket connection to listen for classification stream and completion
      // Determine the WebSocket URL dynamically based on current protocol and host
      // If deployed or configured, you might use an env variable instead, but this matches TicketQueue logic.
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `${window.location.hostname}:3000`
        : window.location.host;
      const ws = new WebSocket(`${wsProtocol}//${wsHost}`);

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'connection:ack') {
            setWsClientId(data.payload.clientId);
            // Subscribe to this ticket's updates
            ws.send(JSON.stringify({
              type: 'subscribe:ticket',
              payload: { ticketId: ticket.id }
            }));

            // Set initial stream text state
            setIsClassifying(true);
            setLoading(false); // Stop normal loading, show streaming UI
          } else if (data.type === 'ticket:stream:chunk' && data.payload.ticketId === ticket.id) {
            setStreamText(prev => prev + data.payload.chunk);
          } else if (data.type === 'ticket:classified' && data.payload.id === ticket.id) {
            // Update result but wait for potential auto-resolution before finalizing
            setResult(data.payload);
          } else if (data.type === 'ticket:auto_resolved' && data.payload.id === ticket.id) {
            const resolvedTicket = data.payload;

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
            ws.close();
          } else if (data.type === 'stream:end' && data.payload.ticketId === ticket.id) {
            // Give auto-resolve a moment to trigger, if it doesn't, finish
            setTimeout(() => {
              setIsClassifying(false);
              ws.close();
            }, 1000);
          }
        } catch (e) {
          console.error("Error parsing websocket message", e);
        }
      };

      ws.onerror = () => {
        // Fallback to static result if websocket fails
        setResult(ticket);
        setLoading(false);
        setIsClassifying(false);
      };

    } catch (err) {
      setError(err.message || 'An error occurred while submitting your ticket.');
      setLoading(false);
    }
  };

  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800'
  };

  if (isClassifying) {
    return (
      <div className="max-w-2xl mx-auto p-6 mt-10 bg-white rounded-lg shadow-md border border-gray-200 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Analyzing Your Ticket...</h2>
        <div className="flex justify-center items-center mb-6">
          <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded p-4 text-left min-h-[100px] overflow-auto">
          <p className="text-gray-700 font-mono text-sm whitespace-pre-wrap">
            <span className="text-indigo-600 font-semibold mb-2 block">AI is thinking...</span>
            {streamText || "Connecting to AI..."}
            <span className="inline-block w-2 h-4 ml-1 bg-indigo-500 animate-pulse"></span>
          </p>
        </div>
      </div>
    );
  }

  if (result && !isClassifying) {
    return (
      <div className="max-w-2xl mx-auto p-6 mt-10 bg-white rounded-lg shadow-md border border-gray-200">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Ticket Submitted & Analyzed</h2>
          <p className="text-gray-600 mt-2">Ticket ID: #{result.id}</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-md mb-6 border border-gray-100">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {result.category || 'Uncategorized'}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${priorityColors[result.priority] || 'bg-gray-100 text-gray-800'}`}>
              Priority: {result.priority || 'Normal'}
            </span>
          </div>

          {result.status === 'resolved' ? (
            <div className="bg-green-50 border border-green-200 p-4 rounded text-left">
              <h3 className="font-semibold text-green-800 mb-2">Auto-Resolved by AI</h3>
              <p className="text-green-700">{autoResponse || 'Your issue has been automatically resolved.'}</p>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded text-left">
              <p className="text-blue-800 font-medium">
                Routed to <span className="font-bold">{result.assigned_team || 'Support'}</span> team.
              </p>
              <p className="text-blue-600 text-sm mt-1">We will be in touch shortly.</p>
            </div>
          )}
        </div>

        <div className="text-center">
          <button
            onClick={() => {
              setResult(null);
              setEmail('');
              setSubject('');
              setDescription('');
              setStreamText('');
            }}
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Submit another ticket
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 mt-10 bg-white rounded-lg shadow-md border border-gray-200 text-left">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Submit a Support Ticket</h2>

      {providerStatus && !providerStatus.configured && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded relative mb-4" role="status">
          <span className="block sm:inline">
            AI classification is currently unavailable because the {providerStatus.provider} provider is not configured.
          </span>
          <span className="block mt-2 text-sm text-amber-700">
            Add the matching API key in `server/.env` or the project-root `.env`, then restart the server to enable live classification.
          </span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
          {configurationHint && (
            <span className="block mt-2 text-sm text-red-600">{configurationHint}</span>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <svg className="animate-spin h-10 w-10 text-indigo-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg font-medium text-gray-700">Analyzing your ticket...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Your Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Brief description of the issue"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows="5"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Please provide details about your issue..."
            ></textarea>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white font-medium py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            Submit Ticket
          </button>
        </form>
      )}
    </div>
  );
};

export default SubmitTicket;
