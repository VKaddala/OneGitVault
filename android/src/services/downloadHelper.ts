/**
 * Native APK and Asset Download Helper for OneGitVault Android.
 * Enforces HTTPS validation before prompting via 'ogv_request_apk_download',
 * then hands off to Android system DownloadManager to follow GitHub redirects,
 * display notification progress, and save into Downloads/.
 */

import { isSafeHttpUrl } from '../utils/sanitizeMarkdown';

export interface ApkDownloadRequest {
  url: string;
  filename: string;
  sizeBytes?: number;
}

const DOWNLOAD_REQUEST_EVENT = 'ogv_request_apk_download';
let hasConfirmationListener = false;

export function setDownloadConfirmationListenerActive(active: boolean): void {
  hasConfirmationListener = active;
}

function sanitizeSafeApkName(rawName: string | undefined, url: string): string {
  const fromUrl = url.split('/').pop()?.split('?')[0] || 'app-release.apk';
  const base = (rawName || fromUrl).split(/[/\\]/).pop() || 'app-release.apk';
  return base.replace(/\.\./g, '').replace(/[^A-Za-z0-9._-]/g, '_') || 'app-release.apk';
}

/**
 * Hands off the confirmed APK download directly to Android system DownloadManager (or web fallback).
 */
export function executeApkDownload(url: string, filename?: string): void {
  if (!isSafeHttpUrl(url, true)) return;
  const safeName = sanitizeSafeApkName(filename, url);
  const win = window as any;
  if (win.AndroidThemeBridge && typeof win.AndroidThemeBridge.downloadApk === 'function') {
    win.AndroidThemeBridge.downloadApk(url.trim(), safeName);
  } else {
    const a = document.createElement('a');
    a.href = url.trim();
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

/**
 * Requests user confirmation before delegating an APK download to Android DownloadManager.
 */
export function downloadApkFile(url: string, filename?: string, sizeBytes?: number): void {
  if (!isSafeHttpUrl(url, true)) return;
  const cleanName = sanitizeSafeApkName(filename, url);

  if (typeof window !== 'undefined' && hasConfirmationListener) {
    window.dispatchEvent(
      new CustomEvent<ApkDownloadRequest>(DOWNLOAD_REQUEST_EVENT, {
        detail: { url: url.trim(), filename: cleanName, sizeBytes },
      })
    );
  } else {
    executeApkDownload(url, cleanName);
  }
}
