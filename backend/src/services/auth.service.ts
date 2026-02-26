import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { query } from '../config/database.js';
import { AppError, ConflictError, NotFoundError } from '../middleware/error-handler.js';
import type { User, Organization } from '../types/index.js';

const SALT_ROUNDS = 12;

export async function register(
  name: string,
  email: string,
  password: string,
  orgName?: string
): Promise<{ user: Omit<User, 'password_hash'>; org: Organization }> {
  // Check if user already exists
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw new ConflictError('User with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const slug = (orgName || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // Create org
  const orgResult = await query<Organization>(
    `INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING *`,
    [orgName || `${name}'s Org`, `${slug}-${crypto.randomBytes(3).toString('hex')}`]
  );
  const org = orgResult.rows[0];

  // Create user as admin
  const userResult = await query<User>(
    `INSERT INTO users (org_id, email, password_hash, name, role)
     VALUES ($1, $2, $3, $4, 'admin')
     RETURNING id, org_id, email, name, role, avatar_url, email_verified, created_at, updated_at`,
    [org.id, email, passwordHash, name]
  );

  return { user: userResult.rows[0], org };
}

export async function login(
  email: string,
  password: string
): Promise<Omit<User, 'password_hash'>> {
  const result = await query<User>(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  const user = result.rows[0];

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new AppError('Invalid email or password', 401);
  }

  // Update last login
  await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

  const { password_hash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function getUserById(
  id: string
): Promise<Omit<User, 'password_hash'> | null> {
  const result = await query<User>(
    `SELECT id, org_id, email, name, role, avatar_url, email_verified, last_login_at, created_at, updated_at
     FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function generateResetToken(email: string): Promise<string> {
  const result = await query<User>('SELECT id FROM users WHERE email = $1', [email]);
  if (result.rows.length === 0) {
    throw new NotFoundError('User');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await query(
    'UPDATE users SET reset_token = $1, reset_token_exp = $2 WHERE email = $3',
    [token, expires, email]
  );

  return token;
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const result = await query<User>(
    'SELECT id FROM users WHERE reset_token = $1 AND reset_token_exp > NOW()',
    [token]
  );
  if (result.rows.length === 0) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await query(
    'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_exp = NULL WHERE id = $2',
    [passwordHash, result.rows[0].id]
  );
}

export async function createInvite(
  orgId: string,
  email: string
): Promise<string> {
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw new ConflictError('User with this email already exists');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const placeholderHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), SALT_ROUNDS);

  await query(
    `INSERT INTO users (org_id, email, password_hash, role, invite_token)
     VALUES ($1, $2, $3, 'recruiter', $4)`,
    [orgId, email, placeholderHash, token]
  );

  return token;
}

export async function acceptInvite(
  token: string,
  name: string,
  password: string
): Promise<Omit<User, 'password_hash'>> {
  const result = await query<User>(
    'SELECT * FROM users WHERE invite_token = $1',
    [token]
  );
  if (result.rows.length === 0) {
    throw new AppError('Invalid invite token', 400);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const updated = await query<User>(
    `UPDATE users SET password_hash = $1, name = $2, invite_token = NULL
     WHERE invite_token = $3
     RETURNING id, org_id, email, name, role, avatar_url, email_verified, created_at, updated_at`,
    [passwordHash, name, token]
  );

  return updated.rows[0];
}
