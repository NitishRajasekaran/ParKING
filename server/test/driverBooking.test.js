import test from 'node:test';
import assert from 'node:assert/strict';

const API_URL = 'http://localhost:5000/api';

test('Driver Booking, Permissions, Slot States and Tickets Verification', async (t) => {
  let driverToken = '';
  let guardToken = '';
  let ownerToken = '';
  let targetLotId = '';
  let availableSlotId = '';
  let reservedSlotId = '';
  let createdReservationId = '';
  let createdTicketId = '';

  await t.test('1. Authentication: Login driver, guard, and owner', async () => {
    // Driver login
    const dRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'driver@parking.com', password: 'Driver@123' }),
    });
    assert.equal(dRes.status, 200, 'Driver login failed');
    const dData = await dRes.json();
    driverToken = dData.token;
    assert.equal(dData.user.role, 'driver');

    // Guard login
    const gRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'guard@parking.com', password: 'Guard@123' }),
    });
    assert.equal(gRes.status, 200, 'Guard login failed');
    const gData = await gRes.json();
    guardToken = gData.token;
    assert.equal(gData.user.role, 'guard');

    // Owner login
    const oRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@parking.com', password: 'Owner@123' }),
    });
    assert.equal(oRes.status, 200, 'Owner login failed');
    const oData = await oRes.json();
    ownerToken = oData.token;
    assert.equal(oData.user.role, 'owner');
  });

  await t.test('2. Discovery: Find active lot with available slots', async () => {
    const lotsRes = await fetch(`${API_URL}/lots/nearby?lat=12.9716&lng=77.5946&radius=50000`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    assert.equal(lotsRes.status, 200);
    const lots = await lotsRes.json();

    for (const lot of lots) {
      const slotsRes = await fetch(`${API_URL}/lots/${lot._id}/slots`, {
        headers: { Authorization: `Bearer ${driverToken}` },
      });
      if (slotsRes.status === 200) {
        const slots = await slotsRes.json();
        const freeSlot = slots.find((s) => s.status === 'available');
        if (freeSlot) {
          targetLotId = lot._id;
          availableSlotId = freeSlot._id;
          break;
        }
      }
    }

    if (!targetLotId || !availableSlotId) {
      // Create a test lot if no existing lots have available slots
      const createRes = await fetch(`${API_URL}/lots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({
          name: `Driver Test Lot ${Date.now()}`,
          address: '456 Automation Way, Tech City',
          latitude: 12.9716,
          longitude: 77.5946,
          hourlyRate: 60,
          totalSlots: 4,
        }),
      });
      assert.equal(createRes.status, 201);
      const createdLot = await createRes.json();
      targetLotId = createdLot._id;

      const slotsRes = await fetch(`${API_URL}/lots/${targetLotId}/slots`, {
        headers: { Authorization: `Bearer ${driverToken}` },
      });
      const slots = await slotsRes.json();
      const freeSlot = slots.find((s) => s.status === 'available');
      assert.ok(freeSlot);
      availableSlotId = freeSlot._id;
    }

    assert.ok(targetLotId, 'Target lot not found');
    assert.ok(availableSlotId, 'No available slot found in target lot');
  });

  await t.test('3. Security: Unauthenticated reservation request rejected with 401', async () => {
    const res = await fetch(`${API_URL}/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lotId: targetLotId,
        slotId: availableSlotId,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
      }),
    });
    assert.equal(res.status, 401, 'Unauthenticated request should return 401');
  });

  await t.test('4. Security: Disallowed role (guard) rejected with 403 Forbidden: insufficient permissions', async () => {
    const res = await fetch(`${API_URL}/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guardToken}`,
      },
      body: JSON.stringify({
        lotId: targetLotId,
        slotId: availableSlotId,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
      }),
    });
    assert.equal(res.status, 403, 'Guard reserving slot should return 403');
    const data = await res.json();
    assert.match(data.message, /forbidden|insufficient permissions/i);
  });

  await t.test('5. Validation: Slot not belonging to the lot rejected with 404', async () => {
    const fakeSlotId = '507f1f77bcf86cd799439011';
    const res = await fetch(`${API_URL}/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({
        lotId: targetLotId,
        slotId: fakeSlotId,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
      }),
    });
    assert.equal(res.status, 404, 'Mismatched or missing slot must return 404');
    const data = await res.json();
    assert.match(data.message, /slot not found/i);
  });

  await t.test('6. Booking: Authenticated driver reserves free slot successfully (201)', async () => {
    const res = await fetch(`${API_URL}/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({
        lotId: targetLotId,
        slotId: availableSlotId,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
      }),
    });
    assert.equal(res.status, 201, `Driver reservation failed: ${res.status}`);
    const data = await res.json();
    assert.ok(data.reservation, 'Response missing reservation');
    assert.ok(data.ticket, 'Response missing ticket');
    assert.equal(data.reservation.status, 'reserved');
    assert.equal(data.ticket.status, 'issued');
    assert.ok(data.ticket.qrToken, 'Ticket missing qrToken');
    assert.ok(data.ticket.ticketCode, 'Ticket missing ticketCode');

    createdReservationId = data.reservation._id;
    createdTicketId = data.ticket._id;
    reservedSlotId = availableSlotId;
  });

  await t.test('7. Concurrency: Already-reserved slot cannot be reserved again (409 Conflict)', async () => {
    const res = await fetch(`${API_URL}/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({
        lotId: targetLotId,
        slotId: reservedSlotId,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
      }),
    });
    assert.equal(res.status, 409, 'Double booking reserved slot must return 409 Conflict');
    const data = await res.json();
    assert.match(data.message, /cannot be reserved|reserved|not available|conflict/i);
  });

  await t.test('8. Persistence & My Tickets: Ticket retrieved in driver ticket list', async () => {
    const res = await fetch(`${API_URL}/tickets/mine`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    assert.equal(res.status, 200);
    const tickets = await res.json();
    assert.ok(Array.isArray(tickets), 'Tickets response is not an array');
    const myTicket = tickets.find((t) => t._id === createdTicketId);
    assert.ok(myTicket, 'Newly created ticket not found in driver tickets list');
    assert.equal(myTicket.status, 'issued');
    assert.ok(myTicket.lot, 'Ticket missing lot reference');
  });

  await t.test('9. Ticket Detail: Single ticket fetched with full populated data', async () => {
    const res = await fetch(`${API_URL}/tickets/${createdTicketId}`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    assert.equal(res.status, 200);
    const ticket = await res.json();
    assert.equal(ticket._id, createdTicketId);
    assert.equal(ticket.status, 'issued');
    assert.ok(ticket.ticketCode);
    assert.ok(ticket.qrToken);
  });

  await t.test('10. Validation & Roles: Guard endpoint enforces authorization', async () => {
    // Driver cannot call guard validation (403 Forbidden)
    const driverVal = await fetch(`${API_URL}/guard/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({ qrToken: createdTicketId }),
    });
    assert.equal(driverVal.status, 403, 'Driver must not be allowed to validate tickets as guard');

    // Platform admin / authorized staff can validate
    const adminRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@parking.com', password: 'Admin@123' }),
    });
    const { token: adminToken } = await adminRes.json();

    const ticketDetailRes = await fetch(`${API_URL}/tickets/${createdTicketId}`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    const ticketData = await ticketDetailRes.json();

    const valRes = await fetch(`${API_URL}/guard/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ qrToken: ticketData.ticketCode }),
    });
    assert.equal(valRes.status, 200, 'Authorized validator must be able to validate ticket');
    const valData = await valRes.json();
    assert.equal(valData._id, createdTicketId);
    assert.equal(valData.status, 'issued');
  });
});
