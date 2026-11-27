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

public class TrendingWidgetProvider extends AppWidgetProvider {

    public static final String PREFS_NAME = "ogv_widget_prefs";
    public static final String KEY_TRENDING_DATA = "widget_trending_json";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidgetView(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, TrendingWidgetProvider.class));
        for (int id : ids) {
            updateWidgetView(context, manager, id);
        }
    }

    private static void updateWidgetView(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_trending);

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String jsonStr = prefs.getString(KEY_TRENDING_DATA, null);

        String repoTitle = "facebook/react";
        String repoDesc = "The library for web and native user interfaces.";
        String language = "TypeScript";
        String stars = "★ 225.4k";

        if (jsonStr != null && !jsonStr.isEmpty()) {
            try {
                JSONArray arr = new JSONArray(jsonStr);
                if (arr.length() > 0) {
                    JSONObject item = arr.getJSONObject(0);
                    repoTitle = item.optString("full_name", item.optString("name", repoTitle));
                    repoDesc = item.optString("description", repoDesc);
                    language = item.optString("language", language);
                    int starNum = item.optInt("stargazers_count", 0);
                    if (starNum > 999) {
                        stars = "★ " + String.format("%.1fk", starNum / 1000.0);
                    } else if (starNum > 0) {
                        stars = "★ " + starNum;
                    }
                }
            } catch (Throwable ignored) {}
        }

        views.setTextViewText(R.id.widget_repo_title, repoTitle);
        views.setTextViewText(R.id.widget_repo_desc, repoDesc);
        views.setTextViewText(R.id.widget_language, language);
        views.setTextViewText(R.id.widget_stars, stars);

        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction("io.onegitvault.app.ACTION_OPEN_TRENDING");
        intent.putExtra("targetTab", "trending");
        intent.setData(android.net.Uri.parse("onegitvault://tab/trending"));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            102,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
