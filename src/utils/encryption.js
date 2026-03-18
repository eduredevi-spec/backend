import crypto from 'crypto';

// Requires ENCRYPTION_KEY env var: 64 hex chars (32 bytes)
const ALGORITHM = 'aes-256-gcm';
const key = () => Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

export const encrypt = (text) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
};

export const decrypt = (data) => {
  const [ivHex, encryptedHex, tagHex] = data.split(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, key(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(encryptedHex, 'hex'), undefined, 'utf8') + decipher.final('utf8');
};
