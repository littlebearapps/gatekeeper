import { GoogleAuth } from 'google-auth-library';

import { AuthenticationError } from '../core/errors.js';

const DEFAULT_SCOPES = ['https://www.googleapis.com/auth/chromewebstore'];

function normalizeScopes(scopes) {
  if (!scopes) {
    return DEFAULT_SCOPES;
  }

  if (Array.isArray(scopes)) {
    return scopes.length > 0 ? scopes : DEFAULT_SCOPES;
  }

  return [scopes];
}

function decodeJwtPayload(segment) {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const paddingLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(paddingLength);
  const decoded = Buffer.from(padded, 'base64').toString('utf8');
  return JSON.parse(decoded);
}

export class AuthHelper {
  static async getGoogleAccessToken(wifConfig, scopes = DEFAULT_SCOPES) {
    if (!wifConfig || typeof wifConfig !== 'object') {
      throw new AuthenticationError('Workload Identity Federation configuration is required');
    }

    try {
      const auth = new GoogleAuth({ credentials: wifConfig, scopes: normalizeScopes(scopes) });
      const token = await auth.getAccessToken();
      const accessToken = typeof token === 'string' ? token : token?.token;

      if (!accessToken) {
        throw new AuthenticationError('Google access token response was empty');
      }

      return accessToken;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }

      const message = error?.message ?? 'Failed to retrieve Google access token';
      throw new AuthenticationError(message, { cause: error });
    }
  }

  static validateToken(token) {
    if (typeof token !== 'string') {
      return { valid: false, reason: 'Token must be a string.' };
    }

    const trimmed = token.trim();
    if (trimmed.length === 0) {
      return { valid: false, reason: 'Token must not be empty.' };
    }

    const parts = trimmed.split('.');
    if (parts.length === 3) {
      try {
        const payload = decodeJwtPayload(parts[1]);
        if (typeof payload.exp === 'number') {
          const expiresAt = new Date(payload.exp * 1000);
          if (Number.isNaN(expiresAt.getTime())) {
            return { valid: false, reason: 'Token expiration claim is invalid.' };
          }

          if (Date.now() >= expiresAt.getTime()) {
            return { valid: false, reason: 'Token has expired.', expiresAt };
          }

          return { valid: true, expiresAt };
        }

        return { valid: true };
      } catch (error) {
        return { valid: false, reason: 'Token payload could not be decoded.', cause: error };
      }
    }

    if (!/^[A-Za-z0-9._-]+$/.test(trimmed)) {
      return { valid: false, reason: 'Token contains invalid characters.' };
    }

    if (trimmed.length < 20) {
      return { valid: false, reason: 'Token is too short to be valid.' };
    }

    return { valid: true };
  }
}
