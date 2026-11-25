/**
 * Native APK and Asset Download Helper for OneGitVault Android.
 * Prompts the user for download confirmation via 'ogv_request_apk_download',
 * then hands off to Android system DownloadManager to follow GitHub redirects,
 * display notification progress, and save into Downloads/.
 */

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

/**
 * Hands off the confirmed APK download directly to Android system DownloadManager (or web fallback).
 */
export function executeApkDownload(url: string, filename?: string): void {
  if (!url) return;
  const win = window as any;
  if (win.AndroidThemeBridge && typeof win.AndroidThemeBridge.downloadApk === 'function') {
    win.AndroidThemeBridge.downloadApk(url, filename || '');
  } else {
    // Standard web browser fallback
    const a = document.createElement('a');
    a.href = url;
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
  if (!url) return;
  const cleanName = filename || url.split('/').pop()?.split('?')[0] || 'app-release.apk';

  if (typeof window !== 'undefined' && hasConfirmationListener) {
    window.dispatchEvent(
      new CustomEvent<ApkDownloadRequest>(DOWNLOAD_REQUEST_EVENT, {
        detail: { url, filename: cleanName, sizeBytes },
      })
    );
  } else {
    executeApkDownload(url, cleanName);
  }
}
