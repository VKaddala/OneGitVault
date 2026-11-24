package io.onegitvault.app;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.os.Environment;
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

            // Register system DownloadListener: intercepts GitHub release APK downloads and directs them to DownloadManager
            bridge.getWebView().setDownloadListener(new DownloadListener() {
                @Override
                public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimeType, long contentLength) {
                    downloadFileWithSystemManager(url, contentDisposition, mimeType);
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
                    String targetName = (versionName != null && !versionName.isEmpty())
                        ? "OneGitVault-v" + versionName + ".apk"
                        : "OneGitVault-Update.apk";
                    downloadFileWithSystemManager(apkUrl, targetName, "application/vnd.android.package-archive");

                    if (bridge != null && bridge.getWebView() != null) {
                        bridge.getWebView().post(new Runnable() {
                            @Override
                            public void run() {
                                bridge.getWebView().evaluateJavascript(
                                    "if (window.__onAndroidUpdateProgress) { window.__onAndroidUpdateProgress(100, 'Download queued in system Download Manager!'); }",
                                    null
                                );
                            }
                        });
                    }
                }
            }, "AndroidThemeBridge");
        }
    }

    /**
     * Enqueues an APK or asset download into the native Android system DownloadManager.
     * Automatically follows GitHub 302 redirects to Amazon S3, shows progress notifications,
     * and saves directly to the user's Downloads folder without requiring dangerous permissions.
     */
    public void downloadFileWithSystemManager(final String url, final String filenameHint, final String mimeType) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                    if (dm == null) return;

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

                    dm.enqueue(request);
                    Toast.makeText(MainActivity.this, "Download started: " + filename, Toast.LENGTH_SHORT).show();
                } catch (Exception e) {
                    e.printStackTrace();
                    try {
                        Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(browserIntent);
                    } catch (Exception ex) {
                        ex.printStackTrace();
                    }
                }
            }
        });
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
