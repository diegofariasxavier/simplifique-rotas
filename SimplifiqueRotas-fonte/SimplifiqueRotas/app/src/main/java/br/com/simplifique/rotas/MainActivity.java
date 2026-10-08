package br.com.simplifique.rotas;

import android.app.*;
import android.content.*;
import android.graphics.Color;
import android.net.*;
import android.net.http.SslError;
import android.os.*;
import android.provider.MediaStore;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import androidx.core.content.FileProvider;
import androidx.core.graphics.Insets;
import androidx.core.view.*;
import androidx.webkit.*;
import java.io.File;
import java.util.*;

public final class MainActivity extends Activity {
    public static final String APP_URL = "https://script.google.com/macros/s/AKfycbwV5xTug6bccdRsGN-LE1jUUROzP0u4sW9s6582zvnUqUi1mNk_kOTnyM-zNwE5zJ7PfA/exec";
    private static final int PICK_FILE = 41;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private WebView web;
    private ProgressBar progress;
    private LinearLayout errorPanel;
    private TextView errorText, networkText;
    private ValueCallback<Uri[]> fileCallback;
    private final List<File> captures = new ArrayList<>();
    private ConnectivityManager connectivity;
    private ConnectivityManager.NetworkCallback networkCallback;
    private boolean pageFailed, backPending, closing;
    private AlertDialog exitDialog;
    private final Runnable backFallback = () -> { if (backPending) { backPending = false; confirmExit(); } };

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(19,47,85));
        ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets keyboard = insets.getInsets(WindowInsetsCompat.Type.ime());
            v.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, keyboard.bottom));
            return insets;
        });
        networkText = new TextView(this);
        networkText.setText("Sem conexão. Não reenvie uma operação sem conferir o resultado ao reconectar.");
        networkText.setTextColor(Color.rgb(80,45,0));
        networkText.setBackgroundColor(Color.rgb(255,235,196));
        networkText.setPadding(dp(14), dp(10), dp(14), dp(10));
        networkText.setVisibility(View.GONE);
        root.addView(networkText);
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        root.addView(progress, new LinearLayout.LayoutParams(-1, dp(3)));
        FrameLayout frame = new FrameLayout(this);
        root.addView(frame, new LinearLayout.LayoutParams(-1, 0, 1));
        web = new WebView(this);
        frame.addView(web, new FrameLayout.LayoutParams(-1, -1));
        errorPanel = new LinearLayout(this);
        errorPanel.setOrientation(LinearLayout.VERTICAL);
        errorPanel.setGravity(Gravity.CENTER);
        errorPanel.setPadding(dp(24), dp(24), dp(24), dp(24));
        errorPanel.setBackgroundColor(Color.rgb(243,246,250));
        errorText = new TextView(this);
        errorText.setTextSize(18);
        errorText.setGravity(Gravity.CENTER);
        errorPanel.addView(errorText);
        Button retry = new Button(this);
        retry.setText("Tentar novamente");
        retry.setOnClickListener(v -> web.loadUrl(APP_URL));
        errorPanel.addView(retry);
        errorPanel.setVisibility(View.GONE);
        frame.addView(errorPanel, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        configureWeb();
        monitorNetwork();
        cleanOldCaptures();
        // The existing app owns sessionStorage and session expiry. No password is stored here.
        web.loadUrl(APP_URL);
    }

    @SuppressWarnings("SetJavaScriptEnabled")
    private void configureWeb() {
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setUserAgentString(settings.getUserAgentString() + " SimplifiqueRotasAndroid/1");
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(false);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSafeBrowsingEnabled(true);
        settings.setSupportMultipleWindows(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);
        WebView.setWebContentsDebuggingEnabled(false);
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.addWebMessageListener(web, "SimplifiqueNavigation",
                new HashSet<>(Arrays.asList("https://script.google.com", "https://script.googleusercontent.com", "https://*.googleusercontent.com")),
                (view, message, origin, mainFrame, reply) -> {
                    if (!backPending) return;
                    String action = message.getData();
                    if (!"handled".equals(action) && !"exit".equals(action)) return;
                    backPending = false;
                    handler.removeCallbacks(backFallback);
                    if ("exit".equals(action)) confirmExit();
                });
        }
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri uri = req.getUrl();
                if (internal(uri)) return false;
                if ("about".equals(uri.getScheme())) return false;
                if (req.isForMainFrame() || req.hasGesture()) openExternal(uri);
                return true;
            }
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                pageFailed = false;
                errorPanel.setVisibility(View.GONE);
                progress.setVisibility(View.VISIBLE);
            }
            @Override public void onPageFinished(WebView view, String url) {
                progress.setVisibility(View.GONE);
                CookieManager.getInstance().flush();
                if (!pageFailed) errorPanel.setVisibility(View.GONE);
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest req, WebResourceError error) {
                if (req.isForMainFrame()) showError("Não foi possível abrir o sistema. Confira a conexão e tente novamente.");
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest req, WebResourceResponse response) {
                if (req.isForMainFrame()) showError("O servidor retornou erro " + response.getStatusCode() + ". Tente novamente mais tarde.");
            }
            @Override public void onReceivedSslError(WebView view, SslErrorHandler h, SslError error) {
                h.cancel();
                showError("Não foi possível estabelecer uma conexão segura. Confira data e hora do celular.");
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int value) { progress.setProgress(value); }
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                chooseFiles(callback, params);
                return true;
            }
            @Override public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this).setTitle("Simplifique Rotas").setMessage(message)
                    .setPositiveButton("OK", (d,w) -> result.confirm()).setOnCancelListener(d -> result.cancel()).show();
                return true;
            }
            @Override public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this).setTitle("Simplifique Rotas").setMessage(message)
                    .setPositiveButton("Confirmar", (d,w) -> result.confirm()).setNegativeButton("Cancelar", (d,w) -> result.cancel())
                    .setOnCancelListener(d -> result.cancel()).show();
                return true;
            }
            @Override public boolean onCreateWindow(WebView view, boolean dialog, boolean gesture, Message result) {
                if (!gesture) return false;
                WebView popup = new WebView(MainActivity.this);
                popup.setWebViewClient(new WebViewClient() {
                    @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                        openExternal(req.getUrl());
                        handler.post(v::destroy);
                        return true;
                    }
                });
                ((WebView.WebViewTransport) result.obj).setWebView(popup);
                result.sendToTarget();
                return true;
            }
            @Override public void onPermissionRequest(PermissionRequest request) { request.deny(); }
        });
        web.setDownloadListener((url, agent, disposition, mime, length) -> download(url, agent, disposition, mime));
    }

    static boolean internal(Uri uri) {
        if (!"https".equalsIgnoreCase(uri.getScheme())) return false;
        String h = uri.getHost();
        return h != null && (h.equals("script.google.com") || h.equals("script.googleusercontent.com") || h.endsWith("-script.googleusercontent.com"));
    }

    private void openExternal(Uri uri) {
        String scheme = uri.getScheme();
        if (!Arrays.asList("https", "tel", "geo", "mailto").contains(scheme)) {
            toast("Este tipo de link não pode ser aberto pelo aplicativo.");
            return;
        }
        try {
            Intent intent = new Intent("tel".equals(scheme) ? Intent.ACTION_DIAL : Intent.ACTION_VIEW, uri);
            startActivity(intent);
        } catch (ActivityNotFoundException e) { toast("Nenhum aplicativo disponível para abrir este link."); }
    }

    private void chooseFiles(ValueCallback<Uri[]> callback, WebChromeClient.FileChooserParams params) {
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        fileCallback = callback;
        captures.clear();
        List<String> mime = new ArrayList<>();
        for (String accept : params.getAcceptTypes()) for (String item : accept.split(",")) {
            item = item.trim();
            if (item.contains("/")) mime.add(item);
        }
        Intent files = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        files.addCategory(Intent.CATEGORY_OPENABLE);
        files.setType(mime.size() == 1 ? mime.get(0) : "*/*");
        if (mime.size() > 1) files.putExtra(Intent.EXTRA_MIME_TYPES, mime.toArray(new String[0]));
        files.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.getMode() == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE);
        List<Intent> camera = new ArrayList<>();
        boolean images = mime.isEmpty() || mime.stream().anyMatch(s -> s.startsWith("image/") || s.equals("*/*"));
        boolean videos = mime.isEmpty() || mime.stream().anyMatch(s -> s.startsWith("video/") || s.equals("*/*"));
        if (images) addCapture(camera, MediaStore.ACTION_IMAGE_CAPTURE, ".jpg");
        if (videos) addCapture(camera, MediaStore.ACTION_VIDEO_CAPTURE, ".mp4");
        Intent chooser = Intent.createChooser(files, "Selecionar arquivo ou usar câmera");
        chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, camera.toArray(new Intent[0]));
        try { startActivityForResult(chooser, PICK_FILE); }
        catch (ActivityNotFoundException e) { finishFiles(null); toast("Instale ou habilite o seletor de arquivos do Android."); }
    }

    private void addCapture(List<Intent> intents, String action, String suffix) {
        Intent intent = new Intent(action);
        if (intent.resolveActivity(getPackageManager()) == null) return;
        try {
            File directory = new File(getCacheDir(), "captures");
            if (!directory.exists() && !directory.mkdirs()) return;
            File file = File.createTempFile("captura_", suffix, directory);
            Uri uri = FileProvider.getUriForFile(this, getPackageName() + ".files", file);
            captures.add(file);
            intent.putExtra(MediaStore.EXTRA_OUTPUT, uri);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            intent.setClipData(ClipData.newRawUri("captura", uri));
            if (MediaStore.ACTION_VIDEO_CAPTURE.equals(action)) intent.putExtra(MediaStore.EXTRA_VIDEO_QUALITY, 0);
            intents.add(intent);
        } catch (java.io.IOException e) { toast("Não foi possível preparar a câmera. Você pode selecionar um arquivo."); }
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request != PICK_FILE || fileCallback == null) return;
        List<Uri> chosen = new ArrayList<>();
        if (result == RESULT_OK) {
            if (data != null && data.getClipData() != null) {
                for (int i=0; i<data.getClipData().getItemCount(); i++) chosen.add(data.getClipData().getItemAt(i).getUri());
            } else if (data != null && data.getData() != null) chosen.add(data.getData());
            if (chosen.isEmpty()) for (File f : captures) if (f.length() > 0) {
                chosen.add(FileProvider.getUriForFile(this, getPackageName()+".files", f));
                break;
            }
        }
        // Only content granted by Android or this capture provider is returned to the web page.
        chosen.removeIf(u -> !"content".equals(u.getScheme()));
        finishFiles(chosen.isEmpty() ? null : chosen.toArray(new Uri[0]));
    }

    private void finishFiles(Uri[] files) {
        if (fileCallback != null) fileCallback.onReceiveValue(files);
        fileCallback = null;
        for (File f : captures) if (f.length() == 0) f.delete();
        captures.clear();
    }

    private void download(String url, String userAgent, String disposition, String mime) {
        Uri uri = Uri.parse(url);
        if (!"https".equals(uri.getScheme())) {
            toast("Este download precisa ser aberto no navegador pelo link original.");
            return;
        }
        // Drive viewers and Google sign-in must retain their own browser authentication.
        if ("drive.google.com".equals(uri.getHost()) || "accounts.google.com".equals(uri.getHost())) {
            openExternal(uri); return;
        }
        new AlertDialog.Builder(this).setTitle("Baixar anexo?")
            .setMessage(URLUtil.guessFileName(url, disposition, mime))
            .setPositiveButton("Baixar", (d,w) -> {
                try {
                    DownloadManager.Request r = new DownloadManager.Request(uri);
                    r.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    r.setMimeType(mime);
                    r.addRequestHeader("User-Agent", userAgent);
                    String cookie = CookieManager.getInstance().getCookie(url);
                    if (cookie != null) r.addRequestHeader("Cookie", cookie);
                    String name = URLUtil.guessFileName(url, disposition, mime).replaceAll("[\\\\/:*?\"<>|]", "_");
                    // App-scoped Downloads works on Android 8+ without broad storage permissions.
                    r.setDestinationInExternalFilesDir(this, Environment.DIRECTORY_DOWNLOADS, System.currentTimeMillis()+"_"+name);
                    ((DownloadManager) getSystemService(DOWNLOAD_SERVICE)).enqueue(r);
                    toast("Download iniciado. Abra pela notificação do Android.");
                } catch (RuntimeException e) { toast("Não foi possível baixar aqui. Abrindo no navegador."); openExternal(uri); }
            }).setNegativeButton("Cancelar", null).show();
    }

    private void monitorNetwork() {
        connectivity = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        networkCallback = new ConnectivityManager.NetworkCallback() {
            @Override public void onAvailable(Network network) { handler.post(MainActivity.this::updateNetwork); }
            @Override public void onLost(Network network) { handler.post(MainActivity.this::updateNetwork); }
            @Override public void onCapabilitiesChanged(Network n, NetworkCapabilities c) { handler.post(MainActivity.this::updateNetwork); }
        };
        connectivity.registerDefaultNetworkCallback(networkCallback);
        updateNetwork();
    }
    private void updateNetwork() {
        NetworkCapabilities cap = connectivity.getNetworkCapabilities(connectivity.getActiveNetwork());
        networkText.setVisibility(cap != null && cap.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED) ? View.GONE : View.VISIBLE);
    }
    private void showError(String message) {
        pageFailed = true;
        progress.setVisibility(View.GONE);
        errorText.setText(message);
        errorPanel.setVisibility(View.VISIBLE);
    }
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private void toast(String message) { Toast.makeText(this, message, Toast.LENGTH_LONG).show(); }

    @Override public void onBackPressed() {
        if (backPending || closing) return;
        backPending = true;
        // The Apps Script document is in an iframe, so evaluateJavascript alone cannot access its DOM.
        web.evaluateJavascript("(function send(w){try{w.postMessage('simplifique:back','*');for(var i=0;i<w.frames.length;i++)send(w.frames[i]);}catch(e){}})(window)", null);
        handler.postDelayed(backFallback, 1500);
    }
    private void confirmExit() {
        if (isFinishing() || (exitDialog != null && exitDialog.isShowing())) return;
        exitDialog = new AlertDialog.Builder(this).setTitle("Fechar Simplifique Rotas?")
            .setMessage("Se houver envio em andamento, aguarde sua confirmação. Dados ainda não enviados podem ser perdidos.")
            .setPositiveButton("Fechar", (d,w) -> { closing = true; finish(); })
            .setNegativeButton("Continuar no aplicativo", null).show();
    }
    private void cleanOldCaptures() {
        File[] files = new File(getCacheDir(), "captures").listFiles();
        if (files != null) for (File f : files) if (f.lastModified() < System.currentTimeMillis()-86400000L) f.delete();
    }
    @Override protected void onPause() { super.onPause(); CookieManager.getInstance().flush(); }
    @Override protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        if (connectivity != null && networkCallback != null) connectivity.unregisterNetworkCallback(networkCallback);
        web.destroy();
        super.onDestroy();
    }
}
