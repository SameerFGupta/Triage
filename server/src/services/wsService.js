const { WebSocketServer, WebSocket } = require('ws');
const crypto = require('crypto');

let wss = null;
const clients = new Map();

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
    ws.send(JSON.stringify({ type: 'connected', payload: { clientId } }));

    ws.on('close', () => {
      clients.delete(clientId);
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

module.exports = {
  init,
  broadcast,
  sendToClient,
};
