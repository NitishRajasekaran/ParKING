import crypto from 'crypto';

// Generate a cryptographically random opaque token.
// 32 bytes → 64 character hex string.
// No user information is embedded — the token is looked up server-side.
const generateQrToken = () => crypto.randomBytes(32).toString('hex');

export default generateQrToken;
