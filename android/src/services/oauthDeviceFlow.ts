/**
 * GitHub OAuth Device Flow Service for OneGitVault Android.
 * Uses native AndroidHttp bridge (requestGitHubDevicePost) to avoid CORS blocks
 * on github.com/login/device/* from WebView, then persists token directly in Android Keystore.
 */

const OAUTH_CLIENT_ID_STORAGE_KEY = 'ogv_oauth_client_id';
const ENV_CLIENT_ID = ((import.meta as any).env?.VITE_GITHUB_OAUTH_CLIENT_ID as string | undefined) || '';

export interface DeviceCodeSession {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

function encryptOAuthClientId(clientId: string): string {
  if (!clientId) return '';
  try {
    const encoded = encodeURIComponent(clientId);
    let cipher = '';
    const mask = 0x3c;
    for (let i = 0; i < encoded.length; i++) {
      cipher += String.fromCharCode(encoded.charCodeAt(i) ^ mask);
    }
    return 'enc:' + btoa(cipher);
  } catch {
    return 'enc:' + btoa(clientId);
  }
}

function decryptOAuthClientId(stored: string): string {
  if (!stored) return '';
  if (!stored.startsWith('enc:')) return stored; // Backward compatibility
  try {
    const raw = atob(stored.slice(4));
    let plain = '';
    const mask = 0x3c;
    for (let i = 0; i < raw.length; i++) {
      plain += String.fromCharCode(raw.charCodeAt(i) ^ mask);
    }
    return decodeURIComponent(plain);
  } catch {
    try {
      return atob(stored.slice(4));
    } catch {
      return '';
    }
  }
}

export function getConfiguredOAuthClientId(): string {
  if (ENV_CLIENT_ID.trim()) return ENV_CLIENT_ID.trim();
  try {
    const raw = (localStorage.getItem(OAUTH_CLIENT_ID_STORAGE_KEY) || '').trim();
    return decryptOAuthClientId(raw).trim();
  } catch {
    return '';
  }
}

export function saveOAuthClientId(clientId: string): void {
  try {
    const trimmed = clientId.trim();
    if (trimmed) {
      localStorage.setItem(OAUTH_CLIENT_ID_STORAGE_KEY, encryptOAuthClientId(trimmed));
    } else {
      localStorage.removeItem(OAUTH_CLIENT_ID_STORAGE_KEY);
    }
  } catch {}
}

async function postGitHubOAuth(endpointPath: '/login/device/code' | '/login/oauth/access_token', params: URLSearchParams): Promise<any> {
  const formBody = params.toString();
  const bridge = (window as any)?.AndroidThemeBridge;

  if (bridge && typeof bridge.requestGitHubDevicePost === 'function') {
    const raw = bridge.requestGitHubDevicePost(endpointPath, formBody);
    return JSON.parse(raw || '{}');
  }

  // Fallback for local proxy/Electron environments
  const res = await fetch(`https://github.com${endpointPath}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody,
  });
  return res.json();
}

export async function startGitHubDeviceFlow(clientId: string): Promise<DeviceCodeSession> {
  const cleanId = clientId.trim();
  if (!cleanId) {
    throw new Error('GitHub OAuth App Client ID is required to start Device Flow.');
  }
  saveOAuthClientId(cleanId);

  const data = await postGitHubOAuth(
    '/login/device/code',
    new URLSearchParams({
      client_id: cleanId,
      scope: 'public_repo gist',
    })
  );

  if (data.error || !data.device_code || !data.user_code) {
    throw new Error(data.error_description || data.error || 'Could not initiate GitHub Device Flow.');
  }

  return {
    device_code: data.device_code,
    user_code: data.user_code,
    verification_uri: data.verification_uri || 'https://github.com/login/device',
    expires_in: Number(data.expires_in) || 900,
    interval: Number(data.interval) || 5,
  };
}

export interface DevicePollResult {
  status: 'authorized' | 'pending' | 'slow_down' | 'expired' | 'denied' | 'error';
  accessToken?: string;
  nextIntervalSec?: number;
  message?: string;
}

export async function pollGitHubDeviceToken(
  clientId: string,
  deviceCode: string,
  currentIntervalSec: number
): Promise<DevicePollResult> {
  try {
    const data = await postGitHubOAuth(
      '/login/oauth/access_token',
      new URLSearchParams({
        client_id: clientId.trim(),
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      })
    );

    if (data.access_token) {
      return { status: 'authorized', accessToken: String(data.access_token) };
    }
    if (data.error === 'authorization_pending') {
      return { status: 'pending', nextIntervalSec: currentIntervalSec };
    }
    if (data.error === 'slow_down') {
      return {
        status: 'slow_down',
        nextIntervalSec: Number(data.interval) || currentIntervalSec + 5,
      };
    }
    if (data.error === 'expired_token') {
      return { status: 'expired', message: 'Code expired. Start a new login code.' };
    }
    if (data.error === 'access_denied') {
      return { status: 'denied', message: 'Authorization was cancelled on GitHub.' };
    }
    return { status: 'error', message: data.error_description || data.error || 'Authorization error.' };
  } catch (err: any) {
    return { status: 'error', message: err?.message || 'Network error polling GitHub.' };
  }
}
