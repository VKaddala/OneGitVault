import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
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
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckIcon from '@mui/icons-material/Check';
import ShareIcon from '@mui/icons-material/Share';
import { Repository } from '../types';
import { shareProject } from '../services/shareHelper';

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
}

export const RepoCard: React.FC<RepoCardProps> = ({
  repo,
  isBookmarked,
  onToggleBookmark,
  onOpenDetail,
  onCopyClone,
  copiedId,
  isCompact = false,
  isStarred = false,
  onToggleStar,
  onShareMessage
}) => {
  const theme = useTheme();
  const isCopied = copiedId === repo.id;

  const formatCount = (count: number) => {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'k';
    return count.toString();
  };

  const hasApk = repo.has_apks || (repo.topics && (repo.topics.includes('apk') || repo.topics.includes('android-app') || repo.topics.includes('android')));
  const primaryApkAsset = repo.latest_release?.assets?.find(a => a.is_apk || a.name.endsWith('.apk'));

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await shareProject(
      repo.name,
      `${repo.name} — ${repo.description || 'Open source project on GitHub'}`,
      repo.html_url
    );
    if (result === 'copied' && onShareMessage) {
      onShareMessage(`Copied ${repo.name} link`);
    }
  };

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleStar) {
      onToggleStar(repo);
    }
  };

  const handleOpenExternal = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(repo.html_url, '_blank');
  };

  const handleCopyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopyClone(repo.clone_url);
  };

  return (
    <Card
      onClick={() => onOpenDetail(repo)}
      sx={{
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'background.paper',
        borderRadius: isCompact ? '12px' : '16px',
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: theme.palette.mode === 'dark' ? '0 3px 14px rgba(0, 0, 0, 0.55)' : '0 1px 8px rgba(0, 0, 0, 0.04)',
        transition: 'transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
        '&:active': {
          transform: 'scale(0.99)'
        }
      }}
    >
      <CardContent sx={{ p: isCompact ? 1.25 : 1.75, pb: `${isCompact ? 1.25 : 1.75}px !important` }}>
        {/* Header Row: Left Avatar & Titles | Right: APK Badge, Share, Copy, Open, Bookmark */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: isCompact ? 0.5 : 0.85 }}>
          {/* Left: Avatar & Repo Details */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: isCompact ? 1 : 1.25, minWidth: 0, flex: 1 }}>
            <Avatar
              src={repo.owner.avatar_url}
              alt={repo.owner.login}
              sx={{
                width: isCompact ? 28 : 34,
                height: isCompact ? 28 : 34,
                borderRadius: isCompact ? '7px' : '9px',
                bgcolor: 'background.default',
                flexShrink: 0
              }}
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
                {repo.owner.login}
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
                  window.open(primaryApkAsset.browser_download_url, '_blank');
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

            {/* Native Share Button */}
            <Tooltip title="Share on other apps">
              <IconButton
                size="small"
                onClick={handleShare}
                sx={{ color: 'text.secondary', p: isCompact ? 0.3 : 0.4 }}
              >
                <ShareIcon sx={{ fontSize: isCompact ? 14 : 16 }} />
              </IconButton>
            </Tooltip>

            {/* Copy Git Clone Button */}
            <Tooltip title={isCopied ? "Copied clone URL!" : "Copy git clone"}>
              <IconButton
                size="small"
                onClick={handleCopyClick}
                sx={{ color: isCopied ? theme.palette.primary.main : 'text.secondary', p: isCompact ? 0.3 : 0.4 }}
              >
                {isCopied ? <CheckIcon sx={{ fontSize: isCompact ? 14 : 16 }} /> : <ContentCopyIcon sx={{ fontSize: isCompact ? 14 : 16 }} />}
              </IconButton>
            </Tooltip>

            {/* Open on GitHub External Link */}
            <Tooltip title="View on GitHub">
              <IconButton
                size="small"
                onClick={handleOpenExternal}
                sx={{ color: 'text.secondary', p: isCompact ? 0.3 : 0.4 }}
              >
                <OpenInNewIcon sx={{ fontSize: isCompact ? 14 : 16 }} />
              </IconButton>
            </Tooltip>

            {/* Bookmark Icon */}
            <Tooltip title={isBookmarked ? "Remove from Vault" : "Save to Vault"}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleBookmark(repo);
                }}
                sx={{
                  color: isBookmarked ? theme.palette.primary.main : 'text.secondary',
                  p: isCompact ? 0.3 : 0.4
                }}
              >
                {isBookmarked ? (
                  <BookmarkIcon sx={{ fontSize: isCompact ? 16 : 18 }} />
                ) : (
                  <BookmarkBorderIcon sx={{ fontSize: isCompact ? 16 : 18 }} />
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

        {/* Topic Tags */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: isCompact ? 0.6 : 0.9 }}>
          {repo.topics &&
            repo.topics.slice(0, isCompact ? 2 : 3).map((topic) => (
              <Chip
                key={topic}
                label={`#${topic}`}
                size="small"
                sx={{
                  height: isCompact ? 18 : 20,
                  fontSize: isCompact ? '0.62rem' : '0.67rem',
                  bgcolor: alpha(theme.palette.text.primary, 0.05),
                  color: 'text.secondary',
                  borderRadius: '5px'
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

          {repo.license && (
            <Typography variant="caption" sx={{ fontSize: isCompact ? '0.68rem' : '0.72rem', color: 'text.secondary', ml: 'auto', fontWeight: 600 }}>
              {repo.license.spdx_id || repo.license.key}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
