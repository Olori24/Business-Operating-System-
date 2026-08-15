package com.bos.mobile;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private static final String DEFAULT_API = "https://business-operating-system-pied.vercel.app";
    private static final String TENANT = "demo-early-access";
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private TextView status;
    private TextView result;
    private EditText workflowName;
    private EditText apiUrl;
    private Button runButton;

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
        root.setPadding(40, 48, 40, 48);
        root.setBackgroundColor(Color.rgb(7, 17, 31));

        TextView brand = text("BUSINESS OPERATING SYSTEM", 12, Color.rgb(148, 163, 184));
        brand.setGravity(Gravity.CENTER_HORIZONTAL);
        root.addView(brand);

        TextView title = text("BOS Mobile", 34, Color.WHITE);
        title.setGravity(Gravity.CENTER_HORIZONTAL);
        root.addView(title, margin(0, 20, 0, 6));

        TextView subtitle = text("Run your business workflows from your phone.", 16, Color.rgb(148, 163, 184));
        subtitle.setGravity(Gravity.CENTER_HORIZONTAL);
        root.addView(subtitle, margin(0, 0, 0, 24));

        status = text("Checking BOS cloud...", 15, Color.WHITE);
        status.setGravity(Gravity.CENTER);
        root.addView(status, margin(0, 0, 0, 6));

        TextView endpoint = text(DEFAULT_API + "/api/health", 11, Color.rgb(100, 116, 139));
        endpoint.setGravity(Gravity.CENTER);
        root.addView(endpoint, margin(0, 0, 0, 24));

        root.addView(section("WORKFLOW EXECUTION"));
        TextView info = text("This mobile beta uses the same production automation API that powers the BOS web Workflow Builder.", 13, Color.rgb(148, 163, 184));
        root.addView(info, margin(0, 0, 0, 16));

        TextView nameLabel = text("Workflow name", 13, Color.rgb(203, 213, 225));
        root.addView(nameLabel);
        workflowName = new EditText(this);
        workflowName.setHint("New lead follow-up");
        workflowName.setTextColor(Color.WHITE);
        workflowName.setHintTextColor(Color.rgb(100, 116, 139));
        workflowName.setSingleLine(true);
        root.addView(workflowName, margin(0, 7, 0, 12));

        TextView flow = text("Trigger: New lead\nAction 1: Create task\nAction 2: Send notification", 14, Color.WHITE);
        flow.setPadding(18, 16, 18, 16);
        flow.setBackgroundColor(Color.rgb(15, 29, 49));
        root.addView(flow, margin(0, 0, 0, 14));

        runButton = new Button(this);
        runButton.setText("Run 2-Action Workflow");
        runButton.setOnClickListener(v -> runWorkflow());
        root.addView(runButton, margin(0, 0, 0, 12));

        Button healthButton = new Button(this);
        healthButton.setText("Check BOS Cloud Health");
        healthButton.setOnClickListener(v -> checkHealth());
        root.addView(healthButton, margin(0, 0, 0, 22));

        result = text("", 14, Color.rgb(141, 230, 196));
        result.setPadding(16, 14, 16, 14);
        root.addView(result, margin(0, 0, 0, 24));

        root.addView(section("BOS API"));
        apiUrl = new EditText(this);
        apiUrl.setText(DEFAULT_API);
        apiUrl.setTextColor(Color.WHITE);
        apiUrl.setSingleLine(true);
        root.addView(apiUrl, margin(0, 7, 0, 12));

        TextView features = text("AI Employees\nAutomations\nAnalytics\nIntegrations\nWorkflow execution", 15, Color.WHITE);
        root.addView(features, margin(0, 0, 0, 24));

        TextView footer = text("BOS Early Access · Free for initial testers", 11, Color.rgb(100, 116, 139));
        footer.setGravity(Gravity.CENTER);
        root.addView(footer);

        scroll.addView(root);
        setContentView(scroll);
    }

    private void checkHealth() {
        final String base = getBaseUrl();
        status.setText("Connecting...");
        result.setText("");
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                URL url = new URL(base + "/api/health");
                connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("GET");
                connection.setConnectTimeout(10000);
                connection.setReadTimeout(10000);
                connection.setRequestProperty("Accept", "application/json");
                int code = connection.getResponseCode();
                String body = readBody(connection, code);
                JSONObject json = new JSONObject(body);
                boolean healthy = code >= 200 && code < 300 && "ok".equalsIgnoreCase(json.optString("status"));
                mainHandler.post(() -> {
                    status.setText(healthy ? "CONNECTED · BOS CLOUD HEALTHY" : "BOS CLOUD ERROR");
                    status.setTextColor(healthy ? Color.rgb(52, 211, 153) : Color.rgb(251, 113, 133));
                    result.setText(healthy ? "Production API reachable · HTTP " + code : "Health check failed · HTTP " + code);
                });
            } catch (Exception error) {
                mainHandler.post(() -> {
                    status.setText("UNABLE TO CONNECT");
                    status.setTextColor(Color.rgb(251, 113, 133));
                    result.setText(error.getMessage() == null ? "Network error" : error.getMessage());
                });
            } finally {
                if (connection != null) connection.disconnect();
            }
        }).start();
    }

    private void runWorkflow() {
        final String base = getBaseUrl();
        final String name = workflowName.getText().toString().trim().isEmpty() ? "New lead follow-up" : workflowName.getText().toString().trim();
        runButton.setEnabled(false);
        runButton.setText("Running...");
        result.setText("Sending workflow to production BOS...");

        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                JSONObject body = new JSONObject();
                JSONArray steps = new JSONArray();
                steps.put(action("create_task", name));
                steps.put(action("notify_sales", name));
                body.put("steps", steps);
                JSONObject context = new JSONObject();
                context.put("workflowName", name);
                context.put("trigger", "New lead");
                body.put("context", context);

                URL url = new URL(base + "/api/v1/automations/run");
                connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("POST");
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(15000);
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setRequestProperty("Accept", "application/json");
                connection.setRequestProperty("x-tenant-id", TENANT);
                byte[] payload = body.toString().getBytes(StandardCharsets.UTF_8);
                connection.setFixedLengthStreamingMode(payload.length);
                try (OutputStream out = connection.getOutputStream()) { out.write(payload); }

                int code = connection.getResponseCode();
                String response = readBody(connection, code);
                JSONObject json = new JSONObject(response);
                boolean ok = code >= 200 && code < 300 && json.has("execution");
                mainHandler.post(() -> {
                    if (ok) {
                        JSONObject execution = json.optJSONObject("execution");
                        int count = execution == null ? 0 : execution.optJSONArray("results") == null ? 0 : execution.optJSONArray("results").length();
                        result.setText("SUCCESS · " + count + " actions completed · HTTP " + code);
                        result.setTextColor(Color.rgb(52, 211, 153));
                    } else {
                        result.setText("Workflow failed · HTTP " + code + "\n" + response);
                        result.setTextColor(Color.rgb(251, 113, 133));
                    }
                    runButton.setEnabled(true);
                    runButton.setText("Run 2-Action Workflow");
                });
            } catch (Exception error) {
                mainHandler.post(() -> {
                    result.setText("Workflow error\n" + (error.getMessage() == null ? "Network error" : error.getMessage()));
                    result.setTextColor(Color.rgb(251, 113, 133));
                    runButton.setEnabled(true);
                    runButton.setText("Run 2-Action Workflow");
                });
            } finally {
                if (connection != null) connection.disconnect();
            }
        }).start();
    }

    private JSONObject action(String action, String name) throws Exception {
        JSONObject item = new JSONObject();
        item.put("action", action);
        JSONObject input = new JSONObject();
        input.put("workflowName", name);
        input.put("trigger", "New lead");
        item.put("input", input);
        return item;
    }

    private String readBody(HttpURLConnection connection, int code) throws Exception {
        BufferedReader reader = new BufferedReader(new InputStreamReader(code >= 400 ? connection.getErrorStream() : connection.getInputStream(), StandardCharsets.UTF_8));
        StringBuilder body = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) body.append(line);
        reader.close();
        return body.toString();
    }

    private String getBaseUrl() {
        String base = apiUrl == null ? DEFAULT_API : apiUrl.getText().toString().trim();
        return base.isEmpty() ? DEFAULT_API : base.replaceAll("/$", "");
    }

    private TextView section(String value) {
        return text(value, 12, Color.rgb(125, 211, 252));
    }

    private TextView text(String value, int size, int color) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        return view;
    }

    private LinearLayout.LayoutParams margin(int left, int top, int right, int bottom) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        params.setMargins(left, top, right, bottom);
        return params;
    }
}
