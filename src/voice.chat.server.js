const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const clients = new Map(); // userId => { socket, bubbleId }

function sendTo(socket, data) {
  try {
    socket.send(JSON.stringify(data));
  } catch (err) {
    console.warn("Failed to send:", err);
  }
}

function broadcastUserList(bubbleId) {
  const usersInBubble = [...clients.entries()]
    .filter(([_, v]) => v.bubbleId === bubbleId)
    .map(([id]) => id);

  for (const [id, { socket, bubbleId: bId }] of clients) {
    if (bId === bubbleId) {
      sendTo(socket, { type: 'user-list', users: usersInBubble });
    }
  }
}

wss.on('connection', (socket) => {
  let userId = null;

  socket.on('message', (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }

    if (data.type === 'register') {
      userId = data.id;
      const bubbleId = data.bubbleId;
      clients.set(userId, { socket, bubbleId });

      // Send user list in same bubble
      const usersInBubble = [...clients.keys()].filter(
        id => id !== userId && clients.get(id).bubbleId === bubbleId
      );

      sendTo(socket, { type: 'user-list', users: usersInBubble });

      // Notify others in same bubble
      for (const [id, c] of clients) {
        if (c.bubbleId === bubbleId && id !== userId) {
          sendTo(c.socket, { type: 'user-joined', id: userId });
        }
      }

      return;
    }

    if (data.type === 'leave' && clients.has(data.id)) {
      const bubbleId = clients.get(data.id).bubbleId;
      clients.delete(data.id);

      for (const [id, c] of clients) {
        if (c.bubbleId === bubbleId) {
          sendTo(c.socket, { type: 'user-left', id: data.id });
        }
      }

      return;
    }

    // Forward signaling if in same bubble
    if (data.to && clients.has(data.to)) {
      const recipient = clients.get(data.to);
      const sender = clients.get(userId);
      if (recipient.bubbleId === sender.bubbleId) {
        sendTo(recipient.socket, { ...data, from: userId });
      }
    }
  });

  socket.on('close', () => {
    if (userId && clients.has(userId)) {
      const bubbleId = clients.get(userId).bubbleId;
      clients.delete(userId);
      for (const [id, c] of clients) {
        if (c.bubbleId === bubbleId) {
          sendTo(c.socket, { type: 'user-left', id: userId });
        }
      }
    }
  });
});

console.log("Voice chat signaling server running on ws://localhost:8080");
