import { env } from './env.config';

/**
 * Returns the externally reachable HTTPS origin used by Twilio webhooks and
 * Media Streams. Quick-tunnel host headers can be rewritten to localhost, so
 * they must never be used as the primary source for these URLs.
 */
export function getPublicBaseUrl(): string {
  const configuredUrl = env.NGROK_URL.trim().replace(/\/+$/, '');

  if (!configuredUrl) {
    throw new Error('NGROK_URL must be set to the active public HTTPS tunnel URL for Twilio.');
  }

  let url: URL;
  try {
    url = new URL(configuredUrl);
  } catch {
    throw new Error('NGROK_URL must be a valid public HTTPS URL.');
  }

  if (url.protocol !== 'https:' || !url.hostname || url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    throw new Error('NGROK_URL must be a public HTTPS URL, not a local address.');
  }

  return url.origin + url.pathname.replace(/\/$/, '');
}
