import test from 'node:test';
import assert from 'node:assert/strict';

const API_URL = 'http://localhost:5000/api';

test('End-to-End User Journeys: Driver, Owner, Guard, and Admin', async (t) => {
  let adminToken = '';
  let ownerToken = '';
  let guardToken = '';
  let driverToken = '';
  let createdLotId = '';
  let availableSlotId = '';
  let ticketId = '';
  let qrToken = '';
  let ticketCode = '';

  await t.test('1. Authentication: Log in all 4 roles', async () => {
    // Admin login
    const adminRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@parking.com', password: 'Admin@123' }),
    });
    assert.equal(adminRes.status, 200, 'Admin login failed');
    const adminData = await adminRes.json();
    adminToken = adminData.token;
    assert.ok(adminToken, 'Admin token missing');
    assert.equal(adminData.user.role, 'platform_admin');

    // Owner login
    const ownerRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@parking.com', password: 'Owner@123' }),
    });
    assert.equal(ownerRes.status, 200, 'Owner login failed');
    const ownerData = await ownerRes.json();
    ownerToken = ownerData.token;
    assert.ok(ownerToken, 'Owner token missing');
    assert.equal(ownerData.user.role, 'owner');
    assert.equal(ownerData.user.ownerStatus, 'approved');

    // Guard login
    const guardRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'guard@parking.com', password: 'Guard@123' }),
    });
    assert.equal(guardRes.status, 200, 'Guard login failed');
    const guardData = await guardRes.json();
    guardToken = guardData.token;
    assert.ok(guardToken, 'Guard token missing');
    assert.equal(guardData.user.role, 'guard');

    // Driver login
    const driverRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'driver@parking.com', password: 'Driver@123' }),
    });
    assert.equal(driverRes.status, 200, 'Driver login failed');
    const driverData = await driverRes.json();
    driverToken = driverData.token;
    assert.ok(driverToken, 'Driver token missing');
    assert.equal(driverData.user.role, 'driver');
  });

  await t.test('2. Owner Workflow: Owner checks status, creates parking lot, and verifies slots', async () => {
    // Check owner status
    const statusRes = await fetch(`${API_URL}/owner/status`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(statusRes.status, 200);
    const statusData = await statusRes.json();
    assert.equal(statusData.ownerStatus, 'approved');

    // Create a new parking lot as owner
    const uniqueName = `E2E Owner Plaza ${Date.now()}`;
    const createLotRes = await fetch(`${API_URL}/owner/lots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        name: uniqueName,
        address: '100 University Blvd, Tech City',
        latitude: 12.9716,
        longitude: 77.5946,
        hourlyRate: 50,
        totalSlots: 6,
      }),
    });
    assert.equal(createLotRes.status, 201, 'Owner lot creation failed');
    const newLot = await createLotRes.json();
    createdLotId = newLot._id;
    assert.ok(createdLotId, 'Lot ID missing');
    assert.equal(newLot.name, uniqueName);
    assert.equal(newLot.totalSlots, 6);
    assert.equal(newLot.hourlyRate, 50);

    // Verify the new lot appears in owner's lots list with occupancy metrics
    const ownerLotsRes = await fetch(`${API_URL}/owner/lots`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(ownerLotsRes.status, 200);
    const ownerLots = await ownerLotsRes.json();
    const foundLot = ownerLots.find((l) => l._id === createdLotId);
    assert.ok(foundLot, 'Created lot not found in owner lots query');
    assert.equal(foundLot.totalSlots, 6);
    assert.equal(foundLot.availableSlots, 6);
    assert.equal(foundLot.occupiedSlots, 0);

    // Verify slots were generated
    const slotsRes = await fetch(`${API_URL}/lots/${createdLotId}/slots`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    assert.equal(slotsRes.status, 200);
    const slots = await slotsRes.json();
    assert.equal(slots.length, 6, 'Generated slot count should match totalSlots');
    const availableSlot = slots.find((s) => s.status === 'available');
    assert.ok(availableSlot, 'At least one slot must be available');
    availableSlotId = availableSlot._id;
  });

  await t.test('3. Guard Assignment: Owner assigns guard to the new lot and verifies persistence', async () => {
    // List owner guards
    const guardsRes = await fetch(`${API_URL}/owner/guards`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(guardsRes.status, 200);
    const guards = await guardsRes.json();
    assert.ok(guards.length > 0, 'At least one guard must exist');
    const testGuard = guards[0];

    // Assign the new lot to guard
    const existingLotIds = (testGuard.assignedLots || []).map((l) => (typeof l === 'string' ? l : l._id));
    const nextLots = [...new Set([...existingLotIds, createdLotId])];

    const assignRes = await fetch(`${API_URL}/owner/guards/${testGuard._id}/assign`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({ assignedLots: nextLots }),
    });
    assert.equal(assignRes.status, 200, 'Owner guard assignment failed');
    const updatedGuard = await assignRes.json();

    const assignedIds = (updatedGuard.assignedLots || []).map((l) => (typeof l === 'string' ? l : l._id));
    assert.ok(assignedIds.includes(createdLotId), 'Newly assigned lot must be present in guard assignedLots');
  });

  await t.test('4. Driver Workflow: Search lots, reserve slot, verify ticket and QR generation', async () => {
    // Nearby search returns availability
    const nearbyRes = await fetch(`${API_URL}/lots/nearby?lat=12.9716&lng=77.5946`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    assert.equal(nearbyRes.status, 200);
    const nearbyLots = await nearbyRes.json();
    const myLot = nearbyLots.find((l) => l._id === createdLotId);
    assert.ok(myLot, 'Created lot must appear in nearby search');
    assert.equal(myLot.availableSlots, 6, 'availableSlots must equal availableCount');
    assert.equal(myLot.availableCount, 6);

    // Reserve a slot
    const reserveRes = await fetch(`${API_URL}/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({ lotId: createdLotId, slotId: availableSlotId }),
    });
    assert.equal(reserveRes.status, 201, 'Driver reservation creation failed');
    const reserveData = await reserveRes.json();
    assert.ok(reserveData.reservation, 'Reservation object missing');
    assert.ok(reserveData.ticket, 'Ticket object missing');

    ticketId = reserveData.ticket._id;
    qrToken = reserveData.ticket.qrToken;
    ticketCode = reserveData.ticket.ticketCode;
    assert.ok(ticketId, 'Ticket ID missing');
    assert.ok(qrToken, 'qrToken missing');
    assert.ok(ticketCode, 'ticketCode missing');
    assert.match(ticketCode, /^PK-[A-Z0-9]+$/, 'ticketCode must match human-readable PK- pattern');

    // Verify driver can see their tickets
    const myTicketsRes = await fetch(`${API_URL}/tickets/mine`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    assert.equal(myTicketsRes.status, 200);
    const myTickets = await myTicketsRes.json();
    const foundTicket = myTickets.find((t) => t._id === ticketId);
    assert.ok(foundTicket, 'Created ticket must be returned in /tickets/mine');
    assert.equal(foundTicket.status, 'issued');
  });

  await t.test('5. Guard Validation, Entry & Exit: Non-fractioned billing verification', async () => {
    // Guard validates ticket using human-readable ticket code
    const validateRes = await fetch(`${API_URL}/guard/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guardToken}`,
      },
      body: JSON.stringify({ qrToken: ticketCode }),
    });
    assert.equal(validateRes.status, 200, 'Guard ticket validation failed with ticketCode');
    const validTicket = await validateRes.json();
    assert.equal(validTicket.status, 'issued');

    // Confirm entry
    const entryRes = await fetch(`${API_URL}/guard/entry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guardToken}`,
      },
      body: JSON.stringify({ qrToken: ticketCode }),
    });
    assert.equal(entryRes.status, 200, 'Guard entry confirmation failed');
    const entryData = await entryRes.json();
    assert.equal(entryData.status, 'entered');
    assert.ok(entryData.enteredAt, 'enteredAt timestamp must be recorded');

    // Confirm exit
    const exitRes = await fetch(`${API_URL}/guard/exit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guardToken}`,
      },
      body: JSON.stringify({ qrToken: ticketCode }),
    });
    assert.equal(exitRes.status, 200, 'Guard exit confirmation failed');
    const exitData = await exitRes.json();
    assert.equal(exitData.status, 'exited');
    assert.ok(exitData.exitedAt, 'exitedAt timestamp must be recorded');

    // Non-fractioned minimum 1-hour billing check
    // hourlyRate is 50, so amount must be 50 (1 hour minimum) and an integer
    assert.equal(exitData.amount, 50, 'Amount must be non-fractioned 1-hour minimum charge (50)');
    assert.ok(Number.isInteger(exitData.amount), 'Amount must not be a floating fraction');
  });

  await t.test('6. Metrics & Platform Admin: Owner revenue and admin metrics reflection', async () => {
    // Owner revenue includes the 50 from the exited ticket
    const ownerRevRes = await fetch(`${API_URL}/owner/metrics/revenue`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(ownerRevRes.status, 200);
    const ownerRev = await ownerRevRes.json();
    assert.ok(ownerRev.totalRevenue >= 50, 'Owner total revenue must include the completed session');

    // Admin revenue metrics
    const adminRevRes = await fetch(`${API_URL}/admin/metrics/revenue`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminRevRes.status, 200);
    const adminRev = await adminRevRes.json();
    assert.ok(adminRev.totalRevenue >= 50, 'Admin total revenue must include the completed session');

    // Admin lots list reflects lot with occupancy metrics
    const adminLotsRes = await fetch(`${API_URL}/admin/lots`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminLotsRes.status, 200);
    const adminLots = await adminLotsRes.json();
    const adminFoundLot = adminLots.find((l) => l._id === createdLotId);
    assert.ok(adminFoundLot, 'Created lot must appear in admin lots list');
    assert.equal(adminFoundLot.totalSlots, 6);
  });
});
