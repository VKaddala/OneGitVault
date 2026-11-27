import React, { useState, useMemo } from 'react';
import { Box, useTheme, alpha } from '@mui/material';

interface OwnerAvatarProps {
  owner?: {
    login?: string;
    avatar_url?: string;
  } | null;
  size?: number;
  borderRadius?: string | number;
  border?: string;
  boxShadow?: string;
}

/**
 * Optimizes GitHub avatar URLs to compact thumbnails and preserves URLs across formats.
 */
function buildAvatarCandidates(
  rawUrl: string | undefined,
  login: string | undefined,
  targetSize: number
): string[] {
  const candidates: string[] = [];
  const trimmed = (rawUrl || '').trim();

  if (trimmed) {
    let isGitHubAvatarHost = false;
    try {
      const parsedHost = new URL(trimmed).hostname.toLowerCase();
      isGitHubAvatarHost =
        parsedHost === 'avatars.githubusercontent.com' ||
        parsedHost.endsWith('.githubusercontent.com');
    } catch {
      isGitHubAvatarHost = false;
    }

    if (isGitHubAvatarHost) {
      const sep = trimmed.includes('?') ? '&' : '?';
      const sized = /[?&](s|size)=/i.test(trimmed) ? trimmed : `${trimmed}${sep}s=${targetSize}`;
      candidates.push(sized);
      if (sized !== trimmed) candidates.push(trimmed);
    } else {
      candidates.push(trimmed);
    }
  }

  if (login && login.trim()) {
    const cleanLogin = encodeURIComponent(login.trim());
    const fallbackUrl = `https://github.com/${cleanLogin}.png?size=${targetSize}`;
    if (!candidates.includes(fallbackUrl)) {
      candidates.push(fallbackUrl);
    }
  }

  return candidates;
}

export const OwnerAvatar: React.FC<OwnerAvatarProps> = React.memo(({
  owner,
  size = 38,
  borderRadius = '10px',
  border,
  boxShadow,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const login = owner?.login || '';
  const initial = (login[0] || '?').toUpperCase();
  const requestPx = Math.max(80, Math.round(size * 2));
  const rawAvatarUrl = owner?.avatar_url;

  const candidates = useMemo(
    () => buildAvatarCandidates(rawAvatarUrl, login, requestPx),
    [rawAvatarUrl, login, requestPx]
  );
  const candidateKey = candidates.join('|');

  const [fallbackState, setFallbackState] = useState<{ key: string; idx: number }>({
    key: candidateKey,
    idx: 0,
  });
  const candidateIdx = fallbackState.key === candidateKey ? fallbackState.idx : 0;
  const activeSrc = candidateIdx < candidates.length ? candidates[candidateIdx] : null;

  return (
    <Box
      aria-label={login || 'Repository owner'}
      sx={{
        width: size,
        height: size,
        borderRadius,
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: alpha(theme.palette.primary.main, isDark ? 0.16 : 0.1),
        color: theme.palette.primary.main,
        fontWeight: 800,
        fontSize: `${Math.max(11, Math.round(size * 0.42))}px`,
        border: border ?? `1px solid ${theme.palette.divider}`,
        boxShadow,
        userSelect: 'none',
      }}
    >
      {/* Clean visible monogram beneath image while loading or offline */}
      <span>{initial}</span>

      {activeSrc && (
        <Box
          key={activeSrc}
          component="img"
          src={activeSrc}
          alt={login}
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          decoding="async"
          loading="lazy"
          onLoad={(e: React.SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.style.opacity = '1';
          }}
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.style.opacity = '0';
            setFallbackState({ key: candidateKey, idx: candidateIdx + 1 });
          }}
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0,
            transition: 'opacity 0.12s ease',
            pointerEvents: 'none',
          }}
        />
      )}
    </Box>
  );
});
