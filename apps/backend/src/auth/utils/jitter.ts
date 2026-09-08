const MIN_DELAY_MS = 50;
const MAX_DELAY_MS = 150;

/**
 * Randomised delay applied before every failed-login response.
 *
 * bcrypt makes a wrong-password check ~80ms while a missing email returns
 * almost instantly, which leaks whether an address is registered. The jitter
 * does not remove that signal on its own — averaging over many samples recovers
 * it — but the login route is capped at 5 attempts per minute, so an attacker
 * cannot collect enough samples for the average to converge.
 */
export function jitter(): Promise<void> {
  const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);

  return new Promise((resolve) => setTimeout(resolve, delay));
}
