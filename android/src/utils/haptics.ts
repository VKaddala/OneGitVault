/**
 * Centralized Haptic Feedback Utility
 * Supports toggling in user settings and schedules native system vibration asynchronously
 * so Chromium Android WebView IPC never delays visual selection state updates on the current tap frame.
 */

let hapticsEnabled = (() => {
  try {
    const val = localStorage.getItem('ogv_haptics_enabled');
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
})();

export function isHapticsEnabled(): boolean {
  return hapticsEnabled;
}

export function setHapticsEnabled(enabled: boolean): void {
  hapticsEnabled = enabled;
  try {
    localStorage.setItem('ogv_haptics_enabled', String(enabled));
  } catch {}
}

export function triggerHaptic(type: 'light' | 'medium' | 'selection' | number = 'light'): void {
  if (!hapticsEnabled) return;
  setTimeout(() => {
    try {
      (window as any).AndroidThemeBridge?.performHaptic?.(type === 'medium' ? 1 : 0);
    } catch {}
    try {
      navigator.vibrate?.(typeof type === 'number' ? type : 8);
    } catch {}
  }, 0);
}


