import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import Ticket from '../models/Ticket.js';
import { calculateParkingFee, guardCanAccessLot, ticketLookupFilter, validateTicket } from '../controllers/guardController.js';
import { canJoinLotRoom } from '../sockets/index.js';

const queryReturning = (value) => ({
  populate() { return this; },
  then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
});
const responseRecorder = () => ({
  code: 200,
  body: undefined,
  status(code) { this.code = code; return this; },
  json(body) { this.body = body; return this; },
});

test('manual display code and raw QR payload use the same exact ticket lookup', () => {
  const code = 'PK-3ABC9DEF';
  assert.deepEqual(ticketLookupFilter(code), {
    $or: [{ qrToken: code }, { ticketCode: code }],
  });
});

test('assigned guards can join only their assigned lot room', () => {
  const guard = { _id: 'guard-1', role: 'guard', ownerId: 'owner-1', assignedLots: ['lot-a'] };
  assert.equal(canJoinLotRoom(guard, { _id: 'lot-a' }), true);
  assert.equal(canJoinLotRoom(guard, { _id: 'lot-b' }), false);
  assert.equal(guardCanAccessLot(guard, { _id: 'lot-a' }), true);
  assert.equal(guardCanAccessLot(guard, { _id: 'lot-b' }), false);
  assert.equal(guardCanAccessLot({ role: 'guard', assignedLots: [] }, { _id: 'lot-a' }), false);
  assert.equal(canJoinLotRoom({ role: 'guard', assignedLots: [] }, { _id: 'lot-a' }), false);
});

test('pending owners and unknown users cannot join lot rooms; admins can', () => {
  assert.equal(canJoinLotRoom({ _id: 'owner-1', role: 'owner', ownerStatus: 'pending' }, { _id: 'lot-a', owner: 'owner-1' }), false);
  assert.equal(canJoinLotRoom({ _id: 'owner-1', role: 'owner', ownerStatus: 'approved' }, { _id: 'lot-a', owner: 'owner-1' }), true);
  assert.equal(canJoinLotRoom({ _id: 'admin-1', role: 'platform_admin' }, { _id: 'lot-a' }), true);
  assert.equal(canJoinLotRoom(null, { _id: 'lot-a' }), false);
});

test('platform admins and lot owners have authority to access parking lots', () => {
  const admin = { _id: 'admin-1', role: 'platform_admin' };
  const owner = { _id: 'owner-1', role: 'owner' };
  assert.equal(guardCanAccessLot(admin, { _id: 'lot-any' }), true);
  assert.equal(guardCanAccessLot(owner, { _id: 'lot-a', owner: 'owner-1' }), true);
  assert.equal(guardCanAccessLot(owner, { _id: 'lot-b', owner: 'owner-2' }), false);
});

test('unknown manual or QR values are rejected without changing ticket state', async (t) => {
  t.mock.method(Ticket, 'findOne', () => queryReturning(null));
  const res = responseRecorder();
  await validateTicket({ body: { qrToken: 'not-a-ticket' }, user: { role: 'guard' } }, res);
  assert.equal(res.code, 404);
  assert.match(res.body.message, /ticket not found/i);
});

test('already exited tickets validate as used and keep their state unchanged', async (t) => {
  const ticket = { qrToken: 'used-token', ticketCode: 'PK-USED-CODE', lot: { _id: 'lot-a' }, status: 'exited' };
  t.mock.method(Ticket, 'findOne', () => queryReturning(ticket));
  const res = responseRecorder();
  await validateTicket({ body: { qrToken: 'PK-USED-CODE' }, user: { role: 'guard', assignedLots: ['lot-a'] } }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.status, 'exited');
  assert.equal(ticket.status, 'exited');
});

test('rent is non-fractioned with a minimum of 1 full hour even for short durations', () => {
  const hourlyRate = 50;
  const now = new Date('2026-10-20T10:00:00.000Z');

  // Parked for 30 seconds -> 1 full hour rate (50)
  const after30Seconds = new Date('2026-10-20T10:00:30.000Z');
  assert.equal(calculateParkingFee(now, after30Seconds, hourlyRate), 50);

  // Parked for 1 minute -> 1 full hour rate (50), not a fraction
  const after1Minute = new Date('2026-10-20T10:01:00.000Z');
  assert.equal(calculateParkingFee(now, after1Minute, hourlyRate), 50);

  // Parked for exactly 60 minutes -> 1 full hour rate (50)
  const after60Minutes = new Date('2026-10-20T11:00:00.000Z');
  assert.equal(calculateParkingFee(now, after60Minutes, hourlyRate), 50);

  // Parked for 61 minutes (1 hour 1 minute) -> 2 full hours (100)
  const after61Minutes = new Date('2026-10-20T11:01:00.000Z');
  assert.equal(calculateParkingFee(now, after61Minutes, hourlyRate), 100);

  // Parked for 2 hours 15 minutes -> 3 full hours (150)
  const after135Minutes = new Date('2026-10-20T12:15:00.000Z');
  assert.equal(calculateParkingFee(now, after135Minutes, hourlyRate), 150);
});

