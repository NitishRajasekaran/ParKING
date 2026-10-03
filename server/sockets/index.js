// Socket.io event handlers.
// io is passed in from server.js after it is initialised.
const setupSockets = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Client joins a lot-specific room to receive live slot/availability updates
    socket.on('lot:join', (lotId) => {
      socket.join(`lot:${lotId}`);
    });

    socket.on('lot:leave', (lotId) => {
      socket.leave(`lot:${lotId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

export default setupSockets;
