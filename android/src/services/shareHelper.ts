/**
 * Universal Native Share Helper for OneGitVault
 * Invokes native Android Intent via AndroidThemeBridge if available in the app,
 * falls back to navigator.share on modern browsers,
 * or copies link to clipboard if native sharing is unavailable.
 */
export async function shareProject(title: string, text: string, url: string): Promise<'shared' | 'copied'> {
  // 1. Android Native Bridge (triggers native Android system chooser for WhatsApp, Telegram, Twitter, etc.)
  const bridge = (window as any).AndroidThemeBridge;
  if (bridge && typeof bridge.share === 'function') {
    try {
      bridge.share(title, text, url);
      return 'shared';
    } catch (e) {
      console.warn('Native Android share bridge failed, falling back:', e);
    }
  }

  // 2. Web Share API
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title,
        text,
        url
      });
      return 'shared';
    } catch (err: any) {
      // If user dismissed share sheet, do not copy to clipboard
      if (err && err.name === 'AbortError') {
        return 'shared';
      }
      console.warn('Web Share failed, falling back to clipboard:', err);
    }
  }

  // 3. Fallback: Copy to clipboard
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'copied';
  }
}
