import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

import connectDB from './config/db.js';
import { initIo } from './config/io.js';
import setupSockets from './sockets/index.js';

import authRoutes from './routes/authRoutes.js';
import lotRoutes from './routes/lotRoutes.js';
import reservationRoutes from './routes/reservationRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import guardRoutes from './routes/guardRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import simulatorRoutes from './routes/simulatorRoutes.js';

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

// Health-check endpoint
app.get('/', (_req, res) => res.json({ message: 'ParKING backend is running!' }));

// REST API routes
app.use('/api/auth', authRoutes);
app.use('/api/lots', lotRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/guard', guardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/simulator', simulatorRoutes);

// Wrap Express in an HTTP server so Socket.io can share the same port
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Store io in the singleton so controllers can emit events without circular imports
initIo(io);
setupSockets(io);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer();