# Voix — traduction vocale en temps réel

Application mobile de traduction parole-à-parole.
Tu parles, l'app transcrit, traduit et prononce dans la langue cible.

**Commence par lire DEMARRAGE.md.**

## Structure

```
backend/    Serveur Node.js — orchestre les appels IA, garde les clés secrètes
mobile/     Application React Native (Expo)
```

## Stack

- Transcription : Whisper Large v3 Turbo (Groq)
- Traduction : GPT-OSS 20B (Groq)
- Synthèse vocale : Eleven Flash v2.5 (ElevenLabs)
- Transport : WebSocket (Socket.IO), avec résultats intermédiaires
