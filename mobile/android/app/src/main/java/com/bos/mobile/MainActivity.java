package com.bos.mobile;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends Activity {
    private static final String DEFAULT_API = "https://business-operating-system-pied.vercel.app";
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private TextView status;
    private TextView detail;
    private EditText apiUrl;
    private Button connectButton;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        buildUi();
        checkHealth();
    }

    private void buildUi() {
        ScrollView scroll = new ScrollView(this);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(40, 50, 40, 50);
        root.setBackgroundColor(Color.rgb(7, 17, 31));

        TextView brand = text("BUSINESS OPERATING SYSTEM", 13, Color.rgb(148, 163, 184));
        brand.setGravity(Gravity.CENTER_HORIZONTAL);
        root.addView(brand);

        TextView title = text("BOS Mobile", 34, Color.WHITE);
        title.setGravity(Gravity.CENTER_HORIZONTAL);
        root.addView(title, margin(0, 24, 0, 8));

        TextView subtitle = text("Your business control center, in your pocket.", 16, Color.rgb(148, 163, 184));
        subtitle.setGravity(Gravity.CENTER_HORIZONTAL);
        root.addView(subtitle, margin(0, 0, 0, 28));

        status = text("Checking BOS cloud...", 16, Color.WHITE);
        status.setGravity(Gravity.CENTER);
        root.addView(status, margin(0, 0, 0, 8));

        detail = text("", 13, Color.rgb(148, 163, 184));
        detail.setGravity(Gravity.CENTER);
        root.addView(detail, margin(0, 0, 0, 28));

        TextView workspace = text("EARLY ACCESS WORKSPACE", 13, Color.rgb(148, 163, 184));
        root.addView(workspace, margin(0, 0, 0, 8));
        TextView workspaceValue = text("BOS Control Center", 22, Color.WHITE);
        root.addView(workspaceValue, margin(0, 0, 0, 24));

        root.addView(text("AI Employees", 18, Color.WHITE), margin(0, 8, 0, 4));
        root.addView(text("Configure digital workers for repetitive business tasks.", 13, Color.rgb(148, 163, 184)), margin(0, 0, 0, 16));
        root.addView(text("Automations", 18, Color.WHITE), margin(0, 8, 0, 4));
        root.addView(text("Run workflows and trigger actions from one place.", 13, Color.rgb(148, 163, 184)), margin(0, 0, 0, 16));
        root.addView(text("Analytics", 18, Color.WHITE), margin(0, 8, 0, 4));
        root.addView(text("Monitor activity, executions and business signals.", 13, Color.rgb(148, 163, 184)), margin(0, 0, 0, 16));
        root.addView(text("Integrations", 18, Color.WHITE), margin(0, 8, 0, 4));
        root.addView(text("Connect the tools your business already uses.", 13, Color.rgb(148, 163, 184)), margin(0, 0, 0, 24));

        TextView apiLabel = text("BOS API", 13, Color.rgb(148, 163, 184));
        root.addView(apiLabel);
        apiUrl = new EditText(this);
        apiUrl.setText(DEFAULT_API);
        apiUrl.setTextColor(Color.WHITE);
        apiUrl.setSingleLine(true);
        apiUrl.setHintTextColor(Color.rgb(100, 116, 139));
        root.addView(apiUrl, margin(0, 8, 0, 10));

        connectButton = new Button(this);
        connectButton.setText("Connect & Check Health");
        connectButton.setOnClickListener(v -> checkHealth());
        root.addView(connectButton, margin(0, 0, 0, 24));

        TextView footer = text("BOS Early Access · Free for initial testers", 11, Color.rgb(100, 116, 139));
        footer.setGravity(Gravity.CENTER);
        root.addView(footer);

        scroll.addView(root);
        setContentView(scroll);
    }

    private void checkHealth() {
        final String base = apiUrl == null ? DEFAULT_API : apiUrl.getText().toString().trim().replaceAll("/$", "");
        if (base.isEmpty()) return;
        status.setText("Connecting...");
        detail.setText("Checking " + base + "/health");
        connectButton.setEnabled(false);

        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                URL url = new URL(base + "/health");
                connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("GET");
                connection.setConnectTimeout(10000);
                connection.setReadTimeout(10000);
                connection.setRequestProperty("Accept", "application/json");
                int code = connection.getResponseCode();
                BufferedReader reader = new BufferedReader(new InputStreamReader(
                        code >= 400 ? connection.getErrorStream() : connection.getInputStream()));
                StringBuilder body = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) body.append(line);
                reader.close();
                JSONObject json = new JSONObject(body.toString());
                boolean healthy = code >= 200 && code < 300 && "ok".equalsIgnoreCase(json.optString("status"));
                String service = json.optString("service", "BOS API");
                mainHandler.post(() -> {
                    status.setText(healthy ? "CONNECTED · BOS CLOUD HEALTHY" : "BOS CLOUD ERROR");
                    status.setTextColor(healthy ? Color.rgb(52, 211, 153) : Color.rgb(251, 113, 133));
                    detail.setText(service + " · HTTP " + code);
                    connectButton.setEnabled(true);
                });
            } catch (Exception error) {
                mainHandler.post(() -> {
                    status.setText("UNABLE TO CONNECT");
                    status.setTextColor(Color.rgb(251, 113, 133));
                    detail.setText("Check your network and BOS API URL.");
                    connectButton.setEnabled(true);
                });
            } finally {
                if (connection != null) connection.disconnect();
            }
        }).start();
    }

    private TextView text(String value, int size, int color) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        return view;
    }

    private LinearLayout.LayoutParams margin(int left, int top, int right, int bottom) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        params.setMargins(left, top, right, bottom);
        return params;
    }
}
