import test from 'node:test';
import assert from 'node:assert/strict';
import User from '../models/User.js';
import Ticket from '../models/Ticket.js';
import ParkingLot from '../models/ParkingLot.js';
import Slot from '../models/Slot.js';
import { forgotPassword } from '../controllers/authController.js';
import { deleteTicket, deleteUsedTickets } from '../controllers/ticketController.js';
import { deleteSlot } from '../controllers/lotController.js';
import { deleteOwnerGuard } from '../controllers/ownerController.js';
import { deleteLot, deleteStaffUser } from '../controllers/adminController.js';

const responseRecorder = () => ({
  code: 200,
  body: undefined,
  status(code) { this.code = code; return this; },
  json(body) { this.body = body; return this; },
});

test('forgotPassword updates password for existing user without requiring auth token', async (t) => {
  let saved = false;
  const mockUser = {
    email: 'driver@test.com',
    passwordHash: 'old-hash',
    save: async () => { saved = true; },
  };
  t.mock.method(User, 'findOne', () => Promise.resolve(mockUser));

  const res = responseRecorder();
  await forgotPassword({ body: { email: 'DRIVER@TEST.COM', password: 'NewPassword123' } }, res);

  assert.equal(res.code, 200);
  assert.equal(saved, true);
  assert.match(res.body.message, /password reset successfully/i);
});

test('forgotPassword returns 404 if email does not exist', async (t) => {
  t.mock.method(User, 'findOne', () => Promise.resolve(null));

  const res = responseRecorder();
  await forgotPassword({ body: { email: 'unknown@test.com', password: 'NewPassword123' } }, res);

  assert.equal(res.code, 404);
  assert.match(res.body.message, /no account found/i);
});

test('deleteTicket rejects non-exited tickets with 400', async (t) => {
  const activeTicket = { _id: '507f1f77bcf86cd799439011', status: 'issued', user: 'driver-1' };
  t.mock.method(Ticket, 'findById', () => Promise.resolve(activeTicket));

  const res = responseRecorder();
  await deleteTicket({ params: { id: '507f1f77bcf86cd799439011' }, user: { _id: 'driver-1', role: 'driver' } }, res);

  assert.equal(res.code, 400);
  assert.match(res.body.message, /only exited/i);
});

test('deleteTicket allows owner to delete exited tickets', async (t) => {
  const exitedTicket = { _id: '507f1f77bcf86cd799439011', status: 'exited', user: 'driver-1' };
  t.mock.method(Ticket, 'findById', () => Promise.resolve(exitedTicket));
  let deletedId = null;
  t.mock.method(Ticket, 'findByIdAndDelete', (id) => { deletedId = id; return Promise.resolve(exitedTicket); });

  const res = responseRecorder();
  await deleteTicket({ params: { id: '507f1f77bcf86cd799439011' }, user: { _id: 'driver-1', role: 'driver' } }, res);

  assert.equal(res.code, 200);
  assert.equal(deletedId, '507f1f77bcf86cd799439011');
});

test('deleteSlot rejects occupied or reserved slots with 400', async (t) => {
  const lotId = '507f1f77bcf86cd799439021';
  const slotId = '507f1f77bcf86cd799439022';
  const mockLot = { _id: lotId, owner: 'owner-1', createdBy: 'owner-1', totalSlots: 10 };
  const mockSlot = { _id: slotId, lot: lotId, status: 'occupied' };

  t.mock.method(ParkingLot, 'findById', () => Promise.resolve(mockLot));
  t.mock.method(Slot, 'findOne', () => Promise.resolve(mockSlot));

  const res = responseRecorder();
  await deleteSlot({ params: { lotId, slotId }, user: { _id: 'owner-1', role: 'owner' } }, res);

  assert.equal(res.code, 400);
  assert.match(res.body.message, /cannot delete slot/i);
});

test('deleteOwnerGuard removes guard belonging to owner', async (t) => {
  const guardId = '507f1f77bcf86cd799439031';
  const mockGuard = { _id: guardId, role: 'guard', ownerId: 'owner-1' };
  t.mock.method(User, 'findOne', () => Promise.resolve(mockGuard));
  let deletedId = null;
  t.mock.method(User, 'findByIdAndDelete', (id) => { deletedId = id; return Promise.resolve(mockGuard); });

  const res = responseRecorder();
  await deleteOwnerGuard({ params: { id: guardId }, user: { _id: 'owner-1', role: 'owner' } }, res);

  assert.equal(res.code, 200);
  assert.equal(deletedId, guardId);
});

test('deleteLot removes parking lot and its slots', async (t) => {
  const lotId = '507f1f77bcf86cd799439041';
  const mockLot = { _id: lotId, name: 'Downtown Garage' };
  t.mock.method(ParkingLot, 'findById', () => Promise.resolve(mockLot));
  let deletedLotId = null;
  let deletedSlotsFilter = null;
  t.mock.method(ParkingLot, 'findByIdAndDelete', (id) => { deletedLotId = id; return Promise.resolve(mockLot); });
  t.mock.method(Slot, 'deleteMany', (filter) => { deletedSlotsFilter = filter; return Promise.resolve({ deletedCount: 5 }); });

  const res = responseRecorder();
  await deleteLot({ params: { id: lotId }, user: { _id: 'admin-1', role: 'platform_admin' } }, res);

  assert.equal(res.code, 200);
  assert.equal(deletedLotId, lotId);
  assert.deepEqual(deletedSlotsFilter, { lot: lotId });
});
