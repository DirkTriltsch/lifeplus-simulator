import type { Env } from '../env';
import { randomId, randomToken, sha256Hex } from './crypto';
import { daysFromNow, nowMs } from './time';
import type { DeviceRow, SessionRow, UserRow } from './db';

export interface SessionContext {
  session: SessionRow;
  user: UserRow;
  device: DeviceRow;
}

export type SessionKind = 'normal' | 'device_limit_reached';

export async function loadSessionFromToken(
  env: Env,
  sessionToken: string,
): Promise<SessionContext | null> {
  const hash = await sha256Hex(sessionToken);
  const row = await env.DB.prepare(
    `SELECT s.*, u.email AS u_email, u.email_lower AS u_email_lower,
            u.created_at AS u_created_at, u.deleted_at AS u_deleted_at,
            d.device_token_hash AS d_device_token_hash, d.label AS d_label,
            d.user_agent AS d_user_agent, d.first_seen_at AS d_first_seen_at,
            d.last_seen_at AS d_last_seen_at, d.revoked_at AS d_revoked_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     JOIN devices d ON d.id = s.device_id
     WHERE s.session_token_hash = ?
       AND s.revoked_at IS NULL
       AND s.expires_at > ?
       AND u.deleted_at IS NULL
       AND d.revoked_at IS NULL
     LIMIT 1`,
  )
    .bind(hash, nowMs())
    .first<Record<string, unknown>>();

  if (!row) return null;

  const session: SessionRow = {
    id: String(row.id),
    user_id: String(row.user_id),
    device_id: String(row.device_id),
    session_token_hash: String(row.session_token_hash),
    kind: String(row.kind),
    expires_at: Number(row.expires_at),
    last_seen_at: Number(row.last_seen_at),
    revoked_at: row.revoked_at === null ? null : Number(row.revoked_at),
  };

  const user: UserRow = {
    id: session.user_id,
    email: String(row.u_email),
    email_lower: String(row.u_email_lower),
    created_at: Number(row.u_created_at),
    deleted_at: row.u_deleted_at === null ? null : Number(row.u_deleted_at),
  };

  const device: DeviceRow = {
    id: session.device_id,
    user_id: session.user_id,
    device_token_hash: String(row.d_device_token_hash),
    label: row.d_label === null ? null : String(row.d_label),
    user_agent: row.d_user_agent === null ? null : String(row.d_user_agent),
    first_seen_at: Number(row.d_first_seen_at),
    last_seen_at: Number(row.d_last_seen_at),
    revoked_at: row.d_revoked_at === null ? null : Number(row.d_revoked_at),
  };

  await env.DB.prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?')
    .bind(nowMs(), session.id)
    .run();

  return { session, user, device };
}

export interface CreateSessionInput {
  userId: string;
  userAgent: string | null;
  kind?: SessionKind;
}

export interface CreateSessionResult {
  sessionToken: string;
  sessionId: string;
  deviceId: string;
  expiresAt: number;
  kind: SessionKind;
}

export async function createSessionForNewDevice(
  env: Env,
  input: CreateSessionInput,
): Promise<CreateSessionResult> {
  const now = nowMs();
  const ttlDays = Number(env.SESSION_TTL_DAYS || '30');
  const expiresAt = daysFromNow(ttlDays);
  const kind: SessionKind = input.kind ?? 'normal';

  const deviceToken = randomToken(32);
  const deviceTokenHash = await sha256Hex(deviceToken);
  const deviceId = randomId();

  await env.DB.prepare(
    `INSERT INTO devices (id, user_id, device_token_hash, label, user_agent, first_seen_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      deviceId,
      input.userId,
      deviceTokenHash,
      shortLabelFromUA(input.userAgent),
      input.userAgent,
      now,
      now,
    )
    .run();

  const sessionToken = randomToken(32);
  const sessionTokenHash = await sha256Hex(sessionToken);
  const sessionId = randomId();

  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, device_id, session_token_hash, kind, expires_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(sessionId, input.userId, deviceId, sessionTokenHash, kind, expiresAt, now)
    .run();

  return { sessionToken, sessionId, deviceId, expiresAt, kind };
}

export async function revokeSession(env: Env, sessionId: string): Promise<void> {
  await env.DB.prepare('UPDATE sessions SET revoked_at = ? WHERE id = ?')
    .bind(nowMs(), sessionId)
    .run();
}

export async function revokeDevice(env: Env, deviceId: string): Promise<void> {
  const now = nowMs();
  await env.DB.batch([
    env.DB.prepare('UPDATE devices SET revoked_at = ? WHERE id = ?').bind(now, deviceId),
    env.DB.prepare('UPDATE sessions SET revoked_at = ? WHERE device_id = ? AND revoked_at IS NULL')
      .bind(now, deviceId),
  ]);
}

function shortLabelFromUA(ua: string | null): string | null {
  if (!ua) return null;
  let os: string | null = null;
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iOS/i.test(ua)) os = 'iOS';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser: string | null = null;
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua)) browser = 'Safari';

  if (!os && !browser) return null;
  return [os, browser].filter(Boolean).join(' ');
}
