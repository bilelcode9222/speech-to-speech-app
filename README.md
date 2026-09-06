# Nevi — traduction vocale en temps réel

Application mobile de traduction parole-à-parole.
Tu parles, l'app transcrit, traduit et prononce dans la langue cible.

**Commence par lire DEMARRAGE.md.**

## Structure

```text
backend/    Serveur Node.js — orchestre les appels IA et garde les clés secrètes
mobile/     Application React Native (Expo)
```

## Pipeline IA

Le backend choisit les fournisseurs avec les variables `AI_PROVIDER` et `TTS_PROVIDER`.
Les valeurs par défaut actuelles sont :

- Transcription : OpenAI Whisper (`whisper-1`)
- Traduction : OpenAI (`gpt-4o-mini`)
- Synthèse vocale : OpenAI (`tts-1`)
- Alternatives disponibles : Groq, Gemini et ElevenLabs
- Transport principal : Socket.IO / WebSocket

## Sécurité sans compte utilisateur

Nevi ne demande aucun login, mot de passe ou création de compte.

Au premier lancement, l'app génère automatiquement un identifiant d'installation local et demande au backend une session anonyme signée. Cette session est ensuite envoyée lors de la connexion Socket.IO. Le backend refuse les sockets et l'endpoint HTTP de traduction sans session valide et applique des limites par installation et par adresse réseau.

Les clés OpenAI, Groq, Gemini et ElevenLabs restent exclusivement dans `backend/.env` ou dans les variables d'environnement Render. Elles ne sont jamais intégrées dans l'application mobile.

RevenueCat utilise le même identifiant d'installation comme `appUserID`, sans exposer d'identité personnelle ni ajouter d'écran de connexion.

### Variable de sécurité obligatoire

Ajoute une longue valeur aléatoire dans le backend local et dans Render :

```text
ANONYMOUS_SESSION_SECRET=une_longue_valeur_aleatoire
```

Tu peux en générer une avec :

```bash
openssl rand -hex 32
```

Ne commit jamais cette valeur dans GitHub.
