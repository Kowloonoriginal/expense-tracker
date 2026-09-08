import { ThrottlerGetTrackerFunction } from '@nestjs/throttler';

/**
 * Rate-limit key for the login route: IP **and** the email being attempted.
 *
 * Keying on IP alone breaks in both directions — a single NAT'd office locks
 * itself out, while a distributed attack on one account stays under the limit.
 */
export const loginTracker: ThrottlerGetTrackerFunction = (req) => {
  const email = String(req.body?.email ?? '')
    .toLowerCase()
    .trim();

  return `${req.ip}:${email}`;
};
