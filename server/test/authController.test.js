import test from 'node:test';
import assert from 'node:assert/strict';
import User from '../models/User.js';
import { getAdminSetupStatus, register, setupFirstAdmin } from '../controllers/authController.js';

process.env.JWT_SECRET = 'auth-controller-test-secret';

function response() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
  };
}

test('public registration rejects role input and only creates drivers', async (t) => {
  let created;
  t.mock.method(User, 'exists', async () => null);
  t.mock.method(User, 'create', async (data) => { created = data; return { _id: 'driver-id', role: data.role }; });

  const rejected = response();
  await register({ body: { name: 'Attempt', email: 'attempt@example.com', password: 'password1', role: 'platform_admin' } }, rejected);
  assert.equal(rejected.statusCode, 400);
  assert.equal(created, undefined);

  const accepted = response();
  await register({ body: { name: 'Driver', email: 'driver@example.com', password: 'password1' } }, accepted);
  assert.equal(accepted.statusCode, 201);
  assert.equal(created.role, 'driver');
});

test('first admin setup creates platform_admin and closes after creation', async (t) => {
  let adminExists = false;
  let created;
  t.mock.method(User, 'exists', async (query) => query.role ? adminExists : null);
  t.mock.method(User, 'create', async (data) => {
    created = data;
    if (data.role === 'platform_admin') adminExists = true;
    return { _id: 'platform-admin-id', role: data.role };
  });

  const statusBefore = response();
  await getAdminSetupStatus({}, statusBefore);
  assert.deepEqual(statusBefore.body, { available: true });

  const setup = response();
  await setupFirstAdmin({ body: { name: 'First Admin', email: 'admin@example.com', password: 'admin-password' } }, setup);
  assert.equal(setup.statusCode, 201);
  assert.equal(created.role, 'platform_admin');

  const statusAfter = response();
  await getAdminSetupStatus({}, statusAfter);
  assert.deepEqual(statusAfter.body, { available: false });

  const repeated = response();
  await setupFirstAdmin({ body: { name: 'Second Admin', email: 'second@example.com', password: 'admin-password' } }, repeated);
  assert.equal(repeated.statusCode, 409);
  assert.equal(created.email, 'admin@example.com');
});

test('first admin setup rejects a client-supplied role', async (t) => {
  t.mock.method(User, 'exists', async () => null);
  const create = t.mock.method(User, 'create', async () => { throw new Error('must not create'); });
  const res = response();
  await setupFirstAdmin({ body: { name: 'Admin', email: 'admin@example.com', password: 'admin-password', role: 'admin' } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(create.mock.callCount(), 0);
});
