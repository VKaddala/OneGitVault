import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  Dialog,
  IconButton,
  Divider,
  useTheme,
  alpha
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import { Repository } from '../types';
import { ReadmeSummary } from '../services/readmeSummaryParser';
import { OwnerAvatar } from './OwnerAvatar';

interface ReelCardProps {
  repo: Repository;
  summary: ReadmeSummary;
  isBookmarked: boolean;
  onToggleBookmark: (repo: Repository) => void;
  isStarred: boolean;
  onToggleStar: (repo: Repository) => void;
  onOpenDetail: (repo: Repository, initialTab?: 'info' | 'readme' | 'releases') => void;
  onShareMessage?: (msg: string) => void;
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3b82f6',
  JavaScript: '#f7df1e',
  Python: '#38bdf8',
  Rust: '#fb923c',
  Go: '#06b6d4',
  Kotlin: '#a855f7',
  Java: '#f59e0b',
  'C++': '#f43f5e',
  C: '#60a5fa',
  Swift: '#f97316',
  Dart: '#14b8a6',
  PHP: '#818cf8',
  Ruby: '#fb7185',
  HTML: '#ef4444',
  CSS: '#c084fc',
  Shell: '#4ade80'
};

export const ReelCard: React.FC<ReelCardProps> = ({
  repo,
  summary,
  onToggleBookmark,
  onOpenDetail
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Double Tap Gesture to Bookmark
  const [doubleTapHeart, setDoubleTapHeart] = useState(false);
  const lastTapRef = useRef<number>(0);
  const doubleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (doubleTapTimerRef.current) clearTimeout(doubleTapTimerRef.current);
    };
  }, []);

  const handleCardClick = (e: React.MouseEvent) => {
    // If click happened on interactive elements (buttons, links, image zoom, chips), let them handle it directly
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, [role="button"], img')) {
      return;
    }

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 280;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected!
      try { navigator.vibrate?.([15, 50, 20]); } catch {}
      setDoubleTapHeart(true);
      if (doubleTapTimerRef.current) clearTimeout(doubleTapTimerRef.current);
      doubleTapTimerRef.current = setTimeout(() => setDoubleTapHeart(false), 900);
      onToggleBookmark(repo);
    }
    // Single tap on card body does nothing - casual touches and scrolling remain uninterrupted
    lastTapRef.current = now;
  };

  // Track failed media images so broken/404 image URLs don't leave an empty box
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  useEffect(() => {
    setHeroImgFailed(false);
  }, [summary.heroMediaUrl]);

  // Fullscreen Pinch-to-Zoom Image State & Universal Edge Swipe
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartDistRef = useRef<number>(0);
  const initialScaleRef = useRef<number>(1);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isPinchingRef = useRef<boolean>(false);
  const isEdgeSwipeRef = useRef<boolean>(false);
  const lastImgTapRef = useRef<number>(0);
  const closedViaPopStateRef = useRef<boolean>(false);

  // Universal Android Back Gesture & Edge Swipe Handler for Zoom
  useEffect(() => {
    if (!zoomOpen) return;

    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    closedViaPopStateRef.current = false;

    // Register with App-level Android back handler
    (window as any).__onActiveZoomClose = () => {
      setZoomOpen(false);
      return true;
    };

    // Push dummy history state so hardware back or gesture back closes zoom dialog
    const hasHistory = window.history.state?.ogv_zoom === true;
    if (!hasHistory) {
      try { window.history.pushState({ ogv_zoom: true }, ''); } catch {}
    }

    const handlePopState = () => {
      closedViaPopStateRef.current = true;
      setZoomOpen(false);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      (window as any).__onActiveZoomClose = null;
      window.removeEventListener('popstate', handlePopState);
      if (!closedViaPopStateRef.current && window.history.state?.ogv_zoom === true) {
        try { window.history.back(); } catch {}
      }
    };
  }, [zoomOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      isPinchingRef.current = true;
      isEdgeSwipeRef.current = false;
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      initialScaleRef.current = zoomScale;
    } else if (e.touches.length === 1) {
      isPinchingRef.current = false;
      const startX = e.touches[0].clientX;
      const startY = e.touches[0].clientY;
      touchStartPosRef.current = { x: startX, y: startY };

      // Detect edge touch for swipe dismiss when not zoomed in
      if (zoomScale <= 1.05 && (startX < 40 || startX > window.innerWidth - 40)) {
        isEdgeSwipeRef.current = true;
      } else {
        isEdgeSwipeRef.current = false;
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && isPinchingRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (touchStartDistRef.current > 0) {
        const factor = dist / touchStartDistRef.current;
        const newScale = Math.min(Math.max(initialScaleRef.current * factor, 1), 4);
        setZoomScale(newScale);
        if (newScale <= 1.02) {
          setPanOffset({ x: 0, y: 0 });
        }
      }
    } else if (e.touches.length === 1 && touchStartPosRef.current) {
      const deltaX = e.touches[0].clientX - touchStartPosRef.current.x;
      const deltaY = e.touches[0].clientY - touchStartPosRef.current.y;

      // Inward horizontal edge swipe detection to dismiss (at 1x zoom)
      if (isEdgeSwipeRef.current && zoomScale <= 1.05 && Math.abs(deltaX) > 40) {
        setZoomOpen(false);
        return;
      }

      if (zoomScale > 1.02) {
        const maxPanX = Math.max(80, Math.round(((zoomScale - 1) * window.innerWidth) / 2 + 60));
        const maxPanY = Math.max(80, Math.round(((zoomScale - 1) * window.innerHeight * 0.45) + 60));
        setPanOffset((prev) => ({
          x: Math.min(maxPanX, Math.max(-maxPanX, prev.x + deltaX)),
          y: Math.min(maxPanY, Math.max(-maxPanY, prev.y + deltaY)),
        }));
        touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (deltaY > 0) {
        // Swipe down dismiss cue
        setPanOffset({ x: 0, y: deltaY });
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      isPinchingRef.current = false;
    }
    if (e.touches.length === 0) {
      touchStartPosRef.current = null;
    }
    // Dismiss if dragged down > 80px at 1x zoom
    if (zoomScale <= 1.05 && panOffset.y > 80) {
      setZoomOpen(false);
    } else if (zoomScale <= 1.05) {
      setPanOffset({ x: 0, y: 0 });
    }
  };

  const handleImageDoubleTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastImgTapRef.current < 300) {
      if (zoomScale > 1.2) {
        setZoomScale(1);
        setPanOffset({ x: 0, y: 0 });
      } else {
        setZoomScale(2.5);
      }
    }
    lastImgTapRef.current = now;
  };

  const langColor = (repo.language && LANGUAGE_COLORS[repo.language]) || theme.palette.primary.main;

  return (
    <Box
      onClick={handleCardClick}
      sx={{
        width: '100%',
        height: '100dvh',
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        bgcolor: 'transparent',
        boxSizing: 'border-box',
        px: { xs: 1.6, sm: 2.2 },
        pt: 'calc(max(env(safe-area-inset-top, 0px), 48px) + 78px)',
        pb: 'calc(max(env(safe-area-inset-bottom, 0px), 4px) + 74px)',
        userSelect: 'none'
      }}
    >
      {/* ── Ambient Background Glow (pure CSS radial gradient, 0 GPU blur passes) ── */}
      <Box
        sx={{
          position: 'absolute',
          top: '12%',
          right: '-10%',
          width: 380,
          height: 380,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(langColor, isDark ? 0.22 : 0.13)} 0%, transparent 65%)`,
          pointerEvents: 'none',
          zIndex: 0
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '12%',
          left: '-10%',
          width: 360,
          height: 360,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, isDark ? 0.18 : 0.10)} 0%, transparent 65%)`,
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      {/* ── Double Tap Animated Heart ── */}
      {doubleTapHeart && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 30,
            pointerEvents: 'none',
            animation: 'heartPop 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
            '@keyframes heartPop': {
              '0%': { transform: 'translate(-50%, -50%) scale(0.3)', opacity: 0 },
              '50%': { transform: 'translate(-50%, -50%) scale(1.3)', opacity: 1 },
              '100%': { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 }
            }
          }}
        >
          <AutoAwesomeIcon
            sx={{
              fontSize: 90,
              color: theme.palette.primary.main,
              filter: 'drop-shadow(0 6px 24px rgba(0,0,0,0.6))'
            }}
          />
        </Box>
      )}

      {/* ── ONE ENTIRE COHESIVE CARD WITH SECTIONS IN MIDDLE ── */}
      <Box
        id={`spotlight-card-${repo.id}`}
        sx={{
          width: '100%',
          maxWidth: 520,
          height: '100%',
          maxHeight: '100%',
          borderRadius: '26px',
          bgcolor: theme.palette.background.paper,
          border: `1.5px solid ${alpha(theme.palette.primary.main, isDark ? 0.34 : 0.24)}`,
          boxShadow: isDark
            ? `0 20px 50px rgba(0,0,0,0.65), 0 0 22px ${alpha(theme.palette.primary.main, 0.14)}, inset 0 1px 1px rgba(255,255,255,0.12)`
            : `0 14px 40px rgba(15,23,42,0.09), 0 0 20px ${alpha(theme.palette.primary.main, 0.09)}, inset 0 1px 1px #fff`,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          '&::-webkit-scrollbar': { display: 'none' },
          position: 'relative',
          zIndex: 1,
          p: { xs: 2.2, sm: 2.8 },
          cursor: 'pointer',
          transition: 'transform 0.14s ease',
          '&:active': { transform: 'scale(0.993)' }
        }}
      >
        {/* Top Accent Stripe: Curves with the 26px card rounded corners */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            background: `linear-gradient(90deg, ${langColor}, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            zIndex: 2
          }}
        />

        {/* ── SECTION 1: Identity Header (Tap to open full details immediately) ── */}
        <Box
          onClick={(e) => {
            e.stopPropagation();
            try { navigator.vibrate?.(12); } catch {}
            onOpenDetail(repo, 'info');
          }}
          sx={{
            mb: 1.8,
            cursor: 'pointer',
            transition: 'transform 0.14s ease, opacity 0.14s ease',
            '&:active': { transform: 'scale(0.985)', opacity: 0.85 }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.8 }}>
            <OwnerAvatar
              owner={repo.owner}
              size={34}
              borderRadius="50%"
              border={`2px solid ${alpha(langColor, 0.5)}`}
              boxShadow="0 4px 12px rgba(0,0,0,0.25)"
            />
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: 'text.secondary',
                fontSize: '0.8rem',
                letterSpacing: 0.2
              }}
            >
              @{repo.owner?.login}
            </Typography>

            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', opacity: 0.65 }}>
              <Typography variant="caption" sx={{ fontSize: '0.68rem', fontWeight: 700, color: 'text.secondary' }}>
                Details ›
              </Typography>
            </Box>
          </Box>

          {/* Repo Name */}
          <Typography
            variant="h4"
            sx={{
              fontWeight: 900,
              fontSize: { xs: '1.6rem', sm: '1.95rem' },
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              color: 'text.primary',
              fontFamily: '"Google Sans", "Inter", sans-serif',
              wordBreak: 'break-word',
              mb: 1.2
            }}
          >
            {repo.name}
          </Typography>

          {/* Clean Badges: Language & Stars ONLY */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.8 }}>
            {repo.language && (
              <Chip
                size="small"
                icon={
                  <Box
                    sx={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      bgcolor: langColor,
                      ml: 0.5
                    }}
                  />
                }
                label={repo.language}
                sx={{
                  height: 24,
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  bgcolor: alpha(langColor, isDark ? 0.2 : 0.12),
                  color: 'text.primary',
                  border: `1px solid ${alpha(langColor, 0.3)}`
                }}
              />
            )}

            <Chip
              size="small"
              icon={<StarIcon sx={{ fontSize: 14, color: '#f59e0b !important' }} />}
              label={`${repo.stargazers_count > 999 ? (repo.stargazers_count / 1000).toFixed(1) + 'k' : repo.stargazers_count} stars`}
              sx={{
                height: 24,
                fontSize: '0.72rem',
                fontWeight: 800,
                bgcolor: alpha('#f59e0b', isDark ? 0.15 : 0.1),
                color: 'text.primary',
                border: `1px solid ${alpha('#f59e0b', 0.25)}`
              }}
            />
          </Box>
        </Box>

        {/* ── SECTION 2: Working Screenshot / Demo Media (Click opens pinch zoom) ── */}
        {summary.heroMediaUrl && !heroImgFailed && (
          <Box
            onClick={(e) => {
              e.stopPropagation();
              setZoomOpen(true);
            }}
            sx={{
              width: '100%',
              maxHeight: { xs: 160, sm: 200 },
              borderRadius: '18px',
              overflow: 'hidden',
              position: 'relative',
              cursor: 'pointer',
              border: `1px solid ${alpha(theme.palette.divider, 0.18)}`,
              bgcolor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.04)',
              boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 1.8,
              transition: 'transform 0.18s ease',
              '&:active': { transform: 'scale(0.98)' }
            }}
          >
            <Box
              component="img"
              src={summary.heroMediaUrl}
              alt={`${repo.name} preview`}
              crossOrigin="anonymous"
              onError={() => {
                setHeroImgFailed(true);
              }}
              sx={{
                width: '100%',
                maxHeight: { xs: 160, sm: 200 },
                objectFit: 'contain'
              }}
            />
          </Box>
        )}

        <Divider sx={{ my: 1.2, borderColor: alpha(theme.palette.divider, 0.1) }} />

        {/* ── SECTION 3: What It Is & Solves (The Elevator Pitch) ── */}
        <Box sx={{ my: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.8, mb: 0.8 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <LightbulbIcon sx={{ fontSize: 17, color: theme.palette.primary.main }} />
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.7rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: 1.1,
                  color: theme.palette.primary.main
                }}
              >
                What It Is & Solves
              </Typography>
            </Box>
            {summary.isTranslated && (
              <Chip
                label="Translated"
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.6rem',
                  fontWeight: 800,
                  bgcolor: alpha(theme.palette.primary.main, 0.14),
                  color: theme.palette.primary.main
                }}
              />
            )}
          </Box>

          <Typography
            variant="body1"
            sx={{
              fontSize: { xs: '0.94rem', sm: '1.02rem' },
              fontWeight: 600,
              lineHeight: 1.55,
              color: 'text.primary',
              fontFamily: '"Google Sans", "Inter", sans-serif'
            }}
          >
            {summary.headline}
          </Typography>
        </Box>

        {/* ── SECTION 4: Key Highlights ── */}
        {summary.highlights && summary.highlights.length > 0 && (
          <>
            <Divider sx={{ my: 1.2, borderColor: alpha(theme.palette.divider, 0.1) }} />

            <Box sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1 }}>
                <RocketLaunchIcon sx={{ fontSize: 16, color: theme.palette.secondary.main }} />
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: 1.1,
                    color: theme.palette.secondary.main
                  }}
                >
                  Key Highlights
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                {summary.highlights.map((highlight, idx) => (
                  <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <AutoAwesomeIcon
                      sx={{
                        fontSize: 14,
                        color: idx % 2 === 0 ? theme.palette.primary.main : theme.palette.secondary.main,
                        mt: '3px',
                        flexShrink: 0
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: { xs: '0.84rem', sm: '0.92rem' },
                        fontWeight: 600,
                        lineHeight: 1.4,
                        color: 'text.primary'
                      }}
                    >
                      {highlight}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </>
        )}

        {/* Card Footer: Subtle Branding (Hidden in Spotlight reels, visible ONLY during card export/share) */}
        <Box
          id="spotlight-card-footer"
          sx={{
            display: 'none',
            mt: 'auto',
            pt: 1.6,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
            gap: 1.5,
            userSelect: 'none'
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: 'primary.main',
              fontWeight: 800,
              fontSize: '0.74rem',
              letterSpacing: 0.2,
              whiteSpace: 'nowrap'
            }}
          >
            github.com/{repo.full_name || repo.name}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              opacity: 0.65,
              fontSize: '0.68rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              textAlign: 'right'
            }}
          >
            OneGitVault Spotlight
          </Typography>
        </Box>
      </Box>

      {/* ── Fullscreen Interactive Pinch-To-Zoom & Universal Edge Swipe Dismiss Dialog ── */}
      <Dialog
        fullScreen
        open={zoomOpen}
        onClose={() => setZoomOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: 'rgba(0, 0, 0, 0.96)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            p: 0,
            overflow: 'hidden',
            touchAction: 'none'
          }
        }}
      >
        {/* Header Bar with Repo Name & Close Button */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pt: 'max(env(safe-area-inset-top, 0px), 16px)',
            pb: 1,
            px: 2,
            zIndex: 10
          }}
        >
          <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 800 }}>
            {repo.name} Preview
          </Typography>
          <IconButton
            onClick={() => setZoomOpen(false)}
            sx={{
              bgcolor: 'rgba(255,255,255,0.15)',
              color: '#fff',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Zoom Image Viewport with Pinch-to-Zoom & Edge/Drag-down Support */}
        <Box
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleImageDoubleTap}
          sx={{
            flex: 1,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            cursor: 'grab',
            userSelect: 'none',
            touchAction: 'none',
          }}
        >
          {summary.heroMediaUrl && (
            <Box
              component="img"
              src={summary.heroMediaUrl}
              alt={`${repo.name} zoomed preview`}
              referrerPolicy="no-referrer"
              sx={{
                maxWidth: '96%',
                maxHeight: '85vh',
                objectFit: 'contain',
                borderRadius: '16px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
                transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${zoomScale})`,
                transformOrigin: 'center center',
                willChange: 'transform',
                transition: isPinchingRef.current || zoomScale > 1.02
                  ? 'none'
                  : 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
                pointerEvents: 'none'
              }}
            />
          )}
        </Box>

        {/* Footer Hint */}
        <Box sx={{ pb: 'max(env(safe-area-inset-bottom, 0px), 16px)', textAlign: 'center', px: 2 }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>
            {zoomScale > 1
              ? `${zoomScale.toFixed(1)}x Zoom • Drag to pan • Double-tap to reset`
              : 'Pinch to zoom • Swipe edge or down to close'}
          </Typography>
        </Box>
      </Dialog>
    </Box>
  );
};
