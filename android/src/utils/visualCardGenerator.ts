import html2canvas from 'html2canvas';
import { Repository } from '../types';
import { ReadmeSummary } from '../services/readmeSummaryParser';

/**
 * Loads an image with crossOrigin = 'anonymous' and a strict timeout.
 * Returns null if the image fails or times out, ensuring generation never hangs.
 */
function loadImageSafe(url: string, timeoutMs: number = 2200): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!url || typeof Image === 'undefined') {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, timeoutMs);

    img.onload = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(img);
      }
    };

    img.onerror = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(null);
      }
    };

    img.src = url;
  });
}

function formatCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count || 0);
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  color: string,
  bg: string,
  hasDot: boolean = false
): number {
  ctx.save();
  ctx.font = '700 20px "Google Sans", -apple-system, BlinkMacSystemFont, sans-serif';
  const textWidth = ctx.measureText(text).width;
  const paddingX = 18;
  const dotWidth = hasDot ? 14 : 0;
  const pillWidth = textWidth + paddingX * 2 + dotWidth;
  const pillHeight = 40;

  ctx.fillStyle = bg;
  drawRoundedRect(ctx, x, y - 28, pillWidth, pillHeight, 20);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, x, y - 28, pillWidth, pillHeight, 20);
  ctx.stroke();

  let textX = x + paddingX;
  if (hasDot) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(textX + 4, y - 8, 4.5, 0, Math.PI * 2);
    ctx.fill();
    textX += dotWidth;
  }

  ctx.fillStyle = color;
  ctx.fillText(text, textX, y - 1);
  ctx.restore();

  return pillWidth;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number = 4
): number {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  let linesDrawn = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      linesDrawn++;
      if (linesDrawn >= maxLines && n < words.length - 1) {
        ctx.fillText(line.trim() + '...', x, currentY);
        return currentY + lineHeight;
      }
      ctx.fillText(line.trim(), x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line.trim().length > 0) {
    ctx.fillText(line.trim(), x, currentY);
    currentY += lineHeight;
  }

  return currentY;
}

/**
 * Captures the actual Spotlight Card DOM element directly via html2canvas
 * or generates a tight, zero-empty-space vector card fallback.
 */
export async function generateVisualCardBlob(
  repo: Repository,
  summary?: ReadmeSummary | null
): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;

  // ── Primary Path: Capture the Actual Rendered Spotlight Card from DOM ──
  const targetCardEl = document.getElementById(`spotlight-card-${repo.id}`);
  if (targetCardEl) {
    try {
      // Capture via onclone: ALL style adjustments (width 480px, height auto, footer display)
      // are applied ONLY to the offscreen cloned element.
      // The live DOM element on the user's screen is NEVER touched,
      // completely eliminating any card shrink/expand layout shift, blink, or flicker!
      const capturedCanvas = await html2canvas(targetCardEl, {
        backgroundColor: null,
        scale: 1.8, // 1.8x retina is razor sharp and 2x faster than 2.4x
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 800,
        onclone: (_clonedDoc, clonedElement) => {
          clonedElement.style.width = '480px';
          clonedElement.style.maxWidth = '480px';
          clonedElement.style.height = 'auto';
          clonedElement.style.maxHeight = 'none';
          clonedElement.style.overflow = 'visible';
          // Full pure OLED black card: completely eliminates any grey border or box
          clonedElement.style.backgroundColor = '#000000';
          clonedElement.style.background = '#000000';
          clonedElement.style.boxShadow = 'none';
          clonedElement.style.border = '1px solid rgba(255, 255, 255, 0.12)';

          const clonedFooter = clonedElement.querySelector<HTMLElement>('#spotlight-card-footer');
          if (clonedFooter) {
            clonedFooter.style.display = 'flex';
          }
        }
      });

      // Frame the captured card on a full pure OLED black canvas (zero grey halo or muddy borders)
      const scale = 1.8;
      const padX = Math.round(36 * scale);
      const padTop = Math.round(54 * scale);
      const padBottom = Math.round(36 * scale);

      const framedCanvas = document.createElement('canvas');
      framedCanvas.width = capturedCanvas.width + padX * 2;
      framedCanvas.height = capturedCanvas.height + padTop + padBottom;
      const fCtx = framedCanvas.getContext('2d');

      if (fCtx) {
        // Pure deep OLED black background
        fCtx.fillStyle = '#000000';
        fCtx.fillRect(0, 0, framedCanvas.width, framedCanvas.height);

        // Header Branding Bar (Above the card)
        fCtx.save();
        const headerY = Math.round(26 * scale);

        // Top Left: ⚡ ONEGITVAULT REPO SPOTLIGHT
        fCtx.font = `800 ${Math.round(13 * scale)}px "Google Sans", -apple-system, BlinkMacSystemFont, sans-serif`;
        fCtx.fillStyle = '#38bdf8';
        fCtx.fillText('⚡ ONEGITVAULT REPO SPOTLIGHT', padX + 4, headerY);

        // Top Right: OPEN-SOURCE HUB
        fCtx.font = `700 ${Math.round(11 * scale)}px -apple-system, BlinkMacSystemFont, sans-serif`;
        fCtx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        fCtx.textAlign = 'right';
        fCtx.fillText('OPEN SOURCE', framedCanvas.width - padX - 4, headerY);
        fCtx.restore();

        // Draw card cleanly in center on pure black canvas
        fCtx.drawImage(capturedCanvas, padX, padTop);

        return new Promise((resolve) => framedCanvas.toBlob(resolve, 'image/png'));
      }

      return new Promise((resolve) => capturedCanvas.toBlob(resolve, 'image/png'));
    } catch (e) {
      console.warn('Direct DOM capture fallback to canvas painter:', e);
    }
  }

  // ── Fallback Dynamic Height Painter (0 empty bottom space) ──
  const width = 1000;
  const contentW = 860;
  const contentX = 70;

  const [avatarImg, heroImg] = await Promise.all([
    repo.owner?.avatar_url ? loadImageSafe(repo.owner.avatar_url, 1800) : Promise.resolve(null),
    summary?.heroMediaUrl ? loadImageSafe(summary.heroMediaUrl, 2000) : Promise.resolve(null)
  ]);

  // Compute exact dynamic height needed
  let estimatedH = 80 + 70 + 70 + 50; // top padding + avatar + title + badges
  if (heroImg) estimatedH += 260 + 30; // banner
  estimatedH += 35 + 100 + 35 + 130 + 70 + 60; // what solves + highlights + footer + bottom padding
  const height = Math.min(1380, Math.max(760, estimatedH));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#060a12');
  bgGrad.addColorStop(0.5, '#0c1322');
  bgGrad.addColorStop(1, '#05080e');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Card Container
  const cardX = 35;
  const cardY = 35;
  const cardW = width - 70;
  const cardH = height - 70;
  const cardRadius = 28;

  ctx.save();
  ctx.fillStyle = '#0f172a';
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
  ctx.fill();

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
  ctx.stroke();

  // Top accent stripe
  const stripeGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY);
  stripeGrad.addColorStop(0, '#38bdf8');
  stripeGrad.addColorStop(0.5, '#818cf8');
  stripeGrad.addColorStop(1, '#c084fc');
  ctx.fillStyle = stripeGrad;
  drawRoundedRect(ctx, cardX + 2, cardY + 2, cardW - 4, 5, 3);
  ctx.fill();
  ctx.restore();

  // Header
  let cursorY = 95;
  const avatarSize = 48;
  const avatarX = contentX;
  const avatarY = cursorY;

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  ctx.closePath();

  if (avatarImg) {
    ctx.save();
    ctx.clip();
    ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();
  } else {
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.font = '800 22px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText((repo.owner?.login || repo.name || 'G')[0].toUpperCase(), avatarX + avatarSize / 2, avatarY + 33);
  }

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Owner handle
  ctx.save();
  const ownerName = repo.owner?.login || repo.full_name?.split('/')[0] || '';
  ctx.font = '700 22px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText(`@${ownerName}`, avatarX + avatarSize + 14, avatarY + 33);
  ctx.restore();

  // Repo Name
  cursorY += 80;
  ctx.save();
  ctx.font = '900 46px "Google Sans", -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(repo.name || repo.full_name || '', contentX, cursorY);
  ctx.restore();

  // Badges
  cursorY += 44;
  let badgeX = contentX;
  if (repo.language) {
    const pillW = drawPill(ctx, badgeX, cursorY, repo.language, '#38bdf8', 'rgba(56, 189, 248, 0.16)', true);
    badgeX += pillW + 12;
  }
  const starW = drawPill(ctx, badgeX, cursorY, `★ ${formatCount(repo.stargazers_count)} stars`, '#fbbf24', 'rgba(251, 191, 36, 0.16)', false);
  badgeX += starW + 12;
  if (repo.forks_count > 0) {
    drawPill(ctx, badgeX, cursorY, `⑂ ${formatCount(repo.forks_count)}`, '#94a3b8', 'rgba(148, 163, 184, 0.14)', false);
  }

  // Hero Image (if present)
  cursorY += 34;
  if (heroImg) {
    const bannerW = contentW;
    const bannerH = 220;
    ctx.save();
    drawRoundedRect(ctx, contentX, cursorY, bannerW, bannerH, 16);
    ctx.clip();
    ctx.drawImage(heroImg, contentX, cursorY, bannerW, bannerH);
    ctx.restore();
    cursorY += bannerH + 34;
  } else {
    cursorY += 20;
  }

  // What It Solves
  ctx.save();
  ctx.font = '800 20px "Google Sans", -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('💡 WHAT IT IS & SOLVES', contentX, cursorY);
  ctx.restore();

  cursorY += 32;
  ctx.save();
  ctx.font = '600 22px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = 'rgba(241, 245, 249, 0.92)';
  const whatText = summary?.headline || repo.description || 'Open-source project curated on OneGitVault.';
  cursorY = wrapText(ctx, whatText, contentX, cursorY, contentW, 32, heroImg ? 2 : 3);
  ctx.restore();

  // Highlights
  cursorY += 26;
  ctx.save();
  ctx.font = '800 20px "Google Sans", -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = '#a855f7';
  ctx.fillText('🚀 KEY HIGHLIGHTS', contentX, cursorY);
  ctx.restore();

  cursorY += 32;
  ctx.save();
  ctx.font = '500 21px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = 'rgba(226, 232, 240, 0.88)';
  const rawHighlights = summary?.highlights && summary.highlights.length > 0
    ? summary.highlights.slice(0, 3)
    : [
        `Top open-source project with ${formatCount(repo.stargazers_count)} stargazers`,
        `Written primarily in ${repo.language || 'modern software tech'}`
      ];

  for (const h of rawHighlights) {
    const cleanHighlight = h.replace(/^[•*\-\s]+/, '').trim();
    ctx.fillText(`✦  ${cleanHighlight}`, contentX, cursorY);
    cursorY += 30;
  }
  ctx.restore();

  // Footer
  const footerY = cardY + cardH - 35;
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(contentX, footerY - 20);
  ctx.lineTo(cardX + cardW - 40, footerY - 20);
  ctx.stroke();

  ctx.font = '700 20px "Google Sans", -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(`github.com/${repo.full_name || repo.name}`, contentX, footerY + 6);

  ctx.font = '600 16px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.textAlign = 'right';
  ctx.fillText('OneGitVault Spotlight', cardX + cardW - 40, footerY + 6);
  ctx.restore();

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

/**
 * Shares or saves the generated visual card.
 */
export async function shareVisualCard(
  repo: Repository,
  summary?: ReadmeSummary | null,
  onNotify?: (msg: string) => void
): Promise<void> {
  try {
    const blob = await generateVisualCardBlob(repo, summary);
    if (!blob) {
      onNotify?.('Could not generate visual card');
      return;
    }

    const filename = `${(repo.name || 'repo').toLowerCase()}-spotlight-card.png`;

    // 1. Android Bridge Base64 Image Share (Native FileProvider)
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if ((window as any).AndroidThemeBridge?.shareImage) {
        try {
          (window as any).AndroidThemeBridge.shareImage(
            base64,
            repo.name || 'Repository Spotlight',
            `Check out ${repo.full_name} (${repo.html_url}) on OneGitVault!`
          );
          onNotify?.('Opening share sheet...');
          return;
        } catch {}
      }

      // 2. Web Share API with Files support
      const file = new File([blob], filename, { type: 'image/png' });
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator
          .share({
            title: repo.name,
            text: `Check out ${repo.full_name} on OneGitVault!`,
            files: [file],
          })
          .catch(() => {});
        return;
      }

      // 3. Fallback: Direct Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      onNotify?.('Spotlight card downloaded!');
    };
    reader.readAsDataURL(blob);
  } catch {
    onNotify?.('Failed to create spotlight card');
  }
}
