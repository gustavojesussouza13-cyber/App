package com.aurora.gustavoperegrino;

import android.app.Activity;
import android.app.AlertDialog;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;

/**
 * Campanha local preservada. O co-op usa WSS em servidor exclusivo do APK Android.
 * Origem HTTPS virtual e estavel para preservar localStorage apos reiniciar.
 */
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/assets/index.html";
    private WebView game;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.BLACK);
        getWindow().setNavigationBarColor(Color.BLACK);
        game = new WebView(this);
        game.setBackgroundColor(Color.rgb(9, 23, 24));
        game.setOverScrollMode(View.OVER_SCROLL_NEVER);
        game.setVerticalScrollBarEnabled(false);
        game.setHorizontalScrollBarEnabled(false);
        setContentView(game);
        WebSettings s = game.getSettings();
        s.setJavaScriptEnabled(true); // Motor do RPG em Canvas
        s.setDomStorageEnabled(true); // Salvamentos individuais e cooperativos separados
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setAllowFileAccessFromFileURLs(false);
        s.setAllowUniversalAccessFromFileURLs(false);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setSupportMultipleWindows(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setDefaultTextEncodingName("UTF-8");
        game.setWebChromeClient(new WebChromeClient());
        game.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                // Audio data: e blob: sao internos; nao sao requisicoes de rede.
                if ("data".equals(uri.getScheme()) || "blob".equals(uri.getScheme())) return null;
                String path = uri.getEncodedPath();
                if ("https".equals(uri.getScheme()) && HOST.equals(uri.getHost())
                        && path != null && path.startsWith("/assets/")) {
                    // Evita caminhos maliciosos e acessos externos.
                    String name = Uri.decode(path.substring("/assets/".length()));
                    if (!name.matches("[A-Za-z0-9._/-]+") || name.contains("..")) return blocked();
                    try {
                        InputStream in = getAssets().open(name);
                        String mime = name.endsWith(".html") ? "text/html" :
                                name.endsWith(".png") ? "image/png" :
                                name.endsWith(".jpg") ? "image/jpeg" :
                                name.endsWith(".mp3") ? "audio/mpeg" : "application/octet-stream";
                        return new WebResourceResponse(mime, "UTF-8", in);
                    } catch (IOException ignored) { return blocked(); }
                }
                // Recursos externos de publicidade ou rastreamento continuam bloqueados.
                // WebSockets WSS sao criados pelo motor JS e nao viram documentos do WebView.
                return blocked();
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                return !START_URL.equals(req.getUrl().toString());
            }
            @Override public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
            }
        });
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().getInsetsController().hide(
                android.view.WindowInsets.Type.statusBars() | android.view.WindowInsets.Type.navigationBars());
            getWindow().getInsetsController().setSystemBarsBehavior(
                android.view.WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
        game.loadUrl(START_URL);
    }

    private static WebResourceResponse blocked() {
        return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked", null,
                new ByteArrayInputStream(new byte[0]));
    }

    @Override public void onBackPressed() {
        if (game == null) { super.onBackPressed(); return; }
        game.evaluateJavascript("(window.PeregrinoApp&&window.PeregrinoApp.back())?'sim':'nao'", result -> {
            if ("\"sim\"".equals(result)) return; // Fechou o painel do jogo.
            new AlertDialog.Builder(this)
                .setTitle("Sair da peregrinacao?")
                .setMessage("A campanha sera salva no aparelho antes de sair.")
                .setPositiveButton("Salvar e sair", (d, which) -> {
                    game.evaluateJavascript("window.PeregrinoApp&&window.PeregrinoApp.save()", x -> finish());
                })
                .setNegativeButton("Continuar jogando", null)
                .show();
        });
    }
    @Override protected void onPause() {
        if (game != null) {
            game.evaluateJavascript("window.PeregrinoApp&&window.PeregrinoApp.save()", null);
            game.onPause();
        }
        super.onPause();
    }
    @Override protected void onResume() {
        super.onResume();
        if (game != null) game.onResume();
    }
    @Override protected void onDestroy() {
        if (game != null) { game.destroy(); game = null; }
        super.onDestroy();
    }
}
