import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Avatar,
  Chip,
  Button,
  IconButton,
  Tabs,
  Tab,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  useTheme,
  alpha,
  useMediaQuery
} from '@mui/material';
import AndroidIcon from '@mui/icons-material/Android';
import StarIcon from '@mui/icons-material/Star';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ArticleIcon from '@mui/icons-material/Article';
import AppsIcon from '@mui/icons-material/Apps';
import ShareIcon from '@mui/icons-material/Share';
import TranslateIcon from '@mui/icons-material/Translate';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Repository, ReleaseAsset } from '../types';
import { fetchReadme, fetchReleases } from '../services/githubApi';
import { shareProject } from '../services/shareHelper';
import { translateMarkdownToEnglish } from '../services/translateService';

interface RepoDetailSheetProps {
  repo: Repository | null;
  open: boolean;
  onClose: () => void;
  onCopyClone: (cloneUrl: string) => void;
  copiedId: number | null;
  isStarred?: boolean;
  onToggleStar?: (repo: Repository) => void;
  onShareMessage?: (msg: string) => void;
}

export const RepoDetailSheet: React.FC<RepoDetailSheetProps> = ({
  repo,
  open,
  onClose,
  onCopyClone,
  copiedId,
  isStarred = false,
  onToggleStar,
  onShareMessage
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [tabIndex, setTabIndex] = useState<number>(0);
  const [rawReadme, setRawReadme] = useState<string>('');
  const [originalHtml, setOriginalHtml] = useState<string>('');
  const [translatedHtml, setTranslatedHtml] = useState<string>('');
  const [isTranslated, setIsTranslated] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [releases, setReleases] = useState<ReleaseAsset[]>([]);
  const [loadingReadme, setLoadingReadme] = useState<boolean>(false);
  const [loadingReleases, setLoadingReleases] = useState<boolean>(false);

  useEffect(() => {
    if (repo && open) {
      setTabIndex(0);
      setLoadingReadme(true);
      setLoadingReleases(true);
      setRawReadme('');
      setOriginalHtml('');
      setTranslatedHtml('');
      setIsTranslated(false);
      setIsTranslating(false);

      fetchReadme(repo.full_name).then((raw) => {
        setRawReadme(raw);
        try {
          const parsed = marked.parse(raw);
          const sanitized = DOMPurify.sanitize(typeof parsed === 'string' ? parsed : '');
          setOriginalHtml(sanitized);
        } catch {
          setOriginalHtml('<p>Error rendering README.</p>');
        }
        setLoadingReadme(false);
      });

      fetchReleases(repo.full_name).then((assets) => {
        setReleases(assets);
        setLoadingReleases(false);
      });
    }
  }, [repo, open]);

  const handleToggleTranslate = async () => {
    if (isTranslated) {
      setIsTranslated(false);
      return;
    }

    if (translatedHtml) {
      setIsTranslated(true);
      return;
    }

    if (!rawReadme) return;
    setIsTranslating(true);
    try {
      const translatedMd = await translateMarkdownToEnglish(rawReadme);
      const parsed = marked.parse(translatedMd);
      const sanitized = DOMPurify.sanitize(typeof parsed === 'string' ? parsed : '');
      setTranslatedHtml(sanitized);
      setIsTranslated(true);
    } catch (e) {
      console.warn('Translation failed:', e);
    } finally {
      setIsTranslating(false);
    }
  };

  if (!repo) return null;

  const isCopied = copiedId === repo.id;
  const apkAssets = releases.filter(a => a.is_apk || a.name.endsWith('.apk'));

  const handleShareRepo = async () => {
    const result = await shareProject(
      repo.name,
      `${repo.name} — ${repo.description || 'Open-source repository'}`,
      repo.html_url
    );
    if (result === 'copied' && onShareMessage) {
      onShareMessage(`Copied ${repo.name} URL`);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="md"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          m: { xs: 0, sm: 2 },
          height: { xs: '100%', sm: '90vh' },
          maxHeight: '100%',
          bgcolor: theme.palette.mode === 'dark' ? '#0d1117 !important' : '#ffffff !important',
          backgroundColor: theme.palette.mode === 'dark' ? '#0d1117 !important' : '#ffffff !important',
          backgroundImage: 'none !important',
          borderRadius: { xs: 0, sm: '24px' }
        }
      }}
    >
      {/* Dialog Header with Safe Area Inset Padding */}
      <DialogTitle
        sx={{
          p: 2,
          pb: 1.5,
          pt: 'calc(max(env(safe-area-inset-top, 0px), var(--status-bar-height, 42px)) + 8px)',
          borderBottom: `1px solid ${theme.palette.divider}`
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
            <Avatar
              src={repo.owner.avatar_url}
              alt={repo.owner.login}
              sx={{ width: 42, height: 42, borderRadius: '12px', bgcolor: 'background.default', flexShrink: 0 }}
            />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ color: 'text.secondary', display: 'block', fontSize: '0.725rem', fontWeight: 600, lineHeight: 1.2 }}>
                {repo.owner.login}
              </Typography>
              <Typography noWrap sx={{ fontSize: '1.05rem', fontWeight: 800, color: 'text.primary', lineHeight: 1.3 }}>
                {repo.name}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {/* Direct Star Button */}
            <Button
              size="small"
              variant={isStarred ? "contained" : "outlined"}
              onClick={() => onToggleStar && onToggleStar(repo)}
              startIcon={<StarIcon sx={{ fontSize: 14, color: isStarred ? '#000000' : '#e3b341' }} />}
              sx={{
                height: 28,
                fontSize: '0.72rem',
                fontWeight: 800,
                borderRadius: '12px',
                textTransform: 'none',
                bgcolor: isStarred ? '#e3b341' : 'transparent',
                borderColor: '#e3b341',
                color: isStarred ? '#000000' : '#e3b341',
                '&:hover': {
                  bgcolor: isStarred ? '#d4a130' : alpha('#e3b341', 0.1)
                }
              }}
            >
              {isStarred ? "Starred" : "Star"}
            </Button>

            {/* Direct Share on Other Apps */}
            <Tooltip title="Share on other apps">
              <IconButton size="small" onClick={handleShareRepo} sx={{ color: 'text.secondary', p: 0.5 }}>
                <ShareIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* Close */}
            <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary', p: 0.5 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Repository Description */}
        {repo.description && (
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              mt: 1,
              mb: 1,
              fontSize: '0.8rem',
              lineHeight: 1.45
            }}
          >
            {repo.description}
          </Typography>
        )}

        {/* Stats Chips */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1, alignItems: 'center' }}>
          <Chip
            icon={<StarIcon sx={{ fontSize: 13, color: '#f59e0b' }} />}
            label={`${(repo.stargazers_count + (isStarred ? 1 : 0)).toLocaleString()} stars`}
            size="small"
            sx={{ fontWeight: 700, fontSize: '0.72rem', height: 22 }}
          />
          <Chip
            icon={<CallSplitIcon sx={{ fontSize: 13 }} />}
            label={`${repo.forks_count.toLocaleString()} forks`}
            size="small"
            sx={{ fontSize: '0.72rem', height: 22 }}
          />
          {repo.language && (
            <Chip
              label={repo.language}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 700, fontSize: '0.72rem', height: 22 }}
            />
          )}
          {apkAssets.length > 0 && (
            <Chip
              icon={<AndroidIcon sx={{ fontSize: 13 }} />}
              label={`${apkAssets.length} APK Release${apkAssets.length > 1 ? 's' : ''}`}
              size="small"
              color="primary"
              sx={{ fontWeight: 800, fontSize: '0.72rem', height: 22 }}
            />
          )}
        </Box>
      </DialogTitle>

      {/* Tabs */}
      <Tabs
        value={tabIndex}
        onChange={(_, val) => setTabIndex(val)}
        sx={{
          px: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          minHeight: 42,
          bgcolor: alpha(theme.palette.background.default, 0.4),
          '& .MuiTab-root': { minHeight: 42, fontSize: '0.8rem', fontWeight: 700, textTransform: 'none' }
        }}
      >
        <Tab icon={<ArticleIcon sx={{ fontSize: 17 }} />} iconPosition="start" label="README.md" />
        <Tab
          icon={<AppsIcon sx={{ fontSize: 17 }} />}
          iconPosition="start"
          label={`Releases & APKs (${releases.length})`}
        />
      </Tabs>

      {/* Tab Contents */}
      <DialogContent sx={{ p: { xs: 2, sm: 2.5 }, overflowY: 'auto' }}>
        {tabIndex === 0 && (
          <Box>
            {/* Translation Action Header */}
            {!loadingReadme && rawReadme && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 1.5,
                  pb: 1,
                  borderBottom: `1px dashed ${theme.palette.divider}`
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  {isTranslated ? 'Translated into English' : 'Original repository documentation'}
                </Typography>
                <Button
                  size="small"
                  variant={isTranslated ? 'contained' : 'outlined'}
                  color={isTranslated ? 'primary' : 'inherit'}
                  startIcon={
                    isTranslating ? (
                      <CircularProgress size={13} color="inherit" />
                    ) : (
                      <TranslateIcon sx={{ fontSize: 15 }} />
                    )
                  }
                  onClick={handleToggleTranslate}
                  disabled={isTranslating}
                  sx={{
                    borderRadius: '16px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'none',
                    py: 0.25,
                    px: 1.25,
                    height: 26,
                    lineHeight: 1
                  }}
                >
                  {isTranslated ? 'Show Original' : 'Translate to English'}
                </Button>
              </Box>
            )}

            {loadingReadme ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={32} color="primary" />
              </Box>
            ) : (
              <Box
                dangerouslySetInnerHTML={{ __html: isTranslated ? (translatedHtml || originalHtml) : originalHtml }}
                sx={{
                  color: 'text.primary',
                  lineHeight: 1.6,
                  fontSize: '0.875rem',
                  '& h1, & h2, & h3, & h4': {
                    color: 'text.primary',
                    fontWeight: 800,
                    mt: 2,
                    mb: 1,
                    lineHeight: 1.3
                  },
                  '& h1': { fontSize: '1.25rem', borderBottom: `1px solid ${theme.palette.divider}`, pb: 0.5 },
                  '& h2': { fontSize: '1.1rem', borderBottom: `1px solid ${theme.palette.divider}`, pb: 0.5 },
                  '& h3': { fontSize: '1rem' },
                  '& p': { mb: 1.5, color: 'text.secondary', lineHeight: 1.6 },
                  '& a': { color: theme.palette.primary.main, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } },
                  '& ul, & ol': { pl: 3, mb: 1.5, color: 'text.secondary' },
                  '& li': { mb: 0.5 },
                  '& pre': {
                    bgcolor: theme.palette.mode === 'dark' ? '#161b22' : '#f6f8fa',
                    p: 1.5,
                    borderRadius: '8px',
                    overflowX: 'auto',
                    border: `1px solid ${theme.palette.divider}`,
                    fontSize: '0.8rem',
                    fontFamily: 'JetBrains Mono, monospace'
                  },
                  '& code': {
                    bgcolor: theme.palette.mode === 'dark' ? '#161b22' : '#f6f8fa',
                    px: 0.5,
                    py: 0.2,
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontFamily: 'JetBrains Mono, monospace'
                  },
                  '& img': { maxWidth: '100%', height: 'auto', borderRadius: '8px' },
                  '& blockquote': {
                    borderLeft: `3px solid ${theme.palette.primary.main}`,
                    pl: 2,
                    color: 'text.secondary',
                    my: 1.5
                  },
                  '& table': {
                    width: '100%',
                    borderCollapse: 'collapse',
                    my: 1.5,
                    '& th, & td': {
                      border: `1px solid ${theme.palette.divider}`,
                      p: 1,
                      textAlign: 'left'
                    },
                    '& th': { bgcolor: alpha(theme.palette.primary.main, 0.08) }
                  }
                }}
              />
            )}
          </Box>
        )}

        {tabIndex === 1 && (
          <Box>
            {loadingReleases ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={32} color="primary" />
              </Box>
            ) : releases.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                <Typography variant="body2">No release assets published on GitHub.</Typography>
              </Box>
            ) : (
              <List disablePadding>
                {releases.map((asset) => {
                  const isApk = asset.is_apk || asset.name.endsWith('.apk');
                  const sizeMb = (asset.size / (1024 * 1024)).toFixed(1);
                  return (
                    <ListItem
                      key={asset.id}
                      sx={{
                        px: 1.5,
                        py: 1.25,
                        mb: 1,
                        borderRadius: '12px',
                        bgcolor: alpha(theme.palette.background.default, 0.5),
                        border: `1px solid ${theme.palette.divider}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
                        <ListItemIcon sx={{ minWidth: 32, color: isApk ? theme.palette.primary.main : 'text.secondary' }}>
                          {isApk ? <AndroidIcon fontSize="small" /> : <ArticleIcon fontSize="small" />}
                        </ListItemIcon>
                        <ListItemText
                          primary={asset.name}
                          secondary={`${sizeMb} MB • ${asset.download_count.toLocaleString()} downloads`}
                          primaryTypographyProps={{
                            fontSize: '0.825rem',
                            fontWeight: isApk ? 800 : 600,
                            noWrap: true,
                            color: isApk ? 'text.primary' : 'text.secondary'
                          }}
                          secondaryTypographyProps={{ fontSize: '0.72rem' }}
                        />
                      </Box>
                      <Button
                        size="small"
                        variant={isApk ? 'contained' : 'outlined'}
                        color="primary"
                        startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
                        href={asset.browser_download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          height: 28,
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          borderRadius: '8px',
                          textTransform: 'none',
                          ml: 1,
                          flexShrink: 0
                        }}
                      >
                        {isApk ? 'Download APK' : 'Download'}
                      </Button>
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Box>
        )}
      </DialogContent>

      {/* Dialog Footer Actions */}
      <DialogActions
        sx={{
          p: 2,
          pb: 'calc(max(env(safe-area-inset-bottom, 0px), var(--nav-bar-height, 16px)) + 10px)',
          borderTop: `1px solid ${theme.palette.divider}`,
          gap: 1
        }}
      >
        <Button
          fullWidth
          variant="outlined"
          size="small"
          startIcon={isCopied ? <CheckIcon sx={{ fontSize: 15 }} /> : <ContentCopyIcon sx={{ fontSize: 15 }} />}
          onClick={() => onCopyClone(repo.clone_url)}
          sx={{
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'none',
            color: 'text.primary',
            borderColor: theme.palette.divider,
            py: 0.75
          }}
        >
          {isCopied ? 'Copied clone!' : 'Copy git clone'}
        </Button>
        <Button
          fullWidth
          variant="contained"
          size="small"
          endIcon={<OpenInNewIcon sx={{ fontSize: 15 }} />}
          href={repo.html_url}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: 800,
            textTransform: 'none',
            py: 0.75
          }}
        >
          View on GitHub
        </Button>
      </DialogActions>
    </Dialog>
  );
};
