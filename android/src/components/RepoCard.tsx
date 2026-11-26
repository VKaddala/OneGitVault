import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Button,
  Tooltip,
  useTheme,
  alpha
} from '@mui/material';
import AndroidIcon from '@mui/icons-material/Android';
import StarIcon from '@mui/icons-material/Star';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import NoteAltOutlinedIcon from '@mui/icons-material/NoteAltOutlined';
import AlarmOnIcon from '@mui/icons-material/AlarmOn';
import { Repository } from '../types';
import { downloadApkFile } from '../services/downloadHelper';
import { OwnerAvatar } from './OwnerAvatar';
import { triggerHaptic } from '../utils/haptics';
import { getRepoAnnotation } from '../services/vaultAnnotationStore';

interface RepoCardProps {
  repo: Repository;
  isBookmarked: boolean;
  onToggleBookmark: (repo: Repository) => void;
  onOpenDetail: (repo: Repository) => void;
  onCopyClone: (cloneUrl: string) => void;
  copiedId: number | null;
  isCompact?: boolean;
  isStarred?: boolean;
  onToggleStar?: (repo: Repository) => void;
  onShareMessage?: (msg: string) => void;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (repoId: number) => void;
  updateBadge?: string;
}

export const RepoCard = React.memo<RepoCardProps>(({
  repo,
  isBookmarked,
  onToggleBookmark,
  onOpenDetail,
  onCopyClone: _onCopyClone,
  copiedId: _copiedId,
  isCompact = false,
  isStarred = false,
  onToggleStar,
  onShareMessage: _onShareMessage,
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
  updateBadge,
}) => {
  const theme = useTheme();

  const formatCount = (count: number) => {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'k';
    return count.toString();
  };

  const ownerLogin = repo.owner?.login || repo.full_name?.split('/')[0] || 'unknown';
  const hasApk = repo.has_apks || (Array.isArray(repo.topics) && (repo.topics.includes('apk') || repo.topics.includes('android-app') || repo.topics.includes('android')));
  const primaryApkAsset = repo.latest_release?.assets?.find(a => a.is_apk || a.name.endsWith('.apk'));
  const annotation = getRepoAnnotation(repo.id);

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleStar) {
      onToggleStar(repo);
    }
  };

  // ── High-Density List View Layout ──
  if (isCompact) {
    return (
      <Card
        onClick={() => {
          if (isSelectMode && onToggleSelect) {
            onToggleSelect(repo.id);
          } else {
            onOpenDetail(repo);
          }
        }}
        sx={{
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          bgcolor: isSelected
            ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.09)
            : 'background.paper',
          borderRadius: '16px',
          border: isSelected
            ? `2px solid ${theme.palette.primary.main}`
            : (theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.09)' : '1px solid rgba(0, 0, 0, 0.06)'),
          boxShadow: isSelected
            ? `0 0 16px ${alpha(theme.palette.primary.main, 0.45)}`
            : (theme.palette.mode === 'dark' ? '0 2px 10px rgba(0, 0, 0, 0.25)' : '0 1px 4px rgba(0, 0, 0, 0.03)'),
          transition: 'transform 0.12s ease, border-color 0.15s ease',
          '&:active': {
            transform: 'scale(0.985)',
            filter: theme.palette.mode === 'dark' ? 'brightness(1.08)' : 'brightness(0.97)'
          }
        }}
      >
        {isSelectMode && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'background.paper',
              borderRadius: '50%',
              p: 0.2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
            }}
          >
            {isSelected ? (
              <CheckCircleIcon sx={{ color: 'primary.main', fontSize: 20 }} />
            ) : (
              <RadioButtonUncheckedIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
            )}
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', p: 1.25, gap: 1.25 }}>
          {/* Avatar */}
          <OwnerAvatar
            owner={repo.owner}
            size={38}
            borderRadius="10px"
            border={`1px solid ${theme.palette.divider}`}
          />

          {/* Central Info Column */}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            {/* Row 1: Repo Title & Owner */}
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, minWidth: 0 }}>
              <Typography
                noWrap
                sx={{
                  color: 'text.primary',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  lineHeight: 1.2,
                  letterSpacing: '-0.01em'
                }}
              >
                {repo.name}
              </Typography>
              <Typography
                noWrap
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  flexShrink: 0
                }}
              >
                by {ownerLogin}
              </Typography>
            </Box>

            {/* Row 2: Description preview (1-line truncated) */}
            <Typography
              noWrap
              sx={{
                color: 'text.secondary',
                fontSize: '0.73rem',
                lineHeight: 1.35,
                my: '1px'
              }}
            >
              {repo.description || 'No description provided.'}
            </Typography>

            {/* Row 3: Meta pills (Stars, Forks, Language) */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                color: 'text.secondary',
                fontSize: '0.68rem',
                flexWrap: 'nowrap',
                overflow: 'hidden',
                minWidth: 0
              }}
            >
              <Box
                onClick={handleStarClick}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.35,
                  cursor: 'pointer',
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  color: isStarred ? '#e3b341' : 'inherit'
                }}
              >
                <StarIcon sx={{ fontSize: 13, color: '#e3b341' }} />
                <span>{formatCount(repo.stargazers_count + (isStarred ? 1 : 0))}</span>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                <CallSplitIcon sx={{ fontSize: 12 }} />
                <span>{formatCount(repo.forks_count)}</span>
              </Box>

              {repo.language && (
                <Typography
                  noWrap
                  sx={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: 'secondary.main',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  • {repo.language}
                </Typography>
              )}
              {annotation?.notes && (
                <Tooltip title={`Note: ${annotation.notes}`}>
                  <NoteAltOutlinedIcon sx={{ fontSize: 13, color: '#f59e0b', flexShrink: 0 }} />
                </Tooltip>
              )}
              {annotation?.reminder && (
                <Tooltip title={`Reminder: ${annotation.reminder.label}`}>
                  <AlarmOnIcon sx={{ fontSize: 13, color: '#06b6d4', flexShrink: 0 }} />
                </Tooltip>
              )}
              {updateBadge && (
                <Chip
                  size="small"
                  label={`↑ ${updateBadge}`}
                  color="success"
                  sx={{
                    height: 17,
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    borderRadius: '6px',
                    maxWidth: 112,
                    minWidth: 0,
                    '& .MuiChip-label': {
                      px: 0.75,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }
                  }}
                />
              )}
            </Box>
          </Box>

          {/* Right Action Stack: APK Button & Bookmark Button */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
            {primaryApkAsset ? (
              <Button
                size="small"
                variant="contained"
                color="primary"
                startIcon={<DownloadIcon sx={{ fontSize: 11 }} />}
                onClick={(e) => {
                  e.stopPropagation();
                  downloadApkFile(primaryApkAsset.browser_download_url, primaryApkAsset.name, primaryApkAsset.size);
                }}
                sx={{
                  height: 24,
                  fontSize: '0.64rem',
                  fontWeight: 800,
                  borderRadius: '8px',
                  px: 0.9,
                  textTransform: 'none',
                  lineHeight: 1
                }}
              >
                APK
              </Button>
            ) : hasApk ? (
              <Chip
                icon={<AndroidIcon sx={{ fontSize: 11 }} />}
                label="APK"
                size="small"
                sx={{
                  height: 22,
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  bgcolor: alpha(theme.palette.primary.main, 0.15),
                  color: theme.palette.primary.main,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                }}
              />
            ) : null}

            <Tooltip title={isBookmarked ? "Remove from Vault" : "Save to Vault"}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleBookmark(repo);
                  triggerHaptic(10);
                }}
                sx={{
                  color: isBookmarked ? theme.palette.primary.main : 'text.secondary',
                  bgcolor: isBookmarked
                    ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.12)
                    : alpha(theme.palette.text.primary, 0.04),
                  borderRadius: '50%',
                  p: 0.55,
                  '&:active': { transform: 'scale(0.88)' }
                }}
              >
                {isBookmarked ? (
                  <BookmarkIcon sx={{ fontSize: 18 }} />
                ) : (
                  <BookmarkBorderIcon sx={{ fontSize: 18 }} />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Card>
    );
  }

  // ── Full-Size Detailed Card View Layout ──
  return (
    <Card
      onClick={() => {
        if (isSelectMode && onToggleSelect) {
          onToggleSelect(repo.id);
        } else {
          onOpenDetail(repo);
        }
      }}
      sx={{
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: isSelected
          ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.09)
          : 'background.paper',
        borderRadius: isCompact ? '16px' : '20px',
        border: isSelected
          ? `2px solid ${theme.palette.primary.main}`
          : (theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.07)'),
        boxShadow: isSelected
          ? `0 0 16px ${alpha(theme.palette.primary.main, 0.45)}`
          : (theme.palette.mode === 'dark' ? '0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.07)' : '0 2px 12px rgba(0, 0, 0, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.6)'),
        transition: 'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease',
        '&:active': {
          transform: 'scale(0.985)',
          filter: theme.palette.mode === 'dark' ? 'brightness(1.08)' : 'brightness(0.97)'
        }
      }}
    >
      {isSelectMode && (
        <Box
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.paper',
            borderRadius: '50%',
            p: 0.2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
          }}
        >
          {isSelected ? (
            <CheckCircleIcon sx={{ color: 'primary.main', fontSize: 22 }} />
          ) : (
            <RadioButtonUncheckedIcon sx={{ color: 'text.disabled', fontSize: 22 }} />
          )}
        </Box>
      )}
      <CardContent sx={{ p: isCompact ? 1.25 : 1.75, pb: `${isCompact ? 1.25 : 1.75}px !important` }}>
        {/* Header Row: Left Avatar & Titles | Right: APK Badge, Share, Copy, Open, Bookmark */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: isCompact ? 0.5 : 0.85 }}>
          {/* Left: Avatar & Repo Details */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: isCompact ? 1 : 1.25, minWidth: 0, flex: 1 }}>
            <OwnerAvatar
              owner={repo.owner}
              size={isCompact ? 28 : 34}
              borderRadius={isCompact ? '7px' : '9px'}
            />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                noWrap
                sx={{
                  color: 'text.secondary',
                  display: 'block',
                  fontSize: isCompact ? '0.64rem' : '0.68rem',
                  fontWeight: 600,
                  lineHeight: 1.15,
                  mb: '1px'
                }}
              >
                {ownerLogin}
              </Typography>
              <Typography
                noWrap
                sx={{
                  color: 'text.primary',
                  display: 'block',
                  fontSize: isCompact ? '0.86rem' : '0.94rem',
                  fontWeight: 800,
                  lineHeight: 1.2,
                  letterSpacing: '-0.01em'
                }}
              >
                {repo.name}
              </Typography>
            </Box>
          </Box>

          {/* Right Header: Actions Group (APK/Download pill, Share, Copy, External, Bookmark) */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
            {primaryApkAsset ? (
              <Button
                size="small"
                variant="contained"
                color="primary"
                startIcon={<DownloadIcon sx={{ fontSize: isCompact ? 11 : 12 }} />}
                onClick={(e) => {
                  e.stopPropagation();
                  downloadApkFile(primaryApkAsset.browser_download_url, primaryApkAsset.name, primaryApkAsset.size);
                }}
                sx={{
                  height: isCompact ? 20 : 22,
                  fontSize: isCompact ? '0.6rem' : '0.65rem',
                  fontWeight: 800,
                  borderRadius: '8px',
                  px: 0.9,
                  textTransform: 'none',
                  lineHeight: 1,
                  mr: 0.2
                }}
              >
                APK ({(primaryApkAsset.size / (1024 * 1024)).toFixed(0)}M)
              </Button>
            ) : hasApk ? (
              <Chip
                icon={<AndroidIcon sx={{ fontSize: isCompact ? 11 : 12 }} />}
                label="APK"
                size="small"
                sx={{
                  height: isCompact ? 20 : 22,
                  fontSize: isCompact ? '0.6rem' : '0.65rem',
                  fontWeight: 800,
                  bgcolor: alpha(theme.palette.primary.main, 0.15),
                  color: theme.palette.primary.main,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                  mr: 0.2
                }}
              />
            ) : null}

            {/* Sleek Native Material 3 Bookmark Action */}
            <Tooltip title={isBookmarked ? "Remove from Vault" : "Save to Vault"}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleBookmark(repo);
                  triggerHaptic(10);
                }}
                sx={{
                  color: isBookmarked ? theme.palette.primary.main : 'text.secondary',
                  bgcolor: isBookmarked
                    ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.12)
                    : alpha(theme.palette.text.primary, 0.04),
                  borderRadius: '50%',
                  p: isCompact ? 0.5 : 0.65,
                  transition: 'all 0.15s cubic-bezier(0.2, 0, 0, 1)',
                  '&:active': { transform: 'scale(0.88)' }
                }}
              >
                {isBookmarked ? (
                  <BookmarkIcon sx={{ fontSize: isCompact ? 17 : 19 }} />
                ) : (
                  <BookmarkBorderIcon sx={{ fontSize: isCompact ? 17 : 19 }} />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Description */}
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            mb: isCompact ? 0.6 : 0.9,
            display: '-webkit-box',
            WebkitLineClamp: isCompact ? 1 : 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            fontSize: isCompact ? '0.73rem' : '0.8rem',
            lineHeight: 1.4,
            minHeight: isCompact ? 'auto' : '2.3em'
          }}
        >
          {repo.description || 'No description provided.'}
        </Typography>

        {/* Personal Note Snippet (Living Dashboard) */}
        {annotation?.notes && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.6,
              mb: isCompact ? 0.6 : 0.8,
              p: 0.6,
              px: 0.9,
              borderRadius: '8px',
              bgcolor: alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.12 : 0.08),
              borderLeft: `3px solid ${theme.palette.warning.main}`
            }}
          >
            <NoteAltOutlinedIcon sx={{ fontSize: 13, color: theme.palette.warning.main, flexShrink: 0 }} />
            <Typography
              noWrap
              sx={{
                fontSize: '0.7rem',
                color: 'text.primary',
                fontWeight: 600,
                fontStyle: 'italic'
              }}
            >
              "{annotation.notes}"
            </Typography>
          </Box>
        )}

        {/* Topic & Custom Workflow Tags */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: isCompact ? 0.6 : 0.9 }}>
          {annotation?.tags &&
            annotation.tags.map((tag) => (
              <Chip
                key={tag}
                label={`#${tag}`}
                size="small"
                sx={{
                  height: isCompact ? 18 : 20,
                  fontSize: isCompact ? '0.62rem' : '0.67rem',
                  fontWeight: 700,
                  bgcolor: alpha(theme.palette.primary.main, 0.18),
                  color: theme.palette.primary.main,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.4)}`,
                  borderRadius: '6px'
                }}
              />
            ))}
          {annotation?.reminder && (
            <Chip
              icon={<AlarmOnIcon sx={{ fontSize: '11px !important' }} />}
              label={annotation.reminder.label}
              size="small"
              sx={{
                height: isCompact ? 18 : 20,
                fontSize: isCompact ? '0.62rem' : '0.67rem',
                fontWeight: 700,
                bgcolor: alpha('#06b6d4', 0.15),
                color: '#06b6d4',
                border: `1px solid ${alpha('#06b6d4', 0.35)}`,
                borderRadius: '6px'
              }}
            />
          )}
          {repo.topics &&
            repo.topics.slice(0, isCompact ? 2 : 3).map((topic) => (
              <Chip
                key={topic}
                label={`#${topic}`}
                size="small"
                sx={{
                  height: isCompact ? 18 : 20,
                  fontSize: isCompact ? '0.62rem' : '0.67rem',
                  fontWeight: 600,
                  bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.11 : 0.08),
                  color: 'var(--tag-text)',
                  border: `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.16)}`,
                  borderRadius: '6px'
                }}
              />
            ))}
          {repo.language && (
            <Chip
              label={repo.language}
              size="small"
              sx={{
                height: isCompact ? 18 : 20,
                fontSize: isCompact ? '0.62rem' : '0.67rem',
                bgcolor: alpha(theme.palette.secondary.main, 0.12),
                color: theme.palette.secondary.main,
                borderRadius: '5px',
                fontWeight: 700
              }}
            />
          )}
        </Box>

        {/* Stats Row with Star Button & Fork count */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: isCompact ? 1.5 : 2, color: 'text.secondary', fontSize: isCompact ? '0.7rem' : '0.74rem' }}>
          {/* Interactive Star Pill (Stars on GitHub directly with PAT) */}
          <Box
            onClick={handleStarClick}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.35,
              cursor: 'pointer',
              py: '1px',
              px: '5px',
              borderRadius: '6px',
              bgcolor: isStarred ? alpha('#e3b341', 0.18) : 'transparent',
              border: `1px solid ${isStarred ? '#e3b341' : 'transparent'}`,
              transition: 'all 0.15s ease',
              '&:hover': { bgcolor: alpha('#e3b341', 0.22) }
            }}
          >
            <StarIcon sx={{ fontSize: isCompact ? 13 : 15, color: '#e3b341' }} />
            <Typography variant="caption" sx={{ fontWeight: 800, fontSize: isCompact ? '0.7rem' : '0.74rem', color: isStarred ? '#e3b341' : 'inherit' }}>
              {formatCount(repo.stargazers_count + (isStarred ? 1 : 0))}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35 }}>
            <CallSplitIcon sx={{ fontSize: isCompact ? 12 : 14 }} />
            <Typography variant="caption" sx={{ fontSize: isCompact ? '0.7rem' : '0.74rem', fontWeight: 600 }}>
              {formatCount(repo.forks_count)}
            </Typography>
          </Box>

          {updateBadge && (
            <Chip
              size="small"
              label={`↑ ${updateBadge}`}
              color="success"
              sx={{ height: 18, fontSize: '0.64rem', fontWeight: 800, borderRadius: '6px' }}
            />
          )}

          {repo.license && (
            <Typography variant="caption" sx={{ fontSize: isCompact ? '0.68rem' : '0.72rem', color: 'text.secondary', ml: 'auto', fontWeight: 600 }}>
              {repo.license.spdx_id || repo.license.key}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
});
