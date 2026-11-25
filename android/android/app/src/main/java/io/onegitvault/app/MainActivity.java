package io.onegitvault.app;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.os.Environment;
import org.json.JSONObject;
import java.io.File;
import android.graphics.Color;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.URLUtil;
import android.widget.Toast;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String CACHE_PREFS_NAME = "ogv_cache_prefs";
    private static final String KEY_LAST_CACHE_CLEAR_TS = "last_clear_ts";
    private static final long MAX_CACHE_AGE_MS = 30L * 24L * 60L * 60L * 1000L; // 30 days
    private static final long MAX_CACHE_BYTES = 250L * 1024L * 1024L; // 250 MB

    private volatile long activeUpdateDownloadId = -1L;

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
            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().post(() -> {
                    bridge.getWebView().evaluateJavascript(
                        "document.documentElement.style.setProperty('--status-bar-height', '" + sb + "px');" +
                        "document.documentElement.style.setProperty('--nav-bar-height', '" + nb + "px');",
                        null
                    );
                });
            }
            return windowInsets;
        });

        // Setup WebView and Native Bridge
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().setBackgroundColor(Color.TRANSPARENT);

            // Register system DownloadListener: asks user permission in-app before handing APK links to DownloadManager
            bridge.getWebView().setDownloadListener(new DownloadListener() {
                @Override
                public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimeType, long contentLength) {
                    String guessedName = URLUtil.guessFileName(url, contentDisposition, mimeType);
                    if (bridge != null && bridge.getWebView() != null) {
                        String js = "(function(){ if (window.__requestApkDownload) { window.__requestApkDownload("
                            + JSONObject.quote(url) + ", " + JSONObject.quote(guessedName != null ? guessedName : "")
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
                private Boolean lastIsDarkApplied = null;

                @JavascriptInterface
                public void setStatusBarStyle(final boolean isDark) {
                    if (lastIsDarkApplied != null && lastIsDarkApplied == isDark) {
                        return;
                    }
                    lastIsDarkApplied = isDark;

                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            Window win = getWindow();
                            if (win == null) return;
                            View decor = win.getDecorView();
                            if (decor == null) return;

                            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(win, decor);
                            if (controller != null) {
                                controller.setAppearanceLightStatusBars(!isDark);
                                controller.setAppearanceLightNavigationBars(!isDark);
                            }

                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                int currentFlags = decor.getSystemUiVisibility();
                                int targetFlags = currentFlags;
                                if (!isDark) {
                                    targetFlags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                                } else {
                                    targetFlags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                                }
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                    if (!isDark) {
                                        targetFlags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                                    } else {
                                        targetFlags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                                    }
                                }
                                if (targetFlags != currentFlags) {
                                    decor.setSystemUiVisibility(targetFlags);
                                }
                            }
                        }
                    });
                }

                @JavascriptInterface
                public void share(final String title, final String text, final String url) {
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
                public void downloadApk(final String downloadUrl, final String filename) {
                    downloadFileWithSystemManager(downloadUrl, filename, "application/vnd.android.package-archive");
                }

                @JavascriptInterface
                public void downloadAndInstallUpdate(final String apkUrl, final String versionName) {
                    // Downloads update via standard Android DownloadManager to Downloads/
                    final String targetName = (versionName != null && !versionName.isEmpty())
                        ? "OneGitVault-v" + versionName + ".apk"
                        : "OneGitVault-Update.apk";
                    long downloadId = enqueueSystemDownload(apkUrl, targetName, "application/vnd.android.package-archive");
                    if (downloadId > 0) {
                        postUpdateProgress(5, "Downloading " + targetName + "...");
                        monitorUpdateDownload(downloadId, targetName);
                    } else {
                        // Browser fallback triggered inside enqueueSystemDownload
                        postUpdateProgress(100, "Download started! Close the app and install the APK once complete.");
                    }
                }
                @JavascriptInterface
                public long getNativeCacheBytes() {
                    return getNativeCacheDirectorySize();
                }

                @JavascriptInterface
                public boolean clearNativeCache() {
                    clearNativeCacheInternal();
                    return true;
                }
            }, "AndroidThemeBridge");
        }

        enforceNativeCachePolicyAsync();
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

    private void monitorUpdateDownload(final long downloadId, final String filename) {
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
                                postUpdateProgress(100, "Download successful!");
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
        try {
            DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            if (dm == null) return -1L;

            Uri uri = Uri.parse(url);
            DownloadManager.Request request = new DownloadManager.Request(uri);
            request.setAllowedNetworkTypes(DownloadManager.Request.NETWORK_WIFI | DownloadManager.Request.NETWORK_MOBILE);
            request.setAllowedOverRoaming(true);

            String filename = filenameHint;
            if (filename == null || filename.isEmpty() || filename.contains("/") || filename.contains("\\")) {
                filename = URLUtil.guessFileName(url, null, mimeType);
            }
            if (filename == null || filename.isEmpty() || filename.equals("downloadfile.bin")) {
                filename = "app-release.apk";
            }
            if (!filename.toLowerCase().endsWith(".apk") && mimeType != null && mimeType.contains("package-archive")) {
                filename += ".apk";
            }

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
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(browserIntent);
                    } catch (Exception ex) {
                        ex.printStackTrace();
                    }
                }
            });
            return -1L;
        }
    }

    @Override
    public void onDestroy() {
        activeUpdateDownloadId = -1L;
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
