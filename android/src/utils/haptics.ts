/**
 * Triggers native system haptic feedback asynchronously so Chromium Android WebView IPC
 * never delays visual selection state updates on the current tap frame.
 */
export function triggerHaptic(type: 'light' | 'medium' | 'selection' | number = 'light'): void {
  setTimeout(() => {
    try {
      (window as any).AndroidThemeBridge?.performHaptic?.(type === 'medium' ? 1 : 0);
    } catch {}
    try {
      navigator.vibrate?.(typeof type === 'number' ? type : 8);
    } catch {}
  }, 0);
}

