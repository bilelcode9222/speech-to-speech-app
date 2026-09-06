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

Gemini Live n'est pas exposé par le serveur de production V1 tant que le client mobile de production ne l'utilise pas.

## Sécurité sans compte utilisateur

Nevi ne demande aucun login, mot de passe ou création de compte.

Au premier lancement, l'app génère automatiquement un identifiant d'installation local et demande au backend une session anonyme signée. Cette session est ensuite envoyée lors de la connexion Socket.IO. Le backend refuse les sockets et l'endpoint HTTP de traduction sans session valide et applique des limites par installation et par adresse réseau réelle derrière Render.

Les clés OpenAI, Groq, Gemini, ElevenLabs et RevenueCat serveur restent exclusivement dans les variables d'environnement backend. Elles ne sont jamais intégrées dans l'application mobile.

RevenueCat est configuré côté mobile pour les achats Apple et le backend vérifie également l'entitlement `premium` via l'API serveur RevenueCat avant d'autoriser les usages Pro.

## Quotas et politique d'usage

- Gratuit : 3 traductions réussies avant paywall.
- Nevi Pro : traductions illimitées* dans le cadre d'un usage personnel raisonnable.
- Fair Use : maximum 100 traductions sur toute période de 24 heures et 1 000 traductions sur toute période de 30 jours.
- Une seule traduction IA peut être active simultanément par installation.

Le backend est l'autorité finale : le compteur mobile sert uniquement à rendre l'interface réactive.

Les pages publiques sont exposées par le backend :

- `/terms` — Conditions d'utilisation, abonnement et Fair Use.
- `/privacy` — Politique de confidentialité.

## Variables de production

```text
ANONYMOUS_SESSION_SECRET=...
DATABASE_URL=...
REVENUECAT_SERVER_API_KEY=...
REVENUECAT_ENTITLEMENT_ID=premium
```

`ANONYMOUS_SESSION_SECRET` peut être générée avec :

```bash
openssl rand -hex 32
```

`DATABASE_URL` doit pointer vers un Postgres persistant en production afin que les quotas survivent aux redéploiements et fonctionnent avec plusieurs instances.

`REVENUECAT_SERVER_API_KEY` est une clé serveur REST RevenueCat. Elle ne doit jamais être placée dans une variable `EXPO_PUBLIC_*`, dans le mobile, dans GitHub ou dans une conversation.

Le mobile utilise uniquement la clé SDK publique iOS RevenueCat :

```text
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=...
```

## Checklist avant App Store

- RevenueCat : app iOS, Offering courante, produits Weekly / Monthly / Yearly et entitlement `premium` vérifiés.
- Les essais gratuits doivent être configurés dans App Store Connect et ne sont affichés que lorsque RevenueCat confirme l'éligibilité.
- Render : backend toujours actif, `/health` configuré comme health check et Postgres persistant.
- App Store Connect : Privacy Policy URL = `https://speech-to-speech-app.onrender.com/privacy`.
- Terms of Use / EULA : lien accessible depuis le paywall via `https://speech-to-speech-app.onrender.com/terms`.
- Nouveau build EAS production puis validation TestFlight complète avant soumission.

Ne commit jamais de secret dans GitHub.
