const { WebSocketServer, WebSocket } = require('ws');
const crypto = require('crypto');

let wss = null;
const clients = new Map();
const ticketSubscriptions = new Map();

/**
 * Initializes the WebSocket server using the existing HTTP server.
 * @param {import('http').Server} server - The Express HTTP server instance.
 */
function init(server) {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    // Optionally use URL parameters or headers for a custom clientId.
    // For now, auto-generate a unique ID.
    const clientId = crypto.randomUUID();

    clients.set(clientId, ws);

    // Attach ID to socket instance for easy access on close
    ws.clientId = clientId;

    console.log(`WebSocket client connected: ${clientId}`);

    // Send the client their ID upon connection
    ws.send(JSON.stringify({ type: 'connection:ack', payload: { clientId } }));

    ws.on('message', (message) => {
      try {
        const parsed = JSON.parse(message);
        if (parsed.type === 'subscribe:ticket' && parsed.payload && parsed.payload.ticketId) {
          const ticketId = parsed.payload.ticketId;
          if (!ticketSubscriptions.has(ticketId)) {
            ticketSubscriptions.set(ticketId, new Set());
          }
          ticketSubscriptions.get(ticketId).add(ws);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      clients.delete(clientId);

      // Remove client from any ticket subscriptions
      for (const [ticketId, subscribers] of ticketSubscriptions.entries()) {
        if (subscribers.has(ws)) {
          subscribers.delete(ws);
          if (subscribers.size === 0) {
            ticketSubscriptions.delete(ticketId);
          }
        }
      }
      console.log(`WebSocket client disconnected: ${clientId}`);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket client error (${clientId}):`, error);
    });
  });

  console.log('WebSocket server initialized.');
}

/**
 * Broadcasts an event to all connected clients.
 * @param {string} event - The type of event.
 * @param {any} payload - The data payload to send.
 */
function broadcast(event, payload) {
  if (!wss) return;

  const message = JSON.stringify({ type: event, payload });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

/**
 * Sends an event to a specific connected client.
 * @param {string} clientId - The ID of the target client.
 * @param {string} event - The type of event.
 * @param {any} payload - The data payload to send.
 */
function sendToClient(clientId, event, payload) {
  const client = clients.get(clientId);

  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify({ type: event, payload }));
  }
}

/**
 * Sends a streaming chunk to all clients subscribed to a specific ticket.
 * @param {string|number} ticketId - The ID of the ticket.
 * @param {string} chunk - The streaming chunk of text.
 */
function streamToTicketSubscribers(ticketId, chunk) {
  const subscribers = ticketSubscriptions.get(ticketId) || ticketSubscriptions.get(String(ticketId)) || ticketSubscriptions.get(Number(ticketId));
  if (subscribers) {
    const message = JSON.stringify({ type: 'ticket:stream:chunk', payload: { ticketId, chunk } });
    for (const client of subscribers) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }
}

module.exports = {
  init,
  broadcast,
  sendToClient,
  streamToTicketSubscribers,
};
