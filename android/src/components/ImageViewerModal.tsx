import React, { useState, useEffect, useRef } from 'react';
import { Dialog, Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { triggerHaptic } from '../utils/haptics';

export interface ImageViewerModalProps {
  open: boolean;
  imageUrl: string | null;
  title?: string;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  open,
  imageUrl,
  title = 'Image Preview',
  onClose,
}) => {
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartDistRef = useRef<number>(0);
  const initialScaleRef = useRef<number>(1);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isPinchingRef = useRef<boolean>(false);
  const isEdgeSwipeRef = useRef<boolean>(false);
  const lastImgTapRef = useRef<number>(0);
  const closedViaPopStateRef = useRef<boolean>(false);

  useEffect(() => {
    if (!open) return;

    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    closedViaPopStateRef.current = false;

    // Register with App-level Android back handler
    (window as any).__onActiveZoomClose = () => {
      onClose();
      return true;
    };

    // Push dummy history state so hardware back or gesture back closes zoom dialog
    const hasHistory = window.history.state?.ogv_zoom === true;
    if (!hasHistory) {
      try {
        window.history.pushState({ ogv_zoom: true }, '');
      } catch {}
    }

    const handlePopState = () => {
      closedViaPopStateRef.current = true;
      onClose();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      (window as any).__onActiveZoomClose = null;
      window.removeEventListener('popstate', handlePopState);
      if (!closedViaPopStateRef.current && window.history.state?.ogv_zoom === true) {
        try {
          window.history.back();
        } catch {}
      }
    };
  }, [open, onClose]);

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
        const newScale = Math.min(Math.max(initialScaleRef.current * factor, 1), 4.5);
        setZoomScale(newScale);
        if (newScale <= 1.02) {
          setPanOffset({ x: 0, y: 0 });
        }
      }
    } else if (e.touches.length === 1 && touchStartPosRef.current) {
      const deltaX = e.touches[0].clientX - touchStartPosRef.current.x;
      const deltaY = e.touches[0].clientY - touchStartPosRef.current.y;

      if (isEdgeSwipeRef.current && zoomScale <= 1.05 && Math.abs(deltaX) > 40) {
        onClose();
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
    if (zoomScale <= 1.05 && panOffset.y > 80) {
      onClose();
    } else if (zoomScale <= 1.05) {
      setPanOffset({ x: 0, y: 0 });
    }
  };

  const handleImageDoubleTap = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastImgTapRef.current < 320) {
      e.stopPropagation();
      triggerHaptic(8);
      if (zoomScale > 1.2) {
        setZoomScale(1);
        setPanOffset({ x: 0, y: 0 });
      } else {
        setZoomScale(2.5);
      }
    }
    lastImgTapRef.current = now;
  };

  if (!open || !imageUrl) return null;

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          bgcolor: 'rgba(0, 0, 0, 0.96)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 0,
          overflow: 'hidden',
          touchAction: 'none',
        },
      }}
    >
      {/* Header Bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pt: 'max(env(safe-area-inset-top, 0px), 16px)',
          pb: 1,
          px: 2,
          zIndex: 10,
        }}
      >
        <Typography variant="subtitle1" noWrap sx={{ color: '#fff', fontWeight: 800, maxWidth: '75%' }}>
          {title}
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{
            bgcolor: 'rgba(255,255,255,0.15)',
            color: '#fff',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Pinch-to-Zoom Viewport */}
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
        <Box
          component="img"
          src={imageUrl}
          alt={title}
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
            transition:
              isPinchingRef.current || zoomScale > 1.02
                ? 'none'
                : 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
            pointerEvents: 'none',
          }}
        />
      </Box>

      {/* Footer Hint */}
      <Box sx={{ pb: 'max(env(safe-area-inset-bottom, 0px), 16px)', textAlign: 'center', px: 2 }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>
          {zoomScale > 1
            ? `${zoomScale.toFixed(1)}x Zoom • Drag to pan • Double-tap to reset`
            : 'Pinch to zoom • Double-tap 2.5x • Swipe edge/down to close'}
        </Typography>
      </Box>
    </Dialog>
  );
};
