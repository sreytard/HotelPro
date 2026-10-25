const { Server } = require('socket.io');

let io = null;

const initSocket = (httpServer, origins) => {
  io = new Server(httpServer, { cors: { origin: origins } });
  return io;
};

// Tells every open browser tab "something changed - refresh your data".
// No private data is sent, only a small signal.
const notifyChange = (type = 'update', roomId = null) => {
  if (io) io.emit('hotel:changed', { type, roomId: roomId ? String(roomId) : null, at: Date.now() });
};

module.exports = { initSocket, notifyChange };
