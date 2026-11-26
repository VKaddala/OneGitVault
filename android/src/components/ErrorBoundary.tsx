import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

/**
 * Top-level failsafe boundary preventing any unhandled render exception
 * from leaving the WebView on a blank black screen.
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Unexpected rendering error.',
    };
  }

  componentDidCatch(error: Error): void {
    console.error('OneGitVault UI Boundary caught error:', error);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearTempAndReload = () => {
    try {
      const prefixes = [
        'ogv_repo_cache_',
        'ogv_trending_',
        'ogv_gql_repo_',
        'ogv_rel_',
        'ogv_readme_',
        'ogv_cached_starred_repos_',
        'ogv_cached_watched_repos_',
        'ogv_user_repos_',
        'ogv_vault_release_radar_',
      ];
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && prefixes.some((p) => k.startsWith(p))) {
          localStorage.removeItem(k);
        }
      }
      localStorage.removeItem('onegitvault_cached_user_profile');
    } catch {}
    window.location.reload();
  };

  private handleResetAuthAndTheme = () => {
    try {
      const bridge = (window as any)?.AndroidThemeBridge;
      if (bridge && typeof bridge.saveSecureToken === 'function') {
        bridge.saveSecureToken('');
      }
      localStorage.removeItem('onegitvault_github_pat');
      localStorage.removeItem('onegitvault_android_token');
      localStorage.removeItem('onegitvault_cached_user_profile');
      localStorage.removeItem('onegitvault_active_theme_plugin');
      localStorage.removeItem('onegitvault_theme_user_explicit');
    } catch {}
    this.handleClearTempAndReload();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#0d1117',
          color: '#f0f6fc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            maxWidth: '380px',
            width: '100%',
            padding: '22px',
            borderRadius: '18px',
            backgroundColor: '#161b22',
            border: '1px solid rgba(255,255,255,0.14)',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '8px' }}>
            OneGitVault Recovery Mode
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#8b949e', lineHeight: 1.5, marginBottom: '12px' }}>
            The app hit a recoverable display error ({this.state.message}). Your bookmarks remain safe.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={this.handleReload}
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: '#2f81f7',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Reload App
            </button>
            <button
              onClick={this.handleClearTempAndReload}
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.18)',
                backgroundColor: 'transparent',
                color: '#f0f6fc',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Clear Cache & Reload
            </button>
            <button
              onClick={this.handleResetAuthAndTheme}
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid rgba(248,81,73,0.45)',
                backgroundColor: 'transparent',
                color: '#ff7b72',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Sign Out & Reset Theme
            </button>
          </div>
        </div>
      </div>
    );
  }
}
