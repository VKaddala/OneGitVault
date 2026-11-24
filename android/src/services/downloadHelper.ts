/**
 * Native APK and Asset Download Helper for OneGitVault Android.
 * Calls Android system DownloadManager via bridge to follow GitHub redirects,
 * display notification drawer progress, and download to system Downloads folder.
 */
export function downloadApkFile(url: string, filename?: string): void {
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
