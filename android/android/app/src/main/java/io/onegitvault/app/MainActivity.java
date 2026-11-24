package io.onegitvault.app;

import android.content.Intent;
import android.os.Bundle;
import android.os.Build;
import android.graphics.Color;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
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

        // Set WebView background transparent so theme background flows edge-to-edge
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().setBackgroundColor(Color.TRANSPARENT);

            bridge.getWebView().addJavascriptInterface(new Object() {
                private Boolean lastIsDarkApplied = null;

                @JavascriptInterface
                public void setStatusBarStyle(final boolean isDark) {
                    // Strict deduplication guard: if already applied, exit immediately with zero CPU/memory overhead
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

                            // Method 1: WindowInsetsControllerCompat
                            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(win, decor);
                            if (controller != null) {
                                controller.setAppearanceLightStatusBars(!isDark);
                                controller.setAppearanceLightNavigationBars(!isDark);
                            }

                            // Method 2: Direct System UI Visibility flags fallback for OEM compatibility
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
            }, "AndroidThemeBridge");
        }
    }

    @Override
    public void onBackPressed() {
        if (bridge != null && bridge.getWebView() != null) {
            // Forward back gesture to webview handler
            bridge.getWebView().evaluateJavascript(
                "if (window.__handleAndroidBack && window.__handleAndroidBack()) { /* handled */ } else { window.history.back(); }",
                null
            );
        } else {
            super.onBackPressed();
        }
    }
}
