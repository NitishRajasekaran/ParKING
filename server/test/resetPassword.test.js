import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertLocalDevelopment,
  normalizeEmail,
  updatePasswordHashOnly,
  validateEmail,
  validateNewPassword,
} from '../resetPassword.js';

test('email input is normalized and validated', () => {
  assert.equal(normalizeEmail('  DRIVER@EXAMPLE.COM '), 'driver@example.com');
  assert.equal(validateEmail('  DRIVER@EXAMPLE.COM '), 'driver@example.com');
  assert.throws(() => validateEmail('not-an-email'), /valid account email/);
});

test('password validation enforces length, non-whitespace, and bcrypt byte limit', () => {
  assert.equal(validateNewPassword('correct horse'), 'correct horse');
  assert.throws(() => validateNewPassword('short'), /at least 8/);
  assert.throws(() => validateNewPassword('        '), /only whitespace/);
  assert.throws(() => validateNewPassword('é'.repeat(37)), /72 UTF-8 bytes/);
});

test('local reset requires explicit opt-in and refuses production', () => {
  assertLocalDevelopment({ NODE_ENV: 'development', PARKING_ALLOW_LOCAL_PASSWORD_RESET: '1' });
  assert.throws(
    () => assertLocalDevelopment({ NODE_ENV: 'development' }),
    /PARKING_ALLOW_LOCAL_PASSWORD_RESET/,
  );
  assert.throws(
    () => assertLocalDevelopment({ NODE_ENV: 'production', PARKING_ALLOW_LOCAL_PASSWORD_RESET: '1' }),
    /disabled in production/,
  );
});

test('password update writes only passwordHash for the selected id', async () => {
  let call;
  const fakeUserModel = {
    updateOne: async (...args) => {
      call = args;
      return { matchedCount: 1, modifiedCount: 1 };
    },
  };
  await updatePasswordHashOnly(fakeUserModel, 'selected-id', 'new-hash');
  assert.deepEqual(call, [
    { _id: 'selected-id' },
    { $set: { passwordHash: 'new-hash' } },
    { timestamps: false },
  ]);
});
