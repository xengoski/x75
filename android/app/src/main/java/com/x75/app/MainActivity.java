package com.x75.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.webkit.JavascriptInterface;

import com.getcapacitor.BridgeActivity;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "x75";
    private String pendingJsonContent = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleIntent(getIntent());

        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().addJavascriptInterface(new JsonRunnerInterface(), "JsonRunnerBridge");
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        Uri dataUri = intent.getData();

        if (Intent.ACTION_VIEW.equals(action) && dataUri != null) {
            Log.d(TAG, "Received ACTION_VIEW intent with URI: " + dataUri);
            String jsonContent = readContentFromUri(dataUri);
            if (jsonContent != null && !jsonContent.trim().isEmpty()) {
                pendingJsonContent = jsonContent;
                dispatchJsonToWebView(jsonContent);
            }
        }
    }

    private void dispatchJsonToWebView(String jsonContent) {
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().post(() -> {
                try {
                    String quoted = JSONObject.quote(jsonContent);
                    String js = "window.onOpenJsonFile && window.onOpenJsonFile(" + quoted + ");";
                    bridge.getWebView().evaluateJavascript(js, null);
                } catch (Exception e) {
                    Log.e(TAG, "Error evaluating JS in dispatchJsonToWebView", e);
                }
            });
        }
    }

    private String readContentFromUri(Uri uri) {
        try (InputStream is = getContentResolver().openInputStream(uri);
             BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append('\n');
            }
            return sb.toString();
        } catch (Exception e) {
            Log.e(TAG, "Failed to read JSON from URI: " + uri, e);
            return null;
        }
    }

    public class JsonRunnerInterface {
        @JavascriptInterface
        public String getPendingJson() {
            String data = pendingJsonContent;
            pendingJsonContent = null; // Clear so it only executes once
            return data;
        }
    }
}
