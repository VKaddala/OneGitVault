package io.onegitvault.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Calendar;

public class VaultReleaseWorker extends Worker {

    public static final String CHANNEL_ID_RELEASES = "vault_releases_channel";
    public static final String CHANNEL_ID_DIGEST = "vault_digest_channel";
    private static final String PREFS_WORKER = "ogv_worker_notifs";
    private static final String KEY_LAST_ALERTED_TAG_PREFIX = "last_alert_";
    private static final String KEY_LAST_DIGEST_SUNDAY = "last_digest_sunday";

    public VaultReleaseWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        ensureNotificationChannels(context);

        // 1. Check for Sunday Weekly Digest
        checkAndPostWeeklyDigest(context);

        // 2. High-signal release alerts for Vault repos
        checkVaultReleases(context);

        return Result.success();
    }

    private void ensureNotificationChannels(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            NotificationChannel releaseChannel = new NotificationChannel(
                CHANNEL_ID_RELEASES,
                "Vault Release Alerts",
                NotificationManager.IMPORTANCE_HIGH
            );
            releaseChannel.setDescription("High-signal notifications when your vaulted repositories publish new releases");
            releaseChannel.enableVibration(true);
            nm.createNotificationChannel(releaseChannel);

            NotificationChannel digestChannel = new NotificationChannel(
                CHANNEL_ID_DIGEST,
                "Weekly Digest",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            digestChannel.setDescription("Sunday morning summary of your saved repositories and trending tools");
            nm.createNotificationChannel(digestChannel);
        }
    }

    private void checkAndPostWeeklyDigest(Context context) {
        Calendar cal = Calendar.getInstance();
        int dayOfWeek = cal.get(Calendar.DAY_OF_WEEK);
        int hour = cal.get(Calendar.HOUR_OF_DAY);
        int dayOfYear = cal.get(Calendar.DAY_OF_YEAR);

        // Sunday morning between 9 AM and 12 PM
        if (dayOfWeek == Calendar.SUNDAY && hour >= 9 && hour <= 12) {
            SharedPreferences sp = context.getSharedPreferences(PREFS_WORKER, Context.MODE_PRIVATE);
            int lastDigest = sp.getInt(KEY_LAST_DIGEST_SUNDAY, -1);
            if (lastDigest == dayOfYear) {
                return; // Already sent today
            }

            Intent intent = new Intent(context, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pi = PendingIntent.getActivity(
                context,
                101,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID_DIGEST)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("☕ OneGitVault Weekly Digest")
                .setContentText("Your saved repositories are waiting. Discover what's new and build this weekend!")
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setAutoCancel(true)
                .setContentIntent(pi);

            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.notify(9001, builder.build());
                sp.edit().putInt(KEY_LAST_DIGEST_SUNDAY, dayOfYear).apply();
            }
        }
    }

    private void checkVaultReleases(Context context) {
        SharedPreferences widgetPrefs = context.getSharedPreferences(TrendingWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
        String vaultJson = widgetPrefs.getString(VaultReleaseWidgetProvider.KEY_VAULT_DATA, null);
        if (vaultJson == null || vaultJson.isEmpty()) return;

        try {
            JSONObject obj = new JSONObject(vaultJson);
            JSONArray topRepos = obj.optJSONArray("reposToCheck");
            if (topRepos == null || topRepos.length() == 0) return;

            SharedPreferences workerPrefs = context.getSharedPreferences(PREFS_WORKER, Context.MODE_PRIVATE);

            // Check up to 5 repos to avoid rate limits
            int limit = Math.min(topRepos.length(), 5);
            for (int i = 0; i < limit; i++) {
                String repoFullName = topRepos.optString(i, "").trim();
                if (repoFullName.isEmpty()) continue;

                String latestTag = fetchLatestReleaseTag(repoFullName);
                if (latestTag == null || latestTag.isEmpty()) continue;

                String prefKey = KEY_LAST_ALERTED_TAG_PREFIX + repoFullName.toLowerCase();
                String lastAlerted = workerPrefs.getString(prefKey, null);

                if (lastAlerted != null && !lastAlerted.equalsIgnoreCase(latestTag)) {
                    // New release found!
                    postReleaseNotification(context, repoFullName, latestTag);
                    workerPrefs.edit().putString(prefKey, latestTag).apply();
                } else if (lastAlerted == null) {
                    // Seed initial tag without spamming
                    workerPrefs.edit().putString(prefKey, latestTag).apply();
                }
            }
        } catch (Throwable ignored) {}
    }

    private String fetchLatestReleaseTag(String repoFullName) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL("https://api.github.com/repos/" + repoFullName + "/releases/latest");
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("User-Agent", "OneGitVault-Android");
            conn.setRequestProperty("Accept", "application/vnd.github.v3+json");
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);

            if (conn.getResponseCode() == 200) {
                BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) sb.append(line);
                reader.close();

                JSONObject res = new JSONObject(sb.toString());
                return res.optString("tag_name", "");
            }
        } catch (Throwable ignored) {
        } finally {
            if (conn != null) conn.disconnect();
        }
        return null;
    }

    private void postReleaseNotification(Context context, String repoFullName, String tagName) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(
            context,
            repoFullName.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID_RELEASES)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("🚀 " + repoFullName + " " + tagName + " is out!")
            .setContentText("A new release was published. Tap to inspect changelog & download APK.")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pi);

        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.notify(repoFullName.hashCode(), builder.build());
        }
    }
}
