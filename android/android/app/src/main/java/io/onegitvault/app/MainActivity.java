package io.onegitvault.app;

import android.annotation.TargetApi;
import android.app.DownloadManager;
import android.app.UiModeManager;
import android.app.WallpaperColors;
import android.app.WallpaperManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.content.res.Resources;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.os.Environment;
import android.os.Looper;
import android.os.ParcelFileDescriptor;
import android.os.PowerManager;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import android.graphics.Color;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.util.TypedValue;
import android.view.ContextThemeWrapper;
import android.view.View;
import android.view.Window;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.URLUtil;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {

    private static final String CACHE_PREFS_NAME = "ogv_cache_prefs";
    private static final String SECURE_PREFS_NAME = "ogv_secure_vault_prefs";
    private static final String KEY_ENC_PAT = "enc_pat_v1";
    private static final String KEYSTORE_ALIAS = "ogv_pat_master_v1";
    private static final String KEY_LAST_CACHE_CLEAR_TS = "last_clear_ts";
    private static final long MAX_CACHE_AGE_MS = 30L * 24L * 60L * 60L * 1000L; // 30 days
    private static final long MAX_CACHE_BYTES = 250L * 1024L * 1024L; // 250 MB

    private volatile long activeUpdateDownloadId = -1L;
    private volatile String lastTrustedUrl = "https://localhost";
    private volatile String cachedAppearanceJson = null;
    private volatile String cachedAppearanceFingerprint = null;
    private volatile Boolean desiredDarkSystemBars = null;
    private volatile String pendingTargetTab = null;
    private int lastInjectedStatusBarDp = -1;
    private int lastInjectedNavBarDp = -1;
    private WebViewListener capWebViewListener = null;
    private Consumer<Boolean> blurEnabledListener = null;
    private Object contrastObserverToken = null;
    private BroadcastReceiver powerSaveReceiver = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        setTheme(R.style.AppTheme_NoActionBar);
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        // Enable true Edge-to-Edge: content flows continuously behind status bar and navigation bar
        WindowCompat.setDecorFitsSystemWindows(window, false);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setNavigationBarContrastEnforced(false);
            window.setStatusBarContrastEnforced(false);
        }

        View decorView = window.getDecorView();

        // Dynamically measure physical status bar and navigation bar insets and inject into CSS
        ViewCompat.setOnApplyWindowInsetsListener(decorView, (v, windowInsets) -> {
            Insets insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            float density = getResources().getDisplayMetrics().density;
            int statusBarDp = (int) Math.ceil(insets.top / density);
            int navBarDp = (int) Math.ceil(insets.bottom / density);
            if (statusBarDp < 24) statusBarDp = 42;

            final int sb = statusBarDp;
            final int nb = navBarDp;
            if (sb != lastInjectedStatusBarDp || nb != lastInjectedNavBarDp) {
                lastInjectedStatusBarDp = sb;
                lastInjectedNavBarDp = nb;
                if (bridge != null && bridge.getWebView() != null) {
                    bridge.getWebView().post(() -> {
                        if (bridge != null && bridge.getWebView() != null) {
                            bridge.getWebView().evaluateJavascript(
                                "document.documentElement.style.setProperty('--status-bar-height', '" + sb + "px');" +
                                "document.documentElement.style.setProperty('--nav-bar-height', '" + nb + "px');",
                                null
                            );
                        }
                    });
                }
            }
            return windowInsets;
        });

        // Setup WebView and Native Bridge
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().setBackgroundColor(Color.TRANSPARENT);
            String initialUrl = bridge.getWebView().getUrl();
            if (isTrustedUrlString(initialUrl)) {
                lastTrustedUrl = initialUrl;
            } else if (bridge.getAppUrl() != null && isTrustedUrlString(bridge.getAppUrl())) {
                lastTrustedUrl = bridge.getAppUrl();
            }

            capWebViewListener = new WebViewListener() {
                @Override
                public void onPageStarted(WebView webView) {
                    if (webView != null) {
                        String u = webView.getUrl();
                        if (u != null && !u.isEmpty()) {
                            lastTrustedUrl = u;
                        }
                    }
                }

                @Override
                public void onPageCommitVisible(WebView view, String url) {
                    if (url != null && !url.isEmpty()) {
                        lastTrustedUrl = url;
                    }
                }

                @Override
                public void onPageLoaded(WebView webView) {
                    if (webView != null) {
                        String u = webView.getUrl();
                        if (u != null && !u.isEmpty()) {
                            lastTrustedUrl = u;
                        }
                    }
                }

                @Override
                public boolean onRenderProcessGone(WebView webView, RenderProcessGoneDetail detail) {
                    if (isDestroyed() || isFinishing()) {
                        return false;
                    }
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            try {
                                String target = (bridge != null && bridge.getAppUrl() != null)
                                    ? bridge.getAppUrl()
                                    : "https://localhost/";
                                if (webView != null) {
                                    webView.loadUrl(target);
                                }
                            } catch (Throwable ignored) {}
                        }
                    });
                    return true;
                }
            };
            bridge.addWebViewListener(capWebViewListener);

            // Register system DownloadListener: asks user permission in-app before handing APK links to DownloadManager
            bridge.getWebView().setDownloadListener(new DownloadListener() {
                @Override
                public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimeType, long contentLength) {
                    if (!isAllowedDownloadUrl(url, false)) {
                        return;
                    }
                    String guessedName = sanitizeApkFilename(URLUtil.guessFileName(url, contentDisposition, mimeType), mimeType);
                    if (bridge != null && bridge.getWebView() != null) {
                        String js = "(function(){ if (window.__requestApkDownload) { window.__requestApkDownload("
                            + JSONObject.quote(url) + ", " + JSONObject.quote(guessedName)
                            + "); return true; } return false; })();";
                        bridge.getWebView().evaluateJavascript(js, value -> {
                            if (!"true".equals(value)) {
                                downloadFileWithSystemManager(url, contentDisposition, mimeType);
                            }
                        });
                    } else {
                        downloadFileWithSystemManager(url, contentDisposition, mimeType);
                    }
                }
            });

            bridge.getWebView().addJavascriptInterface(new Object() {
                @JavascriptInterface
                public void setStatusBarStyle(final boolean isDark) {
                    applySystemBarAppearance(isDark, true);
                }

                @JavascriptInterface
                public void performHaptic(final int type) {
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            try {
                                View decor = getWindow() != null ? getWindow().getDecorView() : null;
                                if (decor != null) {
                                    decor.performHapticFeedback(
                                        type == 1 ? android.view.HapticFeedbackConstants.KEYBOARD_TAP : android.view.HapticFeedbackConstants.VIRTUAL_KEY,
                                        android.view.HapticFeedbackConstants.FLAG_IGNORE_GLOBAL_SETTING
                                    );
                                }
                            } catch (Throwable ignored) {}
                        }
                    });
                }

                @JavascriptInterface
                public void share(final String title, final String text, final String url) {
                    if (!isTrustedWebOrigin()) return;
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            try {
                                Intent sendIntent = new Intent();
                                sendIntent.setAction(Intent.ACTION_SEND);
                                String shareBody = text != null ? text : "";
                                if (url != null && !url.isEmpty()) {
                                    shareBody = (!shareBody.isEmpty()) ? shareBody + "\n\n" + url : url;
                                }
                                sendIntent.putExtra(Intent.EXTRA_SUBJECT, title);
                                sendIntent.putExtra(Intent.EXTRA_TEXT, shareBody);
                                sendIntent.setType("text/plain");
                                Intent chooser = Intent.createChooser(sendIntent, title);
                                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                startActivity(chooser);
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                        }
                    });
                }

                @JavascriptInterface
                public void shareImage(final String base64Data, final String title, final String text) {
                    if (base64Data == null || base64Data.isEmpty()) return;
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            try {
                                String cleanBase64 = base64Data;
                                if (cleanBase64.contains(",")) {
                                    cleanBase64 = cleanBase64.substring(cleanBase64.indexOf(",") + 1);
                                }
                                byte[] decoded = Base64.decode(cleanBase64, Base64.DEFAULT);
                                File cachePath = new File(getCacheDir(), "shared_cards");
                                if (!cachePath.exists()) cachePath.mkdirs();
                                File imageFile = new File(cachePath, "ogv_spotlight_card_" + System.currentTimeMillis() + ".png");
                                try (OutputStream os = new java.io.FileOutputStream(imageFile)) {
                                    os.write(decoded);
                                    os.flush();
                                }

                                Uri contentUri = androidx.core.content.FileProvider.getUriForFile(
                                    MainActivity.this,
                                    getPackageName() + ".fileprovider",
                                    imageFile
                                );

                                Intent shareIntent = new Intent(Intent.ACTION_SEND);
                                shareIntent.setType("image/png");
                                shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                                shareIntent.putExtra(Intent.EXTRA_SUBJECT, title);
                                shareIntent.putExtra(Intent.EXTRA_TEXT, text != null ? text : "");
                                shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                                Intent chooser = Intent.createChooser(shareIntent, title);
                                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                startActivity(chooser);
                            } catch (Throwable e) {
                                e.printStackTrace();
                            }
                        }
                    });
                }

                @JavascriptInterface
                public void downloadApk(final String downloadUrl, final String filename) {
                    if (!isTrustedWebOrigin()) return;
                    if (!isAllowedDownloadUrl(downloadUrl, false)) return;
                    downloadFileWithSystemManager(downloadUrl, filename, "application/vnd.android.package-archive");
                }

                @JavascriptInterface
                public void downloadAndInstallUpdate(final String apkUrl, final String versionName) {
                    downloadAndInstallUpdate(apkUrl, versionName, "");
                }

                @JavascriptInterface
                public void downloadAndInstallUpdate(final String apkUrl, final String versionName, final String expectedDigest) {
                    if (!isTrustedWebOrigin()) return;
                    if (!isAllowedDownloadUrl(apkUrl, true)) {
                        postUpdateError("Blocked unverified update source URL.");
                        return;
                    }
                    // Downloads update via standard Android DownloadManager to Downloads/
                    final String safeVer = (versionName != null) ? versionName.replaceAll("[^A-Za-z0-9._-]", "") : "";
                    final String targetName = !safeVer.isEmpty()
                        ? "OneGitVault-v" + safeVer + ".apk"
                        : "OneGitVault-Update.apk";
                    long downloadId = enqueueSystemDownload(apkUrl, targetName, "application/vnd.android.package-archive");
                    if (downloadId > 0) {
                        postUpdateProgress(5, "Downloading " + targetName + "...");
                        monitorUpdateDownload(downloadId, targetName, expectedDigest);
                    } else {
                        // Browser fallback triggered inside enqueueSystemDownload
                        postUpdateProgress(100, "Download started! Close the app and install the APK once complete.");
                    }
                }

                @JavascriptInterface
                public String getSecureToken() {
                    if (!isTrustedWebOrigin()) return "";
                    return readEncryptedToken();
                }

                @JavascriptInterface
                public boolean saveSecureToken(final String token) {
                    if (!isTrustedWebOrigin()) return false;
                    return writeEncryptedToken(token);
                }

                @JavascriptInterface
                public String requestGitHubDevicePost(final String endpointPath, final String formBody) {
                    if (!isTrustedWebOrigin()) {
                        return "{\"error\":\"untrusted_origin\"}";
                    }
                    return performGitHubOAuthPost(endpointPath, formBody);
                }

                @JavascriptInterface
                public long getNativeCacheBytes() {
                    if (!isTrustedWebOrigin()) return 0L;
                    return getNativeCacheDirectorySize();
                }

                @JavascriptInterface
                public boolean clearNativeCache() {
                    if (!isTrustedWebOrigin()) return false;
                    clearNativeCacheInternal();
                    return true;
                }

                @JavascriptInterface
                public String getSystemAppearance() {
                    if (!isTrustedWebOrigin()) return "{}";
                    return readSystemAppearanceJson();
                }

                @JavascriptInterface
                public void openExternalUrl(final String url) {
                    if (!isTrustedWebOrigin()) return;
                    if (!isAllowedDownloadUrl(url, false)) return;
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            try {
                                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url.trim()));
                                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                startActivity(intent);
                            } catch (Throwable ignored) {}
                        }
                    });
                }

                @JavascriptInterface
                public void updateNativeWidgets(final String trendingJson, final String vaultJson) {
                    try {
                        SharedPreferences sp = getSharedPreferences(TrendingWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
                        SharedPreferences.Editor editor = sp.edit();
                        if (trendingJson != null) {
                            editor.putString(TrendingWidgetProvider.KEY_TRENDING_DATA, trendingJson);
                        }
                        if (vaultJson != null) {
                            editor.putString(VaultReleaseWidgetProvider.KEY_VAULT_DATA, vaultJson);
                        }
                        editor.apply();

                        TrendingWidgetProvider.updateAllWidgets(MainActivity.this);
                        VaultReleaseWidgetProvider.updateAllWidgets(MainActivity.this);
                    } catch (Throwable ignored) {}
                }

                @JavascriptInterface
                public String getPendingTargetTab() {
                    String tab = pendingTargetTab;
                    pendingTargetTab = null;
                    return tab != null ? tab : "";
                }
            }, "AndroidThemeBridge");
        }

        handleLaunchIntent(getIntent());

        enforceNativeCachePolicyAsync();
        refreshSystemAppearanceCache(false);
        registerSystemThemeObservers();
        scheduleBackgroundReleaseWorker();
        int nightMaskInit = getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
        applySystemBarAppearance(nightMaskInit == Configuration.UI_MODE_NIGHT_YES, true);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleLaunchIntent(intent);
    }

    private void handleLaunchIntent(Intent intent) {
        if (intent == null) return;
        String tab = intent.getStringExtra("targetTab");
        if ((tab == null || tab.isEmpty()) && intent.getData() != null) {
            Uri data = intent.getData();
            if ("onegitvault".equalsIgnoreCase(data.getScheme())) {
                String hostOrPath = data.getHost() != null ? data.getHost() : "";
                String path = data.getPath() != null ? data.getPath() : "";
                String full = (hostOrPath + "/" + path).toLowerCase();
                if (full.contains("vault")) {
                    tab = "vault";
                } else if (full.contains("trending")) {
                    tab = "trending";
                } else if (full.contains("spotlight")) {
                    tab = "spotlight";
                } else if (full.contains("explore")) {
                    tab = "explore";
                } else if (full.contains("apks")) {
                    tab = "apks";
                }
            }
        }
        if (tab != null && !tab.isEmpty()) {
            pendingTargetTab = tab;
            dispatchTargetTabToWebView(tab);
        }
    }

    private void dispatchTargetTabToWebView(final String tab) {
        if (tab == null || tab.isEmpty()) return;
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (bridge != null && bridge.getWebView() != null) {
                        String js = "window.dispatchEvent(new CustomEvent('ogv:switch_tab', { detail: { tab: "
                            + JSONObject.quote(tab) + " } }));";
                        bridge.getWebView().evaluateJavascript(js, null);
                    }
                } catch (Throwable ignored) {}
            }
        });
    }

    private void scheduleBackgroundReleaseWorker() {
        try {
            Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();

            PeriodicWorkRequest releaseWork = new PeriodicWorkRequest.Builder(
                VaultReleaseWorker.class,
                6, TimeUnit.HOURS
            )
            .setConstraints(constraints)
            .build();

            WorkManager.getInstance(this).enqueueUniquePeriodicWork(
                "ogv_vault_release_checker",
                ExistingPeriodicWorkPolicy.KEEP,
                releaseWork
            );
        } catch (Throwable ignored) {}
    }

    private void dispatchSystemThemeChanged() {
        if (bridge != null && bridge.getWebView() != null && isTrustedUrlString(lastTrustedUrl)) {
            bridge.getWebView().post(new Runnable() {
                @Override
                public void run() {
                    try {
                        if (bridge != null && bridge.getWebView() != null && isTrustedUrlString(lastTrustedUrl)) {
                            bridge.getWebView().evaluateJavascript(
                                "if(window && window.dispatchEvent){window.dispatchEvent(new CustomEvent('ogv_system_theme_changed'));}",
                                null
                            );
                        }
                    } catch (Throwable ignored) {}
                }
            });
        }
    }

    private String computeAppearanceFingerprint() {
        int nightMask = getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
        boolean isDark = nightMask == Configuration.UI_MODE_NIGHT_YES;
        boolean blurEnabled = true;
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null && pm.isPowerSaveMode()) {
                blurEnabled = false;
            }
            if (blurEnabled && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                WindowManager wm = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
                if (wm != null) {
                    blurEnabled = wm.isCrossWindowBlurEnabled();
                }
            }
        } catch (Throwable ignored) {}
        float contrast = 0f;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            try {
                UiModeManager um = (UiModeManager) getSystemService(Context.UI_MODE_SERVICE);
                contrast = Api34ThemeHelper.readContrast(um);
            } catch (Throwable ignored) {}
        }
        int keyAccent = 0;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                keyAccent = getResources().getColor(android.R.color.system_accent1_500, getTheme());
            } catch (Throwable ignored) {}
        }
        return isDark + "|" + blurEnabled + "|" + contrast + "|" + keyAccent;
    }

    private synchronized boolean refreshSystemAppearanceCache(boolean notifyIfChanged) {
        String fp = computeAppearanceFingerprint();
        if (cachedAppearanceJson != null && fp.equals(cachedAppearanceFingerprint)) {
            return false;
        }
        String nextJson = buildSystemAppearanceJson();
        boolean changed = cachedAppearanceJson != null && !nextJson.equals(cachedAppearanceJson);
        cachedAppearanceFingerprint = fp;
        cachedAppearanceJson = nextJson;
        if (notifyIfChanged && changed) {
            dispatchSystemThemeChanged();
        }
        return changed;
    }

    private void registerSystemThemeObservers() {
        try {
            powerSaveReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    refreshSystemAppearanceCache(true);
                }
            };
            IntentFilter filter = new IntentFilter(PowerManager.ACTION_POWER_SAVE_MODE_CHANGED);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                registerReceiver(powerSaveReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
            } else {
                registerReceiver(powerSaveReceiver, filter);
            }
        } catch (Throwable ignored) {}

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                WindowManager wm = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
                if (wm != null) {
                    blurEnabledListener = enabled -> refreshSystemAppearanceCache(true);
                    wm.addCrossWindowBlurEnabledListener(getMainExecutor(), blurEnabledListener);
                }
            } catch (Throwable ignored) {}
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            try {
                UiModeManager um = (UiModeManager) getSystemService(Context.UI_MODE_SERVICE);
                if (um != null) {
                    contrastObserverToken = Api34ThemeHelper.registerContrastListener(
                        um,
                        getMainExecutor(),
                        contrast -> refreshSystemAppearanceCache(true)
                    );
                }
            } catch (Throwable ignored) {}
        }
    }

    @TargetApi(Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
    private static final class Api34ThemeHelper {
        static Object registerContrastListener(
            UiModeManager um,
            java.util.concurrent.Executor executor,
            final Consumer<Float> onContrastChanged
        ) {
            UiModeManager.ContrastChangeListener listener = contrast -> onContrastChanged.accept(contrast);
            um.addContrastChangeListener(executor, listener);
            return listener;
        }

        static void unregisterContrastListener(UiModeManager um, Object token) {
            if (token instanceof UiModeManager.ContrastChangeListener) {
                um.removeContrastChangeListener((UiModeManager.ContrastChangeListener) token);
            }
        }

        static float readContrast(UiModeManager um) {
            return um != null ? um.getContrast() : 0f;
        }

        static void populateSemanticTokens(Resources res, Resources.Theme theme, boolean isDark, JSONObject tokens) {
            putResColor(res, theme, tokens, "primary", isDark ? android.R.color.system_primary_dark : android.R.color.system_primary_light);
            putResColor(res, theme, tokens, "onPrimary", isDark ? android.R.color.system_on_primary_dark : android.R.color.system_on_primary_light);
            putResColor(res, theme, tokens, "primaryContainer", isDark ? android.R.color.system_primary_container_dark : android.R.color.system_primary_container_light);
            putResColor(res, theme, tokens, "onPrimaryContainer", isDark ? android.R.color.system_on_primary_container_dark : android.R.color.system_on_primary_container_light);
            putResColor(res, theme, tokens, "secondary", isDark ? android.R.color.system_secondary_dark : android.R.color.system_secondary_light);
            putResColor(res, theme, tokens, "secondaryContainer", isDark ? android.R.color.system_secondary_container_dark : android.R.color.system_secondary_container_light);
            putResColor(res, theme, tokens, "onSecondaryContainer", isDark ? android.R.color.system_on_secondary_container_dark : android.R.color.system_on_secondary_container_light);
            putResColor(res, theme, tokens, "tertiary", isDark ? android.R.color.system_tertiary_dark : android.R.color.system_tertiary_light);
            putResColor(res, theme, tokens, "background", isDark ? android.R.color.system_background_dark : android.R.color.system_background_light);
            putResColor(res, theme, tokens, "onBackground", isDark ? android.R.color.system_on_background_dark : android.R.color.system_on_background_light);
            putResColor(res, theme, tokens, "surface", isDark ? android.R.color.system_surface_dark : android.R.color.system_surface_light);
            putResColor(res, theme, tokens, "surfaceLow", isDark ? android.R.color.system_surface_container_low_dark : android.R.color.system_surface_container_low_light);
            putResColor(res, theme, tokens, "surfaceContainer", isDark ? android.R.color.system_surface_container_dark : android.R.color.system_surface_container_light);
            putResColor(res, theme, tokens, "surfaceHigh", isDark ? android.R.color.system_surface_container_high_dark : android.R.color.system_surface_container_high_light);
            putResColor(res, theme, tokens, "surfaceHighest", isDark ? android.R.color.system_surface_container_highest_dark : android.R.color.system_surface_container_highest_light);
            putResColor(res, theme, tokens, "surfaceVariant", isDark ? android.R.color.system_surface_variant_dark : android.R.color.system_surface_variant_light);
            putResColor(res, theme, tokens, "onSurface", isDark ? android.R.color.system_on_surface_dark : android.R.color.system_on_surface_light);
            putResColor(res, theme, tokens, "onSurfaceVariant", isDark ? android.R.color.system_on_surface_variant_dark : android.R.color.system_on_surface_variant_light);
            putResColor(res, theme, tokens, "outline", isDark ? android.R.color.system_outline_dark : android.R.color.system_outline_light);
            putResColor(res, theme, tokens, "outlineVariant", isDark ? android.R.color.system_outline_variant_dark : android.R.color.system_outline_variant_light);
        }

        private static void putResColor(Resources res, Resources.Theme theme, JSONObject tokens, String key, int resId) {
            try {
                int c = res.getColor(resId, theme);
                tokens.put(key, String.format("#%06X", (0xFFFFFF & c)));
            } catch (Throwable ignored) {}
        }
    }

    private String toHexColor(int colorInt) {
        return String.format("#%06X", (0xFFFFFF & colorInt));
    }

    private void putColorTokenIfAbsent(Resources res, JSONObject tokens, String key, int resId) {
        if (tokens.has(key)) return;
        try {
            tokens.put(key, toHexColor(res.getColor(resId, getTheme())));
        } catch (Throwable ignored) {}
    }

    private JSONObject extractPaletteTokens(Resources res, boolean paletteDark) {
        JSONObject tokens = new JSONObject();

        // 1. Android 14+ (API 34+) Full OEM/Material You Semantic System Tokens for requested polarity
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            try {
                Api34ThemeHelper.populateSemanticTokens(res, getTheme(), paletteDark, tokens);
            } catch (Throwable ignored) {}
        }

        // 2. Android 12+ (API 31+) Monet Tonal Palette Mapping
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            putColorTokenIfAbsent(res, tokens, "accentSeedMid", android.R.color.system_accent1_400);
            putColorTokenIfAbsent(res, tokens, "accentSeed", android.R.color.system_accent1_500);
            putColorTokenIfAbsent(res, tokens, "tertiarySeed", android.R.color.system_accent3_400);
            putColorTokenIfAbsent(res, tokens, "primary", paletteDark ? android.R.color.system_accent1_200 : android.R.color.system_accent1_600);
            putColorTokenIfAbsent(res, tokens, "onPrimary", paletteDark ? android.R.color.system_accent1_800 : android.R.color.system_accent1_0);
            putColorTokenIfAbsent(res, tokens, "primaryContainer", paletteDark ? android.R.color.system_accent1_700 : android.R.color.system_accent1_100);
            putColorTokenIfAbsent(res, tokens, "onPrimaryContainer", paletteDark ? android.R.color.system_accent1_100 : android.R.color.system_accent1_900);
            putColorTokenIfAbsent(res, tokens, "secondary", paletteDark ? android.R.color.system_accent2_200 : android.R.color.system_accent2_600);
            putColorTokenIfAbsent(res, tokens, "secondaryContainer", paletteDark ? android.R.color.system_accent2_700 : android.R.color.system_accent2_100);
            putColorTokenIfAbsent(res, tokens, "onSecondaryContainer", paletteDark ? android.R.color.system_accent2_100 : android.R.color.system_accent2_900);
            putColorTokenIfAbsent(res, tokens, "tertiary", paletteDark ? android.R.color.system_accent3_200 : android.R.color.system_accent3_600);
            putColorTokenIfAbsent(res, tokens, "background", paletteDark ? android.R.color.system_neutral1_900 : android.R.color.system_neutral1_10);
            putColorTokenIfAbsent(res, tokens, "onBackground", paletteDark ? android.R.color.system_neutral1_100 : android.R.color.system_neutral1_900);
            putColorTokenIfAbsent(res, tokens, "surface", paletteDark ? android.R.color.system_neutral1_900 : android.R.color.system_neutral1_0);
            putColorTokenIfAbsent(res, tokens, "surfaceLow", paletteDark ? android.R.color.system_neutral1_900 : android.R.color.system_neutral1_50);
            putColorTokenIfAbsent(res, tokens, "surfaceContainer", paletteDark ? android.R.color.system_neutral1_800 : android.R.color.system_neutral1_50);
            putColorTokenIfAbsent(res, tokens, "surfaceHigh", paletteDark ? android.R.color.system_neutral1_800 : android.R.color.system_neutral1_100);
            putColorTokenIfAbsent(res, tokens, "surfaceHighest", paletteDark ? android.R.color.system_neutral1_700 : android.R.color.system_neutral1_100);
            putColorTokenIfAbsent(res, tokens, "surfaceVariant", paletteDark ? android.R.color.system_neutral2_800 : android.R.color.system_neutral2_100);
            putColorTokenIfAbsent(res, tokens, "onSurface", paletteDark ? android.R.color.system_neutral1_50 : android.R.color.system_neutral1_900);
            putColorTokenIfAbsent(res, tokens, "onSurfaceVariant", paletteDark ? android.R.color.system_neutral2_200 : android.R.color.system_neutral2_700);
            putColorTokenIfAbsent(res, tokens, "outline", paletteDark ? android.R.color.system_neutral2_400 : android.R.color.system_neutral2_500);
            putColorTokenIfAbsent(res, tokens, "outlineVariant", paletteDark ? android.R.color.system_neutral2_700 : android.R.color.system_neutral2_200);
        }

        // 3. API 24-30 DeviceDefault Skin Fallback & WallpaperColors Chromatic Seeds (O_MR1+)
        if (!tokens.has("primary")) {
            try {
                ContextThemeWrapper sysThemeCtx = new ContextThemeWrapper(
                    this,
                    paletteDark ? android.R.style.Theme_DeviceDefault : android.R.style.Theme_DeviceDefault_Light
                );
                TypedValue tv = new TypedValue();
                if (sysThemeCtx.getTheme().resolveAttribute(android.R.attr.colorAccent, tv, true) && tv.type >= TypedValue.TYPE_FIRST_COLOR_INT && tv.type <= TypedValue.TYPE_LAST_COLOR_INT) {
                    tokens.put("primary", toHexColor(tv.data));
                } else if (sysThemeCtx.getTheme().resolveAttribute(android.R.attr.colorPrimary, tv, true) && tv.type >= TypedValue.TYPE_FIRST_COLOR_INT && tv.type <= TypedValue.TYPE_LAST_COLOR_INT) {
                    tokens.put("primary", toHexColor(tv.data));
                }
            } catch (Throwable ignored) {}
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            try {
                WallpaperManager wm = WallpaperManager.getInstance(this);
                WallpaperColors wc = wm != null ? wm.getWallpaperColors(WallpaperManager.FLAG_SYSTEM) : null;
                if (wc != null) {
                    if (wc.getPrimaryColor() != null) {
                        String wpPrimary = toHexColor(wc.getPrimaryColor().toArgb());
                        tokens.put("wallpaperPrimary", wpPrimary);
                        if (!tokens.has("primary")) {
                            tokens.put("primary", wpPrimary);
                        }
                    }
                    if (wc.getSecondaryColor() != null) {
                        String wpSecondary = toHexColor(wc.getSecondaryColor().toArgb());
                        tokens.put("wallpaperSecondary", wpSecondary);
                        if (!tokens.has("secondary")) {
                            tokens.put("secondary", wpSecondary);
                        }
                    }
                    if (wc.getTertiaryColor() != null) {
                        tokens.put("wallpaperTertiary", toHexColor(wc.getTertiaryColor().toArgb()));
                    }
                }
            } catch (Throwable ignored) {}
        }
        return tokens;
    }

    private String readSystemAppearanceJson() {
        String cached = cachedAppearanceJson;
        if (cached != null && !cached.isEmpty()) {
            return cached;
        }
        refreshSystemAppearanceCache(false);
        return cachedAppearanceJson != null ? cachedAppearanceJson : "{}";
    }

    private String buildSystemAppearanceJson() {
        try {
            JSONObject obj = new JSONObject();
            int nightMask = getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
            boolean isDark = nightMask == Configuration.UI_MODE_NIGHT_YES;
            obj.put("isDark", isDark);
            obj.put("apiLevel", Build.VERSION.SDK_INT);

            boolean blurEnabled = true;
            try {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm != null && pm.isPowerSaveMode()) {
                    blurEnabled = false;
                }
                if (blurEnabled && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    WindowManager wm = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
                    if (wm != null) {
                        blurEnabled = wm.isCrossWindowBlurEnabled();
                    }
                }
            } catch (Throwable ignored) {}
            obj.put("blurEnabled", blurEnabled);

            float contrast = 0f;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                try {
                    UiModeManager um = (UiModeManager) getSystemService(Context.UI_MODE_SERVICE);
                    contrast = Api34ThemeHelper.readContrast(um);
                } catch (Throwable ignored) {}
            }
            obj.put("contrast", contrast);

            Resources res = getResources();
            JSONObject lightTokens = extractPaletteTokens(res, false);
            JSONObject darkTokens = extractPaletteTokens(res, true);
            obj.put("light", lightTokens);
            obj.put("dark", darkTokens);

            JSONObject activeTokens = isDark ? darkTokens : lightTokens;
            if (activeTokens.has("primary")) {
                obj.put("accentPrimary", activeTokens.getString("primary"));
            }
            if (activeTokens.has("secondary")) {
                obj.put("accentSecondary", activeTokens.getString("secondary"));
            }
            return obj.toString();
        } catch (Throwable e) {
            return "{}";
        }
    }

    private void applySystemBarAppearance(final boolean isDarkBg, final boolean scheduleSettlingPass) {
        desiredDarkSystemBars = isDarkBg;
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                enforceSystemBarAppearanceOnUiThread(isDarkBg);
                if (scheduleSettlingPass) {
                    try {
                        View decor = getWindow() != null ? getWindow().getDecorView() : null;
                        if (decor != null) {
                            decor.postDelayed(new Runnable() {
                                @Override
                                public void run() {
                                    Boolean target = desiredDarkSystemBars;
                                    if (!isDestroyed() && !isFinishing() && target != null) {
                                        enforceSystemBarAppearanceOnUiThread(target);
                                    }
                                }
                            }, 120L);
                        }
                    } catch (Throwable ignored) {}
                }
            }
        });
    }

    private void enforceSystemBarAppearanceOnUiThread(final boolean isDarkBg) {
        try {
            Window win = getWindow();
            if (win == null) return;
            View decor = win.getDecorView();
            if (decor == null) return;

            final boolean useDarkIcons = !isDarkBg;
            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(win, decor);
            if (controller != null) {
                controller.setAppearanceLightStatusBars(useDarkIcons);
                controller.setAppearanceLightNavigationBars(useDarkIcons);
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                WindowInsetsController wc = win.getInsetsController();
                if (wc != null) {
                    int mask = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                        | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                    wc.setSystemBarsAppearance(useDarkIcons ? mask : 0, mask);
                }
            }

            // Fallback & direct flags for maximum OEM compatibility (OnePlus/Oppo/Xiaomi/Vivo)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                int currentFlags = decor.getSystemUiVisibility();
                int targetFlags = currentFlags;
                if (useDarkIcons) {
                    targetFlags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                } else {
                    targetFlags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    if (useDarkIcons) {
                        targetFlags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                    } else {
                        targetFlags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                    }
                }
                if (targetFlags != currentFlags) {
                    decor.setSystemUiVisibility(targetFlags);
                }
            }
        } catch (Throwable ignored) {}
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        Boolean target = desiredDarkSystemBars;
        if (hasFocus && target != null) {
            enforceSystemBarAppearanceOnUiThread(target);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        refreshSystemAppearanceCache(true);
        Boolean target = desiredDarkSystemBars;
        if (target != null) {
            applySystemBarAppearance(target, false);
        }
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        refreshSystemAppearanceCache(true);
        Boolean target = desiredDarkSystemBars;
        if (target != null) {
            applySystemBarAppearance(target, true);
        }
    }

    private boolean isTrustedUrlString(String urlStr) {
        if (urlStr == null || urlStr.isEmpty() || "about:blank".equalsIgnoreCase(urlStr)) return true;
        try {
            Uri parsed = Uri.parse(urlStr);
            String scheme = parsed.getScheme();
            String host = parsed.getHost();
            if (scheme == null) return true;
            return ("https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme) || "capacitor".equalsIgnoreCase(scheme))
                && (host == null || "localhost".equalsIgnoreCase(host) || "127.0.0.1".equals(host));
        } catch (Throwable ignored) {
            return false;
        }
    }

    private boolean isTrustedWebOrigin() {
        if (bridge == null || bridge.getWebView() == null || isDestroyed() || isFinishing()) {
            return false;
        }
        if (Looper.myLooper() != Looper.getMainLooper() && isTrustedUrlString(lastTrustedUrl)) {
            return true;
        }
        final String[] holder = new String[1];
        if (Looper.myLooper() == Looper.getMainLooper()) {
            holder[0] = bridge.getWebView().getUrl();
        } else {
            final CountDownLatch latch = new CountDownLatch(1);
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        if (bridge != null && bridge.getWebView() != null) {
                            holder[0] = bridge.getWebView().getUrl();
                        }
                    } finally {
                        latch.countDown();
                    }
                }
            });
            try {
                if (!latch.await(800, TimeUnit.MILLISECONDS)) {
                    return isTrustedUrlString(lastTrustedUrl);
                }
            } catch (InterruptedException e) {
                return false;
            }
        }
        String urlStr = holder[0];
        if (isTrustedUrlString(urlStr)) {
            lastTrustedUrl = urlStr;
            return true;
        }
        return false;
    }

    private String performGitHubOAuthPost(final String endpointPath, final String formBody) {
        if (!"/login/device/code".equals(endpointPath) && !"/login/oauth/access_token".equals(endpointPath)) {
            return "{\"error\":\"invalid_endpoint\"}";
        }
        HttpURLConnection conn = null;
        try {
            URL url = new URL("https://github.com" + endpointPath);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);
            conn.setDoOutput(true);
            conn.setRequestProperty("Accept", "application/json");
            conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
            byte[] payload = (formBody != null ? formBody : "").getBytes(StandardCharsets.UTF_8);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(payload);
            }
            int status = conn.getResponseCode();
            InputStream stream = status >= 400 ? conn.getErrorStream() : conn.getInputStream();
            if (stream == null) {
                return "{\"error\":\"http_" + status + "\"}";
            }
            StringBuilder sb = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
            }
            return sb.toString();
        } catch (Exception e) {
            return "{\"error\":\"network_error\",\"error_description\":" + JSONObject.quote(e.getMessage() != null ? e.getMessage() : "Request failed") + "}";
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private String computeDownloadSha256(final DownloadManager dm, final long downloadId) {
        try (ParcelFileDescriptor pfd = dm.openDownloadedFile(downloadId)) {
            if (pfd == null) return null;
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] buffer = new byte[16384];
            try (FileInputStream fis = new FileInputStream(pfd.getFileDescriptor())) {
                int read;
                while ((read = fis.read(buffer)) != -1) {
                    md.update(buffer, 0, read);
                }
            }
            byte[] digestBytes = md.digest();
            StringBuilder hex = new StringBuilder(digestBytes.length * 2);
            for (byte b : digestBytes) {
                hex.append(String.format("%02x", b & 0xff));
            }
            return hex.toString();
        } catch (Exception e) {
            return null;
        }
    }

    private SecretKey getOrCreatePatKey() throws Exception {
        KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
        ks.load(null);
        if (ks.containsAlias(KEYSTORE_ALIAS)) {
            KeyStore.Entry entry = ks.getEntry(KEYSTORE_ALIAS, null);
            if (entry instanceof KeyStore.SecretKeyEntry) {
                return ((KeyStore.SecretKeyEntry) entry).getSecretKey();
            }
        }
        KeyGenerator kg = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        kg.init(
            new KeyGenParameterSpec.Builder(
                KEYSTORE_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build()
        );
        return kg.generateKey();
    }

    private boolean writeEncryptedToken(final String rawToken) {
        try {
            SharedPreferences prefs = getSharedPreferences(SECURE_PREFS_NAME, MODE_PRIVATE);
            String trimmed = rawToken != null ? rawToken.trim() : "";
            if (trimmed.isEmpty()) {
                prefs.edit().remove(KEY_ENC_PAT).apply();
                return true;
            }
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, getOrCreatePatKey());
            byte[] iv = cipher.getIV();
            byte[] encrypted = cipher.doFinal(trimmed.getBytes(StandardCharsets.UTF_8));
            byte[] combined = new byte[iv.length + encrypted.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(encrypted, 0, combined, iv.length, encrypted.length);
            prefs.edit().putString(KEY_ENC_PAT, Base64.encodeToString(combined, Base64.NO_WRAP)).apply();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private String readEncryptedToken() {
        try {
            SharedPreferences prefs = getSharedPreferences(SECURE_PREFS_NAME, MODE_PRIVATE);
            String encoded = prefs.getString(KEY_ENC_PAT, null);
            if (encoded == null || encoded.isEmpty()) return "";
            byte[] combined = Base64.decode(encoded, Base64.NO_WRAP);
            if (combined.length <= 12) return "";
            byte[] iv = new byte[12];
            byte[] ciphertext = new byte[combined.length - 12];
            System.arraycopy(combined, 0, iv, 0, 12);
            System.arraycopy(combined, 12, ciphertext, 0, ciphertext.length);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, getOrCreatePatKey(), new GCMParameterSpec(128, iv));
            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        } catch (Exception e) {
            return "";
        }
    }

    private boolean isAllowedDownloadUrl(final String rawUrl, final boolean strictSelfUpdateOnly) {
        if (rawUrl == null || rawUrl.trim().isEmpty()) return false;
        try {
            Uri uri = Uri.parse(rawUrl.trim());
            String scheme = uri.getScheme();
            String host = uri.getHost();
            if (scheme == null || !"https".equalsIgnoreCase(scheme) || host == null) {
                return false;
            }
            String lowerHost = host.toLowerCase();
            if (strictSelfUpdateOnly) {
                String path = uri.getPath() != null ? uri.getPath().toLowerCase() : "";
                boolean isOwnRepo = "github.com".equals(lowerHost) && path.startsWith("/vkaddala/onegitvault/");
                boolean isGitHubAssets = "objects.githubusercontent.com".equals(lowerHost)
                    || "release-assets.githubusercontent.com".equals(lowerHost);
                return isOwnRepo || isGitHubAssets;
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private String sanitizeApkFilename(final String hint, final String mimeType) {
        String name = (hint != null ? hint.trim() : "");
        int lastSlash = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
        if (lastSlash >= 0) {
            name = name.substring(lastSlash + 1);
        }
        name = name.replace("..", "").replaceAll("[^A-Za-z0-9._-]", "_");
        if (name.isEmpty() || "downloadfile.bin".equalsIgnoreCase(name)) {
            name = "app-release.apk";
        }
        if (!name.toLowerCase().endsWith(".apk") && mimeType != null && mimeType.contains("package-archive")) {
            name += ".apk";
        }
        return name;
    }

    private long getDirBytes(File dir) {
        if (dir == null || !dir.exists()) return 0L;
        if (dir.isFile()) return dir.length();
        File[] children = dir.listFiles();
        if (children == null) return 0L;
        long total = 0L;
        for (File f : children) {
            total += f.isDirectory() ? getDirBytes(f) : f.length();
        }
        return total;
    }

    private long getNativeCacheDirectorySize() {
        long size = 0L;
        try {
            size += getDirBytes(getCacheDir());
            size += getDirBytes(getExternalCacheDir());
        } catch (Exception ignored) {}
        return size;
    }

    private void deleteCacheChildren(File dir) {
        if (dir == null || !dir.exists() || !dir.isDirectory()) return;
        File[] children = dir.listFiles();
        if (children == null) return;
        for (File child : children) {
            String name = child.getName();
            // Let WebView.clearCache(true) manage Chromium's active WebView cache directory cleanly
            if ("WebView".equalsIgnoreCase(name) || "org.chromium.android_webview".equalsIgnoreCase(name)) {
                continue;
            }
            deleteRecursive(child);
        }
    }

    private void deleteRecursive(File file) {
        if (file == null || !file.exists()) return;
        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) {
                for (File child : children) {
                    deleteRecursive(child);
                }
            }
        }
        try { file.delete(); } catch (Exception ignored) {}
    }

    private void clearNativeCacheInternal() {
        try {
            SharedPreferences prefs = getSharedPreferences(CACHE_PREFS_NAME, MODE_PRIVATE);
            prefs.edit().putLong(KEY_LAST_CACHE_CLEAR_TS, System.currentTimeMillis()).apply();
        } catch (Exception ignored) {}

        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (bridge != null && bridge.getWebView() != null) {
                        bridge.getWebView().clearCache(true);
                    }
                } catch (Exception ignored) {}
            }
        });

        try {
            deleteCacheChildren(getCacheDir());
            deleteCacheChildren(getExternalCacheDir());
        } catch (Exception ignored) {}
    }

    private void enforceNativeCachePolicyAsync() {
        Thread cacheThread = new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    SharedPreferences prefs = getSharedPreferences(CACHE_PREFS_NAME, MODE_PRIVATE);
                    long now = System.currentTimeMillis();
                    long lastClearTs = prefs.getLong(KEY_LAST_CACHE_CLEAR_TS, 0L);
                    if (lastClearTs == 0L) {
                        prefs.edit().putLong(KEY_LAST_CACHE_CLEAR_TS, now).apply();
                        lastClearTs = now;
                    }
                    long cacheBytes = getNativeCacheDirectorySize();
                    if ((now - lastClearTs) >= MAX_CACHE_AGE_MS || cacheBytes >= MAX_CACHE_BYTES) {
                        clearNativeCacheInternal();
                    }
                } catch (Exception ignored) {}
            }
        });
        cacheThread.setDaemon(true);
        cacheThread.start();
    }

    private void postUpdateProgress(final int progress, final String status) {
        if (isDestroyed() || isFinishing() || bridge == null || bridge.getWebView() == null) return;
        final String safeStatus = JSONObject.quote(status != null ? status : "");
        bridge.getWebView().post(new Runnable() {
            @Override
            public void run() {
                if (bridge != null && bridge.getWebView() != null) {
                    bridge.getWebView().evaluateJavascript(
                        "if (window.__onAndroidUpdateProgress) { window.__onAndroidUpdateProgress(" + progress + ", " + safeStatus + "); }",
                        null
                    );
                }
            }
        });
    }

    private void postUpdateError(final String errorMsg) {
        if (isDestroyed() || isFinishing() || bridge == null || bridge.getWebView() == null) return;
        final String safeError = JSONObject.quote(errorMsg != null ? errorMsg : "Download failed.");
        bridge.getWebView().post(new Runnable() {
            @Override
            public void run() {
                if (bridge != null && bridge.getWebView() != null) {
                    bridge.getWebView().evaluateJavascript(
                        "if (window.__onAndroidUpdateError) { window.__onAndroidUpdateError(" + safeError + "); }",
                        null
                    );
                }
            }
        });
    }

    private void monitorUpdateDownload(final long downloadId, final String filename, final String expectedDigest) {
        activeUpdateDownloadId = downloadId;
        Thread monitorThread = new Thread(new Runnable() {
            @Override
            public void run() {
                DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                if (dm == null) {
                    postUpdateProgress(100, "Download successful!");
                    return;
                }

                int lastPct = 5;
                String lastStatus = "";
                int missingCount = 0;
                int pollCount = 0;
                final int maxPolls = 2570; // ~15 minutes safety cap

                while (!isDestroyed() && !isFinishing() && activeUpdateDownloadId == downloadId && pollCount < maxPolls) {
                    pollCount++;
                    Cursor cursor = null;
                    try {
                        DownloadManager.Query query = new DownloadManager.Query().setFilterById(downloadId);
                        cursor = dm.query(query);
                        if (cursor == null || !cursor.moveToFirst()) {
                            missingCount++;
                            if (missingCount >= 4) {
                                postUpdateError("Download was cancelled.");
                                break;
                            }
                        } else {
                            missingCount = 0;
                            int statusIdx = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);
                            int bytesIdx = cursor.getColumnIndex(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR);
                            int totalIdx = cursor.getColumnIndex(DownloadManager.COLUMN_TOTAL_SIZE_BYTES);

                            int status = statusIdx >= 0 ? cursor.getInt(statusIdx) : DownloadManager.STATUS_RUNNING;
                            long downloaded = bytesIdx >= 0 ? cursor.getLong(bytesIdx) : 0L;
                            long total = totalIdx >= 0 ? cursor.getLong(totalIdx) : -1L;

                            if (status == DownloadManager.STATUS_SUCCESSFUL) {
                                String cleanExpected = expectedDigest != null
                                    ? expectedDigest.trim().replaceFirst("(?i)^sha256:", "").trim()
                                    : "";
                                String actualSha = computeDownloadSha256(dm, downloadId);
                                if (!cleanExpected.isEmpty()) {
                                    if (actualSha != null && actualSha.equalsIgnoreCase(cleanExpected)) {
                                        postUpdateProgress(100, "SHA-256 verified! Download successful.");
                                    } else {
                                        try { dm.remove(downloadId); } catch (Exception ignored) {}
                                        postUpdateError("Security check failed: APK SHA-256 mismatch. Unverified file discarded.");
                                    }
                                } else {
                                    postUpdateProgress(100, "Download successful!");
                                }
                                break;
                            } else if (status == DownloadManager.STATUS_FAILED) {
                                postUpdateError("Download failed in system Download Manager. Please try again.");
                                break;
                            } else if (status == DownloadManager.STATUS_PAUSED) {
                                String pausedMsg = "Download paused in Download Manager...";
                                if (!pausedMsg.equals(lastStatus)) {
                                    lastStatus = pausedMsg;
                                    postUpdateProgress(lastPct, pausedMsg);
                                }
                            } else {
                                int pct = lastPct;
                                if (total > 0 && downloaded >= 0) {
                                    pct = (int) Math.min(98, Math.max(10, (downloaded * 100L) / total));
                                } else if (status == DownloadManager.STATUS_RUNNING && lastPct < 35) {
                                    pct = 25;
                                } else if (status == DownloadManager.STATUS_PENDING && lastPct < 10) {
                                    pct = 10;
                                }
                                String msg = "Downloading " + filename + "...";
                                if (pct != lastPct || !msg.equals(lastStatus)) {
                                    lastPct = pct;
                                    lastStatus = msg;
                                    postUpdateProgress(pct, msg);
                                }
                            }
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    } finally {
                        if (cursor != null) {
                            try { cursor.close(); } catch (Exception ignored) {}
                        }
                    }

                    try {
                        Thread.sleep(350);
                    } catch (InterruptedException e) {
                        break;
                    }
                }
            }
        });
        monitorThread.setDaemon(true);
        monitorThread.start();
    }

    /**
     * Enqueues an APK or asset download into the native Android system DownloadManager.
     * Automatically follows GitHub 302 redirects to Amazon S3, shows progress notifications,
     * and saves directly to the user's Downloads folder without requiring dangerous permissions.
     */
    public void downloadFileWithSystemManager(final String url, final String filenameHint, final String mimeType) {
        enqueueSystemDownload(url, filenameHint, mimeType);
    }

    private long enqueueSystemDownload(final String url, final String filenameHint, final String mimeType) {
        if (!isAllowedDownloadUrl(url, false)) {
            return -1L;
        }
        try {
            DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            if (dm == null) return -1L;

            Uri uri = Uri.parse(url.trim());
            DownloadManager.Request request = new DownloadManager.Request(uri);
            request.setAllowedNetworkTypes(DownloadManager.Request.NETWORK_WIFI | DownloadManager.Request.NETWORK_MOBILE);
            request.setAllowedOverRoaming(true);

            String rawHint = filenameHint;
            if (rawHint == null || rawHint.isEmpty() || rawHint.contains("/") || rawHint.contains("\\")) {
                rawHint = URLUtil.guessFileName(url, null, mimeType);
            }
            String filename = sanitizeApkFilename(rawHint, mimeType);

            request.setTitle(filename);
            request.setDescription("Downloading APK release from GitHub...");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);

            String targetMime = (mimeType != null && !mimeType.isEmpty() && !mimeType.equals("application/octet-stream"))
                ? mimeType : "application/vnd.android.package-archive";
            request.setMimeType(targetMime);

            long downloadId = dm.enqueue(request);
            final String finalName = filename;
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Toast.makeText(MainActivity.this, "Download started: " + finalName, Toast.LENGTH_SHORT).show();
                }
            });
            return downloadId;
        } catch (Exception e) {
            e.printStackTrace();
            if (isAllowedDownloadUrl(url, false)) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url.trim()));
                            browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(browserIntent);
                        } catch (Exception ex) {
                            ex.printStackTrace();
                        }
                    }
                });
            }
            return -1L;
        }
    }

    @Override
    public void onDestroy() {
        activeUpdateDownloadId = -1L;
        if (powerSaveReceiver != null) {
            try { unregisterReceiver(powerSaveReceiver); } catch (Throwable ignored) {}
            powerSaveReceiver = null;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && blurEnabledListener != null) {
            try {
                WindowManager wm = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
                if (wm != null) wm.removeCrossWindowBlurEnabledListener(blurEnabledListener);
            } catch (Throwable ignored) {}
            blurEnabledListener = null;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE && contrastObserverToken != null) {
            try {
                UiModeManager um = (UiModeManager) getSystemService(Context.UI_MODE_SERVICE);
                if (um != null) Api34ThemeHelper.unregisterContrastListener(um, contrastObserverToken);
            } catch (Throwable ignored) {}
            contrastObserverToken = null;
        }
        if (bridge != null) {
            if (capWebViewListener != null) {
                try { bridge.removeWebViewListener(capWebViewListener); } catch (Throwable ignored) {}
                capWebViewListener = null;
            }
            if (bridge.getWebView() != null) {
                try { bridge.getWebView().removeJavascriptInterface("AndroidThemeBridge"); } catch (Throwable ignored) {}
                try { bridge.getWebView().setDownloadListener(null); } catch (Throwable ignored) {}
            }
        }
        try {
            View decorView = getWindow() != null ? getWindow().getDecorView() : null;
            if (decorView != null) {
                ViewCompat.setOnApplyWindowInsetsListener(decorView, null);
            }
        } catch (Throwable ignored) {}
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().evaluateJavascript(
                "if (window.__handleAndroidBack && window.__handleAndroidBack()) { /* handled */ } else { window.history.back(); }",
                null
            );
        } else {
            super.onBackPressed();
        }
    }
}
