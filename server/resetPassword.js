import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createInterface, emitKeypressEvents } from 'node:readline';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import User from './models/User.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_BCRYPT_BYTES = 72;

class SafeResetError extends Error {}

export function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function validateEmail(value) {
  const email = normalizeEmail(value);
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    throw new SafeResetError('Enter a valid account email address.');
  }
  return email;
}

export function validateNewPassword(value) {
  if (typeof value !== 'string' || value.length < MIN_PASSWORD_LENGTH) {
    throw new SafeResetError(`Password must contain at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (!value.trim()) {
    throw new SafeResetError('Password cannot contain only whitespace.');
  }
  if (Buffer.byteLength(value, 'utf8') > MAX_BCRYPT_BYTES) {
    throw new SafeResetError(`Password must be no more than ${MAX_BCRYPT_BYTES} UTF-8 bytes.`);
  }
  return value;
}

export function assertLocalDevelopment(env = process.env) {
  if (String(env.NODE_ENV ?? '').toLowerCase() === 'production') {
    throw new SafeResetError('Password reset utility is disabled in production.');
  }
  if (env.PARKING_ALLOW_LOCAL_PASSWORD_RESET !== '1') {
    throw new SafeResetError('Set PARKING_ALLOW_LOCAL_PASSWORD_RESET=1 for this local development run.');
  }
}

export async function updatePasswordHashOnly(UserModel, userId, passwordHash) {
  return UserModel.updateOne(
    { _id: userId },
    { $set: { passwordHash } },
    { timestamps: false },
  );
}

function promptLine(question) {
  return new Promise((resolveAnswer, reject) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolveAnswer(answer);
    });
    rl.on('error', reject);
  });
}

function promptHidden(question) {
  const input = process.stdin;
  if (!input.isTTY || typeof input.setRawMode !== 'function') {
    return Promise.reject(new SafeResetError('Run this utility in an interactive terminal.'));
  }

  return new Promise((resolveAnswer, reject) => {
    let value = '';
    let settled = false;
    const cleanup = () => {
      input.off('keypress', onKeypress);
      if (input.isTTY) input.setRawMode(false);
      input.pause();
      process.stdout.write('\n');
    };
    const finish = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolveAnswer(value);
    };
    const onKeypress = (character, key = {}) => {
      if (key.ctrl && key.name === 'c') return finish(new SafeResetError('Password reset cancelled.'));
      if (key.name === 'return' || key.name === 'enter') return finish();
      if (key.name === 'backspace') {
        value = [...value].slice(0, -1).join('');
        return;
      }
      if (!key.ctrl && !key.meta && character) value += character;
    };

    process.stdout.write(question);
    emitKeypressEvents(input);
    input.on('keypress', onKeypress);
    input.setRawMode(true);
    input.resume();
  });
}

async function main() {
  let connected = false;
  try {
    dotenv.config({ quiet: true });
    assertLocalDevelopment();
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      throw new SafeResetError('Run this utility in an interactive terminal.');
    }

    const email = validateEmail(await promptLine('Existing account email: '));
    const password = validateNewPassword(await promptHidden('New password (input hidden): '));
    const confirmation = await promptHidden('Confirm new password (input hidden): ');
    if (password !== confirmation) throw new SafeResetError('The passwords do not match. No account was changed.');

    if (!process.env.MONGO_URI) throw new SafeResetError('Backend database configuration is missing.');
    try {
      await mongoose.connect(process.env.MONGO_URI);
      connected = true;
    } catch {
      throw new SafeResetError('Database connection failed. Check the backend environment configuration; details are withheld.');
    }

    const account = await User.findOne({ email }).select('_id email role').lean();
    if (!account) throw new SafeResetError('No account was found for that email. No account was changed.');
    process.stdout.write(`\nSelected account: ${account.email} (${account.role})\n`);
    process.stdout.write('Only this account password hash will be updated; its role and other account data will remain unchanged.\n');
    const confirmationText = await promptLine(`Type UPDATE ${email} to confirm: `);
    if (confirmationText.trim() !== `UPDATE ${email}`) {
      throw new SafeResetError('Confirmation did not match. No account was changed.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await updatePasswordHashOnly(User, account._id, passwordHash);
    if (result.matchedCount !== 1 || result.modifiedCount !== 1) {
      throw new SafeResetError('The account password was not updated. No other account data was changed.');
    }
    process.stdout.write('Password updated successfully. The account role and related records were preserved.\n');
  } catch (error) {
    const message = error instanceof SafeResetError
      ? error.message
      : 'Password reset not completed. Check the selected account and local backend configuration; details are withheld.';
    process.stderr.write(`Password reset not completed: ${message}\n`);
  } finally {
    if (connected) {
      try {
        await mongoose.disconnect();
      } catch {
        process.stderr.write('Database disconnect reported an error; no connection details were displayed.\n');
      }
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
