// Singleton holder for the Socket.io instance.
// Controllers import getIo() instead of importing from server.js directly
// to avoid circular ES module dependencies.
let _io = null;

export const initIo = (ioInstance) => {
  _io = ioInstance;
};

export const getIo = () => _io;
