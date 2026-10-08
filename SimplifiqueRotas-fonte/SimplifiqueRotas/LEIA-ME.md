# Simplifique Rotas — APK Android

Projeto Android WebView para o sistema Rota Simples em produção. O aplicativo abre o mesmo Web App do Apps Script e mantém `google.script.run`, sessões, Google Sheets, SAC, anexos e históricos existentes.

## Entregue

- WebView com User-Agent `SimplifiqueRotasAndroid/1`.
- Login abre diretamente na visão Motorista.
- Câmera, galeria, vídeos e anexos pelo seletor nativo Android.
- Downloads com sessão do WebView; links de telefone, mapa e externos.
- Botão Voltar integrado aos diálogos; aviso de conexão e falha.
- Ajustes mobile aplicados somente no APK.
- `doGet()` com viewport via `addMetaTag`, sem alteração da lógica de negócio.

## Publicação Apps Script

Substitua `Code.gs` e `Index.html` pelos arquivos de `ajustes-apps-script/`, publique nova versão da mesma implantação e teste primeiro no navegador. Os IDs, planilhas, autenticação, funções do servidor e integração SAC foram preservados.

## Compilação

Requer JDK 17, Android SDK API 35 e Build Tools 35.0.0:

```bash
gradle :app:assembleRelease :app:lintRelease
```

O APK sai em `app/build/outputs/apk/release/app-release.apk`. O workflow `.github/workflows/android.yml` compila no GitHub Actions e verifica com `apksigner`. Configure `ROTAS_KEYSTORE_BASE64`, `ROTAS_STORE_PASSWORD` e `ROTAS_KEY_PASSWORD`.

## Instalação

Instale o APK no celular, permita a fonte quando solicitado e abra `Simplifique Rotas`. O motorista seleciona o veículo e usa a senha já cadastrada.

## Validação

Arquivos originais e fluxos motorista/SAC analisados. Backend e scripts HTML passaram em `node --check`. O APK não foi compilado neste ambiente porque o JDK disponível não possui `javac`; o workflow fornecido compila em ambiente Android completo.
