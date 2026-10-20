import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ParkingLot from '../models/ParkingLot.js';

export const canJoinLotRoom = (user, lot) => {
  if (!user || !lot) return false;
  if (user.role === 'platform_admin' || user.role === 'admin') return true;
  if (user.role === 'owner') return user.ownerStatus === 'approved' && String(lot.owner?._id ?? lot.owner ?? '') === String(user._id);
  if (user.role === 'guard') {
    const assigned = Array.isArray(user.assignedLots) ? user.assignedLots : [];
    return assigned.some((id) => String(id?._id ?? id) === String(lot._id));
  }
  // Nearby parking availability is public to authenticated drivers.
  return user.role === 'driver';
};

// Socket events carry live parking state, so authenticate and scope room joins
// using the same account and assignment data as the REST application.
const setupSockets = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== 'string' || !token) return next(new Error('Not authenticated'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-passwordHash');
      if (!user) return next(new Error('Not authenticated'));
      socket.data.user = user;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join private user room for personal ticket & reservation events
    if (socket.data?.user?._id) {
      socket.join(`user:${socket.data.user._id.toString()}`);
    }

    // Client joins a lot-specific room to receive live slot/availability updates
    socket.on('lot:join', async (payload) => {
      const lotId = typeof payload === 'string' ? payload : payload?.lotId;
      if (typeof lotId !== 'string' || !lotId) return;
      try {
        const lot = await ParkingLot.findById(lotId).select('_id owner');
        if (canJoinLotRoom(socket.data.user, lot)) socket.join(`lot:${lotId}`);
      } catch { /* ignore malformed lot ids and keep the socket connected */ }
    });

    socket.on('lot:leave', (payload) => {
      const lotId = typeof payload === 'string' ? payload : payload?.lotId;
      if (typeof lotId === 'string' && lotId) socket.leave(`lot:${lotId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

export default setupSockets;
