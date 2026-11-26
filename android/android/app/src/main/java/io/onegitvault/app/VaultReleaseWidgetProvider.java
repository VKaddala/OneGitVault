package io.onegitvault.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

public class VaultReleaseWidgetProvider extends AppWidgetProvider {

    public static final String PREFS_NAME = "ogv_widget_prefs";
    public static final String KEY_VAULT_DATA = "widget_vault_json";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidgetView(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, VaultReleaseWidgetProvider.class));
        for (int id : ids) {
            updateWidgetView(context, manager, id);
        }
    }

    private static void updateWidgetView(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_vault_release);

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String jsonStr = prefs.getString(KEY_VAULT_DATA, null);

        String repoTitle = "Vault Repositories";
        String tag = "Latest";
        String desc = "Tap to view saved repositories and releases.";
        String updateStatus = "Synced with GitHub";

        if (jsonStr != null && !jsonStr.isEmpty()) {
            try {
                JSONObject obj = new JSONObject(jsonStr);
                int updatesCount = obj.optInt("updatesCount", 0);
                if (updatesCount > 0) {
                    tag = updatesCount + " New";
                    repoTitle = obj.optString("latestUpdatedRepo", "Vault Updates");
                    desc = obj.optString("latestReleaseTag", "New release") + " published! Tap to download APK.";
                    updateStatus = "Update Available";
                } else {
                    int totalSaved = obj.optInt("totalSaved", 0);
                    repoTitle = "Vault (" + totalSaved + " Saved)";
                    tag = "Up to date";
                    desc = "All vaulted repositories are up to date with upstream GitHub.";
                    updateStatus = "0 pending updates";
                }
            } catch (Throwable ignored) {}
        }

        views.setTextViewText(R.id.widget_vault_repo_title, repoTitle);
        views.setTextViewText(R.id.widget_vault_tag, tag);
        views.setTextViewText(R.id.widget_vault_desc, desc);
        views.setTextViewText(R.id.widget_vault_update_status, updateStatus);

        Intent intent = new Intent(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            1,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_vault_root, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
